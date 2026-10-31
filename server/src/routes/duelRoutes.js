import express from 'express';
import {
  getDuels,
  createDuel,
  joinDuel,
  cancelDuel,
  getDuelById,
  submitDuelCode,
  getDuelLeaderboard
} from '../controllers/duelsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getDuels);
router.get('/leaderboard', getDuelLeaderboard);
router.post('/create', authMiddleware, createDuel);
router.post('/:id/join', authMiddleware, joinDuel);
router.post('/:id/cancel', authMiddleware, cancelDuel);
router.get('/:id', authMiddleware, getDuelById);
router.post('/:id/submit', authMiddleware, submitDuelCode);

export default router;
