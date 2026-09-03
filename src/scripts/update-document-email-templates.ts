/**
 * One-off: push the current document-upload-user.ejs and
 * document-update-user.ejs (fixed in d12edc7, "point document upload/update
 * emails to profile, not dashboard") into their existing email_templates DB
 * rows. sendMail() reads the DB body, not the on-disk file, so these two
 * rows — created before that fix and never force-refreshed since — were
 * still sending the old "Go to Dashboard" wording/link despite the file fix
 * having been merged weeks earlier.
 *
 * Run: npx tsx src/scripts/update-document-email-templates.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getSequelize } from '../utils/sequelize';
import { EmailTemplate } from '../models/v1/email-template.model';

const KEYS = ['document-upload-user.ejs', 'document-update-user.ejs'];

(async () => {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    for (const key of KEYS) {
      const filePath = path.resolve(__dirname, '../views/emails', key);
      if (!fs.existsSync(filePath)) {
        console.log(`File not found at ${filePath}, skipping: ${key}`);
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
