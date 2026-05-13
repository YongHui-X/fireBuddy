# FireBuddy - Database Schema

## Overview
This document defines the intended Supabase/Postgres schema for FireBuddy.

Goals:
- Keep the schema aligned with Supabase Auth and the shared TypeScript types
- Make data integrity rules explicit at the database level
- Keep the spec readable for learning while still being precise enough to implement later in SQL

Platform assumptions:
- Database: Postgres via Supabase
- Auth: Supabase Auth
- App-table IDs: UUID
- Money storage: `numeric(10,2)`

---

## Core Design Decisions

| Decision | Recommendation | Reason |
|---|---|---|
| App-table IDs | `uuid` | Keeps IDs consistent across Supabase Auth, backend, and shared frontend types |
| Money fields | `numeric(10,2)` | Avoids floating-point errors in financial data |
| Expense amount policy | Positive only | `expenses` is a spending table, not a mixed ledger |
| Audit timestamps | `timestamptz default now()` | Preserves timezone-aware audit history |
| Transaction date | `date` | Time of day is not required for normal expense tracking |
| Default categories | `user_id is null` and `is_default = true` | Distinguishes system categories from user-owned categories cleanly |
| User categories | `user_id is not null` and `is_default = false` | Prevents mixed or invalid category ownership states |

---

## Tables

### profiles
Extends `auth.users`. A profile row is created automatically after signup.

| Column | Type | Constraints |
|---|---|---|
| id | uuid | primary key, references `auth.users(id)` on delete cascade |
| email | text | not null |
| created_at | timestamptz | not null, default `now()` |

Recommended notes:
- `profiles.id` must always match the Supabase Auth user ID
- `profiles` should not be manually inserted by application code

---

### categories
Stores both system default categories and user-created categories.

| Column | Type | Constraints |
|---|---|---|
| id | uuid | primary key |
| user_id | uuid | nullable, references `profiles(id)` on delete cascade |
| name | text | not null |
| is_default | boolean | not null, default `false` |
| created_at | timestamptz | not null, default `now()` |

Required integrity rules:
- A default category must satisfy: `user_id is null` and `is_default = true`
- A user category must satisfy: `user_id is not null` and `is_default = false`
- These rules should be enforced with a database `check` constraint, not only in app code

Recommended uniqueness rules:
- Default category names must be unique among default categories
- User category names must be unique per user

Recommended behavior:
- System default categories are seeded once and are not user-owned
- User-created categories are private to the creating user

---

### expenses
Stores user expense entries.

| Column | Type | Constraints |
|---|---|---|
| id | uuid | primary key |
| user_id | uuid | not null, references `profiles(id)` on delete cascade |
| category_id | uuid | nullable, references `categories(id)` on delete set null |
| description | text | nullable |
| amount | numeric(10,2) | not null |
| date | date | not null |
| created_at | timestamptz | not null, default `now()` |
| updated_at | timestamptz | not null, default `now()` |

Required integrity rules:
- `amount > 0`
- `category_id` may be null
- If `category_id` is present, it must point to a category that is either:
  - a system default category, or
  - a category owned by the same user as the expense

Important implementation note:
- A plain foreign key guarantees that the category exists
- A plain foreign key does not guarantee that the category belongs to the same user or is a valid default
- This ownership rule should be enforced with database-side validation logic such as a trigger or equivalent server-side enforcement, not only in frontend or FastAPI code

---

## Relationships

```text
auth.users 1---1 profiles
profiles   1---many categories
profiles   1---many expenses
categories 1---many expenses
```

Meaning:
- Every profile belongs to one Supabase Auth user
- A profile can own many categories
- A profile can own many expenses
- A category can classify many expenses

---

## Seeded Default Categories

Seed these as system categories:
- Food & Drink
- Transport
- Shopping
- Bills & Utilities
- Healthcare
- Entertainment
- Travel
- Others

Recommended seed state for each default category:
- `user_id = null`
- `is_default = true`

---

## Constraints And Validation Rules

Recommended database constraints:
- Primary keys on all `id` columns
- Foreign keys from:
  - `profiles.id -> auth.users.id`
  - `categories.user_id -> profiles.id`
  - `expenses.user_id -> profiles.id`
  - `expenses.category_id -> categories.id`
- `check (amount > 0)` on `expenses`
- `check` constraint on `categories` to enforce valid default-vs-user ownership state

Recommended uniqueness constraints:
- Unique default category names for rows where `is_default = true`
- Unique user category names per `user_id`

Why these matter:
- They prevent invalid rows from being created even if application code has a bug
- They keep the database as the final source of truth for integrity rules

---

## Triggers And Database Functions

### handle_new_user
Purpose:
- Automatically create a `profiles` row after a new Supabase Auth user signs up

Guarantee:
- Application code does not need to manually insert into `profiles`
- Every authenticated user gets a matching profile record

Expected behavior:
- Trigger runs after insert on `auth.users`
- Inserts the new user's `id` and email into `profiles`

### update_updated_at
Purpose:
- Keep `expenses.updated_at` accurate on every expense update

Guarantee:
- `updated_at` always reflects the latest row modification time

Expected behavior:
- Trigger runs before update on `expenses`
- Sets `updated_at = now()`

---

## Recommended Indexes

These are not the full list of possible indexes, but they are the most useful starting point.

Recommended indexes:
- `expenses(user_id, date desc)`
- `expenses(user_id, category_id)`
- `categories(user_id, name)`
- index for default category lookup, such as one shaped around `is_default` and `name`

Why these help:
- Expense history is usually queried by user and date
- Category summaries often group or filter by category
- Category creation and lookup often need to check whether a name already exists for a user

---

## Row Level Security (RLS)

RLS must be enabled on:
- `profiles`
- `categories`
- `expenses`

This is not optional. Without RLS, authenticated users could read or modify data they do not own.

### profiles

`SELECT`
- Users may read only their own profile
- Policy intent: `auth.uid() = id`

`INSERT`
- Normally handled by the signup trigger rather than direct client inserts
- If direct inserts are ever allowed, they must require `auth.uid() = id`

`UPDATE`
- Users may update only their own profile
- Policy intent: `auth.uid() = id`

`DELETE`
- Normally not exposed directly from the client
- If allowed, only the owner may delete their own profile

### categories

`SELECT`
- Users may read:
  - system default categories, or
  - categories where `user_id = auth.uid()`

`INSERT`
- Users may insert only their own categories
- `with check` intent:
  - `auth.uid() = user_id`
  - `is_default = false`

`UPDATE`
- Users may update only their own categories
- They must not be able to convert a user category into a system default
- `using` intent:
  - `auth.uid() = user_id`
- `with check` intent:
  - `auth.uid() = user_id`
  - `is_default = false`

`DELETE`
- Users may delete only their own categories
- System default categories must not be deletable by normal users

### expenses

`SELECT`
- Users may read only their own expenses
- Policy intent: `auth.uid() = user_id`

`INSERT`
- Users may insert only their own expenses
- `with check` intent:
  - `auth.uid() = user_id`

`UPDATE`
- Users may update only their own expenses
- `using` intent:
  - `auth.uid() = user_id`
- `with check` intent:
  - `auth.uid() = user_id`

`DELETE`
- Users may delete only their own expenses
- Policy intent: `auth.uid() = user_id`

---

## Application-Level Implications

This schema matches the current shared app types:
- `Category.id` is `uuid`
- `Expense.id` is `uuid`
- `Expense.category_id` is `uuid | null`

Important backend implication:
- FastAPI should not be the only place enforcing ownership or integrity
- The database should reject invalid category or expense states even if the API layer makes a mistake

Important frontend implication:
- Frontends should still validate user input for good UX
- But frontend validation is not a replacement for constraints, triggers, and RLS

---

## Implementation Checklist

Before translating this into SQL, verify that the implementation covers:
- UUID IDs across all app tables
- Positive-only `expenses.amount`
- Category ownership-state check constraint
- Category uniqueness rules
- Trigger for `profiles` creation
- Trigger for `expenses.updated_at`
- RLS enabled on all three tables
- Separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies
- Database-side enforcement for expense-to-category ownership validity
