import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
export declare class PatientsController {
    private readonly patientsService;
    constructor(patientsService: PatientsService);
    create(createPatientDto: CreatePatientDto, req: any): Promise<any>;
    findAll(pagination: PaginationDto, req: any): Promise<PaginatedResult<PatientResponseDto>>;
    search(query: string, pagination: PaginationDto, req: any): Promise<PaginatedResult<any>>;
    findOne(id: string, req: any): Promise<any>;
    update(id: string, updatePatientDto: UpdatePatientDto, req: any): Promise<any>;
    updateRecordingConsent(id: string, consent: boolean, req: any): Promise<any>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
