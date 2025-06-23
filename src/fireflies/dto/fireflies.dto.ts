import { IsString, IsUrl, IsOptional, IsArray, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AttendeeDto {
  @ApiProperty({ example: 'Dr. João Silva' })
  @IsString()
  displayName: string;

  @ApiProperty({ example: 'joao@clinica.com.br' })
  @IsString()
  email: string;
}

export class AddToLiveMeetingDto {
  @ApiProperty({ example: 'session-id-here' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ 
    example: 'https://meet.google.com/abc-def-ghi',
    description: 'URL da reunião (se não fornecida, usará a URL da sessão)'
  })
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiPropertyOptional({ 
    example: 'Sessão de Psicoterapia - Maria Silva',
    description: 'Título da reunião para o Fireflies'
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ 
    type: [AttendeeDto],
    description: 'Lista de participantes'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];
}

export class UploadAudioDto {
  @ApiProperty({ example: 'session-id-here' })
  @IsString()
  sessionId: string;

  @ApiProperty({ 
    example: 'https://example.com/audio.mp3',
    description: 'URL pública do arquivo de áudio/vídeo'
  })
  @IsUrl()
  audioUrl: string;

  @ApiPropertyOptional({ 
    example: 'Sessão de Psicoterapia - 20/06/2024',
    description: 'Título para a transcrição'
  })
  @IsOptional()
  @IsString()
  title?: string;
}

export class FirefliesWebhookDto {
  @ApiProperty()
  @IsString()
  transcript_id: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: any;
}

export class TranscriptResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  transcript: string;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional()
  speakers?: Array<{
    name: string;
    talkTime: number;
    wordCount: number;
  }>;

  @ApiPropertyOptional()
  keyPoints?: string[];

  @ApiPropertyOptional()
  actionItems?: string[];

  @ApiProperty()
  duration: number;

  @ApiProperty()
  date: string;

  @ApiProperty()
  firefliesUrl: string;
}

export class CFPFormattedTranscriptDto {
  @ApiProperty({ description: 'Identificação do usuário/paciente' })
  patientIdentification: string;

  @ApiProperty({ description: 'Avaliação de demanda identificada na sessão' })
  demandAssessment: string;

  @ApiProperty({ description: 'Evolução observada durante a sessão' })
  sessionEvolution: string;

  @ApiProperty({ description: 'Procedimentos técnico-científicos utilizados' })
  technicalProcedures: string[];

  @ApiProperty({ description: 'Observações gerais da sessão' })
  generalObservations: string;

  @ApiProperty({ description: 'Próximos passos ou encaminhamentos' })
  nextSteps?: string;

  @ApiProperty({ description: 'Transcrição completa (opcional)' })
  fullTranscript?: string;
}