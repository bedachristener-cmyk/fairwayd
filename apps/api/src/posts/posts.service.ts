import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePostDto } from "./dto/create-post.dto";

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, body: CreatePostDto) {
  const content = body.content.trim();

  if (!body.courseId) {
    throw new BadRequestException("courseId is required");
  }

  if (content.length < 1) {
    throw new BadRequestException("content is required");
  }

  const course = await this.prisma.course.findUnique({
    where: { id: body.courseId },
  });

  if (!course) {
    throw new BadRequestException("course not found");
  }

  return this.prisma.post.create({
    data: {
      userId,
      courseId: body.courseId,
      content,
      visibility: body.visibility ?? "FOLLOWERS",
    },
    include: {
      user: { select: { id: true, handle: true, name: true, avatarUrl: true } },
      course: { select: { id: true, name: true, city: true, country: true } },
    },
  });
}

  async feed(userId: string) {
    // followers-only feed: my posts + posts from people I follow
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const ids = [userId, ...following.map((f) => f.followingId)];

    return this.prisma.post.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, handle: true, name: true, avatarUrl: true } },
        course: { select: { id: true, name: true, city: true, country: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }
  async forCourse(userId: string, courseId: string) {
	  if (!courseId) {
		throw new BadRequestException("courseId is required");
	  }

	  const following = await this.prisma.follow.findMany({
		where: { followerId: userId },
		select: { followingId: true },
	  });

	  const ids = [userId, ...following.map((f) => f.followingId)];

	  return this.prisma.post.findMany({
		where: {
		  courseId,
		  userId: { in: ids },
		},
		orderBy: { createdAt: "desc" },
		take: 50,
		include: {
		  user: { select: { id: true, handle: true, name: true, avatarUrl: true } },
		  _count: { select: { likes: true, comments: true } },
		},
	  });
	}
}
