import jwt from 'jsonwebtoken';

/**
 * Defines the user data structure encoded within the JWT.
 */
export interface JwtPayload {
    id: number;
    role: 'principal' | 'teacher';
}

const getSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: JWT_SECRET is not defined in production environment.');
        }
        console.warn('WARNING: Using fallback JWT secret. Do not use in production!');
        return 'super_secret_fallback_key';
    }
    return secret;
};

const SECRET = getSecret();

/**
 * Generates a signed JWT for the authenticated user.
 *
 * @param payload - The user details to be encoded in the token.
 * @returns A JWT string valid for 24 hours.
 */
export const generateToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, SECRET, { expiresIn: '24h' });
};

/**
 * Validates a JWT string and returns its decoded payload.
 *
 * @param token - The JWT string provided by the client.
 * @returns The decoded user payload.
 * @throws Error if the token is malformed, expired, or tampered with.
 */
export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, SECRET) as JwtPayload;
};
