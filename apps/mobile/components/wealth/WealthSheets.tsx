import {
  assetPositionTypes,
  categoryColors,
  classifyWealthPosition,
  getDeviceDateKey,
  isLockedPosition,
  describeDebtGoal,
  liabilityPositionTypes,
  repaidSoFar,
  groupThousands,
  sanitizeAmountInput,
  findAccountNamed,
  resolveAccountName,
  suggestAccounts,
  wealthTypeLabels,
  type CreateWealthContributionInput,
  type CreateWealthPositionInput,
  type CreateWealthSnapshotInput,
  type UpdateWealthPositionInput,
  type WealthPosition,
  type WealthPositionKind,
  type WealthPositionType,
} from '@firebuddy/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useRegion } from '@/lib/user-profile';
import { useResetWhen } from '@/hooks/use-reset-when';

import { AccountSheet } from '../accounts/AccountSheet';
import { ActionSheet } from '../ui/ActionSheet';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { InfoButton } from '../ui/InfoButton';
import { MonthYearField } from '../ui/MonthYearField';
import { positionIcon } from './position-icons';
import { SegmentedControl } from '../ui/SegmentedControl';
import { AppText } from '../ui/Text';
import { SelectField, TextField } from '../ui/TextField';
import { ToggleRow } from '../ui/ToggleRow';

export type AddTab = 'asset' | 'debt' | 'contribution';

const percentText = (rate: string | null) => (rate === null ? '' : String(Number((Number(rate) * 100).toFixed(2))));
const fractionFromPercent = (percent: string) => (percent.trim() === '' ? null : (Number(percent) / 100).toFixed(4));
const moneyOrNull = (value: string) => (value.trim() === '' ? null : Number(value).toFixed(2));
const moneyText = (value: string | null | undefined) => (value == null ? '' : String(Number(value)));
const positiveMoney = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

/** "Repaid so far: RM 120,000 (25%)" under the original-loan field, or nothing until both figures make sense. */
function RepaidHint({ original, owed }: { original: string; owed: string }) {
  const { money, percent } = usePrivacy();
  const repaid = repaidSoFar(original.trim() === '' ? null : Number(original), owed.trim() === '' ? null : Number(owed));
  if (!repaid) return null;
  return <AppText variant="caption" tone="ink2">{`Repaid so far: ${money(repaid.amount, 0)} (${percent(repaid.share)})`}</AppText>;
}

/** Live "pay it off by" answer under the goal field, from the figures typed in the form. */
function GoalHint({ target, owed, rate, payment, today }: { target: string; owed: string; rate: string; payment: string; today: string }) {
  const { money } = usePrivacy();
  if (!target || goalError(target, today)) return null;
  const goal = describeDebtGoal(
    { payoffTargetMonth: target, interestRate: fractionFromPercent(rate), monthlyPayment: moneyOrNull(payment) },
    owed.trim() === '' ? null : Number(owed),
    today,
    (value) => money(value, 0),
  );
  return goal ? <AppText variant="caption" tone={goal.onTrack ? 'income' : 'ink2'}>{goal.text}</AppText> : null;
}

/** A pay-off goal has to be a month after this one; '' (no goal) is always fine. */
const goalError = (target: string, today: string) => (target && target <= today.slice(0, 7) ? 'Pick a month after this one.' : null);

const GOAL_HELP = 'Optional. FireBuddy works out the monthly payment that clears it by then.';

const ORIGINAL_HELP = 'What you first borrowed, so FireBuddy can show how much you have repaid.';
const ORIGINAL_ERROR = 'The original loan can’t be less than what you still owe.';

/** Type picker built from a select field and an action sheet, so it reads the same as the other pickers. */
type CpfAccount = NonNullable<WealthPosition['cpfAccount']>;
const CPF_ACCOUNT_OPTIONS: readonly { value: CpfAccount; label: string; name: string }[] = [
  { value: 'oa', label: 'OA', name: 'CPF OA' },
  { value: 'sa', label: 'SA', name: 'CPF SA' },
  { value: 'ma', label: 'MA', name: 'CPF MA' },
];
const cpfName = (account: CpfAccount) => CPF_ACCOUNT_OPTIONS.find((option) => option.value === account)!.name;

