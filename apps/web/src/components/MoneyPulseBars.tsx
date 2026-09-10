import { formatSGD } from '../app/FireBuddyProvider';

interface MoneyPulseBarsProps {
  income: number | null;
  expenses: number | null;
  savings: number | null;
  savingsRate: number | null;
}

/** Compare recorded monthly totals on one scale while retaining savings deficits. */
export function MoneyPulseBars({ income, expenses, savings, savingsRate }: MoneyPulseBarsProps) {
  const scale = Math.max(Math.abs(income ?? 0), Math.abs(expenses ?? 0), Math.abs(savings ?? 0), 1);
  const rows = [
    { label: 'Income', value: income, color: 'var(--chart-actual)' },
    { label: 'Expenses', value: expenses, color: 'var(--expense)' },
    { label: 'Savings', value: savings, color: savings !== null && savings < 0 ? 'var(--expense)' : 'var(--chart-projection)' },
  ];

  return <div className="money-pulse-bars">
    {rows.map(({ label, value, color }) => <div className="money-pulse-bar" key={label}>
      <div className="money-pulse-bar-heading"><span>{label}</span><strong>{value === null ? 'Unavailable' : formatSGD(value, 0)}{label === 'Savings' && savingsRate !== null ? <small>{(savingsRate * 100).toFixed(1)}%</small> : null}</strong></div>
      <div className="money-pulse-bar-track" role="img" aria-label={`${label}: ${value === null ? 'unavailable' : formatSGD(value)}${label === 'Savings' && value !== null && value < 0 ? ', deficit' : ''}`}>
        <span style={{ width: `${Math.abs(value ?? 0) / scale * 100}%`, backgroundColor: color }} />
      </div>
    </div>)}
    <details className="money-pulse-calculation"><summary>How savings is calculated</summary><p>Savings = recorded income − recorded expenses for this month so far. Savings rate = savings ÷ income × 100. The rate is unavailable when income is zero.</p><p>Investment contributions are tracked separately and are not deducted again. These totals reflect your recorded transactions, not your bank balance.</p></details>
  </div>;
}
