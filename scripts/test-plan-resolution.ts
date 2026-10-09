/**
 * Regression test for the SPR-21-41-019 plan-selection defect.
 *
 * A client who upgrades accumulates one Plan row per assignment (every
 * assignment calls Plan.create), so the newest row is not necessarily the plan
 * that governs. seekExternalCredentials.Plan holds the authoritative title.
 *
 * The save path used to load only the newest row and then match the title
 * against that single row. That made the match miss for any upgraded client,
 * which skipped the Sub Duration Days auto-fill and then wrote the derived end
 * date onto the newest plan regardless of which plan actually governed.
 *
 * Run: npx tsx scripts/test-plan-resolution.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  resolveGoverningPlan,
  resolveValidityPeriod,
} from '../src/utils/plan-resolution';

let failures = 0;
const check = (label: string, fn: () => void) => {
  try {
    fn();
    console.log(`  PASS ${label}`);
  } catch (err: any) {
    failures++;
    console.log(`  FAIL ${label}\n       ${err.message}`);
  }
};

// Newest first, which is the order every caller requests.
const coral = { title: 'Coral', validityPeriod: '14 days' };
const bronze = { title: 'Bronze', validityPeriod: '1 month' };
const gold = { title: 'Gold', validityPeriod: '6 months' };
const newestFirst = [gold, bronze, coral];

console.log('SPR-21-41-019 plan resolution');

check('picks the newest plan when no title is stored', () => {
  assert.equal(resolveValidityPeriod(newestFirst, null), '6 months');
  assert.equal(resolveGoverningPlan(newestFirst, null), gold);
});

check('picks the newest plan when the title is blank', () => {
  assert.equal(resolveValidityPeriod(newestFirst, ''), '6 months');
  assert.equal(resolveGoverningPlan(newestFirst, ''), gold);
});

check('upgraded client resolves the title it points at, not the newest row', () => {
  // The defect: created on Coral, later upgraded to Gold, but
  // seekExternalCredentials.Plan was never repointed and still says Coral.
  assert.equal(resolveValidityPeriod(newestFirst, 'Coral'), '14 days');
  assert.equal(resolveGoverningPlan(newestFirst, 'Coral'), coral);
});

check('resolves a middle plan, not just newest or oldest', () => {
  assert.equal(resolveValidityPeriod(newestFirst, 'Bronze'), '1 month');
  assert.equal(resolveGoverningPlan(newestFirst, 'Bronze'), bronze);
});

check('returns null for a title no row carries, rather than another plan', () => {
  // Deliberate: measuring a client against a plan they are not on is worse than
  // showing nothing and letting the operator spot the dangling title.
  assert.equal(resolveValidityPeriod(newestFirst, 'Platinum'), null);
});

check('returns null when the client has no plans', () => {
  assert.equal(resolveValidityPeriod([], 'Gold'), null);
  assert.equal(resolveGoverningPlan([], 'Gold'), null);
  assert.equal(resolveValidityPeriod([], null), null);
  assert.equal(resolveGoverningPlan([], null), null);
});

check('tolerates a null validityPeriod on the governing row', () => {
  assert.equal(resolveValidityPeriod([{ title: 'Gold' }], 'Gold'), null);
});

check('the old single-row lookup would have got this wrong', () => {
  // Pins the regression itself, so the test fails loudly if someone reintroduces
  // the findOne + [plan] shape instead of loading the full set.
  const onlyNewest = [gold];
  const brokenPeriod = resolveValidityPeriod(onlyNewest, 'Coral');
  const fixedPeriod = resolveValidityPeriod(newestFirst, 'Coral');
  assert.equal(brokenPeriod, null);
  assert.equal(fixedPeriod, '14 days');
});

// The pure helpers above were correct even while the service was broken, so unit
// tests alone cannot catch a regression here. Assert the wiring: the save path
// must load every plan for the client and resolve through the helper, and must
// not fall back to loading a single newest row and matching the title against it.
const serviceSource = readFileSync(
  resolve(__dirname, '../src/services/campaign.service.ts'),
  'utf8'
);
const saveStart = serviceSource.indexOf('export const updateCampaignClient');
const savePath = saveStart === -1 ? '' : serviceSource.slice(saveStart);

check('save path resolves the governing plan through the helper', () => {
  assert.notEqual(saveStart, -1, 'could not locate updateCampaignClient');
  assert.ok(
    savePath.includes('resolveGoverningPlan('),
    'save path must call resolveGoverningPlan()'
  );
  assert.ok(
    savePath.includes('resolveValidityPeriod('),
    'save path must call resolveValidityPeriod()'
  );
});

check('save path loads every plan for the client, not just the newest', () => {
  assert.ok(
    /Plan\.findAll\(\{[\s\S]*?where: \{ userId: userInfo\.clientId \}/.test(savePath),
    'save path must Plan.findAll({ where: { userId: userInfo.clientId } })'
  );
  assert.ok(
    !savePath.includes('Plan.findOne('),
    'save path must not use Plan.findOne(), which is what caused the defect'
  );
});

check('plan expiry is written to the resolved plan, not the newest row', () => {
  const assign = savePath.indexOf('plan = resolveGoverningPlan(');
  const update = savePath.indexOf('plan.update(');
  assert.notEqual(assign, -1, 'governing plan is never assigned');
  assert.notEqual(update, -1, 'plan expiry is never written');
  assert.ok(
    assign < update,
    'plan.update() must act on the plan chosen by resolveGoverningPlan()'
  );
});

if (failures > 0) {
  console.log(`\n  ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\n  all checks passed');