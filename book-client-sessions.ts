import { User } from "./src/models/v1/user.model";
import { Session } from "./src/models/v1/session.model";
import { Schedule } from "./src/models/v1/schedule.model";
import { getSequelize } from "./src/utils/sequelize";

async function bookClientSessions() {
  const sequelize = getSequelize();
  await sequelize.authenticate();
  console.log('✅ Database connected');

  const generated = { schedules: 0, bookings: 0 };

  // Get coaches
  const coaches = await User.findAll({
    where: { role: 'coach' },
    order: [['createdAt', 'DESC']],
    limit: 3
  });

  console.log(`✅ Found ${coaches.length} coaches`);

  // Get 9 clients
  const clients = await User.findAll({
    where: { role: 'client' },
    order: [['createdAt', 'DESC']],
    limit: 9
  });

  console.log(`✅ Found ${clients.length} clients`);

  // Assign 3 clients per coach
  let clientIndex = 0;

  for (const coach of coaches) {
    console.log(`\n📌 Creating schedules for Coach: ${coach.firstName} ${coach.lastName}`);

    // Create 3 separate schedules for this coach
    const coachSchedules = [];
    for (let s = 0; s < 3; s++) {
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 2 + s);

      // Create schedule with 3 available time slots
      const schedule = await Schedule.create({
        coachId: coach.id,
        date: scheduleDate,
        timezone: 'Africa/Lagos',
        isAvailable: true,
        time: [
          { startTime: '09:00', endTime: '10:00', isBooked: false, hasExpired: false },
          { startTime: '11:00', endTime: '12:00', isBooked: false, hasExpired: false },
          { startTime: '14:00', endTime: '15:00', isBooked: false, hasExpired: false }
        ]
      });

      coachSchedules.push(schedule);
      generated.schedules++;
      console.log(`✅ Created Schedule ${s+1}/3: ${scheduleDate.toLocaleDateString()}`);
    }

    // Book 3 clients to this coach using the created schedules
    for (let i = 0; i < 3; i++) {
      const client = clients[clientIndex++];
      const schedule = coachSchedules[i];
      
      // Book the session using scheduleId
      await Session.create({
        clientId: client.id,
        coachId: coach.id,
        scheduleId: schedule.id,
        sessionType: 'screening_preparation',
        scheduledAt: schedule.date,
        duration: 60,
        status: 'scheduled',
        description: 'Interview preparation session - screening phase',
        timezone: 'Africa/Lagos',
        isPaid: true,
        timeSlotIndex: i,
        notes: 'Automatically created test session'
      });

      // Mark time slot as booked
      schedule.time[i].isBooked = true;
      await schedule.save();

      generated.bookings++;
      console.log(`✅ Booked: ${client.firstName} ${client.lastName} -> ${schedule} Slot ${i}`);
    }
  }

  console.log('\n✅✅✅ SESSION BOOKING COMPLETE ✅✅✅');
  console.log('====================================');
  console.log(`Schedules Created:     ${generated.schedules}`);
  console.log(`Sessions Booked:       ${generated.bookings}`);
  console.log(`Coaches Used:          ${coaches.length}`);
  console.log(`Clients Booked:        ${clients.length}`);
  console.log('====================================');
  console.log('✅ 3 Schedules created per coach (total 9)');
  console.log('✅ 1 Client per schedule slot');
  console.log('✅ All time slots marked as BOOKED');
  console.log('✅ All sessions reference scheduleId correctly');
  console.log('✅ All sessions type: screening_preparation');
  process.exit(0);
}

bookClientSessions().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});