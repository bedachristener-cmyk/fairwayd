/**
 * Recipient selection for trip item events. Pure and safe to unit test.
 * This mirrors the server-side item visibility contract; never trust a client recipient list.
 */
export type ItemVisibility = 'GROUP' | 'SELECTED' | 'PRIVATE';
export type RecipientMember = {
  id: string;
  userId: string | null;
  role?: string;
  isGuest?: boolean;
};
export type ItemAccess = {
  visibility: ItemVisibility;
  createdByUserId: string;
  visibleToMemberIds: readonly string[];
};

export function eligibleItemNotificationUserIds(
  members: readonly RecipientMember[],
  item: ItemAccess,
  actorUserId: string,
): string[] {
  const seen = new Set<string>();
  for (const member of members) {
    if (!member.userId || member.isGuest || member.userId === actorUserId) continue;
    // Spectators can see GROUP items in their restricted trip projection.
    // They must never receive SELECTED or PRIVATE item notifications.
    if (member.role === 'VIEWER' && item.visibility !== 'GROUP') continue;
    const canSee =
      item.visibility === 'GROUP' ||
      member.userId === item.createdByUserId ||
      (item.visibility === 'SELECTED' &&
        item.visibleToMemberIds.includes(member.id));
    if (canSee) seen.add(member.userId);
  }
  return [...seen];
}

/**
 * For changes, only recipients with access AFTER the mutation are eligible.
 * For deletions, calculate recipients BEFORE deletion; use a generic payload.
 */
export function newlyAuthorizedUserIds(
  members: readonly RecipientMember[],
  before: ItemAccess,
  after: ItemAccess,
  actorUserId: string,
): string[] {
  const previous = new Set(eligibleItemNotificationUserIds(members, before, actorUserId));
  return eligibleItemNotificationUserIds(members, after, actorUserId).filter(id => !previous.has(id));
}
