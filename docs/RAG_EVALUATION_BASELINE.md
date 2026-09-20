# RAG Evaluation Baseline and Improvement Plan

Recorded: 2026-09-15

This document explains the retrieval index and the evaluation metrics used by
the FireBuddy RAG pipeline, records the current evaluation numbers as a fixed
baseline, and lists the known problems with a concrete fix for each. Use it to
judge whether a future change actually improved retrieval or answers.

Related files:

- `apps/backend/rag/retrieval.py` (embedding and hybrid RPC call)
- `apps/backend/services/rag_service.py` (threshold gate, prompt, answer)
- `apps/backend/rag/Implementation/ingest.py` (chunking and embedding writes)
- `supabase/migrations/20260814051717_replace_rag_ivfflat_with_hnsw.sql`
- `supabase/migrations/20260814052904_add_private_hybrid_rag_retrieval.sql`
- `apps/backend/rag/evaluation/eval_retrieval.py` and `eval_answers.py`
- `apps/backend/rag/evaluation/results/` (versioned reports)

---

## 1. What the HNSW index is

`rag_chunks.embedding` is a 1,536-dimension pgvector column. A question is
embedded with the same model, and retrieval must find the stored vectors whose
cosine distance to the question vector is smallest. Comparing the question
against every row (a sequential scan) is exact but scales linearly with corpus
size. An approximate nearest neighbour (ANN) index trades a small amount of
exactness for much faster search.

**HNSW** stands for Hierarchical Navigable Small World. It is a graph index:

- Every vector is a node. Each node keeps links to a fixed number of its
  nearest neighbours (`m`, default 16 in pgvector).
- The graph has several layers. The top layer holds only a few nodes with long
  links; each lower layer holds more nodes with shorter links; the bottom layer
  holds every vector.
- A search enters at the top layer, greedily walks to the node closest to the
  query, drops one layer, and repeats. The upper layers act like a coarse map
  that gets the search into the right region quickly; the bottom layer refines
  it. `ef_search` (default 40) controls how many candidate nodes the walk keeps
  open at the bottom layer, which is the recall versus speed dial.

Why FireBuddy moved from IVFFlat to HNSW (migration `20260814051717`):

| | IVFFlat | HNSW |
|---|---|---|
| How it works | Clusters vectors with k-means into lists; searches the nearest few lists | Layered neighbour graph |
| Needs training data | Yes, the index is built from existing rows; poor if built on an empty or tiny table | No, rows are inserted into the graph as they arrive |
| Behaviour on a changing corpus | Cluster centroids go stale after many inserts and deletes; needs rebuild | Stays accurate as rows change |
| Build time and memory | Low | Higher (fine for a corpus of a few hundred chunks) |
| Query recall | Depends on `probes` | Higher at the same speed |

At the current corpus size (25 documents, roughly one to two hundred chunks)
either index returns the same rows as an exact scan. HNSW was chosen because
the corpus is re-ingested on a schedule and it removes the "index built before
the data existed" failure that IVFFlat has. The semantic candidate list in the
hybrid RPC is ordered by `embedding <=> query_embedding` and limited, which is
the query shape that lets Postgres use this index.

---

## 2. What the retrieval metrics mean

`eval_retrieval.py` scores each case at the **document level**: it deduplicates
the five retrieved chunks by `source_path` and compares that ordered list of
unique documents with the case's `expected_source_paths`. `k` is the position
in that ordered list. All metrics are averaged over the cases.

| Metric | Question it answers | Formula per case |
|---|---|---|
| Hit@k | Did at least one expected document appear in the top k? | 1 if any expected document is in the top k, else 0 |
| Precision@k | How much of the top k was relevant? | relevant documents in top k / k |
| Recall@k | How much of what was expected did we find in the top k? | relevant documents in top k / number of expected documents |
| MRR | How high did the first relevant document rank? | 1 / rank of the first relevant document |
| MAP@k | Averaged precision at each relevant hit, so order matters | mean over relevant hits of Precision at that hit's rank |
| nDCG@k | Did we rank the relevant documents near the top, with position-discounted credit? | DCG@k / ideal DCG@k, where DCG@k = sum over ranks i of rel_i / log2(i + 1) |

### Recall@k in this eval

Recall only differs from Hit rate when a case expects more than one document.
Ten of the thirty cases in the version 2 report expect two documents. Recall@5
of `0.9167` means that across those cases, on average one expected document in
twelve was missing from the top five even though Hit@5 is `1.0000` (every case
found at least one). Recall@1 is capped well below 1.0 by construction: a
two-document case can score at most 0.5 at k = 1.

Read Recall@k as the ceiling on how complete the evidence sent to the answer
model can be. Missing the second document is what produced the one citation
miss in the answer eval.

### nDCG@k in this eval

nDCG rewards putting relevant documents high and penalises pushing them down.
Because the eval uses binary relevance (a document is expected or not), the
gain at rank i is 1 / log2(i + 1) for a relevant document and 0 otherwise:

| Rank of a relevant document | Discounted gain |
|---|---|
| 1 | 1.000 |
| 2 | 0.631 |
| 3 | 0.500 |
| 4 | 0.431 |
| 5 | 0.387 |

Worked examples from the version 2 report:

- `cpf_retirement_age_planning` expects one document and found it at rank 5.
  DCG@5 = 0.387, ideal DCG@5 = 1.000, so nDCG@5 = 0.387. Hit@5 counts this as
  a full success; nDCG shows it was a weak one.
