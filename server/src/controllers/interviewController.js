import { InterviewRoom } from '../models/InterviewRoom.js';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { sendInterviewInvitationEmail } from '../services/emailService.js';

export async function createRoom(req, res) {
  try {
    const currentUserId = req.user.userId;
    const {
      problemSlug,
      role = 'interviewer',
      candidateEmail,
      candidateName,
      scheduledTime,
      initialPlatform = 'code',
      notes = ''
    } = req.body;

    const [user, selectedProblem] = await Promise.all([
      User.findById(currentUserId).select('_id username email'),
      problemSlug ? Problem.findOne({ slug: problemSlug }) : Problem.findOne()
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!selectedProblem) return res.status(404).json({ error: 'No problems available' });
    if (candidateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail.trim())) {
      return res.status(400).json({ error: 'Please provide a valid candidate email address.' });
    }

    const roomId = 'room_' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check if candidate email matches existing registered user
    let matchedCandidateUser = null;
    if (candidateEmail) {
      matchedCandidateUser = await User.findOne({ email: candidateEmail.toLowerCase().trim() });
    }

    const parsedScheduledTime = scheduledTime ? new Date(scheduledTime) : new Date();
    if (Number.isNaN(parsedScheduledTime.getTime())) {
      return res.status(400).json({ error: 'Please provide a valid interview date and time.' });
    }

    const newRoom = await InterviewRoom.create({
      _id: roomId,
      roomId,
      hostId: user._id,
      hostName: user.username,
      hostRole: role,
      candidateId: role === 'candidate' ? user._id : (matchedCandidateUser?._id || null),
      candidateEmail: candidateEmail?.trim()?.toLowerCase() || null,
      candidateName: candidateName?.trim() || (matchedCandidateUser?.username || 'Candidate'),
      interviewerId: role === 'interviewer' ? user._id : null,
      scheduledTime: parsedScheduledTime,
      initialPlatform,
      notes,
      status: scheduledTime ? 'scheduled' : 'active',
       problemSlug: selectedProblem.slug,
      problemTitle: selectedProblem.title,
      code: selectedProblem.starterCode?.javascript || ''
    });

    // Send Email to candidate if email provided
    let emailResult = null;
    if (candidateEmail && candidateEmail.includes('@')) {
      emailResult = await sendInterviewInvitationEmail({
        candidateEmail: candidateEmail.trim(),
        candidateName: newRoom.candidateName,
        interviewerName: user.username,
        scheduledTime: parsedScheduledTime,
        roomId: newRoom.roomId,
        // problemTitle: selectedProblem.title,
        notes
      });
    }

    const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const joinUrl = `${appUrl}/?interview=${encodeURIComponent(newRoom.roomId)}&role=candidate`;

    res.status(201).json({
      room: newRoom,
      emailSent: emailResult?.success || false,
      emailError: emailResult?.error || null,
      joinUrl,
      candidateEmail: newRoom.candidateEmail,
      candidateName: newRoom.candidateName,
      scheduledTime: newRoom.scheduledTime
    });
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

    // Determine user's role:
    // If user created as interviewer / is room.interviewerId -> interviewer
    // If student joins using room code or candidate link -> candidate
    let effectiveRole = 'candidate';
    if (room.interviewerId === currentUserId || (room.hostId === currentUserId && room.hostRole === 'interviewer')) {
      effectiveRole = 'interviewer';
    } else {
      effectiveRole = 'candidate';
      if (!room.candidateId || room.candidateId !== currentUserId) {
        room.candidateId = currentUserId;
        if (req.user.username) {
          room.candidateName = req.user.username;
        }
        await room.save();
      }
    }

    res.json({ room, problem, role: effectiveRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyRooms(req, res) {
  try {
    const currentUserId = req.user.userId;
    const user = await User.findById(currentUserId).select('email');
    const userEmail = user?.email?.toLowerCase().trim();

    const query = {
      $or: [
        { hostId: currentUserId },
        { interviewerId: currentUserId },
        { candidateId: currentUserId },
        ...(userEmail ? [{ candidateEmail: userEmail }] : [])
      ],
      status: { $ne: 'completed' }
    };

    const rooms = await InterviewRoom.find(query).sort({ updatedAt: -1, createdAt: -1 });
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function endRoom(req, res) {
  try {
    const { roomId } = req.params;
    const currentUserId = req.user.userId;

    const room = await InterviewRoom.findOne({ $or: [{ roomId }, { _id: roomId }] });
    if (!room) return res.status(404).json({ error: 'Interview room not found' });

    // Only interviewer or host can officially terminate the interview meeting
    const isInterviewer = room.interviewerId === currentUserId || (room.hostId === currentUserId && room.hostRole === 'interviewer');
    if (!isInterviewer) {
      return res.status(403).json({ error: 'Only the interviewer can end the meeting for all participants.' });
    }

    room.status = 'completed';
    await room.save();

    res.json({ message: 'Interview meeting ended successfully by interviewer.', room });
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

    room.evaluation = {
      interviewerId: currentUserId,
      problemSolving,
      codeQuality,
      communication,
      recommendation,
      notes,
      submittedAt: new Date()
    };
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
