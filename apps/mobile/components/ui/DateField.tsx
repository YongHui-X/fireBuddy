import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatLongDate, getDeviceDateKey } from '@firebuddy/shared';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/tokens';
import { useTheme } from '@/lib/theme';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { SelectField } from './TextField';

export interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (dateKey: string) => void;
  placeholder?: string;
  error?: string | null;
  maximumDate?: Date;
  style?: StyleProp<ViewStyle>;
}

function toDate(dateKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? new Date(`${dateKey}T00:00:00`) : new Date();
}

/** Native date pickers: the Android dialog opens imperatively, iOS shows its inline calendar in a sheet. */
export function DateField({ label, value, onChange, placeholder = 'Choose a date', error, maximumDate, style }: DateFieldProps) {
  const { theme } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(() => toDate(value));

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'date',
        maximumDate,
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === 'set' && date) onChange(getDeviceDateKey(date));
        },
      });
      return;
    }
    setIosDraft(toDate(value));
    setIosOpen(true);
  };

  return (
    <>
      <SelectField label={label} value={value ? formatLongDate(value) : ''} placeholder={placeholder} icon={CalendarDays} error={error} onPress={open} style={style} accessibilityLabel={label ?? 'Date'} />
      {Platform.OS !== 'android' ? (
        <BottomSheet
          open={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label ?? 'Date'}
          scroll={false}
          footer={(
            <View style={styles.footer}>
              <Button label="Done" variant="primary" block onPress={() => { onChange(getDeviceDateKey(iosDraft)); setIosOpen(false); }} />
              {value ? <Button label="Clear" variant="text" block onPress={() => { onChange(''); setIosOpen(false); }} /> : null}
            </View>
          )}
        >
          <DateTimePicker
            value={iosDraft}
            mode="date"
            display="inline"
            maximumDate={maximumDate}
            accentColor={theme.accent}
            themeVariant={undefined}
            onChange={(_event, date) => date && setIosDraft(date)}
          />
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.xs,
  },
});
