import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password using bcrypt.
 *
 * @param password - The raw password string to hash.
 * @returns A promise resolving to the bcrypt hash.
 */
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verifies a plain-text password against a stored bcrypt hash.
 *
 * @param password - The unencrypted password provided by the user.
 * @param hash - The stored bcrypt hash from the database.
 * @returns A promise resolving to true if the password matches the hash.
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};
