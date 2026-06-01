import { TripItemCostMode, TripItemPaymentMode } from '@prisma/client';

export type BudgetV3Participant = {
  tripMemberId: string;
};

export type BudgetV3Cost = {
  id?: string;
  amount?: number | null;
  baseAmount?: number | null;
  costMode?: TripItemCostMode | null;
  paymentMode?: TripItemPaymentMode | null;
  paidByMemberId?: string | null;
  participants?: BudgetV3Participant[];
};

export type BudgetV3MemberBalance = {
  tripMemberId: string;
  paid: number;
  share: number;
  balance: number;
};

export type BudgetV3CostAllocation = {
  costId?: string;
  total: number;
  perParticipantShare: number;
  participantMemberIds: string[];
  createsPayback: boolean;
};

export type BudgetV3Summary = {
  total: number;
  totalPaid: number;
  totalShare: number;
  amountToPay: number;
  amountToReceive: number;
  balances: BudgetV3MemberBalance[];
  allocations: BudgetV3CostAllocation[];
};

function moneyValue(cost: BudgetV3Cost) {
  return Number.isFinite(cost.baseAmount)
    ? Number(cost.baseAmount)
    : Number.isFinite(cost.amount)
      ? Number(cost.amount)
      : 0;
}

function addBalance(
  rows: Map<string, BudgetV3MemberBalance>,
  tripMemberId: string,
  values: Partial<Pick<BudgetV3MemberBalance, 'paid' | 'share'>>,
) {
  const row =
    rows.get(tripMemberId) ??
    ({
      tripMemberId,
      paid: 0,
      share: 0,
      balance: 0,
    } satisfies BudgetV3MemberBalance);

  row.paid += values.paid ?? 0;
  row.share += values.share ?? 0;
  row.balance = row.paid - row.share;
  rows.set(tripMemberId, row);
}

export function calculateBudgetV3Summary(costs: BudgetV3Cost[]): BudgetV3Summary {
  const rows = new Map<string, BudgetV3MemberBalance>();
  const allocations: BudgetV3CostAllocation[] = [];

  for (const cost of costs) {
    const participantMemberIds = [
      ...new Set(
        (cost.participants ?? [])
          .map((participant) => participant.tripMemberId)
          .filter(Boolean),
      ),
    ];
    const amount = moneyValue(cost);
    if (amount <= 0 || participantMemberIds.length === 0) continue;

    const costMode = cost.costMode ?? TripItemCostMode.TOTAL;
    const paymentMode = cost.paymentMode ?? TripItemPaymentMode.PAID_BY_ONE;
    const total =
      costMode === TripItemCostMode.PER_PERSON
        ? amount * participantMemberIds.length
        : amount;
    const perParticipantShare = total / participantMemberIds.length;
    const createsPayback =
      paymentMode === TripItemPaymentMode.PAID_BY_ONE && Boolean(cost.paidByMemberId);

    for (const tripMemberId of participantMemberIds) {
      addBalance(rows, tripMemberId, { share: perParticipantShare });
    }

    if (createsPayback && cost.paidByMemberId) {
      addBalance(rows, cost.paidByMemberId, { paid: total });
    }

    allocations.push({
      costId: cost.id,
      total,
      perParticipantShare,
      participantMemberIds,
      createsPayback,
    });
  }

  const balances = Array.from(rows.values()).map((row) => ({
    ...row,
    balance: row.paid - row.share,
  }));

  return {
    total: allocations.reduce((sum, allocation) => sum + allocation.total, 0),
    totalPaid: balances.reduce((sum, row) => sum + row.paid, 0),
    totalShare: balances.reduce((sum, row) => sum + row.share, 0),
    amountToPay: balances.reduce(
      (sum, row) => sum + (row.balance < 0 ? Math.abs(row.balance) : 0),
      0,
    ),
    amountToReceive: balances.reduce(
      (sum, row) => sum + (row.balance > 0 ? row.balance : 0),
      0,
    ),
    balances,
    allocations,
  };
}
