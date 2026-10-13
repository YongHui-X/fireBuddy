export type UUID = string;
export type TransactionType = 'expense' | 'income';
export type CategoryType = TransactionType;

export interface Profile {
  id: UUID;
  email: string;
  createdAt: string;
}

/**
 * How much the AI guide may see. `off`: no AI calls at all. `guide`: curated Singapore finance
 * answers with the question scrubbed of amounts and names. `personalised`: a masked snapshot of
 * the user's aggregates is added; exact figures never leave the backend.
 */
export type AiPreference = 'off' | 'guide' | 'personalised';

export interface UserProfile {
  id: UUID;
  email: string;
  aiPreference: AiPreference;
  /** When the user last chose guide or personalised; null while off. */
  aiConsentedAt: string | null;
}

export interface UpdateAiPreferenceInput {
  aiPreference: AiPreference;
}

/** Everything FireBuddy holds for one user, as returned by GET /account/export. */
export interface AccountExport {
  format: 'firebuddy-export/1';
  exportedAt: string;
  profile: UserProfile;
  tables: Record<string, unknown[]>;
}

export interface Category {
  id: UUID;
  userId: UUID | null;
  name: string;
  icon: string;
  color: string;
  monthlyBudget: string;
  categoryType: CategoryType;
  isDefault: boolean;
  createdAt: string;
}

export interface Expense {
  id: UUID;
  userId: UUID;
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
}

export interface Transaction {
  id: UUID;
  userId: UUID;
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
  transactionType: TransactionType;
  createdAt: string;
  updatedAt: string;
  tagIds: UUID[];
  /** Set on mobile copies added by a recurring rule (`recurring.ts`); absent everywhere else. */
  recurringId?: string;
}

export interface CreateTransactionInput {
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
  transactionType: TransactionType;
  tagIds: UUID[];
  recurringId?: string;
}

export interface UpdateTransactionInput {
  categoryId?: UUID | null;
  accountId?: UUID;
  description?: string;
  amount?: string;
  date?: string;
  transactionType?: TransactionType;
  tagIds?: UUID[];
}

export interface Tag {
  id: UUID;
  userId: UUID;
  name: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  name: string;
}

export interface TransactionExportFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: TransactionType;
  categoryId?: UUID;
  accountId?: UUID;
  tagId?: UUID;
  search?: string;
}

export interface UpdateExpenseInput {
  categoryId?: UUID | null;
  accountId?: UUID;
  description?: string;
  amount?: string;
  date?: string;
}

export type AccountType = 'bank' | 'credit_card' | 'debit_card' | 'cash' | 'ewallet';

export interface Account {
  id: UUID;
  userId: UUID;
  name: string;
  type: AccountType;
  color: string;
  lastFour: string | null;
  isDefault: boolean;
  /**
   * Mobile only (PRD 6.4.1): false once the user stops a Wealth balance following this account,
   * so its automatic balance no longer counts. Absent means true.
   */
  trackBalance?: boolean;
  /**
   * Mobile only (PRD 6.4.1): the moment this account's automatic balance restarted from zero, set
   * when a Wealth balance that followed it is archived or unlinked; only transactions saved from
   * then on count. Absent means every transaction counts.
   */
  balanceFrom?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  color: string;
  lastFour?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  color?: string;
  lastFour?: string | null;
  trackBalance?: boolean;
  balanceFrom?: string | null;
}

export interface ParseInputRequest {
  description: string;
}

export interface ParseInputResponse {
  categoryId: UUID | null;
  categoryName: string | null;
  confidence: 'low' | 'medium' | 'high';
  reason?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
  monthlyBudget: string;
  categoryType: CategoryType;
}

export interface UpdateCategoryInput {
  name: string;
  icon: string;
  color: string;
  monthlyBudget: string;
  categoryType: CategoryType;
}

export type RagChatRole = 'user' | 'assistant';

export interface RagChatMessage {
  role: RagChatRole;
  content: string;
}

