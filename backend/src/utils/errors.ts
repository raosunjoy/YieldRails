/**
 * Custom error types for the application
 */

export interface ApiError extends Error {
    statusCode: number;
    code: string;
    details?: any;
}

export class CustomError extends Error implements ApiError {
    statusCode: number;
    code: string;
    details?: any;

    constructor(message: string, statusCode: number, code: string, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = this.constructor.name;
    }
}

export const ErrorTypes = {
    VALIDATION_ERROR: (message: string, details?: any) => 
        new CustomError(message, 400, 'VALIDATION_ERROR', details),
    
    UNAUTHORIZED: (message: string = 'Unauthorized') => 
        new CustomError(message, 401, 'UNAUTHORIZED'),
    
    FORBIDDEN: (message: string = 'Forbidden') => 
        new CustomError(message, 403, 'FORBIDDEN'),
    
    NOT_FOUND: (message: string = 'Not Found') => 
        new CustomError(message, 404, 'NOT_FOUND'),
    
    INTERNAL_ERROR: (message: string = 'Internal Server Error') => 
        new CustomError(message, 500, 'INTERNAL_ERROR'),
    
    BLOCKCHAIN_ERROR: (message: string, details?: any) => 
        new CustomError(message, 502, 'BLOCKCHAIN_ERROR', details),
    
    RATE_LIMIT_ERROR: (message: string = 'Rate limit exceeded') => 
        new CustomError(message, 429, 'RATE_LIMIT_ERROR'),
};