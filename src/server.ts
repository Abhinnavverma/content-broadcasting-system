import dotenv from 'dotenv';
/**
 * Establish environment variable initialization before ANY downstream modules
 * consume them to avoid unpredictable runtime behavior (e.g., config/db or utils/jwt).
 */
dotenv.config();

import app from './app.js';
const PORT = process.env.PORT || 3000;

/**
 * Primary HTTP entry point. Mounts the application to the network interface.
 */
app.listen(PORT, () => {
    console.log(`Server is running on port :${PORT}`);
});
