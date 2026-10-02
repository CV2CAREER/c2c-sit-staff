/**
 * SPR-21-41-019 AC2 boundary test.
 *
 * The whole point of the shared calculator is that the modal and the grid can
 * never disagree. That claim is only meaningful if both sides return the same
 * answer for the awkward cases, so this asserts the exact outputs - including
 * the ticket's "expiry falls exactly today" case - rather than just checking
 * that the function runs.
 *
 * Run: node scripts/test-campaign-calculator.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');

// The client copy is TypeScript. Transpile it with the project's own TypeScript
// rather than stripping types with regexes - regex stripping silently produces
// broken JS the moment a signature changes shape.
const clientSource = readFileSync(
  path.resolve(frontendRoot, 'src/utils/campaign-calculator.ts'),
  'utf8'
);
const serverSource = readFileSync(
  path.resolve(
    here,
    '../../backend/c2c-iat-staff/src/utils/campaign-calculator.ts'
  ),
  'utf8'
);

const js = ts.transpileModule(clientSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: 'campaign-calculator.ts',
}).outputText;

const dataUrl = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const { calculateCampaignFields } = await import(dataUrl);

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  PASS ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}\n       expected ${e}\n       actual   ${a}`);
  }
}

// Today in the same terms the calculator uses (UTC date-only).
const now = new Date();
const todayUTC = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
);
const ddmmyyyy = (d) => {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getUTCFullYear()}`;
};
const offsetDays = (n) => {
  const d = new Date(todayUTC);
  d.setUTCDate(d.getUTCDate() + n);
  return ddmmyyyy(d);
};

console.log(`SPR-21-41-019 shared calculator tests (today UTC = ${ddmmyyyy(todayUTC)})`);

console.log('\nAC2 boundary case: expiry falls exactly today');
{
  // Start such that start + duration + grace == today.
  const start = offsetDays(-10);
  const result = calculateCampaignFields({
    SeekSubStartDate: start,
    SeekSubDurDays: 6,
    GraceDuration: 4,
  });
  check('CampaignEnd lands on today', result.CampaignEnd, ddmmyyyy(todayUTC));
  check('Sub To Expire Days is 0', result.SeekSubToExpireDays, 0);
  // <= 0, not < 0: the client must agree with the server here or AC2's
  // boundary test fails.
  check('Sub Expired is YES at exactly today', result.SeekSubExpired, 'YES');
}

console.log('\nOne day before expiry');
{
  // Derive the grace period so that start + duration + grace lands exactly one
  // day after today, rather than hardcoding a grace value that quietly tests
  // the wrong day.
  const start = offsetDays(-10);
  const durDays = 6;
  const graceDays = 1 + 10 - durDays;
  const result = calculateCampaignFields({
    SeekSubStartDate: start,
    SeekSubDurDays: durDays,
    GraceDuration: graceDays,
  });
  check(
    'CampaignEnd is tomorrow',
    result.CampaignEnd,
    offsetDays(1)
  );
  check('Sub To Expire Days is 1', result.SeekSubToExpireDays, 1);
  check('Sub Expired is NO', result.SeekSubExpired, 'NO');
}

console.log('\nAlready expired');
{
  const result = calculateCampaignFields({
    SeekSubStartDate: offsetDays(-30),
    SeekSubDurDays: 6,
    GraceDuration: 0,
  });
  check('Sub To Expire Days clamps to 0', result.SeekSubToExpireDays, 0);
  check('Sub Expired is YES', result.SeekSubExpired, 'YES');
}

console.log('\nGrace Duration actually shifts Campaign End');
{
  const withoutGrace = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    SeekSubDurDays: 30,
    GraceDuration: 0,
  });
  const withGrace = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    SeekSubDurDays: 30,
    GraceDuration: 7,
  });
  check('Sub End = start + duration', withoutGrace.SeekSubEndDate, '31-10-2026');
  check('CampaignEnd without grace', withoutGrace.CampaignEnd, '31-10-2026');
  check(
    'CampaignEnd = sub end + grace',
    withGrace.CampaignEnd,
    '07-11-2026'
  );
  check(
    'Sub End is unaffected by grace',
    withGrace.SeekSubEndDate,
    withoutGrace.SeekSubEndDate
  );
}

console.log('\nMonth and year rollover');
{
  const result = calculateCampaignFields({
    SeekSubStartDate: '15-12-2026',
    SeekSubDurDays: 30,
    GraceDuration: 10,
  });
  check('Sub End rolls into next year', result.SeekSubEndDate, '14-01-2027');
  check('CampaignEnd rolls further', result.CampaignEnd, '24-01-2027');
}

console.log('\nLegacy rows fall back to createdAt');
{
  const result = calculateCampaignFields({
    SeekSubStartDate: undefined,
    createdAt: '2026-10-01T10:02:46.827Z',
    SeekSubDurDays: 30,
    GraceDuration: 0,
  });
  check('Start resolved from createdAt', result.SeekSubStartDate, '01-10-2026');
  check('Sub End derived from it', result.SeekSubEndDate, '31-10-2026');
}

console.log('\nMissing start date is not a crash');
{
  const result = calculateCampaignFields({ SeekSubDurDays: 30 });
  check('Sub End Date left unset', result.SeekSubEndDate, undefined);
  check('To Expire Days is 0', result.SeekSubToExpireDays, 0);
  check('Sub Expired left unset', result.SeekSubExpired, undefined);
}

console.log('\nSub Duration Days auto-fills from the plan');
{
  // No stored duration, plan says 6 months -> derived from the start date.
  const result = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    ValidityPeriod: '6 months',
    GraceDuration: 0,
  });
  // 01-10-2026 + 6 months = 01-04-2027, which is 182 days (the month
  // arithmetic is start-date dependent, not a fixed day count).
  check('duration echoed back for display', result.SeekSubDurDays, 182);
  check('Sub End reflects the plan duration', result.SeekSubEndDate, '01-04-2027');
}
{
  const result = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    ValidityPeriod: '30 days',
    GraceDuration: 0,
  });
  check('day period', result.SeekSubDurDays, 30);
  check('day period Sub End', result.SeekSubEndDate, '31-10-2026');
}
{
  const result = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    ValidityPeriod: '1 year',
    GraceDuration: 0,
  });
  check('year period', result.SeekSubDurDays, 365);
}
{
  // The plan is the authority: a stored/entered duration must NOT survive when
  // the governing plan has a usable period, otherwise a client who upgrades
  // stays pinned to the old plan's length.
  const result = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    SeekSubDurDays: 45,
    ValidityPeriod: '6 months',
    GraceDuration: 0,
  });
  check('plan overrides a stored duration', result.SeekSubDurDays, 182);
  check('Sub End uses the plan duration', result.SeekSubEndDate, '01-04-2027');
  check('flagged as plan-driven', result.SeekSubDurDaysFromPlan, true);
}
{
  // ...but with no usable plan period, a stored duration is the only source
  // there is, so it has to survive. Dropping it here would silently reset
  // planless clients to a zero-length subscription.
  const result = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    SeekSubDurDays: 45,
    ValidityPeriod: '3 weeks',
    GraceDuration: 0,
  });
  check('unusable period keeps the stored duration', result.SeekSubDurDays, 45);
  check('flagged as not plan-driven', result.SeekSubDurDaysFromPlan, false);
  check('Sub End uses the stored duration', result.SeekSubEndDate, '15-11-2026');
}
{
  // Callers that pass no period must be completely unaffected.
  const result = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    GraceDuration: 0,
  });
  check('no period leaves duration unset', result.SeekSubDurDays, undefined);
  check('no period gives Sub End = start', result.SeekSubEndDate, '01-10-2026');
}
{
  const result = calculateCampaignFields({
    SeekSubStartDate: '01-10-2026',
    ValidityPeriod: 'every fortnight',
    GraceDuration: 0,
  });
  check('unrecognised unit is not guessed', result.SeekSubDurDays, undefined);
}

console.log('\nClient and server implementations are identical');
{
  const strip = (s) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\s+$/, '');
  check(
    'client mirror matches server source',
    strip(clientSource),
    strip(serverSource)
  );
}

console.log('');
if (failures > 0) {
  console.error(`SPR-21-41-019 calculator tests FAILED (${failures})`);
  process.exit(1);
}
console.log('SPR-21-41-019 calculator tests passed');