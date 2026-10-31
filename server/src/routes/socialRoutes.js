import express from 'express';
import {
  getUsers,
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  toggleFollow,
  getActivityFeed
} from '../controllers/socialController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/users', authMiddleware, getUsers);
router.get('/friends', authMiddleware, getFriends);
router.post('/friend-request/:targetUserId', authMiddleware, sendFriendRequest);
router.post('/friend-request/:senderUserId/accept', authMiddleware, acceptFriendRequest);
router.post('/friend-request/:senderUserId/decline', authMiddleware, declineFriendRequest);
router.post('/follow/:targetUserId', authMiddleware, toggleFollow);
router.get('/feed', authMiddleware, getActivityFeed);

export default router;
