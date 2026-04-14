import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize-typescript';
import { User } from '../models/v1/user.model';
import { Role } from '../utils/enum';
import { modelList } from '../utils/modelsList';

(async () => {
  const userId = '413634f2-6695-4974-bd80-fdc39bb501e9';
  const dbUrl = process.env.DB_HOST_NEW || 'postgresql://doadmin:AVNS_Ncu33J95k9S343shTyL@unification-staging-db-do-user-12600817-0.f.db.ondigitalocean.com:25060/c2c_iat?sslmode=require';
  
  console.log('🔗 Using DB URL:', dbUrl.split('@')[1]); // Log without credentials

  const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: console.log,
    models: modelList,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 1,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

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
