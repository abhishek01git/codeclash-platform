import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  FileCode,
  PenTool,
  CheckCircle,
  Copy,
  Plus,
  Play,
  Coins,
  Send,
  Award,
  Share2,
  Users,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export default function InterviewRoomPage({ initialRoomId, initialRole }) {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [inRoom, setInRoom] = useState(false);
  const [role, setRole] = useState(initialRole || 'interviewer'); // 'interviewer' or 'candidate'
  const [activeTab, setActiveTab] = useState('code'); // 'code', 'whiteboard', 'feedback'
  const [copiedLink, setCopiedLink] = useState(false);

  // Room State
  const [room, setRoom] = useState(null);
  const [problem, setProblem] = useState(null);
  const [problemsList, setProblemsList] = useState([]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerName, setPeerName] = useState(role === 'interviewer' ? 'Candidate' : 'Interviewer');

  // Real Media Streams State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  // Video Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Evaluation Form (Interviewer)
  const [evalProblemSolving, setEvalProblemSolving] = useState(4);
  const [evalCodeQuality, setEvalCodeQuality] = useState(4);
  const [evalCommunication, setEvalCommunication] = useState(5);
  const [evalRecommendation, setEvalRecommendation] = useState('Hire');
  const [evalNotes, setEvalNotes] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // Whiteboard Canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#f59e0b');

  // Load problem catalog
  useEffect(() => {
    api.getProblems().then((res) => setProblemsList(res.problems || []));
  }, []);

  // Auto-join if initialRoomId is provided via URL
  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
      if (initialRole) setRole(initialRole);
      joinExistingRoom(initialRoomId, initialRole || 'candidate');
    }
  }, [initialRoomId]);

  // Join Existing Room
  const joinExistingRoom = async (targetRoomId, assignedRole) => {
    try {
      const res = await api.getInterviewRoom(targetRoomId);
      setRoom(res.room);
      setProblem(res.problem);
      setCode(res.room.code);
      setRole(assignedRole || (res.room.interviewerId === user?._id ? 'interviewer' : 'candidate'));
      setInRoom(true);
      startMediaDevices();
    } catch (err) {
      console.warn('Auto-join failed, room will be created or joined manually:', err.message);
    }
  };

  // Setup WebRTC Peer Connection
  const getPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    // Add local tracks to WebRTC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('interview_webrtc_signal', {
          roomId,
          signal: { type: 'candidate', candidate: event.candidate },
          senderId: user?._id
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setPeerConnected(true);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Start Real Media Devices (Camera & Mic)
  const startMediaDevices = async () => {
    setMediaError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add tracks to peer connection if active
        if (peerConnectionRef.current) {
          stream.getTracks().forEach((track) => {
            peerConnectionRef.current.addTrack(track, stream);
          });
        }
      }
    } catch (err) {
      console.warn('Media devices could not be started directly:', err.message);
      // Try audio only if camera is unavailable or denied
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioStream;
        setIsVideoOn(false);
      } catch (audioErr) {
        setMediaError('Camera/Mic permission not enabled in browser. Using avatar mode.');
        setIsVideoOn(false);
        setIsMicOn(false);
      }
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !isMicOn;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setIsMicOn(nextState);
        if (socket) {
          socket.emit('interview_call_state', {
            roomId,
            audioEnabled: nextState,
            videoEnabled: isVideoOn,
            role
          });
        }
        return;
      }
    }
    setIsMicOn(!isMicOn);
  };

  // Toggle Camera
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !isVideoOn;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setIsVideoOn(nextState);
        if (socket) {
          socket.emit('interview_call_state', {
            roomId,
            audioEnabled: isMicOn,
            videoEnabled: nextState,
            role
          });
        }
        return;
      }
    }
    setIsVideoOn(!isVideoOn);
  };

  // Real Screen Share (getDisplayMedia)
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (socket) {
        socket.emit('interview_screenshare_state', { roomId, isSharing: false, role });
      }
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          toastWarning('Screen sharing is not supported in this browser.');
          return;
        }

        const sStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        screenStreamRef.current = sStream;
        setIsScreenSharing(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = sStream;
        }

        // When user stops sharing via browser bar
        sStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (socket) {
            socket.emit('interview_screenshare_state', { roomId, isSharing: false, role });
          }
        };

        if (socket) {
          socket.emit('interview_screenshare_state', { roomId, isSharing: true, role });
        }
      } catch (err) {
        console.warn('Screen sharing cancelled:', err.message);
      }
    }
  };

  // Handle Socket Events inside room
  useEffect(() => {
    if (!socket || !inRoom || !roomId) return;

    socket.emit('join_interview', { roomId, userId: user?._id, role, username: user?.username });

    // When peer joins
    socket.on('interview_peer_joined', async ({ role: peerRole, username: pName }) => {
      setPeerConnected(true);
      if (pName) setPeerName(pName);

      // If interviewer, initiate WebRTC offer
      if (role === 'interviewer') {
        try {
          const pc = getPeerConnection();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('interview_webrtc_signal', {
            roomId,
            signal: offer,
            senderId: user?._id
          });
        } catch (e) {
          console.warn('WebRTC offer error:', e);
        }
      }
    });

    // WebRTC signaling
    socket.on('interview_webrtc_signal', async ({ signal, senderId }) => {
      if (senderId === user?._id) return;
      try {
        const pc = getPeerConnection();
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('interview_webrtc_signal', {
            roomId,
            signal: answer,
            senderId: user?._id
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (e) {
        console.warn('WebRTC signaling error:', e);
      }
    });

    // Screen Share State
    socket.on('interview_peer_screenshare', ({ isSharing }) => {
      setPeerScreenSharing(isSharing);
    });

    socket.on('interview_code_synced', (data) => {
      setCode(data.code);
      if (data.language) setLanguage(data.language);
    });

    socket.on('interview_question_changed', async (data) => {
      const pRes = await api.getProblemBySlug(data.problemSlug);
      setProblem(pRes.problem);
      setCode(pRes.problem.starterCode.javascript);
    });

    socket.on('interview_whiteboard_synced', ({ stroke }) => {
      drawRemoteStroke(stroke);
    });

    socket.on('interview_whiteboard_cleared', () => {
      clearCanvasLocal();
    });

    return () => {
      socket.off('interview_peer_joined');
      socket.off('interview_webrtc_signal');
      socket.off('interview_peer_screenshare');
      socket.off('interview_code_synced');
      socket.off('interview_question_changed');
      socket.off('interview_whiteboard_synced');
      socket.off('interview_whiteboard_cleared');
    };
  }, [socket, inRoom, roomId, role, user?._id]);

  // Create new interview session
  const handleCreateRoom = async () => {
    try {
      const res = await api.createInterviewRoom({ role });
      setRoom(res.room);
      setRoomId(res.room.roomId);
      setCode(res.room.code);
      const prob = await api.getProblemBySlug(res.room.problemSlug);
      setProblem(prob.problem);
      setInRoom(true);
      startMediaDevices();
    } catch (err) {
      toastError(err.message || 'Failed to create room');
    }
  };

  // Join existing interview session
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    try {
      const res = await api.getInterviewRoom(roomId.trim());
      setRoom(res.room);
      setProblem(res.problem);
      setCode(res.room.code);
      setInRoom(true);
      startMediaDevices();
    } catch (err) {
      toastError('Room not found! Check your Room ID or create a new room.');
    }
  };

  // Synchronize Code Change to peer
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (socket && inRoom) {
      socket.emit('interview_code_update', { roomId, code: newCode, language });
    }
  };

  // Switch Question (Interviewer)
  const handleSwitchProblem = async (slug) => {
    try {
      const pRes = await api.getProblemBySlug(slug);
      setProblem(pRes.problem);
      setCode(pRes.problem.starterCode.javascript);
      if (socket) {
        socket.emit('interview_change_question', {
          roomId,
          problemSlug: pRes.problem.slug,
          problemTitle: pRes.problem.title
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Code in interview
  const handleRunCode = async () => {
    if (!problem) return;
    setIsRunning(true);
    try {
      const data = await api.runCode(problem.slug, { code, language });
      setRunResult(data.result);
    } catch (err) {
      toastError(err.message || 'Error running code');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Evaluation
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    setSubmittingEval(true);
    try {
      const res = await api.submitInterviewFeedback(roomId, {
        problemSolving: evalProblemSolving,
        codeQuality: evalCodeQuality,
        communication: evalCommunication,
        recommendation: evalRecommendation,
        notes: evalNotes
      });
      toastSuccess(res.message);
      await refreshUser();
    } catch (err) {
      toastError(err.message || 'Failed to submit evaluation');
    } finally {
      setSubmittingEval(false);
    }
  };

  // Copy Full Shareable Invite Link
  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/?interview=${roomId}&role=candidate`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Whiteboard Canvas Drawing Logic
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();

    if (socket && inRoom) {
      socket.emit('interview_whiteboard_stroke', {
        roomId,
        stroke: { x, y, color: drawColor }
      });
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawRemoteStroke = ({ x, y, color }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color || '#f59e0b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearWhiteboard = () => {
    clearCanvasLocal();
    if (socket && inRoom) {
      socket.emit('interview_whiteboard_clear', { roomId });
    }
  };

  if (!inRoom) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-white">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-lg">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Live Technical Interview Platform
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Create an interview room, send the link to your candidate or student, code together in real-time with camera, microphone, screen sharing, and an interactive system design whiteboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room Box */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-base mb-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Interviewer: Start Interview Session
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Generate an interview room and get an invitation link to send to the student.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Your Role in this Session:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('interviewer')}
                      className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        role === 'interviewer'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400'
                      }`}
                    >
                      Interviewer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('candidate')}
                      className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        role === 'candidate'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400'
                      }`}
                    >
                      Candidate / Student
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Both participants earn <span className="font-bold">+50 Coins</span> upon interview completion!
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              Create Interview Room & Generate Student Link
            </button>
          </div>

          {/* Join Room Box */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-base mb-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Student / Candidate: Join Session
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Received a code or invitation link from your interviewer? Enter the room code below:
              </p>

              <form onSubmit={handleJoinRoom} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Interview Room Code:</label>
                  <input
                    type="text"
                    placeholder="e.g. room_7X29M"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </form>
            </div>

            <button
              onClick={handleJoinRoom}
              className="w-full py-3 bg-[#21262d] hover:bg-[#30363d] text-white font-bold text-xs rounded-xl transition border border-[#30363d] cursor-pointer"
            >
              Join Interview Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Interview Session Room
  const inviteUrl = `${window.location.origin}/?interview=${roomId}&role=candidate`;

  return (
    <div className="h-[calc(100vh-61px)] flex flex-col bg-[#0d1117] overflow-hidden text-white">
      {/* Top Header Bar with Student Link Banner */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-6 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setInRoom(false)}
            className="text-xs px-2.5 py-1 rounded bg-[#21262d] text-gray-400 hover:text-white transition"
          >
            Leave Room
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">Technical Interview</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
              {roomId}
            </span>
          </div>

          <span className="text-xs text-gray-400 bg-[#21262d] px-2.5 py-0.5 rounded-full font-medium">
            Role: <span className="font-bold text-amber-400 capitalize">{role}</span>
          </span>

          {/* Copy Full Student Invite Link Button */}
          <button
            onClick={copyInviteLink}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              copiedLink
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
            title="Click to copy full student interview link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Student Link Copied!' : 'Copy Student Invite Link'}
          </button>
        </div>

        {/* View Mode Tabs (Code, Whiteboard, Scorecard) */}
        <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Live Coding
          </button>
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'whiteboard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> System Design Whiteboard
          </button>
          {role === 'interviewer' && (
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'feedback' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Scorecard
            </button>
          )}
        </div>

        {/* Real Audio / Video / Screen Share Controls */}
        <div className="flex items-center gap-2">
          {/* Mic */}
          <button
            onClick={handleToggleMic}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isMicOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isMicOn ? 'Mic On' : 'Muted'}</span>
          </button>

          {/* Camera */}
          <button
            onClick={handleToggleVideo}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isVideoOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
            title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {isVideoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isVideoOn ? 'Cam On' : 'Cam Off'}</span>
          </button>

          {/* Real Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isScreenSharing
                ? 'bg-amber-500 text-black border-amber-400 shadow-md animate-pulse'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
            }`}
            title="Share your screen with candidate/interviewer"
          >
            <MonitorUp className="w-3.5 h-3.5" />
            <span>{isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}</span>
          </button>
        </div>
      </div>

      {/* Screen Share Live Presentation Container */}
      {(isScreenSharing || peerScreenSharing) && (
        <div className="bg-[#0a0d12] border-b border-[#30363d] p-3 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-4xl mb-1 text-xs">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <MonitorUp className="w-4 h-4" />
              {isScreenSharing ? 'You are sharing your screen' : `${peerName} is sharing their screen`}
            </span>
            {isScreenSharing && (
              <button
                onClick={handleToggleScreenShare}
                className="px-2.5 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold"
              >
                Stop Sharing
              </button>
            )}
          </div>
          <div className="w-full max-w-4xl h-56 bg-black rounded-xl overflow-hidden border border-[#30363d]">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Main Interview Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Problem Details, Question Switcher, and Real Video Streams */}
        <div className="w-full md:w-1/3 border-r border-[#30363d] bg-[#0d1117] flex flex-col overflow-hidden">
          {/* Question Switcher (Interviewer only) */}
          {role === 'interviewer' && (
            <div className="p-3 border-b border-[#30363d] bg-[#161b22]">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Interviewer Control: Change Problem
              </label>
              <select
                value={problem?.slug || ''}
                onChange={(e) => handleSwitchProblem(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {problemsList.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title} ({p.difficulty})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Problem Statement */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{problem?.title}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {problem?.difficulty}
              </span>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-gray-300 font-sans">
              {problem?.description}
            </p>

            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-white text-xs">Examples:</h4>
              {problem?.examples?.map((ex, idx) => (
                <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-[11px] font-mono space-y-1">
                  <div>
                    <span className="text-gray-400">Input: </span>
                    <span className="text-amber-300">{ex.input}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Output: </span>
                    <span className="text-emerald-400">{ex.output}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Video Feeds (Local & Remote) */}
            <div className="pt-3 border-t border-[#21262d]">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                <span>Live Audio/Video Call</span>
                <span className={`text-[10px] ${peerConnected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                  {peerConnected ? '● Connected' : 'Waiting for Peer to connect'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Local Video Stream */}
                <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden h-32 flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
                  />
                  {!isVideoOn && (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <img src={user?.avatar} alt="" className="w-10 h-10 rounded-full border border-emerald-500 mb-1" />
                      <span className="text-[10px] font-bold text-white">{user?.username}</span>
                      <span className="text-[9px] text-gray-400">Cam Off</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-white flex items-center gap-1">
                    <span>You ({role})</span>
                    {isMicOn ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-red-400" />}
                  </div>
                </div>

                {/* Remote Peer Video Stream */}
                <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden h-32 flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${!peerConnected ? 'hidden' : ''}`}
                  />
                  {!peerConnected && (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400">
                      <div className="w-10 h-10 rounded-full bg-[#0d1117] border border-blue-500/50 flex items-center justify-center mb-1">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-white">{peerName}</span>
                      <span className="text-[9px] text-amber-400">Connecting...</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-white">
                    {peerName} ({role === 'interviewer' ? 'Candidate' : 'Interviewer'})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right: Tab View (Code, Whiteboard, Scorecard) */}
        <div className="flex-1 flex flex-col bg-[#161b22] overflow-hidden">
          {activeTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[11px] font-bold">Collaborative Editor</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400">Real-Time Synced</span>
                </div>

                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isRunning ? 'Evaluating...' : 'Test Run Code'}
                </button>
              </div>

              <div className="flex-1 relative min-h-[300px]">
                <Editor
                  height="100%"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => handleCodeChange(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: 'Consolas, monospace',
                    automaticLayout: true
                  }}
                />
              </div>

              {runResult && (
                <div className="h-40 border-t border-[#30363d] bg-[#0d1117] p-4 text-xs font-mono overflow-y-auto">
                  <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Passed {runResult.passedTestCases} / {runResult.totalTestCases} Test Cases ({runResult.runtime} ms)
                  </div>
                  {runResult.failedTestCase && (
                    <div className="text-rose-400 text-[11px]">
                      Failed on: {runResult.failedTestCase.input}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'whiteboard' && (
            <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
              <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-300 font-bold">System Design Whiteboard</span>
                  <div className="flex items-center gap-1">
                    {['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#ffffff'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setDrawColor(c)}
                        className={`w-5 h-5 rounded-full border transition ${
                          drawColor === c ? 'ring-2 ring-white scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleClearWhiteboard}
                  className="px-3 py-1 bg-[#21262d] text-gray-300 hover:text-white rounded text-xs"
                >
                  Clear Canvas
                </button>
              </div>

              <div className="flex-1 relative bg-[#0a0d12] cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={800}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Candidate Evaluation Scorecard
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Grade candidate across engineering competencies. Both participants receive +50 bonus coins upon submission!
                </p>
              </div>

              <form onSubmit={handleSubmitEvaluation} className="space-y-5 bg-[#0d1117] p-6 rounded-2xl border border-[#30363d]">
                {/* Problem Solving */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-300">1. Problem Solving & Algorithmic Complexity</span>
                    <span className="text-amber-400 font-bold">{evalProblemSolving} / 5 Stars</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={evalProblemSolving}
                    onChange={(e) => setEvalProblemSolving(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Code Quality */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-300">2. Code Quality, Modularity & Edge Cases</span>
                    <span className="text-amber-400 font-bold">{evalCodeQuality} / 5 Stars</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={evalCodeQuality}
                    onChange={(e) => setEvalCodeQuality(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Communication */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-300">3. Technical Communication & Structure</span>
                    <span className="text-amber-400 font-bold">{evalCommunication} / 5 Stars</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={evalCommunication}
                    onChange={(e) => setEvalCommunication(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Recommendation */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Hiring Recommendation:</label>
                  <select
                    value={evalRecommendation}
                    onChange={(e) => setEvalRecommendation(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Strong Hire">Strong Hire (Top 5%)</option>
                    <option value="Hire">Hire</option>
                    <option value="Leaning Hire">Leaning Hire</option>
                    <option value="No Hire">No Hire</option>
                  </select>
                </div>

                {/* Detailed Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Detailed Feedback & Notes:</label>
                  <textarea
                    rows="4"
                    placeholder="Candidate demonstrated great understanding of algorithms and clean code..."
                    value={evalNotes}
                    onChange={(e) => setEvalNotes(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingEval}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Award className="w-4 h-4 fill-black" />
                  {submittingEval ? 'Submitting...' : 'Submit Evaluation (+50 Coins)'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
