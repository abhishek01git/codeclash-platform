import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { problemsData } from '../data/problems.js';
import { getSeedUsers } from '../data/seedUsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'db_store.json');

// In-memory or file-backed database store
class Store {
  constructor() {
    this.data = {
      users: [],
      problems: [],
      submissions: [],
      duels: [],
      messages: [],
      groups: [],
      dailyTasks: [],
      discussions: [],
      interviewRooms: []
    };
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log('[Store] Loaded database from persistent file.');
      } else {
        await this.seed();
      }
    } catch (err) {
      console.warn('[Store] Could not read file, seeding fresh database:', err.message);
      await this.seed();
    }

    // Ensure problems are populated if empty
    if (!this.data.problems || this.data.problems.length === 0) {
      this.data.problems = problemsData.map((p, idx) => ({
        _id: `prob_${p.slug}`,
        ...p,
        submissionCount: 150 + idx * 25,
        acceptedCount: Math.floor((150 + idx * 25) * (p.acceptanceRate / 100))
      }));
    }

    if (!this.data.groups) this.data.groups = [];

    // Refresh problem templates from the source file. This keeps existing local
    // data in sync when starter code is changed without resetting user progress.
    const templatesBySlug = new Map(
      problemsData.map((problem) => [problem.slug, problem.starterCode])
    );
    this.data.problems.forEach((problem) => {
      const template = templatesBySlug.get(problem.slug);
      if (template) problem.starterCode = structuredClone(template);
    });
    this.persist();

    this.initialized = true;
  }

  async seed() {
    const seedUsers = await getSeedUsers();
    this.data.users = seedUsers;
    this.data.problems = problemsData.map((p, idx) => ({
      _id: `prob_${p.slug}`,
      ...p,
      submissionCount: 150 + idx * 25,
      acceptedCount: Math.floor((150 + idx * 25) * (p.acceptanceRate / 100))
    }));

    // Seed sample messages
    this.data.messages = [
      {
        _id: 'msg_001',
        sender: 'user_alex_002',
        recipient: 'user_demo_001',
        content: 'Hey! Ready for a 100 coins duel today? ⚔️',
        type: 'text',
        read: true,
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
      },
      {
        _id: 'msg_002',
        sender: 'user_demo_001',
        recipient: 'user_alex_002',
        content: 'Challenge accepted! Let me practice Two Sum first haha',
        type: 'text',
        read: true,
        createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString()
      },
      {
        _id: 'msg_003',
        sender: 'user_sarah_003',
        recipient: 'user_demo_001',
        content: 'I created an open duel for 250 coins if you want to test your dynamic programming skills!',
        type: 'text',
        read: false,
        createdAt: new Date(Date.now() - 1800 * 1000).toISOString()
      }
    ];

    // Seed sample discussions
    this.data.discussions = [
      {
        _id: 'disc_001',
        problemSlug: 'two-sum',
        author: 'user_sarah_003',
        authorName: 'SarahAlgo',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        title: 'Clean O(N) JavaScript Solution with Map - 98% faster!',
        content: `Here is the most intuitive single-pass Map solution:

\`\`\`javascript
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
  return [];
}
\`\`\`
Time Complexity: O(n)
Space Complexity: O(n)
Happy coding!`,
        tags: ['JavaScript', 'Hash Table', 'Beginner Friendly'],
        upvotes: ['user_demo_001', 'user_alex_002'],
        comments: [
          {
            _id: 'comm_001',
            author: 'user_alex_002',
            authorName: 'AlexCoder',
            authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
            content: 'Super clean and readable! Helped me understand two-sum completely.',
            createdAt: new Date(Date.now() - 3600 * 1000 * 10).toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString()
      },
      {
        _id: 'disc_002',
        problemSlug: 'valid-parentheses',
        author: 'user_alex_002',
        authorName: 'AlexCoder',
        authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
        title: 'Stack Intuition & Edge Cases Breakdown',
        content: `Always remember to check:
1. Odd length string: impossible to be valid (immediate false)
2. Stack must be empty at the end!
3. Bracket mappings can be simplified using an object dictionary.`,
        tags: ['Stack', 'Algorithms'],
        upvotes: ['user_sarah_003'],
        comments: [],
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
      }
    ];

    // Seed open/active duels in the Arena
    this.data.duels = [
      {
        _id: 'duel_open_001',
        creator: 'user_sarah_003',
        creatorName: 'SarahAlgo',
        creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        opponent: null,
        problemSlug: 'palindrome-number',
        problemTitle: 'Palindrome Number',
        wager: 100,
        pot: 200,
        status: 'open',
        durationMinutes: 10,
        createdAt: new Date().toISOString()
      },
      {
        _id: 'duel_open_002',
        creator: 'user_alex_002',
        creatorName: 'AlexCoder',
        creatorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
        opponent: null,
        problemSlug: 'best-time-to-buy-and-sell-stock',
        problemTitle: 'Best Time to Buy and Sell Stock',
        wager: 50,
        pot: 100,
        status: 'open',
        durationMinutes: 10,
        createdAt: new Date().toISOString()
      }
    ];

    // Seed sample submissions
    this.data.submissions = [
      {
        _id: 'sub_001',
        userId: 'user_demo_001',
        userName: 'DemoUser',
        problemSlug: 'two-sum',
        problemTitle: 'Two Sum',
        language: 'javascript',
        code: problemsData[0].starterCode.javascript,
        status: 'Accepted',
        runtime: 42,
        memory: 44.2,
        passedTestCases: 5,
        totalTestCases: 5,
        createdAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString()
      },
      {
        _id: 'sub_002',
        userId: 'user_demo_001',
        userName: 'DemoUser',
        problemSlug: 'valid-parentheses',
        problemTitle: 'Valid Parentheses',
        language: 'javascript',
        code: problemsData[1].starterCode.javascript,
        status: 'Accepted',
        runtime: 38,
        memory: 42.1,
        passedTestCases: 5,
        totalTestCases: 5,
        createdAt: new Date(Date.now() - 3600 * 1000 * 15).toISOString()
      }
    ];

    this.persist();
  }

  persist() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Store] Failed to write persistent store file:', err.message);
    }
  }

  // Generic helpers
  getTable(table) {
    if (!this.data[table]) this.data[table] = [];
    return this.data[table];
  }
}

export const dbStore = new Store();
