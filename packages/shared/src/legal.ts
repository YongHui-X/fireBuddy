/**
 * Terms of use and privacy policy for the phone app (owner, 8 Oct 2026). The phone keeps every
 * record on the device, so this copy differs from the web's `/terms` and `/privacy`, which
 * describe cloud storage. Keep it in step with `docs/PRIVACY.md` and the DouDou consent text.
 * Starter copy written to common app practice; it still needs a legal review before public launch.
 */

/** Single inbox for support and data protection requests. */
export const LEGAL_CONTACT_EMAIL = 'firebuddyapp@gmail.com';

/**
 * Bump when either document changes in a way users should be told about. A phone that accepted an
 * older version is shown the "we've updated" notice once.
 */
export const LEGAL_VERSION = '2026-10-08';
export const LEGAL_LAST_UPDATED = '8 October 2026';

export type LegalDocumentId = 'terms' | 'privacy';

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  introduction: string;
  /** Short plain-language points shown above the full text. */
  highlights: readonly string[];
  sections: readonly LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  id: 'privacy',
  title: 'Privacy policy',
  introduction:
    'Your privacy comes first. FireBuddy is built so your money records stay with you. This policy explains what stays on your phone, the little that can leave it, and your choices under Singapore’s Personal Data Protection Act 2012 (PDPA).',
  highlights: [
    'Your transactions, balances, plans and backups stay on this phone. We never keep a copy.',
    'There is no account, no sign-in, no ads, no trackers and no analytics.',
    'DouDou, the AI guide, is off until you turn it on. When on, it sends only what a question needs, with exact figures and your names replaced first.',
    'We never sell your information, and nothing you send is used to train AI.',
    'Turn DouDou off or delete all your data at any time from Profile.',
  ],
  sections: [
    {
      // PDPA s11(3): the DPO's business contact must be public. The owner is the DPO (8 Oct 2026).
      heading: 'Who we are and our Data Protection Officer',
      body: `FireBuddy is an independent personal finance app operated from Singapore. Our Data Protection Officer is responsible for making sure FireBuddy follows the PDPA. For support, questions about this policy, or any request to access, correct or withdraw consent for your personal data, email the Data Protection Officer at ${LEGAL_CONTACT_EMAIL}. We aim to reply within 30 days.`,
    },
    {
      heading: 'What stays on your phone',
      body: 'Everything you enter: transactions, categories, accounts, tags, budgets, wealth positions and their values, contributions, your FIRE plan, recurring transactions, your nickname, country and currency, your settings, and your DouDou chats. It is saved in the app’s private storage on this device and is never uploaded to FireBuddy. Because we hold no copy, we cannot see it, recover it or hand it to anyone.',
    },
    {
      heading: 'What we do not collect',
      body: 'No email, phone number or password, no bank logins, no contacts, no location, no photos, no advertising identifiers, no analytics and no crash reports.',
    },
    {
      heading: 'When DouDou is on',
      body: 'DouDou is optional and stays off until you choose to turn it on. When you ask a question, the app first removes amounts and the names you have given your accounts, holdings and categories. If the question is about your own finances, the app adds only the parts of your summary that question needs, such as this month’s spending totals, with every exact figure replaced by a placeholder and a rough range. Transaction descriptions and individual records are never sent. Your phone puts the real figures back into the answer, so they never leave it. If you have no records for what you asked about, DouDou tells you so on the phone and nothing is sent.',
    },
    {
      heading: 'What our server keeps',
      body: 'Turning DouDou on creates a random anonymous ID with no name or email, so the service can limit how many questions each phone asks. Our server keeps that ID, the time you turned DouDou on, and a one-way fingerprint (hash) of each question for abuse prevention. It never stores the text of your questions, DouDou’s answers or your figures.',
    },
    {
      heading: 'AI provider and overseas transfer',
      body: 'DouDou’s answers are written by OpenAI, whose servers are outside Singapore. OpenAI receives only the scrubbed and masked text described above. Under its API terms it does not use this data to train its models, and it may keep requests for up to 30 days to monitor for abuse before deleting them. Our hosting, sign-in and AI providers act as data intermediaries and are required to protect data to a standard comparable to the PDPA.',
    },
    {
      heading: 'Backups and reminders',
      body: 'A backup file is encrypted on your phone with a passphrase only you know, and saved wherever you choose. We cannot open it or reset the passphrase. The optional 9pm reminder is scheduled on your phone and needs no server.',
    },
    {
      heading: 'How long data is kept',
      body: 'Records on your phone stay until you delete them, use Delete all my data in Profile, or uninstall the app. Turning DouDou off withdraws your consent at once and deletes the anonymous ID from our server; if that fails, the app retries the next time it opens.',
    },
    {
      heading: 'Your rights',
      body: 'You can see and correct your records in the app at any time, and save a copy with a backup or CSV export. You can withdraw consent for AI processing by turning DouDou off. You can delete everything with Delete all my data in Profile, or by uninstalling. If you believe we have not handled your personal data properly, contact us first; you may also complain to the Personal Data Protection Commission of Singapore.',
    },
    {
      heading: 'Security',
      body: 'Data in transit is encrypted, and only our backend can read the anonymous ID. Your phone’s own lock screen protects the records on it, so keep it locked and up to date. No system can promise perfect security.',
    },
    {
      heading: 'Children',
      body: 'FireBuddy is meant for people aged 18 and over. We do not knowingly collect personal data from children.',
    },
    {
      heading: 'Changes to this policy',
      body: 'When we change this policy we update the date above, and the app tells you about material changes before you carry on. A change that sends more of your data to AI will ask for your choice again.',
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  id: 'terms',
  title: 'Terms of use',
  introduction:
    'These terms are an agreement between you and FireBuddy for using the app. By continuing past the welcome screen or using FireBuddy, you agree to them. Please read them with our Privacy policy.',
  highlights: [
    'FireBuddy helps you track money and learn. It is not financial advice.',
    'Your records live on your phone, so keeping backups is up to you.',
    'DouDou can be wrong. Check important decisions with official sources or a licensed adviser.',
    'FireBuddy is in early testing and features may change.',
  ],
  sections: [
    {
      heading: 'Who can use FireBuddy',
      body: 'You must be at least 18 years old, or use FireBuddy with the permission of a parent or guardian. You may use it for your own personal, non-commercial purposes.',
    },
    {
      heading: 'Not financial advice',
      body: 'FireBuddy, DouDou and the FIRE Planner give general information and estimates for education only. They are not financial, investment, tax, insurance or legal advice, and they do not take into account your full financial situation or needs. FireBuddy is not licensed by the Monetary Authority of Singapore to give financial advice. Before acting on anything, check official sources such as CPF Board, IRAS and MoneySense, or speak to a licensed financial adviser.',
    },
    {
      heading: 'Estimates and AI answers',
      body: 'Projections depend on the assumptions you enter, and real returns, inflation, rules and rates change. DouDou’s answers are generated by AI and may be incomplete, out of date or wrong. You are responsible for the decisions you make.',
    },
    {
      heading: 'Your records and backups',
      body: 'Your records are stored only on your device. If you lose, reset or replace your phone, or uninstall the app, they are gone unless you saved a backup. We cannot recover them or a forgotten backup passphrase.',
    },
    {
      heading: 'Acceptable use',
      body: 'Do not misuse FireBuddy or DouDou: no attempts to break, overload or reverse engineer the service, get around its limits, access other people’s data, or use it for anything unlawful. We may limit or block DouDou for a device that does.',
    },
    {
      heading: 'Early access and changes',
      body: 'FireBuddy is under active development. Features, including DouDou, may change, pause or end, and the service may be unavailable at times. FireBuddy never moves money; recurring transactions only add records on your phone.',
    },
    {
      heading: 'Ownership',
      body: 'The FireBuddy app, its design, its name and the DouDou character belong to FireBuddy. Your records belong to you.',
    },
    {
      heading: 'Third-party services',
      body: 'DouDou relies on third-party providers, including OpenAI, and your app store’s own terms also apply. We are not responsible for services we do not control.',
    },
    {
      heading: 'No warranty and limits of liability',
      body: 'FireBuddy is provided "as is", without warranties of any kind, to the extent the law allows. To the extent the law allows, FireBuddy is not liable for any loss of data, money or profit, or for any indirect or consequential loss, arising from your use of the app. Nothing in these terms limits liability that cannot be limited by law.',
    },
    {
      heading: 'Ending use',
      body: 'You can stop using FireBuddy at any time by uninstalling it. We may suspend DouDou or withdraw the app if we need to, for example for security or legal reasons.',
    },
    {
      heading: 'Changes to these terms',
      body: 'We may update these terms. The date above shows the latest version, and the app tells you about material changes. Continuing to use FireBuddy after that means you accept the updated terms.',
    },
    {
      heading: 'Governing law and contact',
      body: `These terms are governed by the laws of Singapore, and the courts of Singapore have jurisdiction. Questions: ${LEGAL_CONTACT_EMAIL}.`,
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  terms: TERMS_OF_USE,
  privacy: PRIVACY_POLICY,
};

export function isLegalDocumentId(value: unknown): value is LegalDocumentId {
  return value === 'terms' || value === 'privacy';
}

/**
 * Whether a welcomed phone must see the "we've updated our terms" notice: it finished the welcome
 * but accepted an older version, or none (installs from before the terms existed).
 */
export function needsLegalNotice({ welcomedAt, acceptedVersion }: { welcomedAt: string | null; acceptedVersion: string | null }): boolean {
  return Boolean(welcomedAt) && acceptedVersion !== LEGAL_VERSION;
}
