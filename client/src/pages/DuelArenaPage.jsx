import React, { useState, useEffect } from 'react';
import {
  Swords,
  Plus,
  Coins,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DuelArenaPage({ onEnterDuel }) {
  const { user, updateCoins, refreshUser } = useAuth();
  const { error: toastError, warning: toastWarning, success: toastSuccess, confirm } = useToast();
  const [duels, setDuels] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [wager, setWager] = useState(50);
  const [selectedProblemSlug, setSelectedProblemSlug] = useState('');
  const [problems, setProblems] = useState([]);
  const [creating, setCreating] = useState(false);

  const fetchDuels = async () => {
    setLoading(true);
    try {
      const [duelsRes, lbRes, probsRes] = await Promise.all([
        api.getDuels(),
        api.getLeaderboard(),
        api.getProblems()
      ]);
      setDuels(duelsRes.duels || []);
      setLeaderboard(lbRes.leaderboard || []);
      setProblems(probsRes.problems || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuels();
  }, []);

  const handleCreateDuel = async (e) => {
    e.preventDefault();
    if ((user?.coins || 0) < wager) {
      toastWarning(`You need at least ${wager} coins to create this duel! (Current: ${user?.coins || 0})`);
      return;
    }

    setCreating(true);
    try {
      const res = await api.createDuel({
        problemSlug: selectedProblemSlug || null,
        wager,
        durationMinutes: 10
      });
      updateCoins(res.userCoins);
      setShowCreateModal(false);
      fetchDuels();
      // Enter the created duel room
      onEnterDuel(res.duel._id);
    } catch (err) {
      toastError(err.message || 'Failed to create duel');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinDuel = async (duelId, duelWager) => {
    if ((user?.coins || 0) < duelWager) {
      toastWarning(`You need ${duelWager} coins to match this challenge! (Current: ${user?.coins || 0})`);
      return;
    }

    try {
      const res = await api.joinDuel(duelId);
      updateCoins(res.userCoins);
      onEnterDuel(duelId);
    } catch (err) {
      toastError(err.message || 'Failed to join duel');
    }
  };

  const handleCancelDuel = async (duelId) => {
    const ok = await confirm({
      title: 'End Arena',
      message: 'Are you sure you want to cancel this arena? Your wager will be refunded immediately.',
      confirmText: 'End Arena',
      cancelText: 'Keep Waiting',
      type: 'warning'
    });
    if (!ok) return;

    try {
      const res = await api.cancelDuel(duelId);
      updateCoins(res.userCoins);
      toastSuccess(res.message);
      fetchDuels();
      await refreshUser();
    } catch (err) {
      toastError(err.message || 'Failed to cancel arena');
    }
  };

  const openDuels = duels.filter((d) => d.status === 'open');
  const inProgressDuels = duels.filter((d) => d.status === 'in_progress');

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/60 via-[#181216] to-amber-950/40 border border-red-500/30 p-8 mb-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 font-extrabold text-xs uppercase tracking-wider">
              <Swords className="w-4 h-4" /> 1v1 High Stakes Betting Arena
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Code Faster. Solve Clean. <span className="text-amber-400">Winner Takes the Entire Pot!</span>
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Challenge peers or match against open challengers. Both players put up coins into an escrow pot and receive the same LeetCode problem. The first to pass all test cases scoops both bets! 💰⚡
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-sm rounded-xl transition shadow-xl shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer glow-duel"
            >
              <Plus className="w-5 h-5" />
              Create Duel Challenge
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Arena Lobby */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-red-400" />
              Open Duel Challenges ({openDuels.length})
            </h2>
            <button
              onClick={fetchDuels}
              className="text-xs text-gray-400 hover:text-white transition px-2.5 py-1 bg-[#161b22] border border-[#30363d] rounded-lg"
            >
              Refresh Lobby
            </button>
          </div>

          {openDuels.length === 0 ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-10 text-center text-gray-400">
              <Swords className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-300">No open duels waiting in the lobby.</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Create the first challenge and wait for an opponent to accept!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition"
              >
                Create Challenge
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openDuels.map((duel) => {
                const isCreator = duel.creator === user?._id;
                return (
                  <div
                    key={duel._id}
                    className="bg-[#161b22] border border-[#30363d] hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={duel.creatorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt=""
                            className="w-10 h-10 rounded-full border border-gray-600 object-cover"
                          />
                          <div>
                            <span className="font-bold text-sm text-white block">{duel.creatorName}</span>
                            <span className="text-[11px] text-gray-400">Challenger</span>
                          </div>
                        </div>

                        {/* Pot Badge */}
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Pot to Win</span>
                          <span className="text-base font-extrabold text-amber-400 flex items-center gap-1 glow-gold px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <Coins className="w-4 h-4 fill-amber-400" />
                            {duel.pot}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#0d1117] p-3 rounded-xl border border-[#21262d] mb-4">
                        <div className="text-[11px] text-gray-400 font-medium">Problem:</div>
                        <div className="font-bold text-sm text-gray-200 mt-0.5">{duel.problemTitle}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                          <span className="flex items-center gap-1 font-semibold text-gray-300">
                            <Coins className="w-3.5 h-3.5 text-amber-400" /> Wager: {duel.wager} Coins
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" /> {duel.durationMinutes} mins
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCreator ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEnterDuel(duel._id)}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            Enter Waiting Room
                          </button>
                          <button
                            onClick={() => handleCancelDuel(duel._id)}
                            className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition cursor-pointer"
                            title="End arena and refund your wager"
                          >
                            End Arena
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoinDuel(duel._id, duel.wager)}
                          className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Swords className="w-4 h-4" />
                          Accept & Bet {duel.wager} Coins
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active / In-progress Duels Live Feed */}
          {inProgressDuels.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-base font-bold text-gray-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Live Battles Underway ({inProgressDuels.length})
              </h3>
              <div className="space-y-2">
                {inProgressDuels.map((duel) => (
                  <div
                    key={duel._id}
                    onClick={() => onEnterDuel(duel._id)}
                    className="bg-[#161b22] border border-[#30363d] hover:border-amber-500/50 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <img src={duel.creatorAvatar} className="w-7 h-7 rounded-full border border-gray-700" alt="" />
                        <img src={duel.opponentAvatar} className="w-7 h-7 rounded-full border border-gray-700" alt="" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">
                          {duel.creatorName} <span className="text-red-400 font-extrabold">VS</span> {duel.opponentName}
                        </div>
                        <div className="text-[11px] text-gray-400">{duel.problemTitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-amber-400 font-extrabold text-xs flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" /> Pot: {duel.pot}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold animate-pulse">Live in progress</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Arena Leaderboard */}
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-base mb-4">
              <Trophy className="w-5 h-5 text-amber-400" />
              Arena Hall of Fame (Top Duelists)
            </div>

            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((userRank, idx) => (
                <div
                  key={userRank._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d1117] border border-[#21262d] text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[10px] ${
                        idx === 0
                          ? 'bg-amber-500 text-black'
                          : idx === 1
                          ? 'bg-gray-300 text-black'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-[#21262d] text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <img src={userRank.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <div className="font-bold text-white">{userRank.username}</div>
                      <div className="text-[10px] text-gray-400">
                        {userRank.duelsWon}W / {userRank.duelsLost}L ({userRank.winRate}% win)
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-amber-400 flex items-center gap-1">
                      <Coins className="w-3 h-3 fill-amber-400" />
                      {userRank.duelCoinsWon || userRank.coins}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase">Coins Won</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Rules Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 text-xs text-gray-300 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
              <Shield className="w-4 h-4 text-emerald-400" /> How 1v1 Betting Works
            </h4>
            <ul className="space-y-2 text-gray-400 list-disc list-inside">
              <li>Both players wager equal coins held securely in platform escrow.</li>
              <li>A random or selected LeetCode problem begins simultaneously.</li>
              <li>Live testcase pass count is broadcast to your opponent.</li>
              <li>First to 100% test cases wins the entire combined pot!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Duel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-lg text-white">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Swords className="w-5 h-5 text-red-500" />
              Create 1v1 Coding Challenge
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Set your coin wager. Your coins are escrowed until a winner emerges!
            </p>

            <form onSubmit={handleCreateDuel} className="space-y-5">
              {/* Select Wager */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Select Coin Wager (Per Player):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 100, 250].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setWager(amt)}
                      className={`p-2.5 rounded-xl border text-center font-extrabold text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                        wager === amt
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-2 ring-amber-500/30'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Coins className="w-4 h-4 text-amber-400" />
                      {amt} Coins
                    </button>
                  ))}
                </div>
              </div>

              {/* Pot Summary */}
              <div className="p-3.5 bg-[#0d1117] border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400">Total Match Pot (Winner Takes All):</span>
                  <div className="font-extrabold text-lg text-amber-400 flex items-center gap-1 mt-0.5">
                    <Coins className="w-5 h-5 fill-amber-400" />
                    {wager * 2} Coins
                  </div>
                </div>
                <div className="text-right text-[11px] text-gray-400">
                  Your Balance: <span className="font-bold text-white">{user?.coins || 0} Coins</span>
                </div>
              </div>

              {/* Select Problem */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Problem Selection (Optional):
                </label>
                <select
                  value={selectedProblemSlug}
                  onChange={(e) => setSelectedProblemSlug(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Random Easy/Medium Problem (Recommended)</option>
                  {problems.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#21262d] text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Creating...' : `Stake ${wager} Coins & Create`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
