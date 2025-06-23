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
exports.CreatePatientDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreatePatientDto {
    name;
    cpf;
    email;
    phone;
    dateOfBirth;
    address;
    initialDemand;
    objectives;
    referralSource;
    recordingConsent = false;
}
exports.CreatePatientDto = CreatePatientDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Maria da Silva Santos' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123.456.789-00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
        message: 'CPF deve ter o formato 000.000.000-00'
    }),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "cpf", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'maria@email.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Email deve ter formato válido' }),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '(11) 99999-9999' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1990-05-15' }),
    (0, class_validator_1.IsDateString)({}, { message: 'Data de nascimento deve ser uma data válida' }),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Rua das Flores, 123 - São Paulo/SP' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Paciente relata ansiedade e dificuldades para dormir há 3 meses',
        description: 'Demanda inicial apresentada pelo paciente (obrigatório CFP)'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10, { message: 'Demanda inicial deve ter pelo menos 10 caracteres' }),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "initialDemand", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Reduzir sintomas de ansiedade e melhorar qualidade do sono',
        description: 'Objetivos terapêuticos definidos (obrigatório CFP)'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10, { message: 'Objetivos devem ter pelo menos 10 caracteres' }),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "objectives", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Encaminhamento médico - Dr. João (CRM 12345)',
        description: 'Fonte do encaminhamento, se houver'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "referralSource", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: false,
        description: 'Consentimento para gravação de sessões'
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
], CreatePatientDto.prototype, "recordingConsent", void 0);
//# sourceMappingURL=create-patient.dto.js.map