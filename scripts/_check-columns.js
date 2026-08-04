require('dotenv').config();
const { Client } = require('pg');

const TABLE_CHECKS = {
  users: ['isAmbassador', 'ambassadorToken', 'allowFreeBeforeReferal', 'stars', 'returnCount', 'isSampleDispatched', 'isSampleAccepted', 'isSampleResultsAccepted', 'bankName', 'bsbCode', 'bankAccountNo', 'bankAccountName'],
  manual_applications: ['credentialsTourId', 'CoverLetterRequired', 'DeclinedReasons', 'ApprovedBy', 'ApprovedDate', 'ReturnReason', 'ReturnedBy', 'ReturnedDate'],
  applications: ['credentialsTourId', 'FailedCount', 'Requestor', 'Application_Source', 'InternalJobsite', 'ExternalJobsite', 'Allwords', 'Application_Mode', 'Sample_Type', 'MatchLevel'],
  credentials_tours: ['id', 'credentialsId', 'clientId', 'planId', 'planTitle', 'tourNumber', 'batch', 'craft', 'country', 'aliasEmail', 'startDate', 'expireAt', 'campaignEnd', 'seekSubDurDays', 'seekSubEndDate', 'isActive'],
  tour_counts: ['id', 'credentialsId', 'count'],
  missing_info_requests: ['targetUserId', 'requestedById', 'requestedByName', 'missingInfoType', 'templateId', 'token', 'status', 'channel', 'personalMessage', 'missingInfoUrl', 'jobURL', 'jobApplicationId', 'requestedAt', 'reminderCount', 'lastReminderAt', 'fulfilledAt'],
  missing_info_templates: ['name', 'category', 'type', 'status', 'createdById', 'publishCount'],
  missing_info_template_fields: ['templateId', 'fieldName', 'fieldLabel', 'fieldType', 'isRequired', 'isVisible', 'options', 'helpText', 'sortOrder', 'isRefereeBlock', 'refereeBlockIndex', 'isRepeatable', 'validation'],
  missing_info_responses: ['requestId', 'fieldId', 'fieldName', 'fieldLabel', 'fieldValue'],
  missing_info_disclaimers: ['requestId', 'acknowledgedAt', 'ipAddress'],
  credentials: ['tourId', 'seekPasswordEncrypted', 'AssignedPCName', 'AssignedPCEmail', 'AssignedVetName', 'AssignedVetEmail', 'AssignedCompletedName', 'AssignedCompletedEmail', 'capitalized', 'Active', 'SeekAnswerPriority', 'SeekAggregator', 'SeekSubStartDate'],
};

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  for (const [table, cols] of Object.entries(TABLE_CHECKS)) {
    const { rows } = await client.query(
      'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
      [table]
    );
    const actual = new Set(rows.map(r => r.column_name));
    const missing = cols.filter(c => !actual.has(c));
    console.log(`${table}: ${missing.length ? 'MISSING: ' + missing.join(', ') : 'ALL PRESENT'}`);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
