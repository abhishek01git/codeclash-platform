import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://127.0.0.1:27017/codeclash';

const DEMO_USERNAMES = ['DemoUser', 'TechInterviewer', 'AlexCoder', 'SarahAlgo', 'SpeedyDev'];
const DEMO_EMAILS = [
  'demo@example.com',
  'interviewer@example.com',
  'alex@example.com',
  'sarah@example.com',
  'speedy@example.com'
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  // Find demo users first
  const demoUsers = await usersCol.find({
    $or: [
      { username: { $in: DEMO_USERNAMES } },
      { email: { $in: DEMO_EMAILS } }
    ]
  }).toArray();

  console.log(`Found ${demoUsers.length} demo user(s):`, demoUsers.map(u => u.username));

  if (demoUsers.length === 0) {
    console.log('No demo users to remove. Done.');
    await mongoose.disconnect();
    return;
  }

  const demoIds = demoUsers.map(u => u._id);

  // Delete demo users
  const deleteResult = await usersCol.deleteMany({
    _id: { $in: demoIds }
  });
  console.log(`Deleted ${deleteResult.deletedCount} demo user(s) from users collection.`);

  // Clean up duels referencing demo users (optional: just delete them)
  const duelsCol = db.collection('duels');
  const duelDemoIds = demoUsers.map(u => String(u._id));
  const duelDelete = await duelsCol.deleteMany({
    $or: [
      { challenger: { $in: demoIds } },
      { opponent: { $in: demoIds } },
      { challengerId: { $in: duelDemoIds } },
      { opponentId: { $in: duelDemoIds } }
    ]
  });
  console.log(`Deleted ${duelDelete.deletedCount} duel(s) referencing demo users.`);

  await mongoose.disconnect();
  console.log('Done. Database cleaned up successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
