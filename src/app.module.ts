import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    AuthModule,
    PatientsModule,
    SessionsModule,
    FirefliesModule,
    DocumentsModule,
  ],
  providers: [
    PrismaService,
    EncryptionService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}