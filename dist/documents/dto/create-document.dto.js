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
exports.CreateDocumentDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateDocumentDto {
    patientId;
    title;
    type;
    content;
    sessionIds;
    startDate;
    endDate;
    fileName;
}
exports.CreateDocumentDto = CreateDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'patient-id-here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Relatório de Evolução Psicológica - Março 2024',
        description: 'Título do documento'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5, { message: 'Título deve ter pelo menos 5 caracteres' }),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.DocumentType,
        example: client_1.DocumentType.EVOLUTION_REPORT,
        description: 'Tipo do documento'
    }),
    (0, class_validator_1.IsEnum)(client_1.DocumentType),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'O paciente apresentou melhora significativa...',
        description: 'Conteúdo do documento (opcional se for gerado automaticamente)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: ['session-id-1', 'session-id-2'],
        description: 'IDs das sessões base para o relatório'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateDocumentDto.prototype, "sessionIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2024-01-01',
        description: 'Data de início do período (para relatórios)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2024-03-31',
        description: 'Data de fim do período (para relatórios)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'relatorio-evolucao.pdf',
        description: 'Nome do arquivo (se anexado)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "fileName", void 0);
//# sourceMappingURL=create-document.dto.js.map