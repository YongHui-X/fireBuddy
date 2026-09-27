import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { AppText } from './Text';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation before a destructive or irreversible step, presented as a short bottom sheet. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <BottomSheet open={open} onClose={onCancel} title={title} scroll={false} dismissable={!busy}>
      <AppText variant="body" tone="ink2">{message}</AppText>
      {error ? <AppText variant="bodySmall" tone="danger" style={styles.error}>{error}</AppText> : null}
      <View style={styles.actions}>
        <Button label={confirmLabel} variant={tone} block loading={busy} onPress={onConfirm} />
        <Button label={cancelLabel} variant="secondary" block disabled={busy} onPress={onCancel} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
