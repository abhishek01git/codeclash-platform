import express from 'express';
import { getDailyStatus, claimDaily, getDailyTasks, claimTask } from '../controllers/rewardsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/daily-status', authMiddleware, getDailyStatus);
router.post('/claim-daily', authMiddleware, claimDaily);
router.get('/daily-tasks', authMiddleware, getDailyTasks);
router.post('/claim-task/:taskId', authMiddleware, claimTask);

export default router;
