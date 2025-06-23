import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, PrismaService, EncryptionService],
  exports: [SessionsService],
})
export class SessionsModule {}