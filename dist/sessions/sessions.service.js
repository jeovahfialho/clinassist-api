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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const encryption_service_1 = require("../common/services/encryption.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
const client_1 = require("@prisma/client");
let SessionsService = class SessionsService {
    prisma;
    encryptionService;
    constructor(prisma, encryptionService) {
        this.prisma = prisma;
        this.encryptionService = encryptionService;
    }
    async create(createSessionDto, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id: createSessionDto.patientId,
                psychologistId,
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        if (createSessionDto.shouldRecord && !patient.recordingConsent) {
            throw new common_1.BadRequestException('Paciente não autorizou gravação de sessões. Atualize o consentimento primeiro.');
        }
        const scheduledAt = new Date(createSessionDto.scheduledAt);
        const endTime = new Date(scheduledAt.getTime() + (createSessionDto.duration || 50) * 60000);
        const conflictingSession = await this.prisma.session.findFirst({
            where: {
                psychologistId,
                status: {
                    in: [client_1.SessionStatus.SCHEDULED, client_1.SessionStatus.IN_PROGRESS],
                },
                OR: [
                    {
                        AND: [
                            { scheduledAt: { lte: scheduledAt } },
                            {
                                scheduledAt: {
                                    gte: new Date(scheduledAt.getTime() - ((createSessionDto.duration ?? 50) * 60000))
                                }
                            },
                        ],
                    },
                    {
                        AND: [
                            { scheduledAt: { gte: scheduledAt } },
                            { scheduledAt: { lte: endTime } },
                        ],
                    },
                ],
            },
        });
        if (conflictingSession) {
            throw new common_1.ConflictException('Já existe uma sessão agendada neste horário');
        }
        let meetingUrl = createSessionDto.meetingUrl;
        if (!meetingUrl) {
            meetingUrl = await this.generateMeetingUrl();
        }
        const encryptedData = this.encryptSessionData({
            evolutionNotes: createSessionDto.notes,
        });
        const session = await this.prisma.session.create({
            data: {
                scheduledAt,
                duration: createSessionDto.duration || 50,
                meetingUrl,
                hasRecording: false,
                shouldRecord: createSessionDto.shouldRecord ?? false,
                patientId: createSessionDto.patientId,
                psychologistId,
                observations: encryptedData.evolutionNotes,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
            },
        });
        return this.decryptSessionData(session);
    }
    async findAll(psychologistId, filters) {
        const { page = 1, limit = 10, status, startDate, endDate, patientId, hasRecording } = filters;
        const skip = (page - 1) * limit;
        const where = { psychologistId };
        if (status) {
            where.status = status;
        }
        if (patientId) {
            where.patientId = patientId;
        }
        if (hasRecording !== undefined) {
            where.hasRecording = hasRecording;
        }
        if (startDate || endDate) {
            where.scheduledAt = {};
            if (startDate) {
                where.scheduledAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.scheduledAt.lte = new Date(endDate + 'T23:59:59.999Z');
            }
        }
        const [sessions, total] = await Promise.all([
            this.prisma.session.findMany({
                where,
                skip,
                take: limit,
                include: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                        },
                    },
                    psychologist: {
                        select: {
                            id: true,
                            name: true,
                            crp: true,
                        },
                    },
                },
                orderBy: {
                    scheduledAt: 'desc',
                },
            }),
            this.prisma.session.count({ where }),
        ]);
        const decryptedSessions = sessions.map(session => this.decryptSessionData(session));
        return new pagination_dto_1.PaginatedResult(decryptedSessions, total, page, limit);
    }
    async findOne(id, psychologistId) {
        const session = await this.prisma.session.findFirst({
            where: {
                id,
                psychologistId,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        recordingConsent: true,
                    },
                },
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Sessão não encontrada');
        }
        return this.decryptSessionData(session);
    }
    async update(id, updateSessionDto, psychologistId) {
        const session = await this.prisma.session.findFirst({
            where: {
                id,
                psychologistId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Sessão não encontrada');
        }
        const encryptedData = this.encryptSessionData(updateSessionDto);
        const updatedSession = await this.prisma.session.update({
            where: { id },
            data: {
                ...encryptedData,
                ...(updateSessionDto.scheduledAt && {
                    scheduledAt: new Date(updateSessionDto.scheduledAt),
                }),
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
            },
        });
        return this.decryptSessionData(updatedSession);
    }
    async updateStatus(id, status, psychologistId) {
        const session = await this.prisma.session.findFirst({
            where: {
                id,
                psychologistId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Sessão não encontrada');
        }
        const updatedSession = await this.prisma.session.update({
            where: { id },
            data: { status },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                psychologist: {
                    select: {
                        id: true,
                        name: true,
                        crp: true,
                    },
                },
            },
        });
        return this.decryptSessionData(updatedSession);
    }
    async remove(id, psychologistId) {
        const session = await this.prisma.session.findFirst({
            where: {
                id,
                psychologistId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Sessão não encontrada');
        }
        if (session.status === client_1.SessionStatus.COMPLETED) {
            throw new common_1.ConflictException('Não é possível remover sessões concluídas. ' +
                'Dados devem ser mantidos conforme Resolução CFP 001/2009.');
        }
        await this.prisma.session.delete({
            where: { id },
        });
        return { message: 'Sessão removida com sucesso' };
    }
    async getStats(psychologistId, startDate, endDate) {
        const where = { psychologistId };
        if (startDate || endDate) {
            where.scheduledAt = {};
            if (startDate) {
                where.scheduledAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.scheduledAt.lte = new Date(endDate + 'T23:59:59.999Z');
            }
        }
        const [totalSessions, completedSessions, cancelledSessions, noShowSessions, recordedSessions, upcomingSessions, todaySessions, averageDurationResult,] = await Promise.all([
            this.prisma.session.count({ where }),
            this.prisma.session.count({ where: { ...where, status: client_1.SessionStatus.COMPLETED } }),
            this.prisma.session.count({ where: { ...where, status: client_1.SessionStatus.CANCELLED } }),
            this.prisma.session.count({ where: { ...where, status: client_1.SessionStatus.NO_SHOW } }),
            this.prisma.session.count({ where: { ...where, hasRecording: true } }),
            this.prisma.session.count({
                where: {
                    ...where,
                    status: client_1.SessionStatus.SCHEDULED,
                    scheduledAt: { gte: new Date() },
                },
            }),
            this.prisma.session.count({
                where: {
                    ...where,
                    scheduledAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lte: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                },
            }),
            this.prisma.session.aggregate({
                where: { ...where, status: client_1.SessionStatus.COMPLETED },
                _avg: { duration: true },
            }),
        ]);
        return {
            totalSessions,
            completedSessions,
            cancelledSessions,
            noShowSessions,
            upcomingSessions,
            todaySessions,
            recordedSessions,
            averageDuration: Math.round(averageDurationResult._avg.duration || 0),
        };
    }
    async getTodaySessions(psychologistId) {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        const sessions = await this.prisma.session.findMany({
            where: {
                psychologistId,
                scheduledAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: {
                scheduledAt: 'asc',
            },
        });
        return sessions.map(session => this.decryptSessionData(session));
    }
    async generateMeetingUrl() {
        const roomId = Math.random().toString(36).substring(2, 15);
        return `https://meet.google.com/${roomId.substring(0, 3)}-${roomId.substring(3, 6)}-${roomId.substring(6, 9)}`;
    }
    encryptSessionData(data) {
        const sensitiveFields = ['evolutionNotes', 'techniques', 'observations', 'notes'];
        const encrypted = { ...data };
        sensitiveFields.forEach(field => {
            if (encrypted[field]) {
                if (Array.isArray(encrypted[field])) {
                    encrypted[field] = encrypted[field].map(item => this.encryptionService.encrypt(item));
                }
                else if (typeof encrypted[field] === 'string') {
                    encrypted[field] = this.encryptionService.encrypt(encrypted[field]);
                }
            }
        });
        return encrypted;
    }
    decryptSessionData(session) {
        const sensitiveFields = ['evolutionNotes', 'techniques', 'observations'];
        const decrypted = { ...session };
        sensitiveFields.forEach(field => {
            if (decrypted[field]) {
                if (Array.isArray(decrypted[field])) {
                    decrypted[field] = decrypted[field].map(item => this.encryptionService.decrypt(item));
                }
                else if (typeof decrypted[field] === 'string') {
                    decrypted[field] = this.encryptionService.decrypt(decrypted[field]);
                }
            }
        });
        if (decrypted.scheduledAt) {
            decrypted.scheduledAt = decrypted.scheduledAt.toISOString();
        }
        if (decrypted.createdAt) {
            decrypted.createdAt = decrypted.createdAt.toISOString();
        }
        if (decrypted.updatedAt) {
            decrypted.updatedAt = decrypted.updatedAt.toISOString();
        }
        if (decrypted.patient && decrypted.patient.name) {
            decrypted.patient.name = this.encryptionService.decrypt(decrypted.patient.name);
            if (decrypted.patient.phone) {
                decrypted.patient.phone = this.encryptionService.decrypt(decrypted.patient.phone);
            }
            if (decrypted.patient.email) {
                decrypted.patient.email = this.encryptionService.decrypt(decrypted.patient.email);
            }
        }
        return decrypted;
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map