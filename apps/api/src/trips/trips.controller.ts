import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddTripMemberDto } from './dto/add-trip-member.dto';
import { CreateTripItemDto } from './dto/create-trip-item.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripMemberDto } from './dto/update-trip-member.dto';
import { UpdateTripItemDto } from './dto/update-trip-item.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

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

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateTripDto) {
    return this.tripsService.update(id, req.user.id, dto);
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

  @Delete(':id/items/:itemId')
  deleteItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    return this.tripsService.deleteItem(id, itemId, req.user.id);
  }
}
