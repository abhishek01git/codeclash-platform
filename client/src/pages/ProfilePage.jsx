import React from 'react';
import {
  User,
  Coins,
  Flame,
  Swords,
  Trophy,
  CheckCircle2,
  Award,
  Zap,
  Code2,
  Calendar,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage({ onNavigate }) {
  const { user } = useAuth();

  const easySolved = user?.stats?.easySolved || 0;
  const mediumSolved = user?.stats?.mediumSolved || 0;
  const hardSolved = user?.stats?.hardSolved || 0;
  const totalSolved = (user?.solvedProblems?.length) || (easySolved + mediumSolved + hardSolved);

  const duelsWon = user?.stats?.duelsWon || 0;
  const duelsLost = user?.stats?.duelsLost || 0;
  const totalDuels = duelsWon + duelsLost;
  const winRate = totalDuels > 0 ? Math.round((duelsWon / totalDuels) * 100) : 0;
  const duelCoinsWon = user?.stats?.duelCoinsWon || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 text-white space-y-8">
      {/* Profile Header Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={user?.username}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow-xl"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{user?.username}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Duel Rank #{duelsWon > 10 ? 'Master' : duelsWon > 4 ? 'Gladiator' : 'Challenger'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-md">{user?.bio || 'Competitive coder ready for duels!'}</p>

              <div className="flex items-center gap-4 text-xs text-gray-400 mt-3 font-medium">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Coins className="w-4 h-4 fill-amber-400" /> {user?.coins || 0} Coins
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-orange-400 font-bold">
                  <Flame className="w-4 h-4 fill-orange-400" /> {user?.dailyStreak || 1} Day Streak
                </span>
                <span>•</span>
                <span>{user?.friends?.length || 0} Friends</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => onNavigate('duels')}
              className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer glow-duel"
            >
              <Swords className="w-4 h-4" /> Enter 1v1 Arena
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Solved Problems Stats & 1v1 Duel Betting Records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Solved Problems Breakdown */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              LeetCode Solved Problems ({totalSolved})
            </h2>
            <button
              onClick={() => onNavigate('problems')}
              className="text-xs text-gray-400 hover:text-white"
            >
              Solve More →
            </button>
          </div>

          <div className="space-y-4">
            {/* Easy */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-400">Easy Problems</span>
                <span className="text-gray-300">{easySolved} Solved</span>
              </div>
              <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(easySolved * 25, 100)}%` }}
                />
              </div>
            </div>

            {/* Medium */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-400">Medium Problems</span>
                <span className="text-gray-300">{mediumSolved} Solved</span>
              </div>
              <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(mediumSolved * 20, 100)}%` }}
                />
              </div>
            </div>

            {/* Hard */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-rose-400">Hard Problems</span>
                <span className="text-gray-300">{hardSolved} Solved</span>
              </div>
              <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${Math.min(hardSolved * 30, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-xs text-gray-400">
            <span>Total Submissions: {user?.stats?.totalSubmissions || 5}</span>
            <span className="text-emerald-400 font-semibold">
              Acceptance Rate: ~{Math.round(((totalSolved) / Math.max(1, user?.stats?.totalSubmissions || 5)) * 100)}%
            </span>
          </div>
        </div>

        {/* 1v1 Betting Duel Records */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-red-400" />
              1v1 Betting Arena Record
            </h2>
            <span className="text-xs font-bold text-amber-400">{winRate}% Win Rate</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 bg-[#0d1117] border border-[#21262d] rounded-2xl">
              <div className="text-2xl font-black text-emerald-400">{duelsWon}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Victories</div>
            </div>
            <div className="p-3.5 bg-[#0d1117] border border-[#21262d] rounded-2xl">
              <div className="text-2xl font-black text-rose-400">{duelsLost}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Defeats</div>
            </div>
            <div className="p-3.5 bg-[#0d1117] border border-[#21262d] rounded-2xl">
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-0.5">
                <Coins className="w-5 h-5 fill-amber-400" />
                {duelCoinsWon}
              </div>
              <div className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">Coins Won</div>
            </div>
          </div>

          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-gray-300">
            <span className="font-bold text-red-400">Escrow Security Guarantee:</span> All wagered coins are secured until code passes 100% test cases. Winner takes both stakes!
          </div>
        </div>
      </div>

      {/* Badges and Achievements */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Badges & Achievements Showcase
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {(user?.badges || ['New Challenger', 'Duelist Bronze', 'Daily Streak 3d', 'Problem Solver']).map((b, i) => (
            <div
              key={i}
              className="p-3.5 bg-[#0d1117] border border-amber-500/20 rounded-2xl flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">{b}</div>
                <div className="text-[10px] text-emerald-400">Unlocked</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
