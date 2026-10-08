# SPR-21-41-001 — Dependency Scan of Retired Campaign Columns

**Findings document — Edit Modal Audit, TRS 1, 7 Sep 2026**
Status: **Draft for Temidayo/ADJ sign-off**
Prepared by: Ebun
Database: `c2c_iat` (DigitalOcean, port 25061) — confirmed authoritative
Branch: `SPR-21-41-05-021-backend`

---

## 1. Headline finding

**Only 2 of the 27 target fields exist as real database columns.** The remaining
25 are keys inside a single JSONB column, `credentials.seekExternalCredentials`.

This invalidates the `ALTER TABLE ... DROP COLUMN` assumption in row 003. A drop
statement would fail on 24 of 27 targets because those columns do not exist.

| Storage location | Count | Drop mechanism |
|---|---|---|
| Real column on `public.credentials` | 2 | `DROP COLUMN` |
| JSONB key in `seekExternalCredentials` | 6 present | Delete key from JSONB |
| JSONB key — currently empty | 19 | Nothing to remove |
| Never existed anywhere | 0 code refs | Nothing to remove |

---

## 2. Field-by-field findings

### 2.1 Real columns — BLOCKING

| Field | Type | Nullable | Default | Populated | Verdict |
|---|---|---|---|---|---|
| `credentials.SeekAnswerPriority` | boolean | YES | `false` | 68/68 rows | **BLOCKS DROP** |
| `credentials.SeekAggregator` | boolean | YES | `false` | 22/68 rows `true` | **BLOCKS DROP** |

Both are written on launch and read during landing. Full dependency list in §4.

### 2.2 JSONB keys — present in data

| Field | Rows populated | Code status |
|---|---|---|
| `ExternalPassword` | 6/68 | Live — written in 3 services |
| `Seek_Aggregator` | 3/68 | Live gate, but see §5.1 casing defect |
| `Jora_Aggregator` | 3/68 | Live gate |
| `Adzuna_Aggregator` | 3/68 | Live gate |
| `CareerOne_Aggregator` | 3/68 | Live gate |
| `Reed_Aggregator` | 3/68 | Docs only |
| `Alias_Email` | 43/68 | Live — paired with `Alias_Password` |

### 2.3 JSONB keys — defined but EMPTY (0/68 rows)

`Alias_Password`, `Done`, `Done_Source`, `Throttle_Listing`, `Throttle_Duration`,
`VaEmail`, `VetEmail`, `CompletedEmail`, `First_Application_Aggregator`,
`Last_Application_Source`, `isActiveTriggeredByAdmin`, `Linkedin_Aggregator`,
`Jobserve_Aggregator`, `EscapeCity_Aggregator`, `WorkforceAustralia_Aggregator`,
`Indeed_Aggregator`, `Monster_Aggregator`, `Adecco_Aggregator`,
`CVLibrary_Aggregator`, `NHSJobs_Aggregator`

### 2.4 Absent entirely

No real column and no JSONB key, anywhere in any schema:
`ProfileId` is referenced by the view but returns NULL; `va_email` appears once as
an outbound Flask payload key (`campaign.service.ts:1036`), not as stored data.

---

## 3. The `reporting.campaign_management` view

**This view is LIVE.** Metabase connects directly to the database and does not
appear anywhere in the backend codebase. A repo-wide search for
`campaign_management`, `reporting.`, and `CampaignManagement` returns **zero** DB
references — the view is invisible to application code but very much visible to BI.

| Property | Value |
|---|---|
| Location | `reporting.campaign_management` |
| Type | VIEW (not a table) |
| Columns | 65 |
| Rows | 68 |
| Backing table | `public.credentials` |
| Views built on it | none |
| Known consumers | **Metabase** (external) |

All 27 target fields are exposed through this view, including:

```
"Alias Password"              text      <- seekExternalCredentials->>'Alias_Password'
"External Password"           text      <- seekExternalCredentials->>'ExternalPassword'
"Done"                        text
"Done Source"                 text
throttle_listing              boolean
throttle_duration             integer
is_active_triggered_by_admin  boolean
"Answer Priority"             boolean   <- real column SeekAnswerPriority
SeekAggregator                boolean   <- real column SeekAggregator
first_application_aggregator  text
last_application_source       text
+ 14 "<Name> Aggregator" boolean columns
```

**Consequence: view columns cannot be dropped.** Doing so breaks every Metabase
dashboard referencing them. Full definition saved to
`campaign_management.view.sql` for exact restoration.

---

## 4. Live dependencies that block removal

| # | Target | Location | Nature |
|---|---|---|---|
| 1 | `SeekAnswerPriority` | `admin-campaign.service.ts:498,605`; `campaign.service.ts:2669,2690`; `admin-plan.service.ts:725`; read `field-encryption.ts:238`, `user.service.ts:283` | Real column, read during landing |
| 2 | `SeekAggregator` | `admin-campaign.service.ts:499,606`; `admin-plan.service.ts:726`; `campaign.service.ts:2670,2691` | Real column |
| 3 | `Alias_Password` | `campaign.service.ts:75,81,87,93,99,105` | Live gate on credential dispatch |
| 4 | 6 aggregator flags (`SEEK_`,`Adecco_`,`Adzuna_`,`CareerOne_`,`Linkedin_`,`Jora_`) | `campaign.service.ts:68-122`, read at `:112-117` | Live gates — removal silently disables dispatch |
| 5 | snake_case `*_aggregator` family | `count-applications.controller.ts:12-25,75,145,147` | READ+WRITE on `Credentials`, live routes `admin.route.ts:613-627` |
| 6 | `ExternalPassword` | `campaign.service.ts:333,342`; `jobsite.service.ts:110`; `aggregator-updater.ts:216` | JSONB write in 3 services |

