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
exports.SessionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sessions_service_1 = require("./sessions.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const update_session_dto_1 = require("./dto/update-session.dto");
const session_response_dto_1 = require("./dto/session-response.dto");
const session_filters_dto_1 = require("./dto/session-filters.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const client_1 = require("@prisma/client");
let SessionsController = class SessionsController {
    sessionsService;
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
    }
    async create(createSessionDto, req) {
        return this.sessionsService.create(createSessionDto, req.user.id);
    }
    async findAll(filters, req) {
        return this.sessionsService.findAll(req.user.id, filters);
    }
    async getStats(startDate, endDate, req) {
        return this.sessionsService.getStats(req.user.id, startDate, endDate);
    }
    async getTodaySessions(req) {
        return this.sessionsService.getTodaySessions(req.user.id);
    }
    async findOne(id, req) {
        return this.sessionsService.findOne(id, req.user.id);
    }
    async update(id, updateSessionDto, req) {
        return this.sessionsService.update(id, updateSessionDto, req.user.id);
    }
    async updateStatus(id, status, req) {
        return this.sessionsService.updateStatus(id, status, req.user.id);
    }
    async remove(id, req) {
        return this.sessionsService.remove(id, req.user.id);
    }
};
exports.SessionsController = SessionsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Agendar nova sessão' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Sessão agendada com sucesso',
        type: session_response_dto_1.SessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflito de horário' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_session_dto_1.CreateSessionDto, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar sessões com filtros' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de sessões paginada',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_filters_dto_1.SessionFiltersDto, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Estatísticas das sessões' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Estatísticas das sessões',
        type: session_response_dto_1.SessionStatsDto,
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, swagger_1.ApiOperation)({ summary: 'Sessões de hoje' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sessões agendadas para hoje',
        type: [session_response_dto_1.SessionResponseDto],
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "getTodaySessions", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar sessão por ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Dados detalhados da sessão',
        type: session_response_dto_1.SessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Sessão não encontrada' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar sessão' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sessão atualizada com sucesso',
        type: session_response_dto_1.SessionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Sessão não encontrada' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_session_dto_1.UpdateSessionDto, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar status da sessão' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Status atualizado com sucesso',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID da sessão' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Cancelar/remover sessão' }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Sessão removida com sucesso',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Não é possível remover sessões concluídas',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SessionsController.prototype, "remove", null);
exports.SessionsController = SessionsController = __decorate([
    (0, swagger_1.ApiTags)('Sessões'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('sessions'),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService])
], SessionsController);
//# sourceMappingURL=sessions.controller.js.map