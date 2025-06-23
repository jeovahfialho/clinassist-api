import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { SessionsModule } from './sessions/sessions.module';
import { FirefliesModule } from './fireflies/fireflies.module';
import { DocumentsModule } from './documents/documents.module';
import { PrismaService } from './database/prisma.service';
import { EncryptionService } from './common/services/encryption.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PatientsModule,
    SessionsModule,
    FirefliesModule,
    DocumentsModule,
  ],
  providers: [PrismaService, EncryptionService],
})
export class AppModule {}