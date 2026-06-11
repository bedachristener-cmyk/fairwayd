import { TripItemCostMode, TripItemPaymentMode } from '@prisma/client';
import {
  buildMyCostsSummary,
  calculateCostShare,
  calculateBudgetV3Summary,
  type BudgetV3Member,
  type BudgetV3RichCost,
  type BudgetV3RichItem,
} from './budget-v3';

const members: BudgetV3Member[] = [
  { id: 'beda', displayName: 'Beda' },
  { id: 'alex', displayName: 'Alex' },
  { id: 'chris', displayName: 'Chris' },
  { id: 'dana', displayName: 'Dana' },
];

function golfCost(
  costMode: TripItemCostMode,
  paymentMode: TripItemPaymentMode,
  paidByMemberId: string | null = null,
): BudgetV3RichItem[] {
  return [
    {
      id: 'round-1',
      title: 'Siam Country Club',
      type: 'golf_round',
      costs: [
        {
          id: 'greenfee-1',
          label: 'Greenfee',
          amount: 480,
          currency: 'CHF',
          costMode,
          paymentMode,
          paidByMemberId,
          paidByMember:
            members.find((member) => member.id === paidByMemberId) ?? null,
          participants: members.map((member) => ({
            tripMemberId: member.id,
            tripMember: member,
          })),
        },
      ],
    },
  ];
}

describe('budget v3 shared cost handling', () => {
  function sharedGreenfeeCost(costMode: TripItemCostMode): BudgetV3RichCost {
    return {
      id: 'greenfee-1',
      label: 'Greenfee',
      amount: 480,
      currency: 'CHF',
      costMode,
      paymentMode: TripItemPaymentMode.EACH_PAYS_OWN,
      participants: members.map((member) => ({
        tripMemberId: member.id,
        tripMember: member,
      })),
    };
  }

  it('calculates total 480 split across 4 as 120 each', () => {
    const share = calculateCostShare(
      sharedGreenfeeCost(TripItemCostMode.TOTAL),
      'CHF',
    );

    expect(share.personalShare).toBe(120);
    expect(share.totalBaseAmount).toBe(480);
  });

  it('calculates per-person 480 across 4 as 480 each and 1920 total', () => {
    const share = calculateCostShare(
      sharedGreenfeeCost(TripItemCostMode.PER_PERSON),
      'CHF',
    );

    expect(share.personalShare).toBe(480);
    expect(share.totalBaseAmount).toBe(1920);
  });

  it('splits a total cost with everyone paying their own part without debt wording data', () => {
    const summary = buildMyCostsSummary({
      tripId: 'trip-1',
      baseCurrency: 'CHF',
      currentMemberId: 'alex',
      currentUserId: 'user-alex',
      members,
      items: golfCost(
        TripItemCostMode.TOTAL,
        TripItemPaymentMode.EACH_PAYS_OWN,
      ),
    });

    expect(summary.costs[0].personalShare).toBe(120);
    expect(summary.costs[0].netBalance).toBe(0);
    expect(summary.costs[0].iOwe).toEqual([]);
    expect(summary.costs[0].owedToMe).toEqual([]);
    expect(summary.summary.balancePreview).toBe(0);
  });

  it('shows payback balances when one member paid a total shared cost', () => {
    const payerSummary = buildMyCostsSummary({
      tripId: 'trip-1',
      baseCurrency: 'CHF',
      currentMemberId: 'beda',
      currentUserId: 'user-beda',
      members,
      items: golfCost(
        TripItemCostMode.TOTAL,
        TripItemPaymentMode.PAID_BY_ONE,
        'beda',
      ),
    });
    const participantSummary = buildMyCostsSummary({
      tripId: 'trip-1',
      baseCurrency: 'CHF',
      currentMemberId: 'alex',
      currentUserId: 'user-alex',
      members,
      items: golfCost(
        TripItemCostMode.TOTAL,
        TripItemPaymentMode.PAID_BY_ONE,
        'beda',
      ),
    });

    expect(payerSummary.costs[0].personalShare).toBe(120);
    expect(payerSummary.costs[0].netBalance).toBe(360);
    expect(payerSummary.costs[0].owedToMe).toHaveLength(3);
    expect(participantSummary.costs[0].personalShare).toBe(120);
    expect(participantSummary.costs[0].netBalance).toBe(-120);
    expect(participantSummary.costs[0].iOwe).toEqual([
      { member: members[0], amount: 120 },
    ]);
  });

  it('keeps a per-person cost as each participant share when everyone pays their own part', () => {
    const summary = buildMyCostsSummary({
      tripId: 'trip-1',
      baseCurrency: 'CHF',
      currentMemberId: 'alex',
      currentUserId: 'user-alex',
      members,
      items: golfCost(
        TripItemCostMode.PER_PERSON,
        TripItemPaymentMode.EACH_PAYS_OWN,
      ),
    });

    expect(summary.costs[0].personalShare).toBe(480);
    expect(summary.costs[0].totalBaseAmount).toBe(1920);
    expect(summary.costs[0].netBalance).toBe(0);
    expect(summary.costs[0].iOwe).toEqual([]);
    expect(summary.summary.balancePreview).toBe(0);
  });

  it('does not include everyone-pays-own costs in amount-to-pay totals', () => {
    const summary = calculateBudgetV3Summary([
      {
        id: 'greenfee-1',
        amount: 480,
        costMode: TripItemCostMode.TOTAL,
        paymentMode: TripItemPaymentMode.EACH_PAYS_OWN,
        participants: members.map((member) => ({ tripMemberId: member.id })),
      },
    ]);

    expect(summary.total).toBe(480);
    expect(summary.amountToPay).toBe(0);
    expect(summary.amountToReceive).toBe(0);
    expect(summary.balances.every((row) => row.balance === 0)).toBe(true);
  });
});
