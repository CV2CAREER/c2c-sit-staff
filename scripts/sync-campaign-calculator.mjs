/**
 * SPR-21-41-019: keep ONE shared subscription calculator for client and server.
 *
 * The backend copy (backend/src/utils/campaign-calculator.ts) is the single
 * authored source of truth. It is already imported by a dozen backend services,
 * so it cannot be moved. The frontend needs byte-identical logic to show the
 * same numbers before Save, otherwise the modal and the grid diverge - which is
 * exactly the risk this script exists to prevent.
 *
 * The frontend file is therefore a generated mirror, not a second hand-written
 * implementation. Editing either side alone is a bug, and `--check` (run by
 * `npm run build`) fails if the mirror is stale.
 *
 * Usage:
 *   node scripts/sync-campaign-calculator.mjs           # regenerate mirror
 *   node scripts/sync-campaign-calculator.mjs --check   # verify only
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..');

const SOURCE = path.resolve(
  here,
  '../../backend/c2c-iat-staff/src/utils/campaign-calculator.ts'
);
const MIRROR = path.resolve(frontendRoot, 'src/utils/campaign-calculator.ts');

// The banner is a multi-line block comment, so match from the opening `/*` to
// the first `*/` that follows the GENERATED marker.
const BANNER_REGEX = /^\/\*[\s\S]*?GENERATED[\s\S]*?\*\/\n/;

const BANNER = `/* GENERATED FILE - DO NOT EDIT BY HAND.
 * Mirror of backend/src/utils/campaign-calculator.ts, produced by
 * scripts/sync-campaign-calculator.mjs. Run \`npm run sync:campaign-calculator\`
 * after changing the backend source. \`npm run check:campaign-calculator\`
 * fails the build if this file drifts from it.
 */
`;

function stripBanner(source) {
  return source.replace(BANNER_REGEX, '').replace(/^\n+/, '');
}

// The backend file is CRLF on Windows and the banner is written LF, so compare
// on LF-normalised text. Without this the banner regex never matches `*/\r\n`
// and the check reports a false mismatch against a freshly written mirror.
function normalise(text) {
  return text.replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';
}

function readOrNull(file) {
  try {
    return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return null;
  }
}

const sourceRaw = readOrNull(SOURCE);
if (sourceRaw === null) {
  console.error(`SPR-21-41-019: shared calculator source not found at\n  ${SOURCE}`);
  process.exit(1);
}

const expected = normalise(stripBanner(sourceRaw));
const checkOnly = process.argv.includes('--check');
const mirrorRaw = readOrNull(MIRROR);

if (mirrorRaw !== null && normalise(stripBanner(mirrorRaw)) === expected) {
  console.log('SPR-21-41-019 shared calculator: client mirror matches server source');
  process.exit(0);
}

if (checkOnly) {
  console.error('SPR-21-41-019 shared calculator OUT OF SYNC.');
  console.error(`  server source : ${path.relative(frontendRoot, SOURCE)}`);
  console.error(`  client mirror : ${path.relative(frontendRoot, MIRROR)}`);
  console.error(
    '  The modal and the grid would show different subscription dates.\n' +
      '  Fix: npm run sync:campaign-calculator'
  );
  process.exit(1);
}

writeFileSync(MIRROR, BANNER + expected, 'utf8');
console.log(
  `SPR-21-41-019 shared calculator: wrote ${path.relative(frontendRoot, MIRROR)}`
);