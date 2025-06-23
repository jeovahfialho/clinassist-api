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
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Pacientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo paciente' })
  @ApiResponse({
    status: 201,
    description: 'Paciente cadastrado com sucesso',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 409, description: 'CPF já cadastrado' })
  async create(
    @Body() createPatientDto: CreatePatientDto,
    @Request() req,
  ) {
    return this.patientsService.create(createPatientDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pacientes' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pacientes paginada',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query() pagination: PaginationDto,
    @Request() req,
  ): Promise<PaginatedResult<PatientResponseDto>> {
    return this.patientsService.findAll(req.user.id, pagination);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar pacientes por nome' })
  @ApiResponse({
    status: 200,
    description: 'Resultados da busca',
  })
  @ApiQuery({ name: 'q', description: 'Termo de busca' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') query: string,
    @Query() pagination: PaginationDto,
    @Request() req,
  ) {
    return this.patientsService.search(query, req.user.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar paciente por ID' })
  @ApiResponse({
    status: 200,
    description: 'Dados detalhados do paciente',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.patientsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados do paciente' })
  @ApiResponse({
    status: 200,
    description: 'Paciente atualizado com sucesso',
    type: PatientResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @Request() req,
  ) {
    return this.patientsService.update(id, updatePatientDto, req.user.id);
  }

  @Patch(':id/recording-consent')
  @ApiOperation({ summary: 'Atualizar consentimento de gravação' })
  @ApiResponse({
    status: 200,
    description: 'Consentimento atualizado com sucesso',
  })
  async updateRecordingConsent(
    @Param('id') id: string,
    @Body('consent') consent: boolean,
    @Request() req,
  ) {
    return this.patientsService.updateRecordingConsent(id, consent, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover paciente' })
  @ApiResponse({
    status: 204,
    description: 'Paciente removido com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Não é possível remover paciente com sessões/documentos',
  })
  async remove(@Param('id') id: string, @Request() req) {
    return this.patientsService.remove(id, req.user.id);
  }
}