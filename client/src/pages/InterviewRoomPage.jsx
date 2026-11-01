import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
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
  Users,
  Check,
  RotateCcw,
  Calendar,
  Clock,
  Mail,
  CircleDot,
  Radio,
  MessageSquare,
  Sparkles,
  Maximize2,
  LogOut,
  ExternalLink,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export default function InterviewRoomPage({ initialRoomId, initialRole }) {
  const { user, refreshUser } = useAuth();
  const { socket } = useSocket();
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo, confirm } = useToast();

  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [inRoom, setInRoom] = useState(false);
  const [role, setRole] = useState(initialRole || 'interviewer'); // 'interviewer' or 'candidate'
  const [activeTab, setActiveTab] = useState('code'); // 'code', 'whiteboard', 'screenshare', 'feedback'
  const [copiedLink, setCopiedLink] = useState(false);

  // Active / Rejoinable sessions & Scheduled modal
  const [myRooms, setMyRooms] = useState([]);
  const [scheduledInviteModal, setScheduledInviteModal] = useState(null);

  // Platform choice modal when candidate/student enters room
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

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
  const [peerRole, setPeerRole] = useState('candidate');

  // Real Media Streams State
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [peerAudioOn, setPeerAudioOn] = useState(true);
  const [peerVideoOn, setPeerVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);

  // Video Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const remoteScreenStreamRef = useRef(null);
  const remoteStreamsRef = useRef(new Map());
  const peerScreenSharingRef = useRef(false);
  const peerPresentRef = useRef(false);
  const peerMediaReadyRef = useRef(false);
  const localMediaReadyRef = useRef(false);
  const joinedInterviewRef = useRef(false);
  const pendingSignalsRef = useRef([]);
  const processWebrtcSignalRef = useRef(null);
  const screenSenderRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const candidateQueue = useRef([]);

  // In-Meeting Chat
  const [chatMessages, setChatMessages] = useState([
    {
      senderName: 'System',
      senderRole: 'system',
      content: 'Welcome to the Live Interview Session! HD Audio/Video, synced platform, and meeting recording are active.',
      timestamp: 'Now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const chatBottomRef = useRef(null);

  // Independent Meeting Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Schedule Interview Form State (Interviewer)
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [schedulePlatform, setSchedulePlatform] = useState('code');
  const [scheduleProblemSlug, setScheduleProblemSlug] = useState('two-sum');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [creatingSchedule, setCreatingSchedule] = useState(false);

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
    api.getProblems().then((res) => {
      const list = res.problems || [];
      setProblemsList(list);
      if (list.length > 0) setScheduleProblemSlug(list[0].slug);
    });
  }, []);

  // Fetch user's active / scheduled interviews for quick rejoin
  const fetchMyRooms = async () => {
    try {
      const res = await api.getMyInterviewRooms();
      setMyRooms(res.rooms || []);
    } catch (e) {
      console.error('Error fetching my interview rooms:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyRooms();
    }
  }, [user, inRoom]);

  // Check if user was in a meeting before page reload
  useEffect(() => {
    const saved = sessionStorage.getItem('activeInterviewRoom');
    if (saved && !inRoom && !initialRoomId) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.roomId) {
          // Pre-populate roomId so user can rejoin in 1 click
          setRoomId(parsed.roomId);
        }
      } catch (e) {}
    }
  }, [inRoom, initialRoomId]);

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
      setRoomId(res.room.roomId);
      setProblem(res.problem);
      setCode(res.room.code);

      // ROLE ASSIGNMENT:
      // If student joins using room code or candidate link, role MUST be candidate!
      // Only the host/interviewer who created it remains interviewer.
      const isHostInterviewer = res.room.interviewerId === user?._id || (res.room.hostId === user?._id && res.room.hostRole === 'interviewer');
      const userRole = assignedRole === 'candidate' ? 'candidate' : (isHostInterviewer ? 'interviewer' : 'candidate');
      setRole(userRole);
      setInRoom(true);
      setShowPlatformPicker(true);
      sessionStorage.setItem('activeInterviewRoom', JSON.stringify({ roomId: res.room.roomId, role: userRole }));
      startMediaDevices(userRole);
    } catch (err) {
      toastError('Interview room not found! Check your Room code or invitation link.');
    }
  };

  // Recording Timer
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showChatDrawer]);

  // STUN discovers public addresses. Configure a TURN server in production so
  // calls also work when either participant is behind a strict firewall/NAT.
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      ...(import.meta.env.VITE_TURN_URL
        ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL
          }]
        : [])
    ]
  };

  // getUserMedia runs before React has rendered the in-room video elements.
  // Attach the retained streams whenever those elements become available.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play?.().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play?.().catch(() => {});
    }
    if (screenVideoRef.current) {
      const stream = isScreenSharing
        ? screenStreamRef.current
        : peerScreenSharing
          ? remoteScreenStreamRef.current
          : null;
      if (stream) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.play?.().catch(() => {});
      }
    }
  }, [inRoom, activeTab, isScreenSharing, peerScreenSharing]);

  const refreshRemoteScreen = () => {
    const cameraStreamId = remoteStreamRef.current?.id;
    const screenStream = [...remoteStreamsRef.current.values()].find((stream) => (
      stream.id !== cameraStreamId && stream.getVideoTracks().length > 0
    ));
    remoteScreenStreamRef.current = screenStream || null;
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play?.().catch(() => {});
    }
  };

  // Start Real Audio & Video Media Devices
  const startMediaDevices = async (sessionRole = role) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toastWarning('Camera and microphone are unavailable in this browser. Use HTTPS (or localhost) and grant permissions.');
        initPeerConnection(null, sessionRole);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      setIsMicOn(stream.getAudioTracks().some((track) => track.enabled));
      setIsVideoOn(stream.getVideoTracks().some((track) => track.enabled));
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play?.().catch(() => {});
      }

      initPeerConnection(stream, sessionRole);
    } catch (err) {
      console.warn('Microphone/Camera access not granted or unavailable:', err.message);
      setIsMicOn(false);
      setIsVideoOn(false);
      toastWarning('Camera/microphone permission was not granted. You can still join, but your media will remain off.');
      initPeerConnection(null, sessionRole);
    }
  };

  const initPeerConnection = (stream, sessionRole = role) => {
    if (!window.RTCPeerConnection) return;

    peerConnectionRef.current?.close();
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // An offer can arrive while this participant is approving camera access.
    // Process anything queued by the socket handler once the connection exists.
    queueMicrotask(() => {
      const queuedSignals = pendingSignalsRef.current.splice(0);
      queuedSignals.forEach(({ signal, senderId }) => {
        processWebrtcSignalRef.current?.({ signal, senderId });
      });
    });

    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      remoteStreamsRef.current.set(remoteStream.id, remoteStream);

      // The camera/mic stream is the stream that carries audio (or the first
      // stream before a separate screen track arrives). Screen share is sent
      // as its own stream, so the camera never has to be replaced.
      if (!remoteStreamRef.current || remoteStream.getAudioTracks().length > 0) {
        remoteStreamRef.current = remoteStream;
      }
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play?.().catch(() => {});
        setPeerConnected(true);
      }
      peerPresentRef.current = true;
      if (peerScreenSharingRef.current) {
        refreshRemoteScreen();
      }
    };

    pc.onconnectionstatechange = () => {
      const connected = ['connected', 'completed'].includes(pc.connectionState);
      if (connected) {
        peerPresentRef.current = true;
        setPeerConnected(true);
      }
      if (['failed', 'closed'].includes(pc.connectionState)) {
        peerPresentRef.current = false;
        setPeerConnected(false);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && roomId) {
        socket.emit('interview_webrtc_signal', {
          roomId,
          signal: { type: 'candidate', candidate: event.candidate },
          senderId: user?._id
        });
      }
    };

    // The room may not yet have been joined when camera permission resolves.
    // Record readiness now; the socket effect emits it immediately after join.
    localMediaReadyRef.current = true;
    if (joinedInterviewRef.current && socket) {
      socket.emit('interview_media_ready', { roomId, userId: user?._id, role: sessionRole, username: user?.username });
    }

    // If the candidate was ready before the interviewer, create the first
    // offer only now that the interviewer's own peer connection exists.
    if (sessionRole === 'interviewer' && (peerPresentRef.current || peerMediaReadyRef.current)) {
      createOfferAndSignal();
    }
  };

  // WebRTC Renegotiation Helper (Creates offer and sends over socket)
  const createOfferAndSignal = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState !== 'stable') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socket && roomId) {
        socket.emit('interview_webrtc_signal', {
          roomId,
          signal: { type: 'offer', offer },
          senderId: user?._id
        });
      }
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
    }
  };

  // Socket.io Real-time Event listeners
  useEffect(() => {
    if (!socket || !inRoom || !roomId) return;

    const handlePeerJoined = async ({ userId, role: pRole, username }) => {
      peerPresentRef.current = true;
      setPeerName(username || (pRole === 'interviewer' ? 'Interviewer' : 'Candidate'));
      setPeerRole(pRole || 'candidate');
      setPeerConnected(true);
      toastInfo(`${username || 'Participant'} joined the interview room!`);

      // Send an initial offer right away. If the candidate is still granting
      // permissions, their signal queue will safely process it a moment later.
      if (role === 'interviewer' && peerConnectionRef.current) {
        createOfferAndSignal();
      }

    };

    const handlePeerMediaReady = ({ userId, role: pRole, username }) => {
      peerPresentRef.current = true;
      peerMediaReadyRef.current = true;
      setPeerName(username || (pRole === 'interviewer' ? 'Interviewer' : 'Candidate'));
      setPeerRole(pRole || 'candidate');
      // The interviewer is the single initial offerer. Waiting for this event
      // prevents an offer from being lost while the candidate opens getUserMedia.
      if (role === 'interviewer' && peerConnectionRef.current) {
        createOfferAndSignal();
      }
    };

    const handleWebrtcSignal = async ({ signal, senderId }) => {
      if (senderId === user?._id) return;
      peerPresentRef.current = true;
      const pc = peerConnectionRef.current;
      if (!pc) {
        pendingSignalsRef.current.push({ signal, senderId });
        return;
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          // Drain buffered ICE candidates
          while (candidateQueue.current.length > 0) {
            const cand = candidateQueue.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('interview_webrtc_signal', {
            roomId,
            signal: { type: 'answer', answer },
            senderId: user?._id
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
          // Drain buffered ICE candidates
          while (candidateQueue.current.length > 0) {
            const cand = candidateQueue.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {}
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            candidateQueue.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('WebRTC Signaling error:', err);
      }
    };

    processWebrtcSignalRef.current = handleWebrtcSignal;

    const handlePeerScreenShare = ({ isSharing, role: pRole, username }) => {
      peerScreenSharingRef.current = isSharing;
      setPeerScreenSharing(isSharing);
      if (isSharing) {
        setActiveTab('screenshare');
        toastInfo(`${username || peerName} started screen sharing!`);
        setTimeout(() => {
          refreshRemoteScreen();
        }, 300);
      } else {
        remoteScreenStreamRef.current = null;
        toastInfo(`${username || peerName} stopped screen sharing.`);
      }
    };

    const handlePeerMediaState = ({ audioEnabled, videoEnabled, username }) => {
      setPeerAudioOn(audioEnabled);
      setPeerVideoOn(videoEnabled);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = !audioEnabled;
      }
      if (!audioEnabled) {
        toastInfo(`${username || peerName} muted their microphone.`);
      }
      if (!videoEnabled) {
        toastInfo(`${username || peerName} turned off their camera.`);
      }
    };

    const handleMeetingEnded = ({ endedBy, message }) => {
      toastWarning(message || 'The interviewer has concluded this interview meeting.');
      stopMediaTracks();
      setInRoom(false);
      sessionStorage.removeItem('activeInterviewRoom');
      fetchMyRooms();
    };

    const handlePeerLeft = ({ username, message }) => {
      peerPresentRef.current = false;
      toastInfo(message || `${username || 'Participant'} stepped out. The room remains open.`);
      setPeerConnected(false);
    };

    const handleCodeSynced = ({ code: sCode, language: sLang }) => {
      setCode(sCode);
      if (sLang) setLanguage(sLang);
    };

    const handleQuestionChanged = ({ problemSlug: pSlug, problemTitle: pTitle }) => {
      api.getProblemBySlug(pSlug).then((pRes) => {
        setProblem(pRes.problem);
        setCode(pRes.problem.starterCode.javascript);
        toastInfo(`Interviewer switched problem to: ${pTitle}`);
      });
    };

    const handleWhiteboardSynced = ({ stroke }) => {
      drawRemoteStroke(stroke);
    };

    const handleWhiteboardCleared = () => {
      clearCanvasLocal();
    };

    const handleChatReceived = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const handlePlatformSwitched = ({ platform, switchedBy }) => {
      setActiveTab(platform);
      toastInfo(`${switchedBy || 'Participant'} switched view to ${platform === 'code' ? 'Live Coding' : platform === 'whiteboard' ? 'System Design Whiteboard' : 'Screen Share'}`);
    };

    const handleRecordingStatus = ({ isRecording: recState, startedBy }) => {
      if (recState) {
        toastInfo(`🎙️ ${startedBy || 'Participant'} started recording this interview meeting.`);
      } else {
        toastInfo(`🎙️ Interview meeting recording stopped.`);
      }
    };

    socket.on('interview_peer_joined', handlePeerJoined);
    socket.on('interview_peer_media_ready', handlePeerMediaReady);
    socket.on('interview_webrtc_signal', handleWebrtcSignal);
    socket.on('interview_peer_screenshare', handlePeerScreenShare);
    socket.on('interview_code_synced', handleCodeSynced);
    socket.on('interview_question_changed', handleQuestionChanged);
    socket.on('interview_whiteboard_synced', handleWhiteboardSynced);
    socket.on('interview_whiteboard_cleared', handleWhiteboardCleared);
    socket.on('interview_chat_received', handleChatReceived);
    socket.on('interview_platform_switched', handlePlatformSwitched);
    socket.on('interview_recording_status', handleRecordingStatus);
    socket.on('interview_peer_media_state', handlePeerMediaState);
    socket.on('interview_meeting_ended', handleMeetingEnded);
    socket.on('interview_peer_left', handlePeerLeft);

    // Subscribe before joining so a current screen-share state or an offer
    // cannot arrive in the small window before these handlers exist.
    joinedInterviewRef.current = true;
    socket.emit('join_interview', {
      roomId,
      userId: user?._id,
      role,
      username: user?.username || 'Peer'
    });
    if (localMediaReadyRef.current) {
      socket.emit('interview_media_ready', { roomId, userId: user?._id, role, username: user?.username || 'Peer' });
    }

    return () => {
      joinedInterviewRef.current = false;
      if (processWebrtcSignalRef.current === handleWebrtcSignal) {
        processWebrtcSignalRef.current = null;
      }
      socket.off('interview_peer_joined', handlePeerJoined);
      socket.off('interview_peer_media_ready', handlePeerMediaReady);
      socket.off('interview_webrtc_signal', handleWebrtcSignal);
      socket.off('interview_peer_screenshare', handlePeerScreenShare);
      socket.off('interview_code_synced', handleCodeSynced);
      socket.off('interview_question_changed', handleQuestionChanged);
      socket.off('interview_whiteboard_synced', handleWhiteboardSynced);
      socket.off('interview_whiteboard_cleared', handleWhiteboardCleared);
      socket.off('interview_chat_received', handleChatReceived);
      socket.off('interview_platform_switched', handlePlatformSwitched);
      socket.off('interview_recording_status', handleRecordingStatus);
      socket.off('interview_peer_media_state', handlePeerMediaState);
      socket.off('interview_meeting_ended', handleMeetingEnded);
      socket.off('interview_peer_left', handlePeerLeft);
    };
  }, [socket, inRoom, roomId, role, user?._id]);

  // Audio & Video Controls
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const nextValue = !isMicOn;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextValue;
      });
      setIsMicOn(nextValue);
      socket?.emit('interview_call_state', { roomId, audioEnabled: nextValue, videoEnabled: isVideoOn, role, username: user?.username });
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const nextValue = !isVideoOn;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextValue;
      });
      setIsVideoOn(nextValue);
      socket?.emit('interview_call_state', { roomId, audioEnabled: isMicOn, videoEnabled: nextValue, role, username: user?.username });
    }
  };

  // Screen Share Toggle — Both sharer and peer see the screen share
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          toastWarning('Screen sharing is not supported in this browser.');
          return;
        }

        const sStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: true
        });

        screenStreamRef.current = sStream;
        setIsScreenSharing(true);
        setActiveTab('screenshare');

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = sStream;
        }

        // Add the presentation as a second WebRTC stream. Keeping the camera
        // stream intact makes camera toggles and recovery reliable.
        const screenTrack = sStream.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          screenSenderRef.current = peerConnectionRef.current.addTrack(screenTrack, sStream);
          if (peerPresentRef.current) await createOfferAndSignal();
        }

        if (socket) {
          socket.emit('interview_screenshare_state', { roomId, isSharing: true, role, username: user?.username });
          socket.emit('interview_switch_platform', { roomId, platform: 'screenshare', switchedBy: user?.username });
        }

        screenTrack.onended = stopScreenShare;
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  const stopScreenShare = async () => {
    const stream = screenStreamRef.current;
    screenStreamRef.current = null;
    stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    setIsScreenSharing(false);

    if (peerConnectionRef.current && screenSenderRef.current) {
      peerConnectionRef.current.removeTrack(screenSenderRef.current);
      screenSenderRef.current = null;
      if (peerPresentRef.current) await createOfferAndSignal();
    }
    socket?.emit('interview_screenshare_state', { roomId, isSharing: false, role, username: user?.username });
  };

  // Independent Meeting Recording (Can be triggered by interviewer or student)
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (socket) {
        socket.emit('interview_recording_state', { roomId, isRecording: false, startedBy: user?.username });
      }
    } else {
      // Start recording
      try {
        let streamToRecord = null;

        // Try capturing screen with audio for full meeting recording
        if (navigator.mediaDevices.getDisplayMedia) {
          streamToRecord = await navigator.mediaDevices.getDisplayMedia({
            video: { mediaSource: 'screen' },
            audio: true
          });
        } else if (localStreamRef.current) {
          streamToRecord = localStreamRef.current;
        }

        if (!streamToRecord) {
          toastWarning('No media stream available to record.');
          return;
        }

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamToRecord, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm'
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `CodeClash_Interview_${roomId}_${new Date().toISOString().slice(0, 10)}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
          toastSuccess('Meeting recording saved and downloaded! 🎬');
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);

        if (socket) {
          socket.emit('interview_recording_state', { roomId, isRecording: true, startedBy: user?.username });
        }
        toastSuccess('Meeting recording started! 🔴');
      } catch (err) {
        toastError('Failed to start recording: ' + (err.message || 'Permission denied'));
      }
    }
  };

  // Cleanly terminate local media tracks
  const stopMediaTracks = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsScreenSharing(false);
    setPeerScreenSharing(false);
    peerScreenSharingRef.current = false;
    setPeerConnected(false);
    remoteStreamRef.current = null;
    remoteScreenStreamRef.current = null;
    remoteStreamsRef.current.clear();
    screenSenderRef.current = null;
    peerPresentRef.current = false;
    peerMediaReadyRef.current = false;
    localMediaReadyRef.current = false;
    pendingSignalsRef.current = [];
  };

  // Candidate Leaves Room (Meeting remains active for rejoin!)
  const handleCandidateLeave = () => {
    stopMediaTracks();
    if (socket && roomId) {
      socket.emit('interview_leave_room', { roomId, username: user?.username, role: 'candidate' });
    }
    setInRoom(false);
    sessionStorage.removeItem('activeInterviewRoom');
    toastInfo('You stepped out of the interview room. You can rejoin at any time.');
    fetchMyRooms();
  };

  // Interviewer Ends Meeting (ONLY interviewer can conclude meeting!)
  const handleInterviewerEndMeeting = async () => {
    const ok = await confirm({
      title: 'End Interview Meeting',
      message: 'Are you sure you want to end this interview meeting for all participants? Once concluded, this meeting will be marked as completed.',
      confirmText: 'Yes, End Meeting',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    try {
      await api.endInterviewRoom(roomId);
      if (socket) {
        socket.emit('interview_end_meeting', { roomId, userId: user?._id, username: user?.username });
      }
      stopMediaTracks();
      setInRoom(false);
      sessionStorage.removeItem('activeInterviewRoom');
      toastSuccess('Interview meeting concluded successfully.');
      fetchMyRooms();
    } catch (err) {
      toastError(err.message || 'Failed to end interview room');
    }
  };

  // Schedule Interview and Send Email to Student
  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!scheduleEmail || !scheduleDateTime) {
      toastWarning('Please provide candidate email and date/time.');
      return;
    }

    setCreatingSchedule(true);
    try {
      const res = await api.createInterviewRoom({
        problemSlug: scheduleProblemSlug,
        role: 'interviewer',
        candidateEmail: scheduleEmail,
        candidateName: scheduleName,
        scheduledTime: scheduleDateTime,
        initialPlatform: schedulePlatform,
        notes: scheduleNotes
      });

      setRoom(res.room);
      setRoomId(res.room.roomId);
      setCode(res.room.code);
      const prob = await api.getProblemBySlug(res.room.problemSlug);
      setProblem(prob.problem);
      fetchMyRooms();

      // Show dedicated invitation link popup so interviewer can review, copy or join immediately
      setScheduledInviteModal({
        room: res.room,
        candidateEmail: scheduleEmail,
        candidateName: scheduleName || 'Candidate',
        scheduledTime: scheduleDateTime,
        joinUrl: res.joinUrl || `http://localhost:5173/?interview=${res.room.roomId}&role=candidate`,
        emailSent: res.emailSent,
        initialPlatform: schedulePlatform
      });

      if (res.emailSent) {
        toastSuccess(`Invitation email dispatched directly to ${scheduleEmail}! 📬`);
      } else {
        toastWarning(res.emailError || 'Interview scheduled, but the email could not be delivered. Share the invitation link manually.');
      }
    } catch (err) {
      toastError(err.message || 'Failed to schedule interview');
    } finally {
      setCreatingSchedule(false);
    }
  };

  // Quick Start Room (Instant session)
  const handleInstantRoom = async () => {
    try {
      const res = await api.createInterviewRoom({ role: 'interviewer' });
      setRoom(res.room);
      setRoomId(res.room.roomId);
      setCode(res.room.code);
      const prob = await api.getProblemBySlug(res.room.problemSlug);
      setProblem(prob.problem);
      setRole('interviewer');
      setInRoom(true);
      setShowPlatformPicker(true);
      sessionStorage.setItem('activeInterviewRoom', JSON.stringify({ roomId: res.room.roomId, role: 'interviewer' }));
      startMediaDevices('interviewer');
    } catch (err) {
      toastError(err.message || 'Failed to create room');
    }
  };

  // Join Existing Interview Room (STUDENT ALWAYS JOINS AS CANDIDATE)
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    joinExistingRoom(roomId.trim(), 'candidate');
  };

  // Send In-Meeting Chat
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit('interview_chat_message', {
      roomId,
      senderName: user?.username || (role === 'interviewer' ? 'Interviewer' : 'Student'),
      senderRole: role,
      content: chatInput.trim()
    });

    setChatInput('');
  };

  // Switch Platform Tab and Sync to Peer
  const switchPlatformTab = (tab) => {
    setActiveTab(tab);
    if (socket && inRoom) {
      socket.emit('interview_switch_platform', {
        roomId,
        platform: tab,
        switchedBy: user?.username || role
      });
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

  // Run Code in interview with Test Case Passed celebration
  const handleRunCode = async () => {
    if (!problem) return;
    setIsRunning(true);
    try {
      const data = await api.runCode(problem.slug, { code, language });
      setRunResult(data.result);
      if (data.result.status === 'Accepted' || (data.result.passedTestCases > 0 && data.result.passedTestCases === data.result.totalTestCases)) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        toastSuccess(`🎉 All Test Cases Passed! (${data.result.passedTestCases}/${data.result.totalTestCases} passed)`);
      }
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

  // LOBBY VIEW (Schedule Interview, Instant Room, or Join by Code)
  if (!inRoom) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-white">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
            Technical Mock Interview Suite
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            Schedule interviews with candidates via email, collaborate across live coding, architecture whiteboards, or screen sharing with clear audio/video, in-meeting chat, and full session recording.
          </p>
        </div>

        {/* Active & Scheduled Interview Sessions (Quick Rejoin) */}
        {myRooms && myRooms.length > 0 && (
          <div className="mb-8 bg-[#161b22] border border-blue-500/30 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-white font-extrabold text-base">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                Your Active & Scheduled Interview Sessions
              </div>
              <span className="text-xs text-gray-400 bg-[#0d1117] px-3 py-1 rounded-full border border-[#30363d]">
                {myRooms.length} session{myRooms.length > 1 ? 's' : ''} available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {myRooms.map((r) => {
                const isHost = r.interviewerId === user?._id || (r.hostId === user?._id && r.hostRole === 'interviewer');
                const userRole = isHost ? 'interviewer' : 'candidate';
                const dateStr = r.scheduledTime
                  ? new Date(r.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Instant / Active';

                return (
                  <div
                    key={r._id}
                    className="p-4 rounded-2xl bg-[#0d1117] border border-[#30363d] hover:border-blue-500/50 transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                          {r.roomId}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            r.status === 'scheduled'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse'
                          }`}
                        >
                          {r.status === 'scheduled' ? 'Scheduled' : 'Live / Active'}
                        </span>
                      </div>
                      <div className="font-bold text-white text-sm mb-1">{r.problemTitle || 'Technical Interview'}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        Interviewer: <span className="text-white font-medium">{r.hostName || 'Interviewer'}</span>
                        {r.candidateName && (
                          <> • Candidate: <span className="text-white font-medium">{r.candidateName}</span></>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#21262d]">
                      <button
                        onClick={() => joinExistingRoom(r.roomId, userRole)}
                        className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Rejoin ({userRole === 'interviewer' ? 'as Interviewer' : 'as Candidate'})
                      </button>

                      {isHost && (
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'End Session',
                              message: `Are you sure you want to officially end room ${r.roomId}?`,
                              confirmText: 'End Session',
                              cancelText: 'Cancel'
                            });
                            if (ok) {
                              try {
                                await api.endInterviewRoom(r.roomId);
                                toastSuccess('Session ended');
                                fetchMyRooms();
                              } catch (err) {
                                toastError(err.message || 'Failed to end session');
                              }
                            }
                          }}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="End meeting"
                        >
                          End
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scheduled Interview Invite Modal */}
        {scheduledInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#161b22] border border-blue-500/40 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl space-y-4">
              <div className="text-center space-y-1.5">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center mb-2">
                  <Mail className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Technical Interview Scheduled! 📅</h3>
                <p className="text-xs text-gray-400">
                  {scheduledInviteModal.emailSent
                    ? `An invitation email has been dispatched directly to ${scheduledInviteModal.candidateEmail}.`
                    : `Invitation created for ${scheduledInviteModal.candidateEmail}. You can also share the direct link below:`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Candidate:</span>
                  <span className="font-bold text-white">
                    {scheduledInviteModal.candidateName} ({scheduledInviteModal.candidateEmail})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Scheduled Time:</span>
                  <span className="font-bold text-amber-400">
                    {new Date(scheduledInviteModal.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Room Code:</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    {scheduledInviteModal.room?.roomId}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">Direct Student Join Link:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={scheduledInviteModal.joinUrl}
                      className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-300 select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(scheduledInviteModal.joinUrl);
                        toastSuccess('Join link copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setScheduledInviteModal(null)}
                  className="flex-1 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Done / Close
                </button>
                <button
                  onClick={() => {
                    const rId = scheduledInviteModal.room.roomId;
                    setScheduledInviteModal(null);
                    joinExistingRoom(rId, 'interviewer');
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Enter Room as Interviewer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Box 1: Assign / Schedule Interview with Date & Time + Email to Candidate */}
          <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-extrabold text-base mb-1">
                <Calendar className="w-5 h-5 text-blue-400" />
                Interviewer: Assign & Schedule Interview
              </div>
              <p className="text-xs text-gray-400 mb-5">
                Set the date & time, select the initial platform mode, and automatically send an email invitation with the join link to the student.
              </p>

              <form onSubmit={handleScheduleInterview} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      Candidate / Student Email
                    </label>
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={scheduleEmail}
                      onChange={(e) => setScheduleEmail(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      Student Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Hunter"
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Initial Question / Topic</label>
                    <select
                      value={scheduleProblemSlug}
                      onChange={(e) => setScheduleProblemSlug(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {problemsList.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.title} ({p.difficulty})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Initial Platform Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    Default Platform Mode on Join:
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSchedulePlatform('code')}
                      className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        schedulePlatform === 'code'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400'
                      }`}
                    >
                      <FileCode className="w-4 h-4 text-blue-400" />
                      <span>Live Coding</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulePlatform('whiteboard')}
                      className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        schedulePlatform === 'whiteboard'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400'
                      }`}
                    >
                      <PenTool className="w-4 h-4 text-amber-400" />
                      <span>Whiteboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulePlatform('screenshare')}
                      className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        schedulePlatform === 'screenshare'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400'
                      }`}
                    >
                      <MonitorUp className="w-4 h-4 text-emerald-400" />
                      <span>Screen Share</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Interview Instructions / Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Instructions, topics to cover, or specific prerequisites..."
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingSchedule}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  {creatingSchedule ? 'Scheduling & Dispatching Email...' : 'Schedule & Send Email Invitation to Candidate'}
                </button>
              </form>
            </div>
          </div>

          {/* Box 2: Instant Room & Join Session */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Quick Start Instant Room */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Instant Live Session
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Need to start an interview right away? Launch a room instantly and share your screen or code.
              </p>
              <button
                onClick={handleInstantRoom}
                className="w-full py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                Launch Instant Interview Room
              </button>
            </div>

            {/* Join Room by ID Box */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Users className="w-4 h-4 text-emerald-400" />
                Student: Join with Room Code
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Got an email or code from your interviewer? Enter it below to connect.
              </p>
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. room_7X29M"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl transition shadow cursor-pointer"
                >
                  Join Room Now
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE INTERVIEW SESSION
  return (
    <div className="h-[calc(100vh-61px)] flex flex-col bg-[#0d1117] overflow-hidden text-white relative">
      {/* Platform Mode Picker Modal when joining session */}
      {showPlatformPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Choose Your Workspace Mode</h3>
              <p className="text-xs text-gray-400">
                Select where you want to begin. You and your peer can switch platforms anytime during the session.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  switchPlatformTab('code');
                  setShowPlatformPicker(false);
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer hover:scale-102 ${
                  activeTab === 'code' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-[#0d1117] border-[#30363d] hover:border-gray-500'
                }`}
              >
                <FileCode className="w-6 h-6 text-blue-400 mb-2" />
                <div>
                  <div className="font-bold text-sm text-white">Live Coding</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Collaborative Monaco code editor with execution</div>
                </div>
              </button>

              <button
                onClick={() => {
                  switchPlatformTab('whiteboard');
                  setShowPlatformPicker(false);
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer hover:scale-102 ${
                  activeTab === 'whiteboard' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-[#0d1117] border-[#30363d] hover:border-gray-500'
                }`}
              >
                <PenTool className="w-6 h-6 text-amber-400 mb-2" />
                <div>
                  <div className="font-bold text-sm text-white">Whiteboard</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Interactive system design canvas & architecture</div>
                </div>
              </button>

              <button
                onClick={() => {
                  switchPlatformTab('screenshare');
                  setShowPlatformPicker(false);
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer hover:scale-102 ${
                  activeTab === 'screenshare' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#0d1117] border-[#30363d] hover:border-gray-500'
                }`}
              >
                <MonitorUp className="w-6 h-6 text-emerald-400 mb-2" />
                <div>
                  <div className="font-bold text-sm text-white">Screen Share</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Present screen, IDE, or browser tab directly</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowPlatformPicker(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Enter Session
            </button>
          </div>
        </div>
      )}

      {/* Top Header Control Bar */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-6 py-2.5 flex items-center justify-between flex-wrap gap-2.5 shadow-md">
        <div className="flex items-center gap-3">
          {role === 'interviewer' ? (
            <button
              onClick={handleInterviewerEndMeeting}
              className="text-xs px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow"
              title="Officially terminate this interview meeting for all participants"
            >
              <LogOut className="w-3.5 h-3.5" />
              End Interview
            </button>
          ) : (
            <button
              onClick={handleCandidateLeave}
              className="text-xs px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300 hover:text-white font-semibold transition cursor-pointer flex items-center gap-1.5"
              title="Step out of room (meeting remains open for rejoin)"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave Room
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">Interview Room</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
              {roomId}
            </span>
          </div>

          <span className="text-xs text-gray-400 bg-[#21262d] px-2.5 py-0.5 rounded-full font-medium">
            Role: <span className="font-bold text-amber-400 capitalize">{role}</span>
          </span>

          {/* Copy Full Student Invite Link */}
          <button
            onClick={copyInviteLink}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              copiedLink
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
            title="Copy candidate direct invite URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied!' : 'Copy Student Link'}
          </button>
        </div>

        {/* Platform View Mode Switcher (Code vs Whiteboard vs Screen Share) */}
        <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
          <button
            onClick={() => switchPlatformTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'code' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Collaborative Code
          </button>
          <button
            onClick={() => switchPlatformTab('whiteboard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'whiteboard' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> Design Whiteboard
          </button>
          <button
            onClick={() => switchPlatformTab('screenshare')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'screenshare' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <MonitorUp className="w-3.5 h-3.5" /> Screen Share
          </button>
          {role === 'interviewer' && (
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'feedback' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Scorecard
            </button>
          )}
        </div>

        {/* Action Controls: Mic, Cam, Screen Share, Chat Drawer, and Meeting Recording */}
        <div className="flex items-center gap-2">
          {/* Audio Mic Toggle */}
          <button
            onClick={handleToggleMic}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isMicOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{isMicOn ? 'Mic On' : 'Muted'}</span>
          </button>

          {/* Video Cam Toggle */}
          <button
            onClick={handleToggleVideo}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isVideoOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
            title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {isVideoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{isVideoOn ? 'Cam On' : 'Cam Off'}</span>
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={handleToggleScreenShare}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isScreenSharing
                ? 'bg-amber-500 text-black border-amber-400 shadow-md animate-pulse'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
            }`}
            title="Present your screen"
          >
            <MonitorUp className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isScreenSharing ? 'Stop Presenting' : 'Share Screen'}</span>
          </button>

          {/* Independent Meeting Recording Button */}
          <button
            onClick={handleToggleRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition cursor-pointer shadow-sm ${
              isRecording
                ? 'bg-red-600 text-white border-red-400 animate-pulse'
                : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30'
            }`}
            title="Interviewer or student can record the full interview meeting"
          >
            <CircleDot className={`w-3.5 h-3.5 ${isRecording ? 'fill-white' : 'fill-purple-400'}`} />
            <span>{isRecording ? `REC ${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}` : 'Record Session'}</span>
          </button>

          {/* Chat Drawer Toggle */}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className={`p-1.5 rounded-xl border text-xs transition cursor-pointer relative ${
              showChatDrawer
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-[#21262d] hover:bg-[#30363d] text-gray-300 border-[#30363d]'
            }`}
            title="Toggle In-Meeting Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left: Problem Statement & HD Video Feeds */}
        <div className="w-full md:w-80 lg:w-96 border-r border-[#30363d] bg-[#0d1117] flex flex-col overflow-hidden">
          {/* Question Switcher (Interviewer only) */}
          {role === 'interviewer' && (
            <div className="p-3 border-b border-[#30363d] bg-[#161b22]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Interviewer Control: Change Question
              </label>
              <select
                value={problem?.slug || ''}
                onChange={(e) => handleSwitchProblem(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{problem?.title}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {problem?.difficulty}
              </span>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-gray-300 font-sans text-xs">
              {problem?.description}
            </p>

            <div className="space-y-2 pt-1">
              <h4 className="font-bold text-white text-[11px] uppercase tracking-wider text-gray-400">Sample Test Inputs:</h4>
              {problem?.examples?.map((ex, idx) => (
                <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded-xl p-2.5 text-[11px] font-mono space-y-1">
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

            {/* Live Video Feeds (Local & Remote) with clear styling */}
            <div className="pt-3 border-t border-[#21262d]">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                <span>HD Video Call</span>
                <span className={`text-[10px] font-bold flex items-center gap-1 ${peerConnected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                  <Radio className="w-3 h-3" />
                  {peerConnected ? 'Connected' : 'Waiting for Peer'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Local Video Stream */}
                <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden h-28 flex items-center justify-center shadow-inner">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
                  />
                  {!isVideoOn && (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <img src={user?.avatar} alt="" className="w-8 h-8 rounded-full border border-emerald-500 mb-1" />
                      <span className="text-[10px] font-bold text-white">{user?.username}</span>
                      <span className="text-[9px] text-gray-400">Camera Off</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white flex items-center gap-1 backdrop-blur-sm">
                    <span>You ({role})</span>
                    {isMicOn ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-red-400" />}
                  </div>
                </div>

                {/* Remote Peer Video Stream */}
                <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden h-28 flex items-center justify-center shadow-inner">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${!peerConnected ? 'hidden' : ''}`}
                  />
                  {!peerConnected && (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400">
                      <div className="w-8 h-8 rounded-full bg-[#0d1117] border border-blue-500/50 flex items-center justify-center mb-1">
                        <Users className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-white">{peerName}</span>
                      <span className="text-[9px] text-amber-400">Awaiting audio/video</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white backdrop-blur-sm">
                    {peerName} ({peerRole === 'interviewer' ? 'Interviewer' : 'Candidate'})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Active Platform Selection (Live Code vs Whiteboard vs Screen Share vs Scorecard) */}
        <div className="flex-1 flex flex-col bg-[#161b22] overflow-hidden">
          {/* PLATFORM 1: COLLABORATIVE CODE EDITOR */}
          {activeTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold text-xs">Collaborative Live Code</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-mono">Real-Time Sync</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-[#0d1117] border border-[#30363d] text-white rounded px-2 py-1 text-xs"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                  </select>
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isRunning ? 'Running Code...' : 'Test Run Code'}
                  </button>
                </div>
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
                <div className="h-36 border-t border-[#30363d] bg-[#0d1117] p-3 text-xs font-mono overflow-y-auto">
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

          {/* PLATFORM 2: SYSTEM DESIGN WHITEBOARD */}
          {activeTab === 'whiteboard' && (
            <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
              <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-gray-300 font-bold">System Design Whiteboard</span>
                  <div className="flex items-center gap-1.5">
                    {['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#ffffff'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setDrawColor(c)}
                        className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                          drawColor === c ? 'ring-2 ring-white scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleClearWhiteboard}
                  className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white rounded-lg text-xs transition cursor-pointer"
                >
                  Clear Canvas
                </button>
              </div>

              <div className="flex-1 relative bg-[#0a0d12] cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={1400}
                  height={900}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* PLATFORM 3: SCREEN SHARE FULL PRESENTATION (Both participants view stream) */}
          {activeTab === 'screenshare' && (
            <div className="flex-1 flex flex-col bg-[#0a0d12] overflow-hidden p-4 items-center justify-center">
              <div className="w-full max-w-5xl flex items-center justify-between mb-2 text-xs">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <MonitorUp className="w-4 h-4" />
                  {isScreenSharing
                    ? 'You are actively sharing your screen (Both participants are viewing)'
                    : peerScreenSharing
                    ? `${peerName} is sharing their screen`
                    : 'Screen Share Mode'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleScreenShare}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow ${
                      isScreenSharing ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <MonitorUp className="w-3.5 h-3.5" />
                    {isScreenSharing ? 'Stop Screen Sharing' : 'Start Sharing Your Screen'}
                  </button>
                </div>
              </div>

              <div className="w-full max-w-5xl flex-1 bg-black rounded-2xl overflow-hidden border border-[#30363d] flex items-center justify-center relative">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  muted={isScreenSharing}
                  className={`w-full h-full object-contain ${!isScreenSharing && !peerScreenSharing ? 'hidden' : ''}`}
                />
                {!isScreenSharing && !peerScreenSharing && (
                  <div className="text-center p-6 text-gray-400 space-y-2">
                    <MonitorUp className="w-12 h-12 mx-auto text-blue-400/50" />
                    <div className="text-sm font-bold text-white">No active screen presentation</div>
                    <div className="text-xs">Click "Start Sharing Your Screen" to present code, documents, or slides to both participants.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCORECARD & EVALUATION TAB (Interviewer) */}
          {activeTab === 'feedback' && (
            <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Candidate Evaluation Scorecard
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Grade candidate across technical competencies. Both participants receive +50 bonus coins upon submission!
                </p>
              </div>

              <form onSubmit={handleSubmitEvaluation} className="space-y-5 bg-[#0d1117] p-6 rounded-2xl border border-[#30363d]">
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

        {/* In-Meeting Live Chat Drawer */}
        {showChatDrawer && (
          <div className="w-full md:w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col z-30 animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-[#30363d] flex items-center justify-between text-xs font-bold text-white bg-[#0d1117]">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                In-Meeting Live Chat
              </span>
              <button
                onClick={() => setShowChatDrawer(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-xl border leading-relaxed ${
                    msg.senderRole === 'system'
                      ? 'bg-blue-950/30 border-blue-500/20 text-blue-200 text-[11px]'
                      : msg.senderName === user?.username
                      ? 'bg-blue-600/20 border-blue-500/40 text-white ml-4'
                      : 'bg-[#0d1117] border-[#30363d] text-gray-200 mr-4'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span className="font-bold text-blue-300">{msg.senderName}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-2 border-t border-[#30363d] bg-[#0d1117] flex gap-2">
              <input
                type="text"
                placeholder="Type a message to peer..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
