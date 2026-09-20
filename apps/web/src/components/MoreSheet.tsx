import { useEffect, type ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router';
import { ChevronRight, LogOut } from 'lucide-react';

import { BottomSheet } from './BottomSheet';

export type MoreSheetItem = {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** Small pill after the label, e.g. Ember's AI marker. */
  indicator?: string;
};

type MoreSheetProps = {
  isOpen: boolean;
  items: readonly MoreSheetItem[];
  onClose: () => void;
  onLogout: () => void;
};

/**
 * The phone route to everything that is not one of the four tabs.
 *
 * This replaces a native `<details>` menu, which gave seven destinations no focus management, no
 * Escape, and 40px rows. It also carries Log out, which previously lived only in the desktop
 * sidebar and so was unreachable on a phone.
 */
export function MoreSheet({ isOpen, items, onClose, onLogout }: MoreSheetProps) {
  const location = useLocation();

  // Following a link inside the sheet should leave the sheet behind.
  useEffect(() => {
    if (isOpen) onClose();
    // Only the path matters here; re-running when onClose changes identity would close it instantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <BottomSheet isOpen={isOpen} title="More" onClose={onClose} tone="forest" className="more-sheet">
      <nav aria-label="More FireBuddy pages">
        {items.map(({ path, label, icon: Icon, indicator }) => (
          <NavLink key={path} to={path} className="more-sheet-row">
            <Icon size={20} strokeWidth={1.8} />
            <span className="more-sheet-label">{label}</span>
            {indicator ? (
              <span className="nav-ai-indicator" aria-hidden="true">
                {indicator}
              </span>
            ) : null}
            <ChevronRight size={18} strokeWidth={1.8} className="more-sheet-chevron" aria-hidden="true" />
          </NavLink>
        ))}
      </nav>
      <div className="more-sheet-divider" role="presentation" />
      <button type="button" className="more-sheet-row more-sheet-logout" onClick={onLogout}>
        <LogOut size={20} strokeWidth={1.8} />
        <span className="more-sheet-label">Log out</span>
      </button>
    </BottomSheet>
  );
}
