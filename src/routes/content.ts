import { Router } from 'express';
import { ContentController } from '../controllers/content.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { uploadMiddleware } from '../middlewares/upload.js';

const router = Router();

router.post(
    '/upload',
    authenticate,
    requireRole('teacher'),
    uploadMiddleware('file'),
    ContentController.upload,
);

export default router;
