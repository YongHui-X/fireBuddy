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

### Where the remaining headroom is

- Hit@1 at 0.80 is now dominated by the FIRE source notes (ten short
  documents on overlapping topics). Labelling more than one acceptable
  document per case, or merging the notes, would tell whether this is a
  ranking problem or a labelling one.
- Citation recall of 0.9722 is a single case that expects three documents
  and cites two.
- A cross-encoder reranker over the 20 candidates is the next algorithmic
  lever; measure nDCG@3 before keeping it.