- `mas_ssb_factsheet_interest` expects two documents and found them at ranks 1
  and 2. DCG@5 = 1.000 + 0.631 = 1.631, ideal = 1.631, nDCG@5 = 1.000.
- `mas_ssb_safe_cash_allocation` expects two documents; suppose they were found
  at ranks 2 and 3. DCG@5 = 0.631 + 0.500 = 1.131, ideal = 1.631, nDCG@5 =
  0.693.

nDCG is the single best number to watch when tuning ranking (RRF weights,
reranking, chunk headlines), because it moves when order improves even if
Hit@5 is already saturated at 1.0. MRR is a simpler cousin that only looks at
the first relevant document.

---

## 3. Recorded baseline (do not edit; append new versions below)

### Retrieval

Source: `apps/backend/rag/evaluation/results/retrieval/versions/v001.md`
and `v002.md`. Both runs used 30 cases and 5 retrieved chunks per question.

| Metric | v1 (2026-08-12) IVFFlat, vector only | v2 (2026-08-14) HNSW + hybrid RRF | Change |
|---|---:|---:|---:|
| MRR | 0.7861 | 0.8622 | +0.0761 |
| Hit@1 | 0.6000 | 0.7667 | +0.1667 |
| Hit@3 | 0.9667 | 0.9667 | 0 |
| Hit@5 | 1.0000 | 1.0000 | 0 |
| Precision@1 | 0.6000 | 0.7667 | +0.1667 |
| Precision@3 | 0.3667 | 0.3778 | +0.0111 |
| Precision@5 | 0.2400 | 0.2667 | +0.0267 |
| Recall@1 | 0.4667 | 0.6000 | +0.1333 |
| Recall@3 | 0.7833 | 0.8167 | +0.0334 |
| Recall@5 | 0.8500 | 0.9167 | +0.0667 |
| MAP@1 | 0.6000 | 0.7667 | +0.1667 |
| MAP@3 | 0.6444 | 0.7333 | +0.0889 |
| MAP@5 | 0.6694 | 0.7750 | +0.1056 |
| nDCG@1 | 0.6000 | 0.7667 | +0.1667 |
| nDCG@3 | 0.7148 | 0.7851 | +0.0703 |
| nDCG@5 | 0.7467 | 0.8353 | +0.0886 |

Retrieval settings behind v2 (`retrieval.py`):

| Setting | Value |
|---|---|
| Embedding model | `text-embedding-3-small` (1,536 dims) |
| Index | HNSW, `vector_cosine_ops`, pgvector defaults (m = 16, ef_construction = 64, ef_search = 40) |
| Candidates per signal | 10 |
| RRF weights | full text 0.6, semantic 1.0 |
| RRF k | 50 |
| Full-text config | `simple` (no stemming), prefix OR terms, small stop-word list |
| Returned chunks | 5, deduplicated per source document |
| Refusal threshold | top result cosine similarity below 0.45 |

Weakest v2 cases (first relevant rank worse than 1):

| Case | First relevant rank |
|---|---:|
| cpf_retirement_age_planning | 5 |
| mas_ssb_vs_general_investing | 3 |
| singapore_investing_order_of_operations | 3 |
| cpf_allocation_rates_2026_ordinary_special_medisave | 2 |
| mas_ssb_safe_cash_allocation | 2 |
| moneysense_emergency_fund | 2 |
| singapore_investing_etfs | 2 |

### Answers

Source: `apps/backend/rag/evaluation/results/answer/versions/v001.md`.
12 cases (6 answer, 6 refuse), LLM judge enabled, model `gpt-4o-mini`.

| Metric | v1 (2026-08-12) |
|---|---:|
| Overall pass rate | 1.0000 |
| Positive pass rate | 1.0000 |
| Refusal accuracy | 1.0000 |
| Concept coverage | 1.0000 |
| Numeric accuracy | 1.0000 |
| Citation recall | 0.9444 |
| Judge groundedness | 0.9667 |
| Judge factual correctness | 1.0000 |
| Judge citation support | 1.0000 |
| Judge numerical accuracy | 1.0000 |

The only non-perfect case was `ssb_holding_and_liquidity` (citation recall
0.67): one of the expected source documents was not retrieved.

### Known staleness

`rag_questions.json` now holds 39 retrieval cases and `answer_eval_cases.json`
holds 16 answer cases, but the latest reports cover 30 and 12. The next run
should be recorded as retrieval v3 and answer v2 with the run label
"Full case set, no pipeline change" so the enlarged set becomes the new
baseline before any fix below is measured.

---

## 4. Problems and fixes

Ordered by expected impact. Each fix names the metric that should move so the
result can be verified against Section 3.

### P1. PDF tables are garbled and the prompt is compensating

**Problem.** `pdf_to_md.py` uses pdfplumber plain text extraction, which
flattens tables into interleaved lines. In `cpf-contribution-rates-2026.md`
the age band, wage band, and formula land on one line and the OW and AW rates
on the next. The system prompt in `rag_service.py` carries a paragraph of
table-defence rules (never join OW and AW with a plus sign, omit ambiguous
labels) purely to cope with this.

**Fix.**

1. Hand-author the CPF contribution rates, allocation rates, retirement sums,
   and CPF LIFE payout tables as clean Markdown tables under
   `knowledge-base/manual/cpf/` with front matter (`source_url`, `agency`,
   `topic`). They change once a year at Budget. Set `ingest: false` on the
   corresponding PDF-cache files or remove them from `PDFS`.
