export declare class PaginationDto {
    page?: number;
    limit?: number;
}
export declare class PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    constructor(data: T[], total: number, page: number, limit: number);
}
