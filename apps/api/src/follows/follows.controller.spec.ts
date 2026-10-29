import { FollowStatus } from '@prisma/client';
import { FollowsController } from './follows.controller';

function createController() {
  const follows = {
    countPendingRequests: jest.fn(),
    listPendingRequests: jest.fn(),
    unfollow: jest.fn(),
    acceptRequest: jest.fn(),
    declineRequest: jest.fn(),
  };
  const users = {
    followUser: jest.fn(),
  };

  return {
    follows,
    users,
    controller: new FollowsController(follows as any, users as any),
  };
}

describe('FollowsController', () => {
  it('routes legacy follow POSTs through the canonical UsersService flow', async () => {
    const { controller, follows, users } = createController();
    users.followUser.mockResolvedValue({ status: FollowStatus.ACCEPTED });

    await expect(
      controller.requestFollow({ user: { userId: 'follower-1' } }, 'target-1'),
    ).resolves.toEqual({ status: FollowStatus.ACCEPTED });

    expect(users.followUser).toHaveBeenCalledTimes(1);
    expect(users.followUser).toHaveBeenCalledWith('follower-1', 'target-1');
    expect(follows.unfollow).not.toHaveBeenCalled();
    expect(follows.acceptRequest).not.toHaveBeenCalled();
  });
});
