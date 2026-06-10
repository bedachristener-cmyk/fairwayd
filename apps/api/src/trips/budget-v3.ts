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

export type BudgetV3Member = {
  id: string;
  displayName?: string | null;
  user?: {
    name?: string | null;
    handle?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export type BudgetV3RichParticipant = {
  tripMemberId: string;
  tripMember?: BudgetV3Member | null;
};

export type BudgetV3RichCost = Omit<BudgetV3Cost, 'participants'> & {
  id: string;
  label?: string | null;
  currency?: string | null;
  exchangeRate?: number | null;
  paidByMember?: BudgetV3Member | null;
  participants?: BudgetV3RichParticipant[];
};

export type BudgetV3RichItem = {
  id: string;
  title?: string | null;
  type?: string | null;
  date?: Date | string | null;
  startsAt?: Date | string | null;
  startTime?: string | null;
  locationName?: string | null;
  createdByUserId?: string | null;
  course?: {
    name?: string | null;
  } | null;
  costs?: BudgetV3RichCost[];
};

export type BudgetV3Category =
  | 'Flights'
  | 'Hotels'
  | 'Golf'
  | 'Transport'
  | 'Restaurants'
  | 'Activities'
  | 'Other';

export type BudgetV3CostShare = {
  baseAmount: number;
  totalBaseAmount: number;
  personalShare: number;
  participantMemberIds: string[];
  participantCount: number;
};

export type BudgetV3CostRow = {
  tripItemId: string;
  tripItemTitle: string;
  tripItemType: string | null;
  category: BudgetV3Category;
  date: string | null;
  costId: string;
  label: string;
  currency: string;
  amount: number;
  baseAmount: number;
  totalBaseAmount: number;
  costMode: TripItemCostMode;
  paymentMode: TripItemPaymentMode;
  paidByMemberId: string | null;
  paidBy: BudgetV3Member | null;
  participants: BudgetV3Member[];
  participantCount: number;
  personalShare: number;
  paidAmount: number;
};

export type BudgetV3GroupedSummary = Record<BudgetV3Category, number>;

export type BudgetV3MyCostsSummary = {
  totalPersonalShare: number;
  totalPaidByMe: number;
  balancePreview: number;
  groupedByCategory: BudgetV3GroupedSummary;
};

export type BudgetV3MyCostsResponse = {
  tripId: string;
  baseCurrency: string;
  memberId: string;
  costs: BudgetV3CostRow[];
  summary: BudgetV3MyCostsSummary;
};

export type BudgetV3MemberSummaryRow = {
  member: BudgetV3Member;
  totalPaid?: number;
  expectedShare?: number;
  paid?: number;
  balance?: number;
};

export type BudgetV3OrganizerCostsResponse = {
  tripId: string;
  baseCurrency: string;
  costs: BudgetV3CostRow[];
  summary: {
    totalTripCost: number;
    paidBySummary: BudgetV3MemberSummaryRow[];
    memberShareSummary: BudgetV3MemberSummaryRow[];
    balancePreview: BudgetV3MemberSummaryRow[];
  };
};

function moneyValue(cost: BudgetV3Cost) {
  return Number.isFinite(cost.baseAmount)
    ? Number(cost.baseAmount)
    : Number.isFinite(cost.amount)
      ? Number(cost.amount)
      : 0;
}

function roundedMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function displayName(member?: BudgetV3Member | null) {
  return (
    member?.displayName ||
    member?.user?.name ||
    member?.user?.handle ||
    'Fairwayd member'
  );
}

function itemTitle(item: BudgetV3RichItem) {
  return (
    item.title?.trim() ||
    item.course?.name?.trim() ||
    item.locationName?.trim() ||
    categoryForTripItemType(item.type)
  );
}

function dateValue(item: BudgetV3RichItem) {
  const value = item.date ?? item.startsAt;
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function categoryForTripItemType(type?: string | null): BudgetV3Category {
  const value = String(type ?? '').toLowerCase();
  if (value === 'flight' || value === 'flights') return 'Flights';
  if (value === 'hotel' || value === 'stay' || value === 'accommodation') {
    return 'Hotels';
  }
  if (value === 'golf' || value === 'golf_round' || value === 'course') {
    return 'Golf';
  }
  if (value === 'transfer' || value === 'transport' || value === 'car_rental') {
    return 'Transport';
  }
  if (value === 'restaurant') return 'Restaurants';
  if (value === 'activity' || value === 'free_day') return 'Activities';
  return 'Other';
}

export function emptyGroupedSummary(): BudgetV3GroupedSummary {
  return {
    Flights: 0,
    Hotels: 0,
    Golf: 0,
    Transport: 0,
    Restaurants: 0,
    Activities: 0,
    Other: 0,
  };
}

export function baseMoneyValue(cost: BudgetV3RichCost, baseCurrency: string) {
  const amount =
    typeof cost.amount === 'number' && Number.isFinite(cost.amount)
      ? cost.amount
      : 0;
  const baseAmount =
    typeof cost.baseAmount === 'number' && Number.isFinite(cost.baseAmount)
      ? cost.baseAmount
      : 0;
  if (baseAmount > 0) return baseAmount;

  const currency = cost.currency?.trim();
  if (!currency || currency.toUpperCase() === baseCurrency.toUpperCase()) {
    return amount;
  }

  const exchangeRate =
    typeof cost.exchangeRate === 'number' && Number.isFinite(cost.exchangeRate)
      ? cost.exchangeRate
      : 0;
  return exchangeRate > 0 ? amount * exchangeRate : 0;
}

export function participantMemberIdsForCost(cost: BudgetV3RichCost) {
  return [
    ...new Set(
      (cost.participants ?? [])
        .map((participant) => participant.tripMemberId)
        .filter(Boolean),
    ),
  ];
}

export function calculateCostShare(
  cost: BudgetV3RichCost,
  baseCurrency: string,
): BudgetV3CostShare {
  const participantMemberIds = participantMemberIdsForCost(cost);
  const participantCount = participantMemberIds.length;
  const baseAmount = baseMoneyValue(cost, baseCurrency);
  const costMode = cost.costMode ?? TripItemCostMode.TOTAL;
  const totalBaseAmount =
    costMode === TripItemCostMode.PER_PERSON
      ? baseAmount * participantCount
      : baseAmount;
  const personalShare =
    participantCount <= 0
      ? 0
      : costMode === TripItemCostMode.PER_PERSON
        ? baseAmount
        : baseAmount / participantCount;

  return {
    baseAmount: roundedMoney(baseAmount),
    totalBaseAmount: roundedMoney(totalBaseAmount),
    personalShare: roundedMoney(personalShare),
    participantMemberIds,
    participantCount,
  };
}

export function allocateCostToMembers(
  cost: BudgetV3RichCost,
  baseCurrency: string,
) {
  const share = calculateCostShare(cost, baseCurrency);
  const rows = new Map<string, BudgetV3MemberBalance>();

  for (const tripMemberId of share.participantMemberIds) {
    addBalance(rows, tripMemberId, { share: share.personalShare });
  }

  if (
    (cost.paymentMode ?? TripItemPaymentMode.PAID_BY_ONE) ===
      TripItemPaymentMode.PAID_BY_ONE &&
    cost.paidByMemberId
  ) {
    addBalance(rows, cost.paidByMemberId, { paid: share.totalBaseAmount });
  }

  return Array.from(rows.values()).map((row) => ({
    ...row,
    paid: roundedMoney(row.paid),
    share: roundedMoney(row.share),
    balance: roundedMoney(row.paid - row.share),
  }));
}

function memberById(members: BudgetV3Member[]) {
  return new Map(members.map((member) => [member.id, member]));
}

function costRow(
  item: BudgetV3RichItem,
  cost: BudgetV3RichCost,
  members: BudgetV3Member[],
  baseCurrency: string,
  currentMemberId?: string,
): BudgetV3CostRow {
  const share = calculateCostShare(cost, baseCurrency);
  const membersById = memberById(members);
  const paidBy =
    cost.paidByMember ??
    (cost.paidByMemberId ? membersById.get(cost.paidByMemberId) : null) ??
    null;
  const participants = share.participantMemberIds
    .map((id) => {
      const participant = cost.participants?.find(
        (candidate) => candidate.tripMemberId === id,
      );
      return participant?.tripMember ?? membersById.get(id);
    })
    .filter((member): member is BudgetV3Member => Boolean(member));

  return {
    tripItemId: item.id,
    tripItemTitle: itemTitle(item),
    tripItemType: item.type ?? null,
    category: categoryForTripItemType(item.type),
    date: dateValue(item),
    costId: cost.id,
    label: cost.label?.trim() || 'Trip cost',
    currency: cost.currency?.trim() || baseCurrency,
    amount:
      typeof cost.amount === 'number' && Number.isFinite(cost.amount)
        ? cost.amount
        : 0,
    baseAmount: share.baseAmount,
    totalBaseAmount: share.totalBaseAmount,
    costMode: cost.costMode ?? TripItemCostMode.TOTAL,
    paymentMode: cost.paymentMode ?? TripItemPaymentMode.PAID_BY_ONE,
    paidByMemberId: cost.paidByMemberId ?? null,
    paidBy,
    participants,
    participantCount: share.participantCount,
    personalShare:
      currentMemberId && share.participantMemberIds.includes(currentMemberId)
        ? share.personalShare
        : 0,
    paidAmount:
      currentMemberId && cost.paidByMemberId === currentMemberId
        ? share.totalBaseAmount
        : 0,
  };
}

function addGroupedValue(
  grouped: BudgetV3GroupedSummary,
  category: BudgetV3Category,
  value: number,
) {
  grouped[category] = roundedMoney((grouped[category] ?? 0) + value);
}

export function buildMyCostsSummary(params: {
  tripId: string;
  baseCurrency: string;
  currentMemberId: string;
  currentUserId: string;
  members: BudgetV3Member[];
  items: BudgetV3RichItem[];
}): BudgetV3MyCostsResponse {
  const costs: BudgetV3CostRow[] = [];
  const groupedByCategory = emptyGroupedSummary();

  for (const item of params.items) {
    for (const cost of item.costs ?? []) {
      const participantIds = participantMemberIdsForCost(cost);
      const isParticipant = participantIds.includes(params.currentMemberId);
      const isPayer = cost.paidByMemberId === params.currentMemberId;
      const isCreator = item.createdByUserId === params.currentUserId;
      if (!isParticipant && !isPayer && !isCreator) continue;

      const row = costRow(
        item,
        cost,
        params.members,
        params.baseCurrency,
        params.currentMemberId,
      );
      costs.push(row);
      addGroupedValue(groupedByCategory, row.category, row.personalShare);
    }
  }

  const totalPersonalShare = roundedMoney(
    costs.reduce((sum, cost) => sum + cost.personalShare, 0),
  );
  const totalPaidByMe = roundedMoney(
    costs.reduce((sum, cost) => sum + cost.paidAmount, 0),
  );

  return {
    tripId: params.tripId,
    baseCurrency: params.baseCurrency,
    memberId: params.currentMemberId,
    costs,
    summary: {
      totalPersonalShare,
      totalPaidByMe,
      balancePreview: roundedMoney(totalPaidByMe - totalPersonalShare),
      groupedByCategory,
    },
  };
}

export function buildOrganizerCostsSummary(params: {
  tripId: string;
  baseCurrency: string;
  members: BudgetV3Member[];
  items: BudgetV3RichItem[];
}): BudgetV3OrganizerCostsResponse {
  const costs: BudgetV3CostRow[] = [];
  const paidBy = new Map<string, number>();
  const shares = new Map<string, number>();

  for (const item of params.items) {
    for (const cost of item.costs ?? []) {
      const row = costRow(item, cost, params.members, params.baseCurrency);
      costs.push(row);

      if (
        row.paymentMode === TripItemPaymentMode.PAID_BY_ONE &&
        row.paidByMemberId
      ) {
        paidBy.set(
          row.paidByMemberId,
          roundedMoney((paidBy.get(row.paidByMemberId) ?? 0) + row.totalBaseAmount),
        );
      }

      const participantIds = participantMemberIdsForCost(cost);
      for (const tripMemberId of participantIds) {
        shares.set(
          tripMemberId,
          roundedMoney((shares.get(tripMemberId) ?? 0) + row.totalBaseAmount / Math.max(participantIds.length, 1)),
        );
      }
    }
  }

  const membersById = memberById(params.members);
  const ids = new Set([...paidBy.keys(), ...shares.keys()]);
  const balancePreview = Array.from(ids)
    .map((id) => {
      const member = membersById.get(id);
      if (!member) return null;
      const paid = roundedMoney(paidBy.get(id) ?? 0);
      const expectedShare = roundedMoney(shares.get(id) ?? 0);
      return {
        member,
        paid,
        expectedShare,
        balance: roundedMoney(paid - expectedShare),
      };
    })
    .filter((row): row is Required<Pick<BudgetV3MemberSummaryRow, 'member' | 'paid' | 'expectedShare' | 'balance'>> => Boolean(row))
    .sort((a, b) => displayName(a.member).localeCompare(displayName(b.member)));
  const paidBySummary: BudgetV3MemberSummaryRow[] = [];
  for (const [id, totalPaid] of paidBy.entries()) {
    const member = membersById.get(id);
    if (member) paidBySummary.push({ member, totalPaid: roundedMoney(totalPaid) });
  }
  paidBySummary.sort((a, b) =>
    displayName(a.member).localeCompare(displayName(b.member)),
  );

  const memberShareSummary: BudgetV3MemberSummaryRow[] = [];
  for (const [id, expectedShare] of shares.entries()) {
    const member = membersById.get(id);
    if (member) {
      memberShareSummary.push({
        member,
        expectedShare: roundedMoney(expectedShare),
      });
    }
  }
  memberShareSummary.sort((a, b) =>
    displayName(a.member).localeCompare(displayName(b.member)),
  );

  return {
    tripId: params.tripId,
    baseCurrency: params.baseCurrency,
    costs,
    summary: {
      totalTripCost: roundedMoney(
        costs.reduce((sum, cost) => sum + cost.totalBaseAmount, 0),
      ),
      paidBySummary,
      memberShareSummary,
      balancePreview,
    },
  };
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
