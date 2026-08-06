/**
 * One-off script: re-classify a specific manual application with the current
 * AI vetting prompt and write the result back to the row.
 *
 * Run: npx tsx src/scripts/reclassify-sample-job.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { ManualApplication } from '../models/v1/manual-application.model';
import { Profile } from '../models/v1/profile.model';
import { classifyJob } from '../services/ai-vetting.service';
import { getSequelize } from '../utils/sequelize';

const JOB_ID = '5907761d-a611-4226-be24-e7d0d0b78aef';
const CLIENT_USER_ID = '20260805005';

const main = async (): Promise<void> => {
  await getSequelize().authenticate();
  console.log('Connected to database\n');

  const job = await ManualApplication.findByPk(JOB_ID);
  if (!job) {
    console.error(`Job not found: ${JOB_ID}`);
    process.exit(1);
  }
  console.log(`Job: ${job.Job_Title}`);

  const profile = await Profile.findOne({
    where: { userId: CLIENT_USER_ID, name: 'primary' },
  });
  if (!profile) {
    console.error(`Profile not found for user ${CLIENT_USER_ID}`);
    process.exit(1);
  }
  console.log(`Profile: ${profile.name} (${profile.country})`);

  const result = await classifyJob(job, profile);
  console.log(`\nResult: ${JSON.stringify(result, null, 2)}`);

  if (result.status !== 'classified' || !result.score) {
    console.error('Classification failed; row not updated.');
    process.exit(1);
  }

  await job.update({
    ai_status: 'classified',
    ai_score: result.score,
    ai_reason: result.reason,
    ai_prompt_version: result.promptVersion,
    ai_classified_at: new Date(),
  });
  console.log('\nRow updated.');
  process.exit(0);
};

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
