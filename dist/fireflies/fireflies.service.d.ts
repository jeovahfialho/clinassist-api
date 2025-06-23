import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { AddToLiveMeetingDto, UploadAudioDto, CFPFormattedTranscriptDto } from './dto/fireflies.dto';
export declare class FirefliesService {
    private configService;
    private prisma;
    private encryptionService;
    private readonly logger;
    private readonly apiKey;
    private readonly apiUrl;
    private rateLimitCount;
    private rateLimitReset;
    constructor(configService: ConfigService, prisma: PrismaService, encryptionService: EncryptionService);
    private checkRateLimit;
    addToLiveMeeting(addToLiveDto: AddToLiveMeetingDto, psychologistId: string): Promise<{
        success: boolean;
        firefliesId: string;
        message: string;
        meetingUrl: string;
        title: string;
        expectedTranscriptTitle: string;
    }>;
    private generateDefaultTitle;
    private generateSessionTitle;
    private generateSearchPattern;
    uploadAudio(uploadAudioDto: UploadAudioDto, psychologistId: string): Promise<{
        success: boolean;
        transcriptId: any;
        message: string;
    }>;
    getTranscript(transcriptId: string, psychologistId: string): Promise<{
        id: any;
        title: any;
        transcript: string;
        summary: any;
        sentences: any;
        keyPoints: any;
        actionItems: any;
        duration: any;
        date: any;
        firefliesUrl: any;
        organizer: any;
        participants: any;
        speakers: any[];
        outline: any;
    }>;
    formatTranscriptForCFP(transcriptId: string, psychologistId: string): Promise<CFPFormattedTranscriptDto>;
    handleWebhook(payload: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    getAIEnhancedTranscript(transcriptId: string, psychologistId: string): Promise<any>;
    generateCustomInsights(transcriptId: string, psychologistId: string, promptType: string): Promise<{
        therapeuticInsights: {
            type: string;
            content: string;
            timestamp: number;
            speaker: string;
        }[];
        emotionalAnalysis: {
            dominant_emotions: never[];
            emotional_transitions: never[];
            intensity_peaks: never[];
        };
        progressIndicators: {
            keyword: string;
            context: string;
            timestamp: number;
            speaker: string;
        }[];
        techniqueEffectiveness: {
            technique: string;
            context: string;
            timestamp: number;
            speaker: string;
            effectiveness: string;
        }[];
        patientEngagement: {
            overall_score: number;
            indicators: {
                metric: string;
                value: number;
                interpretation: string;
            }[];
            concerns: any[];
        };
        sessionOutcomes: ({
            type: "action_item";
            content: any;
            category: string;
        } | {
            type: "key_insights";
            content: any;
            relevance: string;
        })[];
        recommendations: {
            category: string;
            recommendation: string;
            priority: string;
        }[];
    }>;
    generateAIEnhancedCFPReport(transcriptId: string, psychologistId: string): Promise<any>;
    analyzePatientProgressAI(patientId: string, psychologistId: string): Promise<{
        overallTrends: Array<{
            sessionDate: Date;
            sentiment: string;
            engagement: number;
            progress: number;
        }>;
        emotionalPatterns: Array<{
            sessionDate: Date;
            emotions: string[];
        }>;
        engagementEvolution: any[];
        techniqueEffectiveness: any[];
        recommendations: string[];
    }>;
    generateTherapeuticSoundbites(transcriptId: string, psychologistId: string): Promise<{
        breakthroughMoments: never[];
        resistanceMoments: never[];
        techniqueApplications: {
            technique: string;
            context: string;
            timestamp: number;
            speaker: string;
            effectiveness: string;
        }[];
        patientInsights: never[];
        audioUrl: any;
        videoUrl: any;
    }>;
    testConnection(): Promise<{
        success: boolean;
        message: string;
        configured: boolean;
        user?: undefined;
        apiKeyValid?: undefined;
    } | {
        success: boolean;
        message: string;
        configured: boolean;
        user: any;
        apiKeyValid?: undefined;
    } | {
        success: boolean;
        message: string;
        configured: boolean;
        apiKeyValid: boolean;
        user?: undefined;
    }>;
    listTranscripts(limit?: number, mine?: boolean, psychologistId?: string): Promise<{
        success: boolean;
        count: any;
        data: any;
        total: any;
    }>;
    checkTranscriptStatus(transcriptId: string, psychologistId: string): Promise<{
        id: any;
        title: any;
        status: string;
        isReady: boolean;
        isProcessing: boolean;
        hasFailed: boolean;
        duration: any;
        organizer: any;
        participants: any;
        privacy: string;
        canAccess: boolean;
        accessReason: string;
        error?: undefined;
    } | {
        id: string;
        title: string;
        status: string;
        isReady: boolean;
        isProcessing: boolean;
        hasFailed: boolean;
        duration: number;
        organizer: string;
        participants: never[];
        privacy: string;
        canAccess: boolean;
        accessReason: string;
        error: string;
    }>;
    syncWithFireflies(psychologistId: string): Promise<{
        success: boolean;
        message: string;
        totalFirefliesTranscripts: any;
        totalSessionsWithoutTranscript: number;
        matched: number;
        errors: number;
        details: {
            matches: {
                sessionId: string;
                transcriptId: string;
                title: string;
                sessionDate: Date;
                transcriptDate: string;
            }[];
            errors: {
                sessionId: string;
                error: string;
            }[];
        };
    }>;
    linkSessionToTranscript(sessionId: string, transcriptId: string, psychologistId: string): Promise<{
        success: boolean;
        message: string;
        session: {
            id: string;
            transcriptId: string;
            transcriptTitle: any;
            transcriptStatus: string;
            isReady: boolean;
            accessLevel: string;
        };
    }>;
    checkConfiguration(psychologistId: string): Promise<{
        status: string;
        checks: {
            apiKeyConfigured: boolean;
            apiKeyValid: boolean;
            canListTranscripts: boolean;
            totalTranscripts: number;
            sessionsWithoutTranscript: number;
            sessionsWithTranscript: number;
            rateLimitStatus: string;
        };
        recommendations: string[];
        summary: {
            configured: boolean;
            working: boolean;
            transcriptsAvailable: number;
            needsSync: boolean;
        };
    }>;
    getTranscripts(psychologistId?: string, limit?: number): Promise<{
        success: boolean;
        count: any;
        data: any;
        total: any;
    }>;
    private processForPsychotherapy;
    private extractTherapeuticInsights;
    private analyzeEmotionalPatterns;
    private identifyProgressIndicators;
    private evaluateTechniqueEffectiveness;
    private analyzePatientEngagement;
    private identifySessionOutcomes;
    private generateTherapeuticRecommendations;
    private extractPatientIdentificationAI;
    private extractDemandAssessmentAI;
    private generateSessionEvolutionAI;
    private identifyTechnicalProceduresAI;
    private generateGeneralObservationsAI;
    private generateNextStepsAI;
    private analyzeQuestionPatterns;
    private assessTherapeuticAlliance;
    private linkTranscriptToSessionIfNeeded;
    private extractFullTranscript;
    private extractSpeakers;
    private processTranscriptReady;
    private findMatchingTranscript;
    private getConfigurationRecommendations;
    private extractPatientInfo;
    private extractDemandAssessment;
    private extractSessionEvolution;
    private extractTechnicalProcedures;
    private extractGeneralObservations;
    private extractNextSteps;
    private generateMeetingId;
    private extractTherapeuticElements;
    private analyzeCommunicationPatterns;
    private mapEmotionalJourney;
    private calculateSessionMetrics;
    private assessTechniqueEffectiveness;
    private categorizeActionItem;
    private calculateOverallSentiment;
    private calculateEngagementScore;
    private calculateProgressScore;
    private extractEmotionalPatterns;
    private generateProgressRecommendations;
    private identifyBreakthroughMoments;
    private identifyResistanceMoments;
    private identifyTechniqueApplications;
    private identifyPatientInsights;
    private makeFirefliesRequest;
    searchTranscriptsByTitle(titlePattern: string, psychologistId: string): Promise<{
        found: boolean;
        matches: never[];
        total: number;
        searchPattern?: undefined;
    } | {
        found: boolean;
        matches: any;
        total: any;
        searchPattern: string;
    }>;
    private autoLinkTranscripts;
    autoDiscoverTranscripts(psychologistId: string): Promise<{
        success: boolean;
        discovered: number;
        discoveries: {
            sessionId: string;
            transcriptId: string;
            title: string;
            matchCount: number;
        }[];
        total_sessions_checked: number;
    }>;
    private generateTitlePattern;
    handleWebhookV2(payload: any): Promise<{
        success: boolean;
        event: any;
        processed: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        event: any;
        processed?: undefined;
    }>;
    private processTranscriptReadyV2;
    private processRecordingStarted;
    private processRecordingEnded;
}
