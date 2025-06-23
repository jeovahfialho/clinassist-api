import { ApiProperty } from '@nestjs/swagger';

export class DocumentTemplateDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  template: string;

  @ApiProperty()
  variables: string[];

  @ApiProperty()
  isActive: boolean;
}

export class GenerateDocumentFromTemplateDto {
  @ApiProperty()
  templateId: string;

  @ApiProperty()
  patientId: string;

  @ApiProperty()
  sessionIds?: string[];

  @ApiProperty()
  customVariables?: Record<string, any>;
}

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  fileName?: string;

  @ApiProperty()
  fileUrl?: string;

  @ApiProperty()
  patientId: string;

  @ApiProperty()
  patient: {
    id: string;
    name: string;
  };

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}