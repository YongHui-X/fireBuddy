/**
 * DouDou mobile evaluation: asks the real local backend the same way the phone does and checks
 * the answers against the phone's own figures.
 *
 * It copies apps/mobile/hooks/use-ember.ts `prepareRequest` step for step: the demo dataset the
 * app seeds on first launch, the device-built snapshot, per-question section selection, client
 * masking with whole dollars, and unmasking of the answer. Data checks are deterministic; source
 * accuracy is judged separately against apps/backend/rag/knowledge-base.
 *
 * Needs local Supabase (npx supabase start) and the backend (npm run dev:backend). Run from the
 * repo root:
 *   npx tsx apps/backend/rag/evaluation/mobile/run_doudou_eval.ts            # run every case
 *   npx tsx apps/backend/rag/evaluation/mobile/run_doudou_eval.ts --truth    # only write ground truth
 *   npx tsx apps/backend/rag/evaluation/mobile/run_doudou_eval.ts --only id1,id2
 * Options: --today YYYY-MM-DD (default: today), --api http://127.0.0.1:8000, --label v1
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_MASKED_CONTEXT_CHARS,
  MaskingSession,
  apiRoutes,
  buildPersonalSnapshot,
  createDemoRetirementPlan,
  createDemoTransactions,
  createDemoWealth,
  demoAccounts,
  demoCategories,
  demoCategoryIds,
  formatMaskedMoney,
  getDeviceDateKey,
  scopeSnapshotFacts,
  requestedSpendingMonths,
  selectSnapshotSectionsForTurn,
  type RagChatRequest,
  type RagChatResponse,
} from '../../../../../packages/shared/src/index';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const todayKey = option('today') ?? getDeviceDateKey();
const apiBase = (option('api') ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const label = option('label') ?? 'latest';
const only = option('only')?.split(',').map((id) => id.trim()).filter(Boolean);
/** Case file in this folder; doudou_cases.json is the tuning set, doudou_cases_fresh.json the held-out set. */
const casesFile = option('cases') ?? 'doudou_cases.json';

/** The records the app seeds on first launch (apps/mobile/lib/fire-buddy-store.tsx `seedState`). */
function seedRecords() {
  const wealth = createDemoWealth(todayKey);
  return {
    categories: [...demoCategories],
    accounts: [...demoAccounts],
    transactions: createDemoTransactions(todayKey),
    positions: wealth.positions,
    snapshots: wealth.snapshots,
    contributions: wealth.contributions,
    retirementPlan: createDemoRetirementPlan(todayKey),
    essentialCategoryIds: [demoCategoryIds.food, demoCategoryIds.utilities, demoCategoryIds.health],
  };
}

const store = seedRecords();
const snapshotInput = {
  todayKey,
  transactions: store.transactions,
  categories: store.categories,
  positions: store.positions,
  snapshots: store.snapshots,
  contributions: store.contributions,
  retirementPlan: store.retirementPlan,
  essentialCategoryIds: store.essentialCategoryIds,
};
const snapshot = buildPersonalSnapshot(snapshotInput);

/** Same as use-ember.ts prepareRequest, minus React. */
function prepareRequest(question: string, history: RagChatRequest['history'] = []) {
  const session = new MaskingSession({
    accounts: store.accounts.map((account) => account.name),
    positions: store.positions.map((position) => position.name),
    customCategories: store.categories.filter((category) => !category.isDefault).map((category) => category.name),
  }, { wholeDollars: true });
  const request: RagChatRequest = {
    question: session.scrubQuestion(question),
    history: session.scrubHistory(history),
    appContext: { currentPage: 'DouDou', currentPath: '/ember', recentActions: [] },
    clientMasked: true,
  };
  let usedSections = selectSnapshotSectionsForTurn(request.question, request.history);
  // The unmasked facts this question's answer is checked against, including any named months.
  let caseFacts: Record<string, unknown> = snapshot.facts;
  if (usedSections.length > 0) {
    const months = usedSections.includes('spending') ? requestedSpendingMonths(request.question, todayKey) : [];
    if (months.length) caseFacts = buildPersonalSnapshot({ ...snapshotInput, extraSpendingMonths: months }).facts;
    const scoped = scopeSnapshotFacts(caseFacts, usedSections);
    const facts = scoped ? session.maskFacts(scoped) : null;
    if (facts && JSON.stringify(facts).length <= MAX_MASKED_CONTEXT_CHARS) {
      request.clientSnapshot = { effectiveDate: snapshot.effectiveDate, facts };
    } else {
      usedSections = [];
    }
  }
  return { request, session, usedSections, facts: caseFacts };
}