2. For remaining PDFs, try `page.extract_tables()` in `pdf_to_md.py` and emit
   Markdown tables before falling back to `extract_text()`.
3. After re-ingesting, delete the table-defence rules from the prompt and
   confirm the answer eval still passes.

**Verify.** Numeric accuracy and judge numerical accuracy stay at 1.0 with the
shorter prompt; add required substrings such as `37%` to the CPF retrieval
cases (see P9) and confirm they pass.

### P2. A source file is truncated

**Problem.** `markdown-cache/cpf/cpf-retirement-sums.md` is 279 bytes and ends
at 2020. Ember cannot answer BRS, FRS, or ERS for 2021 to 2026. Nothing in the
conversion pipeline flagged the tiny output.

**Fix.** Re-author the table by hand (see P1) with rows through 2026. Add a
minimum-size and page-count check to `pdf_to_md.py` that fails the run, and
the Telegram notification, when a converted file is under a threshold or loses
more than half its previous length.

**Verify.** A new retrieval case "What is the Full Retirement Sum in 2026?"
with required substring for the 2026 value.

### P3. PDF chunks have a useless headline and no summary

**Problem.** Every PDF-cache chunk inherits the single generated heading
`Source: foo.pdf`. The tsvector in the hybrid migration gives `headline`
weight A, and `Chunk.as_result()` prepends the headline to the embedded text,
so the strongest slot in both retrieval signals holds noise. `Chunk.summary`
exists in `ingest.py` and is always empty.

