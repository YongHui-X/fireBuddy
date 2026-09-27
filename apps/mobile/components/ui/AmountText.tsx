import { formatSGD, type TransactionType } from '@firebuddy/shared';

import { AppText, type AppTextProps } from './Text';

export interface AmountTextProps extends Omit<AppTextProps, 'children' | 'tone'> {
  amount: number | string;
  transactionType: TransactionType;
  digits?: number;
  /** Hides the +/- prefix where the context already says which it is. */
  signed?: boolean;
}

/** Signed SGD figure coloured by direction: income green, expense red, tabular numerals. */
export function AmountText({ amount, transactionType, digits = 2, signed = true, variant = 'amount', ...rest }: AmountTextProps) {
  const prefix = signed ? `${transactionType === 'income' ? '+' : '-'} ` : '';
  return (
    <AppText {...rest} variant={variant} tone={transactionType === 'income' ? 'income' : 'expense'}>
      {prefix}{formatSGD(amount, digits)}
    </AppText>
  );
}
