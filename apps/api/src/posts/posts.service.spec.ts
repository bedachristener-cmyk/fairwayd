import { PostsService } from './posts.service';

function createService(prismaOverrides: Record<string, any> = {}) {
  const prisma = {
    post: {
      findUnique: jest.fn(),
    },
    like: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ...prismaOverrides,
  };
  const notifications = {
    createNotification: jest.fn(),
  };

  return {
    prisma,
    notifications,
    service: new PostsService(prisma as any, notifications as any),
  };
}

describe('PostsService notifications', () => {
  describe('likePost', () => {
    it("creates exactly one notification when another user likes someone's post", async () => {
      const { prisma, notifications, service } = createService();
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.like.findUnique.mockResolvedValue(null);
      prisma.like.create.mockResolvedValue({
        id: 'like-1',
        postId: 'post-1',
        userId: 'liker',
      });

      await expect(service.likePost('post-1', 'liker')).resolves.toEqual({
        ok: true,
      });

      expect(notifications.createNotification).toHaveBeenCalledTimes(1);
      expect(notifications.createNotification).toHaveBeenCalledWith({
        userId: 'post-owner',
        type: 'post_like',
        title: 'New like',
        body: 'Someone liked your post.',
        link: '/feed?postId=post-1',
      });
    });

    it('does not notify when the owner likes their own post', async () => {
      const { prisma, notifications, service } = createService();
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.like.findUnique.mockResolvedValue(null);
      prisma.like.create.mockResolvedValue({
        id: 'like-1',
        postId: 'post-1',
        userId: 'post-owner',
      });

      await expect(service.likePost('post-1', 'post-owner')).resolves.toEqual({
        ok: true,
      });

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('does not create another notification for an existing like', async () => {
      const { prisma, notifications, service } = createService();
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.like.findUnique.mockResolvedValue({ id: 'existing-like' });

      await expect(service.likePost('post-1', 'liker')).resolves.toEqual({
        ok: true,
      });

      expect(prisma.like.create).not.toHaveBeenCalled();
      expect(notifications.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('unlikePost', () => {
    it('does not create a notification when a like is removed', async () => {
      const { prisma, notifications, service } = createService();
      prisma.like.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.unlikePost('post-1', 'liker')).resolves.toEqual({
        ok: true,
      });

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('createComment', () => {
    it("creates exactly one notification when another user comments on someone's post", async () => {
      const { prisma, notifications, service } = createService();
      const comment = {
        id: 'comment-1',
        postId: 'post-1',
        userId: 'commenter',
        content: 'Nice round.',
      };
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.comment.create.mockResolvedValue(comment);

      await expect(
        service.createComment('post-1', 'commenter', 'Nice round.'),
      ).resolves.toEqual(comment);

      expect(notifications.createNotification).toHaveBeenCalledTimes(1);
      expect(notifications.createNotification).toHaveBeenCalledWith({
        userId: 'post-owner',
        type: 'post_comment',
        title: 'New comment',
        body: 'Someone commented on your post.',
        link: '/feed?postId=post-1',
      });
    });

    it("creates exactly one reply notification when another user replies to someone's comment", async () => {
      const { prisma, notifications, service } = createService();
      const reply = {
        id: 'reply-1',
        postId: 'post-1',
        userId: 'replier',
        parentId: 'comment-1',
        content: 'Agreed.',
      };
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        postId: 'post-1',
        userId: 'parent-author',
      });
      prisma.comment.create.mockResolvedValue(reply);

      await expect(
        service.createComment('post-1', 'replier', 'Agreed.', 'comment-1'),
      ).resolves.toEqual(reply);

      expect(notifications.createNotification).toHaveBeenCalledTimes(1);
      expect(notifications.createNotification).toHaveBeenCalledWith({
        userId: 'parent-author',
        type: 'comment_reply',
        title: 'New reply',
        body: 'Someone replied to your comment.',
        link: '/feed?postId=post-1',
      });
    });

    it('does not notify when a user replies to their own comment', async () => {
      const { prisma, notifications, service } = createService();
      const reply = {
        id: 'reply-1',
        postId: 'post-1',
        userId: 'comment-author',
        parentId: 'comment-1',
        content: 'Adding context.',
      };
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        postId: 'post-1',
        userId: 'comment-author',
      });
      prisma.comment.create.mockResolvedValue(reply);

      await expect(
        service.createComment(
          'post-1',
          'comment-author',
          'Adding context.',
          'comment-1',
        ),
      ).resolves.toEqual(reply);

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('does not create a post_comment notification for a reply', async () => {
      const { prisma, notifications, service } = createService();
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        postId: 'post-1',
        userId: 'parent-author',
      });
      prisma.comment.create.mockResolvedValue({
        id: 'reply-1',
        postId: 'post-1',
        userId: 'replier',
        parentId: 'comment-1',
        content: 'Agreed.',
      });

      await service.createComment('post-1', 'replier', 'Agreed.', 'comment-1');

      expect(notifications.createNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'post_comment' }),
      );
    });

    it('does not notify when the owner comments on their own post', async () => {
      const { prisma, notifications, service } = createService();
      const comment = {
        id: 'comment-1',
        postId: 'post-1',
        userId: 'post-owner',
        content: 'Thanks.',
      };
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.comment.create.mockResolvedValue(comment);

      await expect(
        service.createComment('post-1', 'post-owner', 'Thanks.'),
      ).resolves.toEqual(comment);

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('does not notify when comment creation fails', async () => {
      const { prisma, notifications, service } = createService();
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.comment.create.mockRejectedValue(new Error('create failed'));

      await expect(
        service.createComment('post-1', 'commenter', 'Nice round.'),
      ).rejects.toThrow('create failed');

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('does not notify when reply creation fails', async () => {
      const { prisma, notifications, service } = createService();
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'post-owner',
      });
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        postId: 'post-1',
        userId: 'parent-author',
      });
      prisma.comment.create.mockRejectedValue(new Error('reply failed'));

      await expect(
        service.createComment('post-1', 'replier', 'Agreed.', 'comment-1'),
      ).rejects.toThrow('reply failed');

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });
  });
});
