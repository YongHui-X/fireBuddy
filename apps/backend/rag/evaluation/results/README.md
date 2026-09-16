# FireBuddy RAG evaluation history

Major test runs are stored as immutable numbered artifacts. The `*_latest` files are convenience copies of the newest version and are not the historical record.

## Retrieval evaluations

### Version 1: RAG hardening baseline

Generated: `2026-08-12T05:06:32.371311+00:00`
Cases: **30**

| Metric | Score |
|---|---:|
| mrr | 0.7861 |
| hit_rate@1 | 0.6000 |
| precision@1 | 0.6000 |
| recall@1 | 0.4667 |
| map@1 | 0.6000 |
| ndcg@1 | 0.6000 |
| hit_rate@3 | 0.9667 |
| precision@3 | 0.3667 |
| recall@3 | 0.7833 |
| map@3 | 0.6444 |
| ndcg@3 | 0.7148 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2400 |
| recall@5 | 0.8500 |
| map@5 | 0.6694 |
| ndcg@5 | 0.7467 |

Artifacts: [Markdown](retrieval/versions/v001.md) | [JSON](retrieval/versions/v001.json)

### Version 2: HNSW and hybrid RRF retrieval

Generated: `2026-08-14T06:11:00.208780+00:00`
Cases: **30**

| Metric | Score |
|---|---:|
| mrr | 0.8622 |
| hit_rate@1 | 0.7667 |
| precision@1 | 0.7667 |
| recall@1 | 0.6000 |
| map@1 | 0.7667 |
| ndcg@1 | 0.7667 |
| hit_rate@3 | 0.9667 |
| precision@3 | 0.3778 |
| recall@3 | 0.8167 |
| map@3 | 0.7333 |
| ndcg@3 | 0.7851 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2667 |
| recall@5 | 0.9167 |
| map@5 | 0.7750 |
| ndcg@5 | 0.8353 |

Artifacts: [Markdown](retrieval/versions/v002.md) | [JSON](retrieval/versions/v002.json)

### Version 3: Full 39-case set, no pipeline change

Generated: `2026-09-15T15:53:01.158811+00:00`
Cases: **39**

| Metric | Score |
|---|---:|
| mrr | 0.8940 |
| hit_rate@1 | 0.8205 |
| precision@1 | 0.8205 |
| recall@1 | 0.6068 |
| map@1 | 0.8205 |
| ndcg@1 | 0.8205 |
| hit_rate@3 | 0.9744 |
| precision@3 | 0.4188 |
| recall@3 | 0.8248 |
| map@3 | 0.7628 |
| ndcg@3 | 0.8105 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2769 |
| recall@5 | 0.8846 |
| map@5 | 0.7910 |
| ndcg@5 | 0.8420 |

Artifacts: [Markdown](retrieval/versions/v003.md) | [JSON](retrieval/versions/v003.json)

### Version 4: Corpus fix, contextual chunks, english FTS, acronym expansion, planner rewrite

Generated: `2026-09-16T02:08:09.815331+00:00`
Cases: **45**

| Metric | Score |
|---|---:|
| mrr | 0.8796 |
| hit_rate@1 | 0.7778 |
| precision@1 | 0.7778 |
| recall@1 | 0.6037 |
| map@1 | 0.7778 |
| ndcg@1 | 0.7778 |
| hit_rate@3 | 0.9778 |
| precision@3 | 0.4222 |
| recall@3 | 0.8667 |
| map@3 | 0.7852 |
| ndcg@3 | 0.8297 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2844 |
| recall@5 | 0.9370 |
| map@5 | 0.8161 |
| ndcg@5 | 0.8662 |
| substring_hit_rate | 0.7500 |

Artifacts: [Markdown](retrieval/versions/v004.md) | [JSON](retrieval/versions/v004.json)

### Version 5: Whole-chunk stitched context after improvement pass

Generated: `2026-09-16T02:12:36.240337+00:00`
Cases: **45**

| Metric | Score |
|---|---:|
| mrr | 0.8796 |
| hit_rate@1 | 0.7778 |
| precision@1 | 0.7778 |
| recall@1 | 0.6037 |
| map@1 | 0.7778 |
| ndcg@1 | 0.7778 |
| hit_rate@3 | 0.9778 |
| precision@3 | 0.4222 |
| recall@3 | 0.8667 |
| map@3 | 0.7852 |
| ndcg@3 | 0.8297 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2844 |
| recall@5 | 0.9370 |
| map@5 | 0.8161 |
| ndcg@5 | 0.8662 |
| substring_hit_rate | 0.9375 |

Artifacts: [Markdown](retrieval/versions/v005.md) | [JSON](retrieval/versions/v005.json)

### Version 6: Wrapped-line paragraph rejoin in PDF conversion

Generated: `2026-09-16T02:28:17.800092+00:00`
Cases: **45**

| Metric | Score |
|---|---:|
| mrr | 0.8841 |
| hit_rate@1 | 0.8000 |
| precision@1 | 0.8000 |
| recall@1 | 0.6148 |
| map@1 | 0.8000 |
| ndcg@1 | 0.8000 |
| hit_rate@3 | 0.9556 |
| precision@3 | 0.4148 |
| recall@3 | 0.8556 |
| map@3 | 0.7889 |
| ndcg@3 | 0.8279 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2889 |
| recall@5 | 0.9481 |
| map@5 | 0.8276 |
| ndcg@5 | 0.8756 |
| substring_hit_rate | 0.9375 |

Artifacts: [Markdown](retrieval/versions/v006.md) | [JSON](retrieval/versions/v006.json)

