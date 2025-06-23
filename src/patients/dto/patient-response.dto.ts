import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  cpf: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  dateOfBirth: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty()
  initialDemand: string;

  @ApiProperty()
  objectives: string;

  @ApiPropertyOptional()
  referralSource?: string;

  @ApiProperty()
  recordingConsent: boolean;

  @ApiProperty()
  dataConsent: boolean;

  @ApiProperty()
  consentDate: string;

  @ApiProperty()
  psychologistId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  // Informações do psicólogo responsável
  @ApiProperty()
  psychologist: {
    id: string;
    name: string;
    crp: string;
  };

  // Estatísticas básicas
  @ApiPropertyOptional()
  totalSessions?: number;

  @ApiPropertyOptional()
  lastSessionDate?: string;
}