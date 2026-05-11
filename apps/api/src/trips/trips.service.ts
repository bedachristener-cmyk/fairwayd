import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TripRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddTripMemberDto } from './dto/add-trip-member.dto';
import { CreateTripItemDto } from './dto/create-trip-item.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { MoveTripItemDto } from './dto/move-trip-item.dto';
import { UpdateTripMemberDto } from './dto/update-trip-member.dto';
import { UpdateTripItemDto } from './dto/update-trip-item.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

function startsAtFromDto(date?: string, startTime?: string) {
  if (!date) return undefined;

  const time = startTime?.trim() || '00:00';
  const value = new Date(`${date}T${time}:00.000Z`);

  if (Number.isNaN(value.getTime())) {
    throw new BadRequestException('Invalid trip item date or startTime');
  }

  return value;
}

function dateFromDto(date?: string) {
  if (!date) return undefined;

  const value = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(value.getTime())) {
    throw new BadRequestException('Invalid trip item date');
  }

  return value;
}

function cleanTripRole(role?: TripRole) {
  if (!role) return TripRole.MEMBER;
  if (
    role !== TripRole.OWNER &&
    role !== TripRole.ADMIN &&
    role !== TripRole.MEMBER
  ) {
    throw new BadRequestException('Unsupported trip member role');
  }
  return role;
}

