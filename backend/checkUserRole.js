const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkAndUpdateUserRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get your user email
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node checkUserRole.js <your-email>');
      process.exit(1);
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Current user role: ${user.role}`);
    
    if (user.role !== 'admin' && user.role !== 'manager') {
      console.log('Updating role to admin...');
      user.role = 'admin';
      await user.save();
      console.log('✅ Role updated to admin');
    } else {
      console.log('✅ User already has admin/manager role');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndUpdateUserRole();
