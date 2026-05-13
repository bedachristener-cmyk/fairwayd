import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TripActivityType,
  TripDocumentCategory,
  TripDocumentVisibility,
  TripRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
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

function cleanTripDocumentCategory(category?: string) {
  const value = (category || 'GENERAL').trim().toUpperCase();

  if (
    value !== TripDocumentCategory.FLIGHT &&
    value !== TripDocumentCategory.HOTEL &&
    value !== TripDocumentCategory.GOLF &&
    value !== TripDocumentCategory.TRANSFER &&
    value !== TripDocumentCategory.VISA &&
    value !== TripDocumentCategory.GENERAL
  ) {
    throw new BadRequestException('Unsupported trip document category');
  }

  return value;
}

function cleanTripDocumentVisibility(visibility?: string) {
  const value = (visibility || 'SHARED').trim().toUpperCase();

  if (
    value !== TripDocumentVisibility.SHARED &&
    value !== TripDocumentVisibility.PRIVATE
  ) {
    throw new BadRequestException('Unsupported trip document visibility');
  }

  return value;
}

const tripUserSelect = {
  id: true,
  handle: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const tripMemberInclude = {
  user: {
    select: tripUserSelect,
  },
} satisfies Prisma.TripMemberInclude;

const tripItemInclude = {
  course: true,
  paidByMember: {
    include: tripMemberInclude,
  },
  participants: {
    orderBy: { createdAt: 'asc' },
    include: {
      tripMember: {
        include: tripMemberInclude,
      },
    },
  },
} satisfies Prisma.TripItemInclude;

const tripDocumentInclude = {
  uploadedBy: {
    select: tripUserSelect,
  },
} satisfies Prisma.TripDocumentInclude;

const tripActivityInclude = {
  actorUser: {
    select: tripUserSelect,
  },
} satisfies Prisma.TripActivityInclude;

function inviteToken() {
  return randomBytes(32).toString('base64url');
}

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
          include: tripMemberInclude,
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
          include: tripMemberInclude,
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
          include: tripMemberInclude,
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

  async getOrCreateInvite(tripId: string, userId: string) {
    await this.assertCanModifyTrip(tripId, userId);

    const existing = await this.prisma.tripInvite.findFirst({
      where: {
        tripId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return existing;

    const invite = await this.prisma.tripInvite.create({
      data: {
        tripId,
        token: inviteToken(),
        createdByUserId: userId,
      },
    });

    void this.createTripActivity(
      tripId,
      userId,
      TripActivityType.INVITE_CREATED,
      (name) => `${name} created an invite link`,
    );

    return invite;
  }

  async regenerateInvite(tripId: string, userId: string) {
    await this.assertCanModifyTrip(tripId, userId);

    await this.prisma.tripInvite.updateMany({
      where: {
        tripId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const invite = await this.prisma.tripInvite.create({
      data: {
        tripId,
        token: inviteToken(),
        createdByUserId: userId,
      },
    });

    void this.createTripActivity(
      tripId,
      userId,
      TripActivityType.INVITE_CREATED,
      (name) => `${name} created an invite link`,
    );

    return invite;
  }

  async findInvitePreview(token: string) {
    const invite = await this.findActiveInviteOrThrow(token);

    return {
      token: invite.token,
      trip: {
        id: invite.trip.id,
        title: invite.trip.title,
        destination: invite.trip.destination,
        coverImageUrl: invite.trip.coverImageUrl,
        memberCount: invite.trip._count.members,
        itemCount: invite.trip._count.items,
      },
    };
  }

  async joinInvite(token: string, userId: string) {
    const invite = await this.findActiveInviteOrThrow(token);

    const existing = await this.prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId: invite.tripId,
          userId,
        },
      },
      include: tripMemberInclude,
    });

    if (existing) {
      return {
        tripId: invite.tripId,
        member: existing,
        alreadyMember: true,
      };
    }

    const member = await this.prisma.tripMember.create({
      data: {
        tripId: invite.tripId,
        userId,
        isGuest: false,
        role: TripRole.MEMBER,
      },
      include: tripMemberInclude,
    });

    void this.createTripActivity(
      invite.tripId,
      userId,
      TripActivityType.MEMBER_ADDED,
      (name) => `${name} added member: ${this.tripMemberDisplayName(member)}`,
      { memberId: member.id, joinedViaInvite: true },
    );

    return {
      tripId: invite.tripId,
      member,
      alreadyMember: false,
    };
  }

  async update(tripId: string, userId: string, dto: UpdateTripDto) {
    await this.assertCanModifyTrip(tripId, userId);

    const trip = await this.prisma.trip.update({
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
          include: tripMemberInclude,
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

    void this.createTripActivity(
      tripId,
      userId,
      TripActivityType.TRIP_UPDATED,
      (name) => `${name} updated trip details`,
    );

    return trip;
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
      include: tripMemberInclude,
    });
  }

  async findDocuments(tripId: string, userId: string) {
    await this.assertIsTripMember(tripId, userId);

    return this.prisma.tripDocument.findMany({
      where: {
        tripId,
        OR: [
          { visibility: TripDocumentVisibility.SHARED },
          { uploadedByUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: tripDocumentInclude,
    });
  }

  async findActivity(tripId: string, userId: string) {
    await this.assertIsTripMember(tripId, userId);

    return this.prisma.tripActivity.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: tripActivityInclude,
    });
  }

  async assertCanManageDocuments(tripId: string, userId: string) {
    await this.assertIsTripMember(tripId, userId);
  }

  async createDocument(
    tripId: string,
    userId: string,
    data: {
      title?: string;
      note?: string;
      category?: string;
      fileUrl: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      visibility?: string;
    },
  ) {
    await this.assertIsTripMember(tripId, userId);

    const title = data.title?.trim();
    if (!title) throw new BadRequestException('Document title is required');
    const visibility = cleanTripDocumentVisibility(data.visibility);

    const document = await this.prisma.tripDocument.create({
      data: {
        tripId,
        title,
        note: data.note?.trim() || null,
        category: cleanTripDocumentCategory(data.category),
        visibility,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedByUserId: userId,
      },
      include: tripDocumentInclude,
    });

    if (document.visibility === TripDocumentVisibility.SHARED) {
      void this.createTripActivity(
        tripId,
        userId,
        TripActivityType.DOCUMENT_UPLOADED,
        (name) => `${name} uploaded document: ${title}`,
        { documentId: document.id, category: document.category },
      );
    }

    return document;
  }

  async deleteDocument(tripId: string, documentId: string, userId: string) {
    const membership = await this.assertIsTripMember(tripId, userId);

    const document = await this.prisma.tripDocument.findFirst({
      where: {
        id: documentId,
        tripId,
      },
      select: {
        id: true,
        title: true,
        uploadedByUserId: true,
        visibility: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Trip document not found');
    }

    const isUploader = document.uploadedByUserId === userId;
    const canDeleteAnyShared =
      document.visibility === TripDocumentVisibility.SHARED &&
      (membership.role === TripRole.OWNER || membership.role === TripRole.ADMIN);
    if (!isUploader && !canDeleteAnyShared) {
      throw new ForbiddenException('Insufficient trip document permissions');
    }

    await this.prisma.tripDocument.delete({
      where: {
        id: documentId,
      },
    });

    if (document.visibility === TripDocumentVisibility.SHARED) {
      void this.createTripActivity(
        tripId,
        userId,
        TripActivityType.DOCUMENT_DELETED,
        (name) => `${name} deleted document: ${document.title}`,
        { documentId },
      );
    }

    return { ok: true };
  }

  async addMember(tripId: string, userId: string, dto: AddTripMemberDto) {
    await this.assertCanModifyTrip(tripId, userId);
    const requestedUserId = dto.userId?.trim();
    const displayName = dto.displayName?.trim();

    if (!requestedUserId && !displayName) {
      throw new BadRequestException('Trip member requires userId or displayName');
    }

    if (requestedUserId && displayName) {
      throw new BadRequestException('Provide either userId or displayName');
    }

    if (displayName) {
      const existingGuest = await this.prisma.tripMember.findFirst({
        where: {
          tripId,
          isGuest: true,
          displayName: {
            equals: displayName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (existingGuest) {
        throw new ConflictException('Guest is already a trip member');
      }

      const member = await this.prisma.tripMember.create({
        data: {
          tripId,
          displayName,
          isGuest: true,
          role: cleanTripRole(dto.role),
        },
        include: tripMemberInclude,
      });

      void this.createTripActivity(
        tripId,
        userId,
        TripActivityType.MEMBER_ADDED,
        (name) => `${name} added member: ${this.tripMemberDisplayName(member)}`,
        { memberId: member.id, isGuest: true },
      );

      return member;
    }

    try {
      const member = await this.prisma.tripMember.create({
        data: {
          tripId,
          userId: requestedUserId,
          isGuest: false,
          role: cleanTripRole(dto.role),
        },
        include: tripMemberInclude,
      });

      void this.createTripActivity(
        tripId,
        userId,
        TripActivityType.MEMBER_ADDED,
        (name) => `${name} added member: ${this.tripMemberDisplayName(member)}`,
        { memberId: member.id, userId: requestedUserId },
      );

      return member;
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
      include: tripMemberInclude,
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
    const paidByMemberId = await this.resolveOptionalTripMemberId(
      tripId,
      dto.paidByMemberId,
    );

    const item = await this.prisma.tripItem.create({
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
        paidByMemberId,
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

    void this.createTripActivity(
      tripId,
      userId,
      TripActivityType.ITEM_CREATED,
      (name) => `${name} added item: ${item.title || 'Untitled item'}`,
      { itemId: item.id, type: item.type },
    );

    return item;
  }

  async updateItem(
    tripId: string,
    itemId: string,
    userId: string,
    dto: UpdateTripItemDto,
  ) {
    await this.assertCanModifyTrip(tripId, userId);
    const existingItem = await this.findTripItemOrThrow(tripId, itemId);
    const participantMemberIds = await this.resolveParticipantMemberIds(
      tripId,
      dto,
    );
    const paidByMemberId =
      dto.paidByMemberId === undefined
        ? undefined
        : await this.resolveOptionalTripMemberId(tripId, dto.paidByMemberId);

    const item = await this.prisma.tripItem.update({
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
        paidByMemberId,
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

    void this.createTripActivity(
      tripId,
      userId,
      TripActivityType.ITEM_UPDATED,
      (name) =>
        `${name} updated item: ${item.title || existingItem.title || 'Untitled item'}`,
      { itemId: item.id, type: item.type },
    );

    return item;
  }

  async deleteItem(tripId: string, itemId: string, userId: string) {
    await this.assertCanModifyTrip(tripId, userId);
    const item = await this.findTripItemOrThrow(tripId, itemId);

    await this.prisma.tripItem.delete({
      where: {
        id: itemId,
      },
    });

    void this.createTripActivity(
      tripId,
      userId,
      TripActivityType.ITEM_DELETED,
      (name) => `${name} deleted item: ${item.title || 'Untitled item'}`,
      { itemId, type: item.type },
    );

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

  private async createTripActivity(
    tripId: string,
    actorUserId: string | null | undefined,
    type: TripActivityType,
    messageForName: (actorName: string) => string,
    metadata?: Prisma.InputJsonValue,
  ) {
    try {
      const actorName = await this.resolveActivityActorName(actorUserId);

      await this.prisma.tripActivity.create({
        data: {
          tripId,
          actorUserId: actorUserId || null,
          actorName,
          type,
          message: messageForName(actorName),
          metadata: metadata ?? undefined,
        },
      });
    } catch (error) {
      console.error('Failed to create trip activity', error);
    }
  }

  private async resolveActivityActorName(userId?: string | null) {
    if (!userId) return 'Someone';

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        handle: true,
        name: true,
        email: true,
      },
    });

    return user?.name || user?.handle || user?.email || 'Someone';
  }

  private tripMemberDisplayName(member: {
    displayName?: string | null;
    user?: {
      name?: string | null;
      handle?: string | null;
    } | null;
    userId?: string | null;
  }) {
    return (
      member.displayName ||
      member.user?.name ||
      member.user?.handle ||
      member.userId ||
      'member'
    );
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

  private async findActiveInviteOrThrow(token: string) {
    const cleanToken = token.trim();
    if (!cleanToken) throw new NotFoundException('Invite not found');

    const invite = await this.prisma.tripInvite.findUnique({
      where: { token: cleanToken },
      include: {
        trip: {
          include: {
            _count: {
              select: {
                items: true,
                members: true,
              },
            },
          },
        },
      },
    });

    if (
      !invite ||
      invite.revokedAt ||
      (invite.expiresAt && invite.expiresAt <= new Date())
    ) {
      throw new NotFoundException('Invite not found');
    }

    return invite;
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
        role: true,
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
    const foundUserIds = new Set(
      members
        .map((member) => member.userId)
        .filter((id): id is string => Boolean(id)),
    );

    if (
      participantMemberIds.some((id) => !foundMemberIds.has(id)) ||
      participantUserIds.some((id) => !foundUserIds.has(id))
    ) {
      throw new BadRequestException('Participants must be trip members');
    }

    return [...new Set(members.map((member) => member.id))];
  }

  private async resolveOptionalTripMemberId(
    tripId: string,
    memberId?: string,
  ) {
    const id = memberId?.trim();
    if (!id) return null;

    const member = await this.prisma.tripMember.findFirst({
      where: {
        id,
        tripId,
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new BadRequestException('Paid by must be a trip member');
    }

    return member.id;
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