const tripUserSelect = {
  id: true,
  handle: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const tripItemInclude = {
  course: true,
  participants: {
    orderBy: { createdAt: 'asc' },
    include: {
      tripMember: {
        include: {
          user: {
            select: tripUserSelect,
          },
        },
      },
    },
  },
} satisfies Prisma.TripItemInclude;

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateTripDto) {
    return this.prisma.trip.create({
      data: {
        title: dto.title.trim(),
        destination: dto.destination?.trim() || null,
        description: dto.description?.trim() || null,
        createdById: userId,
        members: {
          create: {
            userId,
            role: TripRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                handle: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.trip.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                handle: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                handle: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        items: {
          orderBy: [
            {
              date: 'asc',
            },
            {
              sortOrder: 'asc',
            },
            {
              startTime: 'asc',
            },
            { createdAt: 'asc' },
          ],
          include: tripItemInclude,
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async update(tripId: string, userId: string, dto: UpdateTripDto) {
    await this.assertCanModifyTrip(tripId, userId);

    return this.prisma.trip.update({
      where: {
        id: tripId,
      },
      data: {
        title: dto.title?.trim(),
        destination:
          dto.destination === undefined
            ? undefined
            : dto.destination.trim() || null,
        description:
          dto.description === undefined
            ? undefined
            : dto.description.trim() || null,
        coverImageUrl:
          dto.coverImageUrl === undefined
            ? undefined
            : dto.coverImageUrl.trim() || null,
      },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                handle: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        items: {
          orderBy: [
            {
              date: 'asc',
            },
            {
              sortOrder: 'asc',
            },
            {
              startTime: 'asc',
            },
            { createdAt: 'asc' },
          ],
          include: tripItemInclude,
        },
      },
    });
  }

  async delete(tripId: string, userId: string) {
    await this.assertCanModifyTrip(tripId, userId);

    await this.prisma.trip.delete({
      where: {
        id: tripId,
      },
    });

    return { ok: true };
  }

  async findMembers(tripId: string, userId: string) {
    await this.assertIsTripMember(tripId, userId);

    return this.prisma.tripMember.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async addMember(tripId: string, userId: string, dto: AddTripMemberDto) {
    await this.assertCanModifyTrip(tripId, userId);

    try {
      return await this.prisma.tripMember.create({
        data: {
          tripId,
          userId: dto.userId,
          role: cleanTripRole(dto.role),
        },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User is already a trip member');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }
  }

  async updateMember(
    tripId: string,
    memberId: string,
    userId: string,
    dto: UpdateTripMemberDto,
  ) {
    await this.assertCanModifyTrip(tripId, userId);
    const role = cleanTripRole(dto.role);

    const member = await this.findTripMemberOrThrow(tripId, memberId);
    if (member.role === TripRole.OWNER && role !== TripRole.OWNER) {
      await this.assertNotFinalOwner(tripId, member.id);
    }

    return this.prisma.tripMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteMember(tripId: string, memberId: string, userId: string) {
    await this.assertCanModifyTrip(tripId, userId);
    const member = await this.findTripMemberOrThrow(tripId, memberId);

    if (member.role === TripRole.OWNER) {
      await this.assertNotFinalOwner(tripId, member.id);
    }

    await this.prisma.tripMember.delete({ where: { id: memberId } });
    return { ok: true };
  }

  async createItem(tripId: string, userId: string, dto: CreateTripItemDto) {
    await this.assertCanModifyTrip(tripId, userId);
    const participantMemberIds = await this.resolveParticipantMemberIds(
      tripId,
      dto,
    );

    return this.prisma.tripItem.create({
      data: {
        tripId,
        type: dto.type,
        title: dto.title.trim(),
        notes: dto.notes?.trim() || null,
        date: dateFromDto(dto.date),
        endDate: dateFromDto(dto.endDate),
        startTime: dto.startTime?.trim() || null,
        endTime: dto.endTime?.trim() || null,
        startsAt: startsAtFromDto(dto.date, dto.startTime),
        courseId: dto.courseId?.trim() || null,
        provider: dto.provider?.trim() || null,
        bookingRef: dto.bookingRef?.trim() || null,
        greenFee: dto.greenFee ?? null,
        includeGreenFeeInSplit: dto.includeGreenFeeInSplit ?? true,
        includeCaddyFeeInSplit: dto.includeCaddyFeeInSplit ?? true,
        includeCartFeeInSplit: dto.includeCartFeeInSplit ?? true,
        directPrice: dto.directPrice ?? null,
        caddyFee: dto.caddyFee ?? null,
        cartFee: dto.cartFee ?? null,
        providerPrice: dto.providerPrice ?? null,
        currency: dto.currency?.trim() || null,
        locationName: dto.locationName?.trim() || null,
        address: dto.address?.trim() || null,
        participants:
          participantMemberIds === undefined
            ? undefined
            : {
                create: participantMemberIds.map((tripMemberId) => ({
                  tripMemberId,
                })),
              },
      },
      include: tripItemInclude,
    });
  }

  async updateItem(
    tripId: string,
    itemId: string,
    userId: string,
    dto: UpdateTripItemDto,
  ) {
    await this.assertCanModifyTrip(tripId, userId);
    await this.findTripItemOrThrow(tripId, itemId);
    const participantMemberIds = await this.resolveParticipantMemberIds(
      tripId,
      dto,
    );

    return this.prisma.tripItem.update({
      where: {
        id: itemId,
      },
      data: {
        type: dto.type,
        title: dto.title?.trim(),
        notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
        date: dto.date === undefined ? undefined : dateFromDto(dto.date),
        endDate:
          dto.endDate === undefined ? undefined : dateFromDto(dto.endDate),
        startTime:
          dto.startTime === undefined ? undefined : dto.startTime.trim() || null,
        endTime:
          dto.endTime === undefined ? undefined : dto.endTime.trim() || null,
        startsAt:
          dto.date === undefined
            ? undefined
            : startsAtFromDto(dto.date, dto.startTime),
        courseId:
          dto.courseId === undefined ? undefined : dto.courseId.trim() || null,
        provider:
          dto.provider === undefined ? undefined : dto.provider.trim() || null,
        bookingRef:
          dto.bookingRef === undefined
            ? undefined
            : dto.bookingRef.trim() || null,
        greenFee: dto.greenFee,
        includeGreenFeeInSplit: dto.includeGreenFeeInSplit,
        includeCaddyFeeInSplit: dto.includeCaddyFeeInSplit,
        includeCartFeeInSplit: dto.includeCartFeeInSplit,
        directPrice: dto.directPrice,
        caddyFee: dto.caddyFee,
        cartFee: dto.cartFee,
        providerPrice: dto.providerPrice,
        currency:
          dto.currency === undefined ? undefined : dto.currency.trim() || null,
        locationName:
          dto.locationName === undefined
            ? undefined
            : dto.locationName.trim() || null,
        address:
          dto.address === undefined ? undefined : dto.address.trim() || null,
        participants:
          participantMemberIds === undefined
            ? undefined
            : {
                deleteMany: {},
                create: participantMemberIds.map((tripMemberId) => ({
                  tripMemberId,
                })),
              },
      },
      include: tripItemInclude,
    });
  }

  async deleteItem(tripId: string, itemId: string, userId: string) {
    await this.assertCanModifyTrip(tripId, userId);
    await this.findTripItemOrThrow(tripId, itemId);

    await this.prisma.tripItem.delete({
      where: {
        id: itemId,
      },
    });

    return { ok: true };
  }

  async moveItem(
    tripId: string,
    itemId: string,
    userId: string,
    dto: MoveTripItemDto,
  ) {
    await this.assertCanModifyTrip(tripId, userId);
    const item = await this.findTripItemOrThrow(tripId, itemId);

    const sameDateWhere: Prisma.TripItemWhereInput = {
      tripId,
      date: item.date,
    };

    const items = await this.prisma.tripItem.findMany({
      where: sameDateWhere,
      orderBy: [
        { sortOrder: 'asc' },
        { startTime: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    const currentIndex = items.findIndex((candidate) => candidate.id === itemId);
    if (currentIndex < 0) {
      throw new NotFoundException('Trip item not found');
    }

    const targetIndex =
      dto.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    await this.prisma.$transaction(
      items.map((candidate, index) =>
        this.prisma.tripItem.update({
          where: { id: candidate.id },
          data: { sortOrder: index },
        }),
      ),
    );

    if (targetIndex < 0 || targetIndex >= items.length) {
      return { ok: true };
    }

    const current = items[currentIndex];
    const target = items[targetIndex];

    await this.prisma.$transaction([
      this.prisma.tripItem.update({
        where: { id: current.id },
        data: { sortOrder: targetIndex },
      }),
      this.prisma.tripItem.update({
        where: { id: target.id },
        data: { sortOrder: currentIndex },
      }),
    ]);

    return this.prisma.tripItem.findMany({
      where: sameDateWhere,
      orderBy: [
        { sortOrder: 'asc' },
        { startTime: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      include: tripItemInclude,
    });
  }

  private async assertCanModifyTrip(tripId: string, userId: string) {
    const membership = await this.prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Trip not found');
    }

    if (
      membership.role !== TripRole.OWNER &&
      membership.role !== TripRole.ADMIN
    ) {
      throw new ForbiddenException('Insufficient trip permissions');
    }

    return membership;
  }

  private async assertIsTripMember(tripId: string, userId: string) {
    const membership = await this.prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Trip not found');
    }

    return membership;
  }

  private async findTripMemberOrThrow(tripId: string, memberId: string) {
    const member = await this.prisma.tripMember.findFirst({
      where: {
        id: memberId,
        tripId,
      },
    });

    if (!member) {
      throw new NotFoundException('Trip member not found');
    }

    return member;
  }

  private async assertNotFinalOwner(tripId: string, memberId: string) {
    const ownerCount = await this.prisma.tripMember.count({
      where: {
        tripId,
        role: TripRole.OWNER,
      },
    });

    if (ownerCount <= 1) {
      const member = await this.prisma.tripMember.findUnique({
        where: { id: memberId },
        select: { role: true },
      });

      if (member?.role === TripRole.OWNER) {
        throw new BadRequestException('Trip must have at least one OWNER');
      }
    }
  }

  private async resolveParticipantMemberIds(
    tripId: string,
    dto: {
      participantMemberIds?: string[];
      participantUserIds?: string[];
    },
  ) {
    const hasMemberIds = dto.participantMemberIds !== undefined;
    const hasUserIds = dto.participantUserIds !== undefined;
    if (!hasMemberIds && !hasUserIds) return undefined;

    const participantMemberIds = [
      ...new Set((dto.participantMemberIds ?? []).map((id) => id.trim()).filter(Boolean)),
    ];
    const participantUserIds = [
      ...new Set((dto.participantUserIds ?? []).map((id) => id.trim()).filter(Boolean)),
    ];

    if (participantMemberIds.length === 0 && participantUserIds.length === 0) {
      return [];
    }

    const where: Prisma.TripMemberWhereInput[] = [];
    if (participantMemberIds.length > 0) {
      where.push({ id: { in: participantMemberIds } });
    }
    if (participantUserIds.length > 0) {
      where.push({ userId: { in: participantUserIds } });
    }

    const members = await this.prisma.tripMember.findMany({
      where: {
        tripId,
        OR: where,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const foundMemberIds = new Set(members.map((member) => member.id));
    const foundUserIds = new Set(members.map((member) => member.userId));

    if (
      participantMemberIds.some((id) => !foundMemberIds.has(id)) ||
      participantUserIds.some((id) => !foundUserIds.has(id))
    ) {
      throw new BadRequestException('Participants must be trip members');
    }

    return [...new Set(members.map((member) => member.id))];
  }

  private async findTripItemOrThrow(tripId: string, itemId: string) {
    const item = await this.prisma.tripItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
    });

    if (!item) {
      throw new NotFoundException('Trip item not found');
    }

    return item;
  }
}
