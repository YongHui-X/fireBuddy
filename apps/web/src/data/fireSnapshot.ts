export const fireSnapshot = {
  name: 'Alex Tan',
  monthlyIncome: 7800,
  targetNetWorth: 1800000,
  currentNetWorth: 124850,
  invested: 98400,
  cash: 26450,
  annualExpenses: 41400,
  projectedFireYear: 2043,
  emergencyMonths: 8.2,
  monthlySavings: 3600,
} as const;

export const fireProgressPercent =
  (fireSnapshot.currentNetWorth / fireSnapshot.targetNetWorth) * 100;