export type RagAppActionType = 'create' | 'update' | 'delete' | 'calculate';

export interface RagAppAction {
  type: RagAppActionType;
  label: string;
  occurredAt: string;
}

export interface RagAppContext {
  currentPage: string;
  currentPath: string;
  recentActions: RagAppAction[];
  /** ISO country code; outside Singapore DouDou answers generally and never applies CPF/SRS rules. */
  country?: string;
}

/** A snapshot computed and masked on the device; the backend forwards it to the model as-is. */
export interface RagClientSnapshot {
  effectiveDate: string;
  facts: Record<string, unknown>;
}

export interface RagChatRequest {
  question: string;
  history: RagChatMessage[];
  appContext?: RagAppContext;
  /**
   * True when the device already scrubbed the question and history and masked the snapshot.
   * The backend then neither scrubs nor restores values; the device restores them from its own map.
   */
  clientMasked?: boolean;
  clientSnapshot?: RagClientSnapshot;
}

export interface RagChatSource {
  title: string | null;
  url: string | null;
  path: string | null;
  headline: string | null;
}

export type RagAnswerMode = 'knowledge' | 'data' | 'hybrid' | 'clarification' | 'unsupported';

export type RagDataTool =
  | 'expense_summary'
  | 'spending_comparison'
  | 'financial_summary'
  | 'fire_projection'
  | 'financial_health_review'
  | 'figure_lookup'
  | 'personal_context';

export interface RagDataEvidence {
  tool: RagDataTool;
  label: string;
  period: string;
  record_count: number | null;
  destination: string;
}

export interface RagChatResponse {
  answer: string;
  sources: string[];
  sourceDetails?: RagChatSource[];
  source_details?: RagChatSource[];
  mode?: RagAnswerMode;
  dataEvidence?: RagDataEvidence;
  data_evidence?: RagDataEvidence;
}

export type RagStreamStatus = 'searching' | 'preparing';

export type RagStreamEvent =
  | { type: 'status'; status: RagStreamStatus; message: string }
  | { type: 'delta'; text: string }
  | { type: 'evidence'; mode: RagAnswerMode; dataEvidence: RagDataEvidence }
  | { type: 'sources'; sources: RagChatSource[] }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string; retryable: boolean; status?: number };

export type WealthPositionKind = 'asset' | 'liability';
export type WealthPositionType = 'cash' | 'investment' | 'property' | 'mortgage' | 'loan' | 'credit_card' | 'cpf' | 'other';
export type LiquidityClass = 'liquid' | 'less_liquid' | 'restricted';
export type WealthRestrictionType = 'none' | 'cpf' | 'other_restricted';

