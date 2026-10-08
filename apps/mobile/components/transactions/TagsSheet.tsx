import type { Tag } from '@firebuddy/shared';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';
import { useResetWhen } from '@/hooks/use-reset-when';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { IconButton } from '../ui/IconButton';
import { AppText } from '../ui/Text';
import { TextField } from '../ui/TextField';

export interface TagsSheetProps {
  open: boolean;
  tags: readonly Tag[];
  usageCounts: Map<string, number>;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const MAX_TAG_LENGTH = 40;

/** Manage reusable tag names: add, rename inline, and delete behind an explicit confirmation. */
export function TagsSheet({ open, tags, usageCounts, onClose, onCreate, onRename, onDelete }: TagsSheetProps) {
  const { theme } = useTheme();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const [error, setError] = useState<string | null>(null);

  useResetWhen(open, () => {
    setDraft('');
    setEditingId(null);
    setError(null);
  });

  const duplicate = (name: string, exceptId?: string) => tags.some((tag) => tag.id !== exceptId && tag.name.toLowerCase() === name.toLowerCase());

  function create() {
    const name = draft.trim();
    if (!name) return;
    if (duplicate(name)) {
      setError(`“${name}” already exists.`);
      return;
    }
    onCreate(name);
    setDraft('');
    setError(null);
  }

  function commitRename(tag: Tag) {
    const name = editingName.trim();
    if (!name) return;
    if (duplicate(name, tag.id)) {
      setError(`“${name}” already exists.`);
      return;
    }
    if (name !== tag.name) onRename(tag.id, name);
    setEditingId(null);
    setError(null);
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Manage tags" description="Reusable labels for transaction records.">
        <View style={styles.body}>
          <View style={styles.newRow}>
            <TextField
              value={draft}
              onChangeText={(text) => { setDraft(text.slice(0, MAX_TAG_LENGTH)); setError(null); }}
              placeholder="New tag name"
              accessibilityLabel="New tag name"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={create}
              style={styles.newField}
            />
            <Button label="Add" icon={Plus} variant="secondary" disabled={!draft.trim()} onPress={create} />
          </View>
          {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}

          <View>
            {tags.map((tag, index) => {
              const count = usageCounts.get(tag.id) ?? 0;
              const editing = editingId === tag.id;
              return (
                <View key={tag.id} style={[styles.row, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}>
                  {editing ? (
                    <>
                      <TextField
                        value={editingName}
                        onChangeText={(text) => { setEditingName(text.slice(0, MAX_TAG_LENGTH)); setError(null); }}
                        accessibilityLabel={`Rename ${tag.name}`}
                        autoFocus
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={() => commitRename(tag)}
                        style={styles.editField}
                      />
                      <IconButton icon={Check} accessibilityLabel="Save name" color={theme.accentText} disabled={!editingName.trim()} onPress={() => commitRename(tag)} />
                      <IconButton icon={X} accessibilityLabel="Cancel rename" onPress={() => { setEditingId(null); setError(null); }} />
                    </>
                  ) : (
                    <>
                      <View style={styles.copy}>
                        <AppText variant="bodySemibold" numberOfLines={1}>{tag.name}</AppText>
                        <AppText variant="caption" tone="ink2">{count} transaction{count === 1 ? '' : 's'}</AppText>
                      </View>
                      <IconButton icon={Pencil} accessibilityLabel={`Rename ${tag.name}`} iconSize={18} onPress={() => { setEditingId(tag.id); setEditingName(tag.name); setError(null); }} />
                      <IconButton icon={Trash2} accessibilityLabel={`Delete ${tag.name}`} iconSize={18} color={theme.danger} onPress={() => setDeleting(tag)} />
                    </>
                  )}
                </View>
              );
            })}
            {!tags.length ? <AppText variant="bodySmall" tone="ink2" style={styles.emptyCopy}>No tags yet. Add one above, or from the Add transaction sheet.</AppText> : null}
          </View>
        </View>
      </BottomSheet>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete tag?"
        message={deleting ? `“${deleting.name}” is removed from ${usageCounts.get(deleting.id) ?? 0} transaction${(usageCounts.get(deleting.id) ?? 0) === 1 ? '' : 's'}. The transactions themselves are kept.` : ''}
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) onDelete(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  newField: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 60,
    paddingVertical: spacing.xs,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  editField: {
    flex: 1,
  },
  emptyCopy: {
    paddingVertical: spacing.md,
  },
});
