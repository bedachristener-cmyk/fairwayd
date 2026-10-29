import { UnprocessableEntityException } from '@nestjs/common';
import { PostsController } from '../posts/posts.controller';
import { UsersController } from '../users/users.controller';
import { TripsController } from '../trips/trips.controller';
import { CourseSubmissionsController } from '../course-submissions/course-submissions.controller';
import { uploadToR2 } from '../storage/r2.service';
jest.mock('../storage/r2.service',()=>({uploadToR2:jest.fn(),deletePrivateUpload:jest.fn()}));
const file={buffer:Buffer.from('sample'),mimetype:'image/png',originalname:'sample.png'} as Express.Multer.File;
const blocked=()=>Promise.reject(new UnprocessableEntityException('Not published'));
describe('Moderation before public media storage',()=>{
  beforeEach(()=>jest.clearAllMocks());
  it('checks every post image before uploading any image',async()=>{
    const moderator={assertText:jest.fn(),assertImage:jest.fn().mockResolvedValueOnce(undefined).mockImplementationOnce(blocked)};
    const posts={createPost:jest.fn()};const controller=new PostsController(posts as any,moderator as any);
    await expect(controller.create({user:{id:'user'}},{courseId:'course',content:'golf'},{images:[file,file]})).rejects.toThrow(UnprocessableEntityException);
    expect(uploadToR2).not.toHaveBeenCalled();expect(posts.createPost).not.toHaveBeenCalled();
  });
  it('checks post text before uploading images',async()=>{
    const controller=new PostsController({} as any,{assertText:jest.fn(blocked)} as any);
    await expect(controller.create({user:{id:'user'}},{courseId:'course',content:'text'},{images:[file]})).rejects.toThrow(UnprocessableEntityException);expect(uploadToR2).not.toHaveBeenCalled();
  });
  it('checks avatars before public storage',async()=>{
    const controller=new UsersController({} as any,{assertImage:jest.fn(blocked)} as any);
    await expect(controller.uploadMyAvatar({user:{id:'user'}},file)).rejects.toThrow(UnprocessableEntityException);expect(uploadToR2).not.toHaveBeenCalled();
  });
  it('authorizes the organizer and then checks trip covers before storage',async()=>{
    const trips={assertCanManageTrip:jest.fn()};const controller=new TripsController(trips as any,{assertImage:jest.fn(blocked)} as any);
    await expect(controller.uploadCover('trip',{user:{id:'user'}},file)).rejects.toThrow(UnprocessableEntityException);expect(trips.assertCanManageTrip).toHaveBeenCalled();expect(uploadToR2).not.toHaveBeenCalled();
  });
  it('checks all course submission images before storage',async()=>{
    const controller=new CourseSubmissionsController({} as any,{assertText:jest.fn(),assertImage:jest.fn(blocked)} as any);
    await expect(controller.create({name:'golf'},{user:{id:'user'}},[file])).rejects.toThrow(UnprocessableEntityException);expect(uploadToR2).not.toHaveBeenCalled();
  });
});
