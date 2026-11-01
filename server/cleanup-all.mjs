import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://127.0.0.1:27017/codeclash';

// All usernames/emails that are demo/fake accounts
const DEMO_USERNAMES = ['DemoUser', 'TechInterviewer', 'AlexCoder', 'SarahAlgo', 'SpeedyDev'];
const DEMO_EMAILS = [
  'demo@example.com', 'interviewer@example.com',
  'alex@example.com', 'sarah@example.com', 'speedy@example.com'
];
const DEMO_IDS = ['user_demo_001', 'user_alex_002', 'user_sarah_003', 'user_interviewer_004', 'user_speedy_005'];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB codeclash\n');

  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  console.log('📦 Collections:', cols.map(c => c.name).join(', '), '\n');

  // === Find & Delete Demo Users ===
  const usersCol = db.collection('users');
  const allUsers = await usersCol.find({}).toArray();
  console.log(`👥 Total users in DB: ${allUsers.length}`);
  allUsers.forEach(u => console.log(`   - ${u.username} (${u.email}) [_id: ${u._id}]`));

  const demoUsers = allUsers.filter(u =>
    DEMO_USERNAMES.includes(u.username) ||
    DEMO_EMAILS.includes(u.email) ||
    DEMO_IDS.includes(String(u._id))
  );

  console.log(`\n🗑️  Found ${demoUsers.length} demo user(s) to delete:`, demoUsers.map(u => u.username));

  if (demoUsers.length > 0) {
    const demoDbIds = demoUsers.map(u => u._id);
    const delResult = await usersCol.deleteMany({ _id: { $in: demoDbIds } });
    console.log(`   ✅ Deleted ${delResult.deletedCount} demo user(s)`);

    // Clean duels referencing demo users
    const duelsCol = db.collection('duels');
    const duelsDel = await duelsCol.deleteMany({
      $or: [
        { creator: { $in: demoDbIds } },
        { opponent: { $in: demoDbIds } },
        { creatorName: { $in: DEMO_USERNAMES } },
        { opponentName: { $in: DEMO_USERNAMES } }
      ]
    });
    console.log(`   ✅ Deleted ${duelsDel.deletedCount} duel(s) linked to demo users`);

    // Clean submissions referencing demo users
    const submissionsCol = db.collection('submissions');
    const subsDel = await submissionsCol.deleteMany({
      $or: [
        { userId: { $in: demoDbIds } },
        { userName: { $in: DEMO_USERNAMES } }
      ]
    });
    console.log(`   ✅ Deleted ${subsDel.deletedCount} submission(s) linked to demo users`);
  }

  // === Final state ===
  const remaining = await usersCol.find({}).toArray();
  console.log(`\n✅ Remaining real users (${remaining.length}):`);
  remaining.forEach(u => console.log(`   - ${u.username} (${u.email}) | coins: ${u.coins} | duelsWon: ${u.stats?.duelsWon}`));

  await mongoose.disconnect();
  console.log('\n🎉 Cleanup complete!');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
