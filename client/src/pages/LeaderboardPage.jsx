import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Coins,
  Swords,
  Flame,
  Award,
  Crown,
  Search,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardPage({ onChallengeUser }) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getLeaderboard();
        setLeaderboard(res.leaderboard || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 text-white space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-extrabold text-xs uppercase tracking-wider">
          <Trophy className="w-4 h-4 fill-amber-400" />
          Global Hall of Fame
        </div>
        <h1 className="text-3xl font-extrabold text-white">
          CodeClash Duelist Rankings
        </h1>
        <p className="text-xs text-gray-400">
          Ranked by total coins won in 1v1 Betting Duels. Climb the leaderboard by challenging others!
        </p>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8 max-w-4xl mx-auto">
          {/* #2 Rank */}
          <div className="bg-[#161b22] border border-gray-600 rounded-3xl p-6 text-center space-y-3 relative order-2 md:order-1">
            <div className="w-16 h-16 rounded-full mx-auto relative border-2 border-gray-400">
              <img src={leaderboard[1].avatar} alt="" className="w-full h-full rounded-full object-cover" />
              <span className="absolute -top-2 -right-2 bg-gray-400 text-black font-extrabold text-xs px-2 py-0.5 rounded-full shadow">
                #2
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{leaderboard[1].username}</h3>
              <div className="text-amber-400 font-extrabold text-xs flex items-center justify-center gap-1 mt-0.5">
                <Coins className="w-3.5 h-3.5 fill-amber-400" />
                {leaderboard[1].duelCoinsWon} Coins Won
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {leaderboard[1].duelsWon}W / {leaderboard[1].duelsLost}L ({leaderboard[1].winRate}% Win Rate)
              </div>
            </div>
          </div>

          {/* #1 Champion */}
          <div className="bg-[#161b22] border-2 border-amber-500 rounded-3xl p-8 text-center space-y-3 relative order-1 md:order-2 glow-gold">
            <Crown className="w-8 h-8 text-amber-400 mx-auto -mt-4 animate-bounce" />
            <div className="w-20 h-20 rounded-full mx-auto relative border-4 border-amber-500 shadow-xl">
              <img src={leaderboard[0].avatar} alt="" className="w-full h-full rounded-full object-cover" />
              <span className="absolute -top-2 -right-2 bg-amber-500 text-black font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow">
                #1
              </span>
            </div>
            <div>
              <h3 className="font-black text-base text-white">{leaderboard[0].username}</h3>
              <div className="text-amber-400 font-extrabold text-sm flex items-center justify-center gap-1 mt-1">
                <Coins className="w-4 h-4 fill-amber-400" />
                {leaderboard[0].duelCoinsWon} Coins Won
              </div>
              <div className="text-xs text-emerald-400 font-bold mt-1">
                {leaderboard[0].duelsWon} Victories ({leaderboard[0].winRate}% Win Rate)
              </div>
            </div>
          </div>

          {/* #3 Rank */}
          <div className="bg-[#161b22] border border-amber-700 rounded-3xl p-6 text-center space-y-3 relative order-3">
            <div className="w-16 h-16 rounded-full mx-auto relative border-2 border-amber-700">
              <img src={leaderboard[2].avatar} alt="" className="w-full h-full rounded-full object-cover" />
              <span className="absolute -top-2 -right-2 bg-amber-700 text-white font-extrabold text-xs px-2 py-0.5 rounded-full shadow">
                #3
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{leaderboard[2].username}</h3>
              <div className="text-amber-400 font-extrabold text-xs flex items-center justify-center gap-1 mt-0.5">
                <Coins className="w-3.5 h-3.5 fill-amber-400" />
                {leaderboard[2].duelCoinsWon} Coins Won
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {leaderboard[2].duelsWon}W / {leaderboard[2].duelsLost}L ({leaderboard[2].winRate}% Win Rate)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Leaderboard Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl max-w-4xl mx-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#30363d] bg-[#0d1117] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-14 text-center">Rank</th>
              <th className="py-3 px-4">Duelist</th>
              <th className="py-3 px-4">Record</th>
              <th className="py-3 px-4">Win Rate</th>
              <th className="py-3 px-4">Coins Won</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {leaderboard.map((item, idx) => {
              const isCurrentUser = item._id === user?._id;
              return (
                <tr
                  key={item._id}
                  className={`hover:bg-[#21262d]/50 transition ${
                    isCurrentUser ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-center font-extrabold text-gray-300">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                    <img src={item.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <div>{item.username}</div>
                      {isCurrentUser && <span className="text-[10px] text-amber-400 font-semibold">(You)</span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-300">
                    <span className="text-emerald-400 font-bold">{item.duelsWon}W</span> /{' '}
                    <span className="text-rose-400 font-bold">{item.duelsLost}L</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-200">
                    {item.winRate}%
                  </td>
                  <td className="py-3.5 px-4 font-black text-amber-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 fill-amber-400" />
                    {item.duelCoinsWon}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {!isCurrentUser && (
                      <button
                        onClick={() => onChallengeUser(item._id)}
                        className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs rounded-lg transition"
                      >
                        Challenge
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
