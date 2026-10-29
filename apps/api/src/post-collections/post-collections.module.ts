import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostCollectionsController } from './post-collections.controller';
import { PostCollectionsService } from './post-collections.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostCollectionsController],
  providers: [PostCollectionsService],
})
export class PostCollectionsModule {}
