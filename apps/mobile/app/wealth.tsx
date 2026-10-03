import { formatShortDate, type WealthPosition } from '@firebuddy/shared';
import { useRouter } from 'expo-router';
import { Landmark, Plus, Trash2, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { PositionRow } from '@/components/wealth/PositionRow';
import { PositionEditSheet, WealthAddSheet, type AddTab } from '@/components/wealth/WealthSheets';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { AppText } from '@/components/ui/Text';
import { layout, spacing } from '@/constants/tokens';
import { useWealth } from '@/hooks/use-wealth';
import { useFireBuddy } from '@/lib/fire-buddy-store';
import { usePrivacy } from '@/lib/privacy';
import { useTheme } from '@/lib/theme';

/**
 * Balance sheet positions, separate from payment accounts and transactions. Every value is a
 * dated snapshot; FIRE Planner reads the latest one for each asset in the plan, so an edit here
 * flows straight into the projection.
 */
export default function WealthScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { money, percent } = usePrivacy();
  const wealth = useWealth();
  const { addPosition, updatePosition, archivePosition, addSnapshot, deleteSnapshot, addContribution, deleteContribution, notify } = useFireBuddy();
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('asset');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editing, setEditing] = useState<WealthPosition | null>(null);
  const [archiving, setArchiving] = useState<WealthPosition | null>(null);
  const [removing, setRemoving] = useState<(typeof wealth.history)[number] | null>(null);

  const openAdd = (tab: AddTab) => {
    setAddTab(tab);
    setAddMenuOpen(false);
    setAddOpen(true);
  };
  const assetShare = wealth.assetTotal + wealth.liabilityTotal > 0 ? wealth.assetTotal / (wealth.assetTotal + wealth.liabilityTotal) : 0;
  const editingLatest = editing ? wealth.latest.get(editing.id) : undefined;

  return (
    <Screen>
      <PageToolbar
        title="Wealth"
        description="What you own and what you owe, valued on dates you choose."
        onBack={() => router.back()}
        trailing={<IconButton icon={Plus} tone="bordered" accessibilityLabel="Add to your wealth" onPress={() => setAddMenuOpen(true)} />}
      />

      <Card tone="hero" style={styles.hero}>
        <AppText variant="overline" tone="heroMuted">Net worth</AppText>
        <AppText variant="heroFigure" tone="hero">{wealth.active.length ? money(wealth.netWorth, 0) : '—'}</AppText>
        <AppText variant="caption" tone="heroMuted">
          {!wealth.active.length ? 'Add your first asset or debt to begin.' : wealth.missingValues ? `${wealth.missingValues} position${wealth.missingValues === 1 ? ' has' : 's have'} no value yet.` : 'Assets less debts, at their latest recorded values.'}
        </AppText>
        <ProgressTrack value={assetShare} color={theme.railActiveInk} height={8} keepColorWhenOver style={styles.heroTrack} accessibilityLabel={`${percent(assetShare)} of your balance sheet is assets`} />
        <View style={[styles.heroMeta, { borderTopColor: theme.heroLine }]}>
          <View style={styles.heroMetaItem}>
            <AppText variant="overline" tone="heroMuted">Assets</AppText>
            <AppText variant="amount" tone="hero">{money(wealth.assetTotal, 0)}</AppText>
            <AppText variant="caption" tone="heroMuted">{wealth.assets.length} position{wealth.assets.length === 1 ? '' : 's'}</AppText>
          </View>
          <View style={styles.heroMetaItem}>
            <AppText variant="overline" tone="heroMuted">Debts</AppText>
            <AppText variant="amount" tone="hero">{wealth.liabilities.length ? `−${money(wealth.liabilityTotal, 0)}` : 'None'}</AppText>
            <AppText variant="caption" tone="heroMuted">{wealth.liabilities.length ? `${wealth.liabilities.length} liabilit${wealth.liabilities.length === 1 ? 'y' : 'ies'}` : 'No debt recorded'}</AppText>
          </View>
        </View>
      </Card>

      <Card padded={false}>
        <CardHeader title="Assets" subtitle={wealth.assets.length ? money(wealth.assetTotal, 0) : 'Nothing recorded yet'} style={styles.listHeader} action={<Button label="Add" variant="text" size="compact" icon={TrendingUp} onPress={() => openAdd('asset')} />} />
        {wealth.assetRows.length === 0 ? (
          <AppText variant="bodySmall" tone="ink2" style={styles.emptyCopy}>Add cash, investments, property or CPF.</AppText>
        ) : wealth.assetRows.map((row, index) => <PositionRow key={row.position.id} row={row} first={index === 0} onPress={() => setEditing(row.position)} />)}
      </Card>

      <Card padded={false}>
        <CardHeader title="Debts" subtitle={wealth.liabilities.length ? `−${money(wealth.liabilityTotal, 0)}` : 'No debt recorded'} style={styles.listHeader} action={<Button label="Add" variant="text" size="compact" icon={Landmark} onPress={() => openAdd('debt')} />} />
        {wealth.liabilityRows.length === 0 ? (
          <AppText variant="bodySmall" tone="ink2" style={styles.emptyCopy}>Add a mortgage, loan or credit card to track its balance and payoff.</AppText>
        ) : wealth.liabilityRows.map((row, index) => <PositionRow key={row.position.id} row={row} first={index === 0} onPress={() => setEditing(row.position)} />)}
      </Card>

      <Card padded={false}>
        <CardHeader title="Recent updates" subtitle="Dated values and contributions" style={styles.listHeader} />
        {wealth.history.length === 0 ? (
          <AppText variant="bodySmall" tone="ink2" style={styles.emptyCopy}>Dated values and contributions will appear here.</AppText>
        ) : wealth.history.map((item, index) => (
          <View key={`${item.kind}-${item.id}`} style={[styles.historyRow, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null]}>
            <View style={styles.historyCopy}>
              <AppText variant="bodyMedium" numberOfLines={1}>{wealth.positionName(item.positionId)}</AppText>
              <AppText variant="caption" tone="ink2">{item.kind === 'value' ? 'Value' : 'Contribution'} · {formatShortDate(item.date)}</AppText>
            </View>
            <AppText variant="amount">{money(Number(item.amount), 0)}</AppText>
            <IconButton icon={Trash2} size="compact" iconSize={17} accessibilityLabel={`Delete ${item.kind}`} onPress={() => setRemoving(item)} />
          </View>
        ))}
      </Card>

      <ActionSheet
        open={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
        title="Add to your wealth"
        actions={[
          { label: 'Add asset', detail: 'Cash, investments, property or CPF', icon: TrendingUp, onSelect: () => openAdd('asset') },
          { label: 'Add debt', detail: 'Mortgage, loan or credit card', icon: Landmark, onSelect: () => openAdd('debt') },
          { label: 'Record contribution', detail: 'Money moved into an FI asset', icon: Plus, onSelect: () => openAdd('contribution'), disabled: wealth.fiAssets.length === 0 },
        ]}
      />
      <WealthAddSheet
        open={addOpen}
        initialTab={addTab}
        fiAssets={wealth.fiAssets}
        onClose={() => setAddOpen(false)}
        onAddPosition={(input, snapshot) => { addPosition(input, snapshot); notify(`${input.name} added.`); }}
        onAddContribution={(input) => { addContribution(input); notify('Contribution recorded.'); }}
      />
      <PositionEditSheet
        position={editing}
        latestAmount={editingLatest?.amount ?? null}
        latestDate={editingLatest?.valueDate ?? null}
        onClose={() => setEditing(null)}
        onSave={(id, changes, snapshot) => {
          if (Object.keys(changes).length) updatePosition(id, changes);
          if (snapshot) addSnapshot(id, snapshot);
          notify('Changes saved.');
        }}
        onArchive={(id) => setArchiving(wealth.active.find((item) => item.id === id) ?? null)}
      />
      <ConfirmDialog
        open={Boolean(archiving)}
        title="Archive position?"
        message={archiving ? `“${archiving.name}” leaves your net worth and the FIRE plan. Its history is kept.` : ''}
        confirmLabel="Archive"
        onCancel={() => setArchiving(null)}
        onConfirm={() => {
          if (archiving) {
            archivePosition(archiving.id);
            setEditing(null);
            notify(`${archiving.name} archived.`);
          }
          setArchiving(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title={removing?.kind === 'value' ? 'Delete this value?' : 'Delete this contribution?'}
        message={removing ? `${money(Number(removing.amount), 0)} on ${formatShortDate(removing.date)} will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            if (removing.kind === 'value') deleteSnapshot(removing.id);
            else deleteContribution(removing.id);
            notify(removing.kind === 'value' ? 'Value deleted.' : 'Contribution deleted.');
          }
          setRemoving(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 22,
    gap: 4,
  },
  heroTrack: {
    marginTop: spacing.md,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heroMetaItem: {
    flex: 1,
    gap: 2,
  },
  listHeader: {
    paddingHorizontal: layout.cardPad,
    paddingTop: layout.cardPad,
    marginBottom: spacing.sm,
  },
  emptyCopy: {
    paddingHorizontal: layout.cardPad,
    paddingBottom: layout.cardPad,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  historyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
