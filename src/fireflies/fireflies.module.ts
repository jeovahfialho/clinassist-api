import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirefliesController } from './fireflies.controller';
import { FirefliesService } from './fireflies.service';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';

@Module({
  imports: [
    ConfigModule, // Para acessar variáveis de ambiente
  ],
  controllers: [FirefliesController],
  providers: [
    FirefliesService,
    PrismaService,
    EncryptionService,
  ],
  exports: [
    FirefliesService, // Exportar para uso em outros módulos
  ],
})
export class FirefliesModule {}