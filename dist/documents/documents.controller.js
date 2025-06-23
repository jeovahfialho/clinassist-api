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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const documents_service_1 = require("./documents.service");
const create_document_dto_1 = require("./dto/create-document.dto");
const document_template_dto_1 = require("./dto/document-template.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const client_1 = require("@prisma/client");
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async create(createDocumentDto, req) {
        return this.documentsService.create(createDocumentDto, req.user.id);
    }
    async findAll(page = 1, limit = 10, patientId, type, req) {
        const pagination = { page: Number(page), limit: Number(limit) };
        return this.documentsService.findAll(req.user.id, pagination, patientId, type);
    }
    async generateEvolutionReport(patientId, startDate, endDate, req) {
        const report = await this.documentsService.generateEvolutionReport(patientId, req.user.id, startDate, endDate);
        return {
            type: 'evolution_report',
            content: report,
            generatedAt: new Date().toISOString(),
        };
    }
    async generatePsychologicalEvaluation(patientId, sessionIds, req) {
        const evaluation = await this.documentsService.generatePsychologicalEvaluation(patientId, req.user.id, sessionIds);
        return {
            type: 'psychological_evaluation',
            content: evaluation,
            generatedAt: new Date().toISOString(),
        };
    }
    async saveGenerated(body, req) {
        return this.documentsService.create({
            patientId: body.patientId,
            title: body.title,
            type: body.type,
            content: body.content,
        }, req.user.id);
    }
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
    async findOne(id, req) {
        return this.documentsService.findOne(id, req.user.id);
    }
    async update(id, updateDocumentDto, req) {
        return this.documentsService.update(id, updateDocumentDto, req.user.id);
    }
    async remove(id, req) {
        return this.documentsService.remove(id, req.user.id);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar novo documento' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Documento criado com sucesso',
        type: document_template_dto_1.DocumentResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_document_dto_1.CreateDocumentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar documentos' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de documentos paginada',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Número da página' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Limite por página' }),
    (0, swagger_1.ApiQuery)({ name: 'patientId', required: false, type: String, description: 'Filtrar por paciente' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, enum: client_1.DocumentType, description: 'Filtrar por tipo de documento' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('patientId')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('generate/evolution-report/:patientId'),
    (0, swagger_1.ApiOperation)({ summary: 'Gerar relatório de evolução' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Relatório de evolução gerado',
    }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' }),
    __param(0, (0, common_1.Param)('patientId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "generateEvolutionReport", null);
__decorate([
    (0, common_1.Get)('generate/psychological-evaluation/:patientId'),
    (0, swagger_1.ApiOperation)({ summary: 'Gerar avaliação psicológica' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Avaliação psicológica gerada',
    }),
    (0, swagger_1.ApiQuery)({ name: 'sessionIds', required: false, type: [String], description: 'IDs das sessões específicas' }),
    __param(0, (0, common_1.Param)('patientId')),
    __param(1, (0, common_1.Query)('sessionIds')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "generatePsychologicalEvaluation", null);
__decorate([
    (0, common_1.Post)('save-generated'),
    (0, swagger_1.ApiOperation)({ summary: 'Salvar documento gerado' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Documento salvo com sucesso',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "saveGenerated", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar templates de documentos' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de templates disponíveis',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar documento por ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Documento encontrado',
        type: document_template_dto_1.DocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Documento não encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar documento' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Documento atualizado com sucesso',
        type: document_template_dto_1.DocumentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Documento não encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remover documento' }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Documento removido com sucesso',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Documento não encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "remove", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('Documentos'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map