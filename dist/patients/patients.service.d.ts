import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
export declare class PatientsService {
    private prisma;
    private encryptionService;
    constructor(prisma: PrismaService, encryptionService: EncryptionService);
    create(createPatientDto: CreatePatientDto, psychologistId: string): Promise<any>;
    findAll(psychologistId: string, pagination: PaginationDto): Promise<PaginatedResult<any>>;
    findOne(id: string, psychologistId: string): Promise<any>;
    update(id: string, updatePatientDto: UpdatePatientDto, psychologistId: string): Promise<any>;
    remove(id: string, psychologistId: string): Promise<{
        message: string;
    }>;
    search(query: string, psychologistId: string, pagination: PaginationDto): Promise<PaginatedResult<any>>;
    updateRecordingConsent(id: string, consent: boolean, psychologistId: string): Promise<any>;
    private encryptSensitiveData;
    private decryptPatientData;
}
