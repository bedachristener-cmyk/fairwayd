import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EntryGuidesService, validateGuide } from './entry-guides.service';
import { EntryGuidesController } from './entry-guides.controller';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
const payload = () => ({ version:1,published:true,checkedOn:'2026-10-30',entries:[{title:{en:'Arrival information'},text:{en:'Check official requirements'},url:'https://etravel.gov.ph/',sourceUrl:'https://etravel.gov.ph/'}] });
describe('Country entry guides',()=>{
 it('rejects unsafe links, impossible dates, missing English and unbounded payloads',()=>{
  expect(()=>validateGuide({...payload(),checkedOn:'2026-02-30'})).toThrow();
  expect(()=>validateGuide({...payload(),checkedOn:'2999-01-01'})).toThrow();
  for(const url of ['javascript:alert(1)','http://example.com','https://name:secret@example.com'])expect(()=>validateGuide({...payload(),entries:[{...payload().entries[0],url}]})).toThrow();
  expect(()=>validateGuide({...payload(),entries:[{...payload().entries[0],text:{en:''}}]})).toThrow();
  expect(()=>validateGuide({...payload(),entries:Array(9).fill(payload().entries[0])})).toThrow();
 });
 it('uses version checks so another admin edit is not overwritten',async()=>{
  const db={destination:{findFirst:jest.fn().mockResolvedValue({code:'TH'})},countryEntryGuide:{updateMany:jest.fn().mockResolvedValue({count:0}),create:jest.fn()}};
  await expect(new EntryGuidesService(db as any).save('TH',payload(),'admin')).rejects.toThrow(ConflictException);
  expect(db.countryEntryGuide.create).not.toHaveBeenCalled();
 });
 it('excludes unpublished guides and countries outside Explore',async()=>{
  const db={destination:{findMany:jest.fn().mockResolvedValue([{code:'TH'}])},countryEntryGuide:{findMany:jest.fn().mockResolvedValue([])}};
  await new EntryGuidesService(db as any).list();expect(db.countryEntryGuide.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{published:true,countryCode:{in:['TH']}}}));
 });
 it('guards admin reads and writes with the database role, ignoring forged identities',async()=>{
  let id='member';const service={list:jest.fn().mockResolvedValue([]),adminGet:jest.fn().mockResolvedValue(null),save:jest.fn().mockResolvedValue({ok:true})};
  const module=await Test.createTestingModule({controllers:[EntryGuidesController],providers:[AdminGuard,{provide:EntryGuidesService,useValue:service},{provide:PrismaService,useValue:{user:{findUnique:async({where}:any)=>({id:where.id,adminRole:where.id==='admin'?'ADMIN':'USER'})}}}]}).overrideGuard(AuthGuard('jwt')).useValue({canActivate(context:any){context.switchToHttp().getRequest().user={id};return true;}}).compile();
  const app=module.createNestApplication();await app.init();
  try{
   await request(app.getHttpServer()).get('/entry-guides').expect(200).expect('Cache-Control','no-store');
   await request(app.getHttpServer()).get('/entry-guides/TH/admin').expect(403);
   await request(app.getHttpServer()).patch('/entry-guides/TH').send({...payload(),userId:'admin'}).expect(403);expect(service.save).not.toHaveBeenCalled();
   id='admin';await request(app.getHttpServer()).patch('/entry-guides/TH').send({...payload(),userId:'forged'}).expect(200);expect(service.save).toHaveBeenCalledWith('TH',expect.anything(),'admin');
  }finally{await app.close();}
 });
 it('validates trip selections and preserves an explicit empty selection',async()=>{
  const db={destination:{findMany:jest.fn().mockResolvedValue([{code:'TH'}])},countryEntryGuide:{findMany:jest.fn().mockResolvedValue([{countryCode:'TH'}])}};const service=new TripsService(db as any,{} as any);
  await expect((service as any).validateEntryCountries(['TH','PH'])).rejects.toThrow();
  await expect((service as any).validateEntryCountries(['TH','TH'])).rejects.toThrow();
  await expect((service as any).validateEntryCountries(null)).rejects.toThrow();
  await expect((service as any).validateEntryCountries([])).resolves.toEqual([]);
  await expect((service as any).validateEntryCountries(['TH'])).resolves.toEqual(['TH']);
 });
});
const database=process.env.PENDING_POST_TEST_DATABASE==='1'&&process.env.NEON_DATABASE_URL?.includes('127.0.0.1:5432/pending_posts_test')?describe:describe.skip;
database('Country-guide database migration and linked trips',()=>{
 let db:PrismaService;const id=`entry-test-${randomUUID()}`;let tripId='';let original:any;
 beforeAll(async()=>{db=new PrismaService();await db.$connect();await db.user.create({data:{id}});await db.destination.createMany({data:[{id:`${id}-TH`,code:'TH',name:'Thailand',slug:`${id}-th`},{id:`${id}-PH`,code:'PH',name:'Philippines',slug:`${id}-ph`}],skipDuplicates:true});original=await db.countryEntryGuide.findUniqueOrThrow({where:{countryCode:'TH'}});});
 afterAll(async()=>{if(!db)return;if(original)await db.countryEntryGuide.update({where:{countryCode:'TH'},data:{entries:original.entries,version:original.version,published:original.published}});await db.user.deleteMany({where:{id}});await db.destination.deleteMany({where:{id:{startsWith:id}}});await db.$disconnect();});
 it('persists selected countries and reflects central changes without rewriting the trip',async()=>{
  expect(await db.countryEntryGuide.count({where:{countryCode:{in:['TH','PH','VN']},published:true}})).toBe(3);
  const trips=new TripsService(db,{} as any);const trip=await trips.create(id,{title:'Linked guide test',entryRequirementCountries:['TH','PH']});tripId=trip.id;
  expect((await db.trip.findUniqueOrThrow({where:{id:tripId}})).entryRequirementCountries).toEqual(['TH','PH']);
  await trips.update(tripId,id,{title:'Renamed linked trip'});expect((await db.trip.findUniqueOrThrow({where:{id:tripId}})).entryRequirementCountries).toEqual(['TH','PH']);
  const guides=new EntryGuidesService(db);const edited={...payload(),version:original.version,entries:[{...payload().entries[0],text:{en:'Updated shared travel information'}}]};await guides.save('TH',edited,id);
  expect((await guides.list()).find(g=>g.countryCode==='TH')?.entries).toMatchObject(edited.entries);
  expect((await db.trip.findUniqueOrThrow({where:{id:tripId}})).entryRequirementCountries).toEqual(['TH','PH']);
  await expect(guides.save('TH',edited,id)).rejects.toThrow(ConflictException);
  await trips.update(tripId,id,{entryRequirementCountries:[]});expect((await db.trip.findUniqueOrThrow({where:{id:tripId}})).entryRequirementCountries).toEqual([]);
  await expect(trips.update(tripId,'not-a-member',{entryRequirementCountries:['TH']})).rejects.toThrow();
  const legacy=await db.trip.create({data:{title:'Legacy Thailand',createdById:id}});expect(legacy.entryRequirementCountries).toBeNull();
 });
});
