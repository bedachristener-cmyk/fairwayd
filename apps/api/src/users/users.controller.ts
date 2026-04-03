import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Req,
  UploadedFile,
  Query,
  UseGuards,
  UseInterceptors,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { uploadToR2 } from '../storage/r2.service';

function safeExt(original: string) {
  const ext = extname(original || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    return ext;
  }
  return '';
}

@ApiTags('users')
@ApiBearerAuth('jwt')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ---------------------------------------------------------
  // Current user (used by onboarding)
  // ---------------------------------------------------------
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
    const userId = req?.user?.userId ?? req?.user?.id;
    return this.users.getMe(userId);
  }

  // ---------------------------------------------------------
  // Terms acceptance
  // ---------------------------------------------------------
  @UseGuards(AuthGuard('jwt'))
  @Post('me/accept-terms')
  async acceptTerms(@Req() req: any, @Body() body: { termsVersion?: string }) {
    const userId = req?.user?.userId ?? req?.user?.id;
    const version = (body?.termsVersion ?? 'v1').trim();
    if (!version) throw new BadRequestException('Missing termsVersion');
    return this.users.acceptTerms(userId, version);
  }

  // ---------------------------------------------------------
  // Profile setup (handle + optional name)
  // ---------------------------------------------------------
  @UseGuards(AuthGuard('jwt'))
  @Post('me/profile')
  async updateProfile(
    @Req() req: any,
    @Body() body: { handle?: string; name?: string | null },
  ) {
    const userId = req?.user?.userId ?? req?.user?.id;

    const handle = body?.handle?.trim();
    if (!handle) throw new BadRequestException('Missing handle');

    const name =
      typeof body?.name === 'string' ? body.name.trim() : (body?.name ?? null);

    return this.users.updateProfile(userId, { handle, name });
  }

  // ---------------------------------------------------------
  // Avatar upload
  // ---------------------------------------------------------
  @UseGuards(AuthGuard('jwt'))
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = safeExt(file.originalname);
        if (!ext) {
          cb(
            new BadRequestException('Only jpg/jpeg/png/webp allowed') as any,
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadMyAvatar(
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req?.user?.userId ?? req?.user?.id;
    if (!file) throw new BadRequestException("Missing file field 'avatar'");
    if (!userId) throw new BadRequestException('Missing user id');

    const ext = (file.mimetype?.split('/')[1] || 'bin').replace(
      /[^a-z0-9]/gi,
      '',
    );
    const key = `avatars/${userId}-${Date.now()}.${ext}`;

    const avatarUrl = await uploadToR2(
      key,
      file.buffer,
      file.mimetype || 'application/octet-stream',
    );

    return this.users.setAvatar(userId, avatarUrl);
  }

  // ---------------------------------------------------------
  // FOLLOW (by userId) — avoid conflict with :handle routes
  // ---------------------------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Post('id/:id/follow')
  @ApiOperation({
    summary: 'Follow or request to follow a user (private => pending)',
  })
  async followUser(@Req() req: any, @Param('id') targetUserId: string) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) throw new BadRequestException('Missing user id');

    if (meId === targetUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    return this.users.followUser(meId, targetUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('id/:id/follow')
  @ApiOperation({ summary: 'Unfollow user OR cancel follow request' })
  async unfollowUser(@Req() req: any, @Param('id') targetUserId: string) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) throw new BadRequestException('Missing user id');

    if (meId === targetUserId) {
      throw new BadRequestException('Cannot unfollow yourself');
    }

    await this.users.unfollowUser(meId, targetUserId);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('id/:id/following-status')
  @ApiOperation({ summary: 'Get follow status for a target userId' })
  async followingStatus(@Req() req: any, @Param('id') targetUserId: string) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) return { status: 'NONE' };

    if (meId === targetUserId) return { status: 'SELF' };

    const status = await this.users.getFollowStatus(meId, targetUserId);
    return { status };
  }

  // ---------------------------------------------------------
  // FOLLOW REQUESTS / FOLLOWING
  // ---------------------------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Get('me/follow-requests')
  @ApiOperation({ summary: 'List pending follow requests for current user' })
  async myFollowRequests(@Req() req: any) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) return { items: [] };

    const items = await this.users.listMyFollowRequests(meId);
    return { items };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/following')
  @ApiOperation({ summary: 'List users current user follows' })
  async myFollowing(@Req() req: any) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) return { items: [] };

    const items = await this.users.listFollowingUsers(meId);
    return { items };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/followers')
  @ApiOperation({ summary: 'List users following the current user' })
  async myFollowers(@Req() req: any) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) return { items: [] };

    const items = await this.users.listFollowerUsers(meId);
    return { items };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/follow-requests/:followerId/accept')
  @ApiOperation({ summary: 'Accept a follow request' })
  async acceptFollow(@Req() req: any, @Param('followerId') followerId: string) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) throw new BadRequestException('Missing user id');

    const ok = await this.users.acceptFollowRequest(meId, followerId);
    if (!ok) throw new NotFoundException('Request not found');

    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/follow-requests/:followerId/reject')
  @ApiOperation({ summary: 'Reject a follow request' })
  async rejectFollow(@Req() req: any, @Param('followerId') followerId: string) {
    const meId = req?.user?.userId ?? req?.user?.id;
    if (!meId) throw new BadRequestException('Missing user id');

    const ok = await this.users.rejectFollowRequest(meId, followerId);
    if (!ok) throw new NotFoundException('Request not found');

    return { ok: true };
  }

  // ---------------------------------------------------------
  // Search
  // Wichtig:
  // - search BEFORE :handle/posts and :handle
  // - keep after "me" routes, otherwise "me" could match :handle
  // ---------------------------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  searchUsers(@Query('q') q?: string) {
    return this.users.searchUsers(q ?? '');
  }

  // ---------------------------------------------------------
  // Profile by handle (authenticated for now)
  // Wichtig:
  // - posts route BEFORE handle route
  // - keep after "me" routes, otherwise "me" could match :handle
  // ---------------------------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Get(':handle/posts')
  async getPostsByHandle(@Req() req: any, @Param('handle') handle: string) {
    const viewerId = req?.user?.userId ?? req?.user?.id;
    return this.users.getPostsByHandle(viewerId, handle);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':handle')
  async getByHandle(@Param('handle') handle: string) {
    return this.users.getByHandle(handle);
  }
}
