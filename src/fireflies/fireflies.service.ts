import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { AddToLiveMeetingDto, UploadAudioDto, CFPFormattedTranscriptDto } from './dto/fireflies.dto';

@Injectable()
export class FirefliesService {
  private readonly logger = new Logger(FirefliesService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.fireflies.ai/graphql';
  private rateLimitCount = 0;
  private rateLimitReset = Date.now();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {
    this.apiKey = this.configService.get<string>('FIREFLIES_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('FIREFLIES_API_KEY não configurada. Funcionalidades do Fireflies não estarão disponíveis.');
    }
  }

  // RATE LIMIT MELHORADO
  private checkRateLimit() {
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
      throw new BadRequestException('Rate limit excedido. Tente novamente em alguns minutos.');
    }

    this.rateLimitCount++;
    this.logger.log(`✅ [RATE_LIMIT] OK - Novo count: ${this.rateLimitCount}`);
  }

  // ========== MÉTODOS ORIGINAIS MANTIDOS ==========

// Substituir o método addToLiveMeeting existente no FirefliesService

// Substituir o método addToLiveMeeting existente no FirefliesService

async addToLiveMeeting(addToLiveDto: AddToLiveMeetingDto, psychologistId: string) {
  if (!this.apiKey) {
    throw new BadRequestException('Fireflies não configurado. Configure FIREFLIES_API_KEY.');
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
    throw new NotFoundException('Sessão não encontrada');
  }

  if (!session.patient.recordingConsent) {
    throw new BadRequestException('Paciente não autorizou gravação de sessões');
  }

  const meetingUrl = addToLiveDto.meetingUrl || session.meetingUrl;
  if (!meetingUrl) {
    throw new BadRequestException('URL da reunião não encontrada');
  }

  if (!meetingUrl.includes('meet.google.com') && 
      !meetingUrl.includes('zoom.us') && 
      !meetingUrl.includes('teams.microsoft.com')) {
    throw new BadRequestException('URL deve ser do Google Meet, Zoom ou Microsoft Teams');
  }

  // USAR O TÍTULO FORMATADO ENVIADO PELO FRONTEND
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
      // Gerar ID único para rastreamento
      const meetingId = this.generateMeetingId();
      
      // Atualizar sessão com informações da gravação
      await this.prisma.session.update({
        where: { id: addToLiveDto.sessionId },
        data: { 
          firefliesId: meetingId, 
          hasRecording: true,
          meetingUrl: meetingUrl, // Garantir que a URL está salva
          transcriptId: title // SALVAR O TÍTULO NO transcriptId para busca posterior
        },
      });

      this.logger.log(`✅ [FIREFLIES] Bot adicionado à sessão ${addToLiveDto.sessionId} com título: ${title}`);
      
      return {
        success: true,
        firefliesId: meetingId,
        message: 'Bot do Fireflies adicionado à reunião com sucesso',
        meetingUrl,
        title,
        expectedTranscriptTitle: title // Retornar para referência no frontend
      };
    } else {
      throw new BadRequestException(`Erro do Fireflies: ${JSON.stringify(response)}`);
    }
  } catch (error) {
    this.logger.error('❌ [FIREFLIES] Erro detalhado:', error.message);
    throw new BadRequestException('Erro ao conectar com Fireflies: ' + error.message);
  }
}

/**
 * Gerar título padrão se não fornecido
 */
