import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
  interviewerId: { type: String },
  problemSolving: { type: Number, min: 1, max: 5 },
  codeQuality: { type: Number, min: 1, max: 5 },
  communication: { type: Number, min: 1, max: 5 },
  recommendation: { type: String, enum: ['Strong Hire', 'Hire', 'Leaning Hire', 'No Hire'] },
  notes: { type: String, default: '' },
  submittedAt: { type: Date, default: null }
}, { _id: false });

const interviewRoomSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  roomId: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  hostName: { type: String, required: true },
  hostRole: { type: String, enum: ['interviewer', 'candidate'], default: 'interviewer' },
  candidateId: { type: String, default: null },
  interviewerId: { type: String, default: null },
  problemSlug: { type: String, required: true },
  problemTitle: { type: String, required: true },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  whiteboardStrokes: { type: mongoose.Schema.Types.Mixed, default: [] },
  notes: { type: String, default: '' },
  evaluation: { type: evaluationSchema, default: null },
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
}, { timestamps: true });

export const InterviewRoom = mongoose.model('InterviewRoom', interviewRoomSchema);
