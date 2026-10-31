import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Gift,
  Coins,
  Flame,
  CheckCircle,
  Clock,
  Sparkles,
  Swords,
  Code,
  MessageSquare,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function QuestsPage({ onNavigate }) {
  const { user, updateCoins, refreshUser, setShowDailyModal } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [tasks, setTasks] = useState([]);
  const [dailyStatus, setDailyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingTaskId, setClaimingTaskId] = useState(null);

  const fetchTasksData = async () => {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        api.getDailyTasks(),
        api.getDailyStatus()
      ]);
      setTasks(tRes.tasks || []);
      setDailyStatus(dRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, [user?._id]);

  const handleClaimTask = async (taskId) => {
    setClaimingTaskId(taskId);
    try {
      const res = await api.claimTask(taskId);
      updateCoins(res.newTotalCoins);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toastSuccess(res.message);
      await fetchTasksData();
      await refreshUser();
    } catch (err) {
      toastError(err.message || 'Error claiming task');
    } finally {
      setClaimingTaskId(null);
    }
  };

  const getTaskIcon = (iconName) => {
    switch (iconName) {
      case 'Code':
        return Code;
      case 'Flame':
        return Flame;
      case 'Swords':
        return Swords;
      case 'MessageSquare':
        return MessageSquare;
      default:
        return BookOpen;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 text-white">
      {/* Top Banner: Daily Login Streak */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/60 via-[#1c1611] to-yellow-950/30 border border-amber-500/40 p-8 mb-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 font-extrabold text-xs uppercase tracking-wider">
              <Flame className="w-4 h-4 fill-amber-400" />
              {user?.dailyStreak || 1}-Day Active Login Streak
            </div>
            <h1 className="text-3xl font-extrabold text-white">
              Daily Rewards & Coin Quests
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed">
              Earn coins every day by logging in and solving problems. Use your coins to bet against other coders in the 1v1 Battle Arena where the winner takes the entire pot! 🪙⚔️
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-gray-400 font-medium block">Current Balance</span>
              <span className="text-3xl font-black text-amber-400 flex items-center gap-1.5 glow-gold">
                <Coins className="w-7 h-7 fill-amber-400" />
                {user?.coins || 0}
              </span>
            </div>
            <button
              onClick={() => setShowDailyModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4 fill-black" />
              Daily Bonus Modal
            </button>
          </div>
        </div>
      </div>

      {/* Daily Tasks List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              Today's Daily Tasks & Quests
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Refreshes daily at midnight. Complete tasks to claim bonus coins!
            </p>
          </div>
          <button
            onClick={fetchTasksData}
            className="text-xs px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-gray-400 hover:text-white transition"
          >
            Refresh Progress
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500 text-xs">Loading daily quests...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => {
              const Icon = getTaskIcon(task.icon);
              return (
                <div
                  key={task.id}
                  className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{task.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                      </div>
                    </div>

                    <span className="text-amber-400 font-extrabold text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-1 shrink-0">
                      <Coins className="w-3.5 h-3.5 fill-amber-400" />
                      +{task.rewardCoins}
                    </span>
                  </div>

                  {/* Progress Bar & Claim Button */}
                  <div className="space-y-3 pt-2 border-t border-[#21262d]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progress:</span>
                      <span className="font-bold text-gray-200">
                        {task.progress} / {task.target}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${(task.progress / task.target) * 100}%` }}
                      />
                    </div>

                    <div>
                      {task.isClaimed ? (
                        <div className="w-full py-2 bg-gray-800/50 border border-gray-700 text-gray-400 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> Claimed
                        </div>
                      ) : task.isCompleted ? (
                        <button
                          onClick={() => handleClaimTask(task.id)}
                          disabled={claimingTaskId === task.id}
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer glow-gold"
                        >
                          <Sparkles className="w-4 h-4" />
                          {claimingTaskId === task.id ? 'Claiming...' : `Claim +${task.rewardCoins} Coins`}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (task.id.includes('solve')) onNavigate('problems');
                            else if (task.id.includes('duel')) onNavigate('duels');
                            else if (task.id.includes('chat')) onNavigate('chat');
                            else onNavigate('problems');
                          }}
                          className="w-full py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Go to Task <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How To Use Coins Guide */}
      <div className="mt-10 bg-[#161b22] border border-[#30363d] rounded-3xl p-6">
        <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          The CodeClash Coin Economy
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Coins are the native competitive currency on CodeClash. You earn coins by logging in daily, maintaining streaks, solving Easy/Medium/Hard LeetCode problems, writing community solutions, and completing mock interviews.
          <br /><br />
          Ready for adrenaline? Head to the <strong className="text-amber-400">1v1 Arena</strong>, stake your coins in a duel, and test your speed and accuracy against another coder. The first player to 100% test cases wins the entire combined pot!
        </p>
      </div>
    </div>
  );
}
