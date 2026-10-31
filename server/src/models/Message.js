import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sender: { type: String, required: true, index: true },
  recipient: { type: String, default: null, index: true },
  groupId: { type: String, default: null, index: true },
  senderName: { type: String, default: '' },
  senderAvatar: { type: String, default: '' },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'duel_invite', 'image', 'audio', 'video'], default: 'text' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  read: { type: Boolean, default: false },
  readBy: { type: [String], default: [] }
}, { timestamps: true });

export const Message = mongoose.model('Message', messageSchema);
