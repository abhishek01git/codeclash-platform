import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  passed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  code: { type: String, default: '' }
}, { _id: false });

const duelSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  creator: { type: String, required: true, index: true },
  creatorName: { type: String, required: true },
  creatorAvatar: { type: String, default: '' },
  opponent: { type: String, default: null, index: true },
  opponentName: { type: String, default: null },
  opponentAvatar: { type: String, default: null },
  problemSlug: { type: String, required: true },
  problemTitle: { type: String, required: true },
  problemDifficulty: { type: String, default: 'Easy' },
  wager: { type: Number, required: true },
  pot: { type: Number, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open', index: true },
  durationMinutes: { type: Number, default: 10 },
  expiresAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  winner: { type: String, default: null },
  winnerName: { type: String, default: null },
  player1Progress: { type: progressSchema, default: () => ({}) },
  player2Progress: { type: progressSchema, default: () => ({}) }
}, { timestamps: true });

export const Duel = mongoose.model('Duel', duelSchema);
