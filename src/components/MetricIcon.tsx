import { Baby, Banknote, Briefcase, HandCoins, PiggyBank, ShoppingCart, User, UserPlus, Wallet, type LucideIcon } from 'lucide-react';
import type { MetricId } from '../domain/metrics.ts';

/** Same meaning as the 2017 icons (person, group_add, child_care, business_center, money, piggy bank). */
const ICONS: Record<MetricId, LucideIcon> = {
  population: User,
  totalIncreaseRate: UserPlus,
  naturalIncreaseRate: Baby,
  socialIncreaseRate: Briefcase,
  disposableIncome: Banknote,
  savings: PiggyBank,
  incomeReceipts: Wallet,
  totalIncome: HandCoins,
  consumption: ShoppingCart,
};

export function MetricIcon({ metric, className }: { metric: MetricId; className?: string }) {
  const Icon = ICONS[metric];
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
