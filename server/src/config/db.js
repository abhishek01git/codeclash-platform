import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import { Submission } from '../models/Submission.js';
import { Duel } from '../models/Duel.js';
import { Message } from '../models/Message.js';
import { Discussion } from '../models/Discussion.js';
import { problemsData } from '../data/problems.js';
import { getSeedUsers } from '../data/seedUsers.js';

export async function connectDB() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codeclash';

  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    console.log(`[Database] MongoDB Connected: ${mongoose.connection.host}`);
    await seedIfEmpty();
  } catch (err) {
    console.error('[Database] MongoDB connection failed:', err.message);
    console.error('[Database] Make sure MongoDB is running or set MONGO_URI in your .env file.');
    process.exit(1);
  }
}

async function seedIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log(`[Database] Database already seeded (${userCount} users found). Skipping seed.`);
    return;
  }

  console.log('[Database] Empty database detected — seeding initial data...');

  // --- Seed Users ---
  const seedUsers = await getSeedUsers();
  await User.insertMany(seedUsers);
  console.log(`[Database] Seeded ${seedUsers.length} users.`);

  // --- Seed Problems ---
  const problems = problemsData.map((p, idx) => ({
    _id: `prob_${p.slug}`,
    ...p,
    submissionCount: 150 + idx * 25,
    acceptedCount: Math.floor((150 + idx * 25) * (p.acceptanceRate / 100))
  }));
  await Problem.insertMany(problems);
  console.log(`[Database] Seeded ${problems.length} problems.`);

  // --- Seed Sample Messages ---
  const messages = [
    {
      _id: 'msg_001',
      sender: 'user_alex_002',
      recipient: 'user_demo_001',
      content: 'Hey! Ready for a 100 coins duel today? ⚔️',
      type: 'text',
      read: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 2)
    },
    {
      _id: 'msg_002',
      sender: 'user_demo_001',
      recipient: 'user_alex_002',
      content: 'Challenge accepted! Let me practice Two Sum first haha',
      type: 'text',
      read: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 1)
    },
    {
      _id: 'msg_003',
      sender: 'user_sarah_003',
      recipient: 'user_demo_001',
      content: 'I created an open duel for 250 coins if you want to test your dynamic programming skills!',
      type: 'text',
      read: false,
      createdAt: new Date(Date.now() - 1800 * 1000)
    }
  ];
  await Message.insertMany(messages);

  // --- Seed Sample Discussions ---
  const discussions = [
    {
      _id: 'disc_001',
      problemSlug: 'two-sum',
      author: 'user_sarah_003',
      authorName: 'SarahAlgo',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      title: 'Clean O(N) JavaScript Solution with Map - 98% faster!',
      content: `Here is the most intuitive single-pass Map solution:\n\`\`\`javascript\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}\n\`\`\`\nTime Complexity: O(n)\nSpace Complexity: O(n)`,
      tags: ['JavaScript', 'Hash Table', 'Beginner Friendly'],
      upvotes: ['user_demo_001', 'user_alex_002'],
      comments: [
        {
          _id: 'comm_001',
          author: 'user_alex_002',
          authorName: 'AlexCoder',
          authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
          content: 'Super clean and readable! Helped me understand two-sum completely.',
          createdAt: new Date(Date.now() - 3600 * 1000 * 10)
        }
      ],
      createdAt: new Date(Date.now() - 3600 * 1000 * 24)
    },
    {
      _id: 'disc_002',
      problemSlug: 'valid-parentheses',
      author: 'user_alex_002',
      authorName: 'AlexCoder',
      authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      title: 'Stack Intuition & Edge Cases Breakdown',
      content: 'Always remember to check:\n1. Odd length string: impossible to be valid\n2. Stack must be empty at the end!\n3. Bracket mappings can be simplified using an object dictionary.',
      tags: ['Stack', 'Algorithms'],
      upvotes: ['user_sarah_003'],
      comments: [],
      createdAt: new Date(Date.now() - 3600 * 1000 * 12)
    }
  ];
  await Discussion.insertMany(discussions);

  // --- Seed Open Duels ---
  const duels = [
    {
      _id: 'duel_open_001',
      creator: 'user_sarah_003',
      creatorName: 'SarahAlgo',
      creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      opponent: null,
      problemSlug: 'palindrome-number',
      problemTitle: 'Palindrome Number',
      problemDifficulty: 'Easy',
      wager: 100,
      pot: 200,
      status: 'open',
      durationMinutes: 10,
      player1Progress: { passed: 0, total: 0, code: '' },
      player2Progress: { passed: 0, total: 0, code: '' }
    },
    {
      _id: 'duel_open_002',
      creator: 'user_alex_002',
      creatorName: 'AlexCoder',
      creatorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      opponent: null,
      problemSlug: 'best-time-to-buy-and-sell-stock',
      problemTitle: 'Best Time to Buy and Sell Stock',
      problemDifficulty: 'Easy',
      wager: 50,
      pot: 100,
      status: 'open',
      durationMinutes: 10,
      player1Progress: { passed: 0, total: 0, code: '' },
      player2Progress: { passed: 0, total: 0, code: '' }
    }
  ];
  await Duel.insertMany(duels);

  // --- Seed Sample Submissions ---
  const subs = [
    {
      _id: 'sub_001',
      userId: 'user_demo_001',
      userName: 'DemoUser',
      problemSlug: 'two-sum',
      problemTitle: 'Two Sum',
      language: 'javascript',
      code: problemsData[0]?.starterCode?.javascript || '',
      status: 'Accepted',
      runtime: 42,
      memory: 44.2,
      passedTestCases: 5,
      totalTestCases: 5,
      createdAt: new Date(Date.now() - 3600 * 1000 * 20)
    },
    {
      _id: 'sub_002',
      userId: 'user_demo_001',
      userName: 'DemoUser',
      problemSlug: 'valid-parentheses',
      problemTitle: 'Valid Parentheses',
      language: 'javascript',
      code: problemsData[1]?.starterCode?.javascript || '',
      status: 'Accepted',
      runtime: 38,
      memory: 42.1,
      passedTestCases: 5,
      totalTestCases: 5,
      createdAt: new Date(Date.now() - 3600 * 1000 * 15)
    }
  ];
  await Submission.insertMany(subs);

  console.log('[Database] ✅ Seed complete! CodeClash is ready.');
}
