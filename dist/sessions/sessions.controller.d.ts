import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';
import { SessionStatus } from '@prisma/client';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    create(createSessionDto: CreateSessionDto, req: any): Promise<any>;
    findAll(filters: SessionFiltersDto, req: any): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    getStats(startDate?: string, endDate?: string, req?: any): Promise<{
        totalSessions: number;
        completedSessions: number;
        cancelledSessions: number;
        noShowSessions: number;
        upcomingSessions: number;
        todaySessions: number;
        recordedSessions: number;
        averageDuration: number;
    }>;
    getTodaySessions(req: any): Promise<any[]>;
    findOne(id: string, req: any): Promise<any>;
    update(id: string, updateSessionDto: UpdateSessionDto, req: any): Promise<any>;
    updateStatus(id: string, status: SessionStatus, req: any): Promise<any>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
