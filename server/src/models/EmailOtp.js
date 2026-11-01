import mongoose from 'mongoose';

// Registration details stay here only until the person proves control of the mailbox.
const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export const EmailOtp = mongoose.model('EmailOtp', emailOtpSchema);
