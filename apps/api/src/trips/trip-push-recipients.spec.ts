import {
  eligibleItemNotificationUserIds,
  newlyAuthorizedUserIds,
  type RecipientMember,
} from './trip-push-recipients';

const members: RecipientMember[] = [
  { id: 'm1', userId: 'owner', role: 'OWNER' },
  { id: 'm2', userId: 'a', role: 'MEMBER' },
  { id: 'm3', userId: 'b', role: 'MEMBER' },
  { id: 'm4', userId: null, isGuest: true },
  { id: 'm5', userId: 'spectator', role: 'VIEWER' },
];

describe('trip item push recipient selection', () => {
  it('notifies all authenticated participating members except actor for GROUP', () => {
    expect(eligibleItemNotificationUserIds(members, {
      visibility: 'GROUP', createdByUserId: 'owner', visibleToMemberIds: [],
    }, 'owner')).toEqual(['a', 'b']);
  });
  it('notifies only selected members and creator for SELECTED', () => {
    expect(eligibleItemNotificationUserIds(members, {
      visibility: 'SELECTED', createdByUserId: 'owner', visibleToMemberIds: ['m2'],
    }, 'b')).toEqual(['owner', 'a']);
  });
  it('never leaks PRIVATE items to other members', () => {
    expect(eligibleItemNotificationUserIds(members, {
      visibility: 'PRIVATE', createdByUserId: 'owner', visibleToMemberIds: [],
    }, 'a')).toEqual(['owner']);
    expect(eligibleItemNotificationUserIds(members, {
      visibility: 'PRIVATE', createdByUserId: 'owner', visibleToMemberIds: [],
    }, 'owner')).toEqual([]);
  });
  it('identifies users newly granted visibility', () => {
    expect(newlyAuthorizedUserIds(members,
      { visibility: 'SELECTED', createdByUserId: 'owner', visibleToMemberIds: ['m2'] },
      { visibility: 'SELECTED', createdByUserId: 'owner', visibleToMemberIds: ['m2', 'm3'] },
      'owner',
    )).toEqual(['b']);
  });
  it('does not notify users whose access was revoked', () => {
    expect(newlyAuthorizedUserIds(members,
      { visibility: 'GROUP', createdByUserId: 'owner', visibleToMemberIds: [] },
      { visibility: 'PRIVATE', createdByUserId: 'owner', visibleToMemberIds: [] },
      'owner',
    )).toEqual([]);
  });
});
