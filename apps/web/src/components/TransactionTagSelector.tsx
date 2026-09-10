import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';

import type { Tag } from '../app/FireBuddyProvider';

interface TransactionTagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  disabled?: boolean;
  onChange: (tagIds: string[]) => void;
  onCreate: (name: string) => Promise<Tag>;
}

/** Select up to ten reusable tags and create new tags without leaving the form. */
export function TransactionTagSelector({ tags, selectedTagIds, disabled, onChange, onCreate }: TransactionTagSelectorProps) {
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else if (selectedTagIds.length < 10) {
      onChange([...selectedTagIds, tagId]);
    } else {
      setError('Choose up to 10 tags per transaction.');
    }
  }

  async function createInlineTag() {
    if (!newTagName.trim() || isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await onCreate(newTagName);
      onChange([...selectedTagIds, created.id]);
      setNewTagName('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create tag.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <fieldset className="transaction-tag-selector" disabled={disabled}>
      <legend>Tags <span>{selectedTagIds.length}/10</span></legend>
      {tags.length ? (
        <div className="transaction-tag-options">
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button key={tag.id} type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => toggleTag(tag.id)}>
                {selected ? <Check size={13} /> : null}{tag.name}{selected ? <X size={12} /> : null}
              </button>
            );
          })}
        </div>
      ) : <p className="field-help">No tags yet. Create one below.</p>}
      <div className="inline-tag-form">
        <input value={newTagName} onChange={(event) => setNewTagName(event.target.value)} maxLength={40} placeholder="New tag name" aria-label="New tag name" />
        <button className="secondary-button" type="button" onClick={() => void createInlineTag()} disabled={!newTagName.trim() || isCreating || selectedTagIds.length >= 10}>
          <Plus size={14} /> {isCreating ? 'Adding...' : 'Add tag'}
        </button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
