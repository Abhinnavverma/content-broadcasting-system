import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';

declare module 'express-serve-static-core' {
    interface Request {
        user?: JwtPayload;
    }
}

/**
 * Global authentication middleware.
 *
 * Extracts and verifies the JWT from the `Authorization: Bearer <token>` header.
 * If valid, the decoded user payload is attached to `req.user` for downstream handlers.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next middleware function.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('[Auth Middleware] Token verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};
