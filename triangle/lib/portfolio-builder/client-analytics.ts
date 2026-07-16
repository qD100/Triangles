import { CATEGORY_LABELS, SUPER_CATEGORY_LABELS } from "./constants";
import type {
  ClientAnnualSummary,
  ClientProfile,
  ClientTransaction,
  SuperCategory,
  TransactionCategory,
} from "./types";

export function buildClientAnnualSummary(
  profile: ClientProfile,
  allTransactions: ClientTransaction[]
): ClientAnnualSummary {
  const clientTx = allTransactions.filter((t) => t.clientId === profile.id);

  const spendByCategory = Object.fromEntries(
    Object.keys(CATEGORY_LABELS).map((category) => [category, 0])
  ) as Record<TransactionCategory, number>;
  const spendBySuperCategory = Object.fromEntries(
    Object.keys(SUPER_CATEGORY_LABELS).map((category) => [category, 0])
  ) as Record<SuperCategory, number>;

  let totalDeposits = 0;
  let totalWithdrawals = 0;

  for (const t of clientTx) {
    if (t.type === "deposit") {
      totalDeposits += t.amount;
    } else {
      totalWithdrawals += t.amount;
    }
    spendByCategory[t.category] += t.amount;
    spendBySuperCategory[t.superCategory] += t.amount;
  }

  const monthlyEssentialSpend = spendBySuperCategory.basic_needs / 12;
  const debtToIncomeRatio =
    profile.baseSalary > 0 ? profile.monthlyInstallment / profile.baseSalary : null;
  const emergencyFundCoverageMonths =
    monthlyEssentialSpend > 0 ? profile.emergencyFund / monthlyEssentialSpend : null;

  return {
    year: 2024,
    totalDeposits,
    totalWithdrawals,
    netCashFlow: totalDeposits - totalWithdrawals,
    transactionCount: clientTx.length,
    spendByCategory,
    spendBySuperCategory,
    monthlyEssentialSpend,
    debtToIncomeRatio,
    emergencyFundCoverageMonths,
  };
}
