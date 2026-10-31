import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  problemSlug: { type: String, required: true, index: true },
  problemTitle: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  code: { type: String, required: true },
  status: { type: String, required: true },
  runtime: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  passedTestCases: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 }
}, { timestamps: true });

export const Submission = mongoose.model('Submission', submissionSchema);
