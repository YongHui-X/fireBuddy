import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Plus, Wallet, Search, X, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getAccountTypeConfig } from './Accounts';
import { theme } from '../theme';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { Transaction } from '../data/mockData';

function formatSGD(n: number) {
  return (
    'S$' +
    Math.abs(n).toLocaleString('en-SG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date('2026-04-14');
  const yesterday = new Date('2026-04-13');
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function Transactions() {
  const navigate = useNavigate();
  const { transactions, getCategoryById, getAccountById, accounts, categories } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('month');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Date filter
    const today = new Date('2026-04-14');
    if (dateFilter === 'month') {
      filtered = filtered.filter(t => t.date.startsWith('2026-04'));
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(t => {
        const txDate = new Date(t.date + 'T00:00:00');
        return txDate >= weekAgo && txDate <= today;
      });
    }

    // Search query
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Account filter
    if (selectedAccount) {
      filtered = filtered.filter(t => t.account === selectedAccount);
    }

    return filtered;
  }, [transactions, searchQuery, selectedCategory, selectedAccount, dateFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredTransactions>();
    filteredTransactions.forEach(t => {
      const existing = map.get(t.date) || [];
      map.set(t.date, [...existing, t]);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const monthTotal = filteredTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const hasActiveFilters = searchQuery || selectedCategory || selectedAccount || dateFilter !== 'month';

  return (
    <div className="page-transition" style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary, overflowX: 'hidden' }}>
      <style>{`
        .page-transition {
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 767px) {
          .transactions-header {
            padding: 32px 16px 20px !important;
          }
          .transactions-content {
            padding: 24px 16px 100px !important;
          }
        }
      `}</style>
      {/* Teal Header */}
      <div className="transactions-header" style={{
        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
        padding: '48px 24px 24px',
        position: 'relative',
        overflowX: 'hidden',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}>
            <h1 style={{
              fontSize: '26px',
              color: '#FFFFFF',
              fontWeight: 600,
              margin: 0,
            }}>
              Transactions
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => navigate('/accounts')}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: theme.borderRadius.full,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <Wallet size={14} strokeWidth={2} />
                Accounts
              </button>
              <button
                onClick={() => navigate('/add')}
                style={{
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: theme.borderRadius.full,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  color: theme.colors.primary,
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{
            position: 'relative',
            marginBottom: '16px',
          }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: searchQuery ? theme.colors.primary : 'rgba(255,255,255,0.6)',
              }}
            />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: theme.borderRadius.lg,
                padding: '12px 44px 12px 44px',
                fontSize: '14px',
                color: '#FFFFFF',
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  lineHeight: 0,
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            marginBottom: '16px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {/* Date filters */}
            {(['week', 'month', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.borderRadius.full,
                  border: 'none',
                  backgroundColor: dateFilter === filter ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                  color: dateFilter === filter ? theme.colors.primary : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: dateFilter === filter ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                {filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}

            {/* Category filter dropdown */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              style={{
                padding: '8px 16px',
                borderRadius: theme.borderRadius.full,
                border: 'none',
                backgroundColor: selectedCategory ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                color: selectedCategory ? theme.colors.primary : '#FFFFFF',
                fontSize: '13px',
                fontWeight: selectedCategory ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
              }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>

            {/* Account filter dropdown */}
            {accounts.length > 0 && (
              <select
                value={selectedAccount || ''}
                onChange={(e) => setSelectedAccount(e.target.value || null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.borderRadius.full,
                  border: 'none',
                  backgroundColor: selectedAccount ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                  color: selectedAccount ? theme.colors.primary : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: selectedAccount ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  outline: 'none',
                }}
              >
                <option value="">All Accounts</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            )}

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setSelectedAccount(null);
                  setDateFilter('month');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.borderRadius.full,
                  border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Summary */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: theme.borderRadius.lg,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: '16px',
                color: '#FFFFFF',
                fontWeight: 600,
                margin: '0 0 4px',
              }}>
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
              </p>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.8)',
                margin: 0,
              }}>
                Total expenses: −{formatSGD(monthTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction groups */}
      <div className="transactions-content" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 24px 100px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {grouped.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.colors.primaryLight,
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Search size={36} color={theme.colors.primary} strokeWidth={1.5} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: theme.colors.text.primary,
              margin: '0 0 8px',
            }}>
              No transactions found
            </h3>
            <p style={{
              fontSize: '14px',
              color: theme.colors.text.secondary,
              margin: 0,
            }}>
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          grouped.map(([date, txns]) => (
            <div key={date} style={{ marginBottom: '24px' }}>
              {/* Date label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                padding: '0 4px',
              }}>
                <p style={{
                  fontSize: '13px',
                  color: theme.colors.text.secondary,
                  margin: 0,
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                }}>
                  {formatDateLabel(date)}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: theme.colors.text.secondary,
                  margin: 0,
                  fontWeight: 500,
                }}>
                  {(() => {
                    const dayTotal = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
                    return dayTotal > 0 ? `−${formatSGD(dayTotal)}` : '';
                  })()}
                </p>
              </div>

              {/* Transaction card */}
              <div style={{
                backgroundColor: theme.colors.background.white,
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                boxShadow: theme.shadows.sm,
              }}>
                {txns.map((t, i) => {
                  const cat = getCategoryById(t.category);
                  const acc = t.account ? getAccountById(t.account) : undefined;
                  const accCfg = acc ? getAccountTypeConfig(acc.type) : undefined;
                  const AccIcon = accCfg?.icon;

                  return (
                    <div key={t.id}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px 18px',
                        gap: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                        onClick={() => setSelectedTransaction(t)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.background.primary}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Category Icon */}
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: theme.borderRadius.md,
                          backgroundColor: (cat?.color || theme.colors.primary) + '20',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '22px',
                          flexShrink: 0,
                        }}>
                          {cat?.emoji || '📦'}
                        </div>

                        {/* Description + tags */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: theme.colors.text.primary,
                            margin: '0 0 6px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {t.description}
                          </p>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                          }}>
                            {/* Category pill */}
                            <span style={{
                              fontSize: '11px',
                              color: cat?.color || theme.colors.text.secondary,
                              backgroundColor: (cat?.color || theme.colors.primary) + '18',
                              padding: '3px 10px',
                              borderRadius: theme.borderRadius.full,
                            }}>
                              {cat?.name}
                            </span>

                            {/* Account pill */}
                            {acc && AccIcon && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                color: acc.color,
                                backgroundColor: acc.color + '18',
                                padding: '3px 8px',
                                borderRadius: theme.borderRadius.full,
                              }}>
                                <AccIcon size={10} strokeWidth={2} />
                                {acc.name}
                                {acc.lastFour && ` ••${acc.lastFour}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <p style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: t.amount < 0 ? theme.colors.danger : theme.colors.primary,
                          margin: 0,
                          flexShrink: 0,
                        }}>
                          {t.amount < 0 ? '- ' : '+ '}
                          {formatSGD(t.amount)}
                        </p>
                      </div>
                      {i < txns.length - 1 && (
                        <div style={{
                          height: '1px',
                          backgroundColor: theme.colors.border.light,
                          margin: '0 18px',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
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
