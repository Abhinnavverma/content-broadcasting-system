import { Router } from 'express';
import { PublicController } from '../controllers/public.js';

const router = Router();

router.get('/live/:teacher_id', PublicController.getLiveContent);

export default router;
