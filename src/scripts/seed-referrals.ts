import dotenv from 'dotenv';
dotenv.config();

import { getSequelize } from '../utils/sequelize';
import { Referrer } from '../models/v1/referrer.model';
import { User } from '../models/v1/user.model';
import { count } from 'console';

(async () => {
  const sequelize = getSequelize();
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Create 5 new test users
    const testUsers = [];
    for (let i = 1; i <= 5; i++) {
      const user = await User.create({
        email: `test-user-${i}@yopmail.com`,
        firstName: `Test`,
        country: 'Australia',
        currentCityOfResidence: 'Sydney',
        gender: 'Male',
        phoneNumber: `+1234856789${i}`,
        whatsappNumber: `+1234856789${i}`,
        lastName: `User ${i}`,
        password: 'Test@123456',
        role: 'client',
        paymentStatus: 'paid',
        isUserSubscribed: true
      });
      testUsers.push(user);
      console.log(`✅ Created test user ${i}: ${user.email}`);
    }

    // Attach all 5 users to your referral
    const referrerEmail = "official-dygoldrftnow@yopmail.com";
    const testReferrals = testUsers.map((user, index) => ({
      userId: user.id,
      referrer: referrerEmail,
      status: index % 2 === 0 ? 'APPROVED' : 'PENDING'
    }));

    await Referrer.bulkCreate(testReferrals);
    console.log(`✅ 5 referrals attached to ${referrerEmail}`);
    
    const totalCount = await Referrer.count();
    console.log(`✅ Total referrals now in database: ${totalCount}`);
    
    await sequelize.close();
    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
