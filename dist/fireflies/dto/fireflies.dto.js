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
exports.CFPFormattedTranscriptDto = exports.TranscriptResponseDto = exports.FirefliesWebhookDto = exports.UploadAudioDto = exports.AddToLiveMeetingDto = exports.AttendeeDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class AttendeeDto {
    displayName;
    email;
}
exports.AttendeeDto = AttendeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dr. João Silva' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendeeDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'joao@clinica.com.br' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendeeDto.prototype, "email", void 0);
class AddToLiveMeetingDto {
    sessionId;
    meetingUrl;
    title;
    attendees;
}
exports.AddToLiveMeetingDto = AddToLiveMeetingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'session-id-here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddToLiveMeetingDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'https://meet.google.com/abc-def-ghi',
        description: 'URL da reunião (se não fornecida, usará a URL da sessão)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], AddToLiveMeetingDto.prototype, "meetingUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Sessão de Psicoterapia - Maria Silva',
        description: 'Título da reunião para o Fireflies'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddToLiveMeetingDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [AttendeeDto],
        description: 'Lista de participantes'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AttendeeDto),
    __metadata("design:type", Array)
], AddToLiveMeetingDto.prototype, "attendees", void 0);
class UploadAudioDto {
    sessionId;
    audioUrl;
    title;
}
exports.UploadAudioDto = UploadAudioDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'session-id-here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadAudioDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://example.com/audio.mp3',
        description: 'URL pública do arquivo de áudio/vídeo'
    }),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UploadAudioDto.prototype, "audioUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Sessão de Psicoterapia - 20/06/2024',
        description: 'Título para a transcrição'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadAudioDto.prototype, "title", void 0);
class FirefliesWebhookDto {
    transcript_id;
    status;
    data;
}
exports.FirefliesWebhookDto = FirefliesWebhookDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FirefliesWebhookDto.prototype, "transcript_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FirefliesWebhookDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], FirefliesWebhookDto.prototype, "data", void 0);
class TranscriptResponseDto {
    id;
    title;
    transcript;
    summary;
    speakers;
    keyPoints;
    actionItems;
    duration;
    date;
    firefliesUrl;
}
exports.TranscriptResponseDto = TranscriptResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TranscriptResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TranscriptResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TranscriptResponseDto.prototype, "transcript", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TranscriptResponseDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], TranscriptResponseDto.prototype, "speakers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], TranscriptResponseDto.prototype, "keyPoints", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], TranscriptResponseDto.prototype, "actionItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TranscriptResponseDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TranscriptResponseDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TranscriptResponseDto.prototype, "firefliesUrl", void 0);
class CFPFormattedTranscriptDto {
    patientIdentification;
    demandAssessment;
    sessionEvolution;
    technicalProcedures;
    generalObservations;
    nextSteps;
    fullTranscript;
}
exports.CFPFormattedTranscriptDto = CFPFormattedTranscriptDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Identificação do usuário/paciente' }),
    __metadata("design:type", String)
], CFPFormattedTranscriptDto.prototype, "patientIdentification", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Avaliação de demanda identificada na sessão' }),
    __metadata("design:type", String)
], CFPFormattedTranscriptDto.prototype, "demandAssessment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Evolução observada durante a sessão' }),
    __metadata("design:type", String)
], CFPFormattedTranscriptDto.prototype, "sessionEvolution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Procedimentos técnico-científicos utilizados' }),
    __metadata("design:type", Array)
], CFPFormattedTranscriptDto.prototype, "technicalProcedures", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Observações gerais da sessão' }),
    __metadata("design:type", String)
], CFPFormattedTranscriptDto.prototype, "generalObservations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Próximos passos ou encaminhamentos' }),
    __metadata("design:type", String)
], CFPFormattedTranscriptDto.prototype, "nextSteps", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transcrição completa (opcional)' }),
    __metadata("design:type", String)
], CFPFormattedTranscriptDto.prototype, "fullTranscript", void 0);
//# sourceMappingURL=fireflies.dto.js.map