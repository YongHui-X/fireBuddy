import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

import AuthShell from './AuthShell';

interface LegalPageProps {
  kind: 'terms' | 'privacy';
}

const legalContent = {
  terms: {
    title: 'Terms of use',
    introduction: 'These starter terms describe the intended use of FireBuddy while the product is being prepared for public release.',
    sections: [
      ['Educational purpose', 'FireBuddy provides personal finance tracking and educational information. It does not provide regulated financial, investment, tax, or legal advice.'],
      ['Your account', 'Keep your sign in details secure and provide accurate information when using FireBuddy. You are responsible for activity performed through your account.'],
      ['Acceptable use', 'Do not misuse the service, attempt to access another person’s information, interfere with the app, or use FireBuddy for unlawful activity.'],
      ['Service availability', 'Features may change, pause, or be withdrawn while FireBuddy is under active development. Data exports and independent records are recommended for important information.'],
      ['Limitations', 'Financial outcomes depend on personal circumstances and changing market or policy conditions. Verify important decisions with qualified professionals and official sources.'],
    ],
  },
  privacy: {
    title: 'Privacy notice',
    introduction: 'This starter notice explains the main information FireBuddy handles and how it supports the current application experience.',
    sections: [
      ['Information handled', 'FireBuddy handles account identifiers, authentication details managed by Supabase, and the financial records you choose to enter, such as accounts, categories, and transactions.'],
      ['How information is used', 'Information is used to authenticate you, provide the app, synchronise your records, improve reliability, and return features that you explicitly request.'],
      ['AI features', 'Text submitted to optional AI category suggestions or Ember may be processed by configured AI services. Ember conversation history is stored locally in your browser unless the product states otherwise.'],
      ['Storage and security', 'FireBuddy uses Supabase authentication and protected application APIs. No internet service can guarantee absolute security, so avoid entering information the feature does not need.'],
      ['Your choices', 'You can control the information you enter, sign out of your account, and clear browser-local FireBuddy data through your browser settings. Additional account controls will be documented before production.'],
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
        <span>Last updated: 16 August 2026</span>
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
