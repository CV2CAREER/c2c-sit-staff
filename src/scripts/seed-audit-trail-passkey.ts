import dotenv from 'dotenv';
dotenv.config();

import { getSequelize } from '../utils/sequelize';
import { PassKeyVault } from '../models/v1/passkey-vault.model';
import bcrypt from 'bcryptjs';

const PASSKEY = 'Admin@123';
const ADMIN_ID = '3e418cbe-9b89-44b2-ab85-218418df2203';

async function seedAuditTrailPasskey() {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    const hashedKey = await bcrypt.hash(PASSKEY, 10);

    const [passkey, created] = await PassKeyVault.findOrCreate({
      where: { name: 'audit-trail' },
      defaults: {
        name: 'audit-trail',
        key: hashedKey,
        createdBy: ADMIN_ID,
      },
    });

    if (!created) {
      await passkey.update({
        key: hashedKey,
        updateBy: ADMIN_ID,
      });
      console.log('✅ Audit trail passkey updated successfully.');
    } else {
      console.log('✅ Audit trail passkey created successfully.');
    }

    console.log(`\nPasskey set to: ${PASSKEY}`);
    console.log(`Hash: ${hashedKey}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\nSeeding failed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
}

seedAuditTrailPasskey();