/** Read a dotted path such as `spending.currentMonth.topCategories.0.amount` from the facts. */
function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), source);
}

/** The ways a figure may appear in a correct answer. Money is shown in whole dollars on the phone. */
function acceptedForms(value: unknown, format: string): string[] {
  if (value === null || value === undefined) return [];
  if (format === 'money') {
    const amount = Number(value);
    return [formatMaskedMoney(amount, 0), formatMaskedMoney(amount, 0).replace('S$', '$')];
  }
  if (format === 'percent') {
    const percent = Number(value) * (Math.abs(Number(value)) <= 1 ? 100 : 1);
    return [`${percent.toFixed(1)}%`, `${Math.round(percent)}%`];
  }
  if (format === 'month') {
    // A YYYY-MM month may be written "2055-07", "July 2055" or "Jul 2055".
    const [year, month] = String(value).split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return [String(value), `${date.toLocaleString('en-SG', { month: 'long' })} ${year}`, `${date.toLocaleString('en-SG', { month: 'short' })} ${year}`, date.toLocaleString('en-SG', { month: 'long' })];
  }
  if (format === 'months') {
    const months = Number(value);
    return [`${months.toFixed(1)} months`, `${Math.round(months)} months`, months.toFixed(1)];
  }
  return [String(value)];
}

/** The local Supabase anon key, read from the CLI at runtime so it never lands in a file or log. */
function localSupabase() {
  const raw = execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const status = JSON.parse(raw.slice(raw.indexOf('{'))) as Record<string, string>;
  return { url: status.API_URL ?? 'http://127.0.0.1:54321', anonKey: status.ANON_KEY };
}

/** An anonymous session with DouDou turned on, exactly as the phone's Agree button makes one. */
async function connect(): Promise<string> {
  const { url, anonKey } = localSupabase();
  const signup = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!signup.ok) throw new Error(`Anonymous sign-in failed: HTTP ${signup.status}`);
  const token = ((await signup.json()) as { access_token: string }).access_token;
  const consent = await fetch(`${apiBase}${apiRoutes.profileAiPreference}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiPreference: 'personalised' }),
  });
  if (!consent.ok) throw new Error(`Turning DouDou on failed: HTTP ${consent.status}`);
  return token;
}

async function forget(token: string) {
  await fetch(`${apiBase}${apiRoutes.account}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
}

interface EvalCase {
  id: string;
  question: string;
  /** Earlier turns, for follow-up questions. */
  history?: { role: 'user' | 'assistant'; content: string }[];
  /** Snapshot sections the phone should send. Empty means the question must send no figures. */
  expectedSections?: string[];
  /** Figures the answer must state, read from the unmasked snapshot facts. */
  requiredFacts?: { path: string; format: 'money' | 'percent' | 'months' | 'month' | 'text' }[];
  /** Text that must not appear, e.g. a wrong category or an invented figure. */
  forbidden?: string[];
  /** Phrases the answer must contain, e.g. a friendly greeting reply. */
  mustContain?: string[];
  /** For an ambiguous question: the answer must contain at least one of these. */
  mustContainAny?: string[];
  /** A question purely about the user's figures: no article search, so no sources. */
  expectNoSources?: boolean;
  /** What a correct answer says about the sources, for the source-accuracy review. */
  sourceExpectation?: string;
}

