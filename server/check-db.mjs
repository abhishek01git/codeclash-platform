import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://127.0.0.1:27017/codeclash';

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  console.log('=== ALL USERS ===');
  const users = await db.collection('users').find({}).toArray();
  users.forEach(u => console.log(JSON.stringify({ _id: u._id, username: u.username, email: u.email, coins: u.coins, stats: u.stats })));

  console.log('\n=== ALL COLLECTIONS ===');
  const cols = await db.listCollections().toArray();
  cols.forEach(c => console.log(c.name));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
