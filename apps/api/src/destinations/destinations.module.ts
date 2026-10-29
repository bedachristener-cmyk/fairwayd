import { Module } from '@nestjs/common';
import { DestinationsController } from './destinations.controller';
import { DestinationsService } from './destinations.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DestinationsController],
  providers: [DestinationsService, PrismaService],
})
export class DestinationsModule {}
