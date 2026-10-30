import { PendingChangesService } from './pending-changes.service';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { ModerationModule } from './moderation.module';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Private moderation admin routes', () => {
  let app: any;
  const moderation = { onModuleInit: jest.fn(), list: jest.fn().mockResolvedValue([{id:'case'}]), preview: jest.fn().mockResolvedValue({bytes:Buffer.from('private'),mimeType:'image/png'}), decide:jest.fn().mockResolvedValue({ok:true}) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports:[ModerationModule] })
      .overrideProvider(PrismaService).useValue({user:{findUnique:jest.fn(async ({where})=>({id:where.id,adminRole:where.id==='admin'?'ADMIN':'USER'}))}})
      .overrideProvider(PendingChangesService).useValue({list:jest.fn().mockResolvedValue([]),preview:jest.fn().mockResolvedValue({bytes:Buffer.from('change'),mimeType:'image/png'}),decide:jest.fn().mockResolvedValue({ok:true})})
      .overrideProvider(ModerationService).useValue(moderation)
      .overrideGuard(AuthGuard('jwt')).useValue({canActivate:(context:any)=>{const req=context.switchToHttp().getRequest();if(!req.headers['x-test-user'])return false;req.user={id:req.headers['x-test-user']};return true;}})
      .compile(); app=module.createNestApplication(); await app.init();
  });
  afterAll(async()=>app.close());
  beforeEach(()=>jest.clearAllMocks());
  it.each(['','member'])('denies list, media and decisions for non-admin %s',async(user)=>{
    const headers=user?{'x-test-user':user}:{};
    await request(app.getHttpServer()).get('/safety/admin/moderation').set(headers).expect(403);
    await request(app.getHttpServer()).get('/safety/admin/moderation/case/image').set(headers).expect(403);
    await request(app.getHttpServer()).patch('/safety/admin/moderation/case').set(headers).send({decision:'APPROVED'}).expect(403);
    await request(app.getHttpServer()).get('/safety/admin/pending-changes').set(headers).expect(403);
    await request(app.getHttpServer()).get('/safety/admin/pending-changes/change/images/picture').set(headers).expect(403);
    await request(app.getHttpServer()).patch('/safety/admin/pending-changes/change').set(headers).send({decision:'APPROVED'}).expect(403);
    expect(moderation.list).not.toHaveBeenCalled();expect(moderation.preview).not.toHaveBeenCalled();expect(moderation.decide).not.toHaveBeenCalled();
  });
  it('returns private no-store images only to an admin',async()=>{
    const r=await request(app.getHttpServer()).get('/safety/admin/moderation/case/image').set('x-test-user','admin').expect(200);
    expect(r.headers['cache-control']).toBe('private, no-store');expect(r.headers['x-content-type-options']).toBe('nosniff');expect(moderation.preview).toHaveBeenCalledWith('case');
  });
  it('attributes decisions to the authenticated administrator',async()=>{
    await request(app.getHttpServer()).patch('/safety/admin/moderation/case').set('x-test-user','admin').send({decision:'APPROVED',reviewerId:'forged'}).expect(200);
    expect(moderation.decide).toHaveBeenCalledWith('case','admin','APPROVED');
  });
});
