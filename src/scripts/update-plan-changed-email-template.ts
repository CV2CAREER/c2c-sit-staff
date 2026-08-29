/**
 * One-off: push the rewritten plan-changed.ejs (updated copy — "Hello",
 * "Plan Details" box, new body/closing paragraphs) into the existing
 * email_templates DB row. sendMail() reads the DB body, not the on-disk
 * file, so a plain file edit alone would not actually change what gets
 * sent — this syncs the two.
 *
 * Run: npx tsx src/scripts/update-plan-changed-email-template.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getSequelize } from '../utils/sequelize';
import { EmailTemplate } from '../models/v1/email-template.model';

const KEY = 'plan-changed.ejs';

(async () => {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    const filePath = path.resolve(__dirname, '../views/emails', KEY);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found at ${filePath}`);
      process.exit(1);
    }

    const body = fs.readFileSync(filePath, 'utf-8');

    const existing = await EmailTemplate.findOne({ where: { key: KEY }, paranoid: false });
    if (!existing) {
      console.log(`Not registered yet, skipping update: ${KEY}`);
      process.exit(1);
    }

    existing.body = body;
    existing.updatedBy = 'System';
    await existing.save();

    console.log(`Updated: ${KEY}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\nFailed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
