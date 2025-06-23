import { FirefliesService } from './fireflies.service';
import { AddToLiveMeetingDto, UploadAudioDto, CFPFormattedTranscriptDto, FirefliesWebhookDto } from './dto/fireflies.dto';
import { ConfigService } from '@nestjs/config';
export declare class FirefliesController {
    private readonly firefliesService;
    private readonly configService;
    constructor(firefliesService: FirefliesService, configService: ConfigService);
    addToLiveMeeting(addToLiveDto: AddToLiveMeetingDto, req: any): Promise<{
        success: boolean;
        firefliesId: string;
        message: string;
        meetingUrl: string;
        title: string;
        expectedTranscriptTitle: string;
    }>;
    uploadAudio(uploadAudioDto: UploadAudioDto, req: any): Promise<{
        success: boolean;
        transcriptId: any;
        message: string;
    }>;
    getTranscript(transcriptId: string, req: any): Promise<{
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
    getTranscriptCFPFormat(transcriptId: string, req: any): Promise<CFPFormattedTranscriptDto>;
    handleWebhook(payload: FirefliesWebhookDto, signature?: string): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
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
    listTranscripts(limit: string | undefined, mine: string | undefined, req: any): Promise<{
        success: boolean;
        count: any;
        data: any;
        total: any;
    }>;
    checkTranscriptStatus(transcriptId: string, req: any): Promise<{
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
    syncWithFireflies(req: any): Promise<{
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
    linkSessionToTranscript(sessionId: string, transcriptId: string, req: any): Promise<{
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
    checkConfiguration(req: any): Promise<{
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
    searchTranscripts(titlePattern: string, req: any): Promise<{
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
    autoDiscoverTranscripts(req: any): Promise<{
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
    handleWebhookV2(payload: any, signature?: string): Promise<{
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
    linkSessionToTranscriptByBody(body: {
        sessionId: string;
        transcriptId: string;
    }, req: any): Promise<{
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
    checkHealth(req: any): Promise<{
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
    getTranscriptAccessInfo(transcriptId: string, req: any): Promise<{
        id: any;
        title: any;
        organizer: any;
        privacy: string;
        hasAccess: boolean;
        accessReason: string;
        canRequest: boolean;
        status: string;
        isReady: boolean;
    }>;
    getMyPermissions(req: any): Promise<{
        userEmail: any;
        summary: {
            total: any;
            fullAccess: number;
            noAccess: number;
            organized: number;
            participant: number;
        };
        categories: {
            organized: {
                id: string;
                title: string;
            }[];
            accessible: {
                id: string;
                title: string;
            }[];
            restricted: {
                id: string;
                title: string;
                reason: string;
                organizer: string;
            }[];
        };
    }>;
}
