import express from 'express';
import { register, login, googleAuth, getMe, updateProfile, demoSwitch } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateProfile);
router.post('/demo-switch', demoSwitch);

export default router;
