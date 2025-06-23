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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionResponseDto, SessionStatsDto } from './dto/session-response.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionStatus } from '@prisma/client';

@ApiTags('Sessões')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Agendar nova sessão' })
  @ApiResponse({
    status: 201,
    description: 'Sessão agendada com sucesso',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Conflito de horário' })
  async create(
    @Body() createSessionDto: CreateSessionDto,
    @Request() req,
  ) {
    return this.sessionsService.create(createSessionDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar sessões com filtros' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sessões paginada',
  })
  async findAll(
    @Query() filters: SessionFiltersDto,
    @Request() req,
  ) {
    return this.sessionsService.findAll(req.user.id, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas das sessões' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas das sessões',
    type: SessionStatsDto,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?,
  ) {
    return this.sessionsService.getStats(req.user.id, startDate, endDate);
  }

  @Get('today')
  @ApiOperation({ summary: 'Sessões de hoje' })
  @ApiResponse({
    status: 200,
    description: 'Sessões agendadas para hoje',
    type: [SessionResponseDto],
  })
  async getTodaySessions(@Request() req) {
    return this.sessionsService.getTodaySessions(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar sessão por ID' })
  @ApiResponse({
    status: 200,
    description: 'Dados detalhados da sessão',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.sessionsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar sessão' })
  @ApiResponse({
    status: 200,
    description: 'Sessão atualizada com sucesso',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @Request() req,
  ) {
    return this.sessionsService.update(id, updateSessionDto, req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status da sessão' })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
  })
  @ApiParam({ name: 'id', description: 'ID da sessão' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: SessionStatus,
    @Request() req,
  ) {
    return this.sessionsService.updateStatus(id, status, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar/remover sessão' })
  @ApiResponse({
    status: 204,
    description: 'Sessão removida com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Não é possível remover sessões concluídas',
  })
  async remove(@Param('id') id: string, @Request() req) {
    return this.sessionsService.remove(id, req.user.id);
  }
}