import { X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { IconButton } from './IconButton';
import { AppText } from './Text';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Forest header for navigation sheets (the More menu); paper for everything else. */
  tone?: 'paper' | 'forest';
  /** Sticky footer that stays above the keyboard and the home indicator. */
  footer?: ReactNode;
  /** Set when the body renders its own scroll container. */
  scroll?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  /** Fraction of the window the sheet may grow to. */
  maxHeightRatio?: number;
  /** Disables backdrop and back-button dismissal while a save is in flight. */
  dismissable?: boolean;
  children: ReactNode;
}

const DURATION = 220;

/**
 * Every modal surface on a phone arrives from the bottom edge. Built on the native Modal so the
 * Android back button, the translucent status and navigation bars, and the keyboard all behave.
 * Safe-area insets are read here, outside the Modal subtree, because inside it Android reports 0.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  tone = 'paper',
  footer,
  scroll = true,
  bodyStyle,
  maxHeightRatio = 0.92,
  dismissable = true,
  children,
}: BottomSheetProps) {
  const { theme, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  // A native Modal on Android ignores `softwareKeyboardLayoutMode`, so the sheet lifts itself by
  // the keyboard's height; iOS is handled by the KeyboardAvoidingView below.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardInset(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: DURATION - 40, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [open, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight * 0.35, 0] });
  const requestClose = () => {
    if (dismissable) onClose();
  };
  const headerBg = tone === 'forest' ? theme.railBg : theme.surface;
  const headerInk = tone === 'forest' ? theme.railInk : theme.ink;
  const headerMuted = tone === 'forest' ? theme.railInkMuted : theme.ink2;
  const handleColor = tone === 'forest' ? 'rgba(255,255,255,0.35)' : theme.lineStrong;
  const bottomPad = keyboardInset > 0 ? spacing.md : Math.max(insets.bottom, spacing.lg);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
      supportedOrientations={['portrait']}
    >
      <View style={[styles.root, { paddingBottom: keyboardInset }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backdrop, opacity: progress }]}>
          <Pressable accessibilityLabel="Close" accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoider} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              shadows.lg,
              {
                backgroundColor: theme.surface,
                borderColor: theme.line,
                maxHeight: windowHeight * maxHeightRatio - insets.top - keyboardInset,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: tone === 'forest' ? theme.railLine : theme.line }]}>
              <View style={[styles.handle, { backgroundColor: handleColor }]} />
              {title ? (
                <View style={styles.headerRow}>
                  <View style={styles.headerCopy}>
                    <AppText variant="sheetTitle" style={{ color: headerInk }} accessibilityRole="header">{title}</AppText>
                    {description ? <AppText variant="caption" style={[styles.description, { color: headerMuted }]}>{description}</AppText> : null}
                  </View>
                  <IconButton icon={X} accessibilityLabel="Close" onPress={requestClose} tone={tone === 'forest' ? 'rail' : 'quiet'} style={styles.close} />
                </View>
              ) : null}
            </View>
            {scroll ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.body, { paddingBottom: footer ? spacing.lg : bottomPad }, bodyStyle]}
                bounces={false}
                overScrollMode="never"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.body, styles.bodyStatic, { paddingBottom: footer ? spacing.lg : bottomPad }, bodyStyle]}>{children}</View>
            )}
            {footer ? (
              <View style={[styles.footer, { paddingBottom: bottomPad, borderTopColor: theme.line, backgroundColor: theme.surface }]}>{footer}</View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.drawer,
    borderTopRightRadius: radii.drawer,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    borderTopLeftRadius: radii.drawer,
    borderTopRightRadius: radii.drawer,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingLeft: spacing.lg + 2,
    paddingRight: spacing.sm,
    paddingTop: spacing.xs,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 6,
  },
  description: {
    marginTop: 4,
  },
  close: {
    marginTop: -4,
  },
  body: {
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.lg,
  },
  bodyStatic: {
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg + 2,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
