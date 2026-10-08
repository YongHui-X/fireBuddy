import type { WealthPositionKind, WealthPositionType } from '@firebuddy/shared';
import { CreditCard, Gem, HandCoins, House, KeyRound, PiggyBank, Receipt, TrendingUp, Wallet, type LucideIcon } from 'lucide-react-native';

const ICONS: Record<Exclude<WealthPositionType, 'other'>, LucideIcon> = {
  cash: Wallet,
  investment: TrendingUp,
  property: House,
  cpf: PiggyBank,
  mortgage: KeyRound,
  loan: HandCoins,
  credit_card: CreditCard,
};

/** The icon for an asset or debt type; "Other" differs by side so a stray debt never looks like an asset. */
export function positionIcon(type: WealthPositionType, kind: WealthPositionKind): LucideIcon {
  if (type === 'other') return kind === 'liability' ? Receipt : Gem;
  return ICONS[type];
}
