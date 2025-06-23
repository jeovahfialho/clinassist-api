export declare class AttendeeDto {
    displayName: string;
    email: string;
}
export declare class AddToLiveMeetingDto {
    sessionId: string;
    meetingUrl?: string;
    title?: string;
    attendees?: AttendeeDto[];
}
export declare class UploadAudioDto {
    sessionId: string;
    audioUrl: string;
    title?: string;
}
export declare class FirefliesWebhookDto {
    transcript_id: string;
    status: string;
    data?: any;
}
export declare class TranscriptResponseDto {
    id: string;
    title: string;
    transcript: string;
    summary: string;
    speakers?: Array<{
        name: string;
        talkTime: number;
        wordCount: number;
    }>;
    keyPoints?: string[];
    actionItems?: string[];
    duration: number;
    date: string;
    firefliesUrl: string;
}
export declare class CFPFormattedTranscriptDto {
    patientIdentification: string;
    demandAssessment: string;
    sessionEvolution: string;
    technicalProcedures: string[];
    generalObservations: string;
    nextSteps?: string;
    fullTranscript?: string;
}
