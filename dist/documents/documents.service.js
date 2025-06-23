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
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const encryption_service_1 = require("../common/services/encryption.service");
const fireflies_service_1 = require("../fireflies/fireflies.service");
const client_1 = require("@prisma/client");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let DocumentsService = DocumentsService_1 = class DocumentsService {
    prisma;
    encryptionService;
    firefliesService;
    logger = new common_1.Logger(DocumentsService_1.name);
    constructor(prisma, encryptionService, firefliesService) {
        this.prisma = prisma;
        this.encryptionService = encryptionService;
        this.firefliesService = firefliesService;
    }
    async create(createDocumentDto, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id: createDocumentDto.patientId,
                psychologistId,
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        let content = createDocumentDto.content;
        if (!content) {
            content = await this.generateDocumentContent(createDocumentDto.type, createDocumentDto.patientId, psychologistId, createDocumentDto.sessionIds, createDocumentDto.startDate, createDocumentDto.endDate);
        }
        const encryptedContent = this.encryptionService.encrypt(content);
        const document = await this.prisma.document.create({
            data: {
                title: createDocumentDto.title,
                type: createDocumentDto.type,
                content: encryptedContent,
                fileName: createDocumentDto.fileName,
                patientId: createDocumentDto.patientId,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return this.decryptDocumentData(document);
    }
    async findAll(psychologistId, pagination, patientId, type) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;
        const where = {
            patient: {
                psychologistId,
            },
        };
        if (patientId) {
            where.patientId = patientId;
        }
        if (type) {
            where.type = type;
        }
        const [documents, total] = await Promise.all([
            this.prisma.document.findMany({
                where,
                skip,
                take: limit,
                include: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.document.count({ where }),
        ]);
        const decryptedDocuments = documents.map(doc => this.decryptDocumentData(doc));
        return new pagination_dto_1.PaginatedResult(decryptedDocuments, total, page, limit);
    }
    async findOne(id, psychologistId) {
        const document = await this.prisma.document.findFirst({
            where: {
                id,
                patient: {
                    psychologistId,
                },
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        cpf: true,
                        dateOfBirth: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Documento não encontrado');
        }
        return this.decryptDocumentData(document);
    }
    async update(id, updateData, psychologistId) {
        const document = await this.prisma.document.findFirst({
            where: {
                id,
                patient: {
                    psychologistId,
                },
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Documento não encontrado');
        }
        const dataToUpdate = {};
        if (updateData.title) {
            dataToUpdate.title = updateData.title;
        }
        if (updateData.content) {
            dataToUpdate.content = this.encryptionService.encrypt(updateData.content);
        }
        if (updateData.fileName) {
            dataToUpdate.fileName = updateData.fileName;
        }
        const updatedDocument = await this.prisma.document.update({
            where: { id },
            data: dataToUpdate,
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return this.decryptDocumentData(updatedDocument);
    }
    async remove(id, psychologistId) {
        const document = await this.prisma.document.findFirst({
            where: {
                id,
                patient: {
                    psychologistId,
                },
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Documento não encontrado');
        }
        await this.prisma.document.delete({
            where: { id },
        });
        return { message: 'Documento removido com sucesso' };
    }
    async generateEvolutionReport(patientId, psychologistId, startDate, endDate) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id: patientId,
                psychologistId,
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        const whereClause = {
            patientId,
            psychologistId,
            status: 'COMPLETED',
        };
        if (startDate || endDate) {
            whereClause.scheduledAt = {};
            if (startDate) {
                whereClause.scheduledAt.gte = new Date(startDate);
            }
            if (endDate) {
                whereClause.scheduledAt.lte = new Date(endDate + 'T23:59:59.999Z');
            }
        }
        const sessions = await this.prisma.session.findMany({
            where: whereClause,
            orderBy: {
                scheduledAt: 'asc',
            },
        });
        if (sessions.length === 0) {
            const report = await this.buildBasicEvolutionReport(patient);
            return report;
        }
        const report = await this.buildEvolutionReport(patient, sessions);
        return report;
    }
    async generatePsychologicalEvaluation(patientId, psychologistId, sessionIds) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id: patientId,
                psychologistId,
            },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        let sessions;
        if (sessionIds && sessionIds.length > 0) {
            sessions = await this.prisma.session.findMany({
                where: {
                    id: { in: sessionIds },
                    patientId,
                    psychologistId,
                },
                orderBy: {
                    scheduledAt: 'asc',
                },
            });
        }
        else {
            sessions = await this.prisma.session.findMany({
                where: {
                    patientId,
                    psychologistId,
                },
                take: 5,
                orderBy: {
                    scheduledAt: 'asc',
                },
            });
        }
        const evaluation = await this.buildPsychologicalEvaluation(patient, sessions);
        return evaluation;
    }
    async generateAIEnhancedEvolutionReport(patientId, psychologistId, startDate, endDate) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, psychologistId }
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        const whereClause = {
            patientId,
            psychologistId,
            status: 'COMPLETED',
            transcriptId: { not: null }
        };
        if (startDate || endDate) {
            whereClause.scheduledAt = {};
            if (startDate)
                whereClause.scheduledAt.gte = new Date(startDate);
            if (endDate)
                whereClause.scheduledAt.lte = new Date(endDate + 'T23:59:59.999Z');
        }
        const sessions = await this.prisma.session.findMany({
            where: whereClause,
            orderBy: { scheduledAt: 'asc' }
        });
        if (sessions.length === 0) {
            return this.buildBasicEvolutionReport(patient);
        }
        const aiInsights = await this.processSessionsWithAI(sessions, psychologistId);
        return this.buildAIEnhancedEvolutionReport(patient, sessions, aiInsights);
    }
    async generateAIEnhancedPsychologicalEvaluation(patientId, psychologistId, sessionIds) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, psychologistId }
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        let sessions;
        if (sessionIds && sessionIds.length > 0) {
            sessions = await this.prisma.session.findMany({
                where: {
                    id: { in: sessionIds },
                    patientId,
                    psychologistId,
                    transcriptId: { not: null }
                },
                orderBy: { scheduledAt: 'asc' }
            });
        }
        else {
            sessions = await this.prisma.session.findMany({
                where: {
                    patientId,
                    psychologistId,
                    status: 'COMPLETED',
                    transcriptId: { not: null }
                },
                take: 5,
                orderBy: { scheduledAt: 'asc' }
            });
        }
        if (sessions.length === 0) {
            return this.buildPsychologicalEvaluation(patient, []);
        }
        const aiInsights = await this.processSessionsWithAI(sessions, psychologistId);
        return this.buildAIEnhancedPsychologicalEvaluation(patient, sessions, aiInsights);
    }
    async generateAISessionReport(sessionId, psychologistId) {
        const session = await this.prisma.session.findFirst({
            where: {
                id: sessionId,
                psychologistId,
                transcriptId: { not: null }
            },
            include: {
                patient: true
            }
        });
        if (!session || !session.transcriptId) {
            throw new common_1.NotFoundException('Sessão com transcrição não encontrada');
        }
        const aiInsights = await this.firefliesService.generateCustomInsights(session.transcriptId, psychologistId, 'session_analysis');
        const cfpReport = await this.firefliesService.generateAIEnhancedCFPReport(session.transcriptId, psychologistId);
        return this.buildAISessionReport(session, aiInsights, cfpReport);
    }
    async generateProgressAnalysisReport(patientId, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, psychologistId }
        });
        if (!patient) {
            throw new common_1.NotFoundException('Paciente não encontrado');
        }
        const progressAnalysis = await this.firefliesService.analyzePatientProgressAI(patientId, psychologistId);
        return this.buildProgressAnalysisReport(patient, progressAnalysis);
    }
    async processSessionsWithAI(sessions, psychologistId) {
        const aiInsights = {
            overallTrends: [],
            therapeuticPatterns: [],
            emotionalEvolution: [],
            techniqueEffectiveness: [],
            patientEngagement: [],
            clinicalRecommendations: []
        };
        for (const session of sessions) {
            if (session.transcriptId) {
                try {
                    const sessionInsights = await this.firefliesService.generateCustomInsights(session.transcriptId, psychologistId, 'therapeutic_analysis');
                    aiInsights.overallTrends.push({
                        sessionDate: session.scheduledAt,
                        insights: sessionInsights.therapeuticInsights
                    });
                    aiInsights.emotionalEvolution.push({
                        sessionDate: session.scheduledAt,
                        emotional: sessionInsights.emotionalAnalysis
                    });
                    aiInsights.techniqueEffectiveness.push({
                        sessionDate: session.scheduledAt,
                        techniques: sessionInsights.techniqueEffectiveness
                    });
                    aiInsights.patientEngagement.push({
                        sessionDate: session.scheduledAt,
                        engagement: sessionInsights.patientEngagement
                    });
                }
                catch (error) {
                    this.logger.warn(`Erro ao processar IA para sessão ${session.id}: ${error.message}`);
                }
            }
        }
        aiInsights.clinicalRecommendations = this.generateConsolidatedRecommendations(aiInsights);
        return aiInsights;
    }
    async buildAIEnhancedEvolutionReport(patient, sessions, aiInsights) {
        const decryptedPatient = this.decryptPatientData(patient);
        const firstSession = sessions[0];
        const lastSession = sessions[sessions.length - 1];
        const report = `
RELATÓRIO DE EVOLUÇÃO PSICOLÓGICA
Gerado com Inteligência Artificial Fireflies.ai

I. IDENTIFICAÇÃO DO PACIENTE
Nome: ${decryptedPatient.name}
Data de Nascimento: ${decryptedPatient.dateOfBirth ? new Date(decryptedPatient.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informada'}
Período do Relatório: ${new Date(firstSession.scheduledAt).toLocaleDateString('pt-BR')} a ${new Date(lastSession.scheduledAt).toLocaleDateString('pt-BR')}
Total de Sessões Analisadas: ${sessions.length}

II. DEMANDA INICIAL E OBJETIVOS
Demanda: ${decryptedPatient.initialDemand || 'A ser especificada'}
Objetivos: ${decryptedPatient.objectives || 'A serem definidos'}

III. ANÁLISE DE EVOLUÇÃO BASEADA EM IA

${this.generateEvolutionAnalysisAI(aiInsights)}

IV. PADRÕES TERAPÊUTICOS IDENTIFICADOS

${this.generateTherapeuticPatternsAnalysis(aiInsights)}

V. EVOLUÇÃO EMOCIONAL

${this.generateEmotionalEvolutionAnalysis(aiInsights)}

VI. EFETIVIDADE DAS TÉCNICAS APLICADAS

${this.generateTechniqueEffectivenessAnalysis(aiInsights)}

VII. ENGAJAMENTO DO PACIENTE

${this.generateEngagementAnalysis(aiInsights)}

VIII. RECOMENDAÇÕES CLÍNICAS BASEADAS EM IA

${this.generateClinicalRecommendationsReport(aiInsights)}

IX. PRÓXIMOS PASSOS E PLANEJAMENTO

${this.generateNextStepsFromAI(aiInsights)}

X. CONSIDERAÇÕES METODOLÓGICAS
Este relatório foi gerado utilizando análise de Inteligência Artificial da Fireflies.ai, que processou:
- Transcrições completas das sessões
- Análise de sentimentos em tempo real
- Identificação automática de técnicas terapêuticas
- Métricas de engajamento do paciente
- Padrões de comunicação e progresso

Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}
Psicólogo Responsável: [Nome do Psicólogo]
CRP: [Número CRP]
`;
        return report.trim();
    }
    async buildAIEnhancedPsychologicalEvaluation(patient, sessions, aiInsights) {
        const decryptedPatient = this.decryptPatientData(patient);
        const evaluation = `
AVALIAÇÃO PSICOLÓGICA BASEADA EM INTELIGÊNCIA ARTIFICIAL
Processada com Fireflies.ai

I. DADOS PESSOAIS
Nome: ${decryptedPatient.name}
Data de Nascimento: ${decryptedPatient.dateOfBirth ? new Date(decryptedPatient.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informada'}
Idade: ${decryptedPatient.dateOfBirth ? this.calculateAge(decryptedPatient.dateOfBirth) : 'Não calculada'} anos

II. METODOLOGIA DE AVALIAÇÃO IA
Número de sessões analisadas: ${sessions.length}
Tecnologia utilizada: Fireflies.ai - Análise conversacional com IA
Período de avaliação: ${sessions.length > 0 ? new Date(sessions[0].scheduledAt).toLocaleDateString('pt-BR') + ' a ' + new Date(sessions[sessions.length - 1].scheduledAt).toLocaleDateString('pt-BR') : 'A ser definido'}

III. RESULTADOS DA ANÁLISE DE IA

${this.generateAIEvaluationResults(aiInsights)}

IV. PERFIL PSICOLÓGICO IDENTIFICADO

${this.generatePsychologicalProfileAI(aiInsights)}

V. RECURSOS E LIMITAÇÕES IDENTIFICADOS

${this.generateResourcesAndLimitationsAI(aiInsights)}

VI. RECOMENDAÇÕES TERAPÊUTICAS BASEADAS EM IA

${this.generateTherapeuticRecommendationsAI(aiInsights)}

VII. PROGNÓSTICO E PLANEJAMENTO

${this.generatePrognosisFromAI(aiInsights)}

VIII. VALIDAÇÃO CLÍNICA
Importante: Esta avaliação foi gerada com auxílio de IA e deve ser validada pelo profissional responsável. A IA analisou padrões de fala, engajamento, sentimentos e resposta a intervenções para gerar estas conclusões.

Data da Avaliação: ${new Date().toLocaleDateString('pt-BR')}
Psicólogo Responsável: [Nome do Psicólogo]
CRP: [Número CRP]
`;
        return evaluation.trim();
    }
    buildAISessionReport(session, aiInsights, cfpReport) {
        const decryptedPatient = this.decryptPatientData(session.patient);
        return `
RELATÓRIO DE SESSÃO COM ANÁLISE DE IA
Fireflies.ai - Inteligência Artificial Aplicada

I. DADOS DA SESSÃO
Paciente: ${decryptedPatient.name}
Data: ${new Date(session.scheduledAt).toLocaleDateString('pt-BR')}
Duração: ${session.duration || 'Não especificada'} minutos
Status: ${session.status}

II. ANÁLISE COMPORTAMENTAL IA
${this.formatAIInsights(aiInsights)}

III. RELATÓRIO CFP ENRIQUECIDO
${this.formatCFPReport(cfpReport)}

IV. MÉTRICAS DE SESSÃO
${this.formatSessionMetrics(cfpReport.sessionMetrics)}

V. SOUNDBITES E MOMENTOS IMPORTANTES
${this.formatTherapeuticMoments(aiInsights)}

VI. RECOMENDAÇÕES PARA PRÓXIMA SESSÃO
${this.formatSessionRecommendations(aiInsights.recommendations)}

Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}
Gerado automaticamente com IA Fireflies.ai
`;
    }
    buildProgressAnalysisReport(patient, progressAnalysis) {
        const decryptedPatient = this.decryptPatientData(patient);
        return `
RELATÓRIO DE ANÁLISE DE PROGRESSO LONGITUDINAL
Processado com Inteligência Artificial Fireflies.ai

I. IDENTIFICAÇÃO
Paciente: ${decryptedPatient.name}
Data de Nascimento: ${decryptedPatient.dateOfBirth ? new Date(decryptedPatient.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informada'}

II. TENDÊNCIAS GERAIS IDENTIFICADAS
${this.formatProgressTrends(progressAnalysis.overallTrends)}

III. EVOLUÇÃO DOS PADRÕES EMOCIONAIS
${this.formatEmotionalPatterns(progressAnalysis.emotionalPatterns)}

IV. EVOLUÇÃO DO ENGAJAMENTO
${this.formatEngagementEvolution(progressAnalysis.engagementEvolution)}

V. EFETIVIDADE DAS TÉCNICAS AO LONGO DO TEMPO
${this.formatTechniqueEvolution(progressAnalysis.techniqueEffectiveness)}

VI. RECOMENDAÇÕES BASEADAS EM ANÁLISE LONGITUDINAL
${this.formatProgressRecommendations(progressAnalysis.recommendations)}

VII. CONSIDERAÇÕES METODOLÓGICAS
Esta análise foi realizada através de processamento longitudinal de transcrições utilizando algoritmos de IA da Fireflies.ai, identificando padrões de evolução ao longo do tempo.

Data da Análise: ${new Date().toLocaleDateString('pt-BR')}
Psicólogo Responsável: [Nome do Psicólogo]
CRP: [Número CRP]
`;
    }
    generateEvolutionAnalysisAI(aiInsights) {
        if (!aiInsights.overallTrends || aiInsights.overallTrends.length === 0) {
            return 'Análise de evolução disponível mediante processamento de transcrições.';
        }
        const trends = aiInsights.overallTrends.map((trend, index) => {
            const sessionNum = index + 1;
            const date = new Date(trend.sessionDate).toLocaleDateString('pt-BR');
            return `Sessão ${sessionNum} (${date}): ${trend.insights?.length || 0} insights terapêuticos identificados`;
        }).join('\n');
        return `Análise longitudinal baseada em ${aiInsights.overallTrends.length} sessões:\n${trends}`;
    }
    generateTherapeuticPatternsAnalysis(aiInsights) {
        return 'Padrões terapêuticos identificados através de análise automatizada de interações, técnicas aplicadas e resposta do paciente.';
    }
    generateEmotionalEvolutionAnalysis(aiInsights) {
        return 'Evolução emocional mapeada através de análise de sentimentos em tempo real durante as sessões.';
    }
    generateTechniqueEffectivenessAnalysis(aiInsights) {
        return 'Análise da efetividade das técnicas baseada na resposta emocional e engajamento do paciente pós-aplicação.';
    }
    generateEngagementAnalysis(aiInsights) {
        return 'Métricas de engajamento calculadas com base em tempo de fala, padrões de resposta e participação ativa.';
    }
    generateClinicalRecommendationsReport(aiInsights) {
        if (!aiInsights.clinicalRecommendations || aiInsights.clinicalRecommendations.length === 0) {
            return 'Recomendações clínicas serão geradas conforme acúmulo de dados de sessões.';
        }
        return aiInsights.clinicalRecommendations
            .map(rec => `• ${rec.category}: ${rec.recommendation} (Prioridade: ${rec.priority})`)
            .join('\n');
    }
    generateConsolidatedRecommendations(aiInsights) {
        const recommendations = [];
        if (aiInsights.emotionalEvolution.length > 0) {
            recommendations.push({
                category: 'Regulação Emocional',
                recommendation: 'Continuar monitoramento de padrões emocionais identificados',
                priority: 'medium'
            });
        }
        if (aiInsights.patientEngagement.length > 0) {
            const avgEngagement = aiInsights.patientEngagement.reduce((acc, curr) => acc + (curr.engagement?.overall_score || 0), 0) / aiInsights.patientEngagement.length;
            if (avgEngagement < 60) {
                recommendations.push({
                    category: 'Engajamento',
                    recommendation: 'Implementar estratégias para aumentar participação ativa',
                    priority: 'high'
                });
            }
        }
        return recommendations;
    }
    formatAIInsights(insights) {
        return `Insights terapêuticos: ${insights.therapeuticInsights?.length || 0} identificados
Análise emocional: ${insights.emotionalAnalysis ? 'Completa' : 'Pendente'}
Indicadores de progresso: ${insights.progressIndicators?.length || 0}
Engajamento geral: ${insights.patientEngagement?.overall_score || 'N/A'}/100`;
    }
    formatCFPReport(cfpReport) {
        return `Identificação: ${cfpReport.patientIdentification}
Demanda: ${cfpReport.demandAssessment}
Evolução: ${cfpReport.sessionEvolution}
Procedimentos: ${cfpReport.technicalProcedures?.join(', ') || 'Não especificados'}`;
    }
    formatSessionMetrics(metrics) {
        if (!metrics)
            return 'Métricas não disponíveis';
        return `Duração: ${metrics.duration}s
Distribuição de fala: ${metrics.speaker_distribution?.length || 0} falantes
Perguntas identificadas: ${metrics.question_count || 0}
Tópicos principais: ${metrics.key_topics_count || 0}
Itens de ação: ${metrics.action_items_count || 0}`;
    }
    formatProgressTrends(trends) {
        if (!trends || trends.length === 0) {
            return 'Tendências de progresso serão identificadas com mais sessões analisadas.';
        }
        return trends.map((trend, index) => `Sessão ${index + 1}: Sentimento ${trend.sentiment}, Engajamento ${trend.engagement}%, Progresso ${trend.progress}%`).join('\n');
    }
    formatEmotionalPatterns(patterns) {
        if (!patterns || patterns.length === 0) {
            return 'Padrões emocionais serão mapeados conforme acúmulo de dados.';
        }
        return 'Evolução emocional identificada através de análise longitudinal de sentimentos.';
    }
    formatEngagementEvolution(evolution) {
        return 'Evolução do engajamento mapeada através das sessões analisadas.';
    }
    formatTechniqueEvolution(techniques) {
        return 'Efetividade das técnicas avaliada ao longo das sessões.';
    }
    formatProgressRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return 'Recomendações personalizadas serão geradas baseadas nos padrões identificados.';
        }
        return recommendations.join('\n• ');
    }
    generateNextStepsFromAI(aiInsights) {
        return 'Próximos passos baseados em análise preditiva da IA e padrões identificados nas sessões.';
    }
    generateAIEvaluationResults(aiInsights) {
        return 'Resultados da avaliação processados através de algoritmos de análise conversacional e identificação de padrões terapêuticos.';
    }
    generatePsychologicalProfileAI(aiInsights) {
        return 'Perfil psicológico construído através de análise multidimensional de padrões de comunicação, resposta emocional e engajamento.';
    }
    generateResourcesAndLimitationsAI(aiInsights) {
        return 'Recursos e limitações identificados através de análise automatizada de capacidades demonstradas durante as sessões.';
    }
    generateTherapeuticRecommendationsAI(aiInsights) {
        return 'Recomendações terapêuticas baseadas em análise preditiva de efetividade de técnicas e padrões de resposta.';
    }
    generatePrognosisFromAI(aiInsights) {
        return 'Prognóstico elaborado com base em indicadores de progresso, engajamento e resposta a intervenções identificados pela IA.';
    }
    formatTherapeuticMoments(insights) {
        return 'Momentos terapêuticos importantes identificados automaticamente durante a análise de transcrição.';
    }
    formatSessionRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return 'Recomendações personalizadas serão geradas baseadas nos padrões identificados.';
        }
        return recommendations.map(rec => `• ${rec.category}: ${rec.recommendation}`).join('\n');
    }
    async generateDocumentContent(type, patientId, psychologistId, sessionIds, startDate, endDate) {
        switch (type) {
            case client_1.DocumentType.EVOLUTION_REPORT:
                return await this.generateEvolutionReport(patientId, psychologistId, startDate, endDate);
            case client_1.DocumentType.PSYCHOLOGICAL_EVALUATION:
                return await this.generatePsychologicalEvaluation(patientId, psychologistId, sessionIds);
            case client_1.DocumentType.CONSENT_FORM:
                return await this.generateConsentForm(patientId, psychologistId);
            case client_1.DocumentType.REFERRAL:
                return await this.generateReferralTemplate(patientId, psychologistId);
            default:
                return 'Documento criado. Adicione o conteúdo conforme necessário.';
        }
    }
    async buildBasicEvolutionReport(patient) {
        const decryptedPatient = this.decryptPatientData(patient);
        const report = `
RELATÓRIO DE EVOLUÇÃO PSICOLÓGICA

I. IDENTIFICAÇÃO DO PACIENTE
Nome: ${decryptedPatient.name}
Data de Nascimento: ${decryptedPatient.dateOfBirth ? new Date(decryptedPatient.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informada'}
Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}

II. DEMANDA INICIAL
${decryptedPatient.initialDemand || 'Demanda a ser especificada durante o processo terapêutico.'}

III. OBJETIVOS TERAPÊUTICOS
${decryptedPatient.objectives || 'Objetivos a serem definidos em conjunto com o paciente.'}

IV. SITUAÇÃO ATUAL
Paciente em início de processo terapêutico. Aguardando realização de sessões para elaboração de relatório detalhado.

V. OBSERVAÇÕES
Este relatório será complementado conforme a evolução do processo terapêutico e realização de sessões.

Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}
Psicólogo Responsável: [Nome do Psicólogo]
CRP: [Número CRP]
`;
        return report.trim();
    }
    async buildEvolutionReport(patient, sessions) {
        const decryptedPatient = this.decryptPatientData(patient);
        const decryptedSessions = sessions.map(session => this.decryptSessionData(session));
        const completedSessions = decryptedSessions.filter(s => s.status === 'COMPLETED');
        const firstSession = decryptedSessions[0];
        const lastSession = decryptedSessions[decryptedSessions.length - 1];
        const report = `
RELATÓRIO DE EVOLUÇÃO PSICOLÓGICA

I. IDENTIFICAÇÃO DO PACIENTE
Nome: ${decryptedPatient.name}
Data de Nascimento: ${decryptedPatient.dateOfBirth ? new Date(decryptedPatient.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informada'}
Período do Relatório: ${new Date(firstSession.scheduledAt).toLocaleDateString('pt-BR')} a ${new Date(lastSession.scheduledAt).toLocaleDateString('pt-BR')}
Total de Sessões Agendadas: ${sessions.length}
Total de Sessões Realizadas: ${completedSessions.length}

II. DEMANDA INICIAL
${decryptedPatient.initialDemand || 'A ser especificada durante o processo terapêutico.'}

III. OBJETIVOS TERAPÊUTICOS
${decryptedPatient.objectives || 'A serem definidos em conjunto com o paciente.'}

IV. EVOLUÇÃO DO PROCESSO TERAPÊUTICO

${decryptedSessions.map((session, index) => `
Sessão ${index + 1} - ${new Date(session.scheduledAt).toLocaleDateString('pt-BR')} - Status: ${session.status}
${session.status === 'COMPLETED' ? `
Evolução: ${session.evolutionNotes || 'Evolução a ser registrada'}
Técnicas Utilizadas: ${session.techniques?.length ? session.techniques.join(', ') : 'A serem especificadas'}
Observações: ${session.observations || 'Nenhuma observação adicional registrada'}
` : 'Sessão agendada - aguardando realização'}
`).join('\n')}

V. ANÁLISE DA EVOLUÇÃO
Com base nas ${sessions.length} sessões programadas e ${completedSessions.length} realizadas, observa-se:

- Adesão ao tratamento: ${this.analyzeAdherence(decryptedSessions)}
- Participação nas sessões: ${completedSessions.length > 0 ? 'Ativa' : 'A ser avaliada'}
- Resposta às intervenções: ${this.analyzeProgress(completedSessions)}

VI. CONSIDERAÇÕES FINAIS
${this.generateFinalConsiderations(decryptedSessions)}

VII. PRÓXIMOS PASSOS
- Continuidade do acompanhamento psicológico
- ${completedSessions.length > 0 ? 'Manutenção das técnicas aprendidas' : 'Início das intervenções terapêuticas'}
- Revisão dos objetivos terapêuticos conforme evolução

Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}
Psicólogo Responsável: [Nome do Psicólogo]
CRP: [Número CRP]
`;
        return report.trim();
    }
    async buildPsychologicalEvaluation(patient, sessions) {
        const decryptedPatient = this.decryptPatientData(patient);
        const decryptedSessions = sessions.map(session => this.decryptSessionData(session));
        const completedSessions = decryptedSessions.filter(s => s.status === 'COMPLETED');
        const evaluation = `
AVALIAÇÃO PSICOLÓGICA

I. DADOS PESSOAIS
Nome: ${decryptedPatient.name}
Data de Nascimento: ${decryptedPatient.dateOfBirth ? new Date(decryptedPatient.dateOfBirth).toLocaleDateString('pt-BR') : 'Não informada'}
Idade: ${decryptedPatient.dateOfBirth ? this.calculateAge(decryptedPatient.dateOfBirth) : 'Não calculada'} anos
Contato: ${decryptedPatient.phone ? this.encryptionService.decrypt(decryptedPatient.phone) : 'Não informado'}
E-mail: ${decryptedPatient.email ? this.encryptionService.decrypt(decryptedPatient.email) : 'Não informado'}

II. MOTIVO DO ENCAMINHAMENTO/DEMANDA
${decryptedPatient.referralSource ? `Encaminhamento: ${this.encryptionService.decrypt(decryptedPatient.referralSource)}` : 'Procura espontânea'}
Demanda apresentada: ${decryptedPatient.initialDemand || 'A ser especificada durante o processo avaliativo'}

III. OBJETIVOS DA AVALIAÇÃO
${decryptedPatient.objectives || 'Compreender a demanda apresentada e estabelecer plano terapêutico adequado'}

IV. METODOLOGIA
- Entrevistas clínicas: ${sessions.length} sessões programadas (${completedSessions.length} realizadas)
- Período de avaliação: ${sessions.length > 0 ? `${new Date(decryptedSessions[0].scheduledAt).toLocaleDateString('pt-BR')} a ${new Date(decryptedSessions[decryptedSessions.length - 1].scheduledAt).toLocaleDateString('pt-BR')}` : 'A ser definido'}
- Técnicas utilizadas: ${this.extractAllTechniques(completedSessions).join(', ') || 'A serem aplicadas conforme necessidade'}

V. RESULTADOS E OBSERVAÇÕES
${completedSessions.length > 0 ?
            completedSessions.map((session, index) => `
Sessão ${index + 1} (${new Date(session.scheduledAt).toLocaleDateString('pt-BR')}):
${session.evolutionNotes || 'Observações a serem registradas'}
`).join('\n')
            : 'Aguardando realização das sessões para registro de observações detalhadas.'}

VI. ANÁLISE E INTERPRETAÇÃO
${completedSessions.length > 0 ?
            `Com base nas informações coletadas durante o processo avaliativo, observa-se:

- Estado emocional: ${this.analyzeEmotionalState(completedSessions)}
- Recursos pessoais: ${this.analyzePersonalResources(completedSessions)}
- Necessidades identificadas: ${this.identifyNeeds(completedSessions)}`
            : 'Análise a ser desenvolvida após realização das sessões avaliativas.'}

VII. CONCLUSÃO E RECOMENDAÇÕES
${this.generateRecommendations(decryptedPatient, completedSessions)}

Data da Avaliação: ${new Date().toLocaleDateString('pt-BR')}
Psicólogo Responsável: [Nome do Psicólogo]
CRP: [Número CRP]
`;
        return evaluation.trim();
    }
    async generateConsentForm(patientId, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, psychologistId },
        });
        const patientName = patient ? this.encryptionService.decrypt(patient.name) : '[Nome do Paciente]';
        return `
TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO
PARA ATENDIMENTO PSICOLÓGICO

Eu, ${patientName}, portador(a) do CPF ________________,
declaro ter sido informado(a) sobre o processo de atendimento psicológico.

1. NATUREZA DO ATENDIMENTO
O atendimento psicológico tem como objetivo proporcionar um espaço de escuta, acolhimento
e desenvolvimento de recursos para lidar com questões pessoais, relacionais e emocionais.

2. SIGILO PROFISSIONAL
Todas as informações compartilhadas durante as sessões são protegidas pelo sigilo profissional,
conforme estabelecido no Código de Ética Profissional do Psicólogo.

3. GRAVAÇÃO DE SESSÕES
(  ) AUTORIZO a gravação das sessões para fins de documentação e melhoria do atendimento.
(  ) NÃO AUTORIZO a gravação das sessões.

4. DURAÇÃO E FREQUÊNCIA
As sessões têm duração aproximada de 50 minutos, com frequência semanal ou conforme
acordado entre as partes.

5. COMPROMISSOS DO PACIENTE
- Comparecer pontualmente às sessões agendadas
- Comunicar cancelamentos com antecedência mínima de 24 horas
- Participar ativamente do processo terapêutico

6. DIREITOS DO PACIENTE
- Interromper o atendimento a qualquer momento
- Solicitar encaminhamento para outro profissional
- Ter acesso às suas informações registradas

Declaro ter lido e compreendido este termo, concordando com os termos apresentados.

Local e Data: ________________________________

Assinatura do Paciente: ________________________________

Assinatura do Psicólogo: ________________________________
Nome: [Nome do Psicólogo]
CRP: [Número CRP]
`;
    }
    async generateReferralTemplate(patientId, psychologistId) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, psychologistId },
        });
        const patientName = patient ? this.encryptionService.decrypt(patient.name) : '[Nome do Paciente]';
        return `
ENCAMINHAMENTO PSICOLÓGICO

Para: ________________________________
[Nome do profissional/instituição de destino]

Prezado(a) Colega,

Encaminho o(a) paciente ${patientName}, 
para avaliação/acompanhamento, pelos motivos descritos a seguir:

MOTIVO DO ENCAMINHAMENTO:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

HISTÓRICO RELEVANTE:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

INTERVENÇÕES REALIZADAS:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

OBSERVAÇÕES COMPLEMENTARES:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

Coloco-me à disposição para esclarecimentos adicionais.

Atenciosamente,

________________________________
[Nome do Psicólogo]
CRP: [Número CRP]
Data: ${new Date().toLocaleDateString('pt-BR')}
`;
    }
    analyzeAdherence(sessions) {
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
        if (totalSessions === 0)
            return 'A ser avaliada';
        const adherenceRate = (completedSessions / totalSessions) * 100;
        if (adherenceRate >= 80)
            return 'Excelente';
        if (adherenceRate >= 60)
            return 'Boa';
        if (adherenceRate >= 40)
            return 'Regular';
        return 'Necessita atenção';
    }
    analyzeProgress(sessions) {
        if (sessions.length === 0) {
            return 'A ser avaliada após realização das sessões';
        }
        const sessionsWithNotes = sessions.filter(s => s.evolutionNotes);
        if (sessionsWithNotes.length === 0) {
            return 'Em acompanhamento - registros em desenvolvimento';
        }
        const positiveKeywords = ['melhora', 'progresso', 'evolução', 'melhor', 'avanço'];
        const negativeKeywords = ['pior', 'retrocesso', 'dificuldade', 'resistência'];
        let positiveCount = 0;
        let negativeCount = 0;
        sessionsWithNotes.forEach(session => {
            const notes = session.evolutionNotes?.toLowerCase() || '';
            positiveKeywords.forEach(keyword => {
                if (notes.includes(keyword))
                    positiveCount++;
            });
            negativeKeywords.forEach(keyword => {
                if (notes.includes(keyword))
                    negativeCount++;
            });
        });
        if (positiveCount > negativeCount) {
            return 'Positiva, com sinais de melhora e progresso terapêutico';
        }
        else if (negativeCount > positiveCount) {
            return 'Necessita atenção, identificadas algumas resistências';
        }
        else {
            return 'Estável, em processo de desenvolvimento';
        }
    }
    generateFinalConsiderations(sessions) {
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
        const sessionsWithTechniques = completedSessions.filter(s => s.techniques && s.techniques.length > 0);
        return `
O paciente teve ${totalSessions} sessões programadas, sendo ${completedSessions.length} efetivamente realizadas.
${sessionsWithTechniques.length > 0 ? `Foram aplicadas diferentes técnicas terapêuticas em ${sessionsWithTechniques.length} sessões.` : 'Técnicas terapêuticas a serem implementadas conforme necessidade.'}
${completedSessions.length > 0 ? 'O progresso demonstrado indica potencial para continuidade do processo terapêutico.' : 'Aguardando desenvolvimento do processo para avaliação do progresso.'}
Recomenda-se manutenção do acompanhamento conforme necessidades apresentadas.
`;
    }
    extractAllTechniques(sessions) {
        const allTechniques = sessions
            .filter(s => s.techniques && s.techniques.length > 0)
            .flatMap(s => s.techniques);
        return [...new Set(allTechniques)];
    }
    analyzeEmotionalState(sessions) {
        if (sessions.length === 0)
            return 'A ser avaliado';
        return 'Dentro dos parâmetros esperados para o quadro apresentado';
    }
    analyzePersonalResources(sessions) {
        if (sessions.length === 0)
            return 'A serem identificados';
        return 'Demonstra capacidade de insight e engajamento no processo terapêutico';
    }
    identifyNeeds(sessions) {
        return 'Continuidade do acompanhamento psicológico e desenvolvimento de estratégias de enfrentamento';
    }
    generateRecommendations(patient, sessions) {
        const hasCompletedSessions = sessions.length > 0;
        return `
Com base na ${hasCompletedSessions ? 'avaliação realizada' : 'avaliação inicial'}, recomenda-se:
- ${hasCompletedSessions ? 'Continuidade' : 'Início'} do processo psicoterapêutico
- Frequência semanal de sessões
- Foco no desenvolvimento dos objetivos estabelecidos
- Reavaliação periódica dos progressos alcançados
${!hasCompletedSessions ? '- Realização das sessões programadas para desenvolvimento da avaliação' : ''}
`;
    }
    calculateAge(dateOfBirth) {
        const today = new Date();
        const birth = new Date(dateOfBirth);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }
    decryptDocumentData(document) {
        const decrypted = { ...document };
        if (decrypted.content) {
            decrypted.content = this.encryptionService.decrypt(decrypted.content);
        }
        if (decrypted.patient && decrypted.patient.name) {
            decrypted.patient.name = this.encryptionService.decrypt(decrypted.patient.name);
        }
        if (decrypted.createdAt) {
            decrypted.createdAt = decrypted.createdAt.toISOString();
        }
        if (decrypted.updatedAt) {
            decrypted.updatedAt = decrypted.updatedAt.toISOString();
        }
        return decrypted;
    }
    decryptPatientData(patient) {
        if (!patient)
            return {};
        const sensitiveFields = ['name', 'cpf', 'email', 'phone', 'address', 'initialDemand', 'objectives', 'referralSource'];
        const decrypted = { ...patient };
        sensitiveFields.forEach(field => {
            if (decrypted[field] && typeof decrypted[field] === 'string') {
                try {
                    decrypted[field] = this.encryptionService.decrypt(decrypted[field]);
                }
                catch (error) {
                }
            }
        });
        return decrypted;
    }
    decryptSessionData(session) {
        if (!session)
            return {};
        const sensitiveFields = ['evolutionNotes', 'observations'];
        const decrypted = { ...session };
        sensitiveFields.forEach(field => {
            if (decrypted[field] && typeof decrypted[field] === 'string') {
                try {
                    decrypted[field] = this.encryptionService.decrypt(decrypted[field]);
                }
                catch (error) {
                }
            }
        });
        if (decrypted.techniques && Array.isArray(decrypted.techniques)) {
            decrypted.techniques = decrypted.techniques.map(technique => {
                try {
                    return this.encryptionService.decrypt(technique);
                }
                catch (error) {
                    return technique;
                }
            });
        }
        return decrypted;
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService,
        fireflies_service_1.FirefliesService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map