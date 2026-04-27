import { Request, Response, NextFunction } from 'express';

type RoleType = 'principal' | 'teacher';

/**
 * Role-Based Access Control middleware factory.
 *
 * Protects routes by ensuring the authenticated user matches the specified role.
 * Requires the `authenticate` middleware to run prior in the chain to populate `req.user`.
 *
 * @param role - The required role type.
 * @returns Express middleware function.
 */
export const requireRole = (role: RoleType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: User context missing' });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ error: `Forbidden: Requires ${role} access` });
        }

        next();
    };
};
