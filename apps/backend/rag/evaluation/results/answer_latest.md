# FireBuddy answer-quality evaluation

> Report version: **Version 1**  
> Run label: **RAG hardening baseline**

Generated: `2026-08-12T09:18:47.209002+00:00`
Cases: **12**
LLM judge: **enabled**

## Summary

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

## Cases

| Case | Expected behavior | Result | Concepts | Numbers | Citations |
|---|---|---|---:|---:|---:|
| cpf_2026_contribution_rate | answer | pass | 1.00 | 1.00 | 1.00 |
| moneysense_emergency_fund | answer | pass | 1.00 | 1.00 | 1.00 |
| iras_relief_cap | answer | pass | 1.00 | 1.00 | 1.00 |
| cpfis_protected_balances | answer | pass | 1.00 | 1.00 | 1.00 |
| srs_contribution_caps | answer | pass | 1.00 | 1.00 | 1.00 |
| ssb_holding_and_liquidity | answer | pass | 1.00 | 1.00 | 0.67 |
| out_of_scope_weather | refuse | pass | 1.00 | 1.00 | 1.00 |
| out_of_scope_recipe | refuse | pass | 1.00 | 1.00 | 1.00 |
| out_of_scope_medical | refuse | pass | 1.00 | 1.00 | 1.00 |
| out_of_scope_legal | refuse | pass | 1.00 | 1.00 | 1.00 |
| out_of_scope_coding | refuse | pass | 1.00 | 1.00 | 1.00 |
| unsupported_live_crypto_price | refuse | pass | 1.00 | 1.00 | 1.00 |
