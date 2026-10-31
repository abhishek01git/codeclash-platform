export function setupSockets(io) {
  const onlineUsers = new Map(); // userId -> Set of socketIds

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
      socket.join(room);
      // Notify existing peers that someone joined
      socket.to(room).emit('interview_peer_joined', { userId, role, username });
    });

    // WebRTC Signaling (Offer, Answer, ICE Candidate)
    socket.on('interview_webrtc_signal', ({ roomId, signal, senderId }) => {
      socket.to(`interview_${roomId}`).emit('interview_webrtc_signal', { signal, senderId });
    });

    // Screen Share State
    socket.on('interview_screenshare_state', ({ roomId, isSharing, role }) => {
      socket.to(`interview_${roomId}`).emit('interview_peer_screenshare', { isSharing, role });
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

    socket.on('interview_call_state', ({ roomId, audioEnabled, videoEnabled, role }) => {
      socket.to(`interview_${roomId}`).emit('interview_peer_media_state', { audioEnabled, videoEnabled, role });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
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