The credential extractor (`campaign.service.ts:68-122`) requires
`isActive && isActive !== 'false'` plus both `Alias_Email` and `Alias_Password`.
`seekPassword` is **never** used by the extractor.

---

## 5. Defects found during the scan

### 5.1 `Seek_Aggregator` casing mismatch — credential dispatch likely broken

| | Spelling | Location |
|---|---|---|
| Save writes | `Seek_Aggregator` | `campaign.service.ts:2997,3008` |
| Extractor reads | `SEEK_Aggregator` | `campaign.service.ts:76` |

These never match. The JSONB SEEK flag cannot satisfy the extractor for any row
written by the application. Pre-existing, unrelated to this ticket, and worth
confirming before any drop.

### 5.2 `Alias_Password` is a live gate on empty data

0/68 rows carry `Alias_Password`, yet 6 aggregators gate on it. Either dispatch is
failing silently, or the `Alias_Email` + `seekPassword` path is carrying it.
Resolve before retiring the field.

### 5.3 Dangling build guard

`campaign.service.ts:2828` cites `scripts/check-campaign-locked-fields.mjs` as a
build-failing drift guard. That script does not exist in the repo. (It exists
locally, gitignored, from earlier frontend work.)

### 5.4 Dead aggregator model paths

`aggregator-title-updater.ts:31` resolves `db[aggregator]` dynamically, but no
per-aggregator table is registered in `utils/modelsList.ts`. These paths resolve
to `undefined` and are effectively dead.

---

## 6. Scheduled jobs — risk assessed as NIL

The task brief cited risk of taking the application engine down mid-campaign.

All 15 registered jobs (`src/jobs/cron/index.ts:33-94`; 11 always-on, 4 gated to
`prod-pool`) were checked. **None reference any of the 27 targets.**

Only similar-name hits:

| File | Line | Field found | Target? |
|---|---|---|---|
| `clientWithNoApplicationReport.job.ts` | 135-142 | `AssignedVetEmail`, `AssignedCompletedEmail` | No — different column |
| `pipelineLeaderboard.job.ts` | 206,208,480-485 | same | No |
| `placementPipelineOpsReport.job.ts` | 130,132 | same | No |
| `subscription-expiry-reminder.job.ts` | 151 | `Alias_Email` | No — not in the 27 |

**The stated HIGH risk does not materialise.** No leaderboard, placement, or
application-engine job depends on these fields.

---

## 7. Zero test coverage

No `tests/`, `__tests__/`, `e2e/`, `*.test.ts`, or `*.spec.ts` exists for the
campaign path. `package.json:8` defines no working test command.
`scripts/test-plan-resolution.ts` touches none of the 27 targets.

**There is no regression suite protecting this refactor.** This is the strongest
argument for proceeding slowly despite the low observed risk.

---

## 8. Recommended sequence

| Step | Scope | DB change | Risk |
|---|---|---|---|
| 1 | Publish findings doc, obtain sign-off | none | none |
| 2 | Inventory Metabase dashboards against the 27 view columns | none | none |
| 3 | Snapshot `credentials` + view definition | backup only | none |
| 4 | Remove dead reads in `user.service.ts:372,403-407` | none | low |
| 5 | Tighten JSONB catch-all, `campaign.service.ts:3011-3016` | none | low |
| 6 | Migrate landing logic off the 2 real columns | schema | **high — needs testing** |
| 7 | Drop the 2 real columns | schema | **high — row 003** |
| 8 | Leave the view at 65 columns | none | none |

Steps 4-5 require no database change. Step 6-7 is the only schema work and should
not start until Metabase usage is known and tests exist.

---

## 9. Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Prepared by | Ebun | 2026-10-05 | Findings attached |
| Backend reviewer | Temidayo | | |
| ADJ | | | |

Row 003 remains blocked pending sign-off and Metabase dashboard inventory.

---

## Appendix A — Method

Database accessed via direct `pg` client with
`SET default_transaction_read_only = on`. A write attempt was made deliberately
to confirm enforcement; PostgreSQL rejected it with
`cannot execute CREATE TABLE in a read-only transaction`. **Zero mutations were
performed.**

Schema inspected across all schemas: `public` (145 objects), `future_state` (72),
`reporting` (10), `ref` (7), `ai_data` (3), `core` (1). 1,997 columns scanned.
Full JSONB key census taken across all 68 `credentials` rows — key names only, no
values read.

Code search covered all 27 targets, casing variants, snake_case and camelCase
equivalents, across `src/`, `scripts/`, SQL files, migrations, and cron jobs.