import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentType } from '@prisma/client';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    create(createDocumentDto: CreateDocumentDto, req: any): Promise<any>;
    findAll(page?: number, limit?: number, patientId?: string, type?: DocumentType, req?: any): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    generateEvolutionReport(patientId: string, startDate?: string, endDate?: string, req?: any): Promise<{
        type: string;
        content: string;
        generatedAt: string;
    }>;
    generatePsychologicalEvaluation(patientId: string, sessionIds?: string[], req?: any): Promise<{
        type: string;
        content: string;
        generatedAt: string;
    }>;
    saveGenerated(body: {
        patientId: string;
        title: string;
        type: DocumentType;
        content: string;
    }, req: any): Promise<any>;
    getTemplates(): Promise<{
        id: string;
        name: string;
        type: string;
        description: string;
        variables: string[];
    }[]>;
    findOne(id: string, req: any): Promise<any>;
    update(id: string, updateDocumentDto: Partial<CreateDocumentDto>, req: any): Promise<any>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