/** Which CPF account a CPF position holds, so the FIRE planner can read OA, SA and MA from Wealth. */
function CpfAccountField({ value, onChange }: { value: CpfAccount; onChange: (next: CpfAccount) => void }) {
  return (
    <View style={styles.group}>
      <View style={styles.labelLine}>
        <AppText variant="label">CPF account</AppText>
        <InfoButton title="CPF account" body="Which CPF account this is. Your FIRE plan reads OA, SA and MA from here." />
      </View>
      <SegmentedControl<CpfAccount> options={CPF_ACCOUNT_OPTIONS} value={value} onChange={onChange} accessibilityLabel="CPF account" />
    </View>
  );
}

/** CPF is a Singapore scheme, so the general mode never offers it (an existing CPF position keeps its type). */
function assetTypesFor(singapore: boolean, current?: WealthPositionType): readonly WealthPositionType[] {
  return singapore ? assetPositionTypes : assetPositionTypes.filter((type) => type !== 'cpf' || type === current);
}

function lockedHelp(singapore: boolean) {
  return singapore ? 'SRS and similar schemes you cannot draw on early.' : 'Pensions and retirement accounts you cannot draw on early.';
}

/** On the phone the cash type is an Account: money in a FireBuddy account (PRD 6.4.1, 5b). */
const typeLabel = (type: WealthPositionType) => (type === 'cash' ? 'Account' : wealthTypeLabels[type]);

/**
 * The Account name field: suggests matching accounts as the name is typed and says in one line
 * whether saving links to an existing account, creates a new one, or is blocked because a Wealth
 * balance already follows that account.
 */
