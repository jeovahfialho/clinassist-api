import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { FirefliesModule } from '../fireflies/fireflies.module';

@Module({
  imports: [
    FirefliesModule, // Importar o FirefliesModule
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService, EncryptionService],
  exports: [DocumentsService],
})
export class DocumentsModule {}