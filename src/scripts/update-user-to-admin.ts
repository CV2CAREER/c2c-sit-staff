import dotenv from 'dotenv';
dotenv.config();

import { getSequelize } from '../utils/sequelize';
import { User } from '../models/v1/user.model';
import { Resource } from '../models/v1/resources.model';
import { UserPermission } from '../models/v1/user-permissions.model';
import { Role, Ability } from '../utils/enum';

(async () => {
  const sequelize = getSequelize();
  const userId = '413634f2-6695-4974-bd80-fdc39bb501e9';
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Debug: Describe resources table
    try {
      const tableDesc = await sequelize.getQueryInterface().describeTable('resources');
      console.log('📊 Table resources structure:', Object.keys(tableDesc));
    } catch (e) {
      console.error('❌ Failed to describe table resources:', e);
    }

    // 1. Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      console.error(`❌ User not found with ID: ${userId}`);
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    // 2. Fetch all resources - try with raw query if model fails
    let allResources: any[] = [];
    try {
      allResources = await Resource.findAll();
    } catch (e) {
      console.log('⚠️ Resource.findAll() failed, trying raw query...');
      allResources = await sequelize.query('SELECT id, name, value FROM resources', { type: 'SELECT' } as any);
    }
    console.log(`✅ Found ${allResources.length} resources`);

    // 3. Update User role and permissions JSONB
    const fullPermissions = allResources.map(resource => ({
      resourceId: resource.id,
      ability: [Ability.FULL, Ability.READ, Ability.WRITE, Ability.EDIT, Ability.DELETE]
    }));

    user.role = Role.ADMIN;
    user.permissions = fullPermissions;
    await user.save();
    console.log(`✅ Updated user role to admin and updated permissions JSONB`);

    // 4. Update UserPermission table
    // First clear existing permissions for this user
    await UserPermission.destroy({ where: { userId } });
    console.log(`✅ Cleared existing records in UserPermission table`);

    const userPermissionRecords = allResources.map(resource => ({
      userId: userId,
      resourceId: resource.id,
      abilities: [Ability.FULL, Ability.READ, Ability.WRITE, Ability.EDIT, Ability.DELETE]
    }));

    await UserPermission.bulkCreate(userPermissionRecords);
    console.log(`✅ Created ${userPermissionRecords.length} records in UserPermission table`);

    await sequelize.close();
    console.log('✅ Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed with error:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
