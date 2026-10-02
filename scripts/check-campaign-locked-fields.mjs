/**
 * SPR-21-41-020 AC4: the server now rejects any campaign update payload that
 * contains a locked column. That list has to stay identical to the frontend's
 * NEVER_WRITABLE set, or one of two things breaks:
 *
 *  - backend list is missing a column the modal locks -> the server accepts an
 *    edit the UI forbids, which is the exact failure this ticket exists to stop.
 *  - backend list has a column the modal treats as editable -> saves fail with a
 *    400 for a field staff are allowed to change.
 *
 * This fails the build on drift instead of leaving it to be discovered in
 * production.
 *
 * Run: node scripts/check-campaign-locked-fields.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');

const FRONTEND_CHECKER = path.resolve(
  frontendRoot,
  'scripts/check-campaign-modal-bindings.mjs'
);
const BACKEND_SERVICE = path.resolve(
  here,
  '../../backend/c2c-iat-staff/src/services/campaign.service.ts'
);

const read = (file) => readFileSync(file, 'utf8');

/** Pull the string entries out of a `new Set([...])` literal. */
function extractSet(source, label) {
  const anchor = source.indexOf(label);
  if (anchor === -1) {
    throw new Error(`could not find ${label}`);
  }
  const open = source.indexOf('[', anchor);
  const close = source.indexOf(']', open);
  if (open === -1 || close === -1) {
    throw new Error(`could not find the array literal for ${label}`);
  }
  const body = source.slice(open + 1, close);
  const values = [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return new Set(values);
}

const frontend = extractSet(
  read(FRONTEND_CHECKER),
  'NEVER_WRITABLE'
);
const backend = extractSet(read(BACKEND_SERVICE), 'CAMPAIGN_LOCKED_FIELDS');

console.log('SPR-21-41-020 locked-field check');
console.log(
  `  frontend NEVER_WRITABLE        : ${frontend.size} columns`
);
console.log(
  `  backend  CAMPAIGN_LOCKED_FIELDS: ${backend.size} columns`
);

const missingOnBackend = [...frontend].filter((f) => !backend.has(f));
const extraOnBackend = [...backend].filter((f) => !frontend.has(f));

// updatedAt is intentionally excluded from the backend rejection set: the
// service consumes and strips it as audit metadata. The frontend list carries it
// only to prove the modal never sends it.
const ALLOWED_DIVERGENCE = new Set(['updatedAt']);

const realMissing = missingOnBackend.filter(
  (f) => !ALLOWED_DIVERGENCE.has(f)
);
const realExtra = extraOnBackend.filter((f) => !ALLOWED_DIVERGENCE.has(f));

const serviceSource = read(BACKEND_SERVICE);
const structureProblems = [];

if (realMissing.length === 0 && realExtra.length === 0) {
  // A correct list is worthless if the guard is never called, or is called after
  // the record has already been written. Assert the wiring too.
  const updateFnStart = serviceSource.indexOf(
    'export const updateCampaignClient = async'
  );
  if (updateFnStart === -1) {
    structureProblems.push('could not locate updateCampaignClient');
  } else {
    const updateFn = serviceSource.slice(updateFnStart);
    const guardAt = updateFn.indexOf('assertNoLockedFields(');
    const firstWriteAt = updateFn.indexOf('await userInfo.update(');

    if (guardAt === -1) {
      structureProblems.push(
        'updateCampaignClient never calls assertNoLockedFields()'
      );
    } else if (firstWriteAt !== -1 && guardAt > firstWriteAt) {
      structureProblems.push(
        'assertNoLockedFields() runs AFTER the first write to the record'
      );
    }
  }

  if (!/export const assertNoLockedFields[\s\S]*?new ErrorHandler\([\s\S]*?\b400\b/.test(serviceSource)) {
    structureProblems.push(
      'assertNoLockedFields does not throw an ErrorHandler with status 400'
    );
  }
}

if (realMissing.length === 0 && realExtra.length === 0 && !structureProblems.length) {
  console.log('  PASS the server rejects exactly the columns the modal locks');
  console.log('  PASS the guard is enforced before any write, with a 400');
  process.exit(0);
}

if (realMissing.length) {
  console.error(
    `  FAIL locked in the modal but NOT rejected by the server:\n    ${realMissing.join('\n    ')}`
  );
}
if (realExtra.length) {
  console.error(
    `  FAIL rejected by the server but NOT locked in the modal:\n    ${realExtra.join('\n    ')}`
  );
}
for (const problem of structureProblems) {
  console.error(`  FAIL ${problem}`);
}
console.error(
  '  These would let a stale client overwrite audit/derived data, or reject a\n' +
    '  legitimate save. Update both lists together.'
);
process.exit(1);