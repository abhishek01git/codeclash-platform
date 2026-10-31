import { User } from '../models/User.js';

function safeUser(u) {
  const obj = u.toObject ? u.toObject() : { ...u };
  return {
    _id: obj._id,
    username: obj.username,
    avatar: obj.avatar,
    bio: obj.bio,
    coins: obj.coins,
    solvedCount: obj.solvedProblems?.length || 0,
    duelsWon: obj.stats?.duelsWon || 0,
    badges: obj.badges || []
  };
}

export async function getUsers(req, res) {
  try {
    const currentUserId = req.user.userId;
    const users = await User.find();

    const result = users.map(u => ({
      _id: u._id,
      username: u.username,
      avatar: u.avatar,
      bio: u.bio,
      coins: u.coins,
      solvedCount: u.solvedProblems?.length || 0,
      duelsWon: u.stats?.duelsWon || 0,
      badges: u.badges || [],
      isFriend: u.friends?.includes(currentUserId),
      isPendingSent: u.friendRequestsReceived?.includes(currentUserId),
      isPendingReceived: u.friendRequestsSent?.includes(currentUserId),
      isFollowing: u.followers?.includes(currentUserId)
    }));

    res.json({ users: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getFriends(req, res) {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const [friendList, sentList, receivedList, followingList, followerList] = await Promise.all([
      User.find({ _id: { $in: currentUser.friends || [] } }),
      User.find({ _id: { $in: currentUser.friendRequestsSent || [] } }),
      User.find({ _id: { $in: currentUser.friendRequestsReceived || [] } }),
      User.find({ _id: { $in: currentUser.following || [] } }),
      User.find({ _id: { $in: currentUser.followers || [] } })
    ]);

    res.json({
      friends: friendList.map(safeUser),
      pendingSent: sentList.map(safeUser),
      pendingReceived: receivedList.map(safeUser),
      following: followingList.map(safeUser),
      followers: followerList.map(safeUser)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user.userId;

    if (targetUserId === currentUserId) return res.status(400).json({ error: 'Cannot add yourself as a friend' });

    const [sender, recipient] = await Promise.all([User.findById(currentUserId), User.findById(targetUserId)]);
    if (!recipient) return res.status(404).json({ error: 'User not found' });
    if (sender.friends?.includes(targetUserId)) return res.status(400).json({ error: 'Already friends' });

    if (!sender.friendRequestsSent.includes(targetUserId)) sender.friendRequestsSent.push(targetUserId);
    if (!recipient.friendRequestsReceived.includes(currentUserId)) recipient.friendRequestsReceived.push(currentUserId);

    await Promise.all([sender.save(), recipient.save()]);
    res.json({ message: 'Friend request sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { senderUserId } = req.params;
    const currentUserId = req.user.userId;

    const [recipient, sender] = await Promise.all([User.findById(currentUserId), User.findById(senderUserId)]);
    if (!sender) return res.status(404).json({ error: 'User not found' });

    recipient.friendRequestsReceived = (recipient.friendRequestsReceived || []).filter(id => id !== senderUserId);
    sender.friendRequestsSent = (sender.friendRequestsSent || []).filter(id => id !== currentUserId);

    if (!recipient.friends.includes(senderUserId)) recipient.friends.push(senderUserId);
    if (!sender.friends.includes(currentUserId)) sender.friends.push(currentUserId);

    recipient.coins = (recipient.coins || 0) + 15;
    sender.coins = (sender.coins || 0) + 15;

    await Promise.all([recipient.save(), sender.save()]);
    res.json({ message: 'Friend request accepted! +15 Friendship Bonus Coins awarded 🎉', userCoins: recipient.coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function declineFriendRequest(req, res) {
  try {
    const { senderUserId } = req.params;
    const currentUserId = req.user.userId;

    const [recipient, sender] = await Promise.all([User.findById(currentUserId), User.findById(senderUserId)]);

    if (recipient) {
      recipient.friendRequestsReceived = (recipient.friendRequestsReceived || []).filter(id => id !== senderUserId);
      await recipient.save();
    }
    if (sender) {
      sender.friendRequestsSent = (sender.friendRequestsSent || []).filter(id => id !== currentUserId);
      await sender.save();
    }

    res.json({ message: 'Friend request declined' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function toggleFollow(req, res) {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user.userId;

    const [sender, target] = await Promise.all([User.findById(currentUserId), User.findById(targetUserId)]);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const isFollowing = sender.following.includes(targetUserId);

    if (isFollowing) {
      sender.following = sender.following.filter(id => id !== targetUserId);
      target.followers = target.followers.filter(id => id !== currentUserId);
    } else {
      sender.following.push(targetUserId);
      target.followers.push(currentUserId);
    }

    await Promise.all([sender.save(), target.save()]);
    res.json({ isFollowing: !isFollowing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getActivityFeed(req, res) {
  try {
    const feed = [
      { id: 'f1', userId: 'user_alex_002', username: 'AlexCoder', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', type: 'duel_won', title: 'Won a 1v1 Coin Duel!', details: 'Defeated SpeedyDev in "Best Time to Buy and Sell Stock" and scooped 100 Coins! 💰⚔️', timestamp: '15 mins ago' },
      { id: 'f2', userId: 'user_sarah_003', username: 'SarahAlgo', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', type: 'problem_solved', title: 'Solved Hard Problem: Trapping Rain Water', details: 'Achieved 100% test case pass in 42ms using Two Pointers. Earned 100 Coins!', timestamp: '1 hour ago' },
      { id: 'f3', userId: 'user_interviewer_004', username: 'TechInterviewer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', type: 'interview_completed', title: 'Conducted Live Technical Mock Interview', details: 'Evaluated algorithmic complexity, edge cases, and architectural modularity.', timestamp: '3 hours ago' },
      { id: 'f4', userId: 'user_speedy_005', username: 'SpeedyDev', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', type: 'streak', title: 'Daily Streak Achieved!', details: 'Logged in 2 days in a row and claimed 75 bonus coins.', timestamp: '5 hours ago' }
    ];
    res.json({ feed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
