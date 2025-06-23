import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async create(createPatientDto: CreatePatientDto, psychologistId: string) {
    // Verificar se CPF já existe
    const existingPatient = await this.prisma.patient.findUnique({
      where: { cpf: createPatientDto.cpf },
    });

    if (existingPatient) {
      throw new ConflictException('CPF já cadastrado no sistema');
    }

    // Criptografar dados sensíveis
    const encryptedData = this.encryptSensitiveData(createPatientDto);

    // Ensure required fields aren't undefined
    const patientData = {
      ...encryptedData,
      psychologistId,
      dateOfBirth: new Date(createPatientDto.dateOfBirth),
      // Ensure required fields have values
      name: encryptedData.name || '',
      cpf: (encryptedData as any).cpf || '',
      initialDemand: encryptedData.initialDemand || '',
      objectives: encryptedData.objectives || '', // Ensure objectives has a default value
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

  async findAll(psychologistId: string, pagination: PaginationDto) {
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

    return new PaginatedResult(decryptedPatients, total, page, limit);
  }

  async findOne(id: string, psychologistId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        psychologistId, // Garantir que só acesse pacientes próprios
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
          take: 5, // Últimas 5 sessões
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
      throw new NotFoundException('Paciente não encontrado');
    }

    const decrypted = this.decryptPatientData(patient);
    return {
      ...decrypted,
      totalSessions: patient._count.sessions,
      totalDocuments: patient._count.documents,
      recentSessions: patient.sessions,
    };
  }

  async update(id: string, updatePatientDto: UpdatePatientDto, psychologistId: string) {
    // Verificar se paciente existe e pertence ao psicólogo
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        id,
        psychologistId,
      },
    });

    if (!existingPatient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    // Criptografar dados sensíveis que foram atualizados
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

  async remove(id: string, psychologistId: string) {
    // Verificar se paciente existe e pertence ao psicólogo
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
      throw new NotFoundException('Paciente não encontrado');
    }

    // Verificar se há sessões ou documentos associados
    if (patient._count.sessions > 0 || patient._count.documents > 0) {
      throw new ConflictException(
        'Não é possível excluir paciente com sessões ou documentos associados. ' +
        'Para manter conformidade com CFP, os dados devem ser mantidos por no mínimo 5 anos.'
      );
    }

    await this.prisma.patient.delete({
      where: { id },
    });

    return { message: 'Paciente removido com sucesso' };
  }

  async search(query: string, psychologistId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Buscar por nome ou CPF (note que CPF está criptografado)
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
          // Para CPF, precisaríamos de uma abordagem diferente devido à criptografia
          // Por enquanto, vamos buscar apenas por nome
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

    return new PaginatedResult(decryptedPatients, total, page, limit);
  }

  // Método para atualizar consentimento de gravação
  async updateRecordingConsent(id: string, consent: boolean, psychologistId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        psychologistId,
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    const updatedPatient = await this.prisma.patient.update({
      where: { id },
      data: {
        recordingConsent: consent,
        consentDate: new Date(), // Atualizar data do consentimento
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

  // Métodos privados para criptografia
  private encryptSensitiveData(data: Partial<CreatePatientDto | UpdatePatientDto>) {
    const sensitiveFields = ['name', 'cpf', 'email', 'phone', 'address', 'initialDemand', 'objectives', 'referralSource'];
    const encryptedData = { ...data };

    sensitiveFields.forEach(field => {
      if (encryptedData[field] && typeof encryptedData[field] === 'string') {
        encryptedData[field] = this.encryptionService.encrypt(encryptedData[field] as string);
      }
    });

    return encryptedData as Partial<CreatePatientDto | UpdatePatientDto>;
  }

  private decryptPatientData(patient: any) {
    const sensitiveFields = ['name', 'cpf', 'email', 'phone', 'address', 'initialDemand', 'objectives', 'referralSource'];
    const decryptedPatient = { ...patient };

    sensitiveFields.forEach(field => {
      if (decryptedPatient[field] && typeof decryptedPatient[field] === 'string') {
        decryptedPatient[field] = this.encryptionService.decrypt(decryptedPatient[field]);
      }
    });

    // Formatar datas
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
}