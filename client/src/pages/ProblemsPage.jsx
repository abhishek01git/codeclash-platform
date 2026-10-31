import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Filter,
  Flame,
  Code2,
  Coins
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProblemsPage({ onSelectProblem }) {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const tagsList = ['All', 'Array', 'String', 'Hash Table', 'Two Pointers', 'Dynamic Programming', 'Stack', 'Math'];

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const data = await api.getProblems({
        difficulty: selectedDifficulty,
        tag: selectedTag,
        search,
        status: selectedStatus
      });
      setProblems(data.problems || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [selectedDifficulty, selectedTag, selectedStatus, user?.solvedProblems]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProblems();
  };

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'hard':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Daily Challenge Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#1c1917] to-amber-900/20 border border-amber-500/30 p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
                  Daily Challenge
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  Rewards Double Coins
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">Two Sum</h2>
              <p className="text-xs text-gray-400">
                Solve the daily LeetCode challenge to earn <span className="text-amber-400 font-bold">+100 Coins</span> and keep your login streak alive!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectProblem('two-sum')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-sm rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              Solve Challenge
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-6 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search problems by name or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
            />
          </form>

          {/* Difficulty Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedDifficulty === diff
                    ? diff === 'Easy'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : diff === 'Medium'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : diff === 'Hard'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-[#21262d] text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            {['All', 'Solved', 'Todo'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-[#30363d] text-white border border-gray-500'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#21262d] text-xs">
          <span className="text-gray-400 flex items-center gap-1 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" /> Tags:
          </span>
          {tagsList.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition cursor-pointer ${
                selectedTag === tag
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'bg-[#21262d] text-gray-400 hover:text-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#30363d] bg-[#0d1117]/60 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4">Acceptance</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
                    Loading problems...
                  </td>
                </tr>
              ) : problems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    No problems found matching your criteria.
                  </td>
                </tr>
              ) : (
                problems.map((prob) => {
                  const isSolved = user?.solvedProblems?.includes(prob.slug);
                  return (
                    <tr
                      key={prob.slug}
                      onClick={() => onSelectProblem(prob.slug)}
                      className="hover:bg-[#21262d]/50 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 text-center">
                        {isSolved ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-600 mx-auto group-hover:text-gray-400 transition" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white group-hover:text-amber-400 transition">
                        {prob.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getDifficultyColor(prob.difficulty)}`}>
                          {prob.difficulty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 font-medium">
                        {prob.acceptanceRate}%
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {prob.tags?.slice(0, 3).map((t) => (
                            <span key={t} className="px-2 py-0.5 bg-[#21262d] text-gray-300 text-[11px] rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProblem(prob.slug);
                          }}
                          className="px-3.5 py-1.5 bg-[#21262d] group-hover:bg-amber-500 text-gray-200 group-hover:text-black font-semibold text-xs rounded-lg transition"
                        >
                          {isSolved ? 'Review' : 'Solve'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
