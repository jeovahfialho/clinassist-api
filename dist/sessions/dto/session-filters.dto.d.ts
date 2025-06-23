import { SessionStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class SessionFiltersDto extends PaginationDto {
    status?: SessionStatus;
    startDate?: string;
    endDate?: string;
    patientId?: string;
    hasRecording?: boolean;
}
