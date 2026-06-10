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
  TripItemCostMode,
  TripItemExpenseType,
  TripItemPaymentMode,
  TripItemVisibility,
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
import { TripItemCostDto } from './dto/trip-item-cost.dto';
import {
  buildMyCostsSummary,
  buildOrganizerCostsSummary,
} from './budget-v3';

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

function cleanTripItemVisibility(visibility?: TripItemVisibility) {
  if (!visibility) return TripItemVisibility.GROUP;
  if (
    visibility !== TripItemVisibility.PRIVATE &&
    visibility !== TripItemVisibility.SELECTED &&
    visibility !== TripItemVisibility.GROUP
  ) {
    throw new BadRequestException('Unsupported trip item visibility');
  }
  return visibility;
}

function canUseGroupTripItemVisibility(membership: { role: TripRole }) {
  return membership.role === TripRole.OWNER || membership.role === TripRole.ADMIN;
}

function enforceTripItemVisibilityPermission(
  visibility: TripItemVisibility,
  membership: { role: TripRole },
) {
  if (
    visibility === TripItemVisibility.GROUP &&
    !canUseGroupTripItemVisibility(membership)
  ) {
    throw new ForbiddenException('Only trip organizers can use group visibility');
  }

  return visibility;
}

function defaultTripItemCostMode(type: string | null | undefined) {
  if (type === 'golf_round' || type === 'flight') {
    return TripItemCostMode.PER_PERSON;
  }

  return TripItemCostMode.TOTAL;
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
  createdBy: {
    select: tripUserSelect,
  },
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
  costs: {
    orderBy: { createdAt: 'asc' },
    include: {
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
    },
  },
  visibilityMembers: {
    orderBy: { createdAt: 'asc' },
    include: {
      tripMember: {
        include: tripMemberInclude,
      },
    },
  },
  documentLinks: {
    orderBy: { createdAt: 'asc' },
    include: {
      tripDocument: {
        include: {
          uploadedBy: {
            select: tripUserSelect,
          },
        },
      },
    },
  },
} satisfies Prisma.TripItemInclude;

