import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Flame, ChevronDown } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { FIRE_DATA } from '../data/mockData';
import { DonutChart } from '../components/DonutChart';

function formatSGD(n: number) {
  return 'S$' + Math.abs(n).toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Mock historical data ──────────────────────────────────────────────────────

const NET_WORTH_HISTORY = [
  { month: 'May',  netWorth: 92400,  invested: 72000, cash: 20400 },
  { month: 'Jun',  netWorth: 96800,  invested: 75800, cash: 21000 },
  { month: 'Jul',  netWorth: 100500, invested: 78400, cash: 22100 },
  { month: 'Aug',  netWorth: 103200, invested: 80600, cash: 22600 },
  { month: 'Sep',  netWorth: 107900, invested: 84200, cash: 23700 },
  { month: 'Oct',  netWorth: 110400, invested: 86200, cash: 24200 },
  { month: 'Nov',  netWorth: 113800, invested: 89300, cash: 24500 },
  { month: 'Dec',  netWorth: 117200, invested: 91800, cash: 25400 },
  { month: 'Jan',  netWorth: 119600, invested: 93600, cash: 26000 },
  { month: 'Feb',  netWorth: 121300, invested: 95400, cash: 25900 },
  { month: 'Mar',  netWorth: 123100, invested: 96900, cash: 26200 },
  { month: 'Apr',  netWorth: 124850, invested: 98400, cash: 26450 },
];

const MONTHLY_CASHFLOW = [
  { month: 'Nov', income: 7520, expenses: 3810, savings: 3710 },
  { month: 'Dec', income: 8240, expenses: 4220, savings: 4020 },
  { month: 'Jan', income: 7800, expenses: 3640, savings: 4160 },
  { month: 'Feb', income: 7800, expenses: 3490, savings: 4310 },
  { month: 'Mar', income: 8050, expenses: 3720, savings: 4330 },
  { month: 'Apr', income: 8048, expenses: 2448, savings: 5600 },
];

const FIRE_PROJECTION = [
  { year: 2026, actual: 124850,  target: null },
  { year: 2028, actual: null,    projected: 214000,  target: null },
  { year: 2030, actual: null,    projected: 336000,  target: null },
  { year: 2032, actual: null,    projected: 498000,  target: null },
  { year: 2034, actual: null,    projected: 706000,  target: null },
  { year: 2036, actual: null,    projected: 968000,  target: null },
  { year: 2038, actual: null,    projected: 1292000, target: null },
  { year: 2040, actual: null,    projected: 1500000, target: null },
  { year: 2043, actual: null,    projected: 1800000, target: 1800000 },
];

const SAVINGS_RATE = [
  { month: 'Nov', rate: 49 },
  { month: 'Dec', rate: 49 },
  { month: 'Jan', rate: 53 },
  { month: 'Feb', rate: 55 },
  { month: 'Mar', rate: 54 },
  { month: 'Apr', rate: 70 },
];

// ── Shared custom tooltip ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, prefix = 'S$', suffix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: '#1F3D2E',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '11px',
      color: '#F5F8F4',
      border: 'none',
      boxShadow: 'none',
    }}>
      <p style={{ color: '#67B47C', marginBottom: 4, fontSize: '10px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || '#F5F8F4', margin: '2px 0' }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString('en-SG') : p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #D7E3D8',
      padding: '18px 16px',
      marginBottom: '12px',
    }}>
      <p style={{ fontSize: '12px', color: '#1F3D2E', fontWeight: 500, margin: '0 0 2px' }}>{title}</p>
      {subtitle && <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 14px' }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: '14px' }} />}
      {children}
    </div>
  );
}

// ── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      flex: 1,
      backgroundColor: '#F5F8F4',
      borderRadius: '10px',
      padding: '12px 10px',
      textAlign: 'center',
      border: '1px solid #D7E3D8',
    }}>
      <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: '15px', color: accent || '#1F3D2E', fontWeight: 500, margin: 0 }}>{value}</p>
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export function Analytics() {
  const navigate = useNavigate();
  const { transactions, categories } = useAppContext();

  const MONTH_KEY = '2026-04';
  const monthTxns = transactions.filter(t => t.date.startsWith(MONTH_KEY));
  const totalExpenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome   = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const firePercent   = (FIRE_DATA.currentNetWorth / FIRE_DATA.targetNetWorth) * 100;
  const savingsRate   = Math.round(((totalIncome - totalExpenses) / totalIncome) * 100);
  const yearsToFIRE  = FIRE_DATA.projectedFireYear - 2026;

  // Category pie data
  const catPie = categories
    .filter(c => c.id !== 'income')
    .map(c => ({
      name: c.name,
      value: monthTxns.filter(t => t.category === c.id && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      color: c.color,
    }))
    .filter(c => c.value > 0);

  return (
    <div style={{ color: '#1F3D2E', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{
        padding: '52px 22px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        backgroundColor: '#1F3D2E',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            lineHeight: 0,
            color: '#67B47C',
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <div>
          <h1 style={{ fontSize: '18px', color: '#F5F8F4', margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: '11px', color: '#67B47C', margin: 0 }}>Financial overview · April 2026</p>
        </div>
      </div>

      {/* FIRE progress hero */}
      <div style={{
        backgroundColor: '#1F3D2E',
        padding: '0 22px 22px',
        marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <StatPill label="Net Worth"    value={formatSGD(FIRE_DATA.currentNetWorth)} />
          <StatPill label="FIRE Target"  value={formatSGD(FIRE_DATA.targetNetWorth)}  />
          <StatPill label="Progress"     value={`${firePercent.toFixed(1)}%`} accent="#67B47C" />
        </div>
        <div style={{
          height: '6px',
          backgroundColor: 'rgba(122,155,130,0.25)',
          borderRadius: '99px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${firePercent}%`,
            backgroundColor: '#67B47C',
            borderRadius: '99px',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '10px', color: '#6B8577' }}>Started 2022</span>
          <span style={{ fontSize: '10px', color: '#67B47C' }}>
            <Flame size={10} style={{ display: 'inline', marginRight: 3 }} />
            FIRE in {yearsToFIRE} yrs ({FIRE_DATA.projectedFireYear})
          </span>
        </div>
      </div>

      <div style={{ padding: '0 14px' }}>

        {/* ══ SECTION: SPENDING ══════════════════════════════════════════════ */}
        <CollapsibleSection label="Spending" accent="#C4855A">

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D7E3D8',
              padding: '14px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <TrendingUp size={12} color="#4A9B8E" />
                <span style={{ fontSize: '10px', color: '#6B8577' }}>Income · Apr</span>
              </div>
              <p style={{ fontSize: '18px', color: '#4A9B8E', fontWeight: 500, margin: 0 }}>{formatSGD(totalIncome)}</p>
            </div>
            <div style={{
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D7E3D8',
              padding: '14px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <TrendingDown size={12} color="#D64545" />
                <span style={{ fontSize: '10px', color: '#6B8577' }}>Expenses · Apr</span>
              </div>
              <p style={{ fontSize: '18px', color: '#D64545', fontWeight: 500, margin: 0 }}>{formatSGD(totalExpenses)}</p>
            </div>
          </div>

          {/* Income vs Expenses */}
          <ChartCard title="Income vs expenses" subtitle="Last 6 months (S$)">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={MONTHLY_CASHFLOW} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid stroke="#D7E3D8" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#67B47C' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: '#67B47C' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip prefix="S$" />} />
                <Bar dataKey="income"   name="Income"   fill="#4A9B8E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#D64545" radius={[3, 3, 0, 0]} />
                <Bar dataKey="savings"  name="Saved"    fill="#67B47C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
              {[
                { color: '#4A9B8E', label: 'Income' },
                { color: '#D64545', label: 'Expenses' },
                { color: '#67B47C', label: 'Saved' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, backgroundColor: l.color, borderRadius: 2 }} />
                  <span style={{ fontSize: '10px', color: '#67B47C' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Category breakdown */}
          <ChartCard title="Spending by category" subtitle="April 2026">
            {(() => {
              const total = catPie.reduce((s, c) => s + c.value, 0);
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                    <DonutChart
                      data={catPie.map(c => ({ value: c.value, color: c.color, name: c.name }))}
                      size={200}
                      thickness={40}
                      centerLabel={
                        <>
                          <p style={{ fontSize: '15px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>
                            S${total.toFixed(0)}
                          </p>
                          <p style={{ fontSize: '10px', color: '#67B47C', margin: 0 }}>spent</p>
                        </>
                      }
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {catPie.map(cat => (
                      <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: '#6B8577' }}>{cat.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#67B47C' }}>
                            {((cat.value / total) * 100).toFixed(0)}%
                          </span>
                          <span style={{ fontSize: '11px', color: '#1F3D2E', fontWeight: 500, minWidth: 46, textAlign: 'right' }}>
                            S${cat.value.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </ChartCard>
        </CollapsibleSection>

        {/* ══ SECTION: SAVINGS ═══════════════════════════════════════════════ */}
        <CollapsibleSection label="Savings" accent="#67B47C">

          {/* Savings rate stat pill */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D7E3D8',
              padding: '14px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <Target size={12} color="#67B47C" />
                <span style={{ fontSize: '10px', color: '#6B8577' }}>Savings rate · Apr</span>
              </div>
              <p style={{ fontSize: '18px', color: '#67B47C', fontWeight: 500, margin: 0 }}>{savingsRate}%</p>
            </div>
            <div style={{
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D7E3D8',
              padding: '14px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <TrendingUp size={12} color="#4A9B8E" />
                <span style={{ fontSize: '10px', color: '#6B8577' }}>Monthly saved</span>
              </div>
              <p style={{ fontSize: '18px', color: '#4A9B8E', fontWeight: 500, margin: 0 }}>{formatSGD(FIRE_DATA.monthlySavings)}</p>
            </div>
          </div>

          {/* Savings rate trend */}
          <ChartCard title="Savings rate trend" subtitle="% of income saved each month">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={SAVINGS_RATE} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid stroke="#D7E3D8" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#67B47C' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: '#67B47C' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`}
                  domain={[40, 80]}
                />
                <Tooltip content={<CustomTooltip prefix="" suffix="%" />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Savings rate"
                  stroke="#67B47C"
                  strokeWidth={1.5}
                  dot={{ fill: '#67B47C', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: '10px',
              backgroundColor: '#F5F8F4', borderRadius: '8px', padding: '10px 14px',
            }}>
              <div>
                <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 3px' }}>This month</p>
                <p style={{ fontSize: '16px', color: '#4A9B8E', fontWeight: 500, margin: 0 }}>{savingsRate}%</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 3px' }}>6-month avg</p>
                <p style={{ fontSize: '16px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>
                  {Math.round(SAVINGS_RATE.reduce((s, r) => s + r.rate, 0) / SAVINGS_RATE.length)}%
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 3px' }}>Monthly saved</p>
                <p style={{ fontSize: '16px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>
                  {formatSGD(FIRE_DATA.monthlySavings)}
                </p>
              </div>
            </div>
          </ChartCard>
        </CollapsibleSection>

        {/* ══ SECTION: WEALTH ════════════════════════════════════════════════ */}
        <CollapsibleSection label="Wealth" accent="#4A9B8E">

          {/* Net Worth Trend */}
          <ChartCard title="Net worth trend" subtitle="12-month history (S$)">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={NET_WORTH_HISTORY} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="an_nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A9B8E" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#4A9B8E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="an_invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67B47C" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#67B47C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#D7E3D8" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#67B47C' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: '#67B47C' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip prefix="S$" />} />
                <Area type="monotone" dataKey="netWorth" name="Net worth" stroke="#4A9B8E" strokeWidth={1.5} fill="url(#an_nwGrad)" dot={false} />
                <Area type="monotone" dataKey="invested" name="Invested" stroke="#67B47C" strokeWidth={1} fill="url(#an_invGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
              {[{ color: '#4A9B8E', label: 'Net worth' }, { color: '#67B47C', label: 'Invested' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 2, backgroundColor: l.color, borderRadius: 99 }} />
                  <span style={{ fontSize: '10px', color: '#67B47C' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Asset allocation */}
          <ChartCard title="Asset allocation" subtitle="Current portfolio split">
            {(() => {
              const total = FIRE_DATA.invested + FIRE_DATA.cash;
              const assets = [
                { label: 'Equities / ETFs',      value: Math.round(FIRE_DATA.invested * 0.72), color: '#4A9B8E' },
                { label: 'Bonds / Fixed income',  value: Math.round(FIRE_DATA.invested * 0.18), color: '#67B47C' },
                { label: 'REITs',                 value: Math.round(FIRE_DATA.invested * 0.10), color: '#C4855A' },
                { label: 'Cash',                  value: FIRE_DATA.cash,                        color: '#B89A6B' },
              ];
              return (
                <>
                  <div style={{ display: 'flex', height: '8px', borderRadius: '99px', overflow: 'hidden', gap: '2px', marginBottom: '14px' }}>
                    {assets.map(a => (
                      <div key={a.label} style={{ height: '100%', width: `${(a.value / total) * 100}%`, backgroundColor: a.color, borderRadius: '99px' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {assets.map(a => (
                      <div key={a.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: '#6B8577' }}>{a.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#67B47C' }}>{((a.value / total) * 100).toFixed(0)}%</span>
                          <span style={{ fontSize: '11px', color: '#1F3D2E', fontWeight: 500 }}>S${a.value.toLocaleString('en-SG')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </ChartCard>
        </CollapsibleSection>

        {/* ══ SECTION: FIRE PROJECTIONS ══════════════════════════════════════ */}
        <CollapsibleSection label="FIRE Projections" accent="#A98BD4">

          {/* FIRE progress stats */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D7E3D8',
              padding: '14px 12px',
            }}>
              <p style={{ fontSize: '10px', color: '#6B8577', margin: '0 0 6px' }}>Progress</p>
              <p style={{ fontSize: '18px', color: '#A98BD4', fontWeight: 500, margin: 0 }}>
                {((FIRE_DATA.currentNetWorth / FIRE_DATA.targetNetWorth) * 100).toFixed(1)}%
              </p>
            </div>
            <div style={{
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D7E3D8',
              padding: '14px 12px',
            }}>
              <p style={{ fontSize: '10px', color: '#6B8577', margin: '0 0 6px' }}>Years to FIRE</p>
              <p style={{ fontSize: '18px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>{yearsToFIRE} yrs</p>
            </div>
            <div style={{
              flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D7E3D8',
              padding: '14px 12px',
            }}>
              <p style={{ fontSize: '10px', color: '#6B8577', margin: '0 0 6px' }}>FIRE year</p>
              <p style={{ fontSize: '18px', color: '#4A9B8E', fontWeight: 500, margin: 0 }}>{FIRE_DATA.projectedFireYear}</p>
            </div>
          </div>

          {/* FIRE Projection chart */}
          <ChartCard title="Net worth trajectory" subtitle="Projected to S$1.8M target">
            <ResponsiveContainer width="100%" height={170}>
              <ComposedChart data={FIRE_PROJECT_FULL} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="an_fireGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67B47C" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#67B47C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#D7E3D8" strokeWidth={0.5} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#67B47C' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: '#67B47C' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip prefix="S$" />} />
                <Area type="monotone" dataKey="projected" name="Projected" stroke="#67B47C" strokeWidth={1.5} fill="url(#an_fireGrad)" dot={false} connectNulls />
                <Line type="monotone" dataKey="target" name="Target" stroke="#C4855A" strokeWidth={1} strokeDasharray="4 3" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <div style={{ flex: 1, backgroundColor: '#F5F8F4', borderRadius: '8px', padding: '10px 12px', border: '1px solid #D7E3D8' }}>
                <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 3px' }}>Emergency fund</p>
                <p style={{ fontSize: '14px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>{FIRE_DATA.emergencyMonths} months</p>
              </div>
              <div style={{ flex: 1, backgroundColor: '#F5F8F4', borderRadius: '8px', padding: '10px 12px', border: '1px solid #D7E3D8' }}>
                <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 3px' }}>Annual expenses</p>
                <p style={{ fontSize: '14px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>{formatSGD(FIRE_DATA.annualExpenses)}</p>
              </div>
              <div style={{ flex: 1, backgroundColor: '#F5F8F4', borderRadius: '8px', padding: '10px 12px', border: '1px solid #D7E3D8' }}>
                <p style={{ fontSize: '10px', color: '#67B47C', margin: '0 0 3px' }}>4% SWR target</p>
                <p style={{ fontSize: '14px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>{formatSGD(FIRE_DATA.annualExpenses * 25)}</p>
              </div>
            </div>
          </ChartCard>
        </CollapsibleSection>

      </div>
    </div>
  );
}

// Full FIRE projection line (for chart - target line spans all years)
const FIRE_PROJECT_FULL = FIRE_PROJECTION.map(d => ({
  ...d,
  projected: d.projected ?? (d.year === 2026 ? 124850 : undefined),
  target: 1800000,
}));

// ── Collapsible section divider ──────────────────────────────────────────────

function CollapsibleSection({
  label, accent, children, defaultOpen = true,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: open ? '4px' : '16px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: '100%', background: 'none', border: 'none',
          padding: '0 0 14px', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ width: '4px', height: '16px', backgroundColor: accent, borderRadius: '99px', flexShrink: 0 }} />
        <p style={{ fontSize: '12px', color: '#1F3D2E', fontWeight: 500, margin: 0, flex: 1 }}>{label}</p>
        <div style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          color: '#67B47C', lineHeight: 0, flexShrink: 0,
        }}>
          <ChevronDown size={15} strokeWidth={1.5} />
        </div>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}