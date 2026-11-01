import express from 'express';
import { createRoom, getRoom, submitEvaluation, getMyRooms, endRoom } from '../controllers/interviewController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-room', authMiddleware, createRoom);
router.get('/my-rooms', authMiddleware, getMyRooms);
router.get('/room/:roomId', authMiddleware, getRoom);
router.post('/room/:roomId/end', authMiddleware, endRoom);
router.post('/room/:roomId/feedback', authMiddleware, submitEvaluation);

export default router;
