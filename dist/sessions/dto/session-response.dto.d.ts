import { SessionStatus } from '@prisma/client';
export declare class SessionResponseDto {
    id: string;
    scheduledAt: string;
    duration: number;
    status: SessionStatus;
    evolutionNotes?: string;
    techniques?: string[];
    observations?: string;
    meetingUrl?: string;
    firefliesId?: string;
    transcriptId?: string;
    hasRecording: boolean;
    patientId: string;
    psychologistId: string;
    createdAt: string;
    updatedAt: string;
    patient: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
    };
    psychologist: {
        id: string;
        name: string;
        crp: string;
    };
}
export declare class SessionStatsDto {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    upcomingSessions: number;
    todaySessions: number;
    averageDuration: number;
    recordedSessions: number;
}
