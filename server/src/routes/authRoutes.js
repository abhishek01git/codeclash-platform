import express from 'express';
import { register, verifySignupOtp, login, googleAuth, getMe, updateProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/register/verify-otp', verifySignupOtp);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateProfile);

export default router;
