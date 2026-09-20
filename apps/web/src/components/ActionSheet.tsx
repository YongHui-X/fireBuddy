import { type ComponentType } from 'react';

import { BottomSheet } from './BottomSheet';

export type SheetAction = {
  label: string;
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
  onSelect: () => void;
  /** Destructive actions are set apart in expense red and placed last. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
};

type ActionSheetProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  actions: readonly SheetAction[];
  onClose: () => void;
};

/**
 * A list of actions presented as a bottom sheet.
 *
 * This is the touch counterpart to the desktop row popover. Deliberately `role="dialog"` with
 * plain buttons rather than `role="menu"`: a full-width sheet announced as a menu reads wrongly
 * in TalkBack, which expects a menu to be a compact popup.
 */
export function ActionSheet({ isOpen, title, description, actions, onClose }: ActionSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} title={title} description={description} onClose={onClose} className="action-sheet">
      {actions.map(({ label, icon: Icon, onSelect, tone = 'default', disabled }) => (
        <button
          key={label}
          type="button"
          className={`action-sheet-row ${tone === 'danger' ? 'action-sheet-row-danger' : ''}`.trim()}
          disabled={disabled}
          onClick={() => {
            onClose();
            onSelect();
          }}
        >
          {Icon ? <Icon size={19} strokeWidth={1.8} /> : null}
          <span>{label}</span>
        </button>
      ))}
    </BottomSheet>
  );
}
