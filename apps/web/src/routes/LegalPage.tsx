import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

import AuthShell from './AuthShell';

interface LegalPageProps {
  kind: 'terms' | 'privacy';
}

/** Single inbox for support and data protection requests. */
export const PRIVACY_CONTACT_EMAIL = 'firebuddyapp@gmail.com';
export const LEGAL_LAST_UPDATED = '3 October 2026';

const legalContent = {
  terms: {
    title: 'Terms of use',
    introduction: 'These starter terms describe the intended use of FireBuddy while the product is being prepared for public release.',
    sections: [
      ['Educational purpose', 'FireBuddy provides personal finance tracking and educational information. It does not provide regulated financial, investment, tax, or legal advice.'],
      ['Your account', 'Keep your sign in details secure and provide accurate information when using FireBuddy. You are responsible for activity performed through your account.'],
      ['Acceptable use', 'Do not misuse the service, attempt to access another person’s information, interfere with the app, or use FireBuddy for unlawful activity.'],
      ['Service availability', 'Features may change, pause, or be withdrawn while FireBuddy is under active development. You can download a copy of your data at any time from Profile, and keeping independent records of important information is recommended.'],
      ['Limitations', 'Financial outcomes depend on personal circumstances and changing market or policy conditions. Verify important decisions with qualified professionals and official sources.'],
    ],
  },
  privacy: {
    title: 'Privacy notice',
    introduction: 'This notice explains, in plain terms, what FireBuddy collects, why, where it goes, and the choices you have under Singapore’s Personal Data Protection Act (PDPA).',
    sections: [
      ['Who we are and how to contact us', `FireBuddy is an independent personal finance app operated from Singapore. For support, questions about this notice, or any request about your personal data, email ${PRIVACY_CONTACT_EMAIL}. We reply within 30 days.`],
      ['What we collect', 'Your sign in identity: your email address, and your name and email if you sign in with Google. The records you enter yourself: accounts, categories, transactions, tags, wealth positions and their dated values, contributions, essential spending choices, and your FIRE plan. Your AI setting and the time you chose it. We do not collect bank credentials, contacts, location, device identifiers, or advertising data, and there are no trackers.'],
      ['Why we use it', 'To sign you in, keep your records, show your dashboard and projections, and answer questions you ask Doudou. We do not sell, rent, or share your information for advertising, and we do not use it for any purpose other than running FireBuddy for you.'],
      ['AI features and your choice', 'Doudou, the finance guide, and category autodetect are optional and off until you turn them on under Profile. Guide sends only your question, with amounts and your account and position names removed, to our AI provider. Personalised also sends a summary of your figures, such as net worth, monthly totals, savings rate, FIRE progress and top category totals, with every exact figure replaced by a placeholder and a rough range before it leaves FireBuddy; our own server puts the real figures back into the answer. Transaction descriptions and individual records are never sent to the provider. You can switch to Off at any time, which withdraws your consent for further AI processing.'],
      ['Where your data is stored and transferred', 'Your records are stored in a secure cloud database operated by a third-party provider, with access restricted to our backend. The AI provider we use is OpenAI, whose servers are outside Singapore; it receives only the masked text described above, under terms that prohibit using it to train models. Hosting, authentication and AI providers act as our data intermediaries and may process data outside Singapore under protections comparable to the PDPA.'],
      ['How long we keep it', 'We keep your records until you delete them or your account. Doudou conversation history is stored in your browser, not on our servers. Server logs record that a request happened, never the question itself or your figures.'],
      ['Your rights', 'You can download everything we hold about you from Profile at any time. You can correct your records in the app. You can withdraw consent for AI processing by switching it to Off. You can delete your account from Profile, which removes your records and your sign in. If you believe we have not handled your data properly, you can contact us or lodge a complaint with the Personal Data Protection Commission of Singapore.'],
      ['Security', 'Your data is protected by authenticated access, row level security on the database, and encrypted connections. No internet service can guarantee absolute security, so avoid entering information a feature does not need.'],
      ['Changes to this notice', 'We will update this page and its date when our practices change. Material changes to how AI features use your data will ask for your choice again.'],
    ],
  },
} as const;

// Renders concise, clearly marked starter legal copy without implying formal legal review.
function LegalPage({ kind }: LegalPageProps) {
  const content = legalContent[kind];

  return (
    <AuthShell panelClassName="auth-legal-panel">
      <Link className="legal-back-link" to="/">
        <ArrowLeft size={17} aria-hidden="true" />
        Back to FireBuddy
      </Link>

      <header className="legal-heading">
        <p className="legal-draft-label">Draft for review before production</p>
        <h1>{content.title}</h1>
        <p>{content.introduction}</p>
        <span>Last updated: {LEGAL_LAST_UPDATED}</span>
      </header>

      <div className="legal-sections">
        {content.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </AuthShell>
  );
}

export default LegalPage;
