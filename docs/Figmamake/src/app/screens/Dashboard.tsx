import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, TrendingUp, ArrowDownLeft, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { FIRE_DATA, Transaction } from '../data/mockData';
import { theme } from '../theme';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';

function formatSGD(n: number) {
  return 'S$' + Math.abs(n).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSGDRound(n: number) {
  return 'S$' + Math.abs(n).toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const MONTH_KEY = '2026-04';

export function Dashboard() {
  const navigate = useNavigate();
  const { transactions, getCategoryById } = useAppContext();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const monthTxns = transactions.filter(t => t.date.startsWith(MONTH_KEY));
  const totalExpenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const firePercent = (FIRE_DATA.currentNetWorth / FIRE_DATA.targetNetWorth) * 100;

  const recent = transactions.slice(0, 8);

  return (
    <div className="page-transition" style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary, overflowX: 'hidden', width: '100%' }}>
      {/* Teal Header */}
      <div className="dashboard-header" style={{
        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
        padding: '32px 20px 180px',
        position: 'relative',
        overflowX: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.8)',
              margin: '0 0 4px',
            }}>
              Good afternoon,
            </p>
            <h1 style={{
              fontSize: '26px',
              color: '#FFFFFF',
              fontWeight: 600,
              margin: 0,
            }}>
              {FIRE_DATA.name}
            </h1>
          </div>
          <button style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#FFFFFF',
          }}>
            <Bell size={22} strokeWidth={1.5} />
          </button>
        </div>
        {/* Curved bottom */}
        <svg
          className="dashboard-curve"
          style={{
            position: 'absolute',
            bottom: '-1px',
            left: 0,
            width: '100%',
            height: '120px',
            display: 'block',
          }}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,0 Q600,120 1200,0 L1200,120 L0,120 Z"
            fill={theme.colors.background.primary}
          />
        </svg>
      </div>

      {/* Main Content */}
      <div className="dashboard-content" style={{
        maxWidth: '1200px',
        margin: '-140px auto 0',
        padding: '0 20px 80px',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Desktop Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '24px',
        }}>
          <style>{`
            /* Responsive adjustments */
            @media (max-width: 767px) {
              .card-hover-subtle, .fire-progress {
                padding: 20px !important;
              }
              .balance-amount {
                font-size: 32px !important;
              }
              .fire-progress p:first-of-type {
                font-size: 36px !important;
              }
            }

            @media (min-width: 768px) {
              .dashboard-header {
                padding: 48px 24px 200px !important;
              }
              .dashboard-content {
                margin-top: -160px !important;
                padding: 0 24px 80px !important;
              }
              .dashboard-curve {
                height: 150px !important;
              }
              .dashboard-curve path {
                d: path("M0,0 Q600,150 1200,0 L1200,150 L0,150 Z") !important;
              }
            }

            @media (min-width: 1024px) {
              .desktop-grid {
                grid-template-columns: 2fr 1fr !important;
              }
              .dashboard-header {
                padding: 48px 24px 240px !important;
              }
              .dashboard-content {
                margin-top: -200px !important;
              }
              .dashboard-curve {
                height: 180px !important;
              }
            }
          `}</style>

          <div className="desktop-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
          }}>
            {/* Left Column */}
            <div>
              {/* Balance Card */}
              <div className="card-hover-subtle" style={{
                backgroundColor: theme.colors.background.white,
                borderRadius: theme.borderRadius.xl,
                padding: '32px',
                boxShadow: theme.shadows.lg,
                marginBottom: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '24px',
                }}>
                  <div>
                    <p style={{
                      fontSize: '13px',
                      color: theme.colors.text.secondary,
                      margin: '0 0 8px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}>
                      Total Balance
                    </p>
                    <h2 className="balance-amount" style={{
                      fontSize: '42px',
                      fontWeight: 600,
                      color: theme.colors.text.primary,
                      margin: 0,
                    }}>
                      {formatSGDRound(FIRE_DATA.currentNetWorth)}
                    </h2>
                  </div>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    cursor: 'pointer',
                    color: theme.colors.text.secondary,
                    borderRadius: theme.borderRadius.md,
                  }}>
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* Income & Expenses */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  paddingTop: '24px',
                  borderTop: `1px solid ${theme.colors.border.light}`,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: theme.colors.primaryLight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ArrowDownLeft size={20} color={theme.colors.primary} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p style={{
                        fontSize: '12px',
                        color: theme.colors.text.secondary,
                        margin: '0 0 4px',
                      }}>
                        Income
                      </p>
                      <p style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: theme.colors.primary,
                        margin: 0,
                      }}>
                        {formatSGDRound(totalIncome)}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: '#FEF2F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ArrowUpRight size={20} color={theme.colors.danger} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p style={{
                        fontSize: '12px',
                        color: theme.colors.text.secondary,
                        margin: '0 0 4px',
                      }}>
                        Expenses
                      </p>
                      <p style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: theme.colors.danger,
                        margin: 0,
                      }}>
                        {formatSGDRound(totalExpenses)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions History */}
              <div style={{
                backgroundColor: theme.colors.background.white,
                borderRadius: theme.borderRadius.xl,
                padding: '28px',
                boxShadow: theme.shadows.md,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}>
                    Transactions History
                  </h3>
                  <button
                    onClick={() => navigate('/transactions')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '13px',
                      color: theme.colors.primary,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    See all
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {recent.map((t, idx) => {
                    const cat = getCategoryById(t.category);
                    return (
                      <div
                        key={t.id}
                        className="stagger-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 12px',
                          borderRadius: theme.borderRadius.md,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onClick={() => setSelectedTransaction(t)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.primary}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 46,
                            height: 46,
                            borderRadius: theme.borderRadius.md,
                            backgroundColor: (cat?.color || theme.colors.primary) + '20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            flexShrink: 0,
                          }}>
                            {cat?.emoji || '📦'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              color: theme.colors.text.primary,
                              margin: '0 0 4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {t.description}
                            </p>
                            <p style={{
                              fontSize: '12px',
                              color: theme.colors.text.secondary,
                              margin: 0,
                            }}>
                              {new Date(t.date + 'T00:00:00').toLocaleDateString('en-SG', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: t.amount < 0 ? theme.colors.danger : theme.colors.primary,
                          margin: 0,
                          flexShrink: 0,
                        }}>
                          {t.amount < 0 ? '- ' : '+ '}{formatSGD(t.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - FIRE Progress */}
            <div>
              <div className="fire-progress" style={{
                backgroundColor: theme.colors.background.white,
                borderRadius: theme.borderRadius.xl,
                padding: '28px',
                boxShadow: theme.shadows.md,
                position: 'sticky',
                top: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '24px',
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.primaryLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TrendingUp size={20} color={theme.colors.primary} strokeWidth={2} />
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}>
                    FIRE Progress
                  </h3>
                </div>

                <p style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: theme.colors.primary,
                  margin: '0 0 8px',
                }}>
                  {firePercent.toFixed(1)}%
                </p>
                <p style={{
                  fontSize: '13px',
                  color: theme.colors.text.secondary,
                  margin: '0 0 24px',
                }}>
                  of {formatSGDRound(FIRE_DATA.targetNetWorth)} target
                </p>

                {/* Progress bar */}
                <div style={{
                  height: '10px',
                  backgroundColor: theme.colors.primaryLight,
                  borderRadius: theme.borderRadius.full,
                  overflow: 'hidden',
                  marginBottom: '32px',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${firePercent}%`,
                    background: `linear-gradient(90deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                    borderRadius: theme.borderRadius.full,
                  }} />
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  paddingTop: '24px',
                  borderTop: `1px solid ${theme.colors.border.light}`,
                }}>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: theme.colors.text.secondary,
                      margin: '0 0 6px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}>
                      Target Year
                    </p>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: theme.colors.text.primary,
                      margin: 0,
                    }}>
                      {FIRE_DATA.projectedFireYear}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: theme.colors.text.secondary,
                      margin: '0 0 6px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}>
                      Monthly Savings
                    </p>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: theme.colors.text.primary,
                      margin: 0,
                    }}>
                      {formatSGDRound(FIRE_DATA.monthlySavings)}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: theme.colors.text.secondary,
                      margin: '0 0 6px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}>
                      Invested
                    </p>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: theme.colors.text.primary,
                      margin: 0,
                    }}>
                      {formatSGDRound(FIRE_DATA.invested)}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '11px',
                      color: theme.colors.text.secondary,
                      margin: '0 0 6px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}>
                      Cash
                    </p>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: theme.colors.text.primary,
                      margin: 0,
                    }}>
                      {formatSGDRound(FIRE_DATA.cash)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}
