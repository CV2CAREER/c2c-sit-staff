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

    // Update core admin fields
    user.role = Role.ADMIN;
    user.manager = true;
    user.isActive = true;
    user.isEmailVerified = true;
    
    // Explicitly set some permissions if possible, but let's stick to the core first
    // If the user wants granular permissions, they usually come from the admin role in this app
    
    await user.save();
    console.log(`✅ Successfully updated user ${user.email} to Admin and Manager`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
