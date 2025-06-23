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
exports.PatientsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const patients_service_1 = require("./patients.service");
const create_patient_dto_1 = require("./dto/create-patient.dto");
const update_patient_dto_1 = require("./dto/update-patient.dto");
const patient_response_dto_1 = require("./dto/patient-response.dto");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let PatientsController = class PatientsController {
    patientsService;
    constructor(patientsService) {
        this.patientsService = patientsService;
    }
    async create(createPatientDto, req) {
        return this.patientsService.create(createPatientDto, req.user.id);
    }
    async findAll(pagination, req) {
        return this.patientsService.findAll(req.user.id, pagination);
    }
    async search(query, pagination, req) {
        return this.patientsService.search(query, req.user.id, pagination);
    }
    async findOne(id, req) {
        return this.patientsService.findOne(id, req.user.id);
    }
    async update(id, updatePatientDto, req) {
        return this.patientsService.update(id, updatePatientDto, req.user.id);
    }
    async updateRecordingConsent(id, consent, req) {
        return this.patientsService.updateRecordingConsent(id, consent, req.user.id);
    }
    async remove(id, req) {
        return this.patientsService.remove(id, req.user.id);
    }
};
exports.PatientsController = PatientsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cadastrar novo paciente' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Paciente cadastrado com sucesso',
        type: patient_response_dto_1.PatientResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'CPF já cadastrado' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_patient_dto_1.CreatePatientDto, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar pacientes' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de pacientes paginada',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar pacientes por nome' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Resultados da busca',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Termo de busca' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar paciente por ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Dados detalhados do paciente',
        type: patient_response_dto_1.PatientResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Paciente não encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar dados do paciente' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paciente atualizado com sucesso',
        type: patient_response_dto_1.PatientResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Paciente não encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_patient_dto_1.UpdatePatientDto, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/recording-consent'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar consentimento de gravação' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Consentimento atualizado com sucesso',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('consent')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "updateRecordingConsent", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remover paciente' }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Paciente removido com sucesso',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Não é possível remover paciente com sessões/documentos',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "remove", null);
exports.PatientsController = PatientsController = __decorate([
    (0, swagger_1.ApiTags)('Pacientes'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('patients'),
    __metadata("design:paramtypes", [patients_service_1.PatientsService])
], PatientsController);
//# sourceMappingURL=patients.controller.js.map