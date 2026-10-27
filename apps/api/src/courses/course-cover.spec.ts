import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';

describe('course cover selection', () => {
  const prisma = {
    course: { findUnique: jest.fn(), update: jest.fn() },
    postImage: { findFirst: jest.fn() },
    post: { findFirst: jest.fn() },
  };
  const service = new CoursesService(prisma as any);
  beforeEach(() => jest.resetAllMocks());

  it('uses a selected image only when it remains public and belongs to the course', async () => {
    prisma.course.findUnique.mockResolvedValue({ coverImageId: 'image-1' });
    prisma.postImage.findFirst.mockResolvedValue({ id: 'image-1', url: '/image.jpg' });
    await expect(service.getCoverImage('course-1')).resolves.toEqual({ image: { id: 'image-1', url: '/image.jpg' }, isSelected: true });
    expect(prisma.postImage.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'image-1', post: { courseId: 'course-1', visibility: 'PUBLIC' } } }));
    expect(prisma.post.findFirst).not.toHaveBeenCalled();
  });

  it('falls back to the latest public post if the selected image is unavailable', async () => {
    prisma.course.findUnique.mockResolvedValue({ coverImageId: 'private-image' });
    prisma.postImage.findFirst.mockResolvedValue(null);
    prisma.post.findFirst.mockResolvedValue({ images: [{ id: 'fallback', url: '/public.jpg' }] });
    await expect(service.getCoverImage('course-1')).resolves.toEqual({ image: { id: 'fallback', url: '/public.jpg' }, isSelected: false });
    expect(prisma.post.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { courseId: 'course-1', visibility: 'PUBLIC', images: { some: {} } } }));
  });

  it('rejects an image from a private or different course post', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 'course-1' });
    prisma.postImage.findFirst.mockResolvedValue(null);
    await expect(service.setCoverImage('course-1', 'invalid')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it('rejects a missing course', async () => {
    prisma.course.findUnique.mockResolvedValue(null);
    await expect(service.setCoverImage('missing', null)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resets to automatic selection', async () => {
    prisma.course.findUnique.mockResolvedValueOnce({ id: 'course-1' }).mockResolvedValueOnce({ coverImageId: null });
    prisma.post.findFirst.mockResolvedValue(null);
    await expect(service.setCoverImage('course-1', null)).resolves.toEqual({ image: null, isSelected: false });
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 'course-1' }, data: { coverImageId: null } });
  });
});
