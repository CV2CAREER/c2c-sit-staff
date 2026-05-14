# Subscription Expiry Reminder — Manual Test

Triggers the subscription expiry reminder cron job immediately so you can verify all three milestone notifications (14 days, 7 days, and 0 days) fire correctly without waiting for the scheduled time.

---

## Endpoint

```
POST /api/v1/campaigns/jobs/subscription-expiry-reminder/run
```

---

## Auth

Requires a valid staff session token (same as every other campaign endpoint).

| Header          | Value                        |
|-----------------|------------------------------|
| `Authorization` | `Bearer <your_access_token>` |
| `Content-Type`  | `application/json`           |

---

## Request Body

None — no body required.

---

## Success Response

```json
{
  "success": true,
  "message": "Subscription expiry reminder job executed successfully"
}
```

---

## cURL

```bash
curl -X POST https://<your-host>/api/v1/campaigns/jobs/subscription-expiry-reminder/run \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json"
```

---

## Postman

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Method   | `POST`                                                                |
| URL      | `{{baseUrl}}/api/v1/campaigns/jobs/subscription-expiry-reminder/run` |
| Auth     | Bearer Token → paste your access token                               |
| Body     | None (raw / no-body)                                                  |

---

## What Happens When You Hit It

1. Checks `Plan` table for subscriptions whose `expiresAt` falls on:
   - **Today + 14 days** → ⚠️ 14-day reminder
   - **Today + 7 days**  → 🚨 7-day reminder
   - **Today (0 days)**  → 🔴 Expiry-day alert
2. For each milestone that has matching plans, a Slack message is posted to `#TOWN_CRIER` tagging the C&S team (`@CSM`).
3. Milestones with no matching plans are skipped silently (logged as `✅ No subscriptions expiring in X`).

---

## How to Verify

### Slack
- Open `#TOWN_CRIER` in Slack.
- Confirm messages appear for any matching milestones.
- Confirm the C&S team members are tagged with `<@ID>` mentions.
- Check the message body includes: client name, email, plan title, expiry date, and next steps.

### Server Logs
Look for these log lines (check your console or logging dashboard):

```
🔔 Running subscription expiry reminder job...
✅ No subscriptions expiring in 14 days         ← if none match
📢 Sent 7 days expiry reminder for 2 client(s)  ← if matches found
✅ Subscription expiry reminder job completed
```

### Expected: All Four Notifications Delivered
To confirm all four notifications trigger, you need at least one plan in the database with `expiresAt` set to each of these dates:

| Target Date         | `expiresAt` value to set |
|---------------------|--------------------------|
| 14-day reminder     | today + 14 days          |
| 7-day reminder      | today + 7 days           |
| 0-day (expiry day)  | today                    |

Update a test plan's `expiresAt` directly in the DB, then hit this endpoint — all three matching Slack messages should arrive within seconds.

---

## Error Response

If something goes wrong the endpoint returns `500` and the error is logged:

```
❌ Subscription expiry reminder job failed: <error message>
```

Check the server logs for the full stack trace.

---

## Status

| Check                                   | Status           |
|-----------------------------------------|------------------|
| 14-day notification triggers            | Not yet tested   |
| 7-day notification triggers             | Not yet tested   |
| 0-day (expiry) notification triggers    | Not yet tested   |
| C&S team tagged in all messages         | Not yet tested   |
| Notifications match PROD expectations   | Not yet tested   |
