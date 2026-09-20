import { useState, type ReactNode } from 'react';
import { ArrowLeft, Ellipsis } from 'lucide-react';

import { AppUtilityActions } from './AppUtilityActions';
import { ActionSheet, type SheetAction } from './ActionSheet';
import { mq } from '../app/breakpoints';
import { useMediaQuery } from '../app/useMediaQuery';

export interface PageToolbarProps {
  title: string;
  description?: string;
  backAction?: () => void;
  leadingAction?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  /**
   * Secondary actions for phones. Below 768px these replace `actions` behind a single overflow
   * button, which keeps a toolbar from eating the top third of a small screen.
   */
  overflowActions?: readonly SheetAction[];
  className?: string;
}

/** Give every route one compact, accessible heading and action pattern. */
export function PageToolbar({
  title,
  description,
  backAction,
  leadingAction,
  metadata,
  actions,
  overflowActions,
  className = '',
}: PageToolbarProps) {
  const isWide = useMediaQuery(mq.lg);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const useOverflow = !isWide && Boolean(overflowActions?.length);

  return (
    <header className={`page-toolbar ${className}`.trim()}>
      <div className="page-toolbar-leading">
        {leadingAction}
        {backAction ? (
          <button className="icon-button quiet" type="button" onClick={backAction} aria-label="Back">
            <ArrowLeft size={19} strokeWidth={1.9} />
          </button>
        ) : null}
        <div className="page-toolbar-copy">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {metadata ? <div className="page-toolbar-metadata">{metadata}</div> : null}
      <div className={`page-toolbar-actions ${actions || useOverflow ? '' : 'page-toolbar-actions-utilities-only'}`.trim()}>
        {useOverflow ? (
          <button
            type="button"
            className="icon-button quiet page-toolbar-overflow"
            onClick={() => setIsOverflowOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isOverflowOpen}
            aria-label={`More ${title} actions`}
          >
            <Ellipsis size={19} strokeWidth={1.9} />
          </button>
        ) : (
          actions
        )}
        <AppUtilityActions className="app-utility-actions-toolbar" />
      </div>
      {useOverflow ? (
        <ActionSheet
          isOpen={isOverflowOpen}
          title={title}
          actions={overflowActions ?? []}
          onClose={() => setIsOverflowOpen(false)}
        />
      ) : null}
    </header>
  );
}
