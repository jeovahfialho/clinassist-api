import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto extends PartialType(
  OmitType(CreateSessionDto, ['patientId'] as const)
) {
  // Campos específicos para atualização durante/após a sessão
  
  @ApiPropertyOptional({ 
    example: 'Paciente relatou melhora significativa na ansiedade...',
    description: 'Notas de evolução da sessão (obrigatório CFP)'
  })
  @IsOptional()
  @IsString()
  evolutionNotes?: string;

  @ApiPropertyOptional({ 
    example: ['Terapia Cognitivo-Comportamental', 'Técnicas de respiração'],
    description: 'Técnicas utilizadas na sessão'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techniques?: string[];

  @ApiPropertyOptional({ 
    example: 'Paciente demonstrou boa receptividade às intervenções',
    description: 'Observações gerais da sessão'
  })
  @IsOptional()
  @IsString()
  observations?: string;
}