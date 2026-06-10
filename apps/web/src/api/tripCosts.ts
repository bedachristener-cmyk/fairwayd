import { apiGet } from "./client";

export type TripCostCategory =
  | "Flights"
  | "Hotels"
  | "Golf"
  | "Transport"
  | "Restaurants"
  | "Activities"
  | "Other";

export type TripCostMember = {
  id: string;
  displayName?: string | null;
  user?: {
    name?: string | null;
    handle?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export type TripCostMemberAmount = {
  member: TripCostMember;
  amount: number;
};

export type TripCostRow = {
  tripItemId: string;
  tripItemTitle: string;
  tripItemType: string | null;
  category: TripCostCategory;
  date: string | null;
  costId: string;
  label: string;
  currency: string;
  amount: number;
  baseAmount: number;
  totalBaseAmount: number;
  costMode: "PER_PERSON" | "TOTAL";
  paymentMode: "PAID_BY_ONE" | "EACH_PAYS_OWN";
  paidByMemberId: string | null;
  paidBy: TripCostMember | null;
  participants: TripCostMember[];
  participantCount: number;
  personalShare: number;
  paidAmount: number;
};

export type MyTripCostRow = TripCostRow & {
  locationName?: string | null;
  provider?: string | null;
  itemDate?: string | null;
  itemStartTime?: string | null;
  participantShares: TripCostMemberAmount[];
  owedToMe: TripCostMemberAmount[];
  iOwe: TripCostMemberAmount[];
  netBalance: number;
  paidByMe: number;
};

export type TripCostGroupedSummary = Record<TripCostCategory, number>;

export type MyTripCostsResponse = {
  tripId: string;
  baseCurrency: string;
  memberId: string;
  costs: MyTripCostRow[];
  summary: {
    totalPersonalShare: number;
    totalPaidByMe: number;
    balancePreview: number;
    groupedByCategory: TripCostGroupedSummary;
  };
};

export type OrganizerTripCostsResponse = {
  tripId: string;
  baseCurrency: string;
  costs: TripCostRow[];
  summary: {
    totalTripCost: number;
    paidBySummary: Array<{
      member: TripCostMember;
      totalPaid: number;
    }>;
    memberShareSummary: Array<{
      member: TripCostMember;
      expectedShare: number;
    }>;
    balancePreview: Array<{
      member: TripCostMember;
      paid: number;
      expectedShare: number;
      balance: number;
    }>;
  };
};

export function getMyTripCosts(tripId: string, token: string) {
  return apiGet<MyTripCostsResponse>(
    `/trips/${encodeURIComponent(tripId)}/my-costs`,
    { token },
  );
}

export function getOrganizerTripCosts(tripId: string, token: string) {
  return apiGet<OrganizerTripCostsResponse>(
    `/trips/${encodeURIComponent(tripId)}/organizer-costs`,
    { token },
  );
}
