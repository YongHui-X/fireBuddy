import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

import { AppUtilityActions } from './AppUtilityActions';

export interface PageToolbarProps {
  title: string;
  description?: string;
  backAction?: () => void;
  leadingAction?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
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
  className = '',
}: PageToolbarProps) {
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
      <div className={`page-toolbar-actions ${actions ? '' : 'page-toolbar-actions-utilities-only'}`.trim()}>
        {actions}
        <AppUtilityActions className="app-utility-actions-toolbar" />
      </div>
    </header>
  );
}
