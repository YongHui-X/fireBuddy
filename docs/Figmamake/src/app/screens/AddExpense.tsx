import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getAccountTypeConfig } from './Accounts';
import { theme } from '../theme';

export function AddExpense() {
  const navigate = useNavigate();
  const { addTransaction, categories, accounts } = useAppContext();

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-04-14');
  const [selectedCat, setSelectedCat] = useState<string>('food');
  const [selectedAcc, setSelectedAcc] = useState<string>(accounts[0]?.id || '');

  const isIncome = selectedCat === 'income';
  const displayAmount = amountStr === '' ? '0.00' : parseFloat(amountStr || '0').toFixed(2);

  const handleConfirm = () => {
    const raw = parseFloat(amountStr || '0');
    if (raw === 0) return;
    const finalAmount = isIncome ? Math.abs(raw) : -Math.abs(raw);
    addTransaction({
      description: description || 'Unnamed expense',
      amount: finalAmount,
      category: selectedCat,
      date,
      account: selectedAcc || undefined,
    });
    navigate(-1);
  };

  const expenseCats = categories.filter(c => c.id !== 'income');
  const incomeCat = categories.find(c => c.id === 'income');
  const allCats = incomeCat ? [...expenseCats, incomeCat] : expenseCats;

  return (
    <div style={{
      backgroundColor: 'rgba(0,0,0,0.5)',
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out',
    }}
      onClick={() => navigate(-1)}
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
          maxWidth: '480px',
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
        <div style={{
          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
          padding: '20px 24px',
          color: '#FFFFFF',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
            }}>
              Add {isIncome ? 'Income' : 'Expense'}
            </h2>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                lineHeight: 0,
                color: '#FFFFFF',
              }}
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          {/* Amount display */}
          <div style={{
            textAlign: 'center',
            padding: '20px 0 28px',
            borderBottom: `1px solid ${theme.colors.border.light}`,
            marginBottom: '24px',
          }}>
            <p style={{
              fontSize: '12px',
              color: theme.colors.text.secondary,
              marginBottom: '12px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>
              {isIncome ? 'Amount Received' : 'Amount Spent'}
            </p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{
                fontSize: '42px',
                fontWeight: 600,
                color: amountStr === '' ? theme.colors.text.light : (isIncome ? theme.colors.primary : theme.colors.text.primary),
                letterSpacing: '-0.02em',
              }}>
                S$ {displayAmount}
              </span>
              <input
                type="number"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="0"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'text',
                  fontSize: '42px',
                }}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
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
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Hawker Centre lunch"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: theme.colors.background.primary,
                border: `1px solid ${theme.colors.border.light}`,
                borderRadius: theme.borderRadius.md,
                padding: '14px 16px',
                fontSize: '14px',
                color: theme.colors.text.primary,
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: '24px' }}>
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
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: theme.colors.background.primary,
                border: `1px solid ${theme.colors.border.light}`,
                borderRadius: theme.borderRadius.md,
                padding: '14px 16px',
                fontSize: '14px',
                color: theme.colors.text.primary,
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>

          {/* Category grid */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontSize: '12px',
              color: theme.colors.text.secondary,
              display: 'block',
              marginBottom: '12px',
              fontWeight: 500,
              letterSpacing: '0.3px',
            }}>
              CATEGORY
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}>
              {allCats.map(cat => {
                const active = selectedCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(cat.id)}
                    style={{
                      padding: '16px 10px',
                      borderRadius: theme.borderRadius.md,
                      border: active ? `2px solid ${cat.color}` : `1px solid ${theme.colors.border.light}`,
                      backgroundColor: active ? (cat.color + '18') : theme.colors.background.primary,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: theme.borderRadius.md,
                      backgroundColor: active ? (cat.color + '30') : (cat.color + '15'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}>
                      {cat.emoji}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: active ? cat.color : theme.colors.text.secondary,
                      fontWeight: active ? 600 : 400,
                      textAlign: 'center',
                      lineHeight: 1.3,
                      fontFamily: 'DM Sans, sans-serif',
                      wordBreak: 'break-word',
                    }}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account grid */}
          {accounts.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                fontSize: '12px',
                color: theme.colors.text.secondary,
                display: 'block',
                marginBottom: '12px',
                fontWeight: 500,
                letterSpacing: '0.3px',
              }}>
                ACCOUNT
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
              }}>
                {accounts.map(acc => {
                  const cfg = getAccountTypeConfig(acc.type);
                  const Icon = cfg.icon;
                  const active = selectedAcc === acc.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedAcc(acc.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        borderRadius: theme.borderRadius.md,
                        border: active ? `2px solid ${acc.color}` : `1px solid ${theme.colors.border.light}`,
                        backgroundColor: active ? (acc.color + '15') : theme.colors.background.primary,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: theme.borderRadius.sm,
                        backgroundColor: active ? (acc.color + '30') : (acc.color + '15'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={16} strokeWidth={2} color={acc.color} />
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: active ? acc.color : theme.colors.text.primary,
                        fontWeight: active ? 600 : 400,
                        flex: 1,
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'DM Sans, sans-serif',
                      }}>
                        {acc.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Confirm button */}
        <div style={{
          padding: '20px 24px',
          borderTop: `1px solid ${theme.colors.border.light}`,
          backgroundColor: theme.colors.background.white,
          flexShrink: 0,
        }}>
          <button
            onClick={handleConfirm}
            disabled={!amountStr || parseFloat(amountStr) === 0}
            className={(!amountStr || parseFloat(amountStr) === 0) ? '' : 'button-press'}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: theme.borderRadius.lg,
              background: (!amountStr || parseFloat(amountStr) === 0)
                ? theme.colors.border.medium
                : `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
              color: (!amountStr || parseFloat(amountStr) === 0) ? theme.colors.text.secondary : '#FFFFFF',
              border: 'none',
              fontSize: '15px',
              fontWeight: 600,
              cursor: (!amountStr || parseFloat(amountStr) === 0) ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.2s',
              boxShadow: (!amountStr || parseFloat(amountStr) === 0) ? 'none' : theme.shadows.md,
            }}
          >
            {isIncome ? 'Add Income' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
