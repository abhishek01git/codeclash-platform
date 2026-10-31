import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 60 },
  avatar: { type: String, default: '' },
  createdBy: { type: String, required: true },
  members: { type: [String], default: [] }
}, { timestamps: true });

export const Group = mongoose.model('Group', groupSchema);
