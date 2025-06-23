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
exports.DocumentResponseDto = exports.GenerateDocumentFromTemplateDto = exports.DocumentTemplateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class DocumentTemplateDto {
    id;
    name;
    type;
    template;
    variables;
    isActive;
}
exports.DocumentTemplateDto = DocumentTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentTemplateDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentTemplateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentTemplateDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentTemplateDto.prototype, "template", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DocumentTemplateDto.prototype, "variables", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DocumentTemplateDto.prototype, "isActive", void 0);
class GenerateDocumentFromTemplateDto {
    templateId;
    patientId;
    sessionIds;
    customVariables;
}
exports.GenerateDocumentFromTemplateDto = GenerateDocumentFromTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GenerateDocumentFromTemplateDto.prototype, "templateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], GenerateDocumentFromTemplateDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], GenerateDocumentFromTemplateDto.prototype, "sessionIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], GenerateDocumentFromTemplateDto.prototype, "customVariables", void 0);
class DocumentResponseDto {
    id;
    title;
    type;
    content;
    fileName;
    fileUrl;
    patientId;
    patient;
    createdAt;
    updatedAt;
}
exports.DocumentResponseDto = DocumentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "fileUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "patientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], DocumentResponseDto.prototype, "patient", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DocumentResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=document-template.dto.js.map