import { User } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { Duel } from '../models/Duel.js';
import { Message } from '../models/Message.js';
import { Discussion } from '../models/Discussion.js';

const STREAK_REWARDS = [50, 75, 100, 130, 160, 200, 300];

export async function getDailyStatus(req, res) {
  try {
    const user = await User.findById(req.user.userId).select('dailyStreak lastDailyClaim coins');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;

    let canClaim = false;
    const nextRewardIndex = Math.min((user.dailyStreak || 1) - 1, 6);
    const nextRewardCoins = STREAK_REWARDS[nextRewardIndex];

    if (!lastClaim) {
      canClaim = true;
    } else {
      const isSameDay =
        now.getFullYear() === lastClaim.getFullYear() &&
        now.getMonth() === lastClaim.getMonth() &&
        now.getDate() === lastClaim.getDate();
      canClaim = !isSameDay;
    }

    res.json({ canClaim, currentStreak: user.dailyStreak || 1, todayRewardCoins: nextRewardCoins, coins: user.coins, streakRewards: STREAK_REWARDS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function claimDaily(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;

    if (lastClaim) {
      const isSameDay =
        now.getFullYear() === lastClaim.getFullYear() &&
        now.getMonth() === lastClaim.getMonth() &&
        now.getDate() === lastClaim.getDate();

      if (isSameDay) return res.status(400).json({ error: 'You have already claimed your daily reward today. Come back tomorrow!' });

      const diffHours = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      user.dailyStreak = diffHours > 48 ? 1 : (user.dailyStreak || 1) + 1;
    } else {
      user.dailyStreak = 1;
    }

    const rewardIndex = Math.min((user.dailyStreak || 1) - 1, STREAK_REWARDS.length - 1);
    const coinsAwarded = STREAK_REWARDS[rewardIndex];

    user.coins = (user.coins || 0) + coinsAwarded;
    user.lastDailyClaim = now;
    await user.save();

    res.json({ message: `Daily Login Reward Claimed! +${coinsAwarded} Coins! 🪙🎉`, coinsAwarded, newTotalCoins: user.coins, currentStreak: user.dailyStreak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getDailyTasks(req, res) {
  try {
    const currentUserId = req.user.userId;
    const user = await User.findById(currentUserId).select('stats coins claimedTasks');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [duelsWonCount, messagesSentCount, discussionsPostedCount] = await Promise.all([
      Duel.countDocuments({ $or: [{ creator: currentUserId }, { opponent: currentUserId }], winner: currentUserId }),
      Message.countDocuments({ sender: currentUserId }),
      Discussion.countDocuments({ author: currentUserId })
    ]);

    const easySolved = user.stats?.easySolved || 0;
    const mediumSolved = user.stats?.mediumSolved || 0;
    const claimedTasks = user.claimedTasks || [];

    const tasks = [
      { id: 'task_easy_solve', title: 'Problem Solver I', description: 'Solve at least 1 Easy LeetCode problem', rewardCoins: 30, target: 1, progress: Math.min(easySolved, 1), isCompleted: easySolved >= 1, isClaimed: claimedTasks.includes('task_easy_solve'), icon: 'Code' },
      { id: 'task_medium_solve', title: 'Algo Champion', description: 'Solve 1 Medium or Hard difficulty problem', rewardCoins: 60, target: 1, progress: Math.min(mediumSolved, 1), isCompleted: mediumSolved >= 1, isClaimed: claimedTasks.includes('task_medium_solve'), icon: 'Flame' },
      { id: 'task_duel_win', title: 'Arena Gladiator', description: 'Win a 1v1 Coin Betting Coding Duel', rewardCoins: 100, target: 1, progress: Math.min(duelsWonCount, 1), isCompleted: duelsWonCount >= 1, isClaimed: claimedTasks.includes('task_duel_win'), icon: 'Swords' },
      { id: 'task_send_chat', title: 'Community Networker', description: 'Send a message or duel invite to a peer in Chat', rewardCoins: 20, target: 1, progress: Math.min(messagesSentCount, 1), isCompleted: messagesSentCount >= 1, isClaimed: claimedTasks.includes('task_send_chat'), icon: 'MessageSquare' },
      { id: 'task_solution_share', title: 'Knowledge Sharer', description: 'Post an editorial or insight in the Discussion section', rewardCoins: 40, target: 1, progress: Math.min(discussionsPostedCount, 1), isCompleted: discussionsPostedCount >= 1, isClaimed: claimedTasks.includes('task_solution_share'), icon: 'BookOpen' }
    ];

    res.json({ tasks, userCoins: user.coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function claimTask(req, res) {
  try {
    const { taskId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.claimedTasks) user.claimedTasks = [];
    if (user.claimedTasks.includes(taskId)) return res.status(400).json({ error: 'Task reward already claimed' });

    const taskRewardsMap = { task_easy_solve: 30, task_medium_solve: 60, task_duel_win: 100, task_send_chat: 20, task_solution_share: 40 };
    const coins = taskRewardsMap[taskId] || 25;

    user.claimedTasks.push(taskId);
    user.coins = (user.coins || 0) + coins;
    await user.save();

    res.json({ message: `Task Completed! +${coins} Coins earned! 🪙`, coinsAwarded: coins, newTotalCoins: user.coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
