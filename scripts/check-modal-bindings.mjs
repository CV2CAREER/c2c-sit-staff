import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GRID_FILE = "src/app/admin/users/_components/tableColumns.tsx";
const MODAL_FILE = "src/app/admin/users/_components/EditActionModal.tsx";

// Columns that are UI affordances, not data, so no modal binding is expected.
const GRID_NON_FIELD = new Set(["actions"]);

// Fields the modal owns that the grid deliberately does not render.
// SPR-21-02-002 collapsed the three name columns: the grid shows `fullName`
// only, while First/Middle/Last Name stay in the row data and remain editable
// in the modal. Listed explicitly rather than tolerated, and the stale-allowance
// check below fails if the grid ever renders them again.
const MODAL_OWNED = new Set(["firstName", "middleName", "lastName"]);

// Grid columns with no modal binding yet.
// Each entry must be removed from this list when its field lands in the modal.
const PENDING = new Set([
  // SPR-21-41-012 Contact
  "hearAboutUs",
  // Not named by SPR-21-41-012 or SPR-21-41-013. No ticket owns these yet.
  "plan", "signUpAs", "isActive", "isUserSubscribed",
]);

const read = (rel) => readFileSync(path.join(root, rel), "utf8");

// Strip line and block comments so commented-out code is not read as live.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const gridSrc = stripComments(read(GRID_FILE));
const modalSrc = stripComments(read(MODAL_FILE));

const gridFields = new Set(
  [...gridSrc.matchAll(/field:\s*"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((f) => !GRID_NON_FIELD.has(f)),
);

// Writable bindings: registered with react-hook-form, so they reach the payload.
const modalFields = new Set(
  [...modalSrc.matchAll(/\bname="([^"]+)"/g)].map((m) => m[1]),
);

// Display-only bindings: <LockedField field="..." /> or <LockedSwitch
// field="..." />. These satisfy the SPR-21-41-010 requirement that every grid
// column is represented in the modal, while being deliberately absent from
// react-hook-form state. A field that is both writable and display-only would
// mean a locked value is being submitted, so that overlap is reported as an
// error rather than allowed.
const displayOnlyFields = new Set(
  [...modalSrc.matchAll(/<Locked(?:Field|Switch)\b[^>]*?\bfield="([^"]+)"/g)].map(
    (m) => m[1],
  ),
);

const bothWritableAndLocked = [...displayOnlyFields].filter((f) =>
  modalFields.has(f),
);

// Fields that are derived at render time and must never be submitted.
// SPR-21-41-011 AC#3: Full Name is computed from first/middle/last and has no
// write path, so it must not become a react-hook-form field. Overlap detection
// alone cannot catch this: swapping <LockedField field="fullName"> for
// name="fullName" leaves no overlap, it just silently turns a derived value into
// a submitted one. Hence this explicit contract.
const NEVER_WRITTEN = new Set(["fullName"]);
const illegallyWritable = [...NEVER_WRITTEN].filter((f) =>
  modalFields.has(f),
);

// SPR-21-41-013 AC7. Document Uploaded is set by the upload process, so the
// modal must show it read-only. A plain name="..." registration would satisfy
// the coverage check above while quietly making it admin-writable, so the
// ticket-locked set is asserted separately. This is the check that fails if
// someone "fixes" the locked toggle by wiring it into react-hook-form.
const TICKET_LOCKED = new Set(["isDocumentUploaded"]);
const wronglyWritableLocked = [...TICKET_LOCKED].filter((f) =>
  modalFields.has(f),
);
const lockedButNotDisplayed = [...TICKET_LOCKED].filter(
  (f) => !displayOnlyFields.has(f),
);

const covered = new Set([...modalFields, ...displayOnlyFields]);

const missing = [...gridFields].filter((f) => !covered.has(f) && !PENDING.has(f));
const stale = [...modalFields].filter(
  (f) => !gridFields.has(f) && !MODAL_OWNED.has(f),
);
const staleDisplayOnly = [...displayOnlyFields].filter(
  (f) => !gridFields.has(f) && !MODAL_OWNED.has(f),
);

// An allowance that the grid now renders is dead weight: the column is being
// checked again anyway, so leaving it here would mask a future removal.
const ownedNowInGrid = [...MODAL_OWNED].filter((f) => gridFields.has(f));

const stillPending = [...gridFields].filter((f) => PENDING.has(f));

if (stale.length) {
  console.error(
    `[modal-field-bindings] Modal binds fields the grid no longer has: ${stale.join(", ")}`,
  );
}

if (ownedNowInGrid.length) {
  console.error(
    `[modal-field-bindings] MODAL_OWNED lists fields the grid now renders, remove them: ${ownedNowInGrid.join(", ")}`,
  );
}

if (staleDisplayOnly.length) {
  console.error(
    `[modal-field-bindings] LockedField displays fields the grid no longer has: ${staleDisplayOnly.join(", ")}`,
  );
}

if (bothWritableAndLocked.length) {
  console.error(
    `[modal-field-bindings] Fields are both editable and locked: ${bothWritableAndLocked.join(", ")}`,
  );
}

if (illegallyWritable.length) {
  console.error(
    `[modal-field-bindings] Derived fields must never be submitted but are form fields: ${illegallyWritable.join(", ")}`,
  );
}

if (wronglyWritableLocked.length || lockedButNotDisplayed.length) {
  if (wronglyWritableLocked.length) {
    console.error(
      `[modal-field-bindings] SPR-21-41-013 AC7: fields locked by the ticket must not be editable form fields: ${wronglyWritableLocked.join(", ")}`,
    );
  }
  if (lockedButNotDisplayed.length) {
    console.error(
      `[modal-field-bindings] SPR-21-41-013 AC7: fields locked by the ticket must still be displayed read-only: ${lockedButNotDisplayed.join(", ")}`,
    );
  }
}

if (missing.length) {
  console.error(
    `[modal-field-bindings] Grid columns with no modal field binding: ${missing.join(", ")}`,
  );
}

if (
  missing.length ||
  stale.length ||
  staleDisplayOnly.length ||
  ownedNowInGrid.length ||
  bothWritableAndLocked.length ||
  illegallyWritable.length ||
  wronglyWritableLocked.length ||
  lockedButNotDisplayed.length
) {
  process.exit(1);
}

console.log(
  `[modal-field-bindings] OK - ${gridFields.size} grid columns bound ` +
    `(${stillPending.length} pending, ` +
    `${modalFields.size} editable, ${displayOnlyFields.size} display-only)`,
);