**Fix.** Add a guarded LLM step in `create_chunks()` that writes a descriptive
headline and a one to two sentence context for each chunk ("From the MAS
Singapore Savings Bonds FAQ, section on redemption: explains the minimum
holding period and how redemption requests are processed"). Cache results in
`knowledge-base/.chunk-context-cache.json` keyed by SHA-256 of the chunk text
so re-ingestion costs nothing unless text changed. Keep `original_text`
unchanged. Add a `--no-llm-context` flag so dry runs and tests stay
deterministic.

**Verify.** nDCG@5 and MRR should rise; the seven weak cases in Section 3
are the ones to watch.

### P4. Embedded chunks are too large

**Problem.** `MAX_SECTION_SIZE` is 4,000 characters (roughly 900 to 1,000
tokens). One vector for that much text averages away the specific fact a
question is about. The hybrid RPC already stitches up to two sibling chunks
from the same source back together at answer time, so shrinking the embedded
unit does not shrink the context the model sees.

**Fix.** Lower `MAX_SECTION_SIZE` to 1,500 and `CHUNK_OVERLAP_MAX_CHARS` to
300. Raise `INTERNAL_CANDIDATE_COUNT` in `retrieval.py` from 10 to 20 so the
larger chunk count still yields five distinct sources. Re-ingest.

**Verify.** nDCG@5, Recall@5. Do this together with P3 and measure once.

### P5. The SSB FAQ table of contents is indexed as content

**Problem.** The first three pages of `singapore-savings-bonds-faqs.md` are
question titles with no answers. They chunk into blocks that keyword-match
every SSB question and displace the real answer chunks.

**Fix.** Strip the table of contents in `pdf_to_md.py` (drop everything before
the first repeated section heading) or delete it from the cached file and
record the edit in front matter. Add a duplicate-headline check in
`print_chunk_size_summary()` that warns when one source produces many chunks
whose text is mostly short lines ending in a question mark.

**Verify.** The three `mas_ssb_*` cases with first relevant rank above 1.

### P6. Retrieval query ignores chat history and is skewed by page hints

**Problem.** `build_contextual_retrieval_question()` appends a fixed phrase
such as "assets liabilities liquidity CPF and FIRE planning" to every query,
which pulls retrieval toward the manual FIRE documents regardless of topic.
Chat history goes only to the answer model, so a follow-up such as "and for
someone over 60?" is embedded with no subject.

**Fix.** Add a `retrieval_query: str` field (max 200 characters) to
`EmberPlan` in `ember_planner.py`. The planner already runs one structured
call per question; instruct it to write a standalone, history-resolved
question with Singapore finance acronyms expanded using the glossary in
`AGENTS.md` (OA to Ordinary Account, FRS to Full Retirement Sum, SSB to
Singapore Savings Bonds). Pass that to `retrieve_chunks()` instead of the raw
question. Keep the page hint out of the embedded text; if page context is
still wanted, use it only as a tie-break on `topic` inside the RPC.

**Verify.** Add three multi-turn cases to `rag_questions.json` with a
`history` field and check Hit@1 on them. Existing cases should not regress.

### P7. Keyword search does not stem and has no domain synonyms

**Problem.** The tsvector and query use the `simple` configuration, so
"contributions" does not match "contribute" and "reliefs" does not match
"relief". Prefix matching (`term:*`) only partially compensates.

**Fix.** New migration: regenerate `search_vector` with the `english`
configuration for `content`, `headline`, and `topic` (keep `simple` for
`source_title` so proper nouns stay exact). Build the query with the same
config. Add a small acronym expansion table in `retrieval.py` applied to
`query_text` before the RPC (this also helps when P6 is not yet in place).

**Verify.** MRR and nDCG@3 on the CPF and IRAS cases.

### P8. The refusal gate reads the wrong score

**Problem.** Ranking is by fused RRF score, but
`stream_financial_advisor_question()` refuses when the top result's raw cosine
(`1 - vector_distance`) is below 0.45. A chunk that ranked first on keywords
can carry a low cosine and cause a refusal on a good match. The 0.45 value was
never calibrated for `text-embedding-3-small`, whose cosine range is
compressed (unrelated text often scores 0.30 to 0.40).

**Fix.** Return `fused_score` and a `signal_count` (1 or 2) from the RPC.
Refuse only when the top result has `signal_count = 1` and cosine below the
threshold, or when fused score is below a floor. Calibrate both floors by
running the eval cases plus the six refusal cases and recording the top
cosine and fused score for each, then choosing the values that separate them.
Store the chosen values in `.env.example` with the date.

**Verify.** Refusal accuracy stays 1.0; log the `low_confidence_refusal`
outcome rate before and after.

### P9. Exact figures are answered through a lossy path

**Problem.** Rates, sums, caps, and reliefs are the highest-stakes questions,
and they are answered by retrieving a mangled table and asking `gpt-4o-mini`
to read it. `annual-figures.json` exists but is never used.

**Fix.** Add a `figure_lookup` tool to `EmberToolName` in `ember_planner.py`
with a `figure_key` and `year` field. Implement it in `ember_data_tools.py`
(or a new `ember_figure_tools.py`) as a plain dictionary lookup over a
validated copy of `annual-figures.json` that returns the value, the year, and
the source document. Route through the existing `data` mode so the answer is
the exact value with an optional explanation, and the source citation comes
from the figure record. Keep the RAG path as the fallback when the key is
unknown.

**Verify.** Move the numeric answer cases to expect `mode = data` and keep
numeric accuracy at 1.0.

### P10. The eval cannot see chunk-level problems

**Problem.** Relevance is document-level only. A garbled chunk from the right
document still counts as a hit. There are no cases for finance topics that are
in scope but absent from the corpus (HDB grants are named in `AGENTS.md` but
have no documents), and no multi-turn cases.

**Fix.**

1. Add an optional `required_substrings` list per case to
   `rag_questions.json` and a `substring_hit@5` metric in `eval_retrieval.py`
   that checks whether any returned chunk contains each substring.
2. Add five "in scope, not in corpus" cases with `expected_refusal: true` to
   `answer_eval_cases.json`.
3. Add three multi-turn cases with a `history` field (see P6).
4. Add a CI job that runs both evals against the recorded baseline and fails
   when Hit@3, nDCG@5, or refusal accuracy drop by more than 0.03.

### P11. Documentation drift

**Problem.** `apps/backend/rag/rag_agent.md` describes a `documents` table with
3,072-dimension vectors, a `match_documents` RPC, LiteLLM, and
`text-embedding-3-large`. None of these are in the code.

**Fix.** Rewrite the schema and pipeline sections to match `rag_chunks`,
`hybrid_match_rag_chunks`, the OpenAI SDK, and `text-embedding-3-small`, and
link to this document for the metric definitions.

### Deliberately not doing yet

GraphRAG, agentic multi-hop retrieval, a vector database migration, a
fine-tuned embedding model, HyDE, and `text-embedding-3-large`. With 25
documents, corpus quality dominates all of these. A cross-encoder reranker is
the one algorithmic addition worth testing, and only after P3 and P4, because
it is the standard lever for Hit@1 and nDCG once recall is saturated.

---

## 5. Suggested order of work

| Step | Fixes | Re-run | Record as |
|---|---|---|---|
| 0 | none, full case set | retrieval + answers | retrieval v3, answer v2 |
| 1 | P1, P2, P5 (corpus) | retrieval + answers | v4 / v3 |
| 2 | P3, P4 (chunking) | retrieval | v5 |
| 3 | P6, P7 (query) | retrieval | v6 |
| 4 | P8, P9 (gate, figures) | answers | v4 |
| 5 | P10, P11 (eval, docs) | both | baseline for reranker test |

---

## 6. Results of the September 2026 improvement pass (recorded 2026-09-16)

All eleven problems in Section 4 were implemented on 2026-09-16. The work
landed in fewer, larger steps than the table above, so the version numbers
differ from the plan. Every version below is an immutable report under
`apps/backend/rag/evaluation/results/`.

### Retrieval

Case set grew from 30 to 45 (3 exact-figure, 3 multi-turn, 9 with
`required_substrings`). v3 is the untouched pipeline on the enlarged set.
v4 to v9 are on the improved pipeline; between them only the corpus, the
stitched-context caps, and one manual document ordering changed.

| Metric | v2 (30 cases, old) | v3 (39, old) | v4 (45, new) | v9 (45, final) | v3 to v9 |
|---|---:|---:|---:|---:|---:|
| MRR | 0.8622 | 0.8940 | 0.8796 | 0.8841 | -0.0099 |
| Hit@1 | 0.7667 | 0.8205 | 0.7778 | 0.8000 | -0.0205 |
| Hit@3 | 0.9667 | 0.9744 | 0.9778 | 0.9556 | -0.0188 |
| Hit@5 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| Recall@5 | 0.9167 | 0.8846 | 0.9370 | 0.9481 | +0.0635 |
| MAP@5 | 0.7750 | n/a | 0.8161 | 0.8276 | |
| nDCG@5 | 0.8353 | 0.8420 | 0.8662 | 0.8756 | +0.0336 |
| substring_hit_rate | n/a | n/a | 0.7500 | 1.0000 | |

Reading the table: the ranking metrics (nDCG@5, Recall@5, MAP@5) improved.
Hit@1 and Hit@3 are not directly comparable across v3 and v9 because six new,
harder cases were added; on the 39 shared cases the first-rank changes were
five improvements and four regressions, all among the FIRE source notes
where the "expected" document is a judgement call. The substring rate went
from 0.75 to 1.0 in three steps: whole-chunk stitched context (v5), wrapped
PDF lines rejoined into paragraphs (v6), and manual CPF documents leading
with their answer table (v9).

Intermediate versions: v5 (whole primary chunk, 0.9375 substrings), v6 to
v8 (wrapped-line rejoin, definitions carrying 2026 sums, provenance moved to
the end; 0.9375 each, a different single miss every time until the sibling
chunk was also returned whole).

### Answers

Case set grew from 12 to 23 (2 exact-figure cases, 5 in-scope-but-absent
refusals). From v3 the eval routes through the planner, so `figure_lookup`
and the pre-planner scope screen are exercised.

| Metric | v1 (12 cases) | v2 (16, old pipeline) | v3 (23, first new run) | v8 (23, final) |
|---|---:|---:|---:|---:|
| Overall pass rate | 1.0000 | 0.5000 | 0.8261 | 1.0000 |
| Refusal accuracy | 1.0000 | 0.0000 | 0.9091 | 1.0000 |
| Concept coverage | 1.0000 | 1.0000 | 0.9444 | 1.0000 |
| Numeric accuracy | 1.0000 | 1.0000 | 0.9583 | 1.0000 |
| Citation recall | 0.9444 | 0.9667 | 0.9722 | 0.9722 |
| Judge groundedness | 0.9667 | 0.9800 | 1.0000 | 1.0000 |
| Judge factual correctness | 1.0000 | 0.9600 | 1.0000 | 1.0000 |

The v2 refusal accuracy of 0 was an eval bug: the phrase list did not contain
the production refusal wording. It is now derived from the service constants.
v2 also showed the two real failures the pass set out to fix: the garbled
contribution-rate table produced an answer that added OW and AW rates, and
the truncated retirement-sums file produced a "3 x BRS" answer for 2025.

Between v3 and v8: two concept-alternative fixes in the case file
("employee's contribution", "without penalty"), the pre-planner scope screen
(a coding request had become a clarification question), the single-figure
routing rule for `figure_lookup` (a two-part rates-and-ceiling question had
been routed to the rates figure alone), and the corpus fixes above (the
emergency-fund answer had said "6 months" because the chunk boundary cut
"3 - 6 months' worth ... rule of | thumb").

### Gate calibration

Measured on the final corpus: the lowest top-cosine among the 45 answerable
questions is 0.539 (all with `signal_count = 2`). Of the five in-scope-but-
absent questions, only the MediSave one falls below the cosine gate (0.323);
the other four score 0.44 to 0.53 with both signals, indistinguishable from
answerable questions. The thresholds stay at 0.45 and 0.35; those four are
refused by the answer model's sentinel sentence instead, which is why the
answer eval, not the retrieval eval, is the guard for that behaviour.

### Second pass, 2026-09-16: structure recovery and personalised answers

Retrieval case set grew from 45 to 50 (five FAQ-specific cases; 28 cases now
carry `required_substrings`). Answer set unchanged at 23. New personal-data
suite of 10 cases over the Jen demo account.

| Retrieval metric | v9 (45 cases, before) | v10 (50, generated headline only) | v11 (50, final) |
|---|---:|---:|---:|
| MRR | 0.8841 | 0.8600 | 0.8947 |
| Hit@1 | 0.8000 | 0.7600 | 0.8200 |
| Hit@3 | 0.9556 | 0.9400 | 0.9600 |
| Hit@5 | 1.0000 | 0.9800 | 1.0000 |
| Recall@5 | 0.9481 | 0.9333 | 0.9400 |
| MAP@5 | 0.8276 | n/a | 0.8404 |
| nDCG@5 | 0.8756 | 0.8579 | 0.8814 |
| substring_hit_rate | 1.0000 | 0.9286 | 1.0000 |

v10 shows what happens when the FAQ question lists are replaced by the
generated headline: the weight-A keyword field loses the words users search
for. v11 keeps the real heading in front of the generated headline. The
candidate count (20, 30, 40) made no difference to v10, which ruled out
crowding by the larger chunk count.

Two substring labels were relaxed after v10: "basics of applying for SSBs"
now expects `CDP` and `$500` instead of the eligibility-specific phrases
(which have their own dedicated cases), and "basic MoneySense steps" expects
`3 to 6 months`, `15%` and `10%`.

| Answer metric | v8 (before) | v10 (final) |
|---|---:|---:|
| Overall pass rate | 1.0000 | 1.0000 |
| Refusal accuracy | 1.0000 | 1.0000 |
| Citation recall | 0.9722 | 0.9722 |
| Judge groundedness | 1.0000 | 1.0000 |

| Personal metric | v1 | v3 (final) |
|---|---:|---:|
| Overall pass rate | 0.7000 | 1.0000 |
| Mode accuracy | 1.0000 | 1.0000 |
| Fact accuracy | 0.8000 | 1.0000 |
| Leak-free rate | 1.0000 | 1.0000 |
| Missing-data handling | 1.0000 | 1.0000 |
| Judge groundedness | 0.7333 | 1.0000 |

The first personal run exposed two defects that unit tests had not: a data
plan that asked the model for an explanation used the model's
insufficient-evidence sentinel as the answer instead of the deterministic
sentence (fixed in `ember_service._execute_data_plan`), and the comparison
check assumed the tool's default month-to-date window while the planner had
chosen a full calendar month (the eval now recomputes expected facts for the
period named in the evidence). v3 also exempts answers that equal the tool's
own deterministic sentence from the groundedness judge.

### Semantic chunking: measured A/B (2026-09-16)

Semantic chunking was implemented as an experiment (not merged) and run
head-to-head against the structured chunker on the same documents and the
same retrieval cases (53 at the time of the run), through the real
`hybrid_match_rag_chunks` function via a temporary side table in the local
database. The semantic variant used the standard recipe: sentence split,
each sentence embedded with a one-sentence buffer on either side, a
breakpoint wherever the cosine distance between neighbours exceeded the 90th
percentile for the document, then a 300 to 1,500 character size clamp. Both
variants received the same generated headline and summary, the same
embedding model, and the same ranking.

| Metric (real RPC) | Structured (current) | Semantic |
|---|---:|---:|
| Chunks | 252 | 232 |
| Hit@1 | 0.8302 | 0.8302 |
| Hit@3 | 0.9623 | 0.9623 |
| Hit@5 | 1.0000 | 1.0000 |
| Recall@5 | 0.9528 | 0.9308 |
| MAP@5 | 0.8547 | 0.8429 |
| nDCG@5 | 0.8943 | 0.8807 |
| MRR | 0.9038 | 0.8953 |
| substring_hit_rate | 1.0000 | 0.9355 |

Per document type, semantic was marginally better on PDF-backed cases
(Hit@1 1.00 against 0.95) and marginally worse on manual notes (0.85 against
0.88); it lost ground mainly on the FIRE source notes and on two figure-bearing
chunks whose numbers ended up split across a breakpoint. Structured wins on
every ranking metric except the tied hit rates, keeps chunk identity
deterministic (no dependence on the embedding model for boundaries), and
costs nothing extra at ingest. Decision: keep structured chunking. Revisit
semantic chunking only for a new long-prose PDF with no recoverable headings.
An in-process Python replica of the ranker was also tried first and proved
unreliable as a referee (it scored the structured variant 0.06 nDCG below the
real function), so only the real-RPC numbers count.

### Always-on personalisation (2026-09-17)

"How can I improve on my spending expenses?" had returned generic advice
because the planner treated it as a knowledge question without the user's
data. Two changes: the aggregate snapshot is now attached to every knowledge
answer (`EMBER_PERSONALISE_MODE=always`), and it carries a spending block
(this month to date and last month: totals and top categories) so spending
advice can name the user's own categories and amounts. The same question now
answers with the user's largest categories and their figures.

Two regressions surfaced on the first run and were fixed the same day. With
the data block always present, the model answered a car-loan question from
general knowledge; the prompt now states that the block is evidence about the
user only and that the insufficient-evidence sentence must still be the whole
reply when the sources lack the rule. And a correct CPFIS answer was scored
as a refusal because it quoted the refusal sentence mid-reply; the answer
eval's refusal check is now anchored at the start of the reply, matching
production.

| Suite | Cases | Result |
|---|---:|---:|
| Answer v12 | 29 | pass rate 1.0000, refusal accuracy 1.0000 |
| Personal v9 | 11 | pass rate 1.0000, leak-free 1.0000 |

The web composer no longer locks while a reply streams; a follow-up sent
mid-stream excludes the still-streaming reply from its history.

### Where the remaining headroom is

- Hit@1 at 0.80 is now dominated by the FIRE source notes (ten short
  documents on overlapping topics). Labelling more than one acceptable
  document per case, or merging the notes, would tell whether this is a
  ranking problem or a labelling one.
- Citation recall of 0.9722 is a single case that expects three documents
  and cites two.
- A cross-encoder reranker over the 20 candidates is the next algorithmic
  lever; measure nDCG@3 before keeping it.

---

## 7. Source dating and metadata pass (recorded 2026-09-16)

This pass targeted recency: the store held no date metadata of any kind, and
the answer prompt never told the model what today's date was. It deliberately
made no schema, migration or RPC change.

### What changed

1. **Source currency, without new columns.** `last_reviewed` joins the manual
   front-matter whitelist and `published` joins the `check_pdfs.py` registry.
   `ingest.py` writes both into a generated `rag/source-metadata.json`, which
   `services/source_metadata.py` reads at answer time. Currency is a property
   of a document, not of a chunk, so three `rag_chunks` columns behind a
   migration would have been the wrong shape for 24 documents.
   `format_retrieved_context` emits one `As of:` line per source block, and the
   prompt tells the model to prefer the later-dated source when two disagree.
   `pdf_hashes.json` entries now carry `fetched_at` alongside the hash; the
   loader still accepts the old plain-string form.
2. **Front matter for the three bare manual documents.** `FIRE.md`,
   `fire-planning-singapore.md` and `investing-in-singapore.md` had none, so
   they entered the store with `agency = NULL` and a folder-derived topic. The
   existing folder-derived `topic` values were preserved deliberately, because
   `rag_questions.json` asserts them.
3. **Date-aware answering, scoped to curated sources.** The answer prompt now
   states today's Singapore date and how to choose a year.

### Results

| Metric | v11 (50 cases) | v12 (53) | v13 (53, final) |
|---|---:|---:|---:|
| MRR | 0.8947 | 0.8896 | 0.9038 |
| Hit@1 | 0.8200 | 0.8113 | 0.8302 |
| Hit@3 | 0.9600 | 0.9434 | 0.9623 |
| Hit@5 | 1.0000 | 1.0000 | 1.0000 |
| Recall@5 | 0.9400 | 0.9434 | 0.9528 |
| nDCG@3 | 0.8484 | 0.8465 | 0.8639 |
| nDCG@5 | 0.8814 | 0.8827 | 0.8951 |
| substring_hit_rate | 1.0000 | 1.0000 | 1.0000 |

Answers went from v10 (23 cases) to v14 (26 cases) at 1.0000 on every metric,
including citation recall, which was 0.9722. Personal is at v5, 1.0000
throughout.

### Three findings worth keeping

**v12 regressed Hit@3 below its own gate, and the cause was the new titles.**
Giving the bare documents `source_title` values of "FIRE in Singapore,
Comprehensive Knowledge Base" and "FIRE Planning in Singapore, Retrieval
Context" pushed `fire_expense_tracking` from rank 3 to 4. `source_title` is
weight A in the tsvector, so scaffolding words dilute the match. Cutting the
titles back to their bare subject produced v13, which beats v11 on every gated
metric. **A source title should name the subject and nothing else.**

**An unconditional year instruction makes the model invent dates.** The first
wording was "always state the year the value applies to". The CPF LIFE payout
case then answered "$319,400 ... This figure applies to the year 2026", when
the source says the table is computed as of 2025 for members turning 65 in
2035. The instruction is now conditional: name a year only when the evidence
ties the value to one, and otherwise report the source's own stated basis.

**Knowledge-path guidance must not leak into data answers.** With the dating
guidance applied to every answer, the personal `next_action` case stopped
returning the backend's deterministic sentence and started hedging
("FireBuddy's suggested next step ... is not explicitly stated"), scoring 3/5
on groundedness. The guidance is now added only when the context contains
curated `[Source N]` blocks. A data answer has no dated sources to reason about.

### Where the remaining headroom is now

- Hit@1 at 0.8302 is still dominated by the FIRE source notes.
- The IRAS relief leaflet has no recoverable publication date anywhere, so it
  reports `As of: Date unknown` — the one stale document the `As of` line
  cannot yet rank against a fresher source.
- The two new exact-figure year cases both resolve through `figure_lookup`, so
  they do not exercise retrieval's year handling at all.
  `cpf_life_payout_states_its_year_basis` is the case that does.
- A reranker over the candidate pool remains the next algorithmic lever;
  measure nDCG@3, now 0.8639.

---

## 8. Figure coverage and IRAS currency pass (recorded 2026-09-16)

An audit of what the corpus could support as deterministic lookups found a
correctness bug that mattered more than the missing figures.

### The IRAS document was seven years stale and ingested

`markdown-cache/iras/tax-relief-individuals.md` dates itself "correct as at
18 Feb 2019" and covers YA 2019. It was being retrieved and quoted as current.
Two lines were actively wrong:

- a Bicentennial Bonus personal income tax rebate of 50% capped at $200, which
  applied to YA 2019 only and has expired;
- CPF cash top-up relief of "$7,000 for self, $7,000 for family members", which
  contradicted the corpus's own MoneySense 2024 booklet and `FIRE.md`, both of
  which say $8,000 and $8,000.

Its two-column infographic layout also flattened into prose that separated
relief names from their amounts, so parent relief and NSman relief appeared as
bare numbers with no labels.

It is now `superseded_by` a hand-authored `manual/iras/tax-reliefs.md` carrying
only figures verified against current IRAS pages. The PDF is still downloaded
and hash-checked, so a change still alerts; it is no longer ingested. A new
answer case, `iras_bicentennial_rebate_is_not_current`, asserts that Ember does
not offer the expired rebate.

`FIRE.md` also carried "BHS, fixed at $75,500 for those turning 65 in 2025" as
if current; the 2026 BHS is $79,000. Both occurrences were corrected.

### New figures, and one deliberately excluded

Five keys added, each backed by a new hand-authored table citing the official
source: `cpf_basic_healthcare_sum` (2016-2026), `cpf_annual_limit`,
`cpf_interest_rates`, `cpf_extra_interest`, and
`iras_cpf_cash_topup_relief_cap`.

The Additional Wage ceiling was **not** made a figure key. It is a formula
($102,000 minus the year's Ordinary Wages subject to CPF), not one number, and
the planner's own rule routes anything that is not a single figure to the
knowledge path. `manual/cpf/cpf-wage-ceilings-and-limits.md` covers it there.

Also worth recording: the obvious source for CPF interest rates,
`InterestRate.pdf` on cpf.gov.sg, looks canonical but its last row is Jul-Sep
2024. Wiring it into the registry would have made the app cite two-year-old
rates. The live figures are only in the quarterly news releases, which are HTML,
so they were hand-authored instead.

### Results

| Metric | v13 (53 cases) | v14 (58) | v15 (58, final) |
|---|---:|---:|---:|
| MRR | 0.9038 | 0.9034 | 0.9034 |
| Hit@1 | 0.8302 | 0.8276 | 0.8276 |
| Hit@3 | 0.9623 | 0.9655 | 0.9655 |
| Hit@5 | 1.0000 | 1.0000 | 1.0000 |
| Recall@5 | 0.9528 | 0.9569 | 0.9569 |
| nDCG@3 | 0.8639 | 0.8693 | 0.8693 |
| nDCG@5 | 0.8951 | 0.8977 | 0.8977 |
| substring_hit_rate | 1.0000 | 0.9722 | 1.0000 |

v14 lost a substring: the vague case `iras_tax_relief_individuals` retrieved the
new IRAS document but not the section holding `$80,000`. Moving the cap into the
document's opening paragraph restored it, which is the same lesson as v9 in the
September pass — **a document should lead with its own answer**. Answers went to
v15, 29 cases, 1.0000 throughout; personal to v6, 1.0000 throughout.

### Drift detection

`fetchAndConvert/check_figure_drift.py` compares the hand-maintained
`annual-figures.json` with the `annual-figures.extracted.json` that
`fetch_figures.py` already produced and nothing ever read. It maps the flat
extraction schema onto the curated figure-and-year shape, compares only the
figures present in both, and fails the monthly workflow on a mismatch. It
deliberately does not copy the extracted value, which comes from a model
reading a PDF and can itself be wrong.

### Where the remaining headroom is now

- Hit@1 at 0.8276 is still the FIRE source notes.
- Still absent from the corpus and needing new official sources: IRAS resident
  income tax rate bands, MediSave contribution rates for the self-employed, HDB
  housing grants (HDB is not a registry publisher at all), and the SSB
  maximum-per-issue figure.
- Several ingested caches still have no `published` date, so they report
  `As of: Date unknown`: the two CPFIS documents and the MoneySense basic
  planning guide.
- A reranker remains the next algorithmic lever; nDCG@3 is now 0.8693.

---

## 9. Source currency cleanup (recorded 2026-09-17)

Prompted by a request to remove outdated documents. Sorting every ingested
document by date against the eval cases that depend on it showed that deletion
was the wrong tool in every case:

- **Already inert (6 files).** The YA 2019 IRAS leaflet and the four superseded
  CPF caches are not ingested. Deleting them from disk achieves nothing, because
  `pdf_to_md.py` regenerates them from the PDFs on the next monthly run.
  `superseded_by` is the retirement mechanism in this repo.
- **Old but not superseded (the two MAS documents).** The 2019 factsheet and
  2022 FAQs are the newest versions MAS publishes, and 18 eval cases depend on
  them. Deleting them would drop Hit@5 below its 1.0 gate.
- **Undated (3 files).** Not stale, just missing `published` in the registry, so
  they reported `As of: Date unknown` and could not take part in the freshness
  comparison.

### What changed instead

`published` dates were added for the two CPFIS caches, both read from the
documents' own footers (Sep 2025 and Dec 2022). The MoneySense basic planning
guide states no date anywhere and was left unknown rather than guessed.

The MAS factsheet was superseded by a hand-authored
`manual/mas/singapore-savings-bonds.md`. Its product terms were still accurate,
but its step-up worked example (0.9% first-year, 2.4% effective, from a 2015
bond) and its "10-year SGS yield has generally been between 2% to 3%" line
describe the decade to 2019. The replacement carries the terms and deliberately
reproduces no example rate, since rates are set per issue. Every fact in it was
re-verified against MAS; the MAS product pages were erroring, so the term,
interest frequency, step-up mechanics, tax treatment and CPF ineligibility came
from the 2022 FAQs, which remain ingested.

### One label was changed, which deserves scrutiny

Superseding the factsheet flipped `fire_with_safe_assets` from rank 1 to 2 and
took Hit@1 to 0.8103, under its gate. The fix was not a threshold change: it was
adding `manual/fire/FIRE.md` to that case's expected documents. `FIRE.md` has
sections 6.5 and 6.6 on Savings Bonds and T-bills, line 186 calls them "the
low-risk tranche in a FIRE portfolio", and line 364 gives a 10-15% allocation —
it answers "how might lower-risk assets fit into a FIRE portfolio" directly, and
the original label omitted it. This is the labelling-versus-ranking question
section 6 flagged for the FIRE cluster, resolved as labelling on the evidence.
It is recorded here because relabelling a case after a metric drops is exactly
what gaming an evaluation looks like; the justification is the document text,
and the change is easy to revert.

### Results

| Metric | v15 (58 cases) | v16 (58) | v17 (58, final) |
|---|---:|---:|---:|
| MRR | 0.9034 | 0.8948 | 0.9034 |
| Hit@1 | 0.8276 | 0.8103 | 0.8276 |
| Hit@3 | 0.9655 | 0.9655 | 0.9655 |
| Hit@5 | 1.0000 | 1.0000 | 1.0000 |
| Recall@5 | 0.9569 | 0.9569 | 0.9598 |
| nDCG@3 | 0.8693 | 0.8654 | 0.8719 |
| nDCG@5 | 0.8977 | 0.8938 | 0.9004 |
| substring_hit_rate | 1.0000 | 1.0000 | 1.0000 |

nDCG@5 crosses 0.90 for the first time. Answers are at v16 and personal at v7,
both 1.0000 throughout.

### Still outstanding

- `markdown-cache/moneysense/basic-financial-planning-guide.md` has no
  recoverable publication date.
- The CPFIS instruments document (Dec 2022) still describes the Special Account
  as investable, which reads oddly after the January 2025 SA closure for members
  aged 55 and above. Its extra-interest table is current and is why it stays.
- Corpus gaps needing new publishers: IRAS income tax bands, MediSave rates for
  the self-employed, HDB housing grants.
