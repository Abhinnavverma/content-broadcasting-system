import { Request, Response } from 'express';
import { AuthService } from '../services/auth.js';

/**
 * Transport layer controller for handling authentication-related HTTP routes.
 *
 * Responsible for taking native Express requests, performing basic input validation,
 * passing operations on to the Auth service, and formatting the JSON HTTP responses safely.
 */
export class AuthController {
    /**
     * Processes requests to register new user accounts.
     *
     * Returns a 201 Created status directly upon success, or a 409 Conflict if
     * the requested email is already taken.
     *
     * @param req - Express request holding name, email, password, and role.
     * @param res - Express response object.
     */
    static async signup(req: Request, res: Response) {
        try {
            const { name, email, password, role } = req.body;

            // Basic validation
            if (!name || !email || !password || !role) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            if (!['principal', 'teacher'].includes(role)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid role. Must be principal or teacher' });
            }

            const user = await AuthService.signup(name, email, password, role);
            return res.status(201).json({ message: 'User created successfully', user });
        } catch (error: any) {
            if (error.message === 'EMAIL_IN_USE') {
                return res.status(409).json({ error: 'Email is already registered' });
            }
            console.error('[AuthController.signup]', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Processes requests to log users into their accounts.
     *
     * Expects an email and password in the body. Will map any generic credential
     * tracking failures into a secure 401 Unauthorized status.
     *
     * @param req - The Express request object containing email and password body mappings.
     * @param res - The Express response object used to dispatch the JWT payload block.
     */
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            const data = await AuthService.login(email, password);
            return res.status(200).json(data);
        } catch (error: any) {
            if (error.message === 'INVALID_CREDENTIALS') {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            console.error('[AuthController.login]', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
