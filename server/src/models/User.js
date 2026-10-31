import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: null },
  googleId: { type: String, default: null },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 180 },
  coins: { type: Number, default: 200 },
  dailyStreak: { type: Number, default: 1 },
  lastDailyClaim: { type: Date, default: null },
  solvedProblems: { type: [String], default: [] },
  claimedTasks: { type: [String], default: [] },
  stats: {
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    duelsWon: { type: Number, default: 0 },
    duelsLost: { type: Number, default: 0 },
    duelCoinsWon: { type: Number, default: 0 }
  },
  badges: { type: [String], default: [] },
  friends: { type: [String], default: [] },
  friendRequestsSent: { type: [String], default: [] },
  friendRequestsReceived: { type: [String], default: [] },
  following: { type: [String], default: [] },
  followers: { type: [String], default: [] },
  blockedUsers: { type: [String], default: [] },
  clearedChats: { type: Map, of: String, default: {} }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
