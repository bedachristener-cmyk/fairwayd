import { TripItemCostMode, TripItemPaymentMode } from '@prisma/client';
import {
  buildMyCostsSummary,
  buildOrganizerCostsSummary,
  calculateCostShare,
  calculateBudgetV3Summary,
  resolveBaseMoneyValue,
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

  it('marks everyone-pays-own organizer rows as paid by each participant', () => {
    const summary = buildOrganizerCostsSummary({
      tripId: 'trip-1',
      baseCurrency: 'CHF',
      members,
      items: golfCost(
        TripItemCostMode.TOTAL,
        TripItemPaymentMode.EACH_PAYS_OWN,
      ),
    });

    expect(summary.summary.balancePreview).toHaveLength(4);
    expect(
      summary.summary.balancePreview.every(
        (row) =>
          row.paid === 120 &&
          row.expectedShare === 120 &&
          row.balance === 0,
      ),
    ).toBe(true);
  });

  it('keeps a CHF 220 cost as CHF 220', () => {
    expect(
      resolveBaseMoneyValue(
        { id: 'chf', amount: 220, currency: 'CHF' },
        'CHF',
      ),
    ).toEqual({ amount: 220, exchangeRate: 1, missingConversion: false });
  });

  it('converts THB 9,400 at 0.0224 to a CHF 210.56 snapshot', () => {
    expect(
      resolveBaseMoneyValue(
        {
          id: 'thb',
          amount: 9400,
          currency: 'THB',
          exchangeRate: 0.0224,
        },
        'CHF',
      ),
    ).toEqual({
      amount: 210.56,
      exchangeRate: 0.0224,
      missingConversion: false,
    });
  });

  it('keeps an existing stored baseAmount authoritative during summaries', () => {
    expect(
      resolveBaseMoneyValue(
        {
          id: 'historical-thb',
          amount: 9400,
          currency: 'THB',
          exchangeRate: 0.5,
          baseAmount: 210.56,
        },
        'CHF',
      ),
    ).toEqual({
      amount: 210.56,
      exchangeRate: 0.5,
      missingConversion: false,
    });
  });

  it('splits a converted TOTAL cost between two people in base currency', () => {
    const share = calculateCostShare(
      {
        id: 'thb-total',
        amount: 9400,
        currency: 'THB',
        exchangeRate: 0.0224,
        costMode: TripItemCostMode.TOTAL,
        participants: members.slice(0, 2).map((member) => ({
          tripMemberId: member.id,
        })),
      },
      'CHF',
    );

    expect(share.totalBaseAmount).toBe(210.56);
    expect(share.personalShare).toBe(105.28);
  });

  it('converts a PER_PERSON foreign amount before multiplying participants', () => {
    const share = calculateCostShare(
      {
        id: 'thb-per-person',
        amount: 9400,
        currency: 'THB',
        exchangeRate: 0.0224,
        costMode: TripItemCostMode.PER_PERSON,
        participants: members.slice(0, 2).map((member) => ({
          tripMemberId: member.id,
        })),
      },
      'CHF',
    );

    expect(share.personalShare).toBe(210.56);
    expect(share.totalBaseAmount).toBe(421.12);
  });

  it('settles mixed CHF and THB costs entirely in CHF', () => {
    const participants = members.slice(0, 2).map((member) => ({
      tripMemberId: member.id,
      tripMember: member,
    }));
    const summary = buildOrganizerCostsSummary({
      tripId: 'trip-mixed',
      baseCurrency: 'CHF',
      members: members.slice(0, 2),
      items: [
        {
          id: 'mixed-item',
          costs: [
            {
              id: 'chf-cost',
              amount: 220,
              currency: 'CHF',
              costMode: TripItemCostMode.TOTAL,
              paymentMode: TripItemPaymentMode.PAID_BY_ONE,
              paidByMemberId: 'beda',
              participants,
            },
            {
              id: 'thb-cost',
              amount: 9400,
              currency: 'THB',
              exchangeRate: 0.0224,
              costMode: TripItemCostMode.TOTAL,
              paymentMode: TripItemPaymentMode.PAID_BY_ONE,
              paidByMemberId: 'beda',
              participants,
            },
          ],
        },
      ],
    });

    expect(summary.summary.totalTripCost).toBe(430.56);
    expect(summary.summary.paidBySummary[0].totalPaid).toBe(430.56);
    expect(summary.summary.balancePreview).toEqual([
      expect.objectContaining({
        member: members[1],
        paid: 0,
        expectedShare: 215.28,
        balance: -215.28,
      }),
      expect.objectContaining({
        member: members[0],
        paid: 430.56,
        expectedShare: 215.28,
        balance: 215.28,
      }),
    ]);
  });

  it('settles a foreign TOTAL cost as paid by each participant with no debt', () => {
    const participatingMembers = members.slice(0, 2);
    const items: BudgetV3RichItem[] = [
      {
        id: 'thb-each-pays-total-item',
        costs: [
          {
            id: 'thb-each-pays-total',
            amount: 9400,
            currency: 'THB',
            exchangeRate: 0.0224,
            costMode: TripItemCostMode.TOTAL,
            paymentMode: TripItemPaymentMode.EACH_PAYS_OWN,
            participants: participatingMembers.map((member) => ({
              tripMemberId: member.id,
              tripMember: member,
            })),
          },
        ],
      },
    ];
    const organizerSummary = buildOrganizerCostsSummary({
      tripId: 'trip-thb-each-pays-total',
      baseCurrency: 'CHF',
      members: participatingMembers,
      items,
    });
    const memberSummary = buildMyCostsSummary({
      tripId: 'trip-thb-each-pays-total',
      baseCurrency: 'CHF',
      currentMemberId: 'alex',
      currentUserId: 'user-alex',
      members: participatingMembers,
      items,
    });

    expect(organizerSummary.summary.totalTripCost).toBe(210.56);
    expect(memberSummary.costs[0].personalShare).toBe(105.28);
    expect(organizerSummary.summary.balancePreview).toHaveLength(2);
    expect(
      organizerSummary.summary.balancePreview.every(
        (row) =>
          row.paid === 105.28 &&
          row.expectedShare === 105.28 &&
          row.balance === 0,
      ),
    ).toBe(true);
    expect(
      organizerSummary.summary.balancePreview.filter(
        (row) => Math.abs(row.balance ?? 0) > 0.005,
      ),
    ).toEqual([]);
    expect(memberSummary.costs[0].iOwe).toEqual([]);
    expect(memberSummary.costs[0].owedToMe).toEqual([]);
    expect(memberSummary.summary.balancePreview).toBe(0);
  });

  it('settles a foreign PER_PERSON cost as paid by each participant with no debt', () => {
    const participatingMembers = members.slice(0, 2);
    const items: BudgetV3RichItem[] = [
      {
        id: 'thb-each-pays-per-person-item',
        costs: [
          {
            id: 'thb-each-pays-per-person',
            amount: 9400,
            currency: 'THB',
            exchangeRate: 0.0224,
            costMode: TripItemCostMode.PER_PERSON,
            paymentMode: TripItemPaymentMode.EACH_PAYS_OWN,
            participants: participatingMembers.map((member) => ({
              tripMemberId: member.id,
              tripMember: member,
            })),
          },
        ],
      },
    ];
    const organizerSummary = buildOrganizerCostsSummary({
      tripId: 'trip-thb-each-pays-per-person',
      baseCurrency: 'CHF',
      members: participatingMembers,
      items,
    });
    const memberSummary = buildMyCostsSummary({
      tripId: 'trip-thb-each-pays-per-person',
      baseCurrency: 'CHF',
      currentMemberId: 'alex',
      currentUserId: 'user-alex',
      members: participatingMembers,
      items,
    });

    expect(organizerSummary.summary.totalTripCost).toBe(421.12);
    expect(memberSummary.costs[0].personalShare).toBe(210.56);
    expect(
      organizerSummary.summary.balancePreview.every(
        (row) =>
          row.paid === 210.56 &&
          row.expectedShare === 210.56 &&
          row.balance === 0,
      ),
    ).toBe(true);
    expect(memberSummary.costs[0].iOwe).toEqual([]);
    expect(memberSummary.costs[0].owedToMe).toEqual([]);
    expect(memberSummary.summary.balancePreview).toBe(0);
  });

  it('explicitly marks a foreign cost with no conversion data', () => {
    const missing = resolveBaseMoneyValue(
      { id: 'missing', amount: 9400, currency: 'THB' },
      'CHF',
    );
    const summary = buildOrganizerCostsSummary({
      tripId: 'trip-missing',
      baseCurrency: 'CHF',
      members: members.slice(0, 2),
      items: [
        {
          id: 'item-missing',
          costs: [
            {
              id: 'missing',
              amount: 9400,
              currency: 'THB',
              participants: members.slice(0, 2).map((member) => ({
                tripMemberId: member.id,
              })),
            },
          ],
        },
      ],
    });

    expect(missing).toEqual({
      amount: 0,
      exchangeRate: null,
      missingConversion: true,
    });
    expect(summary.costs[0].missingConversion).toBe(true);
    expect(summary.summary.missingConversionCount).toBe(1);
  });
});
