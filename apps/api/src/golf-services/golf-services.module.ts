import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GolfServicesController } from './golf-services.controller';
import { GolfServicesService } from './golf-services.service';

@Module({
  imports: [PrismaModule],
  controllers: [GolfServicesController],
  providers: [GolfServicesService],
})
export class GolfServicesModule {}
