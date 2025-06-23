export declare class DocumentTemplateDto {
    id: string;
    name: string;
    type: string;
    template: string;
    variables: string[];
    isActive: boolean;
}
export declare class GenerateDocumentFromTemplateDto {
    templateId: string;
    patientId: string;
    sessionIds?: string[];
    customVariables?: Record<string, any>;
}
export declare class DocumentResponseDto {
    id: string;
    title: string;
    type: string;
    content: string;
    fileName?: string;
    fileUrl?: string;
    patientId: string;
    patient: {
        id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}
