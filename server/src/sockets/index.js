import { InterviewRoom } from '../models/InterviewRoom.js';

export function setupSockets(io) {
  const onlineUsers = new Map(); // userId -> Set of socketIds
  // roomId -> Map<socketId, share metadata>. This lets a late-joining
  // participant immediately see an already-active screen presentation.
  const activeScreenShares = new Map();
  // roomId -> Map<socketId, participant metadata>. The interviewer can enter
  // after a candidate's camera is ready, so readiness must survive that order.
  const mediaReadyParticipants = new Map();
  // roomId -> Map<socketId, participant metadata>. A joining participant also
  // needs to know who is already in the room (not only the other way around).
  const interviewParticipants = new Map();

  io.on('connection', (socket) => {
    let currentUserId = null;

    socket.on('register_user', (userId) => {
      // Demo-account switching can reuse the same browser socket. Remove its
      // old identity first so messages are delivered only to the active user.
      if (currentUserId && currentUserId !== userId && onlineUsers.has(currentUserId)) {
        const previousUserSockets = onlineUsers.get(currentUserId);
        previousUserSockets.delete(socket.id);
        if (previousUserSockets.size === 0) onlineUsers.delete(currentUserId);
      }
      currentUserId = userId;
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);
      io.emit('online_users_list', Array.from(onlineUsers.keys()));
    });

    // ==========================================
    // 1v1 DUEL ARENA SOCKET EVENTS
    // ==========================================
    socket.on('join_duel', ({ duelId, userId, username }) => {
      const room = `duel_${duelId}`;
      socket.join(room);
      socket.to(room).emit('duel_opponent_joined', { userId, username });
    });

    socket.on('duel_progress', ({ duelId, userId, passed, total }) => {
      const room = `duel_${duelId}`;
      socket.to(room).emit('opponent_progress', {
        userId,
        passed,
        total,
        timestamp: Date.now()
      });
    });

    socket.on('duel_code_typing', ({ duelId, userId, codeLength }) => {
      socket.to(`duel_${duelId}`).emit('opponent_typing', { userId, codeLength });
    });

    socket.on('duel_finished', ({ duelId, winnerId, winnerName, pot }) => {
      io.to(`duel_${duelId}`).emit('duel_game_over', {
        winnerId,
        winnerName,
        pot,
        completedAt: new Date().toISOString()
      });
    });

    socket.on('duel_chat_message', ({ duelId, senderName, content }) => {
      io.to(`duel_${duelId}`).emit('duel_chat_broadcast', {
        senderName,
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // ==========================================
    // 1-ON-1 DIRECT CHAT EVENTS
    // ==========================================
    socket.on('send_chat_message', (message) => {
      const recipientSockets = onlineUsers.get(message.recipient);
      if (recipientSockets) {
        recipientSockets.forEach((sockId) => {
          io.to(sockId).emit('receive_chat_message', message);
        });
      }
    });

    socket.on('typing_indicator', ({ recipientId, isTyping, senderName }) => {
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((sockId) => {
          io.to(sockId).emit('user_is_typing', { isTyping, senderName, senderId: currentUserId });
        });
      }
    });

    // GROUP CHAT EVENTS
    socket.on('join_group_chat', ({ groupId }) => {
      socket.join(`group_${groupId}`);
    });

    socket.on('send_group_message', ({ groupId, message }) => {
      socket.to(`group_${groupId}`).emit('receive_group_message', { groupId, message });
    });

    // ==========================================
    // LIVE INTERVIEW ROOM & WEBRTC EVENTS
    // ==========================================
    socket.on('join_interview', ({ roomId, userId, role, username }) => {
      const room = `interview_${roomId}`;
      if (!interviewParticipants.has(roomId)) interviewParticipants.set(roomId, new Map());
      const participants = interviewParticipants.get(roomId);
      socket.join(room);

      // Tell the new participant whether the existing person is interviewer
      // or candidate, so their remote camera card has the correct identity.
      participants.forEach((participant, participantSocketId) => {
        if (participantSocketId !== socket.id) {
          socket.emit('interview_peer_joined', participant);
        }
      });
      const joiningParticipant = { userId, role, username };
      participants.set(socket.id, joiningParticipant);
      const activeShares = activeScreenShares.get(roomId);
      activeShares?.forEach((share, sharingSocketId) => {
        if (sharingSocketId !== socket.id) {
          socket.emit('interview_peer_screenshare', share);
        }
      });
      const readyParticipants = mediaReadyParticipants.get(roomId);
      readyParticipants?.forEach((participant, readySocketId) => {
        if (readySocketId !== socket.id) {
          socket.emit('interview_peer_media_ready', participant);
        }
      });
      // Notify existing peers that someone joined
      socket.to(room).emit('interview_peer_joined', joiningParticipant);
    });

    // WebRTC Signaling (Offer, Answer, ICE Candidate)
    socket.on('interview_webrtc_signal', ({ roomId, signal, senderId }) => {
      socket.to(`interview_${roomId}`).emit('interview_webrtc_signal', { signal, senderId });
    });

    // A peer connection is ready to receive the first offer. This avoids the
    // camera-permission race that previously made video appear only after a
    // screen-share renegotiation.
    socket.on('interview_media_ready', ({ roomId, userId, role, username }) => {
      if (!mediaReadyParticipants.has(roomId)) mediaReadyParticipants.set(roomId, new Map());
      const participant = { userId, role, username };
      mediaReadyParticipants.get(roomId).set(socket.id, participant);
      socket.to(`interview_${roomId}`).emit('interview_peer_media_ready', participant);
    });

    // Screen Share State
    socket.on('interview_screenshare_state', ({ roomId, isSharing, role, username }) => {
      if (!activeScreenShares.has(roomId)) activeScreenShares.set(roomId, new Map());
      const shares = activeScreenShares.get(roomId);
      const share = { isSharing: Boolean(isSharing), role, username };
      if (isSharing) {
        shares.set(socket.id, share);
      } else {
        shares.delete(socket.id);
        if (shares.size === 0) activeScreenShares.delete(roomId);
      }
      socket.to(`interview_${roomId}`).emit('interview_peer_screenshare', { isSharing, role, username });
    });

    socket.on('interview_code_update', ({ roomId, code, language }) => {
      socket.to(`interview_${roomId}`).emit('interview_code_synced', { code, language });
    });

    socket.on('interview_whiteboard_stroke', ({ roomId, stroke }) => {
      socket.to(`interview_${roomId}`).emit('interview_whiteboard_synced', { stroke });
    });

    socket.on('interview_whiteboard_clear', ({ roomId }) => {
      socket.to(`interview_${roomId}`).emit('interview_whiteboard_cleared');
    });

    socket.on('interview_change_question', ({ roomId, problemSlug, problemTitle }) => {
      io.to(`interview_${roomId}`).emit('interview_question_changed', { problemSlug, problemTitle });
    });

    socket.on('interview_notes_change', ({ roomId, notes }) => {
      socket.to(`interview_${roomId}`).emit('interview_notes_synced', { notes });
    });

    socket.on('interview_call_state', ({ roomId, audioEnabled, videoEnabled, role, username }) => {
      socket.to(`interview_${roomId}`).emit('interview_peer_media_state', { audioEnabled, videoEnabled, role, username });
    });

    // In-Room Live Chat Message
    socket.on('interview_chat_message', ({ roomId, senderName, senderRole, content, timestamp }) => {
      io.to(`interview_${roomId}`).emit('interview_chat_received', {
        senderName,
        senderRole,
        content,
        timestamp: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // Switch Selected Platform Tab (sync between interviewer & candidate)
    socket.on('interview_switch_platform', ({ roomId, platform, switchedBy }) => {
      socket.to(`interview_${roomId}`).emit('interview_platform_switched', { platform, switchedBy });
    });

    // Meeting Recording Notification
    socket.on('interview_recording_state', ({ roomId, isRecording, startedBy }) => {
      io.to(`interview_${roomId}`).emit('interview_recording_status', { isRecording, startedBy });
    });

    // Participant leaves room (Temporary disconnect or step out — meeting stays active!)
    socket.on('interview_leave_room', ({ roomId, username, role }) => {
      socket.leave(`interview_${roomId}`);
      const shares = activeScreenShares.get(roomId);
      if (shares?.delete(socket.id)) {
        socket.to(`interview_${roomId}`).emit('interview_peer_screenshare', { isSharing: false, role, username });
      }
      if (shares?.size === 0) activeScreenShares.delete(roomId);
      const readyParticipants = mediaReadyParticipants.get(roomId);
      readyParticipants?.delete(socket.id);
      if (readyParticipants?.size === 0) mediaReadyParticipants.delete(roomId);
      const participants = interviewParticipants.get(roomId);
      participants?.delete(socket.id);
      if (participants?.size === 0) interviewParticipants.delete(roomId);
      socket.to(`interview_${roomId}`).emit('interview_peer_left', {
        username,
        role,
        message: `${username || 'Participant'} temporarily left the room. Meeting remains open for rejoin.`
      });
    });

    // Official Meeting End — ONLY when Interviewer ends meeting!
    socket.on('interview_end_meeting', async ({ roomId, userId, username }) => {
      io.to(`interview_${roomId}`).emit('interview_meeting_ended', {
        endedBy: username || 'Interviewer',
        message: 'The interviewer has concluded this interview meeting.'
      });
      try {
        await InterviewRoom.findOneAndUpdate(
          { $or: [{ roomId }, { _id: roomId }] },
          { status: 'completed' }
        );
      } catch (err) {
        console.error('Error completing interview room:', err.message);
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      // Stop notifying stale screen shares if a browser closes without first
      // pressing the leave button.
      for (const [roomId, shares] of activeScreenShares.entries()) {
        if (shares.delete(socket.id)) {
          io.to(`interview_${roomId}`).emit('interview_peer_screenshare', { isSharing: false });
        }
        if (shares.size === 0) activeScreenShares.delete(roomId);
      }
      for (const [roomId, participants] of mediaReadyParticipants.entries()) {
        participants.delete(socket.id);
        if (participants.size === 0) mediaReadyParticipants.delete(roomId);
      }
      for (const [roomId, participants] of interviewParticipants.entries()) {
        participants.delete(socket.id);
        if (participants.size === 0) interviewParticipants.delete(roomId);
      }
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSet = onlineUsers.get(currentUserId);
        userSet.delete(socket.id);
        if (userSet.size === 0) {
          onlineUsers.delete(currentUserId);
        }
        io.emit('online_users_list', Array.from(onlineUsers.keys()));
      }
    });
  });
}
