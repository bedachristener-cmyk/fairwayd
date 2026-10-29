import { BadRequestException, ConflictException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { uploadToR2, deleteStoredUpload } from '../storage/r2.service';
jest.mock('../storage/r2.service', () => ({ uploadToR2: jest.fn(), deleteStoredUpload: jest.fn().mockResolvedValue(true) }));
const version = new Date('2026-10-29T10:00:00Z');
const image = { id: 'image-1', url: 'https://media.example/posts/owner-old.png' };
const png = { originalname: 'new.png', mimetype: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0]) } as Express.Multer.File;
function setup(content = 'A round of golf') {
 const post = { id: 'post', userId: 'owner', content, updatedAt: version, images: [image] };
 const count = () => ({ count: jest.fn().mockResolvedValue(0) });
 const prisma = { post: { findUnique: jest.fn().mockResolvedValue(post), update: jest.fn().mockResolvedValue({ ...post, images: [] }) }, postImage: count(), trip: count(), user: count(), courseSubmissionImage: count(), course: { findUnique: jest.fn().mockResolvedValue({id:'course'}) } };
 const service = new PostsService(prisma as any, {} as any);
 const controller = new PostsController(service);
 return {post,prisma,service,controller};
}
beforeEach(()=>jest.clearAllMocks());
it('refuses another owner and foreign or duplicate image IDs before uploads',async()=>{
 const {controller,service,prisma}=setup();
 await expect(controller.updatePost('post',{user:{id:'other'}},{retainedImageIds:[]},{images:[png]})).rejects.toBeInstanceOf(UnauthorizedException);
 await expect(service.preparePostImages('post','owner',['foreign'])).rejects.toBeInstanceOf(BadRequestException);
 await expect(service.preparePostImages('post','owner',['image-1','image-1'])).rejects.toBeInstanceOf(BadRequestException);
 expect(uploadToR2).not.toHaveBeenCalled();expect(prisma.post.update).not.toHaveBeenCalled();
});
it('removes an own image atomically and cleans only the unreferenced file',async()=>{
 const {service,prisma}=setup();await service.updatePost('post','owner',{retainedImageIds:[]});
 expect(prisma.post.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:'post',userId:'owner',updatedAt:version},data:{images:{deleteMany:{id:{notIn:[]}},create:[]}}}));
 expect(deleteStoredUpload).toHaveBeenCalledWith(image.url);
});
it('preserves a file still used as a trip cover',async()=>{
 const {service,prisma}=setup();prisma.trip.count.mockResolvedValue(1);await service.updatePost('post','owner',{retainedImageIds:[]});expect(deleteStoredUpload).not.toHaveBeenCalled();
});
it('does not allow an empty post or more than five final images',async()=>{
 const {service}=setup('');await expect(service.updatePost('post','owner',{retainedImageIds:[]})).rejects.toBeInstanceOf(BadRequestException);
 await expect(service.preparePostImages('post','owner',undefined,5)).rejects.toBeInstanceOf(BadRequestException);
});
it('keeps legacy JSON text updates and image-only posts working',async()=>{
 const {service,prisma}=setup('');await service.updatePost('post','owner',{visibility:'PRIVATE'});expect(prisma.post.update).toHaveBeenCalledWith(expect.objectContaining({data:{visibility:'PRIVATE'}}));expect(deleteStoredUpload).not.toHaveBeenCalled();
});
it('rejects malformed retained IDs and stale client versions before uploads',async()=>{
 const {controller}=setup();await expect(controller.updatePost('post',{user:{id:'owner'}},{retainedImageIds:'bad'},{images:[png]})).rejects.toBeInstanceOf(BadRequestException);
 await expect(controller.updatePost('post',{user:{id:'owner'}},{expectedUpdatedAt:'2025-01-01'},{images:[png]})).rejects.toBeInstanceOf(ConflictException);expect(uploadToR2).not.toHaveBeenCalled();
});
it('checks all new images before any public upload',async()=>{
 const {service}=setup();const moderator={assertText:jest.fn(),assertImage:jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new UnprocessableEntityException('blocked'))};
 const controller=new PostsController(service,moderator as any);
 await expect(controller.updatePost('post',{user:{id:'owner'}},{retainedImageIds:[]},{images:[png,png]})).rejects.toBeInstanceOf(UnprocessableEntityException);expect(uploadToR2).not.toHaveBeenCalled();
});
it('cleans newly uploaded files if a concurrent edit prevents saving',async()=>{
 const {service}=setup();jest.spyOn(service,'updatePost').mockRejectedValue(new ConflictException('changed'));(uploadToR2 as jest.Mock).mockResolvedValue('https://media.example/new.png');
 const controller=new PostsController(service);
 await expect(controller.updatePost('post',{user:{id:'owner'}},{retainedImageIds:'[]'},{images:[png]})).rejects.toBeInstanceOf(ConflictException);expect(deleteStoredUpload).toHaveBeenCalledWith('https://media.example/new.png');
});
it('replaces images and returns the updated post while retaining comments and likes',async()=>{
 const {controller,prisma}=setup();(uploadToR2 as jest.Mock).mockResolvedValue('https://media.example/new.png');
 await controller.updatePost('post',{user:{id:'owner'}},{retainedImageIds:'[]',content:'Golf'},{images:[png]});
 expect(prisma.post.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({content:'Golf',images:{deleteMany:{id:{notIn:[]}},create:[{url:'https://media.example/new.png'}]}}),include:expect.objectContaining({likes:expect.anything(),_count:expect.anything()})}));
});

import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
it('accepts multipart replacement and legacy JSON through the real HTTP interceptor',async()=>{
 const posts={preparePostImages:jest.fn().mockResolvedValue({post:{content:'Golf',updatedAt:version},keptIds:[]}),updatePost:jest.fn().mockResolvedValue({id:'post',images:[]})};
 const module=await Test.createTestingModule({controllers:[PostsController],providers:[{provide:PostsService,useValue:posts}]}).overrideGuard(AuthGuard('jwt')).useValue({canActivate:(context:any)=>{context.switchToHttp().getRequest().user={id:'owner'};return true;}}).compile();
 const app=module.createNestApplication();await app.init();
 (uploadToR2 as jest.Mock).mockResolvedValue('https://media.example/new.png');
 try {
  await request(app.getHttpServer()).patch('/posts/post').field('content','Golf').field('retainedImageIds','[]').attach('images',png.buffer,{filename:'new.png',contentType:'image/png'}).expect(200);
  expect(posts.updatePost).toHaveBeenLastCalledWith('post','owner',expect.objectContaining({retainedImageIds:'[]'}),expect.objectContaining({urls:['https://media.example/new.png']}));
  await request(app.getHttpServer()).patch('/posts/post').send({content:'Updated'}).expect(200);
  expect(posts.updatePost).toHaveBeenLastCalledWith('post','owner',{content:'Updated'},expect.objectContaining({urls:[]}));
 } finally {await app.close();}
});
