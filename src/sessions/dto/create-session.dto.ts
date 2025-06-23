import { IsString, IsDateString, IsInt, Min, Max, IsOptional, IsUrl, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSessionDto {
  @ApiProperty({ example: 'patient-id-here' })
  @IsString()
  patientId: string;

  @ApiProperty({ 
    example: '2024-06-20T14:00:00.000Z',
    description: 'Data e hora da sessão no formato ISO'
  })
  @IsDateString({}, { message: 'Data deve estar no formato ISO válido' })
  scheduledAt: string;

  @ApiPropertyOptional({ 
    example: 50,
    description: 'Duração da sessão em minutos'
  })
  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Duração mínima de 30 minutos' })
  @Max(120, { message: 'Duração máxima de 120 minutos' })
  duration?: number = 50;

  @ApiPropertyOptional({ 
    example: 'https://meet.google.com/abc-def-ghi',
    description: 'URL da videoconferência'
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL deve ser válida' })
  meetingUrl?: string;

  @ApiPropertyOptional({ 
    example: false,
    description: 'Se deve gravar a sessão (requer consentimento do paciente)'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  shouldRecord?: boolean = false;

  @ApiPropertyOptional({ 
    example: 'Sessão de acompanhamento semanal',
    description: 'Observações ou notas sobre o agendamento'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}