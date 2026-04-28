import { Router } from 'express';
import { AuthController } from '../controllers/auth.js';

const router = Router();

/**
 * Endpoint routes for User Authentication.
 * Routes handle HTTP mappings for signup and login actions.
 */
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);

export default router;
