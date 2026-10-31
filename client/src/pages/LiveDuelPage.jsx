import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import {
  Swords,
  Coins,
  Clock,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowLeft,
  Trophy,
  Zap,
  Flame,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export default function LiveDuelPage({ duelId, onLeave }) {
  const { user, updateCoins, refreshUser } = useAuth();
  const { socket } = useSocket();
  const { error: toastError, warning: toastWarning, info: toastInfo, success: toastSuccess, confirm } = useToast();

  const [duel, setDuel] = useState(null);
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Coding state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myProgress, setMyProgress] = useState({ passed: 0, total: 5 });
  const [opponentProgress, setOpponentProgress] = useState({ passed: 0, total: 5 });
  const [runResult, setRunResult] = useState(null);

  // In-duel Chat
  const [duelMessages, setDuelMessages] = useState([
    { senderName: 'Arena Announcer', content: 'Battle started! First to 100% test cases wins the Pot!', timestamp: 'Now' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Game over state
  const [gameOver, setGameOver] = useState(null);

  // Fetch initial duel data
  const loadDuelData = async () => {
    try {
      const data = await api.getDuelById(duelId);
      setDuel(data.duel);
      setProblem(data.problem);
      setCode(data.problem?.starterCode?.javascript || '');
      const totalCases = data.problem?.testCases?.length || 5;
      setMyProgress(p => ({ ...p, total: totalCases }));
      setOpponentProgress(p => ({ ...p, total: totalCases }));

      if (data.duel.status === 'completed') {
        setGameOver({
          winnerName: data.duel.winnerName,
          pot: data.duel.pot,
          isWinner: data.duel.winner === user?._id
        });
      } else if (data.duel.status === 'cancelled') {
        toastInfo('This arena has been ended or expired.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3-minute Countdown for waiting opponent
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  useEffect(() => {
    if (!duel || duel.status !== 'open' || !duel.expiresAt) {
      setSecondsRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((new Date(duel.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
      if (diff === 0 && duel.status === 'open') {
        loadDuelData();
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [duel?.expiresAt, duel?.status]);

  // Cancel / End Arena manually before opponent joins
  const handleCancelDuel = async () => {
    if (!duel || duel.status !== 'open') return;

    const ok = await confirm({
      title: 'End Arena Match',
      message: 'End this arena and refund your wager? This can only be done before an opponent joins.',
      confirmText: 'End Arena',
      cancelText: 'Keep Waiting',
      type: 'warning'
    });

    if (!ok) return;

    try {
      const res = await api.cancelDuel(duelId);
      updateCoins(res.userCoins);
      toastSuccess(res.message);
      await refreshUser();
      onLeave();
    } catch (err) {
      toastError(err.message || 'Failed to end arena');
    }
  };

  useEffect(() => {
    if (duelId) {
      setLoading(true);
      loadDuelData();
    }
  }, [duelId]);

  // Socket.io Real-time Duel listeners
  useEffect(() => {
    if (!socket || !duelId) return;

    socket.emit('join_duel', { duelId, userId: user?._id, username: user?.username });

    // When opponent joins or duel starts
    const handleDuelStarted = (data) => {
      setDuel(data.duel);
      setDuelMessages(prev => [
        ...prev,
        {
          senderName: 'Arena Announcer',
          content: `⚔️ Challenger ${data.opponentName || 'Opponent'} has joined! The duel is now LIVE!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      loadDuelData();
    };

    const handleOpponentJoined = (data) => {
      loadDuelData();
    };

    // Opponent progress update
    const handleOpponentProgress = (data) => {
      setOpponentProgress({ passed: data.passed, total: data.total });
    };

    // Game Over event
    const handleGameOver = (data) => {
      setGameOver({
        winnerId: data.winnerId,
        winnerName: data.winnerName,
        pot: data.pot,
        isWinner: data.winnerId === user?._id
      });

      if (data.winnerId === user?._id) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.5 }
        });
        refreshUser();
      }
    };

    // Arena Terminated / Expired event
    const handleDuelTerminated = (data) => {
      toastInfo(data.reason || 'Arena ended.');
      refreshUser();
      loadDuelData();
    };

    // In-match chat
    const handleChatBroadcast = (msg) => {
      setDuelMessages(prev => [...prev, msg]);
    };

    socket.on('duel_started', handleDuelStarted);
    socket.on('duel_opponent_joined', handleOpponentJoined);
    socket.on('opponent_progress', handleOpponentProgress);
    socket.on('duel_game_over', handleGameOver);
    socket.on('duel_terminated', handleDuelTerminated);
    socket.on('duel_chat_broadcast', handleChatBroadcast);

    return () => {
      socket.off('duel_started', handleDuelStarted);
      socket.off('duel_opponent_joined', handleOpponentJoined);
      socket.off('opponent_progress', handleOpponentProgress);
      socket.off('duel_game_over', handleGameOver);
      socket.off('duel_terminated', handleDuelTerminated);
      socket.off('duel_chat_broadcast', handleChatBroadcast);
    };
  }, [socket, duelId, user?._id]);

  // Copy shareable duel invite link
  const copyDuelLink = () => {
    const link = `${window.location.origin}/?duel=${duelId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Join this duel directly (if opened via share link by a 2nd user)
  const handleDirectJoin = async () => {
    if (!duel) return;
    if ((user?.coins || 0) < duel.wager) {
      toastWarning(`You need ${duel.wager} coins to match this challenge! Current coins: ${user?.coins || 0}`);
      return;
    }

    try {
      const res = await api.joinDuel(duelId);
      updateCoins(res.userCoins);
      setDuel(res.duel);
      loadDuelData();
    } catch (err) {
      toastError(err.message || 'Failed to join duel');
    }
  };

  // Run Code & Broadcast progress to opponent
  const handleRunCode = async () => {
    if (!problem) return;
    setIsRunning(true);
    try {
      const data = await api.runCode(problem.slug, { code, language });
      setRunResult(data.result);
      setMyProgress({ passed: data.result.passedTestCases, total: data.result.totalTestCases });

      // Broadcast progress via socket to induce pressure on opponent!
      if (socket) {
        socket.emit('duel_progress', {
          duelId,
          userId: user?._id,
          passed: data.result.passedTestCases,
          total: data.result.totalTestCases
        });
      }
    } catch (err) {
      toastError(err.message || 'Error running code');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Duel Code (Winner Check)
  const handleSubmitCode = async () => {
    if (!problem) return;

    if (duel?.status === 'open') {
      toastInfo('Waiting for an opponent to join before official evaluation! You can use "Run" to test your code in the meantime.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await api.submitDuelCode(duelId, { code, language });
      setRunResult(data.result);
      setMyProgress({ passed: data.result.passedTestCases, total: data.result.totalTestCases });

      if (socket) {
        socket.emit('duel_progress', {
          duelId,
          userId: user?._id,
          passed: data.result.passedTestCases,
          total: data.result.totalTestCases
        });
      }

      if (data.duelWon) {
        if (socket) {
          socket.emit('duel_finished', {
            duelId,
            winnerId: user?._id,
            winnerName: user?.username,
            pot: data.pot
          });
        }
        setGameOver({
          winnerName: user?.username,
          pot: data.pot,
          isWinner: true
        });
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.5 }
        });
        await refreshUser();
      }
    } catch (err) {
      toastError(err.message || 'Error submitting code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Duel Chat Banter
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('duel_chat_message', {
      duelId,
      senderName: user?.username || 'Challenger',
      content: chatInput.trim()
    });
    setChatInput('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mr-3" />
        Connecting to 1v1 Battle Arena...
      </div>
    );
  }

  const isCreator = duel?.creator === user?._id;
  const isOpponent = duel?.opponent === user?._id;
  const isParticipant = isCreator || isOpponent;

  const opponentName = isCreator ? (duel?.opponentName || 'Waiting for opponent...') : duel?.creatorName;
  const opponentAvatar = isCreator
    ? (duel?.opponentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')
    : duel?.creatorAvatar;

  return (
    <div className="h-[calc(100vh-61px)] flex flex-col bg-[#0d1117] overflow-hidden">
      {/* Duel Arena Match Header */}
      <div className="bg-[#161214] border-b border-[#30363d] px-6 py-2.5 flex items-center justify-between shadow-lg flex-wrap gap-2">
        {/* Left: Back & Problem info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition px-2.5 py-1 rounded bg-[#21262d] text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Arena Lobby
          </button>
          <div>
            <div className="text-white font-bold text-sm flex items-center gap-2">
              <Swords className="w-4 h-4 text-red-500" />
              {duel?.problemTitle}
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {duel?.problemDifficulty || 'Medium'}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              Match Status: <span className={
                duel?.status === 'in_progress'
                  ? 'text-emerald-400 font-bold'
                  : duel?.status === 'cancelled'
                  ? 'text-gray-400 font-bold'
                  : 'text-amber-400 font-bold'
              }>
                {duel?.status === 'in_progress' ? '● IN PROGRESS' : duel?.status === 'cancelled' ? '● TERMINATED' : 'WAITING FOR OPPONENT'}
              </span>
            </div>
          </div>

          {/* Copy Duel Invite Link */}
          {duel?.status === 'open' && (
            <button
              onClick={copyDuelLink}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
              title="Copy duel challenge link to invite an opponent"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Link Copied!' : 'Copy Duel Link'}
            </button>
          )}

          {/* Cancel Arena Button (Only for creator when waiting for opponent) */}
          {isCreator && duel?.status === 'open' && (
            <button
              onClick={handleCancelDuel}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
              title="Cancel arena and refund your wager"
            >
              End Arena
            </button>
          )}
        </div>

        {/* Center: Live Match Pot & Players VS */}
        <div className="flex items-center gap-6">
          {/* You */}
          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="font-extrabold text-xs text-white">
                {user?.username} (You)
              </div>
              <div className="text-[10px] text-emerald-400 font-bold">
                Passed {myProgress.passed} / {myProgress.total} Tests
              </div>
            </div>
            <img src={user?.avatar} className="w-8 h-8 rounded-full border border-emerald-500" alt="" />
          </div>

          {/* Central Pot Display */}
          <div className="flex flex-col items-center px-4 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl glow-gold">
            <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Pot At Stake</span>
            <span className="font-extrabold text-base text-amber-400 flex items-center gap-1">
              <Coins className="w-4 h-4 fill-amber-400" />
              {duel?.pot} Coins
            </span>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2">
            <img src={opponentAvatar} className="w-8 h-8 rounded-full border border-red-500" alt="" />
            <div>
              <div className="font-extrabold text-xs text-white">
                {opponentName}
              </div>
              <div className="text-[10px] text-red-400 font-bold">
                {duel?.status === 'in_progress' ? `Passed ${opponentProgress.passed} / ${opponentProgress.total} Tests` : 'Waiting...'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Run & Submit Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting || gameOver}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 font-semibold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-gray-200 ${isRunning ? 'animate-spin' : ''}`} />
            Run Test
          </button>
          <button
            onClick={handleSubmitCode}
            disabled={isRunning || isSubmitting || gameOver || !isParticipant}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-lg transition shadow-md disabled:opacity-50 cursor-pointer glow-duel"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Evaluating...' : 'Submit to Win Pot'}
          </button>
        </div>
      </div>

      {/* 3-Minute Opponent Joining Countdown Banner */}
      {duel?.status === 'open' && secondsRemaining !== null && (
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              Waiting for an opponent to join... Arena will automatically terminate and refund in:
            </span>
            <span className="font-mono font-extrabold text-sm px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          {isCreator && (
            <button
              onClick={handleCancelDuel}
              className="text-xs text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/30 px-2.5 py-1 rounded font-semibold transition"
            >
              Cancel & Refund Now
            </button>
          )}
        </div>
      )}

      {/* Terminated Arena Banner */}
      {duel?.status === 'cancelled' && (
        <div className="bg-rose-950/50 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>This arena has ended / terminated. Creator's wager was refunded.</span>
          </div>
          <button
            onClick={onLeave}
            className="text-xs text-white bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded font-bold transition"
          >
            Back to Arena Lobby
          </button>
        </div>
      )}

      {/* Direct Accept Challenge Banner if 2nd user opens link */}
      {!isParticipant && duel?.status === 'open' && (
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 p-3 text-black font-extrabold text-xs flex items-center justify-between px-6 shadow-md">
          <span className="flex items-center gap-2">
            <Swords className="w-4 h-4 fill-black" />
            You were challenged to a 1v1 duel by {duel.creatorName} for {duel.wager} Coins!
          </span>
          <button
            onClick={handleDirectJoin}
            className="px-4 py-1.5 bg-black text-white hover:bg-gray-900 rounded-lg text-xs font-bold transition shadow cursor-pointer"
          >
            Accept Challenge & Match {duel.wager} Coins
          </button>
        </div>
      )}

      {/* Duel Live Progress Meters Bar */}
      <div className="bg-[#12151b] border-b border-[#21262d] px-6 py-2 grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1">
            <span>Your Progress</span>
            <span className="text-emerald-400 font-bold">{Math.round((myProgress.passed / myProgress.total) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(myProgress.passed / myProgress.total) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1">
            <span>Opponent Progress</span>
            <span className="text-red-400 font-bold">{Math.round((opponentProgress.passed / opponentProgress.total) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${(opponentProgress.passed / opponentProgress.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Split: Problem + Editor + Duel Chat */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Problem Statement & Examples */}
        <div className="w-full md:w-1/3 border-r border-[#30363d] bg-[#0d1117] overflow-y-auto p-5 space-y-4 text-xs text-gray-300">
          <div className="prose prose-invert max-w-none">
            <h3 className="font-bold text-white text-sm mb-2">Problem Statement</h3>
            <p className="whitespace-pre-line leading-relaxed text-gray-300 font-sans">
              {problem?.description}
            </p>
          </div>

          <div className="space-y-3 pt-2">
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

          <div className="space-y-1 pt-2">
            <h4 className="font-bold text-white text-xs">Constraints:</h4>
            <ul className="list-disc list-inside text-[11px] text-gray-400 font-mono space-y-0.5">
              {problem?.constraints?.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center: Monaco Editor & Console */}
        <div className="flex-1 flex flex-col bg-[#161b22] overflow-hidden">
          <div className="flex-1 relative min-h-[300px]">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Consolas, monospace',
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true
              }}
            />
          </div>

          {/* Test run console output */}
          {runResult && (
            <div className="h-44 border-t border-[#30363d] bg-[#0d1117] p-3 overflow-y-auto text-xs font-mono">
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold flex items-center gap-1.5 ${runResult.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {runResult.status === 'Accepted' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {runResult.status} ({runResult.passedTestCases}/{runResult.totalTestCases} Passed)
                </span>
                <span className="text-gray-400 text-[11px]">{runResult.runtime} ms</span>
              </div>
              {runResult.failedTestCase && (
                <div className="text-rose-300 text-[11px]">
                  Failed on input: {runResult.failedTestCase.input} | Expected: {JSON.stringify(runResult.failedTestCase.expected)} | Got: {JSON.stringify(runResult.failedTestCase.actual)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Duel Chat & Banter */}
        <div className="w-full md:w-72 border-l border-[#30363d] bg-[#161b22] flex flex-col">
          <div className="p-3 border-b border-[#30363d] font-bold text-xs text-white flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            Arena Banter & Log
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {duelMessages.map((msg, i) => (
              <div key={i} className="p-2 bg-[#0d1117] rounded-lg border border-[#21262d]">
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                  <span className="font-bold text-amber-400">{msg.senderName}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="text-gray-200">{msg.content}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="p-2 border-t border-[#30363d] flex gap-1">
            <input
              type="text"
              placeholder="Send live banter..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${
              gameOver.isWinner ? 'bg-amber-500/20 text-amber-400 border border-amber-500 glow-gold' : 'bg-red-500/20 text-red-400 border border-red-500'
            }`}>
              <Trophy className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-1">
              {gameOver.isWinner ? 'VICTORY! YOU WON!' : 'DEFEAT!'}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {gameOver.isWinner
                ? `You passed all test cases first and scooped the entire match pot!`
                : `${gameOver.winnerName} solved the problem first and took the pot.`}
            </p>

            <div className="p-4 bg-[#0d1117] border border-[#21262d] rounded-2xl mb-6">
              <div className="text-xs text-gray-400 uppercase font-semibold">Match Pot</div>
              <div className="text-2xl font-extrabold text-amber-400 flex items-center justify-center gap-1.5 mt-1">
                <Coins className="w-6 h-6 fill-amber-400" />
                +{gameOver.pot} Coins
              </div>
            </div>

            <button
              onClick={onLeave}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold rounded-xl transition cursor-pointer"
            >
              Return to Arena Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
