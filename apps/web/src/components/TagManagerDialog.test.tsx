import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TagManagerDialog } from './TagManagerDialog';

const tag = { id: 'tag-id', userId: 'user-id', name: 'Tax', usageCount: 2, createdAt: '', updatedAt: '' };

describe('TagManagerDialog', () => {
  it('renames tags and shows current usage', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(<TagManagerDialog tags={[tag]} usageCounts={new Map([['tag-id', 2]])} onCreate={vi.fn()} onRename={onRename} onDelete={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Manage tags' });
    expect(within(dialog).getByText('2 transactions')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rename Tax' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Rename Tax' }), { target: { value: 'Claimable' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onRename).toHaveBeenCalledWith('tag-id', 'Claimable'));
  });

  it('requires confirmation before deleting and explains safe detachment', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<TagManagerDialog tags={[tag]} usageCounts={new Map()} onCreate={vi.fn()} onRename={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Tax' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/transactions are never deleted/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('tag-id'));
  });
});
