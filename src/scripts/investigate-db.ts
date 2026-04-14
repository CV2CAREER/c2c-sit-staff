import dotenv from 'dotenv';
dotenv.config();

import { getSequelize } from '../utils/sequelize';

(async () => {
  const sequelize = getSequelize();
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // List tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('📊 Tables in database:', tables);

    // List columns for resources if it exists
    if (tables.includes('resources')) {
      const columns = await sequelize.getQueryInterface().describeTable('resources');
      console.log('📊 Columns in resources:', Object.keys(columns));
    } else {
        console.log('⚠️ resources table not found');
    }

    if (tables.includes('users')) {
        const columns = await sequelize.getQueryInterface().describeTable('users');
        console.log('📊 Columns in users:', Object.keys(columns));
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
