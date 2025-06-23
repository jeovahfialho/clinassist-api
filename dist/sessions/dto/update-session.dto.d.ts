import { CreateSessionDto } from './create-session.dto';
declare const UpdateSessionDto_base: import("@nestjs/common").Type<Partial<Omit<CreateSessionDto, "patientId">>>;
export declare class UpdateSessionDto extends UpdateSessionDto_base {
    evolutionNotes?: string;
    techniques?: string[];
    observations?: string;
}
export {};
