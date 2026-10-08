import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

/**
 * Space to leave at the bottom for the Android keyboard. With edge-to-edge drawing, Android (and
 * Expo Go in particular) often does not shrink the window when the keyboard opens, so a composer
 * pinned to the bottom ends up behind it. This measures the keyboard and subtracts whatever the
 * window did shrink, so it never double-counts. iOS returns 0; use KeyboardAvoidingView there.
 */
export function useKeyboardInset() {
  const { height } = useWindowDimensions();
  const [baseline, setBaseline] = useState(height);
  const [keyboard, setKeyboard] = useState(0);

  // Track the full window height while the keyboard is closed, so a later shrink can be measured.
  if (keyboard === 0 && height > baseline) setBaseline(height);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboard(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const resizedBy = Math.max(0, baseline - height);
  return Math.max(0, keyboard - resizedBy);
}
