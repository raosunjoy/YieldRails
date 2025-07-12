import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedUser {
    id: string;
    address: string;
    role: 'user' | 'merchant' | 'admin';
    email?: string;
    isVerified: boolean;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
            id?: string;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (user: AuthenticatedUser) => string;
export declare const verifyEthereumSignature: (address: string, message: string, signature: string) => boolean;
//# sourceMappingURL=auth.d.ts.map