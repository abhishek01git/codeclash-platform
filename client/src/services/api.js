const BASE_URL = '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  googleAuth: (body) => request('/auth/google', { method: 'POST', body }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/me', { method: 'PUT', body }),
  demoSwitch: (targetUserId) => request('/auth/demo-switch', { method: 'POST', body: { targetUserId } }),

  // Problems (LeetCode)
  getProblems: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/problems${query ? `?${query}` : ''}`);
  },
  getProblemBySlug: (slug) => request(`/problems/${slug}`),
  runCode: (slug, body) => request(`/problems/${slug}/run`, { method: 'POST', body }),
  submitCode: (slug, body) => request(`/problems/${slug}/submit`, { method: 'POST', body }),
  getProblemSubmissions: (slug) => request(`/problems/${slug}/submissions`),
  getProblemDiscussions: (slug) => request(`/problems/${slug}/discussions`),
  createDiscussion: (slug, body) => request(`/problems/${slug}/discussions`, { method: 'POST', body }),
  upvoteDiscussion: (id) => request(`/problems/discussions/${id}/upvote`, { method: 'POST' }),
  addComment: (id, body) => request(`/problems/discussions/${id}/comment`, { method: 'POST', body }),

  // Duels / Betting
  getDuels: () => request('/duels'),
  getLeaderboard: () => request('/duels/leaderboard'),
  createDuel: (body) => request('/duels/create', { method: 'POST', body }),
  joinDuel: (id) => request(`/duels/${id}/join`, { method: 'POST' }),
  cancelDuel: (id) => request(`/duels/${id}/cancel`, { method: 'POST' }),
  getDuelById: (id) => request(`/duels/${id}`),
  submitDuelCode: (id, body) => request(`/duels/${id}/submit`, { method: 'POST', body }),

  // Social & Friends
  getUsers: () => request('/social/users'),
  getFriends: () => request('/social/friends'),
  sendFriendRequest: (targetUserId) => request(`/social/friend-request/${targetUserId}`, { method: 'POST' }),
  acceptFriendRequest: (senderUserId) => request(`/social/friend-request/${senderUserId}/accept`, { method: 'POST' }),
  declineFriendRequest: (senderUserId) => request(`/social/friend-request/${senderUserId}/decline`, { method: 'POST' }),
  toggleFollow: (targetUserId) => request(`/social/follow/${targetUserId}`, { method: 'POST' }),
  getActivityFeed: () => request('/social/feed'),

  // Chat
  getConversations: () => request('/chat/conversations'),
  getMessages: (otherUserId) => request(`/chat/messages/${otherUserId}`),
  sendMessage: (body) => request('/chat/send', { method: 'POST', body }),
  blockUser: (userId) => request(`/chat/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId) => request(`/chat/users/${userId}/unblock`, { method: 'POST' }),
  clearChat: (userId) => request(`/chat/users/${userId}/clear`, { method: 'POST' }),
  getGroups: () => request('/chat/groups'),
  createGroup: (body) => request('/chat/groups', { method: 'POST', body }),
  updateGroup: (groupId, body) => request(`/chat/groups/${groupId}`, { method: 'PUT', body }),
  getGroupMessages: (groupId) => request(`/chat/groups/${groupId}/messages`),
  sendGroupMessage: (groupId, body) => request(`/chat/groups/${groupId}/send`, { method: 'POST', body }),

  // Rewards & Gamification
  getDailyStatus: () => request('/rewards/daily-status'),
  claimDaily: () => request('/rewards/claim-daily', { method: 'POST' }),
  getDailyTasks: () => request('/rewards/daily-tasks'),
  claimTask: (taskId) => request(`/rewards/claim-task/${taskId}`, { method: 'POST' }),

  // Interview Platform
  createInterviewRoom: (body) => request('/interview/create-room', { method: 'POST', body }),
  getInterviewRoom: (roomId) => request(`/interview/room/${roomId}`),
  submitInterviewFeedback: (roomId, body) => request(`/interview/room/${roomId}/feedback`, { method: 'POST', body })
};
