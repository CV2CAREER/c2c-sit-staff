import bcrypt from "bcryptjs";
import { User } from "./src/models/v1/user.model";
import { Session } from "./src/models/v1/session.model";
import { getSequelize } from "./src/utils/sequelize";

async function generatePcAndSessions() {
  const sequelize = getSequelize();
  await sequelize.authenticate();
  console.log('✅ Database connected');

  const password = await bcrypt.hash('Password123!', 10);
  const generated = { pc: 0, bookings: 0 };

  // Get recently created clients and coaches
  const clients = await User.findAll({
    where: {
      role: 'client'
    },
    limit: 10,
    order: [['createdAt', 'DESC']]
  });

  const coaches = await User.findAll({
    where: {
      role: 'coach'
    },
    order: [['createdAt', 'DESC']]
  });

  console.log(`✅ Found ${clients.length} clients, ${coaches.length} coaches`);

  // Book sessions between each client and all 3 coaches
  for (const client of clients) {
    for (const coach of coaches) {
      // Create session slot (30 min slots, 2 days ahead)
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 2 + Math.floor(Math.random() * 5));
      sessionDate.setHours(9 + Math.floor(Math.random() * 8), Math.random() > 0.5 ? 0 : 30, 0, 0);

      await Session.create({
        clientId: client.id,
        coachId: coach.id,
        scheduledAt: sessionDate,
        duration: 30,
        status: 'confirmed',
        type: 'training',
        isPaid: true,
        name: `Training Session ${client.firstName} - ${coach.firstName}`
      });

      generated.bookings++;
      console.log(`✅ Booked session: ${client.firstName} <-> ${coach.firstName} @ ${sessionDate.toLocaleString()}`);
    }
  }

  console.log('\n✅✅✅ GENERATION COMPLETE ✅✅✅');
  console.log('====================================');
  console.log(`PC Accounts:     ${generated.pc}`);
  console.log(`Total Sessions:  ${generated.bookings}`);
  console.log(`Clients:         ${clients.length}`);
  console.log(`Coaches:         ${coaches.length}`);
  console.log('====================================');
  console.log('✅ All password: Password123!');
  console.log('✅ All sessions confirmed & paid');
  process.exit(0);
}

generatePcAndSessions().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});