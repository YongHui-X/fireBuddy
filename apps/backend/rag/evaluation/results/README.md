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

### Version 10: Structure recovery: FAQ headings, sibling merge, 5 new FAQ cases

Generated: `2026-09-16T06:20:43.908580+00:00`
Cases: **50**

| Metric | Score |
|---|---:|
| mrr | 0.8600 |
| hit_rate@1 | 0.7600 |
| precision@1 | 0.7600 |
| recall@1 | 0.5933 |
| map@1 | 0.7600 |
| ndcg@1 | 0.7600 |
| hit_rate@3 | 0.9400 |
| precision@3 | 0.4067 |
| recall@3 | 0.8600 |
| map@3 | 0.7817 |
| ndcg@3 | 0.8197 |
| hit_rate@5 | 0.9800 |
| precision@5 | 0.2760 |
| recall@5 | 0.9333 |
| map@5 | 0.8120 |
| ndcg@5 | 0.8579 |
| substring_hit_rate | 0.9286 |

Artifacts: [Markdown](retrieval/versions/v010.md) | [JSON](retrieval/versions/v010.json)

### Version 11: Structure recovery with combined headlines, 50 cases

Generated: `2026-09-16T06:37:41.758865+00:00`
Cases: **50**

| Metric | Score |
|---|---:|
| mrr | 0.8947 |
| hit_rate@1 | 0.8200 |
| precision@1 | 0.8200 |
| recall@1 | 0.6433 |
| map@1 | 0.8200 |
| ndcg@1 | 0.8200 |
| hit_rate@3 | 0.9600 |
| precision@3 | 0.4200 |
| recall@3 | 0.8733 |
| map@3 | 0.8144 |
| ndcg@3 | 0.8484 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2800 |
| recall@5 | 0.9400 |
| map@5 | 0.8404 |
| ndcg@5 | 0.8814 |
| substring_hit_rate | 1.0000 |

Artifacts: [Markdown](retrieval/versions/v011.md) | [JSON](retrieval/versions/v011.json)

### Version 12: Source metadata, date-aware answers

Generated: `2026-09-16T07:09:14.773651+00:00`
Cases: **53**

| Metric | Score |
|---|---:|
| mrr | 0.8896 |
| hit_rate@1 | 0.8113 |
| precision@1 | 0.8113 |
| recall@1 | 0.6541 |
| map@1 | 0.8113 |
| ndcg@1 | 0.8113 |
| hit_rate@3 | 0.9434 |
| precision@3 | 0.4088 |
| recall@3 | 0.8711 |
| map@3 | 0.8160 |
| ndcg@3 | 0.8465 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2755 |
| recall@5 | 0.9434 |
| map@5 | 0.8429 |
| ndcg@5 | 0.8827 |
| substring_hit_rate | 1.0000 |

Artifacts: [Markdown](retrieval/versions/v012.md) | [JSON](retrieval/versions/v012.json)

### Version 13: Source metadata, cleaned titles, date-aware answers

Generated: `2026-09-16T07:16:06.385081+00:00`
Cases: **53**

| Metric | Score |
|---|---:|
| mrr | 0.9038 |
| hit_rate@1 | 0.8302 |
| precision@1 | 0.8302 |
| recall@1 | 0.6635 |
| map@1 | 0.8302 |
| ndcg@1 | 0.8302 |
| hit_rate@3 | 0.9623 |
| precision@3 | 0.4214 |
| recall@3 | 0.8899 |
| map@3 | 0.8318 |
| ndcg@3 | 0.8639 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2792 |
| recall@5 | 0.9528 |
| map@5 | 0.8563 |
| ndcg@5 | 0.8951 |
| substring_hit_rate | 1.0000 |

Artifacts: [Markdown](retrieval/versions/v013.md) | [JSON](retrieval/versions/v013.json)

### Version 14: Expanded figure coverage, current IRAS reliefs

Generated: `2026-09-16T15:14:57.842660+00:00`
Cases: **58**