function AccountNameField({ value, onChange, followedAccountIds }: { value: string; onChange: (name: string) => void; followedAccountIds: readonly string[] }) {
  const { accounts } = useFireBuddy();
  const resolution = resolveAccountName(accounts, value, followedAccountIds);
  const suggestions = suggestAccounts(accounts, value).filter((account) => account.name !== value.replace(/\s+/g, ' ').trim());
  const help = resolution.kind === 'link'
    ? `Links to your account ${resolution.account.name}; its transactions keep this up to date.`
    : resolution.kind === 'create'
      ? 'Creates a new account with this name, also used when you add transactions.'
      : 'Your bank or wallet, for example DBS Savings or Cash.';
  return (
    <View style={styles.group}>
      <TextField
        label="Account name"
        value={value}
        onChangeText={onChange}
        placeholder="e.g. DBS Savings"
        maxLength={80}
        autoFocus
        help={resolution.kind === 'taken' ? undefined : help}
        error={resolution.kind === 'taken' ? `${resolution.account.name} is already in Wealth. Edit that row instead.` : null}
      />
      {suggestions.length ? (
        <View style={styles.suggestions}>
          {suggestions.map((account) => (
            <Button key={account.id} label={account.name} variant="tonal" size="compact" onPress={() => onChange(account.name)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TypePicker({ label, kind, value, options, onChange }: { label: string; kind: WealthPositionKind; value: WealthPositionType; options: readonly WealthPositionType[]; onChange: (value: WealthPositionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectField label={label} value={typeLabel(value)} icon={positionIcon(value, kind)} onPress={() => setOpen(true)} accessibilityLabel={label} />
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        actions={options.map((option) => ({ key: option, label: typeLabel(option), icon: positionIcon(option, kind), selected: option === value, onSelect: () => { onChange(option); setOpen(false); } }))}
      />
    </>
  );
}

/**
 * "Updates from": the optional account a cash balance follows (PRD 6.4.1). Lists accounts not
 * already followed by another balance. Hidden when there are no accounts.
 */
function LinkedAccountField({ value, onChange, positionId }: { value: string; onChange: (accountId: string) => void; positionId?: string }) {
  const { accounts, positions, addAccount } = useFireBuddy();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const taken = new Set(positions.filter((item) => !item.isArchived && item.id !== positionId && item.linkedAccountId).map((item) => item.linkedAccountId));
  const choices = accounts.filter((account) => !taken.has(account.id));
  const pick = (accountId: string) => { onChange(accountId); setOpen(false); };
  return (
    <>
      <SelectField
        label="Updates from"
        value={accounts.find((account) => account.id === value)?.name ?? SEPARATE_MONEY}
        help="Income and spending in this account move the value."
        onPress={() => setOpen(true)}
      />
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Updates from"
        actions={[
          ...choices.map((account) => ({ key: account.id, label: account.name, selected: account.id === value, onSelect: () => pick(account.id) })),
          // Accounts can be added from here too, so Wealth never sends people to another screen first.
          { key: 'new', label: 'New account…', onSelect: () => { setOpen(false); setCreating(true); } },
          { key: 'none', label: SEPARATE_MONEY, detail: 'Savings you do not log transactions for', selected: !value, onSelect: () => pick('') },
        ]}
      />
      <AccountSheet
        open={creating}
        mode="add"
        onClose={() => setCreating(false)}
        onSave={(input) => {
          onChange(addAccount(input).id);
          setCreating(false);
        }}
      />
    </>
  );
}

const SEPARATE_MONEY = 'Separate money (not in an account)';

export interface WealthAddSheetProps {
  open: boolean;
  initialTab: AddTab;
  fiAssets: readonly WealthPosition[];
  onClose: () => void;
  onAddPosition: (input: CreateWealthPositionInput, snapshot: CreateWealthSnapshotInput) => void;
  onAddContribution: (input: CreateWealthContributionInput) => void;
}

/** Add an asset, a debt, or record a contribution: the three web tabs as one segmented sheet. */
export function WealthAddSheet({ open, initialTab, fiAssets, onClose, onAddPosition, onAddContribution }: WealthAddSheetProps) {
  const today = getDeviceDateKey();
  const { accounts, positions, addAccount, addSnapshot } = useFireBuddy();
  const { currency } = usePrivacy();
  const { isSingapore } = useRegion();
  const [tab, setTab] = useState<AddTab>(initialTab);
  // CPF is added as its three accounts at once, each with its own value.
  const [cpfValues, setCpfValues] = useState<Record<CpfAccount, string>>({ oa: '', sa: '', ma: '' });
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<WealthPositionType>('cash');
  const [debtType, setDebtType] = useState<WealthPositionType>('loan');
  const [amount, setAmount] = useState('');
  const [includeInFi, setIncludeInFi] = useState(true);
  const [locked, setLocked] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [rate, setRate] = useState('');
  const [payment, setPayment] = useState('');
  const [nextPayment, setNextPayment] = useState('');
  const [original, setOriginal] = useState('');
  const [target, setTarget] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useResetWhen(open, () => {
    setTab(initialTab);
    setName(''); setAssetType('cash'); setCpfValues({ oa: '', sa: '', ma: '' }); setDebtType('loan'); setAmount('');
    setIncludeInFi(true); setLocked(false); setEmergency(false);
    setRate(''); setPayment(''); setNextPayment(''); setOriginal(''); setTarget('');
    setAssetId(fiAssets[0]?.id ?? ''); setDate(today); setNote(''); setError(null);
  });

  // Accounts another active Wealth balance already follows, so the same account is never added twice.
  const followedAccountIds = positions.filter((item) => !item.isArchived && item.linkedAccountId).map((item) => item.linkedAccountId as string);

  function submit() {
    setError(null);
    if (tab === 'contribution') {
      if (!assetId) return setError('Choose the asset the money went into.');
      if (!positiveMoney(amount) || Number(amount) <= 0) return setError('Enter the amount contributed.');
      onAddContribution({ wealthPositionId: assetId, contributionDate: date, amount: Number(amount).toFixed(2), note: note.trim() || null });
      return onClose();
    }
    if (tab === 'asset' && assetType === 'cpf') return submitCpf();
    if (!name.trim()) return setError(`Give the ${tab} a name.`);
    if (!positiveMoney(amount)) return setError(tab === 'asset' ? 'Enter its current value.' : 'Enter the amount owed today.');
    if (tab === 'debt' && original.trim() !== '' && (!positiveMoney(original) || Number(original) < Number(amount))) return setError(ORIGINAL_ERROR);
    if (tab === 'debt' && goalError(target, today)) return setError('Pay it off by: pick a month after this one.');
    const snapshot = { valueDate: today, amount: Number(amount).toFixed(2) };
    if (tab === 'asset') {
      // An Account links to the FireBuddy account with that name, or creates it (PRD 6.4.1, 5b).
      let accountId: string | null = null;
      let positionName = name.trim();
      if (assetType === 'cash') {
        const resolution = resolveAccountName(accounts, name, followedAccountIds);
        if (resolution.kind === 'taken') return setError(`${resolution.account.name} is already in Wealth. Edit that row instead.`);
        if (resolution.kind === 'link') {
          accountId = resolution.account.id;
          positionName = resolution.account.name;
        } else if (resolution.kind === 'create') {
          accountId = addAccount({ name: resolution.name, type: 'bank', color: categoryColors[0] }).id;
          positionName = resolution.name;
        }
      }
      onAddPosition({
        name: positionName, positionKind: 'asset', positionType: assetType, ...classifyWealthPosition(assetType, locked),
        includeInFi, isEmergencyFund: assetType === 'cash' && !locked ? emergency : false, currency: 'SGD',
        linkedAccountId: accountId,
      }, snapshot);
    } else {
      onAddPosition({
        name: name.trim(), positionKind: 'liability', positionType: debtType, ...classifyWealthPosition(debtType, false),
        includeInFi: false, isEmergencyFund: false, currency: 'SGD',
        interestRate: fractionFromPercent(rate), monthlyPayment: moneyOrNull(payment), nextPaymentDate: nextPayment || null,
        // Left empty, the balance today doubles as the original loan, so progress starts at 0% repaid.
        originalPrincipal: Number(original.trim() === '' ? amount : original).toFixed(2),
        payoffTargetMonth: target || null,
      }, snapshot);
    }
    onClose();
  }

  /**
   * Save each CPF account typed. An account already in Wealth gets a new dated value; a new one is
   * added under its own name, so OA, SA and MA each keep their own value.
   */
  function submitCpf() {
    const typed = CPF_ACCOUNT_OPTIONS.filter((option) => cpfValues[option.value].trim() !== '');
    if (!typed.length) return setError('Enter at least one CPF balance.');
    if (typed.some((option) => !positiveMoney(cpfValues[option.value]))) return setError('Enter each CPF balance as an amount.');
    for (const option of typed) {
      const snapshot = { valueDate: today, amount: Number(cpfValues[option.value]).toFixed(2) };
      const existing = positions.find((item) => !item.isArchived && item.positionType === 'cpf' && item.cpfAccount === option.value);
      if (existing) addSnapshot(existing.id, snapshot);
      else onAddPosition({ name: option.name, positionKind: 'asset', positionType: 'cpf', ...classifyWealthPosition('cpf', false), includeInFi, isEmergencyFund: false, currency: 'SGD', linkedAccountId: null, cpfAccount: option.value }, snapshot);
    }
    onClose();
  }

  const chosenAsset = fiAssets.find((item) => item.id === assetId);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add to your wealth"
      footer={<Button label={tab === 'asset' ? 'Add asset' : tab === 'debt' ? 'Add debt' : 'Save contribution'} block onPress={submit} disabled={tab === 'contribution' && fiAssets.length === 0} />}
    >
      <View style={styles.form}>
        <SegmentedControl<AddTab>
          options={[{ value: 'asset', label: 'Asset' }, { value: 'debt', label: 'Debt' }, { value: 'contribution', label: 'Contribution' }]}
          value={tab}
          onChange={(next) => { setTab(next); setError(null); }}
          accessibilityLabel="What to add"
        />
        {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}

        {tab === 'asset' ? (
          <>
            <TypePicker label="Type" kind="asset" value={assetType} options={assetTypesFor(isSingapore)} onChange={(next) => { setAssetType(next); setEmergency(false); }} />
            {assetType === 'cpf' ? (
              <>
                {CPF_ACCOUNT_OPTIONS.map((option) => (
                  <TextField
                    key={option.value}
                    label={`${option.label} (${currency})`}
                    optional
                    value={groupThousands(cpfValues[option.value])}
                    onChangeText={(text) => setCpfValues((current) => ({ ...current, [option.value]: sanitizeAmountInput(text) }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                ))}
                <AppText variant="caption" tone="ink2">Today’s balances from the CPF app. An account already in Wealth gets the new value.</AppText>
              </>
            ) : (
              <>
                {assetType === 'cash'
                  ? <AccountNameField value={name} onChange={setName} followedAccountIds={followedAccountIds} />
                  : <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Brokerage" maxLength={80} autoFocus />}
                <TextField label={assetType === 'cash' ? `Current balance (${currency})` : `Current value (${currency})`} value={amount} onChangeText={(text) => setAmount(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
              </>
            )}
            <ToggleRow label="Counts toward FI" help="Investable money you could spend in retirement." value={includeInFi} onChange={setIncludeInFi} />
            {assetType !== 'cpf' ? <ToggleRow label="Locked until retirement" help={lockedHelp(isSingapore)} value={locked} onChange={(next) => { setLocked(next); if (next) setEmergency(false); }} /> : null}
            {assetType === 'cash' && !locked ? <ToggleRow label="Emergency fund" help="Counted in your emergency runway on Home." value={emergency} onChange={setEmergency} /> : null}
          </>
        ) : null}

        {tab === 'debt' ? (
          <>
            <TextField label="Name" value={name} onChangeText={setName} placeholder={isSingapore ? 'e.g. HDB loan' : 'e.g. Home loan'} maxLength={80} autoFocus />
            <TypePicker label="Type" kind="liability" value={debtType} options={liabilityPositionTypes} onChange={setDebtType} />
            <TextField label={`Amount owed today (${currency})`} value={amount} onChangeText={(text) => setAmount(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
            <TextField label={`Original loan amount (${currency})`} optional value={original} onChangeText={(text) => setOriginal(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" help={ORIGINAL_HELP} />
            <RepaidHint original={original} owed={amount} />
            <AppText variant="caption" tone="ink2">Optional. Rate and payment let FireBuddy project when this debt is paid off.</AppText>
            <TextField label="Interest rate (% per year)" optional value={rate} onChangeText={(text) => setRate(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="2.6" />
            <TextField label={`Monthly payment (${currency})`} optional value={payment} onChangeText={(text) => setPayment(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
            <DateField label="Next payment date" value={nextPayment} onChange={setNextPayment} placeholder="Optional" />
            <MonthYearField key={open ? 'goal-open' : 'goal-closed'} label="Pay it off by" value={target} onChange={setTarget} help={GOAL_HELP} error={goalError(target, today)} />
            <GoalHint target={target} owed={amount} rate={rate} payment={payment} today={today} />
          </>
        ) : null}

        {tab === 'contribution' ? (
          <>
            <AppText variant="bodySmall" tone="ink2">Money you moved into an investment. Contributions never count as expenses. To change what the asset is worth now, edit the asset instead.</AppText>
            {fiAssets.length === 0 ? (
              <AppText variant="bodySmall" tone="warning">Add an asset that counts toward FI first.</AppText>
            ) : (
              <SelectField label="FI asset" value={chosenAsset?.name ?? ''} placeholder="Choose an asset" onPress={() => setAssetPickerOpen(true)} accessibilityLabel="FI asset" />
            )}
            <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
            <TextField label={`Amount (${currency})`} value={amount} onChangeText={(text) => setAmount(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
            <TextField label="Note" optional value={note} onChangeText={setNote} placeholder="e.g. Monthly investment" maxLength={240} />
            <ActionSheet
              open={assetPickerOpen}
              onClose={() => setAssetPickerOpen(false)}
              title="FI asset"
              actions={fiAssets.map((item) => ({ key: item.id, label: item.name, detail: typeLabel(item.positionType), selected: item.id === assetId, onSelect: () => { setAssetId(item.id); setAssetPickerOpen(false); } }))}
            />
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}

export interface PositionEditSheetProps {
  position: WealthPosition | null;
  latestAmount: string | null;
  latestDate: string | null;
  onClose: () => void;
  onSave: (id: string, changes: UpdateWealthPositionInput, snapshot: CreateWealthSnapshotInput | null) => void;
  /** Omitted for an account's automatic balance, which cannot be archived. */
  onArchive?: (id: string) => void;
}

/** Edit a position's details and, when the value or its date is touched, record a new dated value. */
export function PositionEditSheet({ position, latestAmount, latestDate, onClose, onSave, onArchive }: PositionEditSheetProps) {
  const { accounts, updateAccount } = useFireBuddy();
  const { currency } = usePrivacy();
  const { isSingapore } = useRegion();
  const today = getDeviceDateKey();
  const open = position !== null;
  const isLiability = position?.positionKind === 'liability';
  const [name, setName] = useState('');
  const [positionType, setPositionType] = useState<WealthPositionType>('cash');
  const [amount, setAmount] = useState('');
  const [valueDate, setValueDate] = useState(today);
  const [valueTouched, setValueTouched] = useState(false);
  const [includeInFi, setIncludeInFi] = useState(false);
  const [locked, setLocked] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [rate, setRate] = useState('');
  const [payment, setPayment] = useState('');
  const [nextPayment, setNextPayment] = useState('');
  const [originalLoan, setOriginalLoan] = useState('');
  const [goalMonth, setGoalMonth] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [cpfAccount, setCpfAccount] = useState<CpfAccount>('oa');
  const [error, setError] = useState<string | null>(null);

  // Reseed the form each time a position is opened for editing.
  useResetWhen(position?.id ?? null, () => {
    if (!position) return;
    setName(accounts.find((account) => account.id === position.linkedAccountId)?.name ?? position.name);
    setPositionType(position.positionType);
    setAmount(moneyText(latestAmount));
    setValueDate(today);
    setValueTouched(false);
    setIncludeInFi(position.includeInFi);
    setLocked(position.positionType !== 'cpf' && isLockedPosition(position));
    setEmergency(position.isEmergencyFund);
    setRate(percentText(position.interestRate));
    setPayment(moneyText(position.monthlyPayment));
    setNextPayment(position.nextPaymentDate ?? '');
    setOriginalLoan(moneyText(position.originalPrincipal));
    setGoalMonth(position.payoffTargetMonth ?? '');
    setLinkedAccountId(position.linkedAccountId ?? '');
    setCpfAccount(position.cpfAccount ?? 'oa');
    setError(null);
  });

  function submit() {
    if (!position) return;
    setError(null);
    const isCpf = !isLiability && positionType === 'cpf';
    if (!isCpf && !name.trim()) return setError('Give the position a name.');
    // A row that follows an account carries that account's name: renaming it renames the account.
    const followedAccount = position.linkedAccountId ? accounts.find((account) => account.id === position.linkedAccountId) : undefined;
    if (followedAccount && name.trim() !== followedAccount.name) {
      const clash = findAccountNamed(accounts, name, followedAccount.id);
      if (clash) return setError(`An account called ${clash.name} already exists.`);
      updateAccount(followedAccount.id, { name: name.replace(/\s+/g, ' ').trim() });
    }
    if (isLiability && originalLoan.trim() !== '' && (!positiveMoney(originalLoan) || (amount.trim() !== '' && Number(originalLoan) < Number(amount)))) return setError(ORIGINAL_ERROR);
    if (isLiability && goalError(goalMonth, today)) return setError('Pay it off by: pick a month after this one.');
    const full: UpdateWealthPositionInput = isLiability
      ? { name: name.trim(), positionType, ...classifyWealthPosition(positionType, false), interestRate: fractionFromPercent(rate), monthlyPayment: moneyOrNull(payment), nextPaymentDate: nextPayment || null, originalPrincipal: moneyOrNull(originalLoan), payoffTargetMonth: goalMonth || null }
      : { name: isCpf ? cpfName(cpfAccount) : name.trim(), positionType, ...classifyWealthPosition(positionType, locked), includeInFi, isEmergencyFund: positionType === 'cash' && !locked ? emergency : false, linkedAccountId: positionType === 'cash' && linkedAccountId ? linkedAccountId : null, cpfAccount: positionType === 'cpf' ? cpfAccount : null };
    const changes = Object.fromEntries(Object.entries(full).filter(([key, value]) => (position[key as keyof WealthPosition] ?? null) !== value)) as UpdateWealthPositionInput;
    const nextAmount = amount.trim() === '' ? null : Number(amount).toFixed(2);
    const valueChanged = valueTouched && nextAmount !== null && (latestAmount !== nextAmount || latestDate !== valueDate);
    // Linking counts only later transactions, so the value shown becomes today's starting balance.
    const linking = Boolean(changes.linkedAccountId) && nextAmount !== null;
    onSave(position.id, changes, valueChanged ? { valueDate, amount: nextAmount! } : linking ? { valueDate: today, amount: nextAmount! } : null);
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={position ? `Edit ${position.name}` : 'Edit position'}
      footer={(
        <View style={styles.footer}>
          {onArchive ? <Button label="Archive" variant="secondary" onPress={() => position && onArchive(position.id)} /> : null}
          <Button label="Save changes" block style={styles.grow} onPress={submit} />
        </View>
      )}
    >
      <View style={styles.form}>
        {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
        {!isLiability && positionType === 'cpf' ? null : <TextField label={position?.linkedAccountId ? 'Account name' : 'Name'} value={name} onChangeText={setName} maxLength={80} help={position?.linkedAccountId ? 'Renames the account everywhere, including transactions.' : undefined} />}
        <TypePicker label="Type" kind={isLiability ? 'liability' : 'asset'} value={positionType} options={isLiability ? liabilityPositionTypes : assetTypesFor(isSingapore, position?.positionType)} onChange={setPositionType} />
        {!isLiability && positionType === 'cpf' ? <CpfAccountField value={cpfAccount} onChange={setCpfAccount} /> : null}
        <View style={styles.group}>
          <AppText variant="label">{isLiability ? 'Balance owed' : 'Current value'}</AppText>
          <AppText variant="caption" tone="ink2">A new value is saved as today’s and FIRE Planner uses it straight away.</AppText>
          <TextField label={isLiability ? `Amount owed (${currency})` : `Value (${currency})`} value={amount} onChangeText={(text) => { setAmount(sanitizeAmountInput(text)); setValueTouched(true); }} keyboardType="decimal-pad" placeholder="0.00" />
        </View>
        {isLiability ? (
          <View style={styles.group}>
            <AppText variant="label">Debt terms</AppText>
            <TextField label={`Original loan amount (${currency})`} optional value={originalLoan} onChangeText={(text) => setOriginalLoan(sanitizeAmountInput(text))} keyboardType="decimal-pad" help={ORIGINAL_HELP} />
            <RepaidHint original={originalLoan} owed={amount} />
            <TextField label="Interest rate (% per year)" optional value={rate} onChangeText={(text) => setRate(sanitizeAmountInput(text))} keyboardType="decimal-pad" />
            <TextField label={`Monthly payment (${currency})`} optional value={payment} onChangeText={(text) => setPayment(sanitizeAmountInput(text))} keyboardType="decimal-pad" />
            <DateField label="Next payment date" value={nextPayment} onChange={setNextPayment} placeholder="Optional" />
            {/* Keyed by position so the month picker starts from the saved goal each time the sheet opens. */}
            <MonthYearField key={position?.id ?? 'none'} label="Pay it off by" value={goalMonth} onChange={setGoalMonth} help={GOAL_HELP} error={goalError(goalMonth, today)} />
            <GoalHint target={goalMonth} owed={amount} rate={rate} payment={payment} today={today} />
          </View>
        ) : (
          <View style={styles.group}>
            <ToggleRow label="Counts toward FI" help="Investable money you could spend in retirement." value={includeInFi} onChange={setIncludeInFi} />
            {positionType !== 'cpf' ? <ToggleRow label="Locked until retirement" help={lockedHelp(isSingapore)} value={locked} onChange={(next) => { setLocked(next); if (next) setEmergency(false); }} /> : null}
            {positionType === 'cash' && !locked ? <ToggleRow label="Emergency fund" help="Counted in your emergency runway on Home." value={emergency} onChange={setEmergency} /> : null}
            {/* Older cash rows with no account can still be linked; an Account row is tied by name. */}
            {positionType === 'cash' && !position?.linkedAccountId ? <LinkedAccountField value={linkedAccountId} onChange={setLinkedAccountId} positionId={position?.id} /> : null}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  labelLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
});
