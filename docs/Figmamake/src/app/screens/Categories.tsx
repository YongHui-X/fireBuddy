import { useState } from 'react';
import { Plus, Pencil, X, Check, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Category, CATEGORY_COLORS, CATEGORY_EMOJIS } from '../data/mockData';

const MONTH_KEY = '2026-04';

function formatSGD(n: number) {
  return 'S$' + n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

interface SheetProps {
  mode: 'add' | 'edit';
  initial: Partial<Category>;
  onSave: (data: Partial<Category>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function CategorySheet({ mode, initial, onSave, onDelete, onClose }: SheetProps) {
  const [emoji, setEmoji] = useState(initial.emoji || '📦');
  const [name, setName] = useState(initial.name || '');
  const [color, setColor] = useState(initial.color || CATEGORY_COLORS[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ emoji, name: name.trim(), color, monthlyBudget: initial.monthlyBudget || 0 });
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

      {/* Sheet panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(100vw, 420px)',
          backgroundColor: '#F5F8F4',
          borderRadius: '16px',
          zIndex: 51,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 12px',
          flexShrink: 0,
        }}>
          <p style={{ fontSize: '15px', color: '#1F3D2E', fontWeight: 500, margin: 0 }}>
            {mode === 'add' ? 'New category' : 'Edit category'}
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0, color: '#6B8577' }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '0 20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Emoji preview + picker */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              {/* Large preview */}
              <div style={{
                width: 48, height: 48, borderRadius: '12px', fontSize: '24px',
                backgroundColor: color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {emoji}
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#6B8577', margin: '0 0 3px' }}>Emoji</p>
                <p style={{ fontSize: '11px', color: '#6B8577', margin: 0 }}>Tap one below</p>
              </div>
            </div>
            {/* Emoji grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px',
              backgroundColor: '#FFFFFF', borderRadius: '12px',
              border: '1px solid #D7E3D8', padding: '8px',
            }}>
              {CATEGORY_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    background: e === emoji ? color + '30' : 'none',
                    border: e === emoji ? `1px solid ${color}` : '1px solid transparent',
                    borderRadius: '6px', padding: '6px',
                    fontSize: '18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: '#6B8577', display: 'block', marginBottom: '6px', letterSpacing: '0.04em' }}>
              CATEGORY NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dining out"
              maxLength={30}
              style={{
                width: '100%', boxSizing: 'border-box',
                backgroundColor: '#FFFFFF', border: '1px solid #D7E3D8',
                borderRadius: '10px', padding: '12px 14px',
                fontSize: '14px', color: '#1F3D2E', outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>

          {/* Color swatches */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', color: '#6B8577', display: 'block', marginBottom: '8px', letterSpacing: '0.04em' }}>
              COLOR
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    backgroundColor: c,
                    border: c === color ? `2px solid #1F3D2E` : '2px solid transparent',
                    outline: c === color ? `1.5px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {c === color && <Check size={12} strokeWidth={3} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: '100%', padding: '13px',
              borderRadius: '10px',
              backgroundColor: canSave ? '#4A9B8E' : '#D7E3D8',
              color: canSave ? '#FFFFFF' : '#6B8577',
              border: 'none', fontSize: '14px', fontWeight: 500,
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans, sans-serif',
              marginBottom: onDelete ? '10px' : 0,
            }}
          >
            {mode === 'add' ? 'Add category' : 'Save changes'}
          </button>

          {/* Delete (edit mode only, non-default) */}
          {onDelete && (
            <>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    width: '100%', padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    color: '#D64545',
                    border: '1px solid #D6454530',
                    fontSize: '12px', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                  Delete category
                </button>
              ) : (
                <div style={{
                  backgroundColor: '#D6454510', borderRadius: '10px',
                  border: '1px solid #D6454530', padding: '12px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: '#D64545', margin: '0 0 10px' }}>
                    Delete this category? Existing transactions will keep their category label.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px',
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
                        flex: 1, padding: '9px', borderRadius: '8px',
                        backgroundColor: '#D64545', border: 'none',
                        fontSize: '12px', color: '#fff', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                      }}
                    >
                      Delete
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

// ── Main screen ───────────────────────────────────────────────────────────────

type SheetState =
  | { open: false }
  | { open: true; mode: 'add'; catId: null }
  | { open: true; mode: 'edit'; catId: string };

export function Categories() {
  const { categories, transactions, addCategory, updateCategory, deleteCategory } = useAppContext();
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const monthTxns = transactions.filter(t => t.date.startsWith(MONTH_KEY));

  const catData = categories
    .filter(c => c.id !== 'income')
    .map(c => {
      const spend = monthTxns
        .filter(t => t.category === c.id && t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const pct = c.monthlyBudget > 0 ? Math.min((spend / c.monthlyBudget) * 100, 100) : 0;
      return { ...c, spend, pct };
    });

  const incomeTotal = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalBudget = catData.reduce((s, c) => s + c.monthlyBudget, 0);
  const totalSpend  = catData.reduce((s, c) => s + c.spend, 0);

  const editingCat = sheet.open && sheet.mode === 'edit'
    ? categories.find(c => c.id === sheet.catId)
    : undefined;

  const handleSave = (data: Partial<Category>) => {
    if (sheet.open && sheet.mode === 'add') {
      addCategory({
        name: data.name!,
        emoji: data.emoji!,
        color: data.color!,
        monthlyBudget: data.monthlyBudget ?? 0,
      });
    } else if (sheet.open && sheet.mode === 'edit') {
      updateCategory(sheet.catId, data);
    }
    setSheet({ open: false });
  };

  const handleDelete = () => {
    if (sheet.open && sheet.mode === 'edit') {
      deleteCategory(sheet.catId);
      setSheet({ open: false });
    }
  };

  return (
    <div style={{ color: '#1F3D2E' }}>
      {/* Header */}
      <div style={{ padding: '52px 22px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', color: '#25543D', margin: '0 0 2px' }}>Categories</h2>
          <p style={{ fontSize: '12px', color: '#6B8577', margin: 0 }}>April 2026</p>
        </div>
        <button
          onClick={() => setSheet({ open: true, mode: 'add', catId: null })}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            backgroundColor: '#4A9B8E', color: '#FFFFFF',
            border: 'none', borderRadius: '99px', padding: '8px 14px',
            fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
          }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* Summary bar */}
      <div style={{
        margin: '0 22px 16px',
        backgroundColor: '#FFFFFF', borderRadius: '12px',
        border: '1px solid #D7E3D8', padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '12px', color: '#6B8577', margin: 0 }}>Monthly budget used</p>
          <p style={{ fontSize: '12px', color: '#1F3D2E', margin: 0, fontWeight: 500 }}>
            {formatSGD(totalSpend)} / {formatSGD(totalBudget)}
          </p>
        </div>
        <div style={{ height: '4px', backgroundColor: '#DCEBDD', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min((totalSpend / totalBudget) * 100, 100)}%`,
            backgroundColor: '#4A9B8E', borderRadius: '99px',
          }} />
        </div>
      </div>

      {/* Income card */}
      <div style={{ padding: '0 22px', marginBottom: '18px' }}>
        <div style={{
          backgroundColor: '#4A9B8E', borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>
              💵
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#FFFFFF', margin: '0 0 2px', fontWeight: 500 }}>Income</p>
              <p style={{ fontSize: '11px', color: '#DCEBDD', margin: 0 }}>April total</p>
            </div>
          </div>
          <p style={{ fontSize: '16px', color: '#FFFFFF', margin: 0, fontWeight: 500 }}>
            +S${incomeTotal.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Category grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '10px', padding: '0 22px 100px',
      }}>
        {catData.map(cat => (
          <div
            key={cat.id}
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '12px',
              border: '1px solid #D7E3D8', padding: '16px',
              position: 'relative',
            }}
          >
            {/* Edit pencil */}
            <button
              onClick={() => setSheet({ open: true, mode: 'edit', catId: cat.id })}
              style={{
                position: 'absolute', top: '10px', right: '10px',
                background: 'none', border: 'none', padding: '4px',
                cursor: 'pointer', lineHeight: 0, color: '#6B8577',
                borderRadius: '6px',
              }}
            >
              <Pencil size={12} strokeWidth={1.5} />
            </button>

            {/* Icon */}
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              backgroundColor: cat.color + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', marginBottom: '10px',
            }}>
              {cat.emoji}
            </div>

            <p style={{ fontSize: '12px', color: '#6B8577', margin: '0 0 2px', paddingRight: '18px' }}>{cat.name}</p>

            <p style={{ fontSize: '18px', color: '#1F3D2E', fontWeight: 500, margin: '0 0 2px' }}>
              {formatSGD(cat.spend)}
            </p>
            <p style={{ fontSize: '11px', color: '#6B8577', margin: '0 0 10px' }}>
              of {formatSGD(cat.monthlyBudget)}
            </p>

            {/* Progress bar */}
            <div style={{ height: '3px', backgroundColor: '#DCEBDD', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${cat.pct}%`,
                backgroundColor: cat.pct >= 100 ? '#D64545' : cat.color,
                borderRadius: '99px',
              }} />
            </div>

            {cat.pct >= 100 && <p style={{ fontSize: '10px', color: '#D64545', margin: '5px 0 0' }}>Over budget</p>}
            {cat.pct >= 90 && cat.pct < 100 && <p style={{ fontSize: '10px', color: '#E5B24A', margin: '5px 0 0' }}>Almost there</p>}
            {cat.pct < 90 && <p style={{ fontSize: '10px', color: '#6B8577', margin: '5px 0 0' }}>{cat.pct.toFixed(0)}% used</p>}
          </div>
        ))}
      </div>

      {/* Sheet */}
      {sheet.open && (
        <CategorySheet
          mode={sheet.mode}
          initial={
            sheet.mode === 'edit' && editingCat
              ? editingCat
              : { emoji: '📦', color: CATEGORY_COLORS[0], monthlyBudget: 0 }
          }
          onSave={handleSave}
          onDelete={
            sheet.mode === 'edit' && editingCat && !editingCat.isDefault
              ? handleDelete
              : undefined
          }
          onClose={() => setSheet({ open: false })}
        />
      )}
    </div>
  );
}