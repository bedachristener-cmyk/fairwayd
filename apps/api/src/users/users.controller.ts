import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';

function safeExt(original: string) {
  const ext = extname(original || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp')
    return ext;
  return '';
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
    return this.users.getMe(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: 'uploads/avatars',
        filename: (req: any, file, cb) => {
          const ext = safeExt(file.originalname) || '.jpg';
          const userId = req.user.userId;
          cb(null, `${userId}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
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
    if (!file) throw new BadRequestException("Missing file field 'avatar'");

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.users.setAvatar(req.user.userId, avatarUrl);
  }
}
