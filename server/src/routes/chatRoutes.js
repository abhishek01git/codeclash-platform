import express from 'express';
import { getConversations, getMessages, sendMessage, blockUser, unblockUser, clearChat, getGroups, createGroup, updateGroup, getGroupMessages, sendGroupMessage } from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/conversations', authMiddleware, getConversations);
router.get('/messages/:otherUserId', authMiddleware, getMessages);
router.post('/send', authMiddleware, sendMessage);
router.post('/users/:userId/block', authMiddleware, blockUser);
router.post('/users/:userId/unblock', authMiddleware, unblockUser);
router.post('/users/:userId/clear', authMiddleware, clearChat);
router.get('/groups', authMiddleware, getGroups);
router.post('/groups', authMiddleware, createGroup);
router.put('/groups/:groupId', authMiddleware, updateGroup);
router.get('/groups/:groupId/messages', authMiddleware, getGroupMessages);
router.post('/groups/:groupId/send', authMiddleware, sendGroupMessage);

export default router;
