import express from 'express';
import { createRoom, getRoom, submitEvaluation } from '../controllers/interviewController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-room', authMiddleware, createRoom);
router.get('/room/:roomId', authMiddleware, getRoom);
router.post('/room/:roomId/feedback', authMiddleware, submitEvaluation);

export default router;
