import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { SessionStatus } from '@prisma/client';
export declare class SessionsService {
    private prisma;
    private encryptionService;
    constructor(prisma: PrismaService, encryptionService: EncryptionService);
    create(createSessionDto: CreateSessionDto, psychologistId: string): Promise<any>;
    findAll(psychologistId: string, filters: SessionFiltersDto): Promise<PaginatedResult<any>>;
    findOne(id: string, psychologistId: string): Promise<any>;
    update(id: string, updateSessionDto: UpdateSessionDto, psychologistId: string): Promise<any>;
    updateStatus(id: string, status: SessionStatus, psychologistId: string): Promise<any>;
    remove(id: string, psychologistId: string): Promise<{
        message: string;
    }>;
    getStats(psychologistId: string, startDate?: string, endDate?: string): Promise<{
        totalSessions: number;
        completedSessions: number;
        cancelledSessions: number;
        noShowSessions: number;
        upcomingSessions: number;
        todaySessions: number;
        recordedSessions: number;
        averageDuration: number;
    }>;
    getTodaySessions(psychologistId: string): Promise<any[]>;
    private generateMeetingUrl;
    private encryptSessionData;
    private decryptSessionData;
}
