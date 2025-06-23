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
var FirefliesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirefliesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../database/prisma.service");
const encryption_service_1 = require("../common/services/encryption.service");
let FirefliesService = FirefliesService_1 = class FirefliesService {
    configService;
    prisma;
    encryptionService;
    logger = new common_1.Logger(FirefliesService_1.name);
    apiKey;
    apiUrl = 'https://api.fireflies.ai/graphql';
    rateLimitCount = 0;
    rateLimitReset = Date.now();
    constructor(configService, prisma, encryptionService) {
        this.configService = configService;
        this.prisma = prisma;
        this.encryptionService = encryptionService;
        this.apiKey = this.configService.get('FIREFLIES_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('FIREFLIES_API_KEY não configurada. Funcionalidades do Fireflies não estarão disponíveis.');
        }
    }
    checkRateLimit() {
        this.logger.log('🕒 [RATE_LIMIT] Verificando rate limit...');
        const now = Date.now();
        const twentyMinutes = 20 * 60 * 1000;
        if (now - this.rateLimitReset > twentyMinutes) {
            this.logger.log('🔄 [RATE_LIMIT] Reset do contador - 20 minutos se passaram');
            this.rateLimitCount = 0;
            this.rateLimitReset = now;
        }
        this.logger.log(`🕒 [RATE_LIMIT] Count atual: ${this.rateLimitCount}`);
        if (this.rateLimitCount >= 15) {
            this.logger.error('❌ [RATE_LIMIT] LIMITE EXCEDIDO!');
            throw new common_1.BadRequestException('Rate limit excedido. Tente novamente em alguns minutos.');
        }
        this.rateLimitCount++;
        this.logger.log(`✅ [RATE_LIMIT] OK - Novo count: ${this.rateLimitCount}`);
    }
    async addToLiveMeeting(addToLiveDto, psychologistId) {
        if (!this.apiKey) {
            throw new common_1.BadRequestException('Fireflies não configurado. Configure FIREFLIES_API_KEY.');
        }
        this.logger.log('🔄 [FIREFLIES] Iniciando processo de gravação...');
        this.checkRateLimit();
        const session = await this.prisma.session.findFirst({
            where: { id: addToLiveDto.sessionId, psychologistId },
            include: {
                patient: { select: { name: true, recordingConsent: true } },
                psychologist: { select: { name: true, email: true } },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Sessão não encontrada');
        }
        if (!session.patient.recordingConsent) {
            throw new common_1.BadRequestException('Paciente não autorizou gravação de sessões');
        }
        const meetingUrl = addToLiveDto.meetingUrl || session.meetingUrl;
        if (!meetingUrl) {
            throw new common_1.BadRequestException('URL da reunião não encontrada');
        }
        if (!meetingUrl.includes('meet.google.com') &&
            !meetingUrl.includes('zoom.us') &&
            !meetingUrl.includes('teams.microsoft.com')) {
            throw new common_1.BadRequestException('URL deve ser do Google Meet, Zoom ou Microsoft Teams');
        }
        const title = addToLiveDto.title || this.generateDefaultTitle(session);
        this.logger.log(`🎯 [FIREFLIES] Usando título: ${title}`);
        const mutation = `
    mutation AddToLiveMeeting(
      $meetingLink: String!
      $title: String
      $duration: Int
      $language: String
    ) {
      addToLiveMeeting(
        meeting_link: $meetingLink
        title: $title
        duration: $duration
        language: $language
      ) {
        success
      }
    }
  `;
        const variables = {
            meetingLink: meetingUrl,
            title,
            duration: session.duration || 60,
            language: 'pt'
        };
        try {
            const response = await this.makeFirefliesRequest(mutation, variables);
            if (response.addToLiveMeeting.success) {
                const meetingId = this.generateMeetingId();
                await this.prisma.session.update({
                    where: { id: addToLiveDto.sessionId },
                    data: {
                        firefliesId: meetingId,
                        hasRecording: true,
                        meetingUrl: meetingUrl,
                        transcriptId: title
                    },
                });
                this.logger.log(`✅ [FIREFLIES] Bot adicionado à sessão ${addToLiveDto.sessionId} com título: ${title}`);
                return {
                    success: true,
                    firefliesId: meetingId,
                    message: 'Bot do Fireflies adicionado à reunião com sucesso',
                    meetingUrl,
                    title,
                    expectedTranscriptTitle: title
                };
            }
            else {
                throw new common_1.BadRequestException(`Erro do Fireflies: ${JSON.stringify(response)}`);
            }
        }
        catch (error) {
            this.logger.error('❌ [FIREFLIES] Erro detalhado:', error.message);
            throw new common_1.BadRequestException('Erro ao conectar com Fireflies: ' + error.message);
        }
    }
    generateDefaultTitle(session) {
        const now = new Date();
        const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const dateStr = brasiliaTime.toISOString().split('T')[0];
        const patientName = this.encryptionService.decrypt(session.patient.name);
        const psychologistName = session.psychologist.name;
        return `${session.id}-${dateStr}-${psychologistName}`;
    }
    generateSessionTitle(sessionId, psychologistName) {
        const now = new Date();
        const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const dateStr = brasiliaTime.toISOString().split('T')[0];
        return `${sessionId}-${dateStr}-${psychologistName}`;
    }
    generateSearchPattern(sessionId, psychologistName) {
        return `${sessionId}-${psychologistName}`;
    }
    async uploadAudio(uploadAudioDto, psychologistId) {
        if (!this.apiKey) {
            throw new common_1.BadRequestException('Fireflies não configurado');
        }
        this.checkRateLimit();
        const session = await this.prisma.session.findFirst({
            where: { id: uploadAudioDto.sessionId, psychologistId },
            include: {
                patient: { select: { name: true, recordingConsent: true } },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Sessão não encontrada');
        }
        if (!session.patient.recordingConsent) {
            throw new common_1.BadRequestException('Paciente não autorizou gravação de sessões');
        }
        const title = uploadAudioDto.title ||
            `Sessão ${this.encryptionService.decrypt(session.patient.name)} - ${new Date(session.scheduledAt).toLocaleDateString('pt-BR')}`;
        const mutation = `
      mutation UploadAudio($input: UploadAudioInput!) {
        uploadAudio(input: $input) {
          success
          message
          transcript_id
        }
      }
    `;
        const variables = {
            input: {
                url: uploadAudioDto.audioUrl,
                title,
                language: 'pt'
            },
        };
        try {
            const response = await this.makeFirefliesRequest(mutation, variables);
            if (response.uploadAudio.success) {
                await this.prisma.session.update({
                    where: { id: uploadAudioDto.sessionId },
                    data: { transcriptId: response.uploadAudio.transcript_id, hasRecording: true },
                });
                return {
                    success: true,
                    transcriptId: response.uploadAudio.transcript_id,
                    message: 'Áudio enviado para transcrição com sucesso',
                };
            }
            else {
                throw new common_1.BadRequestException(`Erro do Fireflies: ${response.uploadAudio.message}`);
            }
        }
        catch (error) {
            this.logger.error('❌ [FIREFLIES] Erro ao enviar áudio:', error);
            throw new common_1.BadRequestException('Erro ao enviar áudio: ' + error.message);
        }
    }
    async getTranscript(transcriptId, psychologistId) {
        if (!this.apiKey) {
            throw new common_1.BadRequestException('Fireflies não configurado');
        }
        this.checkRateLimit();
        const query = `
      query Transcript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          title
          id
          sentences {
            index
            speaker_name
            speaker_id
            text
            raw_text
            start_time
            end_time
          }
          summary {
            keywords
            action_items
            outline
            overview
          }
          date
          duration
          organizer_email
          participants
          transcript_url
        }
      }
    `;
        try {
            const response = await this.makeFirefliesRequest(query, { transcriptId });
            if (response.transcript) {
                const transcript = response.transcript;
                const session = await this.prisma.session.findFirst({
                    where: {
                        OR: [
                            { transcriptId, psychologistId },
                            { firefliesId: transcriptId, psychologistId }
                        ]
                    }
                });
                if (!session) {
                    this.logger.warn(`[ACCESS] Transcrição ${transcriptId} acessada sem sessão vinculada pelo psicólogo ${psychologistId}`);
                }
                await this.linkTranscriptToSessionIfNeeded(transcriptId, psychologistId, transcript);
                return {
                    id: transcript.id,
                    title: transcript.title,
                    transcript: this.extractFullTranscript(transcript.sentences),
                    summary: transcript.summary?.overview,
                    sentences: transcript.sentences,
                    keyPoints: transcript.summary?.keywords || [],
                    actionItems: transcript.summary?.action_items || [],
                    duration: transcript.duration,
                    date: transcript.date,
                    firefliesUrl: transcript.transcript_url,
                    organizer: transcript.organizer_email,
                    participants: transcript.participants || [],
                    speakers: this.extractSpeakers(transcript.sentences),
                    outline: transcript.summary?.outline
                };
            }
            else {
                throw new common_1.NotFoundException('Transcrição não encontrada no Fireflies');
            }
        }
        catch (error) {
            this.logger.error('❌ [FIREFLIES] Erro ao buscar transcrição:', error);
            if (error.message.includes('does not exist or you do not have access')) {
                throw new common_1.NotFoundException('Transcrição não encontrada ou você não tem permissão para acessá-la');
            }
            throw new common_1.BadRequestException('Erro ao buscar transcrição: ' + error.message);
        }
    }
    async formatTranscriptForCFP(transcriptId, psychologistId) {
        const transcript = await this.getTranscript(transcriptId, psychologistId);
        return {
            patientIdentification: this.extractPatientInfo(transcript),
            demandAssessment: this.extractDemandAssessment(transcript),
            sessionEvolution: this.extractSessionEvolution(transcript),
            technicalProcedures: this.extractTechnicalProcedures(transcript),
            generalObservations: this.extractGeneralObservations(transcript),
            nextSteps: this.extractNextSteps(transcript),
            fullTranscript: transcript.transcript,
        };
    }
    async handleWebhook(payload) {
        this.logger.log('📧 [WEBHOOK] Webhook recebido do Fireflies:', payload);
        try {
            const { event, transcript_id, meeting_title, status } = payload;
            switch (event) {
                case 'transcript_ready':
                    this.logger.log(`✅ [WEBHOOK] Transcrição pronta para: ${meeting_title}`);
                    await this.processTranscriptReady(transcript_id);
                    break;
                case 'recording_started':
                    this.logger.log(`🎥 [WEBHOOK] Gravação iniciada: ${meeting_title}`);
                    break;
                case 'recording_ended':
                    this.logger.log(`🛑 [WEBHOOK] Gravação finalizada: ${meeting_title}`);
                    break;
                default:
                    this.logger.log(`📧 [WEBHOOK] Evento recebido: ${event}`);
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error('❌ [WEBHOOK] Erro ao processar webhook:', error);
            return { success: false, error: error.message };
        }
    }
    async getAIEnhancedTranscript(transcriptId, psychologistId) {
        if (!this.apiKey) {
            throw new common_1.BadRequestException('Fireflies não configurado');
        }
        this.checkRateLimit();
        const query = `
      query GetAIEnhancedTranscript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          title
          date
          duration
          organizer_email
          participants
          transcript_url
          
          # Transcrição completa
          sentences {
            index
            speaker_name
            speaker_id
            text
            raw_text
            start_time
            end_time
            ai_filters {
              task
              pricing
              metric
              question
              sentiment
            }
          }
          
          # Resumos IA avançados
          summary {
            keywords
            action_items
            outline
            overview
            bullets
            gist
            shorthand_bullet
            overview_paragraph
            brief_overview
            topics_discussed
            short_transcript_chapters
            custom_topic_sections
          }
          
          # Analytics de conversa
          analytics {
            sentiments
            speakers {
              name
              talk_time
              longest_monologue
              words_per_minute
              patience
              sentiment
            }
            questions_asked
            interruptions
            topics_discovered
          }
          
          # URL para áudio/vídeo (se disponível)
          audio_url
          video_url
        }
      }
    `;
        try {
            const response = await this.makeFirefliesRequest(query, { transcriptId });
            if (response.transcript) {
                const transcript = response.transcript;
                return this.processForPsychotherapy(transcript);
            }
            else {
                throw new common_1.NotFoundException('Transcrição não encontrada no Fireflies');
            }
        }
        catch (error) {
            this.logger.error('❌ [AI_ENHANCED] Erro ao buscar transcrição IA:', error);
            throw new common_1.BadRequestException('Erro ao buscar transcrição IA: ' + error.message);
        }
    }
    async generateCustomInsights(transcriptId, psychologistId, promptType) {
        const transcript = await this.getAIEnhancedTranscript(transcriptId, psychologistId);
        const insights = {
            therapeuticInsights: this.extractTherapeuticInsights(transcript),
            emotionalAnalysis: this.analyzeEmotionalPatterns(transcript),
            progressIndicators: this.identifyProgressIndicators(transcript),
            techniqueEffectiveness: this.evaluateTechniqueEffectiveness(transcript),
            patientEngagement: this.analyzePatientEngagement(transcript),
            sessionOutcomes: this.identifySessionOutcomes(transcript),
            recommendations: this.generateTherapeuticRecommendations(transcript)
        };
        return insights;
    }
    async generateAIEnhancedCFPReport(transcriptId, psychologistId) {
        const enhancedTranscript = await this.getAIEnhancedTranscript(transcriptId, psychologistId);
        return {
            patientIdentification: this.extractPatientIdentificationAI(enhancedTranscript),
            demandAssessment: this.extractDemandAssessmentAI(enhancedTranscript),
            sessionEvolution: this.generateSessionEvolutionAI(enhancedTranscript),
            technicalProcedures: this.identifyTechnicalProceduresAI(enhancedTranscript),
            generalObservations: this.generateGeneralObservationsAI(enhancedTranscript),
            nextSteps: this.generateNextStepsAI(enhancedTranscript),
            aiAnalytics: {
                sentimentAnalysis: enhancedTranscript.analytics?.sentiments,
                speakerAnalysis: enhancedTranscript.analytics?.speakers,
                keyTopics: enhancedTranscript.summary?.topics_discussed,
                questionPatterns: this.analyzeQuestionPatterns(enhancedTranscript),
                therapeuticAlliance: this.assessTherapeuticAlliance(enhancedTranscript)
            },
            sessionMetrics: this.calculateSessionMetrics(enhancedTranscript),
            fullTranscript: enhancedTranscript.transcript || this.extractFullTranscript(enhancedTranscript.sentences)
        };
    }
    async analyzePatientProgressAI(patientId, psychologistId) {
        const sessions = await this.prisma.session.findMany({
            where: {
                patientId,
                psychologistId,
                transcriptId: { not: null }
            },
            orderBy: { scheduledAt: 'asc' }
        });
        const progressAnalysis = {
            overallTrends: [],
            emotionalPatterns: [],
            engagementEvolution: [],
            techniqueEffectiveness: [],
            recommendations: []
        };
        for (const session of sessions) {
            try {
                const enhancedTranscript = await this.getAIEnhancedTranscript(session.transcriptId, psychologistId);
                progressAnalysis.overallTrends.push({
                    sessionDate: session.scheduledAt,
                    sentiment: this.calculateOverallSentiment(enhancedTranscript),
                    engagement: this.calculateEngagementScore(enhancedTranscript),
                    progress: this.calculateProgressScore(enhancedTranscript)
                });
                progressAnalysis.emotionalPatterns.push({
                    sessionDate: session.scheduledAt,
                    emotions: this.extractEmotionalPatterns(enhancedTranscript)
                });
            }
            catch (error) {
                this.logger.warn(`Falha ao analisar sessão ${session.id}: ${error.message}`);
            }
        }
        progressAnalysis.recommendations = this.generateProgressRecommendations(progressAnalysis);
        return progressAnalysis;
    }
    async generateTherapeuticSoundbites(transcriptId, psychologistId) {
        const enhancedTranscript = await this.getAIEnhancedTranscript(transcriptId, psychologistId);
        const soundbites = [];
        const breakthroughMoments = this.identifyBreakthroughMoments(enhancedTranscript);
        const resistanceMoments = this.identifyResistanceMoments(enhancedTranscript);
        const techniqueApplications = this.identifyTechniqueApplications(enhancedTranscript);
        const patientInsights = this.identifyPatientInsights(enhancedTranscript);
        return {
            breakthroughMoments,
            resistanceMoments,
            techniqueApplications,
            patientInsights,
            audioUrl: enhancedTranscript.audio_url,
            videoUrl: enhancedTranscript.video_url
        };
    }
    async testConnection() {
        if (!this.apiKey) {
            return {
                success: false,
                message: 'FIREFLIES_API_KEY não configurada',
                configured: false
            };
        }
        try {
            const query = `
        query {
          user {
            user_id
            email
          }
        }
      `;
            const result = await this.makeFirefliesRequest(query, {});
            return {
                success: true,
                message: 'Conexão com Fireflies OK',
                configured: true,
                user: result.user
            };
        }
        catch (error) {
            this.logger.error('❌ [TEST_CONNECTION] Erro:', error.message);
            return {
                success: false,
                message: `Erro na conexão: ${error.message}`,
                configured: true,
                apiKeyValid: false
            };
        }
    }
    async listTranscripts(limit = 20, mine = true, psychologistId) {
        if (!this.apiKey) {
            throw new common_1.BadRequestException('Fireflies não configurado');
        }
        this.checkRateLimit();
        this.logger.log('📋 [LIST_TRANSCRIPTS] Buscando transcrições...');
        const query = `
      query Transcripts($userId: String) {
        transcripts(user_id: $userId) {
          title
          id
          date
          duration
          organizer_email
          participants
          transcript_url
        }
      }
    `;
        let userId = null;
        if (mine && psychologistId) {
            try {
                const userQuery = `query { user { user_id email } }`;
                const userResult = await this.makeFirefliesRequest(userQuery, {});
                userId = userResult.user.user_id;
            }
            catch (error) {
                this.logger.warn('Não foi possível obter user_id, listando todas');
            }
        }
        try {
            const response = await this.makeFirefliesRequest(query, { userId });
            const transcripts = response.transcripts || [];
            const limitedTranscripts = limit ? transcripts.slice(0, limit) : transcripts;
            this.logger.log(`📋 [LIST_TRANSCRIPTS] Encontradas ${limitedTranscripts.length} transcrições`);
            return {
                success: true,
                count: limitedTranscripts.length,
                data: limitedTranscripts,
                total: transcripts.length
            };
        }
        catch (error) {
            this.logger.error('❌ [LIST_TRANSCRIPTS] Erro:', error.message);
            throw new common_1.BadRequestException('Erro ao listar transcrições: ' + error.message);
        }
    }
    async checkTranscriptStatus(transcriptId, psychologistId) {
        if (!this.apiKey) {
            throw new common_1.BadRequestException('Fireflies não configurado');
        }
        this.checkRateLimit();
        const query = `
      query Transcript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          title
          date
          duration
          organizer_email
          participants
        }
      }
    `;
        try {
            const response = await this.makeFirefliesRequest(query, { transcriptId });
            if (!response.transcript) {
                throw new common_1.NotFoundException('Transcrição não encontrada');
            }
            const transcript = response.transcript;
            return {
                id: transcript.id,
                title: transcript.title,
                status: 'processed',
                isReady: true,
                isProcessing: false,
                hasFailed: false,
                duration: transcript.duration,
                organizer: transcript.organizer_email,
                participants: transcript.participants || [],
                privacy: 'unknown',
                canAccess: true,
                accessReason: 'Acesso confirmado via API'
            };
        }
        catch (error) {
            this.logger.error('❌ [CHECK_STATUS] Erro:', error.message);
            if (error.message.includes('does not exist or you do not have access')) {
                return {
                    id: transcriptId,
                    title: 'Desconhecido',
                    status: 'access_denied',
                    isReady: false,
                    isProcessing: false,
                    hasFailed: false,
                    duration: 0,
                    organizer: 'unknown',
                    participants: [],
                    privacy: 'unknown',
                    canAccess: false,
                    accessReason: 'Sem acesso ou transcrição não existe',
                    error: 'Sem acesso ou transcrição não existe'
                };
            }
            throw new common_1.BadRequestException(`Erro ao verificar status: ${error.message}`);
        }
    }
    async syncWithFireflies(psychologistId) {
        try {
            this.logger.log('🔄 [SYNC] Iniciando sincronização...');
            const firefliesResponse = await this.listTranscripts(50, true, psychologistId);
            const firefliesTranscripts = firefliesResponse.data;
            this.logger.log(`📋 [SYNC] Encontradas ${firefliesTranscripts.length} transcrições no Fireflies`);
            const sessionsWithoutTranscript = await this.prisma.session.findMany({
                where: {
                    psychologistId,
                    transcriptId: null,
                    status: 'COMPLETED',
                },
                include: {
                    patient: { select: { name: true } }
                }
            });
            this.logger.log(`📊 [SYNC] Encontradas ${sessionsWithoutTranscript.length} sessões sem transcrição`);
            const matches = [];
            const errors = [];
            for (const session of sessionsWithoutTranscript) {
                try {
                    const matchingTranscript = this.findMatchingTranscript(session, firefliesTranscripts);
                    if (matchingTranscript) {
                        await this.prisma.session.update({
                            where: { id: session.id },
                            data: { transcriptId: matchingTranscript.id }
                        });
                        matches.push({
                            sessionId: session.id,
                            transcriptId: matchingTranscript.id,
                            title: matchingTranscript.title,
                            sessionDate: session.scheduledAt,
                            transcriptDate: matchingTranscript.date
                        });
                        this.logger.log(`✅ [SYNC] Match: Sessão ${session.id} ↔ Transcript ${matchingTranscript.id}`);
                    }
                }
                catch (error) {
                    errors.push({
                        sessionId: session.id,
                        error: error.message
                    });
                    this.logger.error(`❌ [SYNC] Erro na sessão ${session.id}:`, error.message);
                }
            }
            return {
                success: true,
                message: `Sincronização concluída: ${matches.length} matches, ${errors.length} erros`,
                totalFirefliesTranscripts: firefliesTranscripts.length,
                totalSessionsWithoutTranscript: sessionsWithoutTranscript.length,
                matched: matches.length,
                errors: errors.length,
                details: { matches, errors }
            };
        }
        catch (error) {
            this.logger.error('❌ [SYNC] Erro geral:', error.message);
            throw new common_1.BadRequestException(`Erro na sincronização: ${error.message}`);
        }
    }
    async linkSessionToTranscript(sessionId, transcriptId, psychologistId) {
        try {
            const session = await this.prisma.session.findFirst({
                where: { id: sessionId, psychologistId }
            });
            if (!session) {
                throw new common_1.NotFoundException('Sessão não encontrada');
            }
            const transcriptStatus = await this.checkTranscriptStatus(transcriptId, psychologistId);
            if (!transcriptStatus.canAccess) {
                throw new common_1.BadRequestException(`Acesso negado à transcrição: ${transcriptStatus.error || transcriptStatus.accessReason}`);
            }
            await this.prisma.session.update({
                where: { id: sessionId },
                data: { transcriptId }
            });
            this.logger.log(`✅ [LINK] Sessão ${sessionId} vinculada com transcript ${transcriptId}`);
            return {
                success: true,
                message: 'Vinculação realizada com sucesso',
                session: {
                    id: sessionId,
                    transcriptId,
                    transcriptTitle: transcriptStatus.title,
                    transcriptStatus: transcriptStatus.status,
                    isReady: transcriptStatus.isReady,
                    accessLevel: transcriptStatus.accessReason
                }
            };
        }
        catch (error) {
            this.logger.error('❌ [LINK] Erro:', error.message);
            throw new common_1.BadRequestException(`Erro na vinculação: ${error.message}`);
        }
    }
    async checkConfiguration(psychologistId) {
        const checks = {
            apiKeyConfigured: !!this.apiKey,
            apiKeyValid: false,
            canListTranscripts: false,
            totalTranscripts: 0,
            sessionsWithoutTranscript: 0,
            sessionsWithTranscript: 0,
            rateLimitStatus: `${this.rateLimitCount}/15 requests utilizadas`
        };
        try {
            const connectionTest = await this.testConnection();
            checks.apiKeyValid = connectionTest.success;
            if (connectionTest.success) {
                const transcripts = await this.listTranscripts(5, true, psychologistId);
                checks.canListTranscripts = transcripts.success;
                checks.totalTranscripts = transcripts.count;
                const [withTranscript, withoutTranscript] = await Promise.all([
                    this.prisma.session.count({
                        where: { psychologistId, transcriptId: { not: null } }
                    }),
                    this.prisma.session.count({
                        where: { psychologistId, transcriptId: null, status: 'COMPLETED' }
                    })
                ]);
                checks.sessionsWithTranscript = withTranscript;
                checks.sessionsWithoutTranscript = withoutTranscript;
            }
        }
        catch (error) {
            this.logger.error('❌ [CONFIG_CHECK] Erro:', error.message);
        }
        const isHealthy = checks.apiKeyConfigured && checks.apiKeyValid && checks.canListTranscripts;
        return {
            status: isHealthy ? 'healthy' : 'issues_detected',
            checks,
            recommendations: this.getConfigurationRecommendations(checks),
            summary: {
                configured: checks.apiKeyConfigured,
                working: checks.apiKeyValid,
                transcriptsAvailable: checks.totalTranscripts,
                needsSync: checks.sessionsWithoutTranscript > 0
            }
        };
    }
    async getTranscripts(psychologistId, limit = 10) {
        return this.listTranscripts(limit, true, psychologistId);
    }
    processForPsychotherapy(transcript) {
        return {
            ...transcript,
            therapeuticElements: this.extractTherapeuticElements(transcript),
            communicationPatterns: this.analyzeCommunicationPatterns(transcript),
            emotionalJourney: this.mapEmotionalJourney(transcript)
        };
    }
    extractTherapeuticInsights(transcript) {
        const insights = [];
        if (transcript.sentences) {
            transcript.sentences.forEach(sentence => {
                if (sentence.ai_filters) {
                    if (sentence.ai_filters.question && sentence.speaker_name !== 'Paciente') {
                        insights.push({
                            type: 'therapeutic_question',
                            content: sentence.text,
                            timestamp: sentence.start_time,
                            speaker: sentence.speaker_name
                        });
                    }
                    if (sentence.ai_filters.task) {
                        insights.push({
                            type: 'therapeutic_task',
                            content: sentence.text,
                            timestamp: sentence.start_time,
                            speaker: sentence.speaker_name
                        });
                    }
                }
            });
        }
        return insights;
    }
    analyzeEmotionalPatterns(transcript) {
        const patterns = {
            dominant_emotions: [],
            emotional_transitions: [],
            intensity_peaks: []
        };
        if (transcript.analytics?.sentiments) {
            patterns.dominant_emotions = transcript.analytics.sentiments;
        }
        return patterns;
    }
    identifyProgressIndicators(transcript) {
        const indicators = [];
        const progressKeywords = [
            'melhora', 'progresso', 'evolução', 'crescimento', 'aprendizado',
            'insight', 'compreensão', 'mudança', 'desenvolvimento', 'avanço'
        ];
        if (transcript.sentences) {
            transcript.sentences.forEach(sentence => {
                const text = sentence.text.toLowerCase();
                progressKeywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        indicators.push({
                            keyword,
                            context: sentence.text,
                            timestamp: sentence.start_time,
                            speaker: sentence.speaker_name
                        });
                    }
                });
            });
        }
        return indicators;
    }
    evaluateTechniqueEffectiveness(transcript) {
        const techniques = [];
        const therapeuticTechniques = [
            'respiração', 'mindfulness', 'reestruturação cognitiva',
            'exposição', 'relaxamento', 'visualização', 'grounding',
            'técnica da cadeira vazia', 'role playing', 'psicoeducação'
        ];
        if (transcript.sentences) {
            transcript.sentences.forEach(sentence => {
                const text = sentence.text.toLowerCase();
                therapeuticTechniques.forEach(technique => {
                    if (text.includes(technique)) {
                        techniques.push({
                            technique,
                            context: sentence.text,
                            timestamp: sentence.start_time,
                            speaker: sentence.speaker_name,
                            effectiveness: this.assessTechniqueEffectiveness(sentence, transcript)
                        });
                    }
                });
            });
        }
        return techniques;
    }
    analyzePatientEngagement(transcript) {
        const engagement = {
            overall_score: 0,
            indicators: [],
            concerns: []
        };
        if (transcript.analytics?.speakers) {
            const patientSpeaker = transcript.analytics.speakers.find(s => s.name === 'Paciente' || s.talk_time > 0);
            if (patientSpeaker) {
                const talkTimeRatio = patientSpeaker.talk_time / transcript.duration;
                const wordsPerMinute = patientSpeaker.words_per_minute || 0;
                engagement.overall_score = Math.min(100, (talkTimeRatio * 40) +
                    (wordsPerMinute > 100 ? 30 : wordsPerMinute / 100 * 30) +
                    (patientSpeaker.sentiment === 'positive' ? 30 :
                        patientSpeaker.sentiment === 'neutral' ? 15 : 0));
                engagement.indicators.push({
                    metric: 'talk_time_ratio',
                    value: talkTimeRatio,
                    interpretation: talkTimeRatio > 0.4 ? 'Boa participação' : 'Participação limitada'
                });
            }
        }
        return engagement;
    }
    identifySessionOutcomes(transcript) {
        const outcomes = [];
        if (transcript.summary?.action_items) {
            transcript.summary.action_items.forEach(item => {
                outcomes.push({
                    type: 'action_item',
                    content: item,
                    category: this.categorizeActionItem(item)
                });
            });
        }
        if (transcript.summary?.keywords) {
            outcomes.push({
                type: 'key_insights',
                content: transcript.summary.keywords,
                relevance: 'high'
            });
        }
        return outcomes;
    }
    generateTherapeuticRecommendations(transcript) {
        const recommendations = [];
        if (transcript.analytics?.sentiments) {
            if (transcript.analytics.sentiments.includes('negative')) {
                recommendations.push({
                    category: 'emotional_support',
                    recommendation: 'Considerar técnicas de regulação emocional',
                    priority: 'high'
                });
            }
        }
        const engagement = this.analyzePatientEngagement(transcript);
        if (engagement.overall_score < 50) {
            recommendations.push({
                category: 'engagement',
                recommendation: 'Explorar estratégias para aumentar participação do paciente',
                priority: 'medium'
            });
        }
        return recommendations;
    }
    extractPatientIdentificationAI(transcript) {
        return `Paciente identificado através de análise de voz e contexto da sessão. Duração: ${transcript.duration}s.`;
    }
    extractDemandAssessmentAI(transcript) {
        const topics = transcript.summary?.topics_discussed || [];
        const overview = transcript.summary?.overview || '';
        return `Demanda principal identificada: ${topics.join(', ')}. ${overview}`;
    }
    generateSessionEvolutionAI(transcript) {
        const sentiments = transcript.analytics?.sentiments || [];
        const engagement = this.analyzePatientEngagement(transcript);
        return `Evolução da sessão: Score de engajamento ${engagement.overall_score}/100. ` +
            `Padrões emocionais identificados: ${sentiments.join(', ')}.`;
    }
    identifyTechnicalProceduresAI(transcript) {
        const techniques = this.evaluateTechniqueEffectiveness(transcript);
        return techniques.map(t => `${t.technique} (aplicada aos ${Math.round(t.timestamp / 60)}min)`);
    }
    generateGeneralObservationsAI(transcript) {
        const bullets = transcript.summary?.bullets || [];
        const overview = transcript.summary?.overview_paragraph || '';
        return overview + '\n\nObservações específicas:\n' + bullets.join('\n');
    }
    generateNextStepsAI(transcript) {
        const actionItems = transcript.summary?.action_items || [];
        const recommendations = this.generateTherapeuticRecommendations(transcript);
        return 'Próximos passos identificados:\n' +
            actionItems.join('\n') + '\n\n' +
            'Recomendações terapêuticas:\n' +
            recommendations.map(r => r.recommendation).join('\n');
    }
    analyzeQuestionPatterns(transcript) {
        return {
            totalQuestions: transcript.analytics?.questions_asked || 0,
            questionTypes: ['open-ended', 'closed'],
            therapeuticValue: 'high'
        };
    }
    assessTherapeuticAlliance(transcript) {
        return {
            strength: 'good',
            indicators: ['active listening', 'empathy', 'collaboration'],
            score: 75
        };
    }
    async linkTranscriptToSessionIfNeeded(transcriptId, psychologistId, transcript) {
        const existingSession = await this.prisma.session.findFirst({
            where: { transcriptId, psychologistId }
        });
        if (existingSession)
            return;
        const transcriptDate = new Date(transcript.date);
        const session = await this.prisma.session.findFirst({
            where: {
                psychologistId,
                transcriptId: null,
                scheduledAt: {
                    gte: new Date(transcriptDate.getTime() - 3 * 60 * 60 * 1000),
                    lte: new Date(transcriptDate.getTime() + 3 * 60 * 60 * 1000),
                }
            }
        });
        if (session) {
            await this.prisma.session.update({
                where: { id: session.id },
                data: { transcriptId }
            });
            this.logger.log(`🔗 [AUTO_LINK] Sessão ${session.id} vinculada automaticamente`);
        }
    }
    extractFullTranscript(sentences) {
        if (!sentences || sentences.length === 0)
            return '';
        return sentences
            .map(sentence => `${sentence.speaker_name}: ${sentence.text}`)
            .join('\n');
    }
    extractSpeakers(sentences) {
        if (!sentences || sentences.length === 0)
            return [];
        const speakerStats = {};
        sentences.forEach(sentence => {
            const name = sentence.speaker_name;
            if (!speakerStats[name]) {
                speakerStats[name] = {
                    name,
                    talkTime: 0,
                    wordCount: 0
                };
            }
            speakerStats[name].talkTime += (sentence.end_time - sentence.start_time);
            speakerStats[name].wordCount += sentence.text.split(' ').length;
        });
        return Object.values(speakerStats);
    }
    async processTranscriptReady(transcriptId) {
        const session = await this.prisma.session.findFirst({
            where: {
                OR: [
                    { transcriptId: transcriptId },
                    { firefliesId: transcriptId },
                ],
            },
            include: {
                patient: true,
                psychologist: true,
            },
        });
        if (session) {
            try {
                const transcript = await this.getTranscript(transcriptId, session.psychologistId);
                const cfpFormatted = await this.formatTranscriptForCFP(transcriptId, session.psychologistId);
                await this.prisma.session.update({
                    where: { id: session.id },
                    data: {
                        transcriptId: transcriptId,
                        evolutionNotes: this.encryptionService.encrypt(cfpFormatted.sessionEvolution),
                        techniques: cfpFormatted.technicalProcedures.map(tech => this.encryptionService.encrypt(tech)),
                        observations: this.encryptionService.encrypt(cfpFormatted.generalObservations),
                    },
                });
                this.logger.log(`✅ [WEBHOOK] Transcrição processada para sessão ${session.id}`);
            }
            catch (error) {
                this.logger.error(`❌ [WEBHOOK] Erro ao processar transcrição para sessão ${session.id}:`, error);
            }
        }
    }
    findMatchingTranscript(session, transcripts) {
        const sessionDate = new Date(session.scheduledAt);
        return transcripts.find(transcript => {
            const transcriptDate = new Date(transcript.date);
            const diffHours = Math.abs(sessionDate.getTime() - transcriptDate.getTime()) / (1000 * 60 * 60);
            return diffHours <= 3;
        });
    }
    getConfigurationRecommendations(checks) {
        const recommendations = [];
        if (!checks.apiKeyConfigured) {
            recommendations.push('Configure FIREFLIES_API_KEY no arquivo .env');
        }
        if (!checks.apiKeyValid) {
            recommendations.push('Verifique se a API Key está correta no dashboard Fireflies');
            recommendations.push('Confirme que a API Key tem permissões adequadas');
        }
        if (!checks.canListTranscripts) {
            recommendations.push('Verifique conectividade com api.fireflies.ai');
        }
        if (checks.totalTranscripts === 0) {
            recommendations.push('Adicione fred@fireflies.ai às suas reuniões');
            recommendations.push('Teste gravar uma reunião manualmente');
        }
        if (checks.sessionsWithoutTranscript > 0) {
            recommendations.push(`Execute POST /fireflies/sync para vincular ${checks.sessionsWithoutTranscript} sessões`);
        }
        return recommendations;
    }
    extractPatientInfo(transcript) {
        const lines = transcript.transcript.split('\n').slice(0, 5);
        return lines.join(' ').substring(0, 200) + '...';
    }
    extractDemandAssessment(transcript) {
        const keywords = ['problema', 'dificuldade', 'sintoma', 'queixa', 'demanda'];
        const sentences = transcript.sentences || [];
        const relevantSentences = sentences.filter(sentence => keywords.some(keyword => sentence.text.toLowerCase().includes(keyword)));
        return relevantSentences.slice(0, 3)
            .map(s => s.text)
            .join(' ');
    }
    extractSessionEvolution(transcript) {
        const keywords = ['melhora', 'progresso', 'evolução', 'desenvolvimento', 'mudança'];
        const sentences = transcript.sentences || [];
        const relevantSentences = sentences.filter(sentence => keywords.some(keyword => sentence.text.toLowerCase().includes(keyword)));
        return relevantSentences.slice(0, 3)
            .map(s => s.text)
            .join(' ');
    }
    extractTechnicalProcedures(transcript) {
        const techniques = [
            'terapia cognitivo-comportamental',
            'tcc',
            'respiração',
            'mindfulness',
            'reestruturação cognitiva',
            'exposição',
            'dessensibilização',
            'psicanálise',
            'gestalt',
            'humanista',
            'respiração 4-7-8',
            'relaxamento',
        ];
        const foundTechniques = techniques.filter(technique => transcript.transcript.toLowerCase().includes(technique));
        return foundTechniques.length > 0 ? foundTechniques : ['Técnicas não identificadas automaticamente'];
    }
    extractGeneralObservations(transcript) {
        if (transcript.summary) {
            return transcript.summary;
        }
        const sentences = transcript.transcript.split('.').slice(0, 3);
        return sentences.join('.') + '.';
    }
    extractNextSteps(transcript) {
        const keywords = ['próxima', 'próximo', 'tarefa', 'exercício', 'casa', 'agenda'];
        const sentences = transcript.sentences || [];
        const relevantSentences = sentences.filter(sentence => keywords.some(keyword => sentence.text.toLowerCase().includes(keyword)));
        return relevantSentences.length > 0
            ? relevantSentences.map(s => s.text).join(' ')
            : undefined;
    }
    generateMeetingId() {
        return `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    extractTherapeuticElements(transcript) {
        return {
            techniques: this.evaluateTechniqueEffectiveness(transcript),
            insights: this.extractTherapeuticInsights(transcript),
            progress: this.identifyProgressIndicators(transcript)
        };
    }
    analyzeCommunicationPatterns(transcript) {
        return {
            questionPatterns: this.analyzeQuestionPatterns(transcript),
            speakerDynamics: transcript.analytics?.speakers || [],
            engagement: this.analyzePatientEngagement(transcript)
        };
    }
    mapEmotionalJourney(transcript) {
        return {
            patterns: this.analyzeEmotionalPatterns(transcript),
            journey: this.extractEmotionalPatterns(transcript),
            sentiment: transcript.analytics?.sentiments || []
        };
    }
    calculateSessionMetrics(transcript) {
        return {
            duration: transcript.duration,
            speaker_distribution: transcript.analytics?.speakers || [],
            question_count: transcript.analytics?.questions_asked || 0,
            sentiment_distribution: transcript.analytics?.sentiments || [],
            key_topics_count: transcript.summary?.topics_discussed?.length || 0,
            action_items_count: transcript.summary?.action_items?.length || 0
        };
    }
    assessTechniqueEffectiveness(sentence, transcript) {
        return 'efetiva';
    }
    categorizeActionItem(item) {
        if (item.toLowerCase().includes('exercício'))
            return 'homework';
        if (item.toLowerCase().includes('próxima'))
            return 'scheduling';
        return 'therapeutic_task';
    }
    calculateOverallSentiment(transcript) {
        return transcript.analytics?.sentiments?.[0] || 'neutral';
    }
    calculateEngagementScore(transcript) {
        const engagement = this.analyzePatientEngagement(transcript);
        return engagement.overall_score;
    }
    calculateProgressScore(transcript) {
        const indicators = this.identifyProgressIndicators(transcript);
        return Math.min(100, indicators.length * 20);
    }
    extractEmotionalPatterns(transcript) {
        return transcript.analytics?.sentiments || [];
    }
    generateProgressRecommendations(progressAnalysis) {
        return [
            'Manter foco nas técnicas que demonstraram efetividade',
            'Considerar ajustes baseados nos padrões emocionais identificados'
        ];
    }
    identifyBreakthroughMoments(transcript) {
        return [];
    }
    identifyResistanceMoments(transcript) {
        return [];
    }
    identifyTechniqueApplications(transcript) {
        return this.evaluateTechniqueEffectiveness(transcript);
    }
    identifyPatientInsights(transcript) {
        return [];
    }
    async makeFirefliesRequest(query, variables) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };
        const data = { query, variables };
        this.logger.log('📤 [FIREFLIES] Enviando request para:', this.apiUrl);
        this.logger.log('📤 [FIREFLIES] Query:', query.trim());
        this.logger.log('📤 [FIREFLIES] Variables:', JSON.stringify(variables, null, 2));
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
        this.logger.log('📥 [FIREFLIES] Status da resposta:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error('❌ [FIREFLIES] Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const responseData = await response.json();
        this.logger.log('📥 [FIREFLIES] Response data:', JSON.stringify(responseData, null, 2));
        if (responseData.errors) {
            this.logger.error('❌ [FIREFLIES] GraphQL Errors:', responseData.errors);
            throw new Error(`GraphQL Error: ${responseData.errors.map(e => e.message).join(', ')}`);
        }
        return responseData.data;
    }
    async searchTranscriptsByTitle(titlePattern, psychologistId) {
        if (!this.apiKey) {
            throw new common_1.BadRequestException('Fireflies não configurado');
        }
        this.checkRateLimit();
        this.logger.log(`🔍 [SEARCH] Buscando transcrições com padrão: ${titlePattern}`);
        try {
            const transcripts = await this.listTranscripts(100, true, psychologistId);
            if (!transcripts.success || !transcripts.data) {
                return { found: false, matches: [], total: 0 };
            }
            const matches = transcripts.data.filter(transcript => transcript.title && transcript.title.includes(titlePattern));
            this.logger.log(`🔍 [SEARCH] Encontradas ${matches.length} transcrições para padrão "${titlePattern}"`);
            if (matches.length > 0) {
                await this.autoLinkTranscripts(matches, titlePattern, psychologistId);
            }
            return {
                found: matches.length > 0,
                matches,
                total: matches.length,
                searchPattern: titlePattern
            };
        }
        catch (error) {
            this.logger.error('❌ [SEARCH] Erro na busca:', error.message);
            throw new common_1.BadRequestException(`Erro na busca: ${error.message}`);
        }
    }
    async autoLinkTranscripts(matches, titlePattern, psychologistId) {
        try {
            const sessionIdMatch = titlePattern.match(/^([^-]+)-/);
            if (!sessionIdMatch) {
                this.logger.warn(`[AUTO_LINK] Padrão de título inválido: ${titlePattern}`);
                return;
            }
            const sessionId = sessionIdMatch[1];
            const session = await this.prisma.session.findFirst({
                where: {
                    id: sessionId,
                    psychologistId,
                    transcriptId: null
                }
            });
            if (!session) {
                this.logger.warn(`[AUTO_LINK] Sessão ${sessionId} não encontrada ou já tem transcript`);
                return;
            }
            const bestMatch = matches[0];
            await this.prisma.session.update({
                where: { id: sessionId },
                data: {
                    transcriptId: bestMatch.id,
                    hasRecording: true
                }
            });
            this.logger.log(`✅ [AUTO_LINK] Sessão ${sessionId} vinculada automaticamente com transcript ${bestMatch.id}`);
        }
        catch (error) {
            this.logger.error('❌ [AUTO_LINK] Erro:', error.message);
        }
    }
    async autoDiscoverTranscripts(psychologistId) {
        try {
            this.logger.log('🔍 [AUTO_DISCOVER] Iniciando descoberta automática...');
            const sessionsWithoutTranscript = await this.prisma.session.findMany({
                where: {
                    psychologistId,
                    transcriptId: null,
                    shouldRecord: true,
                    status: { in: ['COMPLETED', 'IN_PROGRESS'] }
                },
                include: {
                    psychologist: { select: { name: true } }
                },
                take: 10
            });
            const discoveries = [];
            for (const session of sessionsWithoutTranscript) {
                const titlePattern = this.generateTitlePattern(session.id, session.psychologist.name);
                try {
                    const searchResult = await this.searchTranscriptsByTitle(titlePattern, psychologistId);
                    if (searchResult.found && searchResult.matches.length > 0) {
                        discoveries.push({
                            sessionId: session.id,
                            transcriptId: searchResult.matches[0].id,
                            title: searchResult.matches[0].title,
                            matchCount: searchResult.matches.length
                        });
                    }
                }
                catch (error) {
                    this.logger.warn(`[AUTO_DISCOVER] Erro ao buscar sessão ${session.id}: ${error.message}`);
                }
            }
            this.logger.log(`🔍 [AUTO_DISCOVER] Descobertas ${discoveries.length} transcrições`);
            return {
                success: true,
                discovered: discoveries.length,
                discoveries,
                total_sessions_checked: sessionsWithoutTranscript.length
            };
        }
        catch (error) {
            this.logger.error('❌ [AUTO_DISCOVER] Erro:', error.message);
            throw new common_1.BadRequestException(`Erro na descoberta automática: ${error.message}`);
        }
    }
    generateTitlePattern(sessionId, userName) {
        return `${sessionId}-${userName}`;
    }
    async handleWebhookV2(payload) {
        this.logger.log('📧 [WEBHOOK_V2] Webhook recebido:', JSON.stringify(payload, null, 2));
        try {
            const { event, transcript_id, meeting_title, status, meeting_id } = payload;
            switch (event) {
                case 'transcript_ready':
                    await this.processTranscriptReadyV2(transcript_id, meeting_title);
                    break;
                case 'recording_started':
                    await this.processRecordingStarted(meeting_id, meeting_title);
                    break;
                case 'recording_ended':
                    await this.processRecordingEnded(meeting_id, meeting_title);
                    break;
                default:
                    this.logger.log(`📧 [WEBHOOK_V2] Evento não processado: ${event}`);
            }
            return { success: true, event, processed: true };
        }
        catch (error) {
            this.logger.error('❌ [WEBHOOK_V2] Erro:', error.message);
            return { success: false, error: error.message, event: payload.event };
        }
    }
    async processTranscriptReadyV2(transcriptId, meetingTitle) {
        this.logger.log(`✅ [TRANSCRIPT_READY] Processando transcript ${transcriptId} com título: ${meetingTitle}`);
        try {
            let session = await this.prisma.session.findFirst({
                where: {
                    OR: [
                        { transcriptId: transcriptId },
                        { firefliesId: transcriptId }
                    ]
                },
                include: {
                    psychologist: { select: { id: true, name: true } }
                }
            });
            if (!session && meetingTitle) {
                const sessionIdMatch = meetingTitle.match(/^([^-]+)-/);
                if (sessionIdMatch) {
                    const sessionId = sessionIdMatch[1];
                    session = await this.prisma.session.findFirst({
                        where: { id: sessionId },
                        include: {
                            psychologist: { select: { id: true, name: true } }
                        }
                    });
                    if (session) {
                        await this.prisma.session.update({
                            where: { id: session.id },
                            data: {
                                transcriptId: transcriptId,
                                hasRecording: true
                            }
                        });
                        this.logger.log(`🔗 [TRANSCRIPT_READY] Sessão ${session.id} vinculada ao transcript ${transcriptId}`);
                    }
                }
            }
            if (session) {
                try {
                    const transcript = await this.getTranscript(transcriptId, session.psychologist.id);
                    await this.prisma.session.update({
                        where: { id: session.id },
                        data: {
                            transcriptId: transcriptId,
                            hasRecording: true,
                            observations: session.observations || this.encryptionService.encrypt(`Transcrição processada automaticamente. Duração: ${transcript.duration}s. ` +
                                `Participantes: ${transcript.participants.join(', ')}.`)
                        }
                    });
                    this.logger.log(`✅ [TRANSCRIPT_READY] Sessão ${session.id} atualizada com insights`);
                }
                catch (error) {
                    this.logger.error(`❌ [TRANSCRIPT_READY] Erro ao processar insights: ${error.message}`);
                }
            }
            else {
                this.logger.warn(`⚠️ [TRANSCRIPT_READY] Sessão não encontrada para transcript ${transcriptId}`);
            }
        }
        catch (error) {
            this.logger.error(`❌ [TRANSCRIPT_READY] Erro: ${error.message}`);
        }
    }
    async processRecordingStarted(meetingId, meetingTitle) {
        this.logger.log(`🎥 [RECORDING_STARTED] Meeting ${meetingId}: ${meetingTitle}`);
        if (meetingTitle) {
            const sessionIdMatch = meetingTitle.match(/^([^-]+)-/);
            if (sessionIdMatch) {
                const sessionId = sessionIdMatch[1];
                await this.prisma.session.updateMany({
                    where: { id: sessionId },
                    data: {
                        firefliesId: meetingId,
                        hasRecording: true
                    }
                });
                this.logger.log(`🎥 [RECORDING_STARTED] Sessão ${sessionId} atualizada com firefliesId ${meetingId}`);
            }
        }
    }
    async processRecordingEnded(meetingId, meetingTitle) {
        this.logger.log(`🛑 [RECORDING_ENDED] Meeting ${meetingId}: ${meetingTitle}`);
    }
};
exports.FirefliesService = FirefliesService;
exports.FirefliesService = FirefliesService = FirefliesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        encryption_service_1.EncryptionService])
], FirefliesService);
//# sourceMappingURL=fireflies.service.js.map