import type { EmberMessage, EmberSource } from './emberState';

export const EMBER_STARTER_QUESTIONS = [
  'What are the CPF contribution rates for 2026, and how do they vary by age?',
  'How do the Basic, Full, and Enhanced Retirement Sums differ?',
  'How do Singapore Savings Bonds work, and what should I understand before applying?',
  'What should a Singapore FIRE plan consider before age 55?',
] as const;

type SuggestionTopic = {
  keywords: string[];
  sourceKeywords: string[];
  questions: string[];
};

const TOPICS: SuggestionTopic[] = [
  {
    keywords: ['cpf contribution', 'contribution rate', 'cpf rate', 'ordinary account', 'special account', 'medisave'],
    sourceKeywords: ['cpf contribution', 'cpf board', 'cpf allocation'],
    questions: [
      'How are CPF contributions allocated across my CPF accounts?',
      'Which CPF contribution limits should I understand?',
    ],
  },
  {
    keywords: ['retirement sum', 'brs', 'frs', 'ers', 'cpf life', 'retirement account'],
    sourceKeywords: ['retirement sum', 'cpf life', 'retirement account'],
    questions: [
      'How does my chosen retirement sum affect CPF LIFE payouts?',
      'When and how is the CPF Retirement Account created?',
    ],
  },
  {
    keywords: ['cpfis', 'cpf investment', 'invest cpf'],
    sourceKeywords: ['cpfis', 'cpf investment scheme'],
    questions: [
      'What can I invest in through CPFIS, and what are the main risks?',
      'How should I compare leaving CPF savings untouched with using CPFIS?',
    ],
  },
  {
    keywords: ['ssb', 'savings bond', 'singapore savings bond'],
    sourceKeywords: ['singapore savings bond', 'mas ssb', 'savings bonds'],
    questions: [
      'How do SSB interest steps and early redemption work?',
      'How should I compare SSBs with fixed deposits and Treasury bills?',
    ],
  },
  {
    keywords: ['iras', 'tax relief', 'income tax', 'srs relief'],
    sourceKeywords: ['iras', 'tax relief', 'individual income tax'],
    questions: [
      'Which common IRAS relief eligibility rules should I check?',
      'How do CPF and SRS tax relief limits interact?',
    ],
  },
  {
    keywords: ['moneysense', 'financial planning', 'emergency fund', 'budget'],
    sourceKeywords: ['moneysense', 'basic financial planning guide'],
    questions: [
      'What does MoneySense recommend for building an emergency fund?',
      'Which protection and savings priorities should come first?',
    ],
  },
  {
    keywords: ['investing', 'investment', 'etf', 'index fund', 'diversification', 'portfolio'],
    sourceKeywords: ['investing', 'investment', 'mas investor'],
    questions: [
      'What should a Singapore investor check before choosing an ETF?',
      'How can diversification reduce concentration risk?',
    ],
  },
  {
    keywords: ['fire', 'financial independence', 'safe withdrawal', 'retire early'],
    sourceKeywords: ['fire planning', 'financial independence', 'retirement planning'],
    questions: [
      'How should CPF be reflected in a Singapore FIRE plan?',
      'Which assumptions should I stress test in a FIRE plan?',
    ],
  },
];

function normalizeQuestion(value: string): string {
  return value.toLocaleLowerCase('en-SG').replace(/[^a-z0-9]+/g, ' ').trim();
}

function countMatches(content: string, keywords: readonly string[]): number {
  return keywords.reduce((total, keyword) => total + (content.includes(keyword) ? 1 : 0), 0);
}

/** Return up to three relevant, unasked follow ups using deterministic topic scores. */
export function getEmberSuggestedQuestions({
  question,
  history,
  sources,
}: {
  question: string;
  history: readonly EmberMessage[];
  sources: readonly EmberSource[];
}): string[] {
  const normalizedQuestion = normalizeQuestion(question);
  const sourceContent = normalizeQuestion(sources
    .flatMap((source) => [source.title, source.headline ?? '', source.path ?? '', source.url ?? ''])
    .join(' '));
  const askedQuestions = new Set(history
    .filter((message) => message.role === 'user')
    .map((message) => normalizeQuestion(message.content)));

  const rankedTopics = TOPICS
    .map((topic, index) => ({
      topic,
      index,
      score: (countMatches(normalizedQuestion, topic.keywords) * 3)
        + (countMatches(sourceContent, topic.sourceKeywords) * 2),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const candidates = rankedTopics.flatMap(({ topic }) => topic.questions);
  const fallbacks = [...EMBER_STARTER_QUESTIONS];

  return [...candidates, ...fallbacks]
    .filter((candidate, index, allCandidates) => allCandidates.indexOf(candidate) === index)
    .filter((candidate) => !askedQuestions.has(normalizeQuestion(candidate)))
    .slice(0, 3);
}
