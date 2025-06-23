import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionFiltersDto } from './dto/session-filters.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { SessionStatus } from '@prisma/client';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async create(createSessionDto: CreateSessionDto, psychologistId: string) {
    // Verificar se o paciente existe e pertence ao psicólogo
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: createSessionDto.patientId,
        psychologistId,
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    // Verificar se o paciente deu consentimento para gravação (se solicitada)
    if (createSessionDto.shouldRecord && !patient.recordingConsent) {
      throw new BadRequestException(
        'Paciente não autorizou gravação de sessões. Atualize o consentimento primeiro.'
      );
    }

    // Verificar conflitos de horário
    const scheduledAt = new Date(createSessionDto.scheduledAt);
    const endTime = new Date(scheduledAt.getTime() + (createSessionDto.duration || 50) * 60000);

    const conflictingSession = await this.prisma.session.findFirst({
      where: {
        psychologistId,
        status: {
          in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS],
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
      throw new ConflictException('Já existe uma sessão agendada neste horário');
    }

    // Gerar URL da reunião se não fornecida
    let meetingUrl = createSessionDto.meetingUrl;
    if (!meetingUrl) {
      meetingUrl = await this.generateMeetingUrl();
    }

    // Criptografar dados sensíveis
    const encryptedData = this.encryptSessionData({
      evolutionNotes: createSessionDto.notes,
    });

    const session = await this.prisma.session.create({
      data: {
        scheduledAt,
        duration: createSessionDto.duration || 50,
        meetingUrl,
        hasRecording: false, // Sempre false inicialmente
        shouldRecord: createSessionDto.shouldRecord ?? false, // Autorização para gravar
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

  async findAll(psychologistId: string, filters: SessionFiltersDto) {
    const { page = 1, limit = 10, status, startDate, endDate, patientId, hasRecording } = filters;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = { psychologistId };

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

    return new PaginatedResult(decryptedSessions, total, page, limit);
  }

  async findOne(id: string, psychologistId: string) {
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
      throw new NotFoundException('Sessão não encontrada');
    }

    return this.decryptSessionData(session);
  }

  async update(id: string, updateSessionDto: UpdateSessionDto, psychologistId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id,
        psychologistId,
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // Criptografar novos dados sensíveis
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

  async updateStatus(id: string, status: SessionStatus, psychologistId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id,
        psychologistId,
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
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

  async remove(id: string, psychologistId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id,
        psychologistId,
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // Verificar se pode ser removida (apenas sessões não realizadas)
    if (session.status === SessionStatus.COMPLETED) {
      throw new ConflictException(
        'Não é possível remover sessões concluídas. ' +
        'Dados devem ser mantidos conforme Resolução CFP 001/2009.'
      );
    }

    await this.prisma.session.delete({
      where: { id },
    });

    return { message: 'Sessão removida com sucesso' };
  }

  async getStats(psychologistId: string, startDate?: string, endDate?: string) {
    const where: any = { psychologistId };

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const [
      totalSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      recordedSessions,
      upcomingSessions,
      todaySessions,
      averageDurationResult,
    ] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.count({ where: { ...where, status: SessionStatus.COMPLETED } }),
      this.prisma.session.count({ where: { ...where, status: SessionStatus.CANCELLED } }),
      this.prisma.session.count({ where: { ...where, status: SessionStatus.NO_SHOW } }),
      this.prisma.session.count({ where: { ...where, hasRecording: true } }),
      this.prisma.session.count({
        where: {
          ...where,
          status: SessionStatus.SCHEDULED,
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
        where: { ...where, status: SessionStatus.COMPLETED },
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

  async getTodaySessions(psychologistId: string) {
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

  // Métodos auxiliares
  private async generateMeetingUrl(): Promise<string> {
    // Por enquanto gerar URL fictícia do Google Meet
    // Na integração real, isso seria conectado com a API do Google Calendar
    const roomId = Math.random().toString(36).substring(2, 15);
    return `https://meet.google.com/${roomId.substring(0, 3)}-${roomId.substring(3, 6)}-${roomId.substring(6, 9)}`;
  }

  private encryptSessionData(data: any) {
    const sensitiveFields = ['evolutionNotes', 'techniques', 'observations', 'notes'];
    const encrypted = { ...data };

    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        if (Array.isArray(encrypted[field])) {
          encrypted[field] = encrypted[field].map(item => 
            this.encryptionService.encrypt(item)
          );
        } else if (typeof encrypted[field] === 'string') {
          encrypted[field] = this.encryptionService.encrypt(encrypted[field]);
        }
      }
    });

    return encrypted;
  }

  private decryptSessionData(session: any) {
    const sensitiveFields = ['evolutionNotes', 'techniques', 'observations'];
    const decrypted = { ...session };

    sensitiveFields.forEach(field => {
      if (decrypted[field]) {
        if (Array.isArray(decrypted[field])) {
          decrypted[field] = decrypted[field].map(item => 
            this.encryptionService.decrypt(item)
          );
        } else if (typeof decrypted[field] === 'string') {
          decrypted[field] = this.encryptionService.decrypt(decrypted[field]);
        }
      }
    });

    // Formatar datas
    if (decrypted.scheduledAt) {
      decrypted.scheduledAt = decrypted.scheduledAt.toISOString();
    }
    if (decrypted.createdAt) {
      decrypted.createdAt = decrypted.createdAt.toISOString();
    }
    if (decrypted.updatedAt) {
      decrypted.updatedAt = decrypted.updatedAt.toISOString();
    }

    // Descriptografar dados do paciente se presentes
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
}