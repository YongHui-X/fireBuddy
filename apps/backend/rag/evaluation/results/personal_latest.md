# FireBuddy personal-data evaluation

> Report version: **Version 11**
> Run label: **Masked prompt baseline October 2026 with demo consent**

Generated: `2026-10-03T07:31:39.716519+00:00`
Cases: **11**
Account: **jen@demo.com**
LLM judge: **enabled**

## Summary

| Metric | Score |
|---|---:|
| overall_pass_rate | 0.7273 |
| mode_accuracy | 0.9091 |
| fact_accuracy | 0.8182 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 0.0000 |
| judge_groundedness | 0.9714 |

## Cases

| Case | Mode | Result | Facts | Leak-free | Judge |
|---|---|---|---|---|---:|
| spending_this_month | data | pass | 1/1 | yes | deterministic |
| top_categories_this_month | data | pass | 1/1 | yes | deterministic |
| compare_with_last_month | data | pass | 2/2 | yes | 5/5 |
| net_worth_explained | data | pass | 1/1 | yes | deterministic |
| emergency_fund_vs_moneysense | hybrid | pass | 1/1 | yes | 5/5 |
| savings_rate_vs_guidance | hybrid | pass | 1/1 | yes | 5/5 |
| fire_timeline | data | fail | 0/1 | yes | 4/5 |
| cpf_adequacy_personalised | hybrid | pass | 1/1 | yes | 5/5 |
| next_action | data | pass | 1/1 | yes | 5/5 |
| improve_my_spending | hybrid | fail | 0/1 | yes | 5/5 |
| missing_data_user | unsupported | fail | n/a | yes | n/a |
