import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://127.0.0.1:27017/codeclash';

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  // Fix abhi@gmail.com whose username is set to their email
  const abhi = await usersCol.findOne({ email: 'abhi@gmail.com' });
  if (abhi) {
    console.log(`Found user: username="${abhi.username}", email="${abhi.email}"`);
    if (abhi.username === 'abhi@gmail.com') {
      const newUsername = 'abhi';
      await usersCol.updateOne(
        { _id: abhi._id },
        { $set: {
          username: newUsername,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newUsername}`
        }}
      );
      console.log(`✅ Fixed: username changed from "abhi@gmail.com" to "${newUsername}"`);
    } else {
      console.log(`✅ Username is already clean: "${abhi.username}"`);
    }
  } else {
    console.log('User abhi@gmail.com not found');
  }

  // Final state
  const all = await usersCol.find({}).toArray();
  console.log('\n📋 All users after fix:');
  all.forEach(u => console.log(`  - username: "${u.username}", email: ${u.email}`));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
