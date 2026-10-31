import React from 'react';
import {
  Code2,
  Swords,
  Video,
  Users,
  MessageSquare,
  Gift,
  Trophy,
  Coins,
  Flame,
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth }) {
  const { user, logout, setShowDailyModal, dailyStatus } = useAuth();

  const navItems = [
    { id: 'problems', label: 'Problems', icon: Code2 },
    { id: 'duels', label: '1v1 Arena', icon: Swords, highlight: true },
    { id: 'interview', label: 'Interview', icon: Video },
    { id: 'social', label: 'Social & Friends', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'quests', label: 'Quests & Rewards', icon: Gift, badge: dailyStatus?.canClaim ? 'New' : null },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#161b22]/95 backdrop-blur-md border-b border-[#30363d] px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('problems')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                Code<span className="text-amber-400">Clash</span>
              </span>
            </div>
          </button>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer relative ${
                    isActive
                      ? 'bg-[#21262d] text-white border border-[#30363d]'
                      : item.highlight
                      ? 'text-amber-400 hover:bg-amber-500/10'
                      : 'text-gray-300 hover:text-white hover:bg-[#21262d]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : ''}`} />
                  {item.label}
                  {item.badge && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[9px] font-extrabold rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Coins, Streak, User Status, Sign In / Sign Out */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {/* Daily Streak */}
              <button
                onClick={() => setShowDailyModal(true)}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition cursor-pointer"
                title="Daily Login Streak"
              >
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>{user?.dailyStreak || 1}d</span>
              </button>

              {/* Coins Balance Pill */}
              <button
                onClick={() => setShowDailyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-extrabold hover:bg-amber-500/20 transition cursor-pointer glow-gold"
                title="Click to claim Daily Bonus & Quests"
              >
                <Coins className="w-4 h-4 fill-amber-400" />
                <span>{user?.coins ?? 0}</span>
                <span className="text-[10px] text-amber-500 font-medium hidden sm:inline">Coins</span>
              </button>

              {/* Logged in User Pill + Profile Click */}
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-xl text-xs font-medium text-gray-200 transition cursor-pointer"
                title="View Profile"
              >
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
                  alt={user?.username}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-[#30363d]"
                />
                <span className="font-semibold text-white truncate max-w-[100px]">
                  {user?.username}
                </span>
              </button>

              {/* Sign Out Button */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            /* Not logged in: Show Sign In / Register button */
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs rounded-xl transition shadow-lg cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
