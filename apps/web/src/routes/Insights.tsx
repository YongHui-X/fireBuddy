import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeft, ChevronDown, CircleHelp, Download, Filter } from 'lucide-react';
import {
  colors,
  fireData,
  formatDateLabel,
  formatSGD,
  formatTooltipValue,
  getCategoryIcon,
  monthlyCashflow,
  netWorthHistory,
  useFireBuddy,
  type Category,
} from '../app/FireBuddyProvider';

function CategoryAvatar({ category }: { category?: Category }) {
  const Icon = getCategoryIcon(category);

  return (
    <span className="category-avatar" style={{ backgroundColor: category?.color ?? colors.primarySoft }}>
      <Icon size={18} strokeWidth={1.8} />
    </span>
  );
}
function Insights() {
  const { transactions, categories } = useFireBuddy();
  const navigate = useNavigate();
  const [range, setRange] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');
  const firePercent = (fireData.currentNetWorth / fireData.targetNetWorth) * 100;
  const categoryData = categories
    .filter((category) => category.id !== 'income')
    .map((category) => ({
      name: category.name,
      value: transactions
        .filter((transaction) => transaction.category === category.id && transaction.amount < 0)
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
      color: category.color,
    }))
    .filter((entry) => entry.value > 0);

  const topSpending = transactions.filter((transaction) => transaction.amount < 0).slice(0, 4);

  return (
    <main className="page">
      <section className="analytics-header">
        <button className="plain-icon-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h2>Insights</h2>
        <Download size={20} />
      </section>

      <section className="analytics-content">
        <div className="range-tabs">
          {(['Day', 'Week', 'Month', 'Year'] as const).map((item) => (
            <button
              className={range === item ? 'range-tab-active' : ''}
              key={item}
              type="button"
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="chart-toolbar">
          <span />
          <button className="select-button" type="button">
            Expense
            <ChevronDown size={16} />
          </button>
        </div>

        <article className="chart-card transparent">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyCashflow}>
              <defs>
                <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={formatTooltipValue} />
              <Area dataKey="expenses" stroke={colors.primary} strokeWidth={2.2} fill="url(#expenseFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <h3>FIRE projection</h3>
            <strong>{firePercent.toFixed(1)}%</strong>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={netWorthHistory}>
              <CartesianGrid vertical={false} stroke={colors.border} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={formatTooltipValue} />
              <Bar dataKey="netWorth" fill={colors.primary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <h3>Top Spending</h3>
            <Filter size={18} />
          </div>
          <div className="transaction-list card-list">
            {topSpending.map((transaction, index) => {
              const category = categories.find((item) => item.id === transaction.category);
              return (
                <article className={index === 1 ? 'transaction-card highlighted' : 'transaction-card'} key={transaction.id}>
                  <CategoryAvatar category={category} />
                  <div className="transaction-copy">
                    <strong>{transaction.description}</strong>
                    <span>{formatDateLabel(transaction.date)}</span>
                  </div>
                  <strong className="amount-negative">- {formatSGD(transaction.amount)}</strong>
                </article>
              );
            })}
          </div>
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <h3>Category share</h3>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" innerRadius={54} outerRadius={82} paddingAngle={4}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </section>
    </main>
  );
}

export default Insights;
