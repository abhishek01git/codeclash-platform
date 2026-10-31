import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  parsedArgs: { type: mongoose.Schema.Types.Mixed },
  expectedOutput: { type: mongoose.Schema.Types.Mixed, required: true },
  isHidden: { type: Boolean, default: false }
}, { _id: false });

const starterCodeSchema = new mongoose.Schema({
  javascript: { type: String, default: '' },
  python: { type: String, default: '' }
}, { _id: false });

const problemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  category: { type: String, default: 'Algorithms' },
  tags: { type: [String], default: [] },
  description: { type: String, default: '' },
  examples: { type: mongoose.Schema.Types.Mixed, default: [] },
  constraints: { type: [String], default: [] },
  hints: { type: [String], default: [] },
  editorial: { type: String, default: '' },
  starterCode: { type: starterCodeSchema, default: () => ({}) },
  testCases: { type: [testCaseSchema], default: [] },
  acceptanceRate: { type: Number, default: 0 },
  submissionCount: { type: Number, default: 0 },
  acceptedCount: { type: Number, default: 0 }
}, { timestamps: true });

export const Problem = mongoose.model('Problem', problemSchema);
