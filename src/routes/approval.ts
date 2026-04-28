import { Router } from 'express';
import { ApprovalController } from '../controllers/approval.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();

router.get('/pending', authenticate, requireRole('principal'), ApprovalController.getPending);
router.put('/:id/status', authenticate, requireRole('principal'), ApprovalController.review);

export default router;
