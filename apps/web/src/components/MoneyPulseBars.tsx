import { formatSGD } from '../app/FireBuddyProvider';

interface MoneyPulseBarsProps {
  income: number | null;
  expenses: number | null;
  savings: number | null;
  savingsRate: number | null;
}

/**
 * Show recorded income as the headline figure, then a single split bar of where that income went:
 * expenses from the left and savings from the right, scaled so a full bar equals the income.
 * A deficit month keeps its savings figure visible and marks the split as overspent.
 */
export function MoneyPulseBars({ income, expenses, savings, savingsRate }: MoneyPulseBarsProps) {
  const scale = Math.max(Math.abs(income ?? 0), Math.abs(expenses ?? 0), Math.abs(savings ?? 0), 1);
  const share = (value: number | null) => `${(Math.abs(value ?? 0) / scale) * 100}%`;
  const isDeficit = savings !== null && savings < 0;
  const amount = (value: number | null) => (value === null ? 'Unavailable' : formatSGD(value, 0));
  const savingsColor = isDeficit ? 'var(--expense)' : 'var(--chart-projection)';

  return (
    <div className="money-pulse-bars">
      <div className="money-pulse-income">
        <span>Income</span>
        <strong>{amount(income)}</strong>
      </div>

      <div className="money-pulse-row">
        <div className="money-pulse-bar-heading">
          <span>Where it went</span>
          {isDeficit ? <strong className="amount-negative">Overspent by {formatSGD(Math.abs(savings), 0)}</strong> : null}
        </div>
        <div className="money-pulse-split-track">
          <div className="money-pulse-segment" role="img" aria-label={`Expenses: ${expenses === null ? 'unavailable' : formatSGD(expenses)}`}>
            <span style={{ width: share(expenses), backgroundColor: 'var(--expense)' }} />
          </div>
          <div
            className="money-pulse-segment money-pulse-segment-end"
            role="img"
            aria-label={`Savings: ${savings === null ? 'unavailable' : formatSGD(savings)}${isDeficit ? ', deficit' : ''}`}
          >
            <span style={{ width: share(savings), backgroundColor: savingsColor }} />
          </div>
        </div>
        <div className="money-pulse-legend">
          <div><i style={{ backgroundColor: 'var(--expense)' }} aria-hidden="true" /><span>Expenses</span><strong>{amount(expenses)}</strong></div>
          <div>
            <i style={{ backgroundColor: savingsColor }} aria-hidden="true" />
            <span>Savings</span>
            <strong>{amount(savings)}{savingsRate !== null ? <small>{(savingsRate * 100).toFixed(1)}%</small> : null}</strong>
          </div>
        </div>
      </div>

      <details className="money-pulse-calculation">
        <summary>How savings is calculated</summary>
        <p>Savings = recorded income − recorded expenses for this month so far. Savings rate = savings ÷ income × 100. The rate is unavailable when income is zero.</p>
        <p>Investment contributions are tracked separately and are not deducted again. These totals reflect your recorded transactions, not your bank balance.</p>
      </details>
    </div>
  );
}
