import { useState } from 'react';
import { Link } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import type { AiPreference } from '@firebuddy/shared';

import { Doudou } from './Doudou';

type EmberConsentPanelProps = {
  onChoose: (preference: Exclude<AiPreference, 'off'>) => Promise<void> | void;
  /** Smaller layout for the quick-chat drawer. */
  compact?: boolean;
};

/** What each AI level sends, in the user's own words, as shown on the panel and on Profile. */
export const AI_LEVEL_COPY: Record<AiPreference, { title: string; summary: string }> = {
  off: {
    title: 'Off',
    summary: 'Doudou and category suggestions are switched off. Nothing is sent to the AI provider.',
  },
  guide: {
    title: 'Guide',
    summary: 'Your question goes to the AI provider with amounts and your account and position names removed, together with curated Singapore finance sources. Your FireBuddy records are never included.',
  },
  personalised: {
    title: 'Personalised',
    summary: 'As Guide, plus summary figures from your records such as net worth, monthly totals, savings rate, FIRE progress and top category totals. Every exact figure is replaced by a placeholder and a rough range before it leaves FireBuddy; our server restores the real figures in the answer. Transaction descriptions and individual records are never sent. Category autodetect also sends the typed description with amounts removed.',
  },
};

/**
 * The one-time choice shown in place of the composer while AI is off. Nothing is sent until a
 * level is chosen; the choice is recorded with a timestamp so consent can be shown and withdrawn.
 */
export function EmberConsentPanel({ onChoose, compact = false }: EmberConsentPanelProps) {
  const [busy, setBusy] = useState<Exclude<AiPreference, 'off'> | null>(null);

  async function choose(level: Exclude<AiPreference, 'off'>) {
    setBusy(level);
    try {
      await onChoose(level);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={`ember-consent ${compact ? 'ember-consent-compact' : ''}`.trim()} aria-labelledby="ember-consent-title">
      <div className="ember-consent-heading">
        <Doudou pose="shh" size={compact ? 52 : 76} />
        <div>
          <h3 id="ember-consent-title">Turn on Doudou</h3>
          <p>
            Doudou uses a third-party AI provider hosted outside Singapore. You choose how much it may see,
            and you can change this any time under Profile.
          </p>
        </div>
      </div>
      <div className="ember-consent-options">
        {(['guide', 'personalised'] as const).map((level) => (
          <article key={level} className="ember-consent-option">
            <strong>{AI_LEVEL_COPY[level].title}</strong>
            <p>{AI_LEVEL_COPY[level].summary}</p>
            <button
              className={level === 'personalised' ? 'primary-button' : 'secondary-button'}
              type="button"
              disabled={busy !== null}
              onClick={() => void choose(level)}
            >
              {busy === level ? 'Saving…' : `Use ${AI_LEVEL_COPY[level].title}`}
            </button>
          </article>
        ))}
      </div>
      <p className="ember-consent-footnote">
        <ShieldCheck size={14} aria-hidden="true" />
        <span>
          Requests are not used to train the provider's models. Read the <Link to="/privacy">privacy notice</Link> for the full picture.
        </span>
      </p>
    </section>
  );
}
