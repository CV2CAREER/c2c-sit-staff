/**
 * One-off: push the rewritten admin-facing jobsite-credential .ejs files
 * (styles inlined, matching the fix already applied to the 4 client-facing
 * templates) into the existing email_templates DB rows. sendMail() reads
 * the DB body, not the on-disk file, so a plain file edit alone would not
 * actually change what gets sent — this syncs the two.
 *
 * These 5 rows previously still had a <style> block, which real email
 * clients (Gmail, Yopmail) silently strip, causing the admin notification
 * emails to render as unstyled plain text.
 *
 * Run: npx tsx src/scripts/update-jobsite-credential-admin-email-templates.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getSequelize } from '../utils/sequelize';
import { EmailTemplate } from '../models/v1/email-template.model';

const KEYS = [
  'jobsite-credential-pending-admin.ejs',
  'jobsite-credential-accepted-admin.ejs',
  'jobsite-credential-approved-admin.ejs',
  'jobsite-credential-rejected-admin.ejs',
  'jobsite-credential-test-admin.ejs',
];

(async () => {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    const emailsDir = path.resolve(__dirname, '../views/emails');

    for (const key of KEYS) {
      const filePath = path.join(emailsDir, key);
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${key} — file not found at ${filePath}`);
        continue;
      }

      const body = fs.readFileSync(filePath, 'utf-8');

      const existing = await EmailTemplate.findOne({ where: { key }, paranoid: false });
      if (!existing) {
        console.log(`Not registered yet, skipping update: ${key}`);
        continue;
      }

      existing.body = body;
      existing.updatedBy = 'System';
      await existing.save();

      console.log(`Updated: ${key}`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\nFailed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
