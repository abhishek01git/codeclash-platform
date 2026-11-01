import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { EmailOtp } from '../models/EmailOtp.js';
import { sendSignupOtpEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'codeclash_super_secret_jwt_key_2026';

function safeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
}

function signToken(user) {
  return jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validUsername(username) {
  return /^[a-zA-Z0-9_-]{3,40}$/.test(username);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function usernameInUse(username) {
  return User.exists({ username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } });
}

export async function register(req, res) {
  try {
    const username = req.body.username?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password are required' });
    if (!validUsername(username)) return res.status(400).json({ error: 'Username must be 3–40 characters using letters, numbers, underscores, or hyphens' });
    if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (await User.exists({ email }) || await usernameInUse(username)) return res.status(409).json({ error: 'Username or email already in use' });

    const existingOtp = await EmailOtp.findOne({ email });
    if (existingOtp && Date.now() - existingOtp.lastSentAt.getTime() < 60 * 1000) {
      return res.status(429).json({ error: 'Please wait a minute before requesting another code' });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const [otpHash, passwordHash] = await Promise.all([bcrypt.hash(code, 10), bcrypt.hash(password, 12)]);
    const lastSentAt = new Date();
    const expiresAt = new Date(lastSentAt.getTime() + 10 * 60 * 1000);
    await EmailOtp.findOneAndUpdate(
      { email },
      { email, username, passwordHash, otpHash, attempts: 0, lastSentAt, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const delivery = await sendSignupOtpEmail({ email, username, code });
    if (!delivery.success) {
      await EmailOtp.deleteOne({ email, otpHash });
      return res.status(503).json({ error: delivery.error });
    }
    res.status(202).json({ message: 'Verification code sent. It expires in 10 minutes.', email });
  } catch (err) {
    res.status(500).json({ error: 'Unable to start registration. Please try again.' });
  }
}

export async function verifySignupOtp(req, res) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    if (!validEmail(email) || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the email address and the six-digit verification code' });
    const pending = await EmailOtp.findOne({ email });
    if (!pending) return res.status(400).json({ error: 'No active verification request. Request a new code.' });
    if (pending.expiresAt.getTime() < Date.now()) {
      await pending.deleteOne();
      return res.status(400).json({ error: 'This verification code has expired. Request a new code.' });
    }
    if (pending.attempts >= 5) {
      await pending.deleteOne();
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    }
    if (!(await bcrypt.compare(code, pending.otpHash))) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (await User.exists({ email }) || await usernameInUse(pending.username)) {
      await pending.deleteOne();
      return res.status(409).json({ error: 'Username or email already in use. Start again with different details.' });
    }
    const newUser = await User.create({
      _id: `user_${crypto.randomUUID()}`,
      username: pending.username,
      email,
      password: pending.passwordHash,
      emailVerified: true,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pending.username)}`,
      bio: 'New CodeClash Challenger ⚔️',
      coins: 200,
      badges: ['Email Verified', 'New Challenger', 'Welcome 200 Coins']
    });
    await pending.deleteOne();
    res.status(201).json({ token: signToken(newUser), user: safeUser(newUser) });
  } catch (err) {
    res.status(500).json({ error: 'Unable to verify the code. Please try again.' });
  }
}

export async function login(req, res) {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Credentials required' });
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: { $regex: new RegExp(`^${escapeRegex(emailOrUsername)}$`, 'i') } }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
export async function googleAuth(req, res) {
  try {
    const { credential } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Google sign-in is not configured on this server' });
    if (!credential || typeof credential !== 'string') return res.status(400).json({ error: 'A Google ID token is required' });
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!response.ok) return res.status(401).json({ error: 'Google could not verify this sign-in token' });
    const claims = await response.json();
    if (claims.aud !== clientId || claims.email_verified !== 'true' || !validEmail(claims.email)) {
      return res.status(401).json({ error: 'Invalid Google sign-in token' });
    }
    const email = claims.email.toLowerCase();
    const googleId = claims.sub;

    let user = await User.findOne({ email });

    if (!user) {
      const baseName = (claims.name || email.split('@')[0]).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'Coder';
      let defaultName = baseName;
      let suffix = 1;
      while (await usernameInUse(defaultName)) defaultName = `${baseName.slice(0, 36)}${suffix++}`;
      user = await User.create({
        _id: `user_g_${crypto.randomUUID()}`,
        googleId,
        username: defaultName,
        email,
        emailVerified: true,
        avatar: claims.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(defaultName)}`,
        bio: 'Google Verified CodeClash Challenger ⚔️',
        coins: 200,
        badges: ['Google Verified', 'Welcome 200 Coins']
      });
    } else if (user.googleId && user.googleId !== googleId) {
      return res.status(409).json({ error: 'This email is linked to a different Google account' });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.emailVerified = true;
      await user.save();
    }

    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const { username, bio, avatar } = req.body;
    const update = {};
    if (username?.trim()) update.username = username.trim().slice(0, 40);
    if (typeof bio === 'string') update.bio = bio.slice(0, 180);
    if (typeof avatar === 'string') update.avatar = avatar.trim().slice(0, 2 * 1024 * 1024);

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
