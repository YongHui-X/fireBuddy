export const apiRoutes = {
  transactions: '/transactions',
  expenses: '/expenses',
  categories: '/categories',
  accounts: '/accounts',
  parseInput: '/ai/parse-input',
  health: '/health',
  financialAdvisorChat: '/api/chat/financial-advisor',
  financialAdvisorChatStream: '/api/chat/financial-advisor/stream',
} as const;
