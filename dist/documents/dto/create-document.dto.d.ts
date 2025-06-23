import { DocumentType } from '@prisma/client';
export declare class CreateDocumentDto {
    patientId: string;
    title: string;
    type: DocumentType;
    content?: string;
    sessionIds?: string[];
    startDate?: string;
    endDate?: string;
    fileName?: string;
}
