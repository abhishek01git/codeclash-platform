import { InterviewRoom } from '../models/InterviewRoom.js';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';

export async function createRoom(req, res) {
  try {
    const currentUserId = req.user.userId;
    const { problemSlug, role = 'interviewer' } = req.body;

    const [user, selectedProblem] = await Promise.all([
      User.findById(currentUserId).select('_id username'),
      problemSlug ? Problem.findOne({ slug: problemSlug }) : Problem.findOne()
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!selectedProblem) return res.status(404).json({ error: 'No problems available' });

    const roomId = 'room_' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newRoom = await InterviewRoom.create({
      _id: roomId,
      roomId,
      hostId: user._id,
      hostName: user.username,
      hostRole: role,
      candidateId: role === 'candidate' ? user._id : null,
      interviewerId: role === 'interviewer' ? user._id : null,
      problemSlug: selectedProblem.slug,
      problemTitle: selectedProblem.title,
      code: selectedProblem.starterCode?.javascript || ''
    });

    res.status(201).json({ room: newRoom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getRoom(req, res) {
  try {
    const { roomId } = req.params;
    const currentUserId = req.user.userId;

    const room = await InterviewRoom.findOne({ $or: [{ roomId }, { _id: roomId }] });
    if (!room) return res.status(404).json({ error: 'Interview room not found' });

    const problem = await Problem.findOne({ slug: room.problemSlug });

    // Auto-assign role if slot is empty
    if (room.interviewerId && !room.candidateId && room.interviewerId !== currentUserId) {
      room.candidateId = currentUserId;
      await room.save();
    } else if (room.candidateId && !room.interviewerId && room.candidateId !== currentUserId) {
      room.interviewerId = currentUserId;
      await room.save();
    }

    res.json({ room, problem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function submitEvaluation(req, res) {
  try {
    const { roomId } = req.params;
    const { problemSolving, codeQuality, communication, recommendation, notes } = req.body;
    const currentUserId = req.user.userId;

    const room = await InterviewRoom.findOne({ $or: [{ roomId }, { _id: roomId }] });
    if (!room) return res.status(404).json({ error: 'Interview room not found' });

    room.evaluation = { interviewerId: currentUserId, problemSolving, codeQuality, communication, recommendation, notes, submittedAt: new Date() };
    room.status = 'completed';
    await room.save();

    // Award both participants 50 coins
    const updates = [];
    if (room.interviewerId) updates.push(User.findByIdAndUpdate(room.interviewerId, { $inc: { coins: 50 } }));
    if (room.candidateId) updates.push(User.findByIdAndUpdate(room.candidateId, { $inc: { coins: 50 } }));
    await Promise.all(updates);

    res.json({ message: 'Interview evaluation submitted successfully! Both participants awarded 50 Coins!', room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