### Version 7: Retirement sums definitions carry 2026 figures

Generated: `2026-09-16T02:34:20.288619+00:00`
Cases: **45**

| Metric | Score |
|---|---:|
| mrr | 0.8841 |
| hit_rate@1 | 0.8000 |
| precision@1 | 0.8000 |
| recall@1 | 0.6148 |
| map@1 | 0.8000 |
| ndcg@1 | 0.8000 |
| hit_rate@3 | 0.9556 |
| precision@3 | 0.4148 |
| recall@3 | 0.8556 |
| map@3 | 0.7889 |
| ndcg@3 | 0.8279 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2889 |
| recall@5 | 0.9481 |
| map@5 | 0.8276 |
| ndcg@5 | 0.8756 |
| substring_hit_rate | 0.9375 |

Artifacts: [Markdown](retrieval/versions/v007.md) | [JSON](retrieval/versions/v007.json)

### Version 8: Manual CPF documents lead with the answer, provenance moved to the end

Generated: `2026-09-16T02:41:50.027573+00:00`
Cases: **45**

| Metric | Score |
|---|---:|
| mrr | 0.8841 |
| hit_rate@1 | 0.8000 |
| precision@1 | 0.8000 |
| recall@1 | 0.6148 |
| map@1 | 0.8000 |
| ndcg@1 | 0.8000 |
| hit_rate@3 | 0.9556 |
| precision@3 | 0.4148 |
| recall@3 | 0.8556 |
| map@3 | 0.7889 |
| ndcg@3 | 0.8279 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2889 |
| recall@5 | 0.9481 |
| map@5 | 0.8276 |
| ndcg@5 | 0.8756 |
| substring_hit_rate | 0.9375 |

Artifacts: [Markdown](retrieval/versions/v008.md) | [JSON](retrieval/versions/v008.json)

### Version 9: Whole sibling chunks; rates intro carries the age-band table

Generated: `2026-09-16T02:48:23.404719+00:00`
Cases: **45**

| Metric | Score |
|---|---:|
| mrr | 0.8841 |
| hit_rate@1 | 0.8000 |
| precision@1 | 0.8000 |
| recall@1 | 0.6148 |
| map@1 | 0.8000 |
| ndcg@1 | 0.8000 |
| hit_rate@3 | 0.9556 |
| precision@3 | 0.4148 |
| recall@3 | 0.8556 |
| map@3 | 0.7889 |
| ndcg@3 | 0.8279 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2889 |
| recall@5 | 0.9481 |
| map@5 | 0.8276 |
| ndcg@5 | 0.8756 |
| substring_hit_rate | 1.0000 |

Artifacts: [Markdown](retrieval/versions/v009.md) | [JSON](retrieval/versions/v009.json)


## Answer-quality evaluations

### Version 1: RAG hardening baseline

Generated: `2026-08-12T09:18:47.209002+00:00`
Cases: **12**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 0.9444 |
| judge_groundedness | 0.9667 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v001.md) | [JSON](answer/versions/v001.json)

### Version 2: Full 16-case set, no pipeline change

Generated: `2026-09-15T15:54:08.878405+00:00`
Cases: **16**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.5000 |
| positive_pass_rate | 0.8000 |
| refusal_accuracy | 0.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 0.9667 |
| judge_groundedness | 0.9800 |
| judge_factual_correctness | 0.9600 |
| judge_citation_support | 0.9800 |
| judge_numerical_accuracy | 0.9400 |

Artifacts: [Markdown](answer/versions/v002.md) | [JSON](answer/versions/v002.json)

### Version 3: 23 cases via planner after improvement pass

Generated: `2026-09-16T02:15:40.476884+00:00`
Cases: **23**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.8261 |
| positive_pass_rate | 0.7500 |
| refusal_accuracy | 0.9091 |
| concept_coverage | 0.9444 |
| numeric_accuracy | 0.9583 |
| citation_recall | 0.9722 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v003.md) | [JSON](answer/versions/v003.json)

### Version 4: 23 cases via planner, pre-planner scope screen, sentinel refusal

Generated: `2026-09-16T02:19:58.259724+00:00`
Cases: **23**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9565 |
| positive_pass_rate | 0.9167 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 0.9583 |
| citation_recall | 0.9722 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v004.md) | [JSON](answer/versions/v004.json)

### Version 5: 23 cases via planner after wrapped-line rejoin

Generated: `2026-09-16T02:30:19.914370+00:00`
Cases: **23**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9565 |
| positive_pass_rate | 0.9167 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 0.9167 |
| numeric_accuracy | 0.9722 |
| citation_recall | 0.9722 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v005.md) | [JSON](answer/versions/v005.json)

### Version 6: 23 cases via planner, single-figure routing rule

Generated: `2026-09-16T02:36:26.633890+00:00`
Cases: **23**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 0.9722 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v006.md) | [JSON](answer/versions/v006.json)

### Version 7: 23 cases via planner on the final corpus

Generated: `2026-09-16T02:43:55.687950+00:00`
Cases: **23**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9565 |
| positive_pass_rate | 0.9167 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 0.9333 |
| citation_recall | 0.9722 |
| judge_groundedness | 0.9667 |
| judge_factual_correctness | 0.9833 |
| judge_citation_support | 0.9833 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v007.md) | [JSON](answer/versions/v007.json)

### Version 8: 23 cases via planner on the final corpus and RPC

Generated: `2026-09-16T02:50:29.100131+00:00`
Cases: **23**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 0.9722 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v008.md) | [JSON](answer/versions/v008.json)
