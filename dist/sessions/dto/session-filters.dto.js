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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionFiltersDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
class SessionFiltersDto extends pagination_dto_1.PaginationDto {
    status;
    startDate;
    endDate;
    patientId;
    hasRecording;
}
exports.SessionFiltersDto = SessionFiltersDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.SessionStatus,
        description: 'Filtrar por status da sessão'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.SessionStatus),
    __metadata("design:type", String)
], SessionFiltersDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2024-06-01',
        description: 'Data de início do período (YYYY-MM-DD)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SessionFiltersDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2024-06-30',
        description: 'Data de fim do período (YYYY-MM-DD)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SessionFiltersDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'patient-id-here',
        description: 'Filtrar por paciente específico'
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SessionFiltersDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: true,
        description: 'Filtrar apenas sessões gravadas'
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SessionFiltersDto.prototype, "hasRecording", void 0);
//# sourceMappingURL=session-filters.dto.js.map