| Metric | Score |
|---|---:|
| mrr | 0.9034 |
| hit_rate@1 | 0.8276 |
| precision@1 | 0.8276 |
| recall@1 | 0.6753 |
| map@1 | 0.8276 |
| ndcg@1 | 0.8276 |
| hit_rate@3 | 0.9655 |
| precision@3 | 0.4138 |
| recall@3 | 0.8994 |
| map@3 | 0.8376 |
| ndcg@3 | 0.8693 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2724 |
| recall@5 | 0.9569 |
| map@5 | 0.8601 |
| ndcg@5 | 0.8977 |
| substring_hit_rate | 0.9722 |

Artifacts: [Markdown](retrieval/versions/v014.md) | [JSON](retrieval/versions/v014.json)

### Version 15: Expanded figure coverage, current IRAS reliefs, cap leads the document

Generated: `2026-09-16T15:19:31.139080+00:00`
Cases: **58**

| Metric | Score |
|---|---:|
| mrr | 0.9034 |
| hit_rate@1 | 0.8276 |
| precision@1 | 0.8276 |
| recall@1 | 0.6753 |
| map@1 | 0.8276 |
| ndcg@1 | 0.8276 |
| hit_rate@3 | 0.9655 |
| precision@3 | 0.4138 |
| recall@3 | 0.8994 |
| map@3 | 0.8376 |
| ndcg@3 | 0.8693 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2724 |
| recall@5 | 0.9569 |
| map@5 | 0.8601 |
| ndcg@5 | 0.8977 |
| substring_hit_rate | 1.0000 |

Artifacts: [Markdown](retrieval/versions/v015.md) | [JSON](retrieval/versions/v015.json)

### Version 16: Current SSB terms supersede the 2019 factsheet

Generated: `2026-09-17T02:31:49.879448+00:00`
Cases: **58**

| Metric | Score |
|---|---:|
| mrr | 0.8948 |
| hit_rate@1 | 0.8103 |
| precision@1 | 0.8103 |
| recall@1 | 0.6667 |
| map@1 | 0.8103 |
| ndcg@1 | 0.8103 |
| hit_rate@3 | 0.9655 |
| precision@3 | 0.4138 |
| recall@3 | 0.8994 |
| map@3 | 0.8333 |
| ndcg@3 | 0.8654 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2724 |
| recall@5 | 0.9569 |
| map@5 | 0.8557 |
| ndcg@5 | 0.8938 |
| substring_hit_rate | 1.0000 |

Artifacts: [Markdown](retrieval/versions/v016.md) | [JSON](retrieval/versions/v016.json)

### Version 17: Current SSB terms supersede the 2019 factsheet

Generated: `2026-09-17T02:33:56.034395+00:00`
Cases: **58**

| Metric | Score |
|---|---:|
| mrr | 0.9034 |
| hit_rate@1 | 0.8276 |
| precision@1 | 0.8276 |
| recall@1 | 0.6724 |
| map@1 | 0.8276 |
| ndcg@1 | 0.8276 |
| hit_rate@3 | 0.9655 |
| precision@3 | 0.4195 |
| recall@3 | 0.9023 |
| map@3 | 0.8405 |
| ndcg@3 | 0.8719 |
| hit_rate@5 | 1.0000 |
| precision@5 | 0.2759 |
| recall@5 | 0.9598 |
| map@5 | 0.8629 |
| ndcg@5 | 0.9004 |
| substring_hit_rate | 1.0000 |

Artifacts: [Markdown](retrieval/versions/v017.md) | [JSON](retrieval/versions/v017.json)


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

### Version 9: After structure recovery and hybrid explanation rule

Generated: `2026-09-16T06:23:28.024954+00:00`
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

Artifacts: [Markdown](answer/versions/v009.md) | [JSON](answer/versions/v009.json)

### Version 10: After structure recovery, combined headlines, personalised knowledge path

Generated: `2026-09-16T06:39:57.341766+00:00`
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

Artifacts: [Markdown](answer/versions/v010.md) | [JSON](answer/versions/v010.json)

### Version 11: Source metadata, cleaned titles, date-aware answers

Generated: `2026-09-16T07:18:47.256115+00:00`
Cases: **25**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v011.md) | [JSON](answer/versions/v011.json)

### Version 12: Source metadata, cleaned titles, date-aware answers

Generated: `2026-09-16T07:22:17.912680+00:00`
Cases: **26**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9615 |
| positive_pass_rate | 0.9333 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 0.9778 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v012.md) | [JSON](answer/versions/v012.json)

### Version 13: Conditional year statement in the answer prompt

