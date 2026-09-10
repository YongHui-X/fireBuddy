import { Download, X } from 'lucide-react';
import { useState } from 'react';

import { useAccessibleDialog } from './useAccessibleDialog';

export type TransactionExportScope = 'all' | 'filtered';

/** Confirm whether an export covers full history or the active transaction view. */
export function TransactionExportDialog({ onExport, onClose }: { onExport: (scope: TransactionExportScope) => Promise<void>; onClose: () => void }) {
  const [scope, setScope] = useState<TransactionExportScope>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useAccessibleDialog<HTMLElement>({ onClose, canClose: !isExporting });

  async function exportCsv() {
    setIsExporting(true);
    setError(null);
    try {
      await onExport(scope);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to export transactions.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={isExporting ? undefined : onClose}>
      <aside ref={dialogRef} className="center-sheet export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <div><h3 id="export-title">Export transactions</h3><p>Download a portable CSV for records or analysis.</p></div>
          <button className="plain-icon-button" type="button" onClick={onClose} disabled={isExporting} aria-label="Close export dialog"><X size={18} /></button>
        </div>
        <div className="sheet-body">
          <label className="export-scope-option"><input data-dialog-initial-focus type="radio" name="export-scope" checked={scope === 'all'} onChange={() => setScope('all')} /><span><strong>All transaction history</strong><small>Includes every income and expense record.</small></span></label>
          <label className="export-scope-option"><input type="radio" name="export-scope" checked={scope === 'filtered'} onChange={() => setScope('filtered')} /><span><strong>Current filtered view</strong><small>Uses the active dates, type, category, account, tag, and search.</small></span></label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="sheet-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={isExporting}>Cancel</button><button className="primary-button" type="button" onClick={() => void exportCsv()} disabled={isExporting}><Download size={15} /> {isExporting ? 'Exporting...' : 'Export CSV'}</button></div>
        </div>
      </aside>
    </div>
  );
}
