import { Duel } from '../models/Duel.js';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { executeCode } from '../services/codeRunner.js';

// Auto-cleanup expired open duels and refund creators
export async function cleanupExpiredDuels(io) {
  try {
    const now = new Date();
    const expiredDuels = await Duel.find({
      status: 'open',
      expiresAt: { $ne: null, $lte: now }
    });

    for (const duel of expiredDuels) {
      duel.status = 'cancelled';
      duel.completedAt = now;
      await duel.save();

      // Refund the creator
      await User.findByIdAndUpdate(duel.creator, {
        $inc: { coins: duel.wager }
      });

      if (io) {
        io.to(`duel_${duel._id}`).emit('duel_terminated', {
          duelId: duel._id,
          reason: 'Time expired! No opponent joined within 3 minutes. Your wager has been refunded.'
        });
        io.emit('duel_status_changed', { duelId: duel._id, status: 'cancelled' });
      }
    }
  } catch (err) {
    console.error('[Duel Cleanup] Error cleaning expired duels:', err.message);
  }
}

export async function getDuels(req, res) {
  try {
    const io = req.app.get('io');
    await cleanupExpiredDuels(io);

    const duels = await Duel.find().sort({ createdAt: -1 });
    res.json({ duels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createDuel(req, res) {
  try {
    const { problemSlug, wager = 50, durationMinutes = 10 } = req.body;
    const userId = req.user.userId;

    const io = req.app.get('io');
    await cleanupExpiredDuels(io);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Check if user already has an active duel (open or in_progress)
    const activeDuel = await Duel.findOne({
      $or: [
        { creator: userId, status: { $in: ['open', 'in_progress'] } },
        { opponent: userId, status: 'in_progress' }
      ]
    });

    if (activeDuel) {
      return res.status(400).json({
        error: `You already have an active duel (${activeDuel.status === 'open' ? 'Waiting for opponent' : 'In Progress'}). You must finish or cancel it before creating another arena!`
      });
    }

    if (user.coins < wager) {
      return res.status(400).json({ error: `Insufficient coins! You have ${user.coins} coins but need ${wager} to bet.` });
    }

    let selectedProblem;
    if (problemSlug) {
      selectedProblem = await Problem.findOne({ slug: problemSlug });
    } else {
      const pool = await Problem.find({ difficulty: { $ne: 'Hard' } });
      selectedProblem = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!selectedProblem) return res.status(404).json({ error: 'Problem not found' });

    user.coins -= wager;
    await user.save();

    // 3 minutes (180 seconds) join countdown
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    const newDuel = await Duel.create({
      _id: `duel_${Date.now()}`,
      creator: user._id,
      creatorName: user.username,
      creatorAvatar: user.avatar,
      problemSlug: selectedProblem.slug,
      problemTitle: selectedProblem.title,
      problemDifficulty: selectedProblem.difficulty,
      wager,
      pot: wager * 2,
      durationMinutes,
      expiresAt,
      player1Progress: { passed: 0, total: selectedProblem.testCases.length, code: selectedProblem.starterCode?.javascript || '' },
      player2Progress: { passed: 0, total: selectedProblem.testCases.length, code: selectedProblem.starterCode?.javascript || '' }
    });

    if (io) io.emit('new_duel_created', { duel: newDuel });

    res.status(201).json({ duel: newDuel, userCoins: user.coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function joinDuel(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const io = req.app.get('io');
    await cleanupExpiredDuels(io);

    const duel = await Duel.findById(id);
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    if (duel.status !== 'open') return res.status(400).json({ error: 'Duel is no longer open for joining' });
    if (duel.creator === userId) return res.status(400).json({ error: 'You cannot challenge yourself' });

    // Check if duel has expired
    if (duel.expiresAt && new Date() > new Date(duel.expiresAt)) {
      duel.status = 'cancelled';
      await duel.save();
      await User.findByIdAndUpdate(duel.creator, { $inc: { coins: duel.wager } });
      if (io) {
        io.to(`duel_${id}`).emit('duel_terminated', {
          duelId: id,
          reason: 'Time expired! No opponent joined within 3 minutes.'
        });
        io.emit('duel_status_changed', { duelId: id, status: 'cancelled' });
      }
      return res.status(400).json({ error: 'This duel has expired because no opponent joined in time.' });
    }

    // Check if user already has an active duel
    const activeDuel = await Duel.findOne({
      _id: { $ne: id },
      $or: [
        { creator: userId, status: { $in: ['open', 'in_progress'] } },
        { opponent: userId, status: 'in_progress' }
      ]
    });

    if (activeDuel) {
      return res.status(400).json({
        error: 'You already have another active arena match. You must finish it first!'
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.coins < duel.wager) {
      return res.status(400).json({ error: `Insufficient coins! You need ${duel.wager} coins to match this challenge wager.` });
    }

    user.coins -= duel.wager;
    await user.save();

    duel.opponent = user._id;
    duel.opponentName = user.username;
    duel.opponentAvatar = user.avatar;
    duel.status = 'in_progress';
    duel.startedAt = new Date();
    await duel.save();

    if (io) {
      io.to(`duel_${id}`).emit('duel_started', { duel, opponentName: user.username, opponentAvatar: user.avatar });
      io.to(`duel_${id}`).emit('duel_opponent_joined', { userId: user._id, username: user.username, duel });
      io.emit('duel_status_changed', { duelId: id, status: 'in_progress' });
    }

    res.json({ duel, userCoins: user.coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function cancelDuel(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const duel = await Duel.findById(id);
    if (!duel) return res.status(404).json({ error: 'Duel not found' });

    if (duel.creator !== userId) {
      return res.status(403).json({ error: 'Only the creator can cancel this duel' });
    }

    // Opponent already joined check: Once in_progress, they must continue the arena
    if (duel.status !== 'open') {
      return res.status(400).json({
        error: duel.status === 'in_progress'
          ? 'An opponent has already joined! You must finish and continue the arena match.'
          : `Cannot cancel a duel with status: ${duel.status}`
      });
    }

    duel.status = 'cancelled';
    duel.completedAt = new Date();
    await duel.save();

    // Refund creator wager
    const creatorUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { coins: duel.wager } },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`duel_${id}`).emit('duel_terminated', {
        duelId: id,
        reason: 'The arena was ended by the creator. Your wager has been refunded.'
      });
      io.emit('duel_status_changed', { duelId: id, status: 'cancelled' });
    }

    res.json({
      message: 'Arena cancelled successfully! Your wager has been refunded.',
      duel,
      userCoins: creatorUser?.coins || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getDuelById(req, res) {
  try {
    const { id } = req.params;
    const io = req.app.get('io');
    await cleanupExpiredDuels(io);

    const duel = await Duel.findById(id);
    if (!duel) return res.status(404).json({ error: 'Duel not found' });

    const problem = await Problem.findOne({ slug: duel.problemSlug });
    res.json({ duel, problem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function submitDuelCode(req, res) {
  try {
    const { id } = req.params;
    const { code, language } = req.body;
    const userId = req.user.userId;

    const duel = await Duel.findById(id);
    if (!duel) return res.status(404).json({ error: 'Duel not found' });
    if (duel.status === 'completed') {
      return res.status(400).json({ error: 'Duel is already completed. Winner has been declared!' });
    }
    if (duel.status === 'cancelled') {
      return res.status(400).json({ error: 'This duel has been terminated or expired.' });
    }

    const isCreator = duel.creator === userId;
    const isOpponent = duel.opponent === userId;
    if (!isCreator && !isOpponent) {
      return res.status(403).json({ error: 'You are not a participant in this duel' });
    }

    const problem = await Problem.findOne({ slug: duel.problemSlug });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const result = await executeCode({ code, language: language || 'javascript', testCases: problem.testCases });

    const progressObj = isCreator ? duel.player1Progress : duel.player2Progress;
    progressObj.passed = result.passedTestCases;
    progressObj.total = result.totalTestCases;
    progressObj.code = code;

    let duelWon = false;

    if (result.status === 'Accepted' && duel.status === 'in_progress') {
      duelWon = true;
      duel.status = 'completed';
      duel.winner = userId;
      duel.winnerName = isCreator ? duel.creatorName : duel.opponentName;
      duel.completedAt = new Date();

      const loserId = isCreator ? duel.opponent : duel.creator;
      const [winnerUser, loserUser] = await Promise.all([
        User.findById(userId),
        loserId ? User.findById(loserId) : null
      ]);

      if (winnerUser) {
        winnerUser.coins = (winnerUser.coins || 0) + duel.pot;
        winnerUser.stats.duelsWon = (winnerUser.stats.duelsWon || 0) + 1;
        winnerUser.stats.duelCoinsWon = (winnerUser.stats.duelCoinsWon || 0) + duel.pot;
        if (!winnerUser.solvedProblems.includes(problem.slug)) {
          winnerUser.solvedProblems.push(problem.slug);
        }
        await winnerUser.save();
      }

      if (loserUser) {
        loserUser.stats.duelsLost = (loserUser.stats.duelsLost || 0) + 1;
        await loserUser.save();
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`duel_${id}`).emit('duel_game_over', {
          winnerId: userId,
          winnerName: duel.winnerName,
          pot: duel.pot,
          completedAt: duel.completedAt
        });
      }
    }

    await duel.save();
    res.json({ result, duel, duelWon, pot: duel.pot, winner: duel.winnerName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getDuelLeaderboard(req, res) {
  try {
    const users = await User.find().select('username avatar coins stats');
    const leaderboard = users
      .map(u => ({
        _id: u._id,
        username: u.username,
        avatar: u.avatar,
        coins: u.coins,
        duelsWon: u.stats?.duelsWon || 0,
        duelsLost: u.stats?.duelsLost || 0,
        duelCoinsWon: u.stats?.duelCoinsWon || 0,
        winRate: (u.stats?.duelsWon || 0) + (u.stats?.duelsLost || 0) > 0
          ? Math.round(((u.stats?.duelsWon || 0) / ((u.stats?.duelsWon || 0) + (u.stats?.duelsLost || 0))) * 100)
          : 0
      }))
      .sort((a, b) => b.duelCoinsWon - a.duelCoinsWon || b.coins - a.coins);

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
