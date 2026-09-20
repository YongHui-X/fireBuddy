# FireBuddy personal-data evaluation

> Report version: **Version 9**
> Run label: **Always-on personal context, any-of savings fact**

Generated: `2026-09-17T04:10:21.596910+00:00`
Cases: **11**
Account: **jen@demo.com**
LLM judge: **enabled**

## Summary

| Metric | Score |
|---|---:|
| overall_pass_rate | 1.0000 |
| mode_accuracy | 1.0000 |
| fact_accuracy | 1.0000 |
| leak_free_rate | 1.0000 |
| missing_data_refusal_accuracy | 1.0000 |
| judge_groundedness | 1.0000 |

## Cases

| Case | Mode | Result | Facts | Leak-free | Judge |
|---|---|---|---|---|---:|
| spending_this_month | data | pass | 1/1 | yes | deterministic |
| top_categories_this_month | data | pass | 1/1 | yes | deterministic |
| compare_with_last_month | data | pass | 2/2 | yes | 5/5 |
| net_worth_explained | data | pass | 1/1 | yes | deterministic |
| emergency_fund_vs_moneysense | hybrid | pass | 1/1 | yes | 5/5 |
| savings_rate_vs_guidance | hybrid | pass | 1/1 | yes | 5/5 |
| fire_timeline | data | pass | 1/1 | yes | deterministic |
| cpf_adequacy_personalised | hybrid | pass | 1/1 | yes | 5/5 |
| next_action | data | pass | 1/1 | yes | deterministic |
| improve_my_spending | hybrid | pass | 1/1 | yes | 5/5 |
| missing_data_user | data | pass | n/a | yes | n/a |
