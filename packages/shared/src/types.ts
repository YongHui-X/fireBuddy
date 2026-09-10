export type UUID = string;
export type TransactionType = 'expense' | 'income';
export type CategoryType = TransactionType;

export interface Profile {
  id: UUID;
  email: string;
  createdAt: string;
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
}

export interface CreateTransactionInput {
  categoryId: UUID | null;
  accountId: UUID;
  description: string;
  amount: string;
  date: string;
  transactionType: TransactionType;
  tagIds: UUID[];
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
}

export interface RagChatRequest {
  question: string;
  history: RagChatMessage[];
  appContext?: RagAppContext;
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
  | 'financial_health_review';

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
export type WealthPositionType = 'cash' | 'investment' | 'property' | 'mortgage' | 'loan' | 'cpf' | 'other';
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
  isArchived: boolean;
  archivedAt: string | null;
  latestSnapshot: WealthPositionSnapshot | null;
  createdAt: string;
  updatedAt: string;
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

export type CreateWealthPositionInput = Omit<
  WealthPosition,
  'id' | 'userId' | 'isArchived' | 'archivedAt' | 'latestSnapshot' | 'createdAt' | 'updatedAt'
>;
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
}

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
