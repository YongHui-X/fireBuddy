import {
  assetPositionTypes,
  classifyWealthPosition,
  formatShortDate,
  getDeviceDateKey,
  isLockedPosition,
  liabilityPositionTypes,
  sanitizeAmountInput,
  wealthTypeLabels,
  type CreateWealthContributionInput,
  type CreateWealthPositionInput,
  type CreateWealthSnapshotInput,
  type UpdateWealthPositionInput,
  type WealthPosition,
  type WealthPositionType,
} from '@firebuddy/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/tokens';
import { usePrivacy } from '@/lib/privacy';

import { ActionSheet } from '../ui/ActionSheet';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
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

/** Type picker built from a select field and an action sheet, so it reads the same as the other pickers. */
function TypePicker({ label, value, options, onChange }: { label: string; value: WealthPositionType; options: readonly WealthPositionType[]; onChange: (value: WealthPositionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SelectField label={label} value={wealthTypeLabels[value]} onPress={() => setOpen(true)} accessibilityLabel={label} />
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        actions={options.map((option) => ({ key: option, label: wealthTypeLabels[option], selected: option === value, onSelect: () => { onChange(option); setOpen(false); } }))}
      />
    </>
  );
}

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
  const [tab, setTab] = useState<AddTab>(initialTab);
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
  const [assetId, setAssetId] = useState('');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setName(''); setAssetType('cash'); setDebtType('loan'); setAmount('');
    setIncludeInFi(true); setLocked(false); setEmergency(false);
    setRate(''); setPayment(''); setNextPayment('');
    setAssetId(fiAssets[0]?.id ?? ''); setDate(today); setNote(''); setError(null);
  }, [open, initialTab, fiAssets, today]);

  function submit() {
    setError(null);
    if (tab === 'contribution') {
      if (!assetId) return setError('Choose the asset the money went into.');
      if (!positiveMoney(amount) || Number(amount) <= 0) return setError('Enter the amount contributed.');
      onAddContribution({ wealthPositionId: assetId, contributionDate: date, amount: Number(amount).toFixed(2), note: note.trim() || null });
      return onClose();
    }
    if (!name.trim()) return setError(`Give the ${tab} a name.`);
    if (!positiveMoney(amount)) return setError(tab === 'asset' ? 'Enter its current value.' : 'Enter the amount owed today.');
    const snapshot = { valueDate: today, amount: Number(amount).toFixed(2) };
    if (tab === 'asset') {
      onAddPosition({
        name: name.trim(), positionKind: 'asset', positionType: assetType, ...classifyWealthPosition(assetType, locked),
        includeInFi, isEmergencyFund: assetType === 'cash' && !locked ? emergency : false, currency: 'SGD',
      }, snapshot);
    } else {
      onAddPosition({
        name: name.trim(), positionKind: 'liability', positionType: debtType, ...classifyWealthPosition(debtType, false),
        includeInFi: false, isEmergencyFund: false, currency: 'SGD',
        interestRate: fractionFromPercent(rate), monthlyPayment: moneyOrNull(payment), nextPaymentDate: nextPayment || null,
        // The first recorded balance doubles as the original principal so repayment progress can be shown.
        originalPrincipal: Number(amount).toFixed(2),
      }, snapshot);
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
            <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Brokerage" maxLength={80} autoFocus />
            <TypePicker label="Type" value={assetType} options={assetPositionTypes} onChange={(next) => { setAssetType(next); setEmergency(false); }} />
            <TextField label="Current value (SGD)" value={amount} onChangeText={(text) => setAmount(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
            <ToggleRow label="Counts toward FI" help="Investable money you could spend in retirement." value={includeInFi} onChange={setIncludeInFi} />
            {assetType !== 'cpf' ? <ToggleRow label="Locked until retirement" help="SRS and similar schemes you cannot draw on early." value={locked} onChange={(next) => { setLocked(next); if (next) setEmergency(false); }} /> : null}
            {assetType === 'cash' && !locked ? <ToggleRow label="Emergency fund" help="Counted in your emergency runway on Home." value={emergency} onChange={setEmergency} /> : null}
          </>
        ) : null}

        {tab === 'debt' ? (
          <>
            <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. HDB loan" maxLength={80} autoFocus />
            <TypePicker label="Type" value={debtType} options={liabilityPositionTypes} onChange={setDebtType} />
            <TextField label="Amount owed today (SGD)" value={amount} onChangeText={(text) => setAmount(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
            <AppText variant="caption" tone="ink2">Optional. Rate and payment let FireBuddy project when this debt is paid off.</AppText>
            <TextField label="Interest rate (% per year)" optional value={rate} onChangeText={(text) => setRate(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="2.6" />
            <TextField label="Monthly payment (SGD)" optional value={payment} onChangeText={(text) => setPayment(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
            <DateField label="Next payment date" value={nextPayment} onChange={setNextPayment} placeholder="Optional" />
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
            <TextField label="Amount (SGD)" value={amount} onChangeText={(text) => setAmount(sanitizeAmountInput(text))} keyboardType="decimal-pad" placeholder="0.00" />
            <TextField label="Note" optional value={note} onChangeText={setNote} placeholder="e.g. Monthly investment" maxLength={240} />
            <ActionSheet
              open={assetPickerOpen}
              onClose={() => setAssetPickerOpen(false)}
              title="FI asset"
              actions={fiAssets.map((item) => ({ key: item.id, label: item.name, detail: wealthTypeLabels[item.positionType], selected: item.id === assetId, onSelect: () => { setAssetId(item.id); setAssetPickerOpen(false); } }))}
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
  onArchive: (id: string) => void;
}

/** Edit a position's details and, when the value or its date is touched, record a new dated value. */
export function PositionEditSheet({ position, latestAmount, latestDate, onClose, onSave, onArchive }: PositionEditSheetProps) {
  const { money } = usePrivacy();
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;
    setName(position.name);
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
    setError(null);
  }, [position, latestAmount, today]);

  function submit() {
    if (!position) return;
    setError(null);
    if (!name.trim()) return setError('Give the position a name.');
    const full: UpdateWealthPositionInput = isLiability
      ? { name: name.trim(), positionType, ...classifyWealthPosition(positionType, false), interestRate: fractionFromPercent(rate), monthlyPayment: moneyOrNull(payment), nextPaymentDate: nextPayment || null }
      : { name: name.trim(), positionType, ...classifyWealthPosition(positionType, locked), includeInFi, isEmergencyFund: positionType === 'cash' && !locked ? emergency : false };
    const changes = Object.fromEntries(Object.entries(full).filter(([key, value]) => position[key as keyof WealthPosition] !== value)) as UpdateWealthPositionInput;
    const nextAmount = amount.trim() === '' ? null : Number(amount).toFixed(2);
    const valueChanged = valueTouched && nextAmount !== null && (latestAmount !== nextAmount || latestDate !== valueDate);
    onSave(position.id, changes, valueChanged ? { valueDate, amount: nextAmount! } : null);
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={position ? `Edit ${position.name}` : 'Edit position'}
      footer={(
        <View style={styles.footer}>
          <Button label="Archive" variant="secondary" onPress={() => position && onArchive(position.id)} />
          <Button label="Save changes" block style={styles.grow} onPress={submit} />
        </View>
      )}
    >
      <View style={styles.form}>
        {error ? <AppText variant="bodySmall" tone="danger">{error}</AppText> : null}
        <TextField label="Name" value={name} onChangeText={setName} maxLength={80} />
        <TypePicker label="Type" value={positionType} options={isLiability ? liabilityPositionTypes : assetPositionTypes} onChange={setPositionType} />
        <View style={styles.group}>
          <AppText variant="label">{isLiability ? 'Balance owed' : 'Current value'}</AppText>
          <AppText variant="caption" tone="ink2">
            {latestAmount ? `Last recorded ${money(Number(latestAmount), 0)} on ${latestDate ? formatShortDate(latestDate) : ''}. ` : 'No dated value yet. '}
            Change the value, or just the date to confirm it is still current, and it is saved as a new dated entry that FIRE Planner uses straight away.
          </AppText>
          <TextField label={isLiability ? 'Amount owed (SGD)' : 'Value (SGD)'} value={amount} onChangeText={(text) => { setAmount(sanitizeAmountInput(text)); setValueTouched(true); }} keyboardType="decimal-pad" placeholder="0.00" />
          <DateField label="As of" value={valueDate} onChange={(next) => { setValueDate(next); setValueTouched(true); }} maximumDate={new Date()} />
        </View>
        {isLiability ? (
          <View style={styles.group}>
            <AppText variant="label">Debt terms</AppText>
            <TextField label="Interest rate (% per year)" optional value={rate} onChangeText={(text) => setRate(sanitizeAmountInput(text))} keyboardType="decimal-pad" />
            <TextField label="Monthly payment (SGD)" optional value={payment} onChangeText={(text) => setPayment(sanitizeAmountInput(text))} keyboardType="decimal-pad" />
            <DateField label="Next payment date" value={nextPayment} onChange={setNextPayment} placeholder="Optional" />
          </View>
        ) : (
          <View style={styles.group}>
            <ToggleRow label="Counts toward FI" help="Investable money you could spend in retirement." value={includeInFi} onChange={setIncludeInFi} />
            {positionType !== 'cpf' ? <ToggleRow label="Locked until retirement" help="SRS and similar schemes you cannot draw on early." value={locked} onChange={(next) => { setLocked(next); if (next) setEmergency(false); }} /> : null}
            {positionType === 'cash' && !locked ? <ToggleRow label="Emergency fund" help="Counted in your emergency runway on Home." value={emergency} onChange={setEmergency} /> : null}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
