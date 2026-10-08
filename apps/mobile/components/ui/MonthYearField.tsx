import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/tokens';

import { ActionSheet } from './ActionSheet';
import { AppText } from './Text';
import { SelectField, TextField } from './TextField';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface MonthYearFieldProps {
  label: string;
  /** "YYYY-MM", or '' while incomplete. */
  value: string;
  onChange: (value: string) => void;
  help?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * A month as a typed year plus a month picked from a list, so a month above 12 (or a stray
 * "2026-1") can never be entered. Emits "YYYY-MM" once both parts are set, '' until then.
 */
export function MonthYearField({ label, value, onChange, help, error, style }: MonthYearFieldProps) {
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const [year, setYear] = useState(valid ? value.slice(0, 4) : '');
  const [month, setMonth] = useState<number | null>(valid ? Number(value.slice(5, 7)) : null);
  const [picker, setPicker] = useState(false);

  const emit = (nextYear: string, nextMonth: number | null) => {
    onChange(/^\d{4}$/.test(nextYear) && nextMonth ? `${nextYear}-${String(nextMonth).padStart(2, '0')}` : '');
  };

  return (
    <View style={[styles.root, style]}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        <TextField
          accessibilityLabel={`${label} year`}
          placeholder="Year"
          value={year}
          onChangeText={(text) => {
            const next = text.replace(/\D/g, '').slice(0, 4);
            setYear(next);
            emit(next, month);
          }}
          keyboardType="number-pad"
          maxLength={4}
          style={styles.year}
        />
        <SelectField
          accessibilityLabel={`${label} month`}
          value={month ? MONTHS[month - 1] : ''}
          placeholder="Month"
          icon={CalendarDays}
          onPress={() => setPicker(true)}
          style={styles.month}
        />
      </View>
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : help ? <AppText variant="caption" tone="ink3">{help}</AppText> : null}
      <ActionSheet
        open={picker}
        onClose={() => setPicker(false)}
        title={label}
        actions={MONTHS.map((name, index) => ({
          key: name,
          label: name,
          selected: month === index + 1,
          onSelect: () => {
            setMonth(index + 1);
            emit(year, index + 1);
          },
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  year: {
    width: 104,
  },
  month: {
    flex: 1,
  },
});
