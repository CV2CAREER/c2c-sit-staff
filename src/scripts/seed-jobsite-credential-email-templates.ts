/**
 * One-off: register the 9 jobsite-credential .ejs files (4 client-facing,
 * 5 admin-facing) as real rows in the email_templates table. sendMail()
 * looks up templates by key === the templateName string call sites pass
 * ("jobsite-credential-pending.ejs", etc.) — without a DB row it silently
 * falls back to the on-disk copy and fires a Slack warning every single
 * send. The 4 client-facing templates were registered when this script
 * was first written; the 5 admin-facing ones (pending/accepted/approved/
 * rejected/test-admin) were missed and added later. The .ejs files
 * themselves are correct and unchanged, just never migrated into the
 * DB-backed system.
 *
 * Run: npx tsx src/scripts/seed-jobsite-credential-email-templates.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getSequelize } from '../utils/sequelize';
import { EmailTemplate, EmailTemplateType } from '../models/v1/email-template.model';

const TEMPLATES: {
  key: string;
  name: string;
  file: string;
  variables: string[];
}[] = [
  {
    key: 'jobsite-credential-pending.ejs',
    name: 'Jobsite Credential — Pending Approval',
    file: 'jobsite-credential-pending.ejs',
    variables: ['name', 'email', 'frontendUrl', 'currentYear'],
  },
  {
    key: 'jobsite-credential-approved.ejs',
    name: 'Jobsite Credential — Approved',
    file: 'jobsite-credential-approved.ejs',
    variables: ['name', 'email', 'frontendUrl', 'currentYear'],
  },
  {
    key: 'jobsite-credential-failed.ejs',
    name: 'Jobsite Credential — Rejected',
    file: 'jobsite-credential-failed.ejs',
    variables: ['name', 'email', 'reasonCode', 'optionalNote', 'frontendUrl', 'currentYear'],
  },
  {
    key: 'jobsite-credential-test.ejs',
    name: 'Jobsite Credential — Test Email',
    file: 'jobsite-credential-test.ejs',
    variables: ['name', 'currentYear'],
  },
  {
    key: 'jobsite-credential-pending-admin.ejs',
    name: 'Jobsite Credential — Pending (Admin)',
    file: 'jobsite-credential-pending-admin.ejs',
    variables: ['clientName', 'credentialEmail', 'currentYear'],
  },
  {
    key: 'jobsite-credential-accepted-admin.ejs',
    name: 'Jobsite Credential — Accepted (Admin)',
    file: 'jobsite-credential-accepted-admin.ejs',
    variables: ['clientName', 'credentialEmail', 'adminId', 'currentYear'],
  },
  {
    key: 'jobsite-credential-approved-admin.ejs',
    name: 'Jobsite Credential — Approved (Admin)',
    file: 'jobsite-credential-approved-admin.ejs',
    variables: ['clientName', 'credentialEmail', 'adminId', 'currentYear'],
  },
  {
    key: 'jobsite-credential-rejected-admin.ejs',
    name: 'Jobsite Credential — Rejected (Admin)',
    file: 'jobsite-credential-rejected-admin.ejs',
    variables: ['clientName', 'credentialEmail', 'adminId', 'reason', 'note', 'currentYear'],
  },
  {
    key: 'jobsite-credential-test-admin.ejs',
    name: 'Jobsite Credential — Test Email (Admin)',
    file: 'jobsite-credential-test-admin.ejs',
    variables: ['clientName', 'credentialEmail', 'adminId', 'currentYear'],
  },
];

(async () => {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    const emailsDir = path.resolve(__dirname, '../views/emails');

    for (const t of TEMPLATES) {
      const existing = await EmailTemplate.findOne({ where: { key: t.key }, paranoid: false });
      if (existing) {
        console.log(`Already registered: ${t.key}`);
        continue;
      }

      const filePath = path.join(emailsDir, t.file);
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${t.key} — file not found at ${filePath}`);
        continue;
      }

      const body = fs.readFileSync(filePath, 'utf-8');

      await EmailTemplate.create({
        key: t.key,
        name: t.name,
        type: EmailTemplateType.CUSTOMER,
        body,
        variables: t.variables,
        updatedBy: 'System',
      } as any);

      console.log(`Registered: ${t.key}`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\nFailed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
