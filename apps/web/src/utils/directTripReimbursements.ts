import type { TripCostMember, TripCostRow } from "../api/tripCosts";
import { roundTripMoney } from "./tripCostAccounting";
export type DirectReimbursement = {
  from: TripCostMember; to: TripCostMember; amount: number;
  costs: { costId: string; title: string; label: string; date: string | null; amount: number }[];
};
// Keep the original expense relationships; do not route debt through unrelated members.
export function directTripReimbursements(rows: TripCostRow[]): DirectReimbursement[] {
  const groups = new Map<string, DirectReimbursement>();
  for (const row of rows) {
    if (row.paymentMode !== "PAID_BY_ONE" || !row.paidByMemberId || !row.paidBy || row.missingConversion) continue;
    const participants = [...new Map(row.participants.map(p => [p.id, p])).values()];
    if (!participants.length) continue;
    const amount = roundTripMoney(row.totalBaseAmount / participants.length);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    for (const member of participants) {
      if (member.id === row.paidByMemberId) continue;
      const key = JSON.stringify([member.id, row.paidByMemberId]);
      const group = groups.get(key) ?? { from: member, to: row.paidBy, amount: 0, costs: [] };
      group.amount = roundTripMoney(group.amount + amount);
      group.costs.push({ costId: row.costId, title: row.tripItemTitle, label: row.label, date: row.date, amount });
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => b.amount - a.amount);
}
