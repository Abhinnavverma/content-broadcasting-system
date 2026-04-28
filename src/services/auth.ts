import { pool } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Core business logic for user authentication.
 *
 * Handles validating credentials, password hashing, and token generation directly against the database,
 * keeping these responsibilities separate from the HTTP transport layer.
 */
export class AuthService {
    /**
     * Registers a new user into the database.
     *
     * @param name - The user's full name.
     * @param email - The user's email address (must be unique).
     * @param password - The raw password string to be hashed securely.
     * @param role - The authorized role level for the user.
     * @returns The created user details (excluding the password hash).
     * @throws Error with message 'EMAIL_IN_USE' if the email is already registered.
     */
    static async signup(
        name: string,
        email: string,
        password: string,
        role: 'principal' | 'teacher',
    ) {
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            throw new Error('EMAIL_IN_USE');
        }

        const hashedPassword = await hashPassword(password);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
            [name, email, hashedPassword, role],
        );

        return result.rows[0];
    }

    /**
     * Authenticates a user returning an access token alongside their profile.
     *
     * Applies normalization to the supplied email before querying the database.
     *
     * @param email - The email associated with the user account.
     * @param password - The raw text password matching the account.
     * @returns An object containing the generated JWT and basic user data.
     * @throws Error with message 'INVALID_CREDENTIALS' on bad email or mismatched password.
     */
    static async login(email: string, password: string) {
        const normalizedEmail = email.toLowerCase().trim();
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        const user = result.rows[0];

        if (!user) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const token = generateToken({ id: user.id, role: user.role });

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.normalizedEmail,
                role: user.role,
            },
        };
    }
}
