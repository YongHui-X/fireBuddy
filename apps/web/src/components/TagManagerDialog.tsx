import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import type { Tag } from '../app/FireBuddyProvider';
import { useAccessibleDialog } from './useAccessibleDialog';

interface TagManagerDialogProps {
  tags: Tag[];
  usageCounts: Map<string, number>;
  onCreate: (name: string) => Promise<Tag>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

/** Manage reusable tag names while requiring an explicit destructive confirmation. */
export function TagManagerDialog({ tags, usageCounts, onCreate, onRename, onDelete, onClose }: TagManagerDialogProps) {
  const [draftName, setDraftName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useAccessibleDialog<HTMLElement>({ onClose, canClose: !busyId });

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setEditingId(null);
      setDeletingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update tags.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={busyId ? undefined : onClose}>
      <aside ref={dialogRef} className="center-sheet tag-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <div><h3 id="tag-manager-title">Manage tags</h3><p>Reusable labels for transaction records.</p></div>
          <button className="plain-icon-button" type="button" onClick={onClose} disabled={Boolean(busyId)} aria-label="Close tag manager"><X size={18} /></button>
        </div>
        <div className="sheet-body">
          <div className="inline-tag-form">
            <input data-dialog-initial-focus value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={40} placeholder="New tag name" aria-label="New tag name" />
            <button className="secondary-button" type="button" disabled={!draftName.trim() || Boolean(busyId)} onClick={() => void run('new', async () => { await onCreate(draftName); setDraftName(''); })}><Plus size={14} /> Add</button>
          </div>
          <div className="tag-manager-list">
            {tags.map((tag) => (
              <div className="tag-manager-row" key={tag.id}>
                <div>
                  {editingId === tag.id ? <input value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={40} aria-label={`Rename ${tag.name}`} /> : <strong>{tag.name}</strong>}
                  <span>{usageCounts.get(tag.id) ?? 0} {(usageCounts.get(tag.id) ?? 0) === 1 ? 'transaction' : 'transactions'}</span>
                </div>
                <div>
                  {deletingId === tag.id ? <>
                    <button className="secondary-button" type="button" onClick={() => setDeletingId(null)} disabled={Boolean(busyId)}>Cancel</button>
                    <button className="danger-button" type="button" onClick={() => void run(tag.id, () => onDelete(tag.id))} disabled={Boolean(busyId)}>{busyId === tag.id ? 'Deleting...' : 'Confirm delete'}</button>
                  </> : editingId === tag.id ? <>
                    <button className="secondary-button" type="button" onClick={() => setEditingId(null)} disabled={Boolean(busyId)}>Cancel</button>
                    <button className="primary-button" type="button" onClick={() => void run(tag.id, () => onRename(tag.id, editingName))} disabled={!editingName.trim() || Boolean(busyId)}>Save</button>
                  </> : <>
                    <button className="plain-icon-button" type="button" aria-label={`Rename ${tag.name}`} onClick={() => { setEditingId(tag.id); setEditingName(tag.name); }}><Pencil size={15} /></button>
                    <button className="plain-icon-button danger-icon" type="button" aria-label={`Delete ${tag.name}`} onClick={() => setDeletingId(tag.id)}><Trash2 size={15} /></button>
                  </>}
                </div>
              </div>
            ))}
            {!tags.length ? <p className="field-help">No tags created yet.</p> : null}
          </div>
          {deletingId ? <p className="field-help">Deleting a tag detaches it from transactions. Your transactions are never deleted.</p> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
      </aside>
    </div>
  );
}
