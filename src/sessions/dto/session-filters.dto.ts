import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SessionFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ 
    enum: SessionStatus,
    description: 'Filtrar por status da sessão'
  })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ 
    example: '2024-06-01',
    description: 'Data de início do período (YYYY-MM-DD)'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    example: '2024-06-30',
    description: 'Data de fim do período (YYYY-MM-DD)'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    example: 'patient-id-here',
    description: 'Filtrar por paciente específico'
  })
  @IsOptional()
  patientId?: string;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Filtrar apenas sessões gravadas'
  })
  @IsOptional()
  hasRecording?: boolean;
}