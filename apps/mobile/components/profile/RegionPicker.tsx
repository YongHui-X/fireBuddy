import { CURRENCIES, currencyForCountry, currencyPrefix, findCountry, isSingapore, searchCountries } from '@firebuddy/shared';
import { Check, Coins } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';

import { radii, spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { ActionSheet } from '../ui/ActionSheet';
import { AppText } from '../ui/Text';
import { SelectField, TextField } from '../ui/TextField';

export interface RegionChoice {
  country: string;
  currency: string;
}

/**
 * Country field plus the currency, pre-filled from the country and changeable. The chosen country
 * sits in the field; tapping it opens a searchable list (Singapore first) that closes on a pick. Used by the welcome and by Profile. Presentation only: the caller saves the choice.
 */
export function RegionPicker({ value, onChange }: { value: RegionChoice; onChange: (next: RegionChoice) => void }) {
  const { theme } = useTheme();
  const input = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const matches = searchCountries(query);
  const selected = findCountry(value.country);
  const listOpen = searching || !selected;

  const pick = (code: string) => {
    // Changing country resets the currency to that country's own; the user can still override it below.
    onChange({ country: code, currency: currencyForCountry(code) });
    setQuery('');
    setSearching(false);
    input.current?.blur();
  };

  return (
    <View style={styles.root}>
      <TextField
        ref={input}
        label="Country"
        placeholder="Search countries"
        value={listOpen ? query : selected.name}
        onFocus={() => setSearching(true)}
        onChangeText={(text) => {
          setQuery(text);
          setSearching(true);
        }}
        autoCorrect={false}
      />
      {/* Its own scroll area inside the screen's, so the long list never pushes Continue off screen. */}
      {listOpen ? <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        style={[styles.list, { borderColor: theme.line, backgroundColor: theme.surface }]}
        accessibilityRole="radiogroup"
      >
        {matches.length === 0 ? (
          <AppText variant="bodySmall" tone="ink2" style={styles.empty}>No country matches “{query.trim()}”.</AppText>
        ) : matches.map((country, index) => {
          const active = country.code === selected?.code;
          return (
            <Pressable
              key={country.code}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => pick(country.code)}
              style={[
                styles.row,
                index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line } : null,
                active ? { backgroundColor: theme.accentSoft } : null,
              ]}
            >
              <AppText variant={active ? 'bodySemibold' : 'body'} style={styles.name}>{country.name}</AppText>
              <AppText variant="caption" tone="ink3">{country.currency}</AppText>
              {active ? <Check size={18} color={theme.accentText} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
      </ScrollView> : null}
      <SelectField
        label="Currency"
        icon={Coins}
        value={`${value.currency} · ${currencyPrefix(value.currency).trim()}`}
        help={isSingapore(value.country)
          ? 'Singapore gets CPF, SRS and HDB tools.'
          : 'Outside Singapore, FireBuddy keeps things general: no CPF, SRS or HDB.'}
        onPress={() => setCurrencyOpen(true)}
      />
      <ActionSheet
        open={currencyOpen}
        onClose={() => setCurrencyOpen(false)}
        title="Currency"
        description="Every amount in FireBuddy is shown in this currency."
        actions={CURRENCIES.map((code) => ({
          key: code,
          label: code,
          detail: currencyPrefix(code).trim(),
          selected: code === value.currency,
          onSelect: () => onChange({ ...value, currency: code }),
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    overflow: 'hidden',
    maxHeight: 300,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  name: {
    flex: 1,
  },
  empty: {
    padding: spacing.md,
  },
});
