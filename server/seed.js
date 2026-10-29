
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const connectDB = require('./config/db');
const User = require('./models/User');
const Folder = require('./models/Folder');

const DEMO_EMAIL = 'cloudnest.demo@example.com';
const DEMO_PASSWORD = 'CloudNestDemo2026!';

async function seedDemo() {
  try {
    await connectDB();

    let user = await User.findOne({ email: DEMO_EMAIL });

    if (!user) {
      user = await User.create({
        name: 'CloudNest Demo',
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      console.log('Demo user created.');
    } else {
      console.log('Demo user already exists.');
    }

    const existingFolder = await Folder.findOne({
      owner: user._id,
      name: 'Demo Documents',
      parent: null,
    });

    if (!existingFolder) {
      await Folder.create({
        name: 'Demo Documents',
        owner: user._id,
        parent: null,
      });
      console.log('Demo folder created.');
    } else {
      console.log('Demo folder already exists.');
    }

    console.log('\nDemo login:');
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
    console.log('\nSeed completed successfully.');
    process.exitCode = 0;
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect().catch(() => {});
  }
}

seedDemo();
