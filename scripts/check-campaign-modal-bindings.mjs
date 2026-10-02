/**
 * SPR-21-41-015: build-time binding check for the campaign "Edit Client's Info"
 * modal (Admin and Placement Controller).
 *
 * The campaign grid exposes a fixed set of retained data columns. This check
 * fails the build when the edit modal stops representing one of them, so a grid
 * column can never be added without a corresponding modal binding.
 *
 * A retained column counts as represented when the modal either:
 *   - registers it as an editable react-hook-form control (`name="Field"`), or
 *   - displays it read-only via `<LockedField field="Field" />`, or
 *   - edits it through a Placement Controller cell (`<VACell field="Field" />`),
 *     which is staged and saved outside the form payload.
 *
 * It also enforces two invariants that are easy to regress:
 *   1. Every retained column must be bound. There are no pending columns.
 *   2. Derived / audit columns must never become writable form controls.
 *      `Full_Name` in particular is rebuilt from the first/middle/last name
 *      components server-side, so submitting it would corrupt the row.
 *
 * Run: npm run check:campaign-bindings
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const read = (relative) => readFileSync(join(root, relative), 'utf8');

/** The authoritative retained grid columns. */
const GRID_KEYS_FILE = 'src/utils/campaign-table-keys.ts';

/** Columns that must never be editable form fields. */
const NEVER_WRITABLE = new Set([
  // Audit / identity columns with no user-editable value.
  'id',
  'CustomerId',
  'Full_Name',
  'createdAt',
  'updatedAt',
  'updateBy',
  'First_Application',
  'Last_Application',
  // Derived from SeekSubStartDate + plan validityPeriod server-side.
  'SeekSubEndDate',
  'CampaignEnd',
  'SeekSubToExpireDays',
  'SeekSubExpired',
  // Placement Controllers are assigned through VACell / savePcChanges, never
  // as part of the react-hook-form payload.
  'VaName',
  'VetName',
  'CompletedName',
  'InterimDPCName',
  'InterimSPCName',
]);

/**
 * Fields the legacy modal owns that are not grid columns. They stay in the
 * modal, so the checker must not fail on them.
 */
const MODAL_ONLY_EXEMPT = new Set([
  'ReturnCount',
  'Batch',
  'Country',
  'SeekAnswerPriority',
  'Seek_Aggregator',
  'Reed_Aggregator',
  'Jora_Aggregator',
  'Adzuna_Aggregator',
  'CareerOne_Aggregator',
]);

const MODALS = [
  {
    label: 'Admin campaign modal',
    file: 'src/app/admin/campaign-mgt/_components/EditModal.tsx',
  },
  {
    label: 'Placement Controller campaign modal',
    file: 'src/app/pc/campaign-mgt/_components/EditModal.tsx',
  },
];

/** Pull the quoted string list out of the shared grid-keys module. */
const readGridKeys = () => {
  const source = read(GRID_KEYS_FILE);
  const match = source.match(
    /CAMPAIGN_TABLE_KEYS:[^=]*=\s*\[([\s\S]*?)\];/
  );
  if (!match) {
    throw new Error(
      `Could not find the CAMPAIGN_TABLE_KEYS array in ${GRID_KEYS_FILE}.`
    );
  }
  const keys = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return keys;
};

