import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DestinationsService } from './destinations.service';

describe('Destination community tip permissions', () => {
  const findTip = jest.fn();
  const updateMany = jest.fn();
  const deleteMany = jest.fn();
  const findUser = jest.fn();
  const assertText = jest.fn();
  const prisma = {
    destinationTip: { findFirst: findTip, updateMany, deleteMany },
    user: { findUnique: findUser },
  } as any;
  const moderation = { assertText } as any;
  let service: DestinationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FAIRWAYD_ADMIN_HANDLES;
    delete process.env.FAIRWAYD_ADMIN_USER_IDS;
    service = new DestinationsService(prisma, moderation);
    findTip.mockResolvedValue({ id: 'tip-1', userId: 'author-1' });
    updateMany.mockResolvedValue({ count: 1 });
    deleteMany.mockResolvedValue({ count: 1 });
    findUser.mockResolvedValue({ id: 'viewer-1', handle: 'viewer', adminRole: null });
    assertText.mockResolvedValue(undefined);
  });

  it('lets the author update their tip', async () => {
    await expect(service.updateTip('thailand', 'tip-1', 'author-1', ' Updated '))
      .resolves.toEqual({ ok: true, id: 'tip-1', text: 'Updated' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'tip-1', userId: 'author-1' },
      data: { text: 'Updated' },
    });
  });

  it('rejects editing someone else’s tip', async () => {
    await expect(service.updateTip('thailand', 'tip-1', 'viewer-1', 'Changed'))
      .rejects.toThrow(ForbiddenException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects blank and oversized edits', async () => {
    await expect(service.updateTip('thailand', 'tip-1', 'author-1', '   '))
      .rejects.toThrow(BadRequestException);
    await expect(service.updateTip('thailand', 'tip-1', 'author-1', 'x'.repeat(501)))
      .rejects.toThrow(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects editing a tip outside the destination', async () => {
    findTip.mockResolvedValue(null);
    await expect(service.updateTip('thailand', 'tip-1', 'author-1', 'Changed'))
      .rejects.toThrow(NotFoundException);
  });

  it('checks edited text with destination moderation before saving', async () => {
    await service.updateTip('thailand', 'tip-1', 'author-1', ' Updated ');
    expect(assertText).toHaveBeenCalledWith('author-1', 'DESTINATION_TEXT', 'Updated');
    expect(assertText.mock.invocationCallOrder[0]).toBeLessThan(updateMany.mock.invocationCallOrder[0]);
  });

  it('does not save an edit rejected by moderation', async () => {
    assertText.mockRejectedValue(new ForbiddenException('Content rejected'));
    await expect(service.updateTip('thailand', 'tip-1', 'author-1', 'Rejected text'))
      .rejects.toThrow(ForbiddenException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('lets the author delete their tip', async () => {
    await expect(service.deleteTip('thailand', 'tip-1', 'author-1'))
      .resolves.toEqual({ ok: true });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'tip-1' } });
  });

  it('rejects deleting someone else’s tip as a normal user', async () => {
    await expect(service.deleteTip('thailand', 'tip-1', 'viewer-1'))
      .rejects.toThrow(ForbiddenException);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('allows database admins to delete other users’ tips', async () => {
    findUser.mockResolvedValue({ id: 'admin-1', handle: 'admin', adminRole: 'ADMIN' });
    await expect(service.deleteTip('thailand', 'tip-1', 'admin-1'))
      .resolves.toEqual({ ok: true });
  });

  it('allows legacy admins to delete other users’ tips', async () => {
    process.env.FAIRWAYD_ADMIN_HANDLES = 'beda';
    findUser.mockResolvedValue({ id: 'admin-1', handle: 'beda', adminRole: null });
    await expect(service.deleteTip('thailand', 'tip-1', 'admin-1'))
      .resolves.toEqual({ ok: true });
  });

  it('does not let legacy admins edit other users’ tips', async () => {
    process.env.FAIRWAYD_ADMIN_HANDLES = 'beda';
    await expect(service.updateTip('thailand', 'tip-1', 'admin-1', 'Changed'))
      .rejects.toThrow(ForbiddenException);
  });
});
