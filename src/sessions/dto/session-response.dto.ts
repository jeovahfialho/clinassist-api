import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  scheduledAt: string;

  @ApiProperty()
  duration: number;

  @ApiProperty({ enum: SessionStatus })
  status: SessionStatus;

  @ApiPropertyOptional()
  evolutionNotes?: string;

  @ApiPropertyOptional()
  techniques?: string[];

  @ApiPropertyOptional()
  observations?: string;

  @ApiPropertyOptional()
  meetingUrl?: string;

  @ApiPropertyOptional()
  firefliesId?: string;

  @ApiPropertyOptional()
  transcriptId?: string;

  @ApiProperty()
  hasRecording: boolean;

  @ApiProperty()
  patientId: string;

  @ApiProperty()
  psychologistId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  // Dados do paciente
  @ApiProperty()
  patient: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };

  // Dados do psicólogo
  @ApiProperty()
  psychologist: {
    id: string;
    name: string;
    crp: string;
  };
}

export class SessionStatsDto {
  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  completedSessions: number;

  @ApiProperty()
  cancelledSessions: number;

  @ApiProperty()
  noShowSessions: number;

  @ApiProperty()
  upcomingSessions: number;

  @ApiProperty()
  todaySessions: number;

  @ApiProperty()
  averageDuration: number;

  @ApiProperty()
  recordedSessions: number;
}