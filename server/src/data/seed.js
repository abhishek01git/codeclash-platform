/**
 * Full seed script — wipes & repopulates all CodeClash collections.
 * Run: node src/data/seed.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { Duel } from '../models/Duel.js';
import { Message } from '../models/Message.js';
import { Discussion } from '../models/Discussion.js';
import { Group } from '../models/Group.js';
import { InterviewRoom } from '../models/InterviewRoom.js';
import { problemsData } from './problems.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codeclash';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', mongoose.connection.host);

  // ── Wipe all collections ────────────────────────────────────────────
  console.log('\n🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Problem.deleteMany({}),
    Submission.deleteMany({}),
    Duel.deleteMany({}),
    Message.deleteMany({}),
    Discussion.deleteMany({}),
    Group.deleteMany({}),
    InterviewRoom.deleteMany({})
  ]);
  console.log('   All collections cleared.');

  // ── Seed Users ──────────────────────────────────────────────────────
  console.log('\n👥 Seeding users...');
  const pw = await bcrypt.hash('password123', 10);

  const users = await User.insertMany([
    {
      _id: 'user_demo_001',
      username: 'DemoUser',
      email: 'demo@example.com',
      password: pw,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: 'Fullstack Dev & Algorithm enthusiast | Duel grinder ⚔️',
      coins: 450,
      dailyStreak: 3,
      lastDailyClaim: new Date(Date.now() - 3600 * 1000 * 30),
      solvedProblems: ['two-sum', 'valid-parentheses'],
      stats: { easySolved: 2, mediumSolved: 0, hardSolved: 0, totalSubmissions: 5, duelsWon: 3, duelsLost: 1, duelCoinsWon: 250 },
      badges: ['First Solve', 'Duelist Bronze', 'Daily Streak 3d'],
      friends: ['user_alex_002', 'user_sarah_003'],
      friendRequestsReceived: ['user_interviewer_004'],
      following: ['user_alex_002', 'user_sarah_003', 'user_speedy_005'],
      followers: ['user_alex_002']
    },
    {
      _id: 'user_alex_002',
      username: 'AlexCoder',
      email: 'alex@example.com',
      password: pw,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      bio: 'CS Major @ Stanford. High Stakes 1v1 Challenger!',
      coins: 600,
      dailyStreak: 7,
      lastDailyClaim: new Date(),
      solvedProblems: ['two-sum', 'valid-parentheses', 'palindrome-number', 'longest-substring-without-repeating-characters'],
      stats: { easySolved: 3, mediumSolved: 1, hardSolved: 0, totalSubmissions: 12, duelsWon: 8, duelsLost: 4, duelCoinsWon: 520 },
      badges: ['Duelist Silver', 'Streak Master 7d', 'Fast Submitter'],
      friends: ['user_demo_001'],
      following: ['user_demo_001'],
      followers: ['user_demo_001']
    },
    {
      _id: 'user_sarah_003',
      username: 'SarahAlgo',
      email: 'sarah@example.com',
      password: pw,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Competitive Programmer & ICPC Finalist. Bring on the coin bets!',
      coins: 920,
      dailyStreak: 12,
      lastDailyClaim: new Date(),
      solvedProblems: ['two-sum', 'valid-parentheses', '3sum', 'container-with-most-water', 'coin-change', 'trapping-rain-water'],
      stats: { easySolved: 2, mediumSolved: 3, hardSolved: 1, totalSubmissions: 28, duelsWon: 15, duelsLost: 2, duelCoinsWon: 1100 },
      badges: ['Hard Problem Slayer', 'Duelist Gold', 'Champion Grandmaster'],
      friends: ['user_demo_001'],
      following: ['user_demo_001'],
      followers: ['user_demo_001']
    },
    {
      _id: 'user_interviewer_004',
      username: 'TechInterviewer',
      email: 'interviewer@example.com',
      password: pw,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Senior Staff Engineer. Conducting live technical mock interviews.',
      coins: 1500,
      dailyStreak: 15,
      lastDailyClaim: new Date(),
      solvedProblems: ['two-sum', 'valid-parentheses', 'palindrome-number', 'group-anagrams', 'coin-change'],
      stats: { easySolved: 3, mediumSolved: 2, hardSolved: 0, totalSubmissions: 35, duelsWon: 5, duelsLost: 0, duelCoinsWon: 400 },
      badges: ['Mentor', 'Interview Conductor', 'Code Reviewer'],
      friendRequestsSent: ['user_demo_001']
    },
    {
      _id: 'user_speedy_005',
      username: 'SpeedyDev',
      email: 'speedy@example.com',
      password: pw,
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      bio: 'Sub-minute solves. Challenge me in the Arena if you dare!',
      coins: 300,
      dailyStreak: 2,
      lastDailyClaim: new Date(),
      solvedProblems: ['two-sum', 'best-time-to-buy-and-sell-stock'],
      stats: { easySolved: 2, mediumSolved: 0, hardSolved: 0, totalSubmissions: 8, duelsWon: 4, duelsLost: 5, duelCoinsWon: 200 },
      badges: ['Speedster'],
      followers: ['user_demo_001']
    }
  ]);
  console.log(`   ✔ ${users.length} users seeded.`);

  // ── Seed Problems ───────────────────────────────────────────────────
  console.log('\n📚 Seeding problems...');
  const problems = await Problem.insertMany(
    problemsData.map((p, idx) => ({
      _id: `prob_${p.slug}`,
      ...p,
      submissionCount: 150 + idx * 25,
      acceptedCount: Math.floor((150 + idx * 25) * (p.acceptanceRate / 100))
    }))
  );
  console.log(`   ✔ ${problems.length} problems seeded.`);

  // ── Seed Submissions ────────────────────────────────────────────────
  console.log('\n📝 Seeding submissions...');
  const submissions = await Submission.insertMany([
    { _id: 'sub_001', userId: 'user_demo_001', userName: 'DemoUser', problemSlug: 'two-sum', problemTitle: 'Two Sum', language: 'javascript', code: problemsData[0].starterCode.javascript, status: 'Accepted', runtime: 42, memory: 44.2, passedTestCases: 5, totalTestCases: 5, createdAt: new Date(Date.now() - 3600*1000*20) },
    { _id: 'sub_002', userId: 'user_demo_001', userName: 'DemoUser', problemSlug: 'valid-parentheses', problemTitle: 'Valid Parentheses', language: 'javascript', code: problemsData[1].starterCode.javascript, status: 'Accepted', runtime: 38, memory: 42.1, passedTestCases: 5, totalTestCases: 5, createdAt: new Date(Date.now() - 3600*1000*15) },
    { _id: 'sub_003', userId: 'user_alex_002', userName: 'AlexCoder', problemSlug: 'two-sum', problemTitle: 'Two Sum', language: 'javascript', code: problemsData[0].starterCode.javascript, status: 'Accepted', runtime: 35, memory: 43.1, passedTestCases: 5, totalTestCases: 5, createdAt: new Date(Date.now() - 3600*1000*10) },
    { _id: 'sub_004', userId: 'user_alex_002', userName: 'AlexCoder', problemSlug: 'palindrome-number', problemTitle: 'Palindrome Number', language: 'javascript', code: problemsData[2].starterCode.javascript, status: 'Accepted', runtime: 55, memory: 41.5, passedTestCases: 4, totalTestCases: 4, createdAt: new Date(Date.now() - 3600*1000*8) },
    { _id: 'sub_005', userId: 'user_sarah_003', userName: 'SarahAlgo', problemSlug: 'trapping-rain-water', problemTitle: 'Trapping Rain Water', language: 'javascript', code: problemsData[9].starterCode.javascript, status: 'Accepted', runtime: 28, memory: 40.0, passedTestCases: 5, totalTestCases: 5, createdAt: new Date(Date.now() - 3600*1000*5) },
    { _id: 'sub_006', userId: 'user_sarah_003', userName: 'SarahAlgo', problemSlug: 'coin-change', problemTitle: 'Coin Change', language: 'python', code: problemsData[7].starterCode.python, status: 'Accepted', runtime: 60, memory: 39.5, passedTestCases: 4, totalTestCases: 4, createdAt: new Date(Date.now() - 3600*1000*3) },
    { _id: 'sub_007', userId: 'user_speedy_005', userName: 'SpeedyDev', problemSlug: 'two-sum', problemTitle: 'Two Sum', language: 'javascript', code: problemsData[0].starterCode.javascript, status: 'Wrong Answer', runtime: 0, memory: 0, passedTestCases: 2, totalTestCases: 5, createdAt: new Date(Date.now() - 3600*1000*2) },
    { _id: 'sub_008', userId: 'user_interviewer_004', userName: 'TechInterviewer', problemSlug: '3sum', problemTitle: '3Sum', language: 'javascript', code: problemsData[5].starterCode.javascript, status: 'Accepted', runtime: 88, memory: 47.0, passedTestCases: 5, totalTestCases: 5, createdAt: new Date(Date.now() - 1800*1000) }
  ]);
  console.log(`   ✔ ${submissions.length} submissions seeded.`);

  // ── Seed Duels ──────────────────────────────────────────────────────
  console.log('\n⚔️  Seeding duels...');
  const duels = await Duel.insertMany([
    {
      _id: 'duel_open_001',
      creator: 'user_sarah_003', creatorName: 'SarahAlgo', creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      opponent: null, problemSlug: 'palindrome-number', problemTitle: 'Palindrome Number', problemDifficulty: 'Easy',
      wager: 100, pot: 200, status: 'open', durationMinutes: 10,
      player1Progress: { passed: 0, total: 4, code: '' }, player2Progress: { passed: 0, total: 4, code: '' }
    },
    {
      _id: 'duel_open_002',
      creator: 'user_alex_002', creatorName: 'AlexCoder', creatorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      opponent: null, problemSlug: 'best-time-to-buy-and-sell-stock', problemTitle: 'Best Time to Buy and Sell Stock', problemDifficulty: 'Easy',
      wager: 50, pot: 100, status: 'open', durationMinutes: 10,
      player1Progress: { passed: 0, total: 4, code: '' }, player2Progress: { passed: 0, total: 4, code: '' }
    },
    {
      _id: 'duel_open_003',
      creator: 'user_speedy_005', creatorName: 'SpeedyDev', creatorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      opponent: null, problemSlug: 'two-sum', problemTitle: 'Two Sum', problemDifficulty: 'Easy',
      wager: 250, pot: 500, status: 'open', durationMinutes: 15,
      player1Progress: { passed: 0, total: 5, code: '' }, player2Progress: { passed: 0, total: 5, code: '' }
    },
    {
      _id: 'duel_completed_001',
      creator: 'user_demo_001', creatorName: 'DemoUser', creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      opponent: 'user_alex_002', opponentName: 'AlexCoder', opponentAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      problemSlug: 'two-sum', problemTitle: 'Two Sum', problemDifficulty: 'Easy',
      wager: 100, pot: 200, status: 'completed', durationMinutes: 10,
      startedAt: new Date(Date.now() - 3600*1000*5), completedAt: new Date(Date.now() - 3600*1000*4),
      winner: 'user_demo_001', winnerName: 'DemoUser',
      player1Progress: { passed: 5, total: 5, code: problemsData[0].starterCode.javascript },
      player2Progress: { passed: 3, total: 5, code: problemsData[0].starterCode.javascript }
    }
  ]);
  console.log(`   ✔ ${duels.length} duels seeded.`);

  // ── Seed Messages ───────────────────────────────────────────────────
  console.log('\n💬 Seeding messages...');
  const messages = await Message.insertMany([
    { _id: 'msg_001', sender: 'user_alex_002', recipient: 'user_demo_001', content: 'Hey! Ready for a 100 coins duel today? ⚔️', type: 'text', read: true, createdAt: new Date(Date.now() - 3600*1000*2) },
    { _id: 'msg_002', sender: 'user_demo_001', recipient: 'user_alex_002', content: 'Challenge accepted! Let me warm up with Two Sum first 😂', type: 'text', read: true, createdAt: new Date(Date.now() - 3600*1000) },
    { _id: 'msg_003', sender: 'user_sarah_003', recipient: 'user_demo_001', content: 'I created an open duel for 250 coins — dynamic programming skills on test!', type: 'text', read: false, createdAt: new Date(Date.now() - 1800*1000) },
    { _id: 'msg_004', sender: 'user_interviewer_004', recipient: 'user_demo_001', content: 'Hey, want to do a mock interview? I have a slot open tomorrow!', type: 'text', read: false, createdAt: new Date(Date.now() - 900*1000) },
    { _id: 'msg_005', sender: 'user_speedy_005', recipient: 'user_alex_002', content: 'GGs! Rematch? 250 coins this time 🔥', type: 'text', read: true, createdAt: new Date(Date.now() - 600*1000) }
  ]);
  console.log(`   ✔ ${messages.length} messages seeded.`);

  // ── Seed Discussions ────────────────────────────────────────────────
  console.log('\n💡 Seeding discussions...');
  const discussions = await Discussion.insertMany([
    {
      _id: 'disc_001',
      problemSlug: 'two-sum', author: 'user_sarah_003', authorName: 'SarahAlgo',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      title: 'Clean O(N) JS Solution with HashMap — 98% faster!',
      content: '```javascript\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n}\n```\nTime: O(n) | Space: O(n)',
      tags: ['JavaScript', 'Hash Table', 'Beginner Friendly'],
      upvotes: ['user_demo_001', 'user_alex_002', 'user_speedy_005'],
      comments: [
        { _id: 'comm_001', author: 'user_alex_002', authorName: 'AlexCoder', authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', content: 'Super clean! This finally clicked for me.', createdAt: new Date(Date.now() - 3600*1000*10) },
        { _id: 'comm_002', author: 'user_demo_001', authorName: 'DemoUser', authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', content: 'The single-pass trick is genius 🔥', createdAt: new Date(Date.now() - 3600*1000*8) }
      ],
      createdAt: new Date(Date.now() - 3600*1000*24)
    },
    {
      _id: 'disc_002',
      problemSlug: 'valid-parentheses', author: 'user_alex_002', authorName: 'AlexCoder',
      authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      title: 'Stack Intuition & Edge Cases Breakdown',
      content: 'Key things to remember:\n1. Odd-length string → immediately return false\n2. Stack must be empty at the end\n3. Use a map for bracket pairs',
      tags: ['Stack', 'Algorithms'],
      upvotes: ['user_sarah_003', 'user_demo_001'],
      comments: [],
      createdAt: new Date(Date.now() - 3600*1000*12)
    },
    {
      _id: 'disc_003',
      problemSlug: 'trapping-rain-water', author: 'user_sarah_003', authorName: 'SarahAlgo',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      title: 'Two Pointer approach — O(1) space beats 99%!',
      content: 'Instead of two passes with prefix/suffix arrays, use two pointers meeting in the middle. Water at each bar = min(maxLeft, maxRight) - height[i].',
      tags: ['Two Pointers', 'Hard', 'Optimal'],
      upvotes: ['user_demo_001', 'user_alex_002', 'user_interviewer_004'],
      comments: [
        { _id: 'comm_003', author: 'user_interviewer_004', authorName: 'TechInterviewer', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: 'This is exactly what I ask in interviews. Excellent explanation!', createdAt: new Date(Date.now() - 1800*1000) }
      ],
      createdAt: new Date(Date.now() - 3600*1000*6)
    }
  ]);
  console.log(`   ✔ ${discussions.length} discussions seeded.`);

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete! Summary:');
  const counts = await Promise.all([
    User.countDocuments(), Problem.countDocuments(), Submission.countDocuments(),
    Duel.countDocuments(), Message.countDocuments(), Discussion.countDocuments()
  ]);
  const labels = ['users', 'problems', 'submissions', 'duels', 'messages', 'discussions'];
  counts.forEach((c, i) => console.log(`   ${labels[i]}: ${c}`));

  await mongoose.disconnect();
  console.log('\n✅ Done. Restart your server and check MongoDB Compass!');
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
