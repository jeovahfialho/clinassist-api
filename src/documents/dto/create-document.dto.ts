import { IsString, IsEnum, IsOptional, IsArray, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ example: 'patient-id-here' })
  @IsString()
  patientId: string;

  @ApiProperty({ 
    example: 'Relatório de Evolução Psicológica - Março 2024',
    description: 'Título do documento'
  })
  @IsString()
  @MinLength(5, { message: 'Título deve ter pelo menos 5 caracteres' })
  title: string;

  @ApiProperty({ 
    enum: DocumentType,
    example: DocumentType.EVOLUTION_REPORT,
    description: 'Tipo do documento'
  })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({ 
    example: 'O paciente apresentou melhora significativa...',
    description: 'Conteúdo do documento (opcional se for gerado automaticamente)'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ 
    example: ['session-id-1', 'session-id-2'],
    description: 'IDs das sessões base para o relatório'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sessionIds?: string[];

  @ApiPropertyOptional({ 
    example: '2024-01-01',
    description: 'Data de início do período (para relatórios)'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    example: '2024-03-31',
    description: 'Data de fim do período (para relatórios)'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    example: 'relatorio-evolucao.pdf',
    description: 'Nome do arquivo (se anexado)'
  })
  @IsOptional()
  @IsString()
  fileName?: string;
}