import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Coins, Flame, CheckCircle, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DailyRewardModal({ isOpen, onClose }) {
  const { user, dailyStatus, updateCoins, refreshUser } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const [claiming, setClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState(null);

  if (!isOpen) return null;

  const currentStreak = user?.dailyStreak || 1;
  const streakRewards = dailyStatus?.streakRewards || [50, 75, 100, 130, 160, 200, 300];
  const todayCoins = streakRewards[Math.min(currentStreak - 1, 6)];

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await api.claimDaily();
      updateCoins(res.newTotalCoins);
      setClaimedReward(res.coinsAwarded);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
      toastSuccess(`Daily Reward Claimed! +${res.coinsAwarded} Coins! 🪙`);
      await refreshUser();
    } catch (err) {
      toastError(err.message || 'Failed to claim daily reward');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 glow-gold">
            <Coins className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            Daily Login Bonus
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Log in daily to stack streak multipliers and earn coins for 1v1 duels!
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 font-semibold text-xs mt-3">
            <Flame className="w-4 h-4 fill-amber-400" />
            Current Streak: {currentStreak} Day{currentStreak > 1 ? 's' : ''}
          </div>
        </div>

        {/* 7-Day Streak Calendar */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {streakRewards.map((coins, index) => {
            const dayNum = index + 1;
            const isPast = dayNum < currentStreak;
            const isToday = dayNum === currentStreak;
            return (
              <div
                key={dayNum}
                className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition ${
                  isToday
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-2 ring-amber-500/30 scale-105'
                    : isPast
                    ? 'bg-[#0d1117] border-emerald-500/40 text-emerald-400 opacity-80'
                    : 'bg-[#0d1117] border-[#30363d] text-gray-400'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-gray-400">D{dayNum}</span>
                <Coins className={`w-4 h-4 my-1.5 ${isToday ? 'text-amber-400' : isPast ? 'text-emerald-400' : 'text-gray-500'}`} />
                <span className="text-xs font-bold">+{coins}</span>
                {isPast && <CheckCircle className="w-3 h-3 text-emerald-400 mt-1" />}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        {claimedReward ? (
          <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <p className="font-bold text-lg">🎉 Claimed +{claimedReward} Coins!</p>
            <p className="text-xs text-gray-300 mt-1">Your new balance is {user?.coins} Coins. Ready to wager in Duels!</p>
            <button
              onClick={onClose}
              className="mt-3 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition"
            >
              Continue
            </button>
          </div>
        ) : dailyStatus?.canClaim ? (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-base rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Coins className="w-5 h-5 fill-black" />
            {claiming ? 'Claiming Coins...' : `Claim Today's +${todayCoins} Coins`}
          </button>
        ) : (
          <div className="text-center p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 text-sm">
            <p className="font-semibold text-gray-300">✅ Daily bonus already claimed today!</p>
            <p className="text-xs text-gray-500 mt-0.5">Come back tomorrow to continue your streak and claim Day {Math.min(currentStreak + 1, 7)} rewards.</p>
          </div>
        )}
      </div>
    </div>
  );
}
