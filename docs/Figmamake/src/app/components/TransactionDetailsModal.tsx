import { useState } from 'react';
import { X, Edit2, Trash2, Calendar, Tag, Wallet as WalletIcon } from 'lucide-react';
import { Transaction } from '../data/mockData';
import { useAppContext } from '../context/AppContext';
import { getAccountTypeConfig } from '../screens/Accounts';
import { theme } from '../theme';

interface TransactionDetailsModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionDetailsModal({ transaction, onClose }: TransactionDetailsModalProps) {
  const { updateTransaction, deleteTransaction, getCategoryById, getAccountById, categories, accounts } = useAppContext();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editDescription, setEditDescription] = useState(transaction.description);
  const [editAmount, setEditAmount] = useState(String(Math.abs(transaction.amount)));
  const [editCategory, setEditCategory] = useState(transaction.category);
  const [editDate, setEditDate] = useState(transaction.date);
  const [editAccount, setEditAccount] = useState(transaction.account || '');

  const category = getCategoryById(transaction.category);
  const account = transaction.account ? getAccountById(transaction.account) : undefined;
  const isIncome = transaction.amount > 0;

  const formatSGD = (n: number) => {
    return 'S$' + Math.abs(n).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = () => {
    // Mock time based on transaction ID for demonstration
    const hour = parseInt(transaction.id) % 24 || 10;
    const minute = (parseInt(transaction.id) * 17) % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    const amount = parseFloat(editAmount);
    if (!amount || !editDescription.trim()) return;

    const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

    updateTransaction(transaction.id, {
      description: editDescription.trim(),
      amount: finalAmount,
      category: editCategory,
      date: editDate,
      account: editAccount || undefined,
    });

    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    deleteTransaction(transaction.id);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          backgroundColor: theme.colors.background.white,
          borderRadius: theme.borderRadius.xl,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
            padding: '24px',
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              Transaction Details
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: theme.borderRadius.md,
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    lineHeight: 0,
                  }}
                >
                  <Edit2 size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: theme.borderRadius.md,
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  lineHeight: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Category Icon & Amount */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
            }}>
              {category?.emoji || '📦'}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: isIncome ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                {isIncome ? 'Income' : 'Expense'}
              </span>
            </div>
            <h3 style={{ fontSize: '36px', fontWeight: 700, margin: 0 }}>
              {isIncome ? '+ ' : '- '}{formatSGD(transaction.amount)}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {!isEditing ? (
            /* View Mode */
            <>
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '12px',
                  color: theme.colors.text.secondary,
                  margin: '0 0 8px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  Description
                </h4>
                <p style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: theme.colors.text.primary,
                  margin: 0,
                }}>
                  {transaction.description}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <h4 style={{
                    fontSize: '12px',
                    color: theme.colors.text.secondary,
                    margin: '0 0 8px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>
                    Date
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}>
                    {formatDate(transaction.date)}
                  </p>
                </div>

                <div>
                  <h4 style={{
                    fontSize: '12px',
                    color: theme.colors.text.secondary,
                    margin: '0 0 8px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>
                    Time
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    color: theme.colors.text.primary,
                    margin: 0,
                  }}>
                    {formatTime()}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '12px',
                  color: theme.colors.text.secondary,
                  margin: '0 0 8px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  Category
                </h4>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: (category?.color || theme.colors.primary) + '18',
                }}>
                  <span style={{ fontSize: '20px' }}>{category?.emoji}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: category?.color || theme.colors.primary,
                  }}>
                    {category?.name}
                  </span>
                </div>
              </div>

              {account && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    fontSize: '12px',
                    color: theme.colors.text.secondary,
                    margin: '0 0 8px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>
                    Account
                  </h4>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: account.color + '18',
                  }}>
                    {(() => {
                      const cfg = getAccountTypeConfig(account.type);
                      const Icon = cfg.icon;
                      return <Icon size={18} color={account.color} strokeWidth={2} />;
                    })()}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: account.color,
                    }}>
                      {account.name}
                      {account.lastFour && ` ••${account.lastFour}`}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Edit Mode */
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  fontSize: '12px',
                  color: theme.colors.text.secondary,
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                }}>
                  DESCRIPTION
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: theme.colors.background.primary,
                    border: `1px solid ${theme.colors.border.light}`,
                    borderRadius: theme.borderRadius.md,
                    padding: '12px 14px',
                    fontSize: '14px',
                    color: theme.colors.text.primary,
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  fontSize: '12px',
                  color: theme.colors.text.secondary,
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                }}>
                  AMOUNT (S$)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: theme.colors.background.primary,
                    border: `1px solid ${theme.colors.border.light}`,
                    borderRadius: theme.borderRadius.md,
                    padding: '12px 14px',
                    fontSize: '14px',
                    color: theme.colors.text.primary,
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  fontSize: '12px',
                  color: theme.colors.text.secondary,
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                }}>
                  DATE
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: theme.colors.background.primary,
                    border: `1px solid ${theme.colors.border.light}`,
                    borderRadius: theme.borderRadius.md,
                    padding: '12px 14px',
                    fontSize: '14px',
                    color: theme.colors.text.primary,
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  fontSize: '12px',
                  color: theme.colors.text.secondary,
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                }}>
                  CATEGORY
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: theme.colors.background.primary,
                    border: `1px solid ${theme.colors.border.light}`,
                    borderRadius: theme.borderRadius.md,
                    padding: '12px 14px',
                    fontSize: '14px',
                    color: theme.colors.text.primary,
                    outline: 'none',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {accounts.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '12px',
                    color: theme.colors.text.secondary,
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 500,
                    letterSpacing: '0.3px',
                  }}>
                    ACCOUNT
                  </label>
                  <select
                    value={editAccount}
                    onChange={(e) => setEditAccount(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: theme.colors.background.primary,
                      border: `1px solid ${theme.colors.border.light}`,
                      borderRadius: theme.borderRadius.md,
                      padding: '12px 14px',
                      fontSize: '14px',
                      color: theme.colors.text.primary,
                      outline: 'none',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    <option value="">No account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '20px 24px',
          borderTop: `1px solid ${theme.colors.border.light}`,
          backgroundColor: theme.colors.background.white,
          flexShrink: 0,
        }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.colors.border.medium}`,
                  color: theme.colors.text.secondary,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: theme.borderRadius.md,
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Save Changes
              </button>
            </div>
          ) : (
            !showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.colors.danger}30`,
                  color: theme.colors.danger,
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Trash2 size={16} />
                Delete Transaction
              </button>
            ) : (
              <div>
                <p style={{
                  fontSize: '13px',
                  color: theme.colors.text.secondary,
                  margin: '0 0 12px',
                  textAlign: 'center',
                }}>
                  Are you sure you want to delete this transaction?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: 'transparent',
                      border: `1px solid ${theme.colors.border.medium}`,
                      color: theme.colors.text.secondary,
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: theme.colors.danger,
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
