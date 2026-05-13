import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { uploadToR2 } from '../storage/r2.service';
import { AddTripMemberDto } from './dto/add-trip-member.dto';
import { CreateTripItemDto } from './dto/create-trip-item.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { MoveTripItemDto } from './dto/move-trip-item.dto';
import { UpdateTripMemberDto } from './dto/update-trip-member.dto';
import { UpdateTripItemDto } from './dto/update-trip-item.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

function safeImageExt(original: string) {
  const ext = extname(original || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    return ext;
  }
  return '';
}

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTripDto) {
    return this.tripsService.create(req.user.id, dto);
  }

  @Get()
  findMine(@Req() req: any) {
    return this.tripsService.findMine(req.user.id);
  }

  @Public()
  @Get('invite/:token')
  findInvitePreview(@Param('token') token: string) {
    return this.tripsService.findInvitePreview(token);
  }

  @Post('invite/:token/join')
  joinInvite(@Param('token') token: string, @Req() req: any) {
    return this.tripsService.joinInvite(token, req.user.id);
  }

  @Post(':id/invite')
  getOrCreateInvite(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.getOrCreateInvite(id, req.user.id);
  }

  @Post(':id/invite/regenerate')
  regenerateInvite(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.regenerateInvite(id, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateTripDto) {
    return this.tripsService.update(id, req.user.id, dto);
  }

  @Post(':id/cover')
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = safeImageExt(file.originalname);
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
  async uploadCover(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("Missing file field 'cover'");

    const ext = (file.mimetype?.split('/')[1] || 'bin').replace(
      /[^a-z0-9]/gi,
      '',
    );
    const key = `trips/${id}/cover-${Date.now()}.${ext}`;
    const coverImageUrl = await uploadToR2(
      key,
      file.buffer,
      file.mimetype || 'application/octet-stream',
    );

    return this.tripsService.update(id, req.user.id, { coverImageUrl });
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.delete(id, req.user.id);
  }

  @Get(':id/members')
  findMembers(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.findMembers(id, req.user.id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: AddTripMemberDto,
  ) {
    return this.tripsService.addMember(id, req.user.id, dto);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: any,
    @Body() dto: UpdateTripMemberDto,
  ) {
    return this.tripsService.updateMember(id, memberId, req.user.id, dto);
  }

  @Delete(':id/members/:memberId')
  deleteMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: any,
  ) {
    return this.tripsService.deleteMember(id, memberId, req.user.id);
  }

  @Post(':id/items')
  createItem(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateTripItemDto,
  ) {
    return this.tripsService.createItem(id, req.user.id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
    @Body() dto: UpdateTripItemDto,
  ) {
    return this.tripsService.updateItem(id, itemId, req.user.id, dto);
  }

  @Post(':id/items/:itemId/move')
  moveItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
    @Body() dto: MoveTripItemDto,
  ) {
    return this.tripsService.moveItem(id, itemId, req.user.id, dto);
  }

  @Delete(':id/items/:itemId')
  deleteItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    return this.tripsService.deleteItem(id, itemId, req.user.id);
  }
}
