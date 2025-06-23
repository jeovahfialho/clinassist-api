import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService, EncryptionService],
  exports: [PatientsService],
})
export class PatientsModule {}