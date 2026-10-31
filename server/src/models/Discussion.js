import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  author: { type: String, required: true },
  authorName: { type: String, required: true },
  authorAvatar: { type: String, default: '' },
  content: { type: String, required: true }
}, { timestamps: true });

const discussionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  problemSlug: { type: String, required: true, index: true },
  author: { type: String, required: true, index: true },
  authorName: { type: String, required: true },
  authorAvatar: { type: String, default: '' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: { type: [String], default: [] },
  upvotes: { type: [String], default: [] },
  comments: { type: [commentSchema], default: [] }
}, { timestamps: true });

export const Discussion = mongoose.model('Discussion', discussionSchema);
