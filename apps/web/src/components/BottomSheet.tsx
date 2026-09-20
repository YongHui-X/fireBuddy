import { type ReactNode } from 'react';
import { X } from 'lucide-react';

import { useAccessibleDialog } from './useAccessibleDialog';

type BottomSheetProps = {
  isOpen: boolean;
  title: string;
  /** Optional line under the title, in secondary ink. Never an eyebrow above it. */
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra class on the panel, for per-sheet layout. */
  className?: string;
  /** Forest header strip. Used by navigation sheets; form sheets keep a white header. */
  tone?: 'paper' | 'forest';
};

/**
 * A sheet that rises from the bottom of a phone screen and sits as a centred dialog on wider ones.
 *
 * The geometry lives in CSS (`.bottom-sheet`), so a single component serves both without a media
 * query in JavaScript. Focus trapping, Escape and the body scroll lock all come from
 * `useAccessibleDialog`.
 */
export function BottomSheet({
  isOpen,
  title,
  description,
  onClose,
  children,
  className = '',
  tone = 'paper',
}: BottomSheetProps) {
  const sheetRef = useAccessibleDialog<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const labelId = `bottom-sheet-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      className="sheet-backdrop sheet-backdrop-bottom"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={`bottom-sheet bottom-sheet-${tone} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="bottom-sheet-header">
          <div>
            <h3 id={labelId}>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button quiet" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={18} />
          </button>
        </div>
        <div className="bottom-sheet-body">{children}</div>
      </div>
    </div>
  );
}
