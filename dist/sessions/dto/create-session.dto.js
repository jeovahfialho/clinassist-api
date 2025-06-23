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
exports.CreateSessionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateSessionDto {
    patientId;
    scheduledAt;
    duration = 50;
    meetingUrl;
    shouldRecord = false;
    notes;
}
exports.CreateSessionDto = CreateSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'patient-id-here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-06-20T14:00:00.000Z',
        description: 'Data e hora da sessão no formato ISO'
    }),
    (0, class_validator_1.IsDateString)({}, { message: 'Data deve estar no formato ISO válido' }),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 50,
        description: 'Duração da sessão em minutos'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(30, { message: 'Duração mínima de 30 minutos' }),
    (0, class_validator_1.Max)(120, { message: 'Duração máxima de 120 minutos' }),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'https://meet.google.com/abc-def-ghi',
        description: 'URL da videoconferência'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({}, { message: 'URL deve ser válida' }),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "meetingUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: false,
        description: 'Se deve gravar a sessão (requer consentimento do paciente)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        return value;
    }),
    __metadata("design:type", Boolean)
], CreateSessionDto.prototype, "shouldRecord", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Sessão de acompanhamento semanal',
        description: 'Observações ou notas sobre o agendamento'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "notes", void 0);
//# sourceMappingURL=create-session.dto.js.map