Generated: `2026-09-16T07:25:28.382798+00:00`
Cases: **26**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v013.md) | [JSON](answer/versions/v013.json)

### Version 14: Source dating guidance gated to curated sources

Generated: `2026-09-16T07:34:14.303248+00:00`
Cases: **26**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v014.md) | [JSON](answer/versions/v014.json)

### Version 15: Expanded figure coverage, current IRAS reliefs

Generated: `2026-09-16T15:22:31.062914+00:00`
Cases: **29**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v015.md) | [JSON](answer/versions/v015.json)

### Version 16: Current SSB terms supersede the 2019 factsheet

Generated: `2026-09-17T02:36:48.398772+00:00`
Cases: **29**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v016.md) | [JSON](answer/versions/v016.json)

### Version 17: Always-on personal context for knowledge answers

Generated: `2026-09-17T04:04:00.226132+00:00`
Cases: **29**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9310 |
| positive_pass_rate | 0.9412 |
| refusal_accuracy | 0.9167 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v017.md) | [JSON](answer/versions/v017.json)

### Version 18: Always-on personal context, sentinel rule restated, anchored refusal check

Generated: `2026-09-17T04:09:14.149326+00:00`
Cases: **29**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| positive_pass_rate | 1.0000 |
| refusal_accuracy | 1.0000 |
| concept_coverage | 1.0000 |
| numeric_accuracy | 1.0000 |
| citation_recall | 1.0000 |
| judge_groundedness | 1.0000 |
| judge_factual_correctness | 1.0000 |
| judge_citation_support | 1.0000 |
| judge_numerical_accuracy | 1.0000 |

Artifacts: [Markdown](answer/versions/v018.md) | [JSON](answer/versions/v018.json)


## Personal-data evaluations

### Version 1: Personal context over Jen demo, first run

Generated: `2026-09-16T06:41:03.411607+00:00`
Cases: **10**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.7000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 0.8000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 0.7333 |

Artifacts: [Markdown](personal/versions/v001.md) | [JSON](personal/versions/v001.json)

### Version 2: Personal context over Jen demo, sentinel guard and period-aware facts

Generated: `2026-09-16T06:43:49.887949+00:00`
Cases: **10**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 0.9333 |

Artifacts: [Markdown](personal/versions/v002.md) | [JSON](personal/versions/v002.json)

### Version 3: Personal context over Jen demo, deterministic answers exempt from judge

Generated: `2026-09-16T06:45:15.852408+00:00`
Cases: **10**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 1.0000 |

Artifacts: [Markdown](personal/versions/v003.md) | [JSON](personal/versions/v003.json)

### Version 4: Conditional year statement in the answer prompt

Generated: `2026-09-16T07:26:44.949381+00:00`
Cases: **10**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 0.9200 |

Artifacts: [Markdown](personal/versions/v004.md) | [JSON](personal/versions/v004.json)

### Version 5: Source dating guidance gated to curated sources

Generated: `2026-09-16T07:31:33.147571+00:00`
Cases: **10**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 1.0000 |

Artifacts: [Markdown](personal/versions/v005.md) | [JSON](personal/versions/v005.json)

### Version 6: Expanded figure coverage, current IRAS reliefs

Generated: `2026-09-16T15:23:38.311020+00:00`
Cases: **10**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 1.0000 |

Artifacts: [Markdown](personal/versions/v006.md) | [JSON](personal/versions/v006.json)

### Version 7: Current SSB terms supersede the 2019 factsheet

Generated: `2026-09-17T02:37:41.567936+00:00`
Cases: **10**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 1.0000 |

Artifacts: [Markdown](personal/versions/v007.md) | [JSON](personal/versions/v007.json)

### Version 8: Always-on personal context with spending block, improve-spending case

Generated: `2026-09-17T04:00:50.868209+00:00`
Cases: **11**

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.9091 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 0.9091 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 1.0000 |

Artifacts: [Markdown](personal/versions/v008.md) | [JSON](personal/versions/v008.json)

### Version 9: Always-on personal context, any-of savings fact

Generated: `2026-09-17T04:10:21.596910+00:00`
Cases: **11**

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 1.0000 |

Artifacts: [Markdown](personal/versions/v009.md) | [JSON](personal/versions/v009.json)
