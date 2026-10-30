import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { imageMime, ModerationService, requireImageCheck, requireTextCheck } from './moderation.service';

const clean = { flagged: false, categories: { sexual: false, 'sexual/minors': false, violence: false } };
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
function setup() {
  const table = { findUnique: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0), upsert: jest.fn().mockResolvedValue({ id: 'case-1' }), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn() };
  const notifications = { create: jest.fn() };
  const prisma = { pendingChange: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) }, pendingPost: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) }, contentModerationCase: table, $transaction: jest.fn(async (fn: any) => fn({ contentModerationCase: table, notification: notifications })) };
  return { table, prisma, service: new ModerationService(prisma as any) };
}
const originalFetch = global.fetch;
beforeEach(() => { process.env.CONTENT_MODERATION_ENABLED = 'true'; process.env.OPENAI_MODERATION_API_KEY = 'test-only'; global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [clean] }) }); });
afterEach(() => { global.fetch = originalFetch; delete process.env.CONTENT_MODERATION_ENABLED; delete process.env.OPENAI_MODERATION_API_KEY; });

describe('Content checks', () => {
  it('does not send data or query the database while disabled', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'false'; const { service, table } = setup();
    await service.assertText('u', 'POST_TEXT', 'A golf round');
    await service.assertImage('u', 'POST_IMAGE', { buffer: png });
    expect(global.fetch).not.toHaveBeenCalled(); expect(table.findUnique).not.toHaveBeenCalled();
  });
  it('allows clean text without retaining a copy', async () => {
    const { service, table } = setup(); await service.assertText('u', 'POST_TEXT', 'A golf round');
    expect(table.upsert).not.toHaveBeenCalled(); expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/moderations', expect.objectContaining({ method: 'POST' }));
  });
  it('sends actual image bytes without a public image URL or user id', async () => {
    const { service } = setup(); await service.assertImage('private-user-id', 'POST_IMAGE', { buffer: png, mimetype: 'image/png' });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.input[0].image_url.url).toBe(`data:image/png;base64,${png.toString('base64')}`);
    expect(JSON.stringify(body)).not.toContain('private-user-id');
  });
  it('quarantines a flagged image privately and refuses publication', async () => {
    const { service, table } = setup(); (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ results: [{ ...clean, flagged: true, categories: { ...clean.categories, violence: true } }] }) });
    await expect(service.assertImage('u', 'POST_IMAGE', { buffer: png, mimetype: 'image/png' })).rejects.toThrow(UnprocessableEntityException);
    expect(table.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: 'PENDING', bytes: new Uint8Array(png), categories: ['violence'] }) }));
  });
  it('retains no payload and allows no normal override for child-safety flags', async () => {
    const { service, table } = setup(); (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ results: [{ ...clean, flagged: true, categories: { ...clean.categories, 'sexual/minors': true } }] }) });
    await expect(service.assertImage('u', 'POST_IMAGE', { buffer: png, mimetype: 'image/png' })).rejects.toThrow(UnprocessableEntityException);
    expect(table.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: 'BLOCKED', bytes: null, text: null, mimeType: null }) }));
  });
  it.each([{}, { results: [] }, { results: [{ flagged: false, categories: {} }] }, { results: [{ ...clean }, { ...clean }] }])('fails closed for invalid responses: %j', async data => {
    const { service } = setup(); (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => data });
    await expect(service.assertText('u', 'POST_TEXT', 'golf')).rejects.toThrow(ServiceUnavailableException);
  });
  it.each([401,429,500])('fails closed for provider HTTP %i without leaking provider data', async status => {
    const { service } = setup(); (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status });
    await expect(service.assertText('u', 'POST_TEXT', 'golf')).rejects.toThrow(ServiceUnavailableException);
  });
  it('fails closed for network errors and missing keys', async () => {
    const { service } = setup(); (global.fetch as jest.Mock).mockRejectedValue(Error('secret provider detail'));
    await expect(service.assertText('u', 'POST_TEXT', 'golf')).rejects.toThrow(ServiceUnavailableException);
    delete process.env.OPENAI_MODERATION_API_KEY;
    await expect(service.assertText('u', 'POST_TEXT', 'golf')).rejects.toThrow(ServiceUnavailableException);
  });
  it('does not reuse a previous approval as a publication bypass', async () => {
    const { service, table } = setup(); table.findUnique.mockResolvedValue({ status: 'APPROVED', expiresAt: new Date(Date.now()+10000) });
    await service.assertText('u', 'POST_TEXT', 'Approved text');
    expect(global.fetch).toHaveBeenCalled();
    const first = table.findUnique.mock.calls[0][0].where.userId_scope_digest;
    expect(first).toMatchObject({ userId: 'u', scope: 'POST_TEXT' });
    await service.assertText('other', 'POST_TEXT', 'Changed text');
    const other = table.findUnique.mock.calls[1][0].where.userId_scope_digest;
    expect(other.userId).toBe('other'); expect(other.digest).not.toBe(first.digest);
  });
  it('does not let an expired approval bypass checks', async () => {
    const { service, table } = setup(); table.findUnique.mockResolvedValue({ id: 'old', status: 'APPROVED', expiresAt: new Date(0) });
    await service.assertText('u', 'POST_TEXT', 'golf'); expect(global.fetch).toHaveBeenCalled(); expect(table.deleteMany).toHaveBeenCalled();
  });
  it.each(['PENDING', 'REJECTED', 'BLOCKED'])('does not re-send already %s payloads', async status => {
    const { service, table } = setup(); table.findUnique.mockResolvedValue({ id: 'case', status, expiresAt: new Date(Date.now()+10000) });
    await expect(service.assertText('u', 'POST_TEXT', 'golf')).rejects.toThrow(UnprocessableEntityException); expect(global.fetch).not.toHaveBeenCalled();
  });
  it('validates image signatures, type mismatch, bounds and text length', async () => {
    const { service } = setup(); expect(() => imageMime(Buffer.from('<svg/>'))).toThrow(BadRequestException);
    await expect(service.assertImage('u','POST_IMAGE',{buffer:png,mimetype:'image/jpeg'})).rejects.toThrow(BadRequestException);
    await expect(service.assertImage('u','POST_IMAGE',{buffer:Buffer.alloc(5*1024*1024+1),mimetype:'image/png'})).rejects.toThrow(BadRequestException);
    await expect(service.assertText('u','POST_TEXT','x'.repeat(20001))).rejects.toThrow(BadRequestException); expect(global.fetch).not.toHaveBeenCalled();
  });
  it('removes sensitive payloads on an atomic decision and disallows stale decisions', async () => {
    const { service, table } = setup(); table.findUnique.mockResolvedValue({userId:'u'}); await expect(service.decide('case','admin','APPROVED')).rejects.toThrow(ConflictException); await service.decide('case','admin','REJECTED');
    expect(table.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status:'PENDING' }), data: expect.objectContaining({ status:'REJECTED',reviewerId:'admin',bytes:null,text:null }) }));
    table.updateMany.mockResolvedValue({ count:0 }); await expect(service.decide('case','admin','APPROVED')).rejects.toThrow(ConflictException);
  });
  it('never returns bytes with the admin list and only previews pending non-expired items', async () => {
    const { service, table } = setup(); await service.list();
    expect(table.findMany.mock.calls[0][0].select.bytes).toBeUndefined();
    table.findFirst.mockResolvedValue(null); await expect(service.preview('blocked')).rejects.toThrow(NotFoundException);
    expect(table.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where:expect.objectContaining({status:'PENDING'}) }));
  });
  it('rejects pending quota overflow before retaining another payload', async () => {
    const { service, table } = setup(); table.count.mockResolvedValue(5);
    (global.fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({results:[{...clean,flagged:true}]})});
    await expect(service.assertText('u','POST_TEXT','golf')).rejects.toThrow(UnprocessableEntityException); expect(table.upsert).not.toHaveBeenCalled();
  });
  it('does not forward a known blocked fingerprint for another user or image scope', async () => {
    const { service, table } = setup(); table.findFirst.mockResolvedValue({ id: 'blocked' });
    await expect(service.assertImage('another-user', 'AVATAR', { buffer: png, mimetype: 'image/png' })).rejects.toThrow(UnprocessableEntityException);
    expect(global.fetch).not.toHaveBeenCalled(); expect(table.upsert).not.toHaveBeenCalled();
  });
  it('fails closed if DI is missing while enabled', async () => {
    await expect(requireTextCheck(undefined,'u','POST_TEXT','golf')).rejects.toThrow(ServiceUnavailableException);
    await expect(requireImageCheck(undefined,'u','POST_IMAGE',{} as any)).rejects.toThrow(ServiceUnavailableException);
  });
});
