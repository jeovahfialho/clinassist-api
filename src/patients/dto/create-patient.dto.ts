import { IsString, IsEmail, IsOptional, IsDateString, IsBoolean, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreatePatientDto {
  @ApiProperty({ example: 'Maria da Silva Santos' })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve ter o formato 000.000.000-00'
  })
  cpf: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email deve ter formato válido' })
  email?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString({}, { message: 'Data de nascimento deve ser uma data válida' })
  dateOfBirth: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 123 - São Paulo/SP' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ 
    example: 'Paciente relata ansiedade e dificuldades para dormir há 3 meses',
    description: 'Demanda inicial apresentada pelo paciente (obrigatório CFP)'
  })
  @IsString()
  @MinLength(10, { message: 'Demanda inicial deve ter pelo menos 10 caracteres' })
  initialDemand: string;

  @ApiProperty({ 
    example: 'Reduzir sintomas de ansiedade e melhorar qualidade do sono',
    description: 'Objetivos terapêuticos definidos (obrigatório CFP)'
  })
  @IsString()
  @MinLength(10, { message: 'Objetivos devem ter pelo menos 10 caracteres' })
  objectives: string;

  @ApiPropertyOptional({ 
    example: 'Encaminhamento médico - Dr. João (CRM 12345)',
    description: 'Fonte do encaminhamento, se houver'
  })
  @IsOptional()
  @IsString()
  referralSource?: string;

  @ApiPropertyOptional({ 
    example: false,
    description: 'Consentimento para gravação de sessões'
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  recordingConsent?: boolean = false;
}