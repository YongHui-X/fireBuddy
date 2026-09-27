import type { LucideIcon } from 'lucide-react-native';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { BottomSheet } from './BottomSheet';
import { PressOverlay } from './PressOverlay';
import { AppText } from './Text';

export interface SheetAction {
  key?: string;
  label: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  selected?: boolean;
  onSelect: () => void;
}

export interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: readonly SheetAction[];
}

/** Row actions and single-choice pickers share one surface: a list of 56px rows in a bottom sheet. */
export function ActionSheet({ open, onClose, title, description, actions }: ActionSheetProps) {
  const { theme } = useTheme();
  return (
    <BottomSheet open={open} onClose={onClose} title={title} description={description} bodyStyle={styles.body}>
      {actions.map((action, index) => {
        const ink = action.tone === 'danger' ? theme.danger : action.selected ? theme.accentText : theme.ink;
        const Icon = action.icon;
        return (
          <Pressable
            key={action.key ?? `${action.label}-${index}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.disabled, selected: action.selected }}
            disabled={action.disabled}
            onPress={() => {
              onClose();
              action.onSelect();
            }}
            style={[styles.row, action.disabled ? styles.disabled : null]}
          >
            {({ pressed }) => (
              <>
                <PressOverlay pressed={pressed && !action.disabled} />
                {Icon ? <Icon size={20} color={ink} strokeWidth={1.9} /> : null}
                <View style={styles.copy}>
                  <AppText variant={action.selected ? 'bodySemibold' : 'bodyMedium'} style={{ color: ink }}>{action.label}</AppText>
                  {action.detail ? <AppText variant="caption" tone="ink2">{action.detail}</AppText> : null}
                </View>
                {action.selected ? <Check size={18} color={theme.accentText} strokeWidth={2.4} /> : null}
              </>
            )}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: spacing.lg + 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  disabled: {
    opacity: 0.5,
  },
});
