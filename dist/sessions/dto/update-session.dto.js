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
exports.UpdateSessionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_session_dto_1 = require("./create-session.dto");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class UpdateSessionDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_session_dto_1.CreateSessionDto, ['patientId'])) {
    evolutionNotes;
    techniques;
    observations;
}
exports.UpdateSessionDto = UpdateSessionDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        example: 'Paciente relatou melhora significativa na ansiedade...',
        description: 'Notas de evolução da sessão (obrigatório CFP)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSessionDto.prototype, "evolutionNotes", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        example: ['Terapia Cognitivo-Comportamental', 'Técnicas de respiração'],
        description: 'Técnicas utilizadas na sessão'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateSessionDto.prototype, "techniques", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        example: 'Paciente demonstrou boa receptividade às intervenções',
        description: 'Observações gerais da sessão'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSessionDto.prototype, "observations", void 0);
//# sourceMappingURL=update-session.dto.js.map