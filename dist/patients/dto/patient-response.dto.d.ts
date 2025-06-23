export declare class PatientResponseDto {
    id: string;
    name: string;
    cpf: string;
    email?: string;
    phone?: string;
    dateOfBirth: string;
    address?: string;
    initialDemand: string;
    objectives: string;
    referralSource?: string;
    recordingConsent: boolean;
    dataConsent: boolean;
    consentDate: string;
    psychologistId: string;
    createdAt: string;
    updatedAt: string;
    psychologist: {
        id: string;
        name: string;
        crp: string;
    };
    totalSessions?: number;
    lastSessionDate?: string;
}
