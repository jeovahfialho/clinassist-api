"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePatientDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_patient_dto_1 = require("./create-patient.dto");
class UpdatePatientDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_patient_dto_1.CreatePatientDto, ['cpf'])) {
}
exports.UpdatePatientDto = UpdatePatientDto;
//# sourceMappingURL=update-patient.dto.js.map