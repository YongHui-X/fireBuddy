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
