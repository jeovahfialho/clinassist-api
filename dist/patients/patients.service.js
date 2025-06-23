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
exports.PatientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const encryption_service_1 = require("../common/services/encryption.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let PatientsService = class PatientsService {
    prisma;
    encryptionService;
    constructor(prisma, encryptionService) {
        this.prisma = prisma;
        this.encryptionService = encryptionService;
    }
    async create(createPatientDto, psychologistId) {
        const existingPatient = await this.prisma.patient.findUnique({
            where: { cpf: createPatientDto.cpf },
        });
        if (existingPatient) {
            throw new common_1.ConflictException('CPF já cadastrado no sistema');
        }
        const encryptedData = this.encryptSensitiveData(createPatientDto);
        const patientData = {
            ...encryptedData,
            psychologistId,
            dateOfBirth: new Date(createPatientDto.dateOfBirth),
            name: encryptedData.name || '',
            cpf: encryptedData.cpf || '',
            initialDemand: encryptedData.initialDemand || '',
            objectives: encryptedData.objectives || '',
        };
        const patient = await this.prisma.patient.create({
            data: patientData,
            include: {
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
            },
        });
        return this.decryptPatientData(patient);
    }
    async findAll(psychologistId, pagination) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;
        const [patients, total] = await Promise.all([
            this.prisma.patient.findMany({
                where: { psychologistId },
                skip,
                take: limit,
                include: {
                    psychologist: {
                        select: {
                            id: true,
                            name: true,
                            crp: true,
                        },
                    },
                    sessions: {
                        select: {
                            id: true,
                            scheduledAt: true,
                            status: true,
                        },
                        orderBy: {
                            scheduledAt: 'desc',
                        },
                        take: 1,
                    },
                    _count: {
                        select: {
                            sessions: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.patient.count({
                where: { psychologistId },
            }),
        ]);
        const decryptedPatients = patients.map(patient => {
            const decrypted = this.decryptPatientData(patient);
            return {
                ...decrypted,
                totalSessions: patient._count.sessions,
                lastSessionDate: patient.sessions[0]?.scheduledAt?.toISOString() || null,
            };
        });
        return new pagination_dto_1.PaginatedResult(decryptedPatients, total, page, limit);
    }
    async findOne(id, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id,
                psychologistId,
            },
            include: {
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
                sessions: {
                    select: {
                        id: true,
                        scheduledAt: true,
                        status: true,
                        duration: true,
                    },
                    orderBy: {
                        scheduledAt: 'desc',
                    },
                    take: 5,
                },
                _count: {
                    select: {
                        sessions: true,
                        documents: true,
                    },
                },
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        const decrypted = this.decryptPatientData(patient);
        return {
            ...decrypted,
            totalSessions: patient._count.sessions,
            totalDocuments: patient._count.documents,
            recentSessions: patient.sessions,
        };
    }
    async update(id, updatePatientDto, psychologistId) {
        const existingPatient = await this.prisma.patient.findFirst({
            where: {
                id,
                psychologistId,
            },
        });
        if (!existingPatient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        const encryptedData = this.encryptSensitiveData(updatePatientDto);
        const updatedPatient = await this.prisma.patient.update({
            where: { id },
            data: {
                ...encryptedData,
                ...(updatePatientDto.dateOfBirth && {
                    dateOfBirth: new Date(updatePatientDto.dateOfBirth),
                }),
            },
            include: {
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
            },
        });
        return this.decryptPatientData(updatedPatient);
    }
    async remove(id, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id,
                psychologistId,
            },
            include: {
                _count: {
                    select: {
                        sessions: true,
                        documents: true,
                    },
                },
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        if (patient._count.sessions > 0 || patient._count.documents > 0) {
            throw new common_1.ConflictException('Não é possível excluir paciente com sessões ou documentos associados. ' +
                'Para manter conformidade com CFP, os dados devem ser mantidos por no mínimo 5 anos.');
        }
        await this.prisma.patient.delete({
            where: { id },
        });
        return { message: 'Paciente removido com sucesso' };
    }
    async search(query, psychologistId, pagination) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;
        const patients = await this.prisma.patient.findMany({
            where: {
                psychologistId,
                OR: [
                    {
                        name: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            skip,
            take: limit,
            include: {
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
                _count: {
                    select: {
                        sessions: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
        const total = await this.prisma.patient.count({
            where: {
                psychologistId,
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
        });
        const decryptedPatients = patients.map(patient => {
            const decrypted = this.decryptPatientData(patient);
            return {
                ...decrypted,
                totalSessions: patient._count.sessions,
            };
        });
        return new pagination_dto_1.PaginatedResult(decryptedPatients, total, page, limit);
    }
    async updateRecordingConsent(id, consent, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id,
                psychologistId,
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        const updatedPatient = await this.prisma.patient.update({
            where: { id },
            data: {
                recordingConsent: consent,
                consentDate: new Date(),
            },
            include: {
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
            },
        });
        return this.decryptPatientData(updatedPatient);
    }
    encryptSensitiveData(data) {
        const sensitiveFields = ['name', 'cpf', 'email', 'phone', 'address', 'initialDemand', 'objectives', 'referralSource'];
        const encryptedData = { ...data };
        sensitiveFields.forEach(field => {
            if (encryptedData[field] && typeof encryptedData[field] === 'string') {
                encryptedData[field] = this.encryptionService.encrypt(encryptedData[field]);
            }
        });
        return encryptedData;
    }
    decryptPatientData(patient) {
        const sensitiveFields = ['name', 'cpf', 'email', 'phone', 'address', 'initialDemand', 'objectives', 'referralSource'];
        const decryptedPatient = { ...patient };
        sensitiveFields.forEach(field => {
            if (decryptedPatient[field] && typeof decryptedPatient[field] === 'string') {
                decryptedPatient[field] = this.encryptionService.decrypt(decryptedPatient[field]);
            }
        });
        if (decryptedPatient.dateOfBirth) {
            decryptedPatient.dateOfBirth = decryptedPatient.dateOfBirth.toISOString().split('T')[0];
        }
        if (decryptedPatient.consentDate) {
            decryptedPatient.consentDate = decryptedPatient.consentDate.toISOString();
        }
        if (decryptedPatient.createdAt) {
            decryptedPatient.createdAt = decryptedPatient.createdAt.toISOString();
        }
        if (decryptedPatient.updatedAt) {
            decryptedPatient.updatedAt = decryptedPatient.updatedAt.toISOString();
        }
        return decryptedPatient;
    }
};
exports.PatientsService = PatientsService;
exports.PatientsService = PatientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService])
], PatientsService);
//# sourceMappingURL=patients.service.js.map