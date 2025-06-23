import { CreatePatientDto } from './create-patient.dto';
declare const UpdatePatientDto_base: import("@nestjs/common").Type<Partial<Omit<CreatePatientDto, "cpf">>>;
export declare class UpdatePatientDto extends UpdatePatientDto_base {
}
export {};
