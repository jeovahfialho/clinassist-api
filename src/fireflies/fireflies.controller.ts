import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { FirefliesService } from './fireflies.service';
import {
  AddToLiveMeetingDto,
  UploadAudioDto,
  TranscriptResponseDto,
  CFPFormattedTranscriptDto,
  FirefliesWebhookDto
} from './dto/fireflies.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('Fireflies Integration')
@Controller('fireflies')
export class FirefliesController {
  constructor(
    private readonly firefliesService: FirefliesService,
    private readonly configService: ConfigService,
  ) {}

  // ========== ENDPOINTS ORIGINAIS MANTIDOS ==========

  @Post('add-to-live')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Adicionar bot Fireflies a reunião ao vivo',
    description: 'Conecta o bot do Fireflies a uma reunião em andamento para gravar e transcrever'
  })
  @ApiResponse({
    status: 201,
    description: 'Bot adicionado com sucesso à reunião',
  })
  @ApiResponse({ status: 400, description: 'Erro na configuração ou consentimento' })
  async addToLiveMeeting(
    @Body() addToLiveDto: AddToLiveMeetingDto,
    @Request() req,
  ) {
    return this.firefliesService.addToLiveMeeting(addToLiveDto, req.user.id);
  }

  @Post('upload-audio')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Enviar arquivo de áudio para transcrição',
    description: 'Envia um arquivo de áudio/vídeo para o Fireflies transcrever'
  })
  @ApiResponse({
    status: 201,
    description: 'Áudio enviado para transcrição com sucesso',
  })
  async uploadAudio(
    @Body() uploadAudioDto: UploadAudioDto,
    @Request() req,
  ) {
    return this.firefliesService.uploadAudio(uploadAudioDto, req.user.id);
  }

  @Get('transcript/:transcriptId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Buscar transcrição por ID',
    description: 'Obtém a transcrição completa do Fireflies (respeitando permissões)'
  })
  @ApiParam({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' })
  @ApiResponse({
    status: 200,
    description: 'Transcrição encontrada',
    type: TranscriptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transcrição não encontrada ou sem permissão' })
  async getTranscript(
    @Param('transcriptId') transcriptId: string,
    @Request() req,
  ) {
    return this.firefliesService.getTranscript(transcriptId, req.user.id);
  }

  @Get('transcript/:transcriptId/cfp-format')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Transcrição formatada para CFP',
    description: 'Obtém a transcrição formatada segundo os requisitos do CFP'
  })
  @ApiParam({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' })
  @ApiResponse({
    status: 200,
    description: 'Transcrição formatada para CFP',
    type: CFPFormattedTranscriptDto,
  })
  async getTranscriptCFPFormat(
    @Param('transcriptId') transcriptId: string,
    @Request() req,
  ) {
    return this.firefliesService.formatTranscriptForCFP(transcriptId, req.user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Body() payload: FirefliesWebhookDto,
    @Headers('x-fireflies-signature') signature?: string,
    @Request() req?,
  ) {
    const webhookSecret = this.configService.get<string>('FIREFLIES_WEBHOOK_SECRET');
    if (webhookSecret) {
      if (!signature) {
        throw new BadRequestException('Missing webhook signature');
      }
      const { createHmac } = await import('crypto');
      const rawBody = req?.rawBody || Buffer.from(JSON.stringify(payload));
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      if (signature !== expectedSignature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }
    return this.firefliesService.handleWebhook(payload);
  }

  // ========== NOVOS ENDPOINTS PARA DIAGNÓSTICO ==========

  @Get('test-connection')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Testar conexão com API Fireflies',
    description: 'Verifica se a API Key está configurada corretamente'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Conexão testada com sucesso',
    schema: {
      example: {
        success: true,
        message: 'Conexão com Fireflies OK',
        configured: true,
        user: { user_id: '123', email: 'user@example.com' }
      }
    }
  })
  async testConnection() {
    return this.firefliesService.testConnection();
  }

  @Get('transcripts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar transcrições disponíveis',
    description: 'Lista todas as transcrições do usuário no Fireflies com informações de acesso'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Limite de resultados (máx 50)', 
    example: 20 
  })
  @ApiQuery({ 
    name: 'mine', 
    required: false, 
    description: 'Apenas minhas transcrições', 
    example: true 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de transcrições com informações de acesso',
    schema: {
      example: {
        success: true,
        count: 2,
        userEmail: 'user@example.com',
        data: [
          {
            id: '01JXZH9MG2G3MWYZAY5TT1N7WM',
            title: 'Reunião - 17/06/2025',
            hasAccess: true,
            accessReason: 'Organizador (acesso total)',
            privacy: 'public'
          }
        ]
      }
    }
  })
  async listTranscripts(
    @Query('limit') limit: string = '20',
    @Query('mine') mine: string = 'true',
    @Request() req,
  ) {
    return this.firefliesService.listTranscripts(
      parseInt(limit), 
      mine === 'true', 
      req.user.id
    );
  }

  @Get('transcript/:transcriptId/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verificar status e permissões',
    description: 'Verifica se a transcrição está pronta e se o usuário tem acesso'
  })
  @ApiParam({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' })
  @ApiResponse({ 
    status: 200, 
    description: 'Status detalhado da transcrição',
    schema: {
      example: {
        id: '01JXZH9MG2G3MWYZAY5TT1N7WM',
        title: 'Reunião - 17/06/2025',
        status: 'processed',
        isReady: true,
        hasAccess: true,
        accessReason: 'Organizador (acesso total)',
        privacy: 'public',
        organizer: 'user@example.com'
      }
    }
  })
  async checkTranscriptStatus(
    @Param('transcriptId') transcriptId: string,
    @Request() req,
  ) {
    return this.firefliesService.checkTranscriptStatus(transcriptId, req.user.id);
  }

  @Post('sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Sincronizar sessões com Fireflies',
    description: 'Busca transcrições no Fireflies e vincula com sessões existentes (apenas com acesso)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sincronização concluída',
    schema: {
      example: {
        success: true,
        message: 'Sincronização concluída: 2 matches, 0 erros',
        matched: 2,
        errors: 0,
        details: {
          matches: [
            {
              sessionId: 'session123',
              transcriptId: '01JXZH9MG2G3MWYZAY5TT1N7WM',
              accessLevel: 'Organizador (acesso total)'
            }
          ],
          errors: []
        }
      }
    }
  })
  async syncWithFireflies(@Request() req) {
    return this.firefliesService.syncWithFireflies(req.user.id);
  }

  @Post('link/:sessionId/:transcriptId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Vincular sessão com transcrição manualmente',
    description: 'Vincula uma sessão específica com uma transcrição do Fireflies (verifica permissões)'
  })
  @ApiParam({ name: 'sessionId', description: 'ID da sessão' })
  @ApiParam({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' })
  @ApiResponse({ 
    status: 200, 
    description: 'Vinculação realizada',
    schema: {
      example: {
        success: true,
        message: 'Vinculação realizada com sucesso',
        session: {
          id: 'session123',
          transcriptId: '01JXZH9MG2G3MWYZAY5TT1N7WM',
          accessLevel: 'Organizador (acesso total)'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Acesso negado à transcrição' })
  async linkSessionToTranscript(
    @Param('sessionId') sessionId: string,
    @Param('transcriptId') transcriptId: string,
    @Request() req,
  ) {
    return this.firefliesService.linkSessionToTranscript(
      sessionId, 
      transcriptId, 
      req.user.id
    );
  }

  @Get('config-check')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verificar configuração da integração',
    description: 'Diagnóstico completo da configuração do Fireflies incluindo permissões'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status da configuração',
    schema: {
      example: {
        status: 'healthy',
        checks: {
          apiKeyConfigured: true,
          apiKeyValid: true,
          canListTranscripts: true,
          totalTranscripts: 5,
          accessibleTranscripts: 3,
          sessionsWithoutTranscript: 2
        },
        summary: {
          configured: true,
          working: true,
          transcriptsAvailable: 5,
          accessibleTranscripts: 3,
          needsSync: true,
          accessIssues: true
        },
        recommendations: [
          'Execute POST /fireflies/sync para vincular 2 sessões',
          'Algumas transcrições têm acesso restrito - verifique configurações de privacidade'
        ]
      }
    }
  })
  async checkConfiguration(@Request() req) {
    return this.firefliesService.checkConfiguration(req.user.id);
  }

  // ========== NOVOS ENDPOINTS ADICIONADOS ==========

  @Get('search-transcripts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Buscar transcrições por padrão de título',
    description: 'Busca transcrições que correspondem a um padrão de título específico'
  })
  @ApiQuery({ 
    name: 'title', 
    required: true, 
    description: 'Padrão de título para buscar', 
    example: 'cm123abc-2025-06-18-Dr João' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Resultados da busca',
    schema: {
      example: {
        found: true,
        matches: [
          {
            id: '01JXZH9MG2G3MWYZAY5TT1N7WM',
            title: 'cm123abc-2025-06-18-Dr João',
            date: '2025-06-18T14:30:00Z',
            duration: 3600,
            organizer_email: 'dr.joao@email.com'
          }
        ],
        total: 1,
        searchPattern: 'cm123abc-2025-06-18-Dr João'
      }
    }
  })
  async searchTranscripts(
    @Query('title') titlePattern: string,
    @Request() req,
  ) {
    if (!titlePattern) {
      throw new BadRequestException('Parâmetro title é obrigatório');
    }
    
    return this.firefliesService.searchTranscriptsByTitle(titlePattern, req.user.id);
  }

  @Post('auto-discover')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Descoberta automática de transcrições',
    description: 'Busca automaticamente transcrições para sessões sem transcript vinculado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Descoberta concluída',
    schema: {
      example: {
        success: true,
        discovered: 3,
        discoveries: [
          {
            sessionId: 'cm123abc',
            transcriptId: '01JXZH9MG2G3MWYZAY5TT1N7WM',
            title: 'cm123abc-2025-06-18-Dr João',
            matchCount: 1
          }
        ],
        total_sessions_checked: 10
      }
    }
  })
  async autoDiscoverTranscripts(@Request() req) {
    return this.firefliesService.autoDiscoverTranscripts(req.user.id);
  }

  @Post('webhook-v2')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook melhorado do Fireflies',
    description: 'Webhook com processamento inteligente de eventos do Fireflies'
  })
  @ApiExcludeEndpoint()
  async handleWebhookV2(
    @Body() payload: any,
    @Headers('x-fireflies-signature') signature?: string,
  ) {
    const webhookSecret = this.configService.get<string>('FIREFLIES_WEBHOOK_SECRET');
    if (webhookSecret && signature) {
      // Implementar verificação de assinatura HMAC se necessário
    }
    return this.firefliesService.handleWebhookV2(payload);
  }

  @Post('link-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Vincular sessão a transcrição (formato alternativo)',
    description: 'Vincula uma sessão específica com uma transcrição usando body request'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Vinculação realizada com sucesso'
  })
  async linkSessionToTranscriptByBody(
    @Body() body: { sessionId: string; transcriptId: string },
    @Request() req,
  ) {
    const { sessionId, transcriptId } = body;
    
    if (!sessionId || !transcriptId) {
      throw new BadRequestException('sessionId e transcriptId são obrigatórios');
    }
    
    return this.firefliesService.linkSessionToTranscript(sessionId, transcriptId, req.user.id);
  }

  @Get('health')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verificar saúde da integração',
    description: 'Endpoint de health check para verificar status geral do Fireflies'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status de saúde da integração'
  })
  async checkHealth(@Request() req) {
    return this.firefliesService.checkConfiguration(req.user.id);
  }

  // ========== ENDPOINTS AUXILIARES EXISTENTES ==========

  @Get('transcript/:transcriptId/access-info')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Informações de acesso à transcrição',
    description: 'Obtém informações detalhadas sobre permissões de acesso sem tentar acessar o conteúdo'
  })
  @ApiParam({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' })
  @ApiResponse({ 
    status: 200, 
    description: 'Informações de acesso',
    schema: {
      example: {
        id: '01JXZH9MG2G3MWYZAY5TT1N7WM',
        title: 'Reunião - 17/06/2025',
        organizer: 'organizer@example.com',
        participants: ['user1@example.com', 'user2@example.com'],
        privacy: 'only_owner',
        hasAccess: false,
        accessReason: 'Participante, mas reunião privada (sem acesso)',
        canRequest: true
      }
    }
  })
  async getTranscriptAccessInfo(
    @Param('transcriptId') transcriptId: string,
    @Request() req,
  ) {
    const status = await this.firefliesService.checkTranscriptStatus(transcriptId, req.user.id);
    
    return {
      id: status.id,
      title: status.title,
      organizer: status.organizer,
      privacy: status.privacy,
      hasAccess: status.canAccess,
      accessReason: status.accessReason,
      canRequest: !status.canAccess && status.accessReason.includes('participante'),
      status: status.status,
      isReady: status.isReady
    };
  }

  @Get('my-permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Minhas permissões no Fireflies',
    description: 'Lista transcrições organizadas por nível de acesso'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissões organizadas',
    schema: {
      example: {
        userEmail: 'user@example.com',
        summary: {
          total: 5,
          fullAccess: 2,
          noAccess: 3,
          organized: 2,
          participant: 1
        },
        categories: {
          organized: [{ id: '123', title: 'Minha reunião' }],
          accessible: [{ id: '456', title: 'Reunião compartilhada' }],
          restricted: [{ id: '789', title: 'Reunião privada', reason: 'only_owner' }]
        }
      }
    }
  })
  async getMyPermissions(@Request() req) {
    const transcripts = await this.firefliesService.listTranscripts(50, true, req.user.id);

    // Obter informações do usuário atual
    const connectionTest = await this.firefliesService.testConnection();
    const currentUserEmail = connectionTest.user?.email || 'unknown';

    // Defina o tipo esperado para os itens de transcript
    type TranscriptItem = {
      id: string;
      title: string;
      organizer_email: string;
    };
    
    const data = transcripts.data as TranscriptItem[];

    // Analisar permissões baseado no organizador
    const organized = data.filter(t => t.organizer_email === currentUserEmail);
    const accessible = data.filter(t => t.organizer_email !== currentUserEmail);
    const restricted: TranscriptItem[] = []; // Por enquanto vazio

    return {
      userEmail: currentUserEmail,
      summary: {
        total: transcripts.count,
        fullAccess: organized.length + accessible.length,
        noAccess: restricted.length,
        organized: organized.length,
        participant: accessible.length
      },
      categories: {
        organized: organized.map(t => ({ id: t.id, title: t.title })),
        accessible: accessible.map(t => ({ id: t.id, title: t.title })),
        restricted: restricted.map(t => ({ 
          id: t.id, 
          title: t.title, 
          reason: 'unknown',
          organizer: t.organizer_email 
        }))
      }
    };
  }
}