async function main() {
  const resultsDir = join(here, 'results');
  mkdirSync(resultsDir, { recursive: true });
  const truth = { todayKey, effectiveDate: snapshot.effectiveDate, facts: snapshot.facts };
  writeFileSync(join(here, 'ground_truth.json'), `${JSON.stringify(truth, null, 2)}\n`);
  console.log(`Ground truth for ${todayKey} written to ground_truth.json`);
  if (args.includes('--truth')) return;

  const cases = (JSON.parse(readFileSync(join(here, casesFile), 'utf8')) as EvalCase[])
    .filter((item) => !only || only.includes(item.id));
  const token = await connect();
  const results = [];
  try {
    for (const item of cases) {
      const { request, session, usedSections, facts: caseFacts } = prepareRequest(item.question, item.history ?? []);
      let latencyMs = 0;
      const ask = async () => {
        const started = Date.now();
        const reply = await fetch(`${apiBase}${apiRoutes.financialAdvisorChat}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        latencyMs = Date.now() - started;
        return reply;
      };
      let response = await ask();
      // The backend allows 10 questions a minute per phone; wait out the window instead of failing.
      for (let attempt = 0; response.status === 429 && attempt < 3; attempt += 1) {
        const wait = Number(response.headers.get('Retry-After') ?? 30) + 1;
        console.log(`  rate limited, waiting ${wait}s`);
        await new Promise((resolve) => setTimeout(resolve, wait * 1000));
        response = await ask();
      }
      if (!response.ok) {
        results.push({ id: item.id, question: item.question, error: `HTTP ${response.status}: ${await response.text()}`, pass: false });
        console.log(`✗ ${item.id}: HTTP ${response.status}`);
        continue;
      }
      const body = (await response.json()) as RagChatResponse;
      const answer = session.unmaskFinal(body.answer);
      const problems: string[] = [];

      const expected = item.expectedSections;
      if (expected && [...expected].sort().join(',') !== [...usedSections].sort().join(',')) {
        problems.push(`sections sent [${usedSections.join(', ')}], expected [${expected.join(', ')}]`);
      }
      for (const fact of item.requiredFacts ?? []) {
        const forms = acceptedForms(readPath(caseFacts, fact.path), fact.format);
        if (!forms.length) problems.push(`fact ${fact.path} has no value in the snapshot`);
        else if (!forms.some((form) => answer.toLowerCase().includes(form.toLowerCase()))) problems.push(`missing ${fact.path}: expected one of ${forms.join(' | ')}`);
      }
      for (const text of item.forbidden ?? []) {
        if (answer.toLowerCase().includes(text.toLowerCase())) problems.push(`contains forbidden "${text}"`);
      }
      if (/\{\{\s*[A-Z]\d+\s*\}\}/.test(answer)) problems.push('a placeholder token was left in the answer');
      if (/\(range:/i.test(answer)) problems.push('a "(range: …)" band was left in the answer');
      // Ranges are for the model only; any wording of one in the answer is a leak.
      if (/\b(?:under 1k|over 1M|\d+k-\d+[kM])\b|range of \$?\d/i.test(answer)) problems.push('an internal range was written into the answer');
      if (/\b20\d\d-\d\d-\d\d\b/.test(answer)) problems.push('a raw YYYY-MM-DD date was written');
      if (item.mustContainAny?.length && !item.mustContainAny.some((text) => answer.toLowerCase().includes(text.toLowerCase()))) {
        problems.push(`missing all of: ${item.mustContainAny.join(' | ')}`);
      }
      for (const text of item.mustContain ?? []) {
        if (!answer.toLowerCase().includes(text.toLowerCase())) problems.push(`missing phrase "${text}"`);
      }
      const sourceCount = (body.sourceDetails ?? body.source_details ?? body.sources ?? []).length;
      if (item.expectNoSources && sourceCount > 0) problems.push(`cited ${sourceCount} sources for a pure data question`);
      if (answer.includes('[figure unavailable]')) problems.push('the model invented a placeholder');

      const sources = (body.sourceDetails ?? body.source_details ?? []).map((source) => ({ title: source.title, path: source.path }));
      results.push({
        id: item.id,
        question: item.question,
        usedSections,
        maskedQuestion: request.question,
        maskedContextChars: request.clientSnapshot ? JSON.stringify(request.clientSnapshot.facts).length : 0,
        mode: body.mode,
        answer,
        sources: sources.length ? sources : body.sources,
        sourceExpectation: item.sourceExpectation,
        latencyMs,
        dataChecks: problems,
        pass: problems.length === 0,
      });
      console.log(`${problems.length ? '✗' : '✓'} ${item.id}${problems.length ? `: ${problems.join('; ')}` : ''}`);
    }
  } finally {
    await forget(token);
  }

  const passed = results.filter((result) => result.pass).length;
  const report = { label, todayKey, apiBase, total: results.length, passed, results };
  writeFileSync(join(resultsDir, `doudou_${label}.json`), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    `# DouDou mobile eval (${label})`,
    '',
    `Date ${todayKey}. ${passed}/${results.length} cases pass the automatic data checks.`,
    '',
    ...results.flatMap((result) => [
      `## ${result.pass ? 'PASS' : 'FAIL'} · ${result.id}`,
      '',
      `**Q:** ${result.question}`,
      '',
      'error' in result && result.error ? `**Error:** ${result.error}` : `**Sections sent:** ${(result as { usedSections: string[] }).usedSections.join(', ') || 'none'} · **Mode:** ${(result as { mode?: string }).mode ?? '?'}`,
      '',
      'answer' in result ? `${(result as { answer: string }).answer}` : '',
      '',
      'dataChecks' in result && (result as { dataChecks: string[] }).dataChecks.length ? `**Problems:** ${(result as { dataChecks: string[] }).dataChecks.join('; ')}` : '',
      '',
    ]),
  ].join('\n');
  writeFileSync(join(resultsDir, `doudou_${label}.md`), md);
  console.log(`\n${passed}/${results.length} pass. Report: results/doudou_${label}.md`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
