import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentResponseDto } from './dto/document-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentType } from '@prisma/client';

@ApiTags('Documentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo documento' })
  @ApiResponse({
    status: 201,
    description: 'Documento criado com sucesso',
    type: DocumentResponseDto,
  })
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req,
  ) {
    return this.documentsService.create(createDocumentDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos paginada',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limite por página' })
  @ApiQuery({ name: 'patientId', required: false, type: String, description: 'Filtrar por paciente' })
  @ApiQuery({ name: 'type', required: false, enum: DocumentType, description: 'Filtrar por tipo de documento' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('patientId') patientId?: string,
    @Query('type') type?: DocumentType,
    @Request() req?,
  ) {
    const pagination = { page: Number(page), limit: Number(limit) };
    return this.documentsService.findAll(req.user.id, pagination, patientId, type);
  }

  @Get('generate/evolution-report/:patientId')
  @ApiOperation({ summary: 'Gerar relatório de evolução' })
  @ApiResponse({
    status: 200,
    description: 'Relatório de evolução gerado',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  async generateEvolutionReport(
    @Param('patientId') patientId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?,
  ) {
    const report = await this.documentsService.generateEvolutionReport(
      patientId,
      req.user.id,
      startDate,
      endDate,
    );

    return {
      type: 'evolution_report',
      content: report,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('generate/psychological-evaluation/:patientId')
  @ApiOperation({ summary: 'Gerar avaliação psicológica' })
  @ApiResponse({
    status: 200,
    description: 'Avaliação psicológica gerada',
  })
  @ApiQuery({ name: 'sessionIds', required: false, type: [String], description: 'IDs das sessões específicas' })
  async generatePsychologicalEvaluation(
    @Param('patientId') patientId: string,
    @Query('sessionIds') sessionIds?: string[],
    @Request() req?,
  ) {
    const evaluation = await this.documentsService.generatePsychologicalEvaluation(
      patientId,
      req.user.id,
      sessionIds,
    );

    return {
      type: 'psychological_evaluation',
      content: evaluation,
      generatedAt: new Date().toISOString(),
    };
  }

  @Post('save-generated')
  @ApiOperation({ summary: 'Salvar documento gerado' })
  @ApiResponse({
    status: 201,
    description: 'Documento salvo com sucesso',
  })
  async saveGenerated(
    @Body() body: {
      patientId: string;
      title: string;
      type: DocumentType;
      content: string;
    },
    @Request() req,
  ) {
    return this.documentsService.create(
      {
        patientId: body.patientId,
        title: body.title,
        type: body.type,
        content: body.content,
      },
      req.user.id,
    );
  }

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates de documentos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de templates disponíveis',
  })
  async getTemplates() {
    return [
      {
        id: 'evolution_report',
        name: 'Relatório de Evolução',
        type: 'EVOLUTION_REPORT',
        description: 'Relatório detalhado da evolução do paciente',
        variables: ['patientName', 'period', 'sessions', 'techniques'],
      },
      {
        id: 'psychological_evaluation',
        name: 'Avaliação Psicológica',
        type: 'PSYCHOLOGICAL_EVALUATION',
        description: 'Avaliação psicológica completa',
        variables: ['patientData', 'methodology', 'results', 'recommendations'],
      },
      {
        id: 'consent_form',
        name: 'Termo de Consentimento',
        type: 'CONSENT_FORM',
        description: 'Termo de consentimento para atendimento',
        variables: ['patientName', 'date', 'services'],
      },
      {
        id: 'referral',
        name: 'Encaminhamento',
        type: 'REFERRAL',
        description: 'Documento de encaminhamento',
        variables: ['patientName', 'destination', 'reason', 'history'],
      },
    ];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar documento por ID' })
  @ApiResponse({
    status: 200,
    description: 'Documento encontrado',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.documentsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar documento' })
  @ApiResponse({
    status: 200,
    description: 'Documento atualizado com sucesso',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: Partial<CreateDocumentDto>,
    @Request() req,
  ) {
    return this.documentsService.update(id, updateDocumentDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover documento' })
  @ApiResponse({
    status: 204,
    description: 'Documento removido com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user.id);
  }
}