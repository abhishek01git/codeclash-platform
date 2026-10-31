import bcrypt from 'bcryptjs';

export async function getSeedUsers() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return [
    {
      _id: 'user_demo_001',
      username: 'DemoUser',
      email: 'demo@example.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: 'Fullstack Dev & Algorithm enthusiast | Duel grinder ⚔️',
      coins: 450,
      dailyStreak: 3,
      lastDailyClaim: new Date(Date.now() - 3600 * 1000 * 30).toISOString(),
      solvedProblems: ['two-sum', 'valid-parentheses'],
      stats: {
        easySolved: 2,
        mediumSolved: 0,
        hardSolved: 0,
        totalSubmissions: 5,
        duelsWon: 3,
        duelsLost: 1,
        duelCoinsWon: 250
      },
      badges: ['First Solve', 'Duelist Bronze', 'Daily Streak 3d'],
      friends: ['user_alex_002', 'user_sarah_003'],
      friendRequestsSent: [],
      friendRequestsReceived: ['user_interviewer_004'],
      following: ['user_alex_002', 'user_sarah_003', 'user_speedy_005'],
      followers: ['user_alex_002']
    },
    {
      _id: 'user_alex_002',
      username: 'AlexCoder',
      email: 'alex@example.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      bio: 'CS Major @ Stanford. High Stakes 1v1 Challenger!',
      coins: 600,
      dailyStreak: 7,
      lastDailyClaim: new Date().toISOString(),
      solvedProblems: ['two-sum', 'valid-parentheses', 'palindrome-number', 'longest-substring-without-repeating-characters'],
      stats: {
        easySolved: 3,
        mediumSolved: 1,
        hardSolved: 0,
        totalSubmissions: 12,
        duelsWon: 8,
        duelsLost: 4,
        duelCoinsWon: 520
      },
      badges: ['Duelist Silver', 'Streak Master 7d', 'Fast Submitter'],
      friends: ['user_demo_001'],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      following: ['user_demo_001'],
      followers: ['user_demo_001']
    },
    {
      _id: 'user_sarah_003',
      username: 'SarahAlgo',
      email: 'sarah@example.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Competitive Programmer & ICPC Finalist. Bring on the coin bets!',
      coins: 920,
      dailyStreak: 12,
      lastDailyClaim: new Date().toISOString(),
      solvedProblems: ['two-sum', 'valid-parentheses', '3sum', 'container-with-most-water', 'coin-change', 'trapping-rain-water'],
      stats: {
        easySolved: 2,
        mediumSolved: 3,
        hardSolved: 1,
        totalSubmissions: 28,
        duelsWon: 15,
        duelsLost: 2,
        duelCoinsWon: 1100
      },
      badges: ['Hard Problem Slayer', 'Duelist Gold', 'Champion Grandmaster'],
      friends: ['user_demo_001'],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      following: ['user_demo_001'],
      followers: ['user_demo_001']
    },
    {
      _id: 'user_interviewer_004',
      username: 'TechInterviewer',
      email: 'interviewer@example.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Senior Staff Engineer. Conducting live technical mock interviews.',
      coins: 1500,
      dailyStreak: 15,
      lastDailyClaim: new Date().toISOString(),
      solvedProblems: ['two-sum', 'valid-parentheses', 'palindrome-number', 'group-anagrams', 'coin-change'],
      stats: {
        easySolved: 3,
        mediumSolved: 2,
        hardSolved: 0,
        totalSubmissions: 35,
        duelsWon: 5,
        duelsLost: 0,
        duelCoinsWon: 400
      },
      badges: ['Mentor', 'Interview Conductor', 'Code Reviewer'],
      friends: [],
      friendRequestsSent: ['user_demo_001'],
      friendRequestsReceived: [],
      following: [],
      followers: []
    },
    {
      _id: 'user_speedy_005',
      username: 'SpeedyDev',
      email: 'speedy@example.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      bio: 'Sub-minute solves. Challenge me in the Arena if you dare!',
      coins: 300,
      dailyStreak: 2,
      lastDailyClaim: new Date().toISOString(),
      solvedProblems: ['two-sum', 'best-time-to-buy-and-sell-stock'],
      stats: {
        easySolved: 2,
        mediumSolved: 0,
        hardSolved: 0,
        totalSubmissions: 8,
        duelsWon: 4,
        duelsLost: 5,
        duelCoinsWon: 200
      },
      badges: ['Speedster'],
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      following: [],
      followers: ['user_demo_001']
    }
  ];
}
