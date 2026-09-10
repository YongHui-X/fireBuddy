import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionExportDialog } from './TransactionExportDialog';

describe('TransactionExportDialog', () => {
  it('defaults to all history and can export the filtered view', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(<TransactionExportDialog onExport={onExport} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Export transactions' });
    expect((within(dialog).getByRole('radio', { name: /All transaction history/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(dialog).getByRole('radio', { name: /Current filtered view/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Export CSV' }));
    await waitFor(() => expect(onExport).toHaveBeenCalledWith('filtered'));
  });

  it('keeps the dialog open and reports export failures', async () => {
    render(<TransactionExportDialog onExport={vi.fn().mockRejectedValue(new Error('Export failed'))} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Export failed');
    expect(screen.getByRole('dialog', { name: 'Export transactions' })).toBeTruthy();
  });
});