export interface WealthPosition {
  id: UUID;
  userId: UUID;
  name: string;
  positionKind: WealthPositionKind;
  positionType: WealthPositionType;
  liquidityClass: LiquidityClass;
  includeInFi: boolean;
  isEmergencyFund: boolean;
  restrictionType: WealthRestrictionType;
  currency: 'SGD';
  /** Annual rate as a fraction string such as '0.0650'. Liabilities only. */
  interestRate: string | null;
  /** Regular monthly repayment in SGD. Liabilities only. */
  monthlyPayment: string | null;
  nextPaymentDate: string | null;
  originalPrincipal: string | null;
  /** Mobile only: the YYYY-MM the user wants a debt cleared by, for the required monthly payment. */
  payoffTargetMonth?: string | null;
  /**
   * Mobile only (PRD 6.4.1): the account whose income and expenses move this cash asset's value
   * after its latest entered balance. Null or absent means the value is entered by hand.
   */
  linkedAccountId?: string | null;
  /**
   * Mobile only (PRD 6.6.1, 29): which CPF account a CPF position holds, so the FIRE planner can
   * read OA, SA and MA from Wealth. 'sa' is the Retirement Account from 55. Absent: not set yet.
   */
  cpfAccount?: 'oa' | 'sa' | 'ma' | null;
  isArchived: boolean;
  archivedAt: string | null;
  latestSnapshot: WealthPositionSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export type DebtPayoffStatus = 'projected' | 'payment_below_interest' | 'missing_terms' | 'paid_off';

export interface DebtPayoffSummary {
  positionId: UUID;
  name: string;
  balance: string | null;
  interestRate: string | null;
  monthlyPayment: string | null;
  payoffMonth: string | null;
  monthsRemaining: number | null;
  totalInterest: string | null;
  status: DebtPayoffStatus;
}

export interface DebtSummary {
  totalMonthlyDebtService: string;
  highestInterestRate: string | null;
  debtToIncome: string | null;
  liabilities: DebtPayoffSummary[];
}

export interface WealthPositionSnapshot {
  id: UUID;
  userId: UUID;
  wealthPositionId: UUID;
  valueDate: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export interface WealthContribution {
  id: UUID;
  userId: UUID;
  wealthPositionId: UUID;
  contributionDate: string;
  amount: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

type OptionalPositionFields = 'interestRate' | 'monthlyPayment' | 'nextPaymentDate' | 'originalPrincipal' | 'payoffTargetMonth' | 'linkedAccountId';
export type CreateWealthPositionInput = Omit<
  WealthPosition,
  'id' | 'userId' | 'isArchived' | 'archivedAt' | 'latestSnapshot' | 'createdAt' | 'updatedAt' | OptionalPositionFields
> & Partial<Pick<WealthPosition, OptionalPositionFields>>;
export type UpdateWealthPositionInput = Partial<CreateWealthPositionInput>;
export type CreateWealthSnapshotInput = Pick<WealthPositionSnapshot, 'valueDate' | 'amount'>;
export type UpdateWealthSnapshotInput = CreateWealthSnapshotInput;
export type CreateWealthContributionInput = Pick<WealthContribution, 'wealthPositionId' | 'contributionDate' | 'amount' | 'note'>;
export type UpdateWealthContributionInput = Omit<CreateWealthContributionInput, 'wealthPositionId'>;

export interface RetirementIncome {
  label: string;
  monthlyAmount: number;
  startMonth: string;
  endMonth: string;
  annualGrowth: number;
  /** 'barista' marks the part-time income the Barista FIRE type adds; absent for the user's own entries. */
  source?: 'barista';
  /**
   * YYYY-MM the amount was typed in, when it is in that month's money (Barista income, PRD 6.6.1).
   * The engine inflates it to `startMonth` before `annualGrowth` applies. Absent: the amount is
   * already in the money of the month it starts.
   */
  priceMonth?: string;
}

/** A one-off cost or payment on a chosen month, in today's money (PRD 6.6.1, rule 20). */
export interface RetirementLumpSum {
  label: string;
  /** YYYY-MM it happens. */
  month: string;
  /** Today's money, as of `priceMonth`; inflated by the engine like spending. */
  amount: number;
  direction: 'out' | 'in';
  /** YYYY-MM the amount was typed in. */
  priceMonth: string;
}

/** Which kind of FIRE the plan aims for. Saved with the plan so the choice is never guessed back. */
export type FireType = 'lean' | 'regular' | 'fat' | 'coast' | 'barista' | 'custom';

export interface RetirementPlan {
  version: 2;
  spendingMonth: string;
  birthMonth: string;
  retirementMonth: string;
  endAge: number;
  monthlySpending: number;
  monthlyContribution: number;
  assetIds: string[];
  portfolioOverride: { amount: number; date: string } | null;
  cpfPlan: 'unknown' | 'standard' | 'escalating' | 'basic';
  cpfStartAge: number;
  cpfMonthlyPayout: number;
  otherIncome: RetirementIncome[];
  beforeReturn: number;
  afterReturn: number;
  inflation: number;
  provenance: Record<string, 'recorded' | 'user-entered' | 'assumed'>;
  /** Mobile only; older plans and the web leave it out and read as 'custom'. */
  fireType?: FireType;
  /**
   * Coast FIRE's Coast age as YYYY-MM (PRD 6.6.1, 33): monthly investing stops here and the
   * portfolio only grows until retirement. Absent: investing continues to retirement.
   */
  coastMonth?: string;
  /** Yearly rise in the monthly investment until retirement (PRD 6.6.1); absent reads as 0. */
  contributionGrowth?: number;
  /**
   * Set when the CPF LIFE payout is estimated on the phone from the retirement sum expected at 55
   * (PRD 6.6.1, rule 18); `cpfMonthlyPayout` then holds the estimate. Absent: the payout was typed.
   */
  cpfEstimate?: {
    sum: 'brs' | 'frs' | 'ers';
    /** 'balances' projects the person's CPF balances (rule 24); absent or 'sum' reads the sum alone (rule 18). */
    source?: 'sum' | 'balances';
  };
  /** One-off costs and payments (PRD 6.6.1, rule 20); absent reads as none. */
  lumpSums?: RetirementLumpSum[];
  /** Singapore residency (rule 22). 'foreigner' has no CPF; absent reads as citizen. */
  residency?: 'citizen' | 'pr' | 'foreigner';
  /** Year the person became a PR, for CPF's graduated first two years (rule 22). */
  prSinceYear?: number;
  /** Gross pay (rule 23), in today's money. Stays on the phone. */
  pay?: { grossMonthly: number; bonusMonths: number };
  /** Spending now per month, excluding insurance and healthcare (rule 23). */
  currentSpending?: number;
  /** CPF balances as of `month` (rule 24). */
  cpfBalances?: { oa: number; sa: number; ma: number; month: string };
  /** 'wealth' reads the balances from CPF positions in Wealth on every run (rule 29); absent or 'typed' uses `cpfBalances`. */
  cpfBalancesSource?: 'wealth' | 'typed';
  /** Home ownership and the OA used for the home loan (rule 24). */
  property?: {
    status: 'own' | 'plan' | 'none';
    oaMonthly: number;
    fromMonth: string;
    untilMonth: string;
    /** A planned home (rule 31): its budget in today's money, OA used for the downpayment, and cash for the downpayment and renovation. */
    budget?: number;
    oaDownpayment?: number;
    cashUpfront?: number;
  };
  /** Take out CPF above the chosen sum at 55 (rule 24); absent reads as false. */
  cpfWithdrawAt55?: boolean;
  /** Insurance and healthcare per month in today's money as of `priceMonth`, rising by `growth` a year (rule 25). */
  healthcare?: {
    monthlyAmount: number;
    growth: number;
    priceMonth: string;
    /** The two parts the form asks for (rule 29); `monthlyAmount` is their sum and is what the engine reads. */
    insurance?: number;
    medical?: number;
  };
}

export interface RetirementDraft { step: number; inputs: RetirementPlan }
export interface RetirementCashFlow {
  month: string;
  phase: 'accumulation' | 'retirement';
  growth: string;
  contribution: string;
  expenses: string;
  cpf: string;
  otherIncome: string;
  /** Net one-off amount that month (payments in minus costs); only on plans with lump sums. */
  lumpSum?: string;
  /** The insurance and healthcare part of `expenses`; only on plans with that line (rule 25). */
  healthcare?: string;
  balance: string;
}

export interface FireProfile {
  draftPlan?: RetirementDraft | null;
  activePlan?: RetirementPlan | null;
  id: UUID;
  userId: UUID;
  monthlyContribution: string;
  expectedReturnRate: string;
  inflationRate: string;
  withdrawalRate: string;
  retirementSpendingOverride: string | null;
  targetFiDate: string | null;
  birthYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateFireProfileInput = Omit<FireProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type FireCalculationStatus = 'already_reached' | 'projected' | 'unreachable' | 'insufficient_data';
export type DataStatus = 'available' | 'unavailable' | 'limited' | 'stale';

export interface FireAssumptions {
  monthlyContribution: string;
  nominalAnnualReturn: string;
  inflationRate: string;
  realAnnualReturn: string;
  withdrawalRate: string;
  contributionTiming: 'month_end';
  horizonMonths: number;
}

export interface FirePathPoint {
  date: string;
  amount: string;
  kind: 'actual' | 'projected';
}

export interface FireWarning {
  code: string;
  message: string;
}

export interface SpendingBaseline {
  status: 'available' | 'limited' | 'insufficient_data' | 'manual_override';
  source: 'transactions' | 'manual_override' | 'none';
  startDate: string | null;
  endDate: string | null;
  completedMonths: number;
  expenseTotal: string | null;
  annualisedSpending: string | null;
}

export interface FireCalculationRequest {
  asOf?: string;
}

export interface FireScenarioRequest extends FireCalculationRequest {
  planOverrides?: Partial<Pick<RetirementPlan, 'retirementMonth' | 'monthlyContribution' | 'monthlySpending' | 'beforeReturn' | 'afterReturn' | 'inflation'>>;
  monthlyContribution?: string;
  retirementSpending?: string;
}

export interface FireCalculationResult {
  calculationVersion?: 'sg-monthly.v2';
  plan?: RetirementPlan | null;
  fundingStatus?: 'funded' | 'shortfall' | 'review_required';
  projectedPortfolio?: string | null;
  fundingGap?: string | null;
  targetToday?: string | null;
  portfolioToday?: string | null;
  earliestRetirementMonth?: string | null;
  monthlyCashFlows?: RetirementCashFlow[];
  status: FireCalculationStatus;
  effectiveDate: string;
  currentInvestableAssets: string | null;
  fiTarget: string | null;
  progressRate: string | null;
  progressRateCapped: string | null;
  estimatedMonths: number | null;
  estimatedFiYear: number | null;
  requiredMonthlyInvestment: string | null;
  assumptions: FireAssumptions | null;
  spendingBaseline: SpendingBaseline;
  actualPath: FirePathPoint[];
  projectedPath: FirePathPoint[];
  warnings: FireWarning[];
}

export interface MonthlyMoneyPulse {
  month: string;
  income: string;
  spending: string;
  savingsAmount: string;
  savingsRate: string | null;
  savingsRateStatus: 'available' | 'unavailable';
  investedAmount: string;
  /** Sum of the monthly payments on active liabilities. */
  debtService: string;
  completeness: 'complete' | 'limited';
}

export interface RecommendedAction {
  actionType: string;
  title: string;
  rationale: string;
  evidence: string;
  destination: string;
  limitations: string | null;
  ruleId: string;
}

export interface FinancialSummary {
  effectiveDate: string;
  dataMode?: 'account' | 'demo';
  netWorth: string | null;
  assetTotal: string | null;
  liabilityTotal: string | null;
  priorMonthNetWorth: string | null;
  monthlyNetWorthChange: string | null;
  investableAssets: string | null;
  emergencyEligibleAssets: string | null;
  averageMonthlyEssentialSpending: string | null;
  emergencyRunwayMonths: string | null;
  averageMonthlyDebtService: string | null;
  /** Emergency fund divided by essentials plus debt service; null when either input is missing. */
  emergencyRunwayMonthsWithDebt: string | null;
  debt: DebtSummary;
  latestSnapshotDate: string | null;
  snapshotStatus: 'missing' | 'current' | 'stale' | 'mixed';
  pulse: MonthlyMoneyPulse;
  fire: FireCalculationResult;
  recommendedAction: RecommendedAction | null;
  transactionAnomalies: TransactionAnomaly[];
  warnings: FireWarning[];
}

export interface TransactionAnomaly {
  transactionId: UUID;
  kind: 'possible_duplicate' | 'high_category_amount';
  label: string;
  explanation: string;
  evidencePeriod: string;
}
