/**
 * Seed Script: Admin User
 *
 * Creates a default admin account for local development / first-time setup.
 *
 * Run: npx tsx src/scripts/seed-admin.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { getSequelize } from '../utils/sequelize';
import { User } from '../models/v1/user.model';

const ADMIN_EMAIL = 'admin@c2c.com';
const ADMIN_PASSWORD = 'Admin@123456';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

(async () => {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    const existing = await User.findOne({ where: { email: ADMIN_EMAIL } });

    if (existing) {
      console.log(`Admin already exists: ${ADMIN_EMAIL} (id: ${existing.id})`);
    } else {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

      const admin = await User.create({
        email: ADMIN_EMAIL,
        firstName: 'Super',
        lastName: 'Admin',
        password: hashedPassword,
        role: 'admin',
        country: 'Australia',
        isActive: true,
        isEmailVerified: true,
        updatedBy: 'seed',
      } as any);

      console.log('Admin created successfully!');
      console.log(`  ID    : ${admin.id}`);
      console.log(`  Email : ${ADMIN_EMAIL}`);
      console.log(`  Pass  : ${ADMIN_PASSWORD}`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