const tripItemOrderBy = [
  { date: 'asc' },
  { sortOrder: 'asc' },
  { startTime: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.TripItemOrderByWithRelationInput[];

const tripDocumentInclude = {
  uploadedBy: {
    select: tripUserSelect,
  },
  itemLinks: {
    orderBy: { createdAt: 'asc' },
    select: {
      tripItemId: true,
    },
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
function visibleTripItemWhereForUser(userId: string): Prisma.TripItemWhereInput {
  return {
    OR: [
      { visibility: TripItemVisibility.GROUP },
      { createdByUserId: userId },
      {
        visibility: TripItemVisibility.SELECTED,
        visibilityMembers: {
          some: {
            tripMember: {
              userId,
            },
          },
        },
      },
    ],
  };
}

function visibleTripItemWhereForMember(
  userId: string,
  tripMemberId: string,
): Prisma.TripItemWhereInput {
  return {
    OR: [
      { visibility: TripItemVisibility.GROUP },
      { createdByUserId: userId },
      {
        visibility: TripItemVisibility.SELECTED,
        visibilityMembers: {
          some: {
            tripMemberId,
          },
        },
      },
    ],
  };
}

function manageableTripItemWhereForMembership(
  userId: string,
  membership: { role: TripRole },
): Prisma.TripItemWhereInput {
  const or: Prisma.TripItemWhereInput[] = [{ createdByUserId: userId }];

  if (membership.role === TripRole.OWNER || membership.role === TripRole.ADMIN) {
    or.push({ visibility: { in: [TripItemVisibility.GROUP, TripItemVisibility.SELECTED] } });
  }

  return { OR: or };
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
        baseCurrency: dto.baseCurrency?.trim() || 'CHF',
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

  async findMine(userId: string) {
    const visibleItemsWhere = visibleTripItemWhereForUser(userId);

    const trips = await this.prisma.trip.findMany({
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
        items: {
          where: visibleItemsWhere,
          orderBy: tripItemOrderBy,
          include: tripItemInclude,
        },
        _count: {
          select: {
            items: {
              where: visibleItemsWhere,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return trips.map((trip) => ({
      ...trip,
      items: this.filterTripItemsForUser(
        trip.items,
        userId,
        trip.members.find((member) => member.userId === userId)?.id,
        trip.members.some(
          (member) =>
            member.userId === userId &&
            (member.role === TripRole.OWNER || member.role === TripRole.ADMIN),
        ),
      ),
    }));
  }

  async findOne(tripId: string, userId: string) {
    const membership = await this.assertIsTripMember(tripId, userId);

    const trip = await this.prisma.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: tripMemberInclude,
        },
        items: {
          where: visibleTripItemWhereForMember(userId, membership.id),
          orderBy: tripItemOrderBy,
          include: tripItemInclude,
        },
        documents: {
          where: {
            OR: [
              { visibility: TripDocumentVisibility.SHARED },
              { uploadedByUserId: userId },
            ],
          },
          orderBy: { createdAt: 'desc' },
          include: tripDocumentInclude,
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return {
      ...trip,
      items: this.filterTripItemsForUser(
        trip.items,
        userId,
        membership.id,
        membership.role === TripRole.OWNER || membership.role === TripRole.ADMIN,
      ),
    };
  }

  async findMyCosts(tripId: string, userId: string) {
    const membership = await this.assertIsTripMember(tripId, userId);
    const trip = await this.findTripWithCostsOrThrow(tripId);

    return buildMyCostsSummary({
      tripId: trip.id,
      baseCurrency: trip.baseCurrency?.trim() || 'CHF',
      currentMemberId: membership.id,
      currentUserId: userId,
      members: trip.members,
      items: trip.items,
    });
  }

  async findOrganizerCosts(tripId: string, userId: string) {
    await this.assertCanModifyTrip(tripId, userId);
    const trip = await this.findTripWithCostsOrThrow(tripId);

    return buildOrganizerCostsSummary({
      tripId: trip.id,
      baseCurrency: trip.baseCurrency?.trim() || 'CHF',
      members: trip.members,
      items: trip.items,
    });
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
        baseCurrency:
          dto.baseCurrency === undefined
            ? undefined
            : dto.baseCurrency.trim() || 'CHF',
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
          where: visibleTripItemWhereForUser(userId),
          orderBy: tripItemOrderBy,
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

    return {
      ...trip,
      items: this.filterTripItemsDocumentsForUser(trip.items, userId),
    };
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
    const membership = await this.assertIsTripMember(tripId, userId);
    const paidByMemberId = await this.resolveOptionalTripMemberId(
      tripId,
      dto.paidByMemberId,
    );
    const expenseType = dto.expenseType ?? TripItemExpenseType.SHARED;
    const participantMemberIds = await this.resolveExpenseParticipantMemberIds(
      tripId,
      dto,
      expenseType,
      paidByMemberId,
      membership.id,
      true,
    );
    const itemCosts = await this.resolveTripItemCosts(
      tripId,
      dto,
      dto.costs,
      paidByMemberId,
      participantMemberIds,
      membership.id,
      true,
    );
    const requestedVisibility =
      dto.visibility === undefined && !canUseGroupTripItemVisibility(membership)
        ? TripItemVisibility.PRIVATE
        : cleanTripItemVisibility(dto.visibility);
    const visibility = enforceTripItemVisibilityPermission(
      requestedVisibility,
      membership,
    );
    const visibleToMemberIds =
      visibility === TripItemVisibility.SELECTED
        ? await this.resolveVisibilityMemberIds(tripId, dto.visibleToMemberIds)
        : [];
    const documentIds = await this.resolveLinkableDocumentIds(
      tripId,
      userId,
      dto.documentIds,
    );

    const item = await this.prisma.tripItem.create({
      data: {
        tripId,
        createdByUserId: userId,
        visibility,
        type: dto.type,
        title: dto.title.trim(),
        notes: dto.notes?.trim() || null,
        date: dateFromDto(dto.date),
        endDate: dateFromDto(dto.endDate),
        startTime: dto.startTime?.trim() || null,
        endTime: dto.endTime?.trim() || null,
        departureFromHotelTime: dto.departureFromHotelTime?.trim() || null,
        roundDurationMinutes: dto.roundDurationMinutes ?? null,
        returnToHotel: dto.returnToHotel?.trim() || null,
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
        amount: dto.amount ?? null,
        costMode: dto.costMode ?? defaultTripItemCostMode(dto.type),
        currency: dto.currency?.trim() || null,
        exchangeRate: dto.exchangeRate ?? null,
        baseAmount: dto.baseAmount ?? null,
        locationName: dto.locationName?.trim() || null,
        address: dto.address?.trim() || null,
        paidByMemberId,
        expenseType,
        participants:
          participantMemberIds === undefined
            ? undefined
            : {
                create: participantMemberIds.map((tripMemberId) => ({
                  tripMemberId,
                })),
              },
        costs:
          itemCosts === undefined
            ? undefined
            : {
                create: itemCosts,
              },
        visibilityMembers:
          visibility === TripItemVisibility.SELECTED
            ? {
                create: visibleToMemberIds.map((tripMemberId) => ({
                  tripMemberId,
                })),
              }
            : undefined,
        documentLinks:
          documentIds.length > 0
            ? {
                create: documentIds.map((tripDocumentId) => ({
                  tripDocumentId,
                })),
              }
            : undefined,
      },
      include: tripItemInclude,
    });

    if (item.visibility === TripItemVisibility.GROUP) {
      void this.createTripActivity(
        tripId,
        userId,
        TripActivityType.ITEM_CREATED,
        (name) => `${name} added item: ${item.title || 'Untitled item'}`,
        { itemId: item.id, type: item.type },
      );
    }

    return this.filterTripItemDocumentsForUser(item, userId);
  }

  async updateItem(
    tripId: string,
    itemId: string,
    userId: string,
    dto: UpdateTripItemDto,
  ) {
    const existingItem = await this.findManageableTripItemOrThrow(
      tripId,
      itemId,
      userId,
    );
    const membership = await this.assertIsTripMember(tripId, userId);
    const paidByMemberId =
      dto.paidByMemberId === undefined
        ? undefined
        : await this.resolveOptionalTripMemberId(tripId, dto.paidByMemberId);
    const expenseType = dto.expenseType ?? existingItem.expenseType;
    const effectivePaidByMemberId =
      paidByMemberId === undefined
        ? existingItem.paidByMemberId
        : paidByMemberId;
    const participantMemberIds = await this.resolveExpenseParticipantMemberIds(
      tripId,
      dto,
      expenseType,
      effectivePaidByMemberId,
      membership.id,
      dto.expenseType !== undefined,
    );
    const itemCosts =
      dto.costs === undefined
        ? undefined
        : await this.resolveTripItemCosts(
            tripId,
            dto,
            dto.costs,
            effectivePaidByMemberId,
            participantMemberIds,
            membership.id,
            false,
          );
    const visibility =
      dto.visibility === undefined
        ? undefined
        : enforceTripItemVisibilityPermission(
            cleanTripItemVisibility(dto.visibility),
            membership,
          );
    const visibilityForMembers = visibility ?? existingItem.visibility;
    const visibleToMemberIds =
      dto.visibleToMemberIds === undefined
        ? undefined
        : visibilityForMembers === TripItemVisibility.SELECTED
          ? await this.resolveVisibilityMemberIds(
              tripId,
              dto.visibleToMemberIds,
            )
          : [];
    const shouldReplaceVisibilityMembers =
      visibleToMemberIds !== undefined ||
      visibility === TripItemVisibility.PRIVATE ||
      visibility === TripItemVisibility.GROUP;
    const documentIds =
      dto.documentIds === undefined
        ? undefined
        : await this.resolveLinkableDocumentIds(tripId, userId, dto.documentIds);

    const item = await this.prisma.tripItem.update({
      where: {
        id: itemId,
      },
      data: {
        visibility,
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
        departureFromHotelTime:
          dto.departureFromHotelTime === undefined
            ? undefined
            : dto.departureFromHotelTime.trim() || null,
        roundDurationMinutes: dto.roundDurationMinutes,
        returnToHotel:
          dto.returnToHotel === undefined
            ? undefined
            : dto.returnToHotel.trim() || null,
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
        amount: dto.amount,
        costMode: dto.costMode,
        currency:
          dto.currency === undefined ? undefined : dto.currency.trim() || null,
        exchangeRate: dto.exchangeRate,
        baseAmount: dto.baseAmount,
        locationName:
          dto.locationName === undefined
            ? undefined
            : dto.locationName.trim() || null,
        address:
          dto.address === undefined ? undefined : dto.address.trim() || null,
        paidByMemberId,
        expenseType: dto.expenseType,
        participants:
          participantMemberIds === undefined
            ? undefined
            : {
                deleteMany: {},
                create: participantMemberIds.map((tripMemberId) => ({
                  tripMemberId,
                })),
              },
        costs:
          itemCosts === undefined
            ? undefined
            : {
                deleteMany: {},
                create: itemCosts,
              },
        visibilityMembers: shouldReplaceVisibilityMembers
          ? {
              deleteMany: {},
              create:
                visibilityForMembers === TripItemVisibility.SELECTED
                  ? (visibleToMemberIds ?? []).map((tripMemberId) => ({
                      tripMemberId,
                    }))
                  : [],
            }
          : undefined,
        documentLinks:
          documentIds === undefined
            ? undefined
            : {
                deleteMany: {},
                create: documentIds.map((tripDocumentId) => ({
                  tripDocumentId,
                })),
              },
      },
      include: tripItemInclude,
    });

    if (item.visibility === TripItemVisibility.GROUP) {
      void this.createTripActivity(
        tripId,
        userId,
        TripActivityType.ITEM_UPDATED,
        (name) =>
          `${name} updated item: ${item.title || existingItem.title || 'Untitled item'}`,
        { itemId: item.id, type: item.type },
      );
    }

    return this.filterTripItemDocumentsForUser(item, userId);
  }

  async deleteItem(tripId: string, itemId: string, userId: string) {
    const item = await this.findManageableTripItemOrThrow(
      tripId,
      itemId,
      userId,
    );

    await this.prisma.tripItem.delete({
      where: {
        id: itemId,
      },
    });

    if (item.visibility === TripItemVisibility.GROUP) {
      void this.createTripActivity(
        tripId,
        userId,
        TripActivityType.ITEM_DELETED,
        (name) => `${name} deleted item: ${item.title || 'Untitled item'}`,
        { itemId, type: item.type },
      );
    }

    return { ok: true };
  }

  async moveItem(
    tripId: string,
    itemId: string,
    userId: string,
    dto: MoveTripItemDto,
  ) {
    const membership = await this.assertIsTripMember(tripId, userId);
    const item = await this.findManageableTripItemOrThrow(
      tripId,
      itemId,
      userId,
      membership,
    );

    const sameDateWhere: Prisma.TripItemWhereInput = {
      tripId,
      date: item.date,
      ...manageableTripItemWhereForMembership(userId, membership),
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

    const movedItems = await this.prisma.tripItem.findMany({
      where: sameDateWhere,
      orderBy: [
        { sortOrder: 'asc' },
        { startTime: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      include: tripItemInclude,
    });

    return this.filterTripItemsDocumentsForUser(movedItems, userId);
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
        id: true,
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

  private async resolveExpenseParticipantMemberIds(
    tripId: string,
    dto: {
      participantMemberIds?: string[];
      participantUserIds?: string[];
    },
    expenseType: TripItemExpenseType,
    paidByMemberId: string | null | undefined,
    currentMemberId: string,
    shouldDefault: boolean,
  ) {
    const participantMemberIds = await this.resolveParticipantMemberIds(
      tripId,
      dto,
    );

    if (participantMemberIds !== undefined) {
      return participantMemberIds;
    }

    if (!shouldDefault) return undefined;

    if (expenseType === TripItemExpenseType.PERSONAL) {
      return [paidByMemberId || currentMemberId];
    }

    const members = await this.prisma.tripMember.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return members.map((member) => member.id);
  }

  private hasLegacyCostInput(dto: {
    amount?: number;
    baseAmount?: number;
    greenFee?: number;
    directPrice?: number;
    caddyFee?: number;
    cartFee?: number;
    providerPrice?: number;
  }) {
    return [
      dto.amount,
      dto.baseAmount,
      dto.greenFee,
      dto.directPrice,
      dto.caddyFee,
      dto.cartFee,
      dto.providerPrice,
    ].some((value) => typeof value === 'number' && Number.isFinite(value));
  }

  private defaultPaymentMode(paidByMemberId?: string | null) {
    return paidByMemberId
      ? TripItemPaymentMode.PAID_BY_ONE
      : TripItemPaymentMode.EACH_PAYS_OWN;
  }

  private async resolveTripItemCosts(
    tripId: string,
    itemDto: {
      title?: string;
      type?: string;
      amount?: number;
      currency?: string;
      exchangeRate?: number;
      baseAmount?: number;
      costMode?: TripItemCostMode;
      greenFee?: number;
      directPrice?: number;
      caddyFee?: number;
      cartFee?: number;
      providerPrice?: number;
    },
    costs: TripItemCostDto[] | undefined,
    fallbackPaidByMemberId: string | null | undefined,
    fallbackParticipantMemberIds: string[] | undefined,
    currentMemberId: string,
    includeLegacyFallback: boolean,
  ): Promise<Prisma.TripItemCostCreateWithoutTripItemInput[] | undefined> {
    const sourceCosts =
      costs ??
      (includeLegacyFallback && this.hasLegacyCostInput(itemDto)
        ? [
            {
              label: itemDto.title,
              amount: itemDto.amount,
              currency: itemDto.currency,
              exchangeRate: itemDto.exchangeRate,
              baseAmount: itemDto.baseAmount,
              costMode: itemDto.costMode ?? defaultTripItemCostMode(itemDto.type),
              paymentMode: this.defaultPaymentMode(fallbackPaidByMemberId),
              paidByMemberId: fallbackPaidByMemberId ?? undefined,
              participantMemberIds: fallbackParticipantMemberIds,
            } satisfies TripItemCostDto,
          ]
        : undefined);

    if (sourceCosts === undefined) return undefined;

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { baseCurrency: true },
    });
    const baseCurrency = trip?.baseCurrency?.trim().toUpperCase();
    const resolvedCosts: Prisma.TripItemCostCreateWithoutTripItemInput[] = [];

    for (const cost of sourceCosts) {
      const paidByMemberId =
        cost.paidByMemberId === undefined
          ? fallbackPaidByMemberId
          : await this.resolveOptionalTripMemberId(tripId, cost.paidByMemberId);
      const explicitParticipantMemberIds = await this.resolveParticipantMemberIds(
        tripId,
        cost,
      );
      const participantMemberIds =
        explicitParticipantMemberIds ??
        fallbackParticipantMemberIds ??
        (await this.resolveExpenseParticipantMemberIds(
          tripId,
          {},
          TripItemExpenseType.SHARED,
          paidByMemberId,
          currentMemberId,
          true,
        ));
      const amount =
        typeof cost.amount === 'number' && Number.isFinite(cost.amount)
          ? cost.amount
          : null;
      const currency =
        cost.currency?.trim() || itemDto.currency?.trim() || null;
      const isBaseCurrency =
        amount !== null &&
        Boolean(currency) &&
        Boolean(baseCurrency) &&
        currency!.toUpperCase() === baseCurrency;

      resolvedCosts.push({
        label: cost.label?.trim() || itemDto.title?.trim() || null,
        amount,
        currency,
        exchangeRate: isBaseCurrency ? 1 : cost.exchangeRate ?? null,
        baseAmount: isBaseCurrency ? amount : cost.baseAmount ?? null,
        costMode: cost.costMode ?? itemDto.costMode ?? defaultTripItemCostMode(itemDto.type),
        paymentMode: cost.paymentMode ?? this.defaultPaymentMode(paidByMemberId),
        paidByMember:
          paidByMemberId === null || paidByMemberId === undefined
            ? undefined
            : {
                connect: { id: paidByMemberId },
              },
        participants: {
          create: (participantMemberIds ?? []).map((tripMemberId) => ({
            tripMemberId,
          })),
        },
      });
    }

    return resolvedCosts;
  }

  private async resolveLinkableDocumentIds(
    tripId: string,
    userId: string,
    documentIds?: string[],
  ) {
    const uniqueIds = [
      ...new Set((documentIds ?? []).map((id) => id.trim()).filter(Boolean)),
    ];
    if (uniqueIds.length === 0) return [];

    const documents = await this.prisma.tripDocument.findMany({
      where: {
        id: { in: uniqueIds },
        tripId,
        OR: [
          { visibility: TripDocumentVisibility.SHARED },
          { uploadedByUserId: userId },
        ],
      },
      select: { id: true },
    });

    if (documents.length !== uniqueIds.length) {
      throw new BadRequestException('One or more trip documents are unavailable');
    }

    return uniqueIds;
  }

  private filterTripItemsForUser<T extends {
    createdByUserId?: string | null;
    costs?: any[];
    documentLinks?: any[];
  }>(
    items: T[],
    userId: string,
    tripMemberId?: string,
    canSeeAllCosts = false,
  ) {
    return items.map((item) => {
      const itemWithDocuments = this.filterTripItemDocumentsForUser(item, userId);

      if (!Array.isArray(itemWithDocuments.costs) || canSeeAllCosts) {
        return itemWithDocuments;
      }

      return {
        ...itemWithDocuments,
        costs: itemWithDocuments.costs.filter((cost) =>
          this.isCostVisibleToMember(cost, itemWithDocuments, userId, tripMemberId),
        ),
      };
    });
  }

  private filterTripItemsDocumentsForUser<T extends { documentLinks?: any[] }>(
    items: T[],
    userId: string,
  ) {
    return items.map((item) => this.filterTripItemDocumentsForUser(item, userId));
  }

  private filterTripItemDocumentsForUser<T extends { documentLinks?: any[] }>(
    item: T,
    userId: string,
  ) {
    if (!Array.isArray(item.documentLinks)) return item;

    return {
      ...item,
      documentLinks: item.documentLinks.filter((link) => {
        const document = link?.tripDocument;
        return (
          document?.visibility === TripDocumentVisibility.SHARED ||
          document?.uploadedByUserId === userId
        );
      }),
    };
  }

  private isCostVisibleToMember(
    cost: {
      paidByMemberId?: string | null;
      participants?: { tripMemberId?: string | null }[];
    },
    item: { createdByUserId?: string | null },
    userId: string,
    tripMemberId?: string,
  ) {
    if (item.createdByUserId === userId) return true;
    if (!tripMemberId) return false;
    if (cost.paidByMemberId === tripMemberId) return true;
    return (cost.participants ?? []).some(
      (participant) => participant.tripMemberId === tripMemberId,
    );
  }

  private async findTripWithCostsOrThrow(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: tripMemberInclude,
        },
        items: {
          orderBy: tripItemOrderBy,
          include: tripItemInclude,
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }


  private async resolveVisibilityMemberIds(
    tripId: string,
    visibleToMemberIds?: string[],
  ) {
    const memberIds = [
      ...new Set(
        (visibleToMemberIds ?? []).map((id) => id.trim()).filter(Boolean),
      ),
    ];

    if (memberIds.length === 0) {
      return [];
    }

    const members = await this.prisma.tripMember.findMany({
      where: {
        tripId,
        id: { in: memberIds },
      },
      select: {
        id: true,
      },
    });

    const foundMemberIds = new Set(members.map((member) => member.id));
    if (memberIds.some((id) => !foundMemberIds.has(id))) {
      throw new BadRequestException('Visible members must be trip members');
    }

    return memberIds;
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

  private async findManageableTripItemOrThrow(
    tripId: string,
    itemId: string,
    userId: string,
    membership?: { role: TripRole },
  ) {
    const tripMembership = membership ?? (await this.assertIsTripMember(tripId, userId));
    const item = await this.prisma.tripItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        date: true,
        paidByMemberId: true,
        costMode: true,
        expenseType: true,
        visibility: true,
        createdByUserId: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Trip item not found');
    }

    if (item.createdByUserId === userId) {
      return item;
    }

    if (item.visibility === TripItemVisibility.PRIVATE) {
      throw new NotFoundException('Trip item not found');
    }

    if (
      tripMembership.role === TripRole.OWNER ||
      tripMembership.role === TripRole.ADMIN
    ) {
      return item;
    }

    throw new ForbiddenException('Insufficient trip item permissions');
  }
}
