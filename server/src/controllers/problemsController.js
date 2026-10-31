import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';
import { Submission } from '../models/Submission.js';
import { Discussion } from '../models/Discussion.js';
import { executeCode } from '../services/codeRunner.js';
import { problemsData } from '../data/problems.js';

export async function getProblems(req, res) {
  try {
    const { difficulty, tag, search, status } = req.query;
    const currentUserId = req.user?.userId;

    const filter = {};
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (tag && tag !== 'All') filter.tags = { $elemMatch: { $regex: new RegExp(`^${tag}$`, 'i') } };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const problems = await Problem.find(filter).select('-testCases -editorial -hints -examples -constraints -starterCode');
    const currentUser = currentUserId ? await User.findById(currentUserId).select('solvedProblems') : null;

    let result = problems.map(p => ({
      _id: p._id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      category: p.category,
      tags: p.tags,
      acceptanceRate: p.acceptanceRate,
      submissionCount: p.submissionCount,
      isSolved: currentUser ? currentUser.solvedProblems.includes(p.slug) : false
    }));

    if (status && currentUser) {
      if (status === 'Solved') result = result.filter(p => p.isSolved);
      else if (status === 'Todo') result = result.filter(p => !p.isSolved);
    }

    res.json({ problems: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProblemBySlug(req, res) {
  try {
    const { slug } = req.params;
    const problem = await Problem.findOne({ slug });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const currentUserId = req.user?.userId;
    const currentUser = currentUserId ? await User.findById(currentUserId).select('solvedProblems') : null;
    const isSolved = currentUser ? currentUser.solvedProblems.includes(problem.slug) : false;

    // Refresh starterCode from source file on-the-fly
    const source = problemsData.find(p => p.slug === slug);
    const starterCode = source ? source.starterCode : problem.starterCode;

    const visibleTestCases = problem.testCases.map((tc, idx) => ({
      index: idx + 1,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden
    }));

    const obj = problem.toObject();
    res.json({ problem: { ...obj, starterCode, testCases: visibleTestCases, isSolved } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function runCode(req, res) {
  try {
    const { slug } = req.params;
    const { code, language, customTestCases } = req.body;

    const problem = await Problem.findOne({ slug });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    let testCasesToRun = problem.testCases.filter(tc => !tc.isHidden);
    if (customTestCases?.length > 0) {
      testCasesToRun = customTestCases.map(ct => ({
        input: ct.input,
        expectedOutput: ct.expectedOutput,
        isHidden: false
      }));
    }

    const result = await executeCode({ code, language: language || 'javascript', testCases: testCasesToRun });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function submitCode(req, res) {
  try {
    const { slug } = req.params;
    const { code, language } = req.body;
    const userId = req.user.userId;

    const [problem, user] = await Promise.all([
      Problem.findOne({ slug }),
      User.findById(userId)
    ]);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await executeCode({ code, language: language || 'javascript', testCases: problem.testCases });

    const newSubmission = await Submission.create({
      _id: `sub_${Date.now()}`,
      userId: user._id,
      userName: user.username,
      problemSlug: problem.slug,
      problemTitle: problem.title,
      language: language || 'javascript',
      code,
      status: result.status,
      runtime: result.runtime,
      memory: result.memory,
      passedTestCases: result.passedTestCases,
      totalTestCases: result.totalTestCases
    });

    problem.submissionCount = (problem.submissionCount || 0) + 1;
    user.stats.totalSubmissions = (user.stats.totalSubmissions || 0) + 1;

    let coinsAwarded = 0;
    let isFirstSolve = false;

    if (result.status === 'Accepted') {
      problem.acceptedCount = (problem.acceptedCount || 0) + 1;
      problem.acceptanceRate = Math.round((problem.acceptedCount / problem.submissionCount) * 1000) / 10;

      if (!user.solvedProblems.includes(problem.slug)) {
        isFirstSolve = true;
        user.solvedProblems.push(problem.slug);

        if (problem.difficulty === 'Easy') {
          user.stats.easySolved = (user.stats.easySolved || 0) + 1;
          coinsAwarded += 25;
        } else if (problem.difficulty === 'Medium') {
          user.stats.mediumSolved = (user.stats.mediumSolved || 0) + 1;
          coinsAwarded += 50;
        } else if (problem.difficulty === 'Hard') {
          user.stats.hardSolved = (user.stats.hardSolved || 0) + 1;
          coinsAwarded += 100;
        }
        user.coins = (user.coins || 0) + coinsAwarded;
      }
    }

    await Promise.all([problem.save(), user.save()]);

    res.json({
      result,
      submission: newSubmission,
      coinsAwarded,
      isFirstSolve,
      userCoins: user.coins,
      solvedCount: user.solvedProblems.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProblemSubmissions(req, res) {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;
    const submissions = await Submission.find({ problemSlug: slug, userId }).sort({ createdAt: -1 });
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProblemDiscussions(req, res) {
  try {
    const { slug } = req.params;
    const discussions = await Discussion.find({ problemSlug: slug }).sort({ createdAt: -1 });
    res.json({ discussions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createDiscussion(req, res) {
  try {
    const { slug } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.user.userId;

    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newDisc = await Discussion.create({
      _id: `disc_${Date.now()}`,
      problemSlug: slug,
      author: user._id,
      authorName: user.username,
      authorAvatar: user.avatar,
      title,
      content,
      tags: tags || ['General']
    });

    user.coins = (user.coins || 0) + 10;
    await user.save();

    res.status(201).json({ discussion: newDisc, coinsEarned: 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function upvoteDiscussion(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const disc = await Discussion.findById(id);
    if (!disc) return res.status(404).json({ error: 'Discussion not found' });

    const idx = disc.upvotes.indexOf(userId);
    if (idx === -1) disc.upvotes.push(userId);
    else disc.upvotes.splice(idx, 1);
    await disc.save();

    res.json({ upvotes: disc.upvotes.length, hasUpvoted: idx === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addComment(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    const [disc, user] = await Promise.all([Discussion.findById(id), User.findById(userId)]);
    if (!disc) return res.status(404).json({ error: 'Discussion not found' });

    const newComment = {
      _id: `comm_${Date.now()}`,
      author: user._id,
      authorName: user.username,
      authorAvatar: user.avatar,
      content
    };
    disc.comments.push(newComment);
    await disc.save();

    res.status(201).json({ comment: newComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
