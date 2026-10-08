import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Exact column width for a wrapping grid, measured from the grid itself. Percentage widths with
 * `flexGrow` let a lone card on the last row stretch across the screen; a fixed width keeps every
 * card the same size. Returns undefined until the first layout pass.
 */
export function useGridItemWidth(columns: number, gap: number) {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const available = event.nativeEvent.layout.width;
      setWidth(Math.floor((available - gap * (columns - 1)) / columns));
    },
    [columns, gap],
  );
  return { itemWidth: width, onLayout };
}
