import dotenv from 'dotenv';
dotenv.config();

import { getSequelize } from '../utils/sequelize';
import { User } from '../models/v1/user.model';
import { Role } from '../utils/enum';

(async () => {
  const sequelize = getSequelize();
  const userId = '413634f2-6695-4974-bd80-fdc39bb501e9';
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    const user = await User.findByPk(userId);
    if (!user) {
      console.error(`❌ User not found with ID: ${userId}`);
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    user.role = Role.ADMIN;
    user.manager = true;
    user.isActive = true;
    user.isEmailVerified = true;
    
    await user.save();
    console.log(`✅ Updated user role to admin, manager to true, and ensured active/verified.`);

    await sequelize.close();
    console.log('✅ Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed with error:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
