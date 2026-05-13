import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, X, Check, Trash2, Building2, CreditCard, Banknote, Smartphone, Wallet } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Account, ACCOUNT_COLORS } from '../data/mockData';

// ── Account type config ───────────────────────────────────────────────────────

export const ACCOUNT_TYPES: {
  id: Account['type'];
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'bank',        label: 'Bank',        icon: Building2   },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard  },
  { id: 'debit_card',  label: 'Debit Card',  icon: Wallet      },
  { id: 'cash',        label: 'Cash',        icon: Banknote    },
  { id: 'ewallet',     label: 'E-Wallet',    icon: Smartphone  },
];

export function getAccountTypeConfig(type: Account['type']) {
  return ACCOUNT_TYPES.find(t => t.id === type) ?? ACCOUNT_TYPES[0];
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

interface SheetProps {
  mode: 'add' | 'edit';
  initial: Partial<Account>;
  onSave: (data: Partial<Account>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function AccountSheet({ mode, initial, onSave, onDelete, onClose }: SheetProps) {
  const [name, setName] = useState(initial.name || '');
  const [type, setType] = useState<Account['type']>(initial.type || 'bank');
  const [color, setColor] = useState(initial.color || ACCOUNT_COLORS[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), type, color });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(31,61,46,0.45)',
          zIndex: 50,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(100vw, 390px)',
        backgroundColor: '#F5F8F4',
        borderRadius: '20px 20px 0 0',
        zIndex: 51,
        maxHeight: '88vh',
        overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 99, backgroundColor: '#D7E3D8' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px 18px',
        }}>
          <p style={{ fontSize: '15px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>
            {mode === 'add' ? 'New account' : 'Edit account'}
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0, color: '#67B47C' }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '0 20px 36px' }}>
          {/* Account type selector */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '11px', color: '#67B47C', display: 'block', marginBottom: '10px', letterSpacing: '0.04em' }}>
              ACCOUNT TYPE
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ACCOUNT_TYPES.map(t => {
                const active = type === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 13px', borderRadius: '99px',
                      border: `1px solid ${active ? color : '#D7E3D8'}`,
                      backgroundColor: active ? color + '20' : '#FFFFFF',
                      color: active ? color : '#6B8577',
                      fontSize: '12px', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: active ? 500 : 400,
                    }}
                  >
                    <Icon size={12} strokeWidth={active ? 2 : 1.5} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '11px', color: '#67B47C', display: 'block', marginBottom: '7px', letterSpacing: '0.04em' }}>
              ACCOUNT NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={
                type === 'bank'        ? 'e.g. DBS Savings' :
                type === 'credit_card' ? 'e.g. DBS Altitude Visa' :
                type === 'debit_card'  ? 'e.g. POSB Everyday' :
                type === 'ewallet'     ? 'e.g. GrabPay' :
                'e.g. Wallet cash'
              }
              maxLength={40}
              style={{
                width: '100%', boxSizing: 'border-box',
                backgroundColor: '#FFFFFF', border: '1px solid #D7E3D8',
                borderRadius: '12px', padding: '13px 15px',
                fontSize: '14px', color: '#1F3D2E', outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>

          {/* Color swatches */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '11px', color: '#67B47C', display: 'block', marginBottom: '10px', letterSpacing: '0.04em' }}>
              COLOR
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {ACCOUNT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    backgroundColor: c,
                    border: c === color ? `2.5px solid #1F3D2E` : '2.5px solid transparent',
                    outline: c === color ? `1.5px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {c === color && <Check size={13} strokeWidth={3} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: '100%', padding: '15px',
              borderRadius: '12px',
              backgroundColor: canSave ? '#4A9B8E' : '#D7E3D8',
              color: canSave ? '#F5F8F4' : '#67B47C',
              border: 'none', fontSize: '14px', fontWeight: 500,
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: onDelete ? '10px' : 0,
            }}
          >
            {mode === 'add' ? 'Add account' : 'Save changes'}
          </button>

          {/* Delete */}
          {onDelete && (
            <>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '12px',
                    backgroundColor: 'transparent', color: '#D64545',
                    border: '1px solid #D6454530',
                    fontSize: '13px', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  Remove account
                </button>
              ) : (
                <div style={{
                  backgroundColor: '#D6454510', borderRadius: '12px',
                  border: '1px solid #D6454530', padding: '14px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '12px', color: '#D64545', margin: '0 0 10px' }}>
                    Remove this account? Existing transactions won't be affected.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        backgroundColor: '#FFFFFF', border: '1px solid #D7E3D8',
                        fontSize: '12px', color: '#6B8577', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onDelete}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        backgroundColor: '#D64545', border: 'none',
                        fontSize: '12px', color: '#fff', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({ account, onEdit }: { account: Account; onEdit: () => void }) {
  const cfg = getAccountTypeConfig(account.type);
  const Icon = cfg.icon;

  return (
    <div style={{
      backgroundColor: '#FFFFFF', borderRadius: '12px',
      border: '1px solid #D7E3D8', padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      {/* Icon badge */}
      <div style={{
        width: 42, height: 42, borderRadius: '11px', flexShrink: 0,
        backgroundColor: account.color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={1.5} color={account.color} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', color: '#1F3D2E', fontWeight: 500, margin: '0 0 3px' }}>
          {account.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{
            fontSize: '10px', color: account.color,
            backgroundColor: account.color + '18',
            padding: '2px 8px', borderRadius: '99px',
          }}>
            {cfg.label}
          </span>
          {account.lastFour && (
            <span style={{ fontSize: '10px', color: '#67B47C' }}>••••&nbsp;{account.lastFour}</span>
          )}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        style={{
          background: 'none', border: '1px solid #D7E3D8',
          borderRadius: '8px', padding: '7px', cursor: 'pointer',
          lineHeight: 0, color: '#67B47C', flexShrink: 0,
        }}
      >
        <X size={0} style={{ display: 'none' }} />
        {/* pencil via text */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type SheetState =
  | { open: false }
  | { open: true; mode: 'add'; accId: null }
  | { open: true; mode: 'edit'; accId: string };

export function Accounts() {
  const navigate = useNavigate();
  const { accounts, addAccount, updateAccount, deleteAccount } = useAppContext();
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const editingAcc = sheet.open && sheet.mode === 'edit'
    ? accounts.find(a => a.id === sheet.accId)
    : undefined;

  const handleSave = (data: Partial<Account>) => {
    if (sheet.open && sheet.mode === 'add') {
      addAccount({
        name: data.name!,
        type: data.type!,
        color: data.color!,
        lastFour: data.lastFour,
      });
    } else if (sheet.open && sheet.mode === 'edit') {
      updateAccount(sheet.accId, data);
    }
    setSheet({ open: false });
  };

  const handleDelete = () => {
    if (sheet.open && sheet.mode === 'edit') {
      deleteAccount(sheet.accId);
      setSheet({ open: false });
    }
  };

  // Group by type
  const grouped = ACCOUNT_TYPES
    .map(t => ({ type: t, items: accounts.filter(a => a.type === t.id) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ color: '#1F3D2E', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{
        padding: '52px 22px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', lineHeight: 0, color: '#6B8577',
            }}
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', color: '#1F3D2E', margin: '0 0 2px' }}>Accounts</h2>
            <p style={{ fontSize: '12px', color: '#6B8577', margin: 0 }}>{accounts.length} accounts linked</p>
          </div>
        </div>

        <button
          onClick={() => setSheet({ open: true, mode: 'add', accId: null })}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            backgroundColor: '#4A9B8E', color: '#F5F8F4',
            border: 'none', borderRadius: '99px', padding: '8px 14px',
            fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
          }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* Type legend */}
      <div style={{
        display: 'flex', overflowX: 'auto', gap: '8px',
        padding: '0 22px 18px',
        scrollbarWidth: 'none',
      }}>
        {ACCOUNT_TYPES.map(t => {
          const Icon = t.icon;
          const count = accounts.filter(a => a.type === t.id).length;
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: '99px', flexShrink: 0,
                backgroundColor: count > 0 ? '#FFFFFF' : 'transparent',
                border: `1px solid ${count > 0 ? '#D7E3D8' : '#FFFFFF'}`,
              }}
            >
              <Icon size={12} strokeWidth={1.5} color={count > 0 ? '#6B8577' : '#D7E3D8'} />
              <span style={{ fontSize: '11px', color: count > 0 ? '#6B8577' : '#D7E3D8' }}>
                {t.label}
              </span>
              {count > 0 && (
                <span style={{
                  fontSize: '10px', color: '#67B47C',
                  backgroundColor: '#D7E3D8', borderRadius: '99px',
                  padding: '0 5px', minWidth: '16px', textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Account list */}
      <div style={{ padding: '0 22px' }}>
        {accounts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            backgroundColor: '#FFFFFF', borderRadius: '12px',
            border: '1px solid #D7E3D8',
          }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px' }}>🏦</p>
            <p style={{ fontSize: '14px', color: '#6B8577', margin: '0 0 4px' }}>No accounts yet</p>
            <p style={{ fontSize: '12px', color: '#67B47C', margin: 0 }}>
              Tap <strong>Add</strong> to link your first account
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.type.id} style={{ marginBottom: '20px' }}>
              <p style={{
                fontSize: '11px', color: '#67B47C', margin: '0 0 8px',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {group.type.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.items.map(acc => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    onEdit={() => setSheet({ open: true, mode: 'edit', accId: acc.id })}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sheet */}
      {sheet.open && (
        <AccountSheet
          mode={sheet.mode}
          initial={
            sheet.mode === 'edit' && editingAcc
              ? editingAcc
              : { type: 'bank', color: ACCOUNT_COLORS[0] }
          }
          onSave={handleSave}
          onDelete={sheet.mode === 'edit' ? handleDelete : undefined}
          onClose={() => setSheet({ open: false })}
        />
      )}
    </div>
  );
}