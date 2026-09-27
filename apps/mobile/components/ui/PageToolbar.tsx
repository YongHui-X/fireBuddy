import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/tokens';

import { IconButton } from './IconButton';
import { AppText } from './Text';

export interface PageToolbarProps {
  title: string;
  description?: string;
  /** Renders the leading back chevron. */
  onBack?: () => void;
  /** A small label under the copy, e.g. the "Local demo data" pill. */
  metadata?: ReactNode;
  /** Controls placed under the copy on phones, never lime on a tab screen. */
  actions?: ReactNode;
  /** A trailing control on the title row, such as an overflow menu. */
  trailing?: ReactNode;
  variant?: 'page' | 'greeting';
  style?: StyleProp<ViewStyle>;
}

/** Route heading: a display title with the context in secondary ink beneath it, like the web `.page-toolbar`. */
export function PageToolbar({ title, description, onBack, metadata, actions, trailing, variant = 'page', style }: PageToolbarProps) {
  return (
    <View style={[styles.toolbar, style]}>
      <View style={styles.leading}>
        {onBack ? (
          <IconButton icon={ChevronLeft} accessibilityLabel="Go back" onPress={onBack} iconSize={22} style={styles.back} />
        ) : null}
        <View style={styles.copy}>
          <AppText variant={variant === 'greeting' ? 'greeting' : 'pageTitle'} accessibilityRole="header">
            {title}
          </AppText>
          {description ? (
            <AppText variant="bodySmall" tone="ink2" style={styles.description}>
              {description}
            </AppText>
          ) : null}
          {metadata ? <View style={styles.metadata}>{metadata}</View> : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  back: {
    marginLeft: -12,
    marginTop: -10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    marginTop: 5,
    maxWidth: 420,
  },
  metadata: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },
  trailing: {
    marginTop: -10,
    marginRight: -12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