private generateDefaultTitle(session: any): string {
  const now = new Date();
  // Ajustar para GMT-3 (Brasília)
  const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  const dateStr = brasiliaTime.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const patientName = this.encryptionService.decrypt(session.patient.name);
  const psychologistName = session.psychologist.name;
  
  return `${session.id}-${dateStr}-${psychologistName}`;
}

  /**
   * Gerar título formatado para sessão
   */
  private generateSessionTitle(sessionId: string, psychologistName: string): string {
    const now = new Date();
    // Ajustar para GMT-3 (Brasília)
    const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const dateStr = brasiliaTime.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return `${sessionId}-${dateStr}-${psychologistName}`;
  }

  /**
   * Gerar padrão de busca mais flexível (para buscar transcrições)
   */
  private generateSearchPattern(sessionId: string, psychologistName: string): string {
    // Para busca, usar apenas sessionId-psychologistName para ser mais flexível com datas
    return `${sessionId}-${psychologistName}`;
  }

  async uploadAudio(uploadAudioDto: UploadAudioDto, psychologistId: string) {
    if (!this.apiKey) {
      throw new BadRequestException('Fireflies não configurado');
    }

    this.checkRateLimit();

    const session = await this.prisma.session.findFirst({
      where: { id: uploadAudioDto.sessionId, psychologistId },
      include: {
        patient: { select: { name: true, recordingConsent: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (!session.patient.recordingConsent) {
      throw new BadRequestException('Paciente não autorizou gravação de sessões');
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
      } else {
        throw new BadRequestException(`Erro do Fireflies: ${response.uploadAudio.message}`);
      }
    } catch (error) {
      this.logger.error('❌ [FIREFLIES] Erro ao enviar áudio:', error);
      throw new BadRequestException('Erro ao enviar áudio: ' + error.message);
    }
  }

  // MÉTODO CORRIGIDO - Usando query que funciona
  async getTranscript(transcriptId: string, psychologistId: string) {
    if (!this.apiKey) {
      throw new BadRequestException('Fireflies não configurado');
    }

    this.checkRateLimit();

    // Query exata baseada no seu exemplo que funciona
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
        
        // Verificar se psicólogo tem acesso através da sessão vinculada
        const session = await this.prisma.session.findFirst({
          where: {
            OR: [
              { transcriptId, psychologistId },
              { firefliesId: transcriptId, psychologistId }
            ]
          }
        });

        // Se não encontrou sessão vinculada, permitir acesso mas avisar
        if (!session) {
          this.logger.warn(`[ACCESS] Transcrição ${transcriptId} acessada sem sessão vinculada pelo psicólogo ${psychologistId}`);
        }

        // Vincular automaticamente se possível
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
      } else {
        throw new NotFoundException('Transcrição não encontrada no Fireflies');
      }
    } catch (error) {
      this.logger.error('❌ [FIREFLIES] Erro ao buscar transcrição:', error);
      
      if (error.message.includes('does not exist or you do not have access')) {
        throw new NotFoundException(
          'Transcrição não encontrada ou você não tem permissão para acessá-la'
        );
      }
      
      throw new BadRequestException('Erro ao buscar transcrição: ' + error.message);
    }
  }

  async formatTranscriptForCFP(transcriptId: string, psychologistId: string): Promise<CFPFormattedTranscriptDto> {
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

  async handleWebhook(payload: any) {
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
    } catch (error) {
      this.logger.error('❌ [WEBHOOK] Erro ao processar webhook:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== MÉTODOS DE IA AVANÇADA ==========

  /**
   * Obter resumo IA completo com insights personalizados
   */
  async getAIEnhancedTranscript(transcriptId: string, psychologistId: string) {
    if (!this.apiKey) {
      throw new BadRequestException('Fireflies não configurado');
    }

    this.checkRateLimit();

    // Query expandida para capturar todos os recursos de IA
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
        
        // Processar e estruturar dados para psicoterapia
        return this.processForPsychotherapy(transcript);
      } else {
        throw new NotFoundException('Transcrição não encontrada no Fireflies');
      }
    } catch (error) {
      this.logger.error('❌ [AI_ENHANCED] Erro ao buscar transcrição IA:', error);
      throw new BadRequestException('Erro ao buscar transcrição IA: ' + error.message);
    }
  }

  /**
   * Gerar insights personalizados usando prompts customizados
   */
  async generateCustomInsights(transcriptId: string, psychologistId: string, promptType: string) {
    const transcript = await this.getAIEnhancedTranscript(transcriptId, psychologistId);
    
    const insights = {
      // Análises específicas para psicoterapia
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

  /**
   * Criar relatório CFP inteligente baseado em IA
   */
  async generateAIEnhancedCFPReport(transcriptId: string, psychologistId: string): Promise<any> {
    const enhancedTranscript = await this.getAIEnhancedTranscript(transcriptId, psychologistId);
    
    return {
      // Identificação do paciente (extraída automaticamente)
      patientIdentification: this.extractPatientIdentificationAI(enhancedTranscript),
      
      // Demanda avaliada pela IA
      demandAssessment: this.extractDemandAssessmentAI(enhancedTranscript),
      
      // Evolução da sessão baseada em sentimentos e engajamento
      sessionEvolution: this.generateSessionEvolutionAI(enhancedTranscript),
      
      // Procedimentos técnicos identificados automaticamente
      technicalProcedures: this.identifyTechnicalProceduresAI(enhancedTranscript),
      
      // Observações gerais enriquecidas com analytics
      generalObservations: this.generateGeneralObservationsAI(enhancedTranscript),
      
      // Próximos passos sugeridos pela IA
      nextSteps: this.generateNextStepsAI(enhancedTranscript),
      
      // Análises exclusivas da IA
      aiAnalytics: {
        sentimentAnalysis: enhancedTranscript.analytics?.sentiments,
        speakerAnalysis: enhancedTranscript.analytics?.speakers,
        keyTopics: enhancedTranscript.summary?.topics_discussed,
        questionPatterns: this.analyzeQuestionPatterns(enhancedTranscript),
        therapeuticAlliance: this.assessTherapeuticAlliance(enhancedTranscript)
      },
      
      // Métricas de qualidade da sessão
      sessionMetrics: this.calculateSessionMetrics(enhancedTranscript),
      
      fullTranscript: enhancedTranscript.transcript || this.extractFullTranscript(enhancedTranscript.sentences)
    };
  }

  /**
   * Buscar padrões em múltiplas sessões usando IA
   */
  async analyzePatientProgressAI(patientId: string, psychologistId: string) {
    // Buscar todas as sessões com transcrições do paciente
    const sessions = await this.prisma.session.findMany({
      where: {
        patientId,
        psychologistId,
        transcriptId: { not: null }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    const progressAnalysis: {
      overallTrends: Array<{sessionDate: Date; sentiment: string; engagement: number; progress: number;}>;
      emotionalPatterns: Array<{sessionDate: Date; emotions: string[]}>;
      engagementEvolution: any[];
      techniqueEffectiveness: any[];
      recommendations: string[];
    } = {
      overallTrends: [],
      emotionalPatterns: [],
      engagementEvolution: [],
      techniqueEffectiveness: [],
      recommendations: []
    };

    for (const session of sessions) {
      try {
        const enhancedTranscript = await this.getAIEnhancedTranscript(session.transcriptId!, psychologistId);
        
        // Analisar evolução ao longo do tempo
        progressAnalysis.overallTrends.push({
          sessionDate: session.scheduledAt,
          sentiment: this.calculateOverallSentiment(enhancedTranscript),
          engagement: this.calculateEngagementScore(enhancedTranscript),
          progress: this.calculateProgressScore(enhancedTranscript)
        });

        // Padrões emocionais
        progressAnalysis.emotionalPatterns.push({
          sessionDate: session.scheduledAt,
          emotions: this.extractEmotionalPatterns(enhancedTranscript)
        });

      } catch (error) {
        this.logger.warn(`Falha ao analisar sessão ${session.id}: ${error.message}`);
      }
    }

    // Gerar insights consolidados
    progressAnalysis.recommendations = this.generateProgressRecommendations(progressAnalysis);

    return progressAnalysis;
  }

  /**
   * Criar soundbites automáticos de momentos importantes
   */
  async generateTherapeuticSoundbites(transcriptId: string, psychologistId: string) {
    const enhancedTranscript = await this.getAIEnhancedTranscript(transcriptId, psychologistId);
    
    const soundbites = [];
    
    // Identificar momentos de breakthrough
    const breakthroughMoments = this.identifyBreakthroughMoments(enhancedTranscript);
    
    // Identificar momentos de resistência
    const resistanceMoments = this.identifyResistanceMoments(enhancedTranscript);
    
    // Identificar aplicação de técnicas
    const techniqueApplications = this.identifyTechniqueApplications(enhancedTranscript);
    
    // Identificar insights do paciente
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

  // ========== NOVOS MÉTODOS CORRIGIDOS ==========

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
    } catch (error) {
      this.logger.error('❌ [TEST_CONNECTION] Erro:', error.message);
      return {
        success: false,
        message: `Erro na conexão: ${error.message}`,
        configured: true,
        apiKeyValid: false
      };
    }
  }

  // Query corrigida baseada no seu exemplo
  async listTranscripts(limit: number = 20, mine: boolean = true, psychologistId?: string) {
    if (!this.apiKey) {
      throw new BadRequestException('Fireflies não configurado');
    }

    this.checkRateLimit();

    this.logger.log('📋 [LIST_TRANSCRIPTS] Buscando transcrições...');

    // Query baseada no seu exemplo que funciona
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

    // Buscar user_id se necessário
    let userId = null;
    if (mine && psychologistId) {
      try {
        const userQuery = `query { user { user_id email } }`;
        const userResult = await this.makeFirefliesRequest(userQuery, {});
        userId = userResult.user.user_id;
      } catch (error) {
        this.logger.warn('Não foi possível obter user_id, listando todas');
      }
    }

    try {
      const response = await this.makeFirefliesRequest(query, { userId });
      
      const transcripts = response.transcripts || [];
      
      // Limitar resultados se necessário
      const limitedTranscripts = limit ? transcripts.slice(0, limit) : transcripts;

      this.logger.log(`📋 [LIST_TRANSCRIPTS] Encontradas ${limitedTranscripts.length} transcrições`);
      
      return {
        success: true,
        count: limitedTranscripts.length,
        data: limitedTranscripts,
        total: transcripts.length
      };
    } catch (error) {
      this.logger.error('❌ [LIST_TRANSCRIPTS] Erro:', error.message);
      throw new BadRequestException('Erro ao listar transcrições: ' + error.message);
    }
  }

  async checkTranscriptStatus(transcriptId: string, psychologistId: string) {
    if (!this.apiKey) {
      throw new BadRequestException('Fireflies não configurado');
    }

    this.checkRateLimit();

    // Query simples para verificar status
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
        throw new NotFoundException('Transcrição não encontrada');
      }

      const transcript = response.transcript;

      return {
        id: transcript.id,
        title: transcript.title,
        status: 'processed', // Se conseguiu buscar, está processada
        isReady: true,
        isProcessing: false,
        hasFailed: false,
        duration: transcript.duration,
        organizer: transcript.organizer_email,
        participants: transcript.participants || [],
        privacy: 'unknown', // Valor padrão já que não temos essa info na query simples
        canAccess: true, // Se chegou até aqui, tem acesso
        accessReason: 'Acesso confirmado via API'
      };
    } catch (error) {
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
      
      throw new BadRequestException(`Erro ao verificar status: ${error.message}`);
    }
  }

  async syncWithFireflies(psychologistId: string) {
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

      const matches: {
        sessionId: string;
        transcriptId: string;
        title: string;
        sessionDate: Date;
        transcriptDate: string;
      }[] = [];
      const errors: { sessionId: string; error: string }[] = [];

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
        } catch (error) {
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
    } catch (error) {
      this.logger.error('❌ [SYNC] Erro geral:', error.message);
      throw new BadRequestException(`Erro na sincronização: ${error.message}`);
    }
  }

  async linkSessionToTranscript(sessionId: string, transcriptId: string, psychologistId: string) {
    try {
      const session = await this.prisma.session.findFirst({
        where: { id: sessionId, psychologistId }
      });

      if (!session) {
        throw new NotFoundException('Sessão não encontrada');
      }

      // Verificar se a transcrição existe e é acessível
      const transcriptStatus = await this.checkTranscriptStatus(transcriptId, psychologistId);

      if (!transcriptStatus.canAccess) {
        throw new BadRequestException(
          `Acesso negado à transcrição: ${transcriptStatus.error || transcriptStatus.accessReason}`
        );
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
    } catch (error) {
      this.logger.error('❌ [LINK] Erro:', error.message);
      throw new BadRequestException(`Erro na vinculação: ${error.message}`);
    }
  }

  async checkConfiguration(psychologistId: string) {
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
    } catch (error) {
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

  // Método original corrigido
  async getTranscripts(psychologistId?: string, limit: number = 10) {
    return this.listTranscripts(limit, true, psychologistId);
  }

  // ========== MÉTODOS AUXILIARES DE IA ==========

  private processForPsychotherapy(transcript: any) {
    return {
      ...transcript,
      // Adicionar processamento específico para psicoterapia
      therapeuticElements: this.extractTherapeuticElements(transcript),
      communicationPatterns: this.analyzeCommunicationPatterns(transcript),
      emotionalJourney: this.mapEmotionalJourney(transcript)
    };
  }

  private extractTherapeuticInsights(transcript: any) {
    type Insight = {
      type: string;
      content: string;
      timestamp: number;
      speaker: string;
    };
    const insights: Insight[] = [];
    
    // Analisar sentenças com filtros de IA
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

  private analyzeEmotionalPatterns(transcript: any) {
    const patterns = {
      dominant_emotions: [],
      emotional_transitions: [],
      intensity_peaks: []
    };
    
    if (transcript.analytics?.sentiments) {
      // Processar análise de sentimentos
      patterns.dominant_emotions = transcript.analytics.sentiments;
    }
    
    return patterns;
  }

  private identifyProgressIndicators(transcript: any) {
    type Indicator = { 
      keyword: string; 
      context: string; 
      timestamp: number; 
      speaker: string;
    };
    const indicators: Indicator[] = [];
    
    // Palavras-chave que indicam progresso
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

  private evaluateTechniqueEffectiveness(transcript: any) {
    type Technique = { 
      technique: string; 
      context: string; 
      timestamp: number; 
      speaker: string; 
      effectiveness: string;
    };
    const techniques: Technique[] = [];
    
    // Técnicas terapêuticas comuns
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

  private analyzePatientEngagement(transcript: any) {
      type Indicator = { metric: string; value: number; interpretation: string };
      const engagement = {
        overall_score: 0,
        indicators: [] as Indicator[],
        concerns: [] as any[]
      };
      
      if (transcript.analytics?.speakers) {
        const patientSpeaker = transcript.analytics.speakers.find(s => 
          s.name === 'Paciente' || s.talk_time > 0
        );
        
        if (patientSpeaker) {
          // Calcular score de engajamento baseado em múltiplos fatores
          const talkTimeRatio = patientSpeaker.talk_time / transcript.duration;
          const wordsPerMinute = patientSpeaker.words_per_minute || 0;
          
          engagement.overall_score = Math.min(100, 
            (talkTimeRatio * 40) + 
            (wordsPerMinute > 100 ? 30 : wordsPerMinute / 100 * 30) +
            (patientSpeaker.sentiment === 'positive' ? 30 : 
             patientSpeaker.sentiment === 'neutral' ? 15 : 0)
          );
          
          engagement.indicators.push({
            metric: 'talk_time_ratio',
            value: talkTimeRatio,
            interpretation: talkTimeRatio > 0.4 ? 'Boa participação' : 'Participação limitada'
          });
        }
      }
      
      return engagement;
    }

  private identifySessionOutcomes(transcript: any) {
    type Outcome =
      | { type: 'action_item'; content: any; category: string }
      | { type: 'key_insights'; content: any; relevance: string };
    const outcomes: Outcome[] = [];
    
    // Analisar action items e insights do resumo
    if (transcript.summary?.action_items) {
      transcript.summary.action_items.forEach(item => {
        outcomes.push({
          type: 'action_item',
          content: item,
          category: this.categorizeActionItem(item)
        });
      });
    }
    
    // Analisar insights chave
    if (transcript.summary?.keywords) {
      outcomes.push({
        type: 'key_insights',
        content: transcript.summary.keywords,
        relevance: 'high'
      });
    }
    
    return outcomes;
  }

  private generateTherapeuticRecommendations(transcript: any) {
    type Recommendation = { category: string; recommendation: string; priority: string };
    const recommendations: Recommendation[] = [];
    
    // Baseado na análise de sentimentos
    if (transcript.analytics?.sentiments) {
      if (transcript.analytics.sentiments.includes('negative')) {
        recommendations.push({
          category: 'emotional_support',
          recommendation: 'Considerar técnicas de regulação emocional',
          priority: 'high'
        });
      }
    }
    
    // Baseado no engajamento
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

  // Métodos auxiliares adicionais para IA...
  private extractPatientIdentificationAI(transcript: any): string {
    return `Paciente identificado através de análise de voz e contexto da sessão. Duração: ${transcript.duration}s.`;
  }

  private extractDemandAssessmentAI(transcript: any): string {
    const topics = transcript.summary?.topics_discussed || [];
    const overview = transcript.summary?.overview || '';
    
    return `Demanda principal identificada: ${topics.join(', ')}. ${overview}`;
  }

  private generateSessionEvolutionAI(transcript: any): string {
    const sentiments = transcript.analytics?.sentiments || [];
    const engagement = this.analyzePatientEngagement(transcript);
    
    return `Evolução da sessão: Score de engajamento ${engagement.overall_score}/100. ` +
           `Padrões emocionais identificados: ${sentiments.join(', ')}.`;
  }

  private identifyTechnicalProceduresAI(transcript: any): string[] {
    const techniques = this.evaluateTechniqueEffectiveness(transcript);
    return techniques.map(t => `${t.technique} (aplicada aos ${Math.round(t.timestamp/60)}min)`);
  }

  private generateGeneralObservationsAI(transcript: any): string {
    const bullets = transcript.summary?.bullets || [];
    const overview = transcript.summary?.overview_paragraph || '';
    
    return overview + '\n\nObservações específicas:\n' + bullets.join('\n');
  }

  private generateNextStepsAI(transcript: any): string {
    const actionItems = transcript.summary?.action_items || [];
    const recommendations = this.generateTherapeuticRecommendations(transcript);
    
    return 'Próximos passos identificados:\n' + 
           actionItems.join('\n') + '\n\n' +
           'Recomendações terapêuticas:\n' +
           recommendations.map(r => r.recommendation).join('\n');
  }

  private analyzeQuestionPatterns(transcript: any) {
    // Implementação simplificada
    return {
      totalQuestions: transcript.analytics?.questions_asked || 0,
      questionTypes: ['open-ended', 'closed'],
      therapeuticValue: 'high'
    };
  }

  private assessTherapeuticAlliance(transcript: any) {
    // Implementação simplificada
    return {
      strength: 'good',
      indicators: ['active listening', 'empathy', 'collaboration'],
      score: 75
    };
  }

  // ========== MÉTODOS AUXILIARES PRIVADOS ==========

  private async linkTranscriptToSessionIfNeeded(transcriptId: string, psychologistId: string, transcript: any) {
    const existingSession = await this.prisma.session.findFirst({
      where: { transcriptId, psychologistId }
    });
    
    if (existingSession) return;

    const transcriptDate = new Date(transcript.date);
    const session = await this.prisma.session.findFirst({
      where: {
        psychologistId,
        transcriptId: null,
        scheduledAt: {
          gte: new Date(transcriptDate.getTime() - 3 * 60 * 60 * 1000), // -3h
          lte: new Date(transcriptDate.getTime() + 3 * 60 * 60 * 1000), // +3h
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

  private extractFullTranscript(sentences: any[]): string {
    if (!sentences || sentences.length === 0) return '';
    
    return sentences
      .map(sentence => `${sentence.speaker_name}: ${sentence.text}`)
      .join('\n');
  }

  private extractSpeakers(sentences: any[]): any[] {
    if (!sentences || sentences.length === 0) return [];

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

  private async processTranscriptReady(transcriptId: string) {
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
            techniques: cfpFormatted.technicalProcedures.map(tech => 
              this.encryptionService.encrypt(tech)
            ),
            observations: this.encryptionService.encrypt(cfpFormatted.generalObservations),
          },
        });

        this.logger.log(`✅ [WEBHOOK] Transcrição processada para sessão ${session.id}`);
      } catch (error) {
        this.logger.error(`❌ [WEBHOOK] Erro ao processar transcrição para sessão ${session.id}:`, error);
      }
    }
  }

  private findMatchingTranscript(session: any, transcripts: any[]): any | null {
    const sessionDate = new Date(session.scheduledAt);
    
    return transcripts.find(transcript => {
      const transcriptDate = new Date(transcript.date);
      const diffHours = Math.abs(sessionDate.getTime() - transcriptDate.getTime()) / (1000 * 60 * 60);
      return diffHours <= 3;
    });
  }

  private getConfigurationRecommendations(checks: any): string[] {
    const recommendations: string[] = [];
    
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

  // Métodos auxiliares para extração de informações (mantidos iguais)
  private extractPatientInfo(transcript: any): string {
    const lines = transcript.transcript.split('\n').slice(0, 5);
    return lines.join(' ').substring(0, 200) + '...';
  }

  private extractDemandAssessment(transcript: any): string {
    const keywords = ['problema', 'dificuldade', 'sintoma', 'queixa', 'demanda'];
    const sentences = transcript.sentences || [];
    
    const relevantSentences = sentences.filter(sentence => 
      keywords.some(keyword => 
        sentence.text.toLowerCase().includes(keyword)
      )
    );

    return relevantSentences.slice(0, 3)
      .map(s => s.text)
      .join(' ');
  }

  private extractSessionEvolution(transcript: any): string {
    const keywords = ['melhora', 'progresso', 'evolução', 'desenvolvimento', 'mudança'];
    const sentences = transcript.sentences || [];
    
    const relevantSentences = sentences.filter(sentence => 
      keywords.some(keyword => 
        sentence.text.toLowerCase().includes(keyword)
      )
    );

    return relevantSentences.slice(0, 3)
      .map(s => s.text)
      .join(' ');
  }

  private extractTechnicalProcedures(transcript: any): string[] {
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

    const foundTechniques = techniques.filter(technique =>
      transcript.transcript.toLowerCase().includes(technique)
    );

    return foundTechniques.length > 0 ? foundTechniques : ['Técnicas não identificadas automaticamente'];
  }

  private extractGeneralObservations(transcript: any): string {
    if (transcript.summary) {
      return transcript.summary;
    }
    
    const sentences = transcript.transcript.split('.').slice(0, 3);
    return sentences.join('.') + '.';
  }

  private extractNextSteps(transcript: any): string | undefined {
    const keywords = ['próxima', 'próximo', 'tarefa', 'exercício', 'casa', 'agenda'];
    const sentences = transcript.sentences || [];
    
    const relevantSentences = sentences.filter(sentence => 
      keywords.some(keyword => 
        sentence.text.toLowerCase().includes(keyword)
      )
    );

    return relevantSentences.length > 0 
      ? relevantSentences.map(s => s.text).join(' ')
      : undefined;
  }

  private generateMeetingId(): string {
    return `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Métodos auxiliares específicos para IA
  private extractTherapeuticElements(transcript: any) {
    return {
      techniques: this.evaluateTechniqueEffectiveness(transcript),
      insights: this.extractTherapeuticInsights(transcript),
      progress: this.identifyProgressIndicators(transcript)
    };
  }

  private analyzeCommunicationPatterns(transcript: any) {
    return {
      questionPatterns: this.analyzeQuestionPatterns(transcript),
      speakerDynamics: transcript.analytics?.speakers || [],
      engagement: this.analyzePatientEngagement(transcript)
    };
  }

  private mapEmotionalJourney(transcript: any) {
    return {
      patterns: this.analyzeEmotionalPatterns(transcript),
      journey: this.extractEmotionalPatterns(transcript),
      sentiment: transcript.analytics?.sentiments || []
    };
  }

  private calculateSessionMetrics(transcript: any) {
    return {
      duration: transcript.duration,
      speaker_distribution: transcript.analytics?.speakers || [],
      question_count: transcript.analytics?.questions_asked || 0,
      sentiment_distribution: transcript.analytics?.sentiments || [],
      key_topics_count: transcript.summary?.topics_discussed?.length || 0,
      action_items_count: transcript.summary?.action_items?.length || 0
    };
  }

  private assessTechniqueEffectiveness(sentence: any, transcript: any): string {
    // Implementação simplificada
    return 'efetiva';
  }

  private categorizeActionItem(item: string): string {
    if (item.toLowerCase().includes('exercício')) return 'homework';
    if (item.toLowerCase().includes('próxima')) return 'scheduling';
    return 'therapeutic_task';
  }

  private calculateOverallSentiment(transcript: any): string {
    return transcript.analytics?.sentiments?.[0] || 'neutral';
  }

  private calculateEngagementScore(transcript: any): number {
    const engagement = this.analyzePatientEngagement(transcript);
    return engagement.overall_score;
  }

  private calculateProgressScore(transcript: any): number {
    const indicators = this.identifyProgressIndicators(transcript);
    return Math.min(100, indicators.length * 20);
  }

  private extractEmotionalPatterns(transcript: any) {
    return transcript.analytics?.sentiments || [];
  }

  private generateProgressRecommendations(progressAnalysis: any): string[] {
    // Implementação simplificada
    return [
      'Manter foco nas técnicas que demonstraram efetividade',
      'Considerar ajustes baseados nos padrões emocionais identificados'
    ];
  }

  private identifyBreakthroughMoments(transcript: any) {
    // Implementação simplificada
    return [];
  }

  private identifyResistanceMoments(transcript: any) {
    // Implementação simplificada
    return [];
  }

  private identifyTechniqueApplications(transcript: any) {
    return this.evaluateTechniqueEffectiveness(transcript);
  }

  private identifyPatientInsights(transcript: any) {
    // Implementação simplificada
    return [];
  }

  private async makeFirefliesRequest(query: string, variables: any) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    const data = { query, variables };

    this.logger.log('📤 [FIREFLIES] Enviando request para:', this.apiUrl);

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
    this.logger.log('📥 [FIREFLIES] Response received successfully');
    
    if (responseData.errors) {
      this.logger.error('❌ [FIREFLIES] GraphQL Errors:', responseData.errors);
      throw new Error(`GraphQL Error: ${responseData.errors.map(e => e.message).join(', ')}`);
    }

    return responseData.data;
  }

  // Adicionar estes métodos ao FirefliesService existente

  /**
   * Buscar transcrições por padrão de título
   */
  async searchTranscriptsByTitle(titlePattern: string, psychologistId: string) {
    if (!this.apiKey) {
      throw new BadRequestException('Fireflies não configurado');
    }

    this.checkRateLimit();

    this.logger.log(`🔍 [SEARCH] Buscando transcrições com padrão: ${titlePattern}`);

    try {
      // Primeiro, listar todas as transcrições
      const transcripts = await this.listTranscripts(100, true, psychologistId);
      
      if (!transcripts.success || !transcripts.data) {
        return { found: false, matches: [], total: 0 };
      }

      // Filtrar por padrão de título
      const matches = transcripts.data.filter(transcript => 
        transcript.title && transcript.title.includes(titlePattern)
      );

      this.logger.log(`🔍 [SEARCH] Encontradas ${matches.length} transcrições para padrão "${titlePattern}"`);

      // Se encontrou matches, tentar vincular automaticamente
      if (matches.length > 0) {
        await this.autoLinkTranscripts(matches, titlePattern, psychologistId);
      }

      return {
        found: matches.length > 0,
        matches,
        total: matches.length,
        searchPattern: titlePattern
      };
    } catch (error) {
      this.logger.error('❌ [SEARCH] Erro na busca:', error.message);
      throw new BadRequestException(`Erro na busca: ${error.message}`);
    }
  }

  /**
   * Vincular automaticamente transcrições encontradas
   */
  private async autoLinkTranscripts(matches: any[], titlePattern: string, psychologistId: string) {
    try {
      // Extrair sessionId do padrão do título (formato: sessionId-data-usuario)
      const sessionIdMatch = titlePattern.match(/^([^-]+)-/);
      if (!sessionIdMatch) {
        this.logger.warn(`[AUTO_LINK] Padrão de título inválido: ${titlePattern}`);
        return;
      }

      const sessionId = sessionIdMatch[1];

      // Verificar se a sessão existe e não tem transcript vinculado
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

      // Pegar a primeira transcrição (mais recente)
      const bestMatch = matches[0];

      // Vincular automaticamente
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { 
          transcriptId: bestMatch.id,
          hasRecording: true
        }
      });

      this.logger.log(`✅ [AUTO_LINK] Sessão ${sessionId} vinculada automaticamente com transcript ${bestMatch.id}`);

    } catch (error) {
      this.logger.error('❌ [AUTO_LINK] Erro:', error.message);
    }
  }

  /**
   * Verificar múltiplas sessões e buscar transcrições automaticamente
   */
  async autoDiscoverTranscripts(psychologistId: string) {
    try {
      this.logger.log('🔍 [AUTO_DISCOVER] Iniciando descoberta automática...');

      // Buscar sessões sem transcript que deveriam ter gravação
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
        take: 10 // Limitar para evitar rate limit
      });

      const discoveries: Array<{ sessionId: string; transcriptId: string; title: string; matchCount: number }> = [];

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
        } catch (error) {
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

    } catch (error) {
      this.logger.error('❌ [AUTO_DISCOVER] Erro:', error.message);
      throw new BadRequestException(`Erro na descoberta automática: ${error.message}`);
    }
  }

  /**
   * Gerar padrão de título baseado nos parâmetros
   */
  private generateTitlePattern(sessionId: string, userName: string): string {
    // Para busca, usar apenas sessionId-userName para ser mais flexível com datas
    return `${sessionId}-${userName}`;
  }

  /**
   * Webhook melhorado para processar notificações do Fireflies
   */
  async handleWebhookV2(payload: any) {
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
    } catch (error) {
      this.logger.error('❌ [WEBHOOK_V2] Erro:', error.message);
      return { success: false, error: error.message, event: payload.event };
    }
  }

  /**
   * Processar transcrição pronta com busca inteligente
   */
  private async processTranscriptReadyV2(transcriptId: string, meetingTitle?: string) {
    this.logger.log(`✅ [TRANSCRIPT_READY] Processando transcript ${transcriptId} com título: ${meetingTitle}`);

    try {
      // Primeiro, tentar vincular por transcript_id existente
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

      // Se não encontrou e tem título, tentar buscar por padrão de título
      if (!session && meetingTitle) {
        // Extrair sessionId do título se seguir nosso padrão
        const sessionIdMatch = meetingTitle.match(/^([^-]+)-/);
        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1];
          
          session = await this.prisma.session.findFirst({
            where: { id: sessionId },
            include: {
              psychologist: { select: { id: true, name: true } }
            }
          });

          // Se encontrou a sessão, vincular o transcript
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
        // Processar a transcrição e extrair insights
        try {
          const transcript = await this.getTranscript(transcriptId, session.psychologist.id);
          
          // Salvar insights básicos na sessão
          await this.prisma.session.update({
            where: { id: session.id },
            data: {
              transcriptId: transcriptId,
              hasRecording: true,
              // Salvar observações básicas se não existirem
              observations: session.observations || this.encryptionService.encrypt(
                `Transcrição processada automaticamente. Duração: ${transcript.duration}s. ` +
                `Participantes: ${transcript.participants.join(', ')}.`
              )
            }
          });

          this.logger.log(`✅ [TRANSCRIPT_READY] Sessão ${session.id} atualizada com insights`);
        } catch (error) {
          this.logger.error(`❌ [TRANSCRIPT_READY] Erro ao processar insights: ${error.message}`);
        }
      } else {
        this.logger.warn(`⚠️ [TRANSCRIPT_READY] Sessão não encontrada para transcript ${transcriptId}`);
      }

    } catch (error) {
      this.logger.error(`❌ [TRANSCRIPT_READY] Erro: ${error.message}`);
    }
  }

  /**
   * Processar início de gravação
   */
  private async processRecordingStarted(meetingId: string, meetingTitle?: string) {
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

  /**
   * Processar fim de gravação
   */
  private async processRecordingEnded(meetingId: string, meetingTitle?: string) {
    this.logger.log(`🛑 [RECORDING_ENDED] Meeting ${meetingId}: ${meetingTitle}`);
    
    // Aqui podemos adicionar lógica para notificar o usuário que a gravação terminou
    // e que a transcrição estará disponível em breve
  }
}