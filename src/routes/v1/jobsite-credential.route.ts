import { Router } from "express";
import {
  getAllJobsiteCredentials,
  getMyJobsiteCredential,
  getClientJobsiteCredential,
  submitJobsiteCredential,
  addJobsiteCredentialManually,
  editJobsiteCredential,
  acceptJobsiteCredential,
  sendTestEmail,
  approveJobsiteCredential,
  unapproveJobsiteCredential,
  rejectJobsiteCredential,
  revealJobsiteCredentialPassword,
  importJobsiteCredentialsCsv,
} from "../../controllers/v1/jobsite-credential.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const staffOnly = authorizeRoles("admin", "assistant");
const adminOnly = authorizeRoles("admin");

const jobsiteCredentialRouterV1 = Router();

/**
 * @swagger
 * /v1/jobsite-credentials:
 *   get:
 *     summary: Get all jobsite credentials (staff)
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobsite credentials retrieved successfully
 *       401:
 *         description: Unauthorized
 */
jobsiteCredentialRouterV1.get(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  staffOnly,
  getAllJobsiteCredentials,
);

/**
 * @swagger
 * /v1/jobsite-credentials/mine:
 *   get:
 *     summary: Client fetches their own jobsite credential status
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobsite credential retrieved successfully (null if none submitted yet)
 *       401:
 *         description: Unauthorized
 */
jobsiteCredentialRouterV1.get(
  "/mine",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getMyJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials/client/{clientId}:
 *   get:
 *     summary: Staff fetches one client's jobsite credential (e.g. from the client detail page)
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Jobsite credential retrieved successfully (null if none submitted yet)
 *       401:
 *         description: Unauthorized
 */
jobsiteCredentialRouterV1.get(
  "/client/:clientId",
  checkBlacklistedTokens,
  isUserAuthenticated,
  staffOnly,
  getClientJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials:
 *   post:
 *     summary: Client submits their job application email
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: The client's dedicated job application email — never their email password
 *     responses:
 *       201:
 *         description: Credential submitted, pending forwarding and approval
 *       400:
 *         description: Missing email
 *       401:
 *         description: Unauthorized
 */
jobsiteCredentialRouterV1.post(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  submitJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials/manual:
 *   post:
 *     summary: Staff manually adds a credential for a client who cannot self-serve
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - email
 *             properties:
 *               clientId:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Credential added, pending forwarding and approval
 *       400:
 *         description: Missing clientId or email
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client not found
 */
jobsiteCredentialRouterV1.post(
  "/manual",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  addJobsiteCredentialManually,
);

/**
 * @swagger
 * /v1/jobsite-credentials/{id}/edit:
 *   post:
 *     summary: Staff inline-edits a credential's email or password
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               generatedPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credential updated successfully
 *       400:
 *         description: No changes provided
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Jobsite credential not found
 */
jobsiteCredentialRouterV1.post(
  "/:id/edit",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  editJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials/{id}/accept:
 *   post:
 *     summary: Admin or PC accepts a jobsite credential (Gmail delegation confirmed live) — client can no longer edit the email from this point on
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Jobsite credential ID
 *     responses:
 *       200:
 *         description: Credential accepted successfully
 *       400:
 *         description: Only a credential with completed email forwarding can be accepted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Jobsite credential not found
 */
jobsiteCredentialRouterV1.post(
  "/:id/accept",
  checkBlacklistedTokens,
  isUserAuthenticated,
  staffOnly,
  acceptJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials/{id}/test-email:
 *   post:
 *     summary: Admin sends a real test email through the proxy mailbox — does not change status, can be sent any number of times
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test email sent
 *       400:
 *         description: Only an accepted credential can receive a test email
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Jobsite credential not found
 */
jobsiteCredentialRouterV1.post(
  "/:id/test-email",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  sendTestEmail,
);

/**
 * @swagger
 * /v1/jobsite-credentials/{id}/approve:
 *   post:
 *     summary: Admin or PC approves a jobsite credential — moves it to ACTIVE, generates the password, sends the approval email and Slack notification
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Jobsite credential ID
 *     responses:
 *       200:
 *         description: Credential approved successfully — now ACTIVE, handed to SPC
 *       400:
 *         description: Only an accepted credential can be approved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Jobsite credential not found
 */
jobsiteCredentialRouterV1.post(
  "/:id/approve",
  checkBlacklistedTokens,
  isUserAuthenticated,
  staffOnly,
  approveJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials/{id}/unapprove:
 *   post:
 *     summary: Soft reversal — moves a credential back one stage (Active -> Accepted, or Accepted -> Delegated). No reason required, no client notification.
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credential moved back a stage
 *       400:
 *         description: Only an active or accepted credential can be unapproved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Jobsite credential not found
 */
jobsiteCredentialRouterV1.post(
  "/:id/unapprove",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  unapproveJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials/{id}/reject:
 *   post:
 *     summary: Admin or PC rejects a jobsite credential with a reason from the closed list
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Jobsite credential ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: >
 *                   One of the closed list — Delegation not granted,
 *                   Mailbox not reachable, 2FA blocking delegated access,
 *                   Email rejected by jobsite, Email already in use
 *               note:
 *                 type: string
 *                 description: Optional note to the client, in addition to (never instead of) the reason
 *     responses:
 *       200:
 *         description: Credential rejected successfully
 *       400:
 *         description: Missing or invalid reason
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Jobsite credential not found
 */
jobsiteCredentialRouterV1.post(
  "/:id/reject",
  checkBlacklistedTokens,
  isUserAuthenticated,
  staffOnly,
  rejectJobsiteCredential,
);

/**
 * @swagger
 * /v1/jobsite-credentials/{id}/reveal-password:
 *   post:
 *     summary: Admin reveals the system-generated jobsite password (audited)
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Jobsite credential ID
 *     responses:
 *       200:
 *         description: Password revealed — an audit entry is written for every reveal
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Jobsite credential not found
 */
jobsiteCredentialRouterV1.post(
  "/:id/reveal-password",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  revealJobsiteCredentialPassword,
);

/**
 * @swagger
 * /v1/jobsite-credentials/import-csv:
 *   post:
 *     summary: Staff imports a CSV to migrate the existing book of clients (C2C-180)
 *     description: >
 *       One-time migration. Creates no jobsite accounts — that remains
 *       manual SPC work. Expects a multipart file field named "file" with
 *       "clientEmail" and "applicationEmail" columns.
 *     tags:
 *       - Jobsite Credentials
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import complete, with a per-row created/skipped breakdown
 *       400:
 *         description: No file uploaded or CSV could not be parsed
 *       401:
 *         description: Unauthorized
 */
jobsiteCredentialRouterV1.post(
  "/import-csv",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  importJobsiteCredentialsCsv,
);

export default jobsiteCredentialRouterV1;
