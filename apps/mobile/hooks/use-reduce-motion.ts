import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The phone's live "reduce motion" setting. Reanimated's own hook reads it once at startup,
 * so this one also listens for changes made in the settings while the app is open.
 */
export function useReduceMotion() {
  // Start still and move only once the phone confirms motion is allowed.
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduce(value); }).catch(() => { if (active) setReduce(false); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}
