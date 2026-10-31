import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Check,
  X,
  Swords,
  MessageSquare,
  Search,
  Flame,
  Coins,
  Trophy,
  Activity,
  Heart
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SocialPage({ onOpenChat, onChallengeDuel }) {
  const { user, refreshUser, updateCoins } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'following', 'discover', 'feed'
  const [friendsData, setFriendsData] = useState({
    friends: [],
    pendingSent: [],
    pendingReceived: [],
    following: [],
    followers: []
  });
  const [allUsers, setAllUsers] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      const [fData, uData, feedData] = await Promise.all([
        api.getFriends(),
        api.getUsers(),
        api.getActivityFeed()
      ]);
      setFriendsData(fData);
      setAllUsers(uData.users || []);
      setActivityFeed(feedData.feed || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialData();
  }, [user?._id]);

  // Send friend request
  const handleSendRequest = async (targetId) => {
    try {
      await api.sendFriendRequest(targetId);
      toastSuccess('Friend request sent!');
      fetchSocialData();
    } catch (err) {
      toastError(err.message || 'Failed to send friend request');
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (senderId) => {
    try {
      const res = await api.acceptFriendRequest(senderId);
      toastSuccess(res.message);
      updateCoins(res.userCoins);
      fetchSocialData();
      await refreshUser();
    } catch (err) {
      toastError(err.message || 'Failed to accept friend request');
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (senderId) => {
    try {
      await api.declineFriendRequest(senderId);
      toastInfo('Friend request declined');
      fetchSocialData();
    } catch (err) {
      toastError(err.message || 'Failed to decline friend request');
    }
  };

  // Toggle follow
  const handleToggleFollow = async (targetId) => {
    try {
      const res = await api.toggleFollow(targetId);
      toastSuccess(res.isFollowing ? 'Followed user' : 'Unfollowed user');
      fetchSocialData();
    } catch (err) {
      toastError(err.message || 'Failed to toggle follow');
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u._id !== user?._id &&
      (u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.bio && u.bio.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Social & Community Network
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Connect with competitive coders, send friend requests, follow top duelists, and chat 1-on-1.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] p-1 rounded-2xl overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'friends' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Friends ({friendsData.friends?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'requests' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Requests
            {friendsData.pendingReceived?.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'following' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Following ({friendsData.following?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'discover' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Discover Coders
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feed' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Activity Feed
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading social network...
        </div>
      ) : (
        <>
          {/* TAB 1: Friends List */}
          {activeTab === 'friends' && (
            <div>
              {friendsData.friends?.length === 0 ? (
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center text-gray-400">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="font-semibold text-gray-300">No friends added yet.</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    Explore the "Discover Coders" tab to connect with peers and earn +15 friendship bonus coins!
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    Find Coders
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friendsData.friends.map((friend) => (
                    <div
                      key={friend._id}
                      className="bg-[#161b22] border border-[#30363d] hover:border-[#484f58] rounded-2xl p-5 shadow-lg transition flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <img
                          src={friend.avatar}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover border border-emerald-500/50"
                        />
                        <div className="flex-1">
                          <h3 className="font-bold text-sm text-white">{friend.username}</h3>
                          <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{friend.bio}</p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2">
                            <span className="flex items-center gap-1 font-semibold text-amber-400">
                              <Coins className="w-3.5 h-3.5 fill-amber-400" /> {friend.coins} Coins
                            </span>
                            <span>•</span>
                            <span>{friend.solvedCount} Solved</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#21262d]">
                        <button
                          onClick={() => onOpenChat(friend._id)}
                          className="py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Chat
                        </button>
                        <button
                          onClick={() => onChallengeDuel(friend._id)}
                          className="py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Swords className="w-3.5 h-3.5" /> Bet Duel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Friend Requests */}
          {activeTab === 'requests' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-base font-bold text-white mb-3">
                  Received Friend Requests ({friendsData.pendingReceived?.length || 0})
                </h3>
                {friendsData.pendingReceived?.length === 0 ? (
                  <p className="text-xs text-gray-500 bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
                    No incoming friend requests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {friendsData.pendingReceived.map((req) => (
                      <div
                        key={req._id}
                        className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img src={req.avatar} alt="" className="w-10 h-10 rounded-full" />
                          <div>
                            <span className="font-bold text-sm text-white">{req.username}</span>
                            <div className="text-[11px] text-gray-400">{req.bio}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req._id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept (+15 Coins)
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req._id)}
                            className="px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-400 hover:text-white text-xs rounded-lg transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-3">
                  Sent Pending Requests ({friendsData.pendingSent?.length || 0})
                </h3>
                {friendsData.pendingSent?.length === 0 ? (
                  <p className="text-xs text-gray-500 bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
                    No outgoing pending requests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {friendsData.pendingSent.map((req) => (
                      <div
                        key={req._id}
                        className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex items-center justify-between text-xs text-gray-300"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={req.avatar} alt="" className="w-8 h-8 rounded-full" />
                          <span className="font-semibold text-white">{req.username}</span>
                        </div>
                        <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Pending Response
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Following */}
          {activeTab === 'following' && (
            <div>
              {friendsData.following?.length === 0 ? (
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-10 text-center text-gray-400">
                  <Heart className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">You are not following anyone yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {friendsData.following.map((flw) => (
                    <div key={flw._id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={flw.avatar} alt="" className="w-10 h-10 rounded-full" />
                        <div>
                          <div className="font-bold text-sm text-white">{flw.username}</div>
                          <div className="text-[10px] text-gray-400">{flw.solvedCount} Solved</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleFollow(flw._id)}
                        className="px-3 py-1 bg-[#21262d] text-gray-300 text-xs rounded-lg hover:text-white"
                      >
                        Unfollow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Discover Coders */}
          {activeTab === 'discover' && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search coders by username or bio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((coder) => (
                  <div
                    key={coder._id}
                    className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <img src={coder.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                          <div>
                            <h3 className="font-bold text-sm text-white">{coder.username}</h3>
                            <span className="text-[10px] text-amber-400 font-extrabold flex items-center gap-1">
                              <Coins className="w-3 h-3 fill-amber-400" /> {coder.coins} Coins
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleFollow(coder._id)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            coder.isFollowing
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                              : 'bg-[#21262d] text-gray-300 hover:text-white'
                          }`}
                        >
                          {coder.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>

                      <p className="text-xs text-gray-400 line-clamp-2">{coder.bio}</p>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {coder.badges?.map((b) => (
                          <span key={b} className="px-2 py-0.5 bg-[#0d1117] text-gray-400 text-[10px] rounded border border-[#21262d]">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#21262d] flex items-center gap-2">
                      {coder.isFriend ? (
                        <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-center font-bold text-xs">
                          Friends
                        </div>
                      ) : coder.isPendingSent ? (
                        <div className="w-full py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-center font-bold text-xs">
                          Request Sent
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(coder._id)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Activity Feed */}
          {activeTab === 'feed' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <h3 className="text-base font-bold text-white mb-2">Live Community Activity</h3>
              <div className="space-y-3">
                {activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex items-start gap-3.5"
                  >
                    <img src={item.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{item.username}</span>
                        <span className="text-[10px] text-gray-500">{item.timestamp}</span>
                      </div>
                      <div className="text-xs font-semibold text-amber-400 mt-0.5">{item.title}</div>
                      <p className="text-xs text-gray-300 mt-1">{item.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
