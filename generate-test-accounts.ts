import bcrypt from "bcryptjs";
import { User } from "./src/models/v1/user.model";
import { Plan } from "./src/models/v1/plan.model";
import { Feature } from "./src/models/v1/feature.model";
import { Referrer } from "./src/models/v1/referrer.model";
import { getSequelize } from "./src/utils/sequelize";

async function generateAccounts() {
  const sequelize = getSequelize();
  await sequelize.authenticate();
  console.log('✅ Database connected');

  // Get referrer user
  const referrer = await User.findOne({ where: { email: 'official-dygoldrft@yopmail.com' } });
  if (!referrer) {
    console.log('❌ Referrer user not found');
    process.exit(1);
  }
  console.log(`✅ Referrer found: ${referrer.id}`);

  // Get active features
  const features = await Feature.findAll({ where: { isActive: true } });
  console.log(`✅ Found ${features.length} active features`);

  const generated = { guests: 0, clients: 0, coaches: 0, plans: 0, referrers: 0 };
  const password = await bcrypt.hash('Password123!', 10);

  // Generate 4 GUESTS
  for (let i = 1; i <= 4; i++) {
    const user = await User.create({
      email: `guest${Date.now()}${i}@test.com`,
      password,
      firstName: 'Guest',
      lastName: `User${i}`,
      country: 'Austrailia',
      role: 0,
      isEmailVerified: true,
      isActive: true
    });

    await Referrer.create({
      userId: user.id,
      referrerUserId: referrer.id,
      referralCode: `REF-${user.id.slice(0, 8).toUpperCase()}`
    });

    generated.guests++;
    generated.referrers++;
    console.log(`✅ Created GUEST ${i}/4: ${user.email}`);
  }

  // Generate 13 CLIENTS with active plans
  for (let i = 1; i <= 13; i++) {
    const user = await User.create({
      email: `client${Date.now()}${i}@test.com`,
      password,
      firstName: 'Client',
      lastName: `User${i}`,
      country: 'Austrailia',
      role: 1,
      isEmailVerified: true,
      isActive: true,
      paymentStatus: 'completed',
      isUserSubscribed: true
    });

    await Referrer.create({
      userId: user.id,
      referrerUserId: referrer.id,
      referralCode: `REF-${user.id.slice(0, 8).toUpperCase()}`
    });

    // Create active plan
    const feature = features[Math.floor(Math.random() * features.length)];
    await Plan.create({
      userId: user.id,
      title: feature.title,
      featureId: feature.id,
      paymentStatus: 'completed',
      hasExpired: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amount: 99
    });

    generated.clients++;
    generated.plans++;
    generated.referrers++;
    console.log(`✅ Created CLIENT ${i}/13: ${user.email} with plan`);
  }

  // Generate 3 COACHES
  for (let i = 1; i <= 3; i++) {
    const user = await User.create({
      email: `coach${Date.now()}${i}@test.com`,
      password,
      firstName: 'Coach',
      lastName: `User${i}`,
      country: 'Austrailia',
      role: 2,
      isEmailVerified: true,
      isActive: true
    });

    await Referrer.create({
      userId: user.id,
      referrerUserId: referrer.id,
      referralCode: `REF-${user.id.slice(0, 8).toUpperCase()}`
    });

    generated.coaches++;
    generated.referrers++;
    console.log(`✅ Created COACH ${i}/3: ${user.email}`);
  }

  console.log('\n✅✅✅ GENERATION COMPLETE ✅✅✅');
  console.log('====================================');
  console.log(`Total Accounts:  ${generated.guests + generated.clients + generated.coaches}`);
  console.log(`Guests:          ${generated.guests}`);
  console.log(`Clients:         ${generated.clients}`);
  console.log(`Coaches:         ${generated.coaches}`);
  console.log(`Active Plans:    ${generated.plans}`);
  console.log(`Referrals:       ${generated.referrers}`);
  console.log('====================================');
  console.log('✅ All referred by: official-dygoldrft@yopmail.com');
  console.log('✅ All password: Password123!');
  process.exit(0);
}

generateAccounts().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});