const collect = (source) => {
  const editable = new Set();
  for (const m of source.matchAll(/\bname=["']([A-Za-z_][A-Za-z0-9_]*)["']/g)) {
    editable.add(m[1]);
  }

  const locked = new Set();
  for (const m of source.matchAll(/<LockedField\b[\s\S]{0,400}?\bfield=["']([A-Za-z_][A-Za-z0-9_]*)["']/g)) {
    locked.add(m[1]);
  }

  const markers = new Set();
  for (const m of source.matchAll(/<VACell\b[\s\S]{0,400}?\bfield=["']([A-Za-z_][A-Za-z0-9_]*)["']/g)) {
    markers.add(m[1]);
  }

  return { editable, locked, markers };
};

/**
 * A NEVER_WRITABLE column must not appear in the zod schema or in
 * defaultValues either, not just as a JSX `name="..."` control.
 *
 * This is a separate check on purpose: a column can be absent from the markup
 * and still be part of form state, in which case zodResolver parses it and
 * onSubmit sends it in the update payload. That is how Full_Name survived the
 * first pass of this ticket even though it had no form control — the original
 * markup-only check reported PASS while the derived name was still being
 * submitted back to the backend.
 */
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const collectFormState = (source) => {
  const clean = stripComments(source);
  const schema = clean.match(/const formSchema\s*=\s*z\.object\(\{([\s\S]*?)\n\s*\}\)/);
  const defaults = clean.match(/defaultValues:\s*\{([\s\S]*?)\n\s*\}/);
  const pick = (block) =>
    block ? new Set([...block[1].matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/gm)].map((m) => m[1])) : new Set();
  return {
    schema: pick(schema),
    defaults: pick(defaults),
  };
};

const gridKeys = readGridKeys();
const bound = new Set(gridKeys);
let failed = false;

console.log(`SPR-21-41-015 campaign modal binding check`);
console.log(`Grid source: ${GRID_KEYS_FILE} (${gridKeys.length} retained columns)\n`);

for (const modal of MODALS) {
  const source = read(modal.file);
  const { editable, locked, markers } = collect(source);
  const formState = collectFormState(source);
  const covered = new Set([...editable, ...locked, ...markers]);

  const missing = gridKeys.filter((key) => !covered.has(key));
  const illegallyWritable = gridKeys.filter((key) => editable.has(key));
  const strayMarkers = [...markers].filter(
    (key) => !gridKeys.includes(key) && !MODAL_ONLY_EXEMPT.has(key)
  );

  const lockedCount = gridKeys.filter((key) => locked.has(key)).length;
  const markerCount = gridKeys.filter((key) => markers.has(key)).length;
  const editableCount = gridKeys.filter((key) => editable.has(key)).length;

  console.log(`${modal.label}`);
  console.log(`  ${modal.file}`);
  console.log(
    `  editable ${editableCount} | read-only ${lockedCount} | VACell ${markerCount} | exempt modal-only ${[
      ...editable,
    ].filter((k) => !bound.has(k) && MODAL_ONLY_EXEMPT.has(k)).length}`
  );

  if (missing.length) {
    failed = true;
    console.error(
      `  FAIL missing bindings (${missing.length}): ${missing.join(', ')}`
    );
  }

  const writableNever = [...NEVER_WRITABLE].filter((key) =>
    editable.has(key)
  );
  if (writableNever.length) {
    failed = true;
    console.error(
      `  FAIL derived/audit columns bound as editable form fields (${writableNever.length}): ${writableNever.join(', ')}`
    );
  }

  // Markup alone is not enough: a derived column that is still in the zod
  // schema or in defaultValues stays in form state and gets submitted even
  // though nothing on screen edits it.
  const leaked = [...NEVER_WRITABLE].filter(
    (key) => formState.schema.has(key) || formState.defaults.has(key)
  );
  if (leaked.length) {
    failed = true;
    console.error(
      `  FAIL derived/audit columns present in form state (schema or defaultValues) and would be submitted (${leaked.length}): ${leaked.join(', ')}`
    );
  }

  if (strayMarkers.length) {
    failed = true;
    console.error(
      `  FAIL marker names that are not retained columns and are not exempt (${strayMarkers.length}): ${strayMarkers.join(', ')}`
    );
  }

  if (!missing.length && !writableNever.length && !strayMarkers.length && !leaked.length) {
    console.log(`  PASS all ${gridKeys.length} retained columns represented`);
  }
  console.log('');
}

const unknownNeverWritable = [...NEVER_WRITABLE].filter(
  (key) => !bound.has(key)
);
if (unknownNeverWritable.length) {
  failed = true;
  console.error(
    `FAIL NEVER_WRITABLE lists columns absent from the grid: ${unknownNeverWritable.join(', ')}`
  );
}

const unknownExempt = [...MODAL_ONLY_EXEMPT].filter((key) => bound.has(key));
if (unknownExempt.length) {
  failed = true;
  console.error(
    `FAIL MODAL_ONLY_EXEMPT lists retained grid columns: ${unknownExempt.join(', ')}`
  );
}

if (failed) {
  console.error('SPR-21-41-015 campaign binding check FAILED');
  process.exit(1);
}

console.log('SPR-21-41-015 campaign binding check passed');