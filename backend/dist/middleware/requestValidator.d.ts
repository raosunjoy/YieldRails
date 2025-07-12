import { Request, Response, NextFunction } from 'express';
export declare const requestValidator: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestSizeLimiter: (maxSizeMB?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requestIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestValidator.d.ts.map