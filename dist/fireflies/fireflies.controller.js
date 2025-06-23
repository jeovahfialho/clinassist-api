"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirefliesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fireflies_service_1 = require("./fireflies.service");
const fireflies_dto_1 = require("./dto/fireflies.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const config_1 = require("@nestjs/config");
let FirefliesController = class FirefliesController {
    firefliesService;
    configService;
    constructor(firefliesService, configService) {
        this.firefliesService = firefliesService;
        this.configService = configService;
    }
    async addToLiveMeeting(addToLiveDto, req) {
        return this.firefliesService.addToLiveMeeting(addToLiveDto, req.user.id);
    }
    async uploadAudio(uploadAudioDto, req) {
        return this.firefliesService.uploadAudio(uploadAudioDto, req.user.id);
    }
    async getTranscript(transcriptId, req) {
        return this.firefliesService.getTranscript(transcriptId, req.user.id);
    }
    async getTranscriptCFPFormat(transcriptId, req) {
        return this.firefliesService.formatTranscriptForCFP(transcriptId, req.user.id);
    }
    async handleWebhook(payload, signature) {
        const webhookSecret = this.configService.get('FIREFLIES_WEBHOOK_SECRET');
        if (webhookSecret && signature) {
        }
        return this.firefliesService.handleWebhook(payload);
    }
    async testConnection() {
        return this.firefliesService.testConnection();
    }
    async listTranscripts(limit = '20', mine = 'true', req) {
        return this.firefliesService.listTranscripts(parseInt(limit), mine === 'true', req.user.id);
    }
    async checkTranscriptStatus(transcriptId, req) {
        return this.firefliesService.checkTranscriptStatus(transcriptId, req.user.id);
    }
    async syncWithFireflies(req) {
        return this.firefliesService.syncWithFireflies(req.user.id);
    }
    async linkSessionToTranscript(sessionId, transcriptId, req) {
        return this.firefliesService.linkSessionToTranscript(sessionId, transcriptId, req.user.id);
    }
    async checkConfiguration(req) {
        return this.firefliesService.checkConfiguration(req.user.id);
    }
    async searchTranscripts(titlePattern, req) {
        if (!titlePattern) {
            throw new common_1.BadRequestException('Parâmetro title é obrigatório');
        }
        return this.firefliesService.searchTranscriptsByTitle(titlePattern, req.user.id);
    }
    async autoDiscoverTranscripts(req) {
        return this.firefliesService.autoDiscoverTranscripts(req.user.id);
    }
    async handleWebhookV2(payload, signature) {
        const webhookSecret = this.configService.get('FIREFLIES_WEBHOOK_SECRET');
        if (webhookSecret && signature) {
        }
        return this.firefliesService.handleWebhookV2(payload);
    }
    async linkSessionToTranscriptByBody(body, req) {
        const { sessionId, transcriptId } = body;
        if (!sessionId || !transcriptId) {
            throw new common_1.BadRequestException('sessionId e transcriptId são obrigatórios');
        }
        return this.firefliesService.linkSessionToTranscript(sessionId, transcriptId, req.user.id);
    }
    async checkHealth(req) {
        return this.firefliesService.checkConfiguration(req.user.id);
    }
    async getTranscriptAccessInfo(transcriptId, req) {
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
    async getMyPermissions(req) {
        const transcripts = await this.firefliesService.listTranscripts(50, true, req.user.id);
        const connectionTest = await this.firefliesService.testConnection();
        const currentUserEmail = connectionTest.user?.email || 'unknown';
        const data = transcripts.data;
        const organized = data.filter(t => t.organizer_email === currentUserEmail);
        const accessible = data.filter(t => t.organizer_email !== currentUserEmail);
        const restricted = [];
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
};
exports.FirefliesController = FirefliesController;
__decorate([
    (0, common_1.Post)('add-to-live'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Adicionar bot Fireflies a reunião ao vivo',
        description: 'Conecta o bot do Fireflies a uma reunião em andamento para gravar e transcrever'
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Bot adicionado com sucesso à reunião',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Erro na configuração ou consentimento' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fireflies_dto_1.AddToLiveMeetingDto, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "addToLiveMeeting", null);
__decorate([
    (0, common_1.Post)('upload-audio'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Enviar arquivo de áudio para transcrição',
        description: 'Envia um arquivo de áudio/vídeo para o Fireflies transcrever'
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Áudio enviado para transcrição com sucesso',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fireflies_dto_1.UploadAudioDto, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "uploadAudio", null);
__decorate([
    (0, common_1.Get)('transcript/:transcriptId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Buscar transcrição por ID',
        description: 'Obtém a transcrição completa do Fireflies (respeitando permissões)'
    }),
    (0, swagger_1.ApiParam)({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transcrição encontrada',
        type: fireflies_dto_1.TranscriptResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transcrição não encontrada ou sem permissão' }),
    __param(0, (0, common_1.Param)('transcriptId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "getTranscript", null);
__decorate([
    (0, common_1.Get)('transcript/:transcriptId/cfp-format'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Transcrição formatada para CFP',
        description: 'Obtém a transcrição formatada segundo os requisitos do CFP'
    }),
    (0, swagger_1.ApiParam)({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transcrição formatada para CFP',
        type: fireflies_dto_1.CFPFormattedTranscriptDto,
    }),
    __param(0, (0, common_1.Param)('transcriptId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "getTranscriptCFPFormat", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-fireflies-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fireflies_dto_1.FirefliesWebhookDto, String]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)('test-connection'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Testar conexão com API Fireflies',
        description: 'Verifica se a API Key está configurada corretamente'
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Get)('transcripts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar transcrições disponíveis',
        description: 'Lista todas as transcrições do usuário no Fireflies com informações de acesso'
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        description: 'Limite de resultados (máx 50)',
        example: 20
    }),
    (0, swagger_1.ApiQuery)({
        name: 'mine',
        required: false,
        description: 'Apenas minhas transcrições',
        example: true
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('mine')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "listTranscripts", null);
__decorate([
    (0, common_1.Get)('transcript/:transcriptId/status'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Verificar status e permissões',
        description: 'Verifica se a transcrição está pronta e se o usuário tem acesso'
    }),
    (0, swagger_1.ApiParam)({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Param)('transcriptId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "checkTranscriptStatus", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Sincronizar sessões com Fireflies',
        description: 'Busca transcrições no Fireflies e vincula com sessões existentes (apenas com acesso)'
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "syncWithFireflies", null);
__decorate([
    (0, common_1.Post)('link/:sessionId/:transcriptId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Vincular sessão com transcrição manualmente',
        description: 'Vincula uma sessão específica com uma transcrição do Fireflies (verifica permissões)'
    }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'ID da sessão' }),
    (0, swagger_1.ApiParam)({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Acesso negado à transcrição' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Param)('transcriptId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "linkSessionToTranscript", null);
__decorate([
    (0, common_1.Get)('config-check'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Verificar configuração da integração',
        description: 'Diagnóstico completo da configuração do Fireflies incluindo permissões'
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "checkConfiguration", null);
__decorate([
    (0, common_1.Get)('search-transcripts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Buscar transcrições por padrão de título',
        description: 'Busca transcrições que correspondem a um padrão de título específico'
    }),
    (0, swagger_1.ApiQuery)({
        name: 'title',
        required: true,
        description: 'Padrão de título para buscar',
        example: 'cm123abc-2025-06-18-Dr João'
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Query)('title')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "searchTranscripts", null);
__decorate([
    (0, common_1.Post)('auto-discover'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Descoberta automática de transcrições',
        description: 'Busca automaticamente transcrições para sessões sem transcript vinculado'
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "autoDiscoverTranscripts", null);
__decorate([
    (0, common_1.Post)('webhook-v2'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Webhook melhorado do Fireflies',
        description: 'Webhook com processamento inteligente de eventos do Fireflies'
    }),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-fireflies-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "handleWebhookV2", null);
__decorate([
    (0, common_1.Post)('link-session'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Vincular sessão a transcrição (formato alternativo)',
        description: 'Vincula uma sessão específica com uma transcrição usando body request'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Vinculação realizada com sucesso'
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "linkSessionToTranscriptByBody", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Verificar saúde da integração',
        description: 'Endpoint de health check para verificar status geral do Fireflies'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Status de saúde da integração'
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "checkHealth", null);
__decorate([
    (0, common_1.Get)('transcript/:transcriptId/access-info'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Informações de acesso à transcrição',
        description: 'Obtém informações detalhadas sobre permissões de acesso sem tentar acessar o conteúdo'
    }),
    (0, swagger_1.ApiParam)({ name: 'transcriptId', description: 'ID da transcrição no Fireflies' }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Param)('transcriptId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "getTranscriptAccessInfo", null);
__decorate([
    (0, common_1.Get)('my-permissions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Minhas permissões no Fireflies',
        description: 'Lista transcrições organizadas por nível de acesso'
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FirefliesController.prototype, "getMyPermissions", null);
exports.FirefliesController = FirefliesController = __decorate([
    (0, swagger_1.ApiTags)('Fireflies Integration'),
    (0, common_1.Controller)('fireflies'),
    __metadata("design:paramtypes", [fireflies_service_1.FirefliesService,
        config_1.ConfigService])
], FirefliesController);
//# sourceMappingURL=fireflies.controller.js.map