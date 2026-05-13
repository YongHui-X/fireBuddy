import { expenseCategories } from './add-expense';

export const coreCategories = expenseCategories.map((category) => category.name) as readonly string[];

export const productPhases = [
  {
    id: 'Phase 0',
    title: 'Scaffold and connect the core flow',
    summary: 'Set up the repo direction, shared contracts, and an expense flow that can be wired end to end.',
  },
  {
    id: 'Phase 1',
    title: 'Auto-categorise transactions',
    summary: 'Use GPT-4o mini to suggest a category from the user description before save.',
  },
  {
    id: 'Phase 2',
    title: 'Bring in RAG',
    summary: 'Add CPF and financial document retrieval after validating the pattern in isolation.',
  },
  {
    id: 'Phase 3',
    title: 'Polish and projections',
    summary: 'Layer in FIRE projections, analytics, and product polish once the core workflow is stable.',
  },
] as const;
