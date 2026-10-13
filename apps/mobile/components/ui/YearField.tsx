import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { TextField } from './TextField';

export interface YearFieldProps {
  label: string;
  /** "YYYY-MM", or '' while incomplete. */
  value: string;
  onChange: (value: string) => void;
  /** Month used when the value has none yet, "01" to "12". Defaults to January. */
  month?: string;
  help?: string;
  info?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * A year only, for planner dates where the month adds nothing (owner, 10 Oct 2026). Stores a
 * "YYYY-MM" so the engine is unchanged: an existing value keeps its month, a new one uses `month`.
 * Emits '' until four digits are typed.
 */
export function YearField({ label, value, onChange, month = '01', help, info, error, style }: YearFieldProps) {
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const [year, setYear] = useState(valid ? value.slice(0, 4) : '');
  // A year set from outside (such as an auto-filled loan end) shows up; a half-typed year emits ''
  // and is left alone.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (valid && value.slice(0, 4) !== year) setYear(value.slice(0, 4));
  }
  const keptMonth = valid ? value.slice(5, 7) : month;
  return (
    <TextField
      label={label}
      placeholder="e.g. 1990"
      value={year}
      onChangeText={(text) => {
        const next = text.replace(/\D/g, '').slice(0, 4);
        setYear(next);
        onChange(/^\d{4}$/.test(next) ? `${next}-${keptMonth}` : '');
      }}
      keyboardType="number-pad"
      maxLength={4}
      help={help}
      info={info}
      error={error}
      style={style}
    />
  );
}
