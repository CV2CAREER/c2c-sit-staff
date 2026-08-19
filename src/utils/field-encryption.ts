import { ENCRYPTION_SECRET } from "../config/env";
import { QueryTypes, Transaction } from "sequelize";

const KEY = ENCRYPTION_SECRET!;

function db() {
  return require("./sequelize").getSequelize();
}

export const fieldEncryption = {
  getKey(): string {
    return KEY;
  },

  async encrypt(value: string): Promise<string> {
    const [result] = await db().query(
      `SELECT pgp_sym_encrypt(:value, :key) AS encrypted`,
      { replacements: { value, key: KEY }, type: QueryTypes.SELECT }
    );
    return (result as any).encrypted;
  },

  async decrypt(encrypted: string): Promise<string> {
    const [result] = await db().query(
      `SELECT pgp_sym_decrypt(:encrypted::bytea, :key) AS decrypted`,
      { replacements: { encrypted, key: KEY }, type: QueryTypes.SELECT }
    );
    return (result as any).decrypted;
  },

  async hashEmail(email: string): Promise<string> {
    const [result] = await db().query(
      `SELECT ENCODE(DIGEST(LOWER(:email), 'sha256'), 'hex') AS hash`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );
    return (result as any).hash;
  },

  async hashPhone(phone: string): Promise<string> {
    const [result] = await db().query(
      `SELECT ENCODE(DIGEST(:phone, 'sha256'), 'hex') AS hash`,
      { replacements: { phone }, type: QueryTypes.SELECT }
    );
    return (result as any).hash;
  },

  async findUserByEmail(email: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT id FROM find_user_by_email(:email)`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );
    return (result as any)?.id ?? null;
  },

  async findUserByPhone(phone: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT id FROM find_user_by_phone(:phone)`,
      { replacements: { phone }, type: QueryTypes.SELECT }
    );
    return (result as any)?.id ?? null;
  },

  async getDecryptedUser(userId: string) {
    const [result] = await db().query(
      `SELECT * FROM get_decrypted_user(:userId, :key)`,
      { replacements: { userId, key: KEY }, type: QueryTypes.SELECT }
    );
    return result as any;
  },

  async getUserEmail(userId: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT get_user_email(:userId, :key) AS email`,
      { replacements: { userId, key: KEY }, type: QueryTypes.SELECT }
    );
    return (result as any)?.email ?? null;
  },

  async getDecryptedProfile(profileId: string) {
    const [result] = await db().query(
      `SELECT * FROM get_decrypted_profile(:profileId, :key)`,
      { replacements: { profileId, key: KEY }, type: QueryTypes.SELECT }
    );
    return result as any;
  },

  async getDecryptedSeekPassword(credentialId: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT get_decrypted_seek_password(:credentialId, :key) AS password`,
      { replacements: { credentialId, key: KEY }, type: QueryTypes.SELECT }
    );
    return (result as any)?.password ?? null;
  },

  // ── Phase 2A read helpers ──

  async getDecryptedUserBank(userId: string) {
    const [result] = await db().query(
      `SELECT * FROM get_decrypted_user_bank(:userId, :key)`,
      { replacements: { userId, key: KEY }, type: QueryTypes.SELECT }
    );
    return result as any;
  },

  async getDecryptedCredentialExtended(credentialId: string) {
    const [result] = await db().query(
      `SELECT * FROM get_decrypted_credential_extended(:credentialId, :key)`,
      { replacements: { credentialId, key: KEY }, type: QueryTypes.SELECT }
    );
    return result as any;
  },

  async getDecryptedJobsiteCredential(credentialId: string) {
    const [result] = await db().query(
      `SELECT * FROM get_decrypted_jobsite_credential(:credentialId, :key)`,
      { replacements: { credentialId, key: KEY }, type: QueryTypes.SELECT }
    );
    return result as any;
  },

  async getDecryptedReferrerEmail(referrerId: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT get_decrypted_referrer_email(:referrerId, :key) AS email`,
      { replacements: { referrerId, key: KEY }, type: QueryTypes.SELECT }
    );
    return (result as any)?.email ?? null;
  },

  async findReferrerByEmail(email: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT id FROM find_referrer_by_email(:email)`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );
    return (result as any)?.id ?? null;
  },

  async findUsersByEmailPartial(search: string, limit = 1): Promise<string[]> {
    const rows = await db().query(
      `SELECT u.id FROM users u
       WHERE u."emailEncrypted" IS NOT NULL
         AND pgp_sym_decrypt(u."emailEncrypted", :key) ILIKE :pattern
       LIMIT :limit`,
      { replacements: { key: KEY, pattern: `%${search}%`, limit }, type: QueryTypes.SELECT }
    );
    return (rows as any[]).map((r: any) => r.id);
  },

  async findCredentialsBySeekEmail(emails: string[]): Promise<any[]> {
    const rows = await db().query(
      `SELECT c.id, c."clientId",
              pgp_sym_decrypt(c."seekEmailEncrypted", :key) AS "seekEmail"
       FROM credentials c
       WHERE c."seekEmailEncrypted" IS NOT NULL
         AND LOWER(pgp_sym_decrypt(c."seekEmailEncrypted", :key)) IN (:emails)`,
      { replacements: { key: KEY, emails: emails.map((e) => e.toLowerCase()) }, type: QueryTypes.SELECT }
    );
    return rows as any[];
  },

  async findCredentialsBySeekEmailPartial(search: string): Promise<string[]> {
    const rows = await db().query(
      `SELECT c.id FROM credentials c
       WHERE c."seekEmailEncrypted" IS NOT NULL
         AND LOWER(pgp_sym_decrypt(c."seekEmailEncrypted", :key)) LIKE :pattern`,
      { replacements: { key: KEY, pattern: `%${search.toLowerCase()}%` }, type: QueryTypes.SELECT }
    );
    return (rows as any[]).map((r: any) => r.id);
  },

  async findCredentialsByAssignedEmail(email: string): Promise<any[]> {
    const rows = await db().query(
      `SELECT c.id, c."clientId", c."currentCity", c."onboardingDate", c."referrer",
              c."capitalized", c."Active", c."SeekAnswerPriority", c."SeekAggregator",
              c."SeekSubStartDate", c."blacklisted",
              pgp_sym_decrypt(c."seekEmailEncrypted", :key) AS "seekEmail",
              pgp_sym_decrypt(c."AssignedPCNameEncrypted", :key) AS "AssignedPCName",
              pgp_sym_decrypt(c."AssignedPCEmailEncrypted", :key) AS "AssignedPCEmail",
              pgp_sym_decrypt(c."AssignedVetNameEncrypted", :key) AS "AssignedVetName",
              pgp_sym_decrypt(c."AssignedVetEmailEncrypted", :key) AS "AssignedVetEmail",
              pgp_sym_decrypt(c."AssignedCompletedNameEncrypted", :key) AS "AssignedCompletedName",
              pgp_sym_decrypt(c."AssignedCompletedEmailEncrypted", :key) AS "AssignedCompletedEmail"
       FROM credentials c
       WHERE LOWER(pgp_sym_decrypt(c."AssignedPCEmailEncrypted", :key)) = :email
          OR LOWER(pgp_sym_decrypt(c."AssignedVetEmailEncrypted", :key)) = :email
          OR LOWER(pgp_sym_decrypt(c."AssignedCompletedEmailEncrypted", :key)) = :email`,
      { replacements: { key: KEY, email: email.toLowerCase() }, type: QueryTypes.SELECT }
    );
    return rows as any[];
  },

  // ── Phase 1 write helpers (encrypt on create/update) ──

  async encryptUserFields(
    userId: string,
    email: string,
    phoneNumber: string | null,
    whatsappNumber: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { userId, key: KEY, email, phoneNumber, whatsappNumber }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE users SET
        "emailEncrypted" = pgp_sym_encrypt(:email, :key),
        "emailHash" = ENCODE(DIGEST(LOWER(:email), 'sha256'), 'hex'),
        "phoneNumberEncrypted" = CASE WHEN :phoneNumber IS NOT NULL THEN pgp_sym_encrypt(:phoneNumber, :key) ELSE NULL END,
        "phoneNumberHash" = CASE WHEN :phoneNumber IS NOT NULL THEN ENCODE(DIGEST(:phoneNumber, 'sha256'), 'hex') ELSE NULL END,
        "whatsappNumberEncrypted" = CASE WHEN :whatsappNumber IS NOT NULL THEN pgp_sym_encrypt(:whatsappNumber, :key) ELSE NULL END
      WHERE id = :userId
    `, opts);
  },

  async encryptProfileFields(
    profileId: string,
    ssn: string | null,
    tin: string | null,
    dob: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { profileId, key: KEY, ssn, tin, dob }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE profiles SET
        "socialSecurityNumberEncrypted" = CASE WHEN :ssn IS NOT NULL THEN pgp_sym_encrypt(:ssn, :key) ELSE NULL END,
        "taxIdentificationNumberEncrypted" = CASE WHEN :tin IS NOT NULL THEN pgp_sym_encrypt(:tin, :key) ELSE NULL END,
        "dateOfBirthEncrypted" = CASE WHEN :dob IS NOT NULL THEN pgp_sym_encrypt(:dob, :key) ELSE NULL END
      WHERE id = :profileId
    `, opts);
  },

  async encryptCredentialFields(
    credentialId: string,
    seekPassword: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { credentialId, key: KEY, seekPassword }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE credentials SET
        "seekPasswordEncrypted" = CASE WHEN :seekPassword IS NOT NULL THEN pgp_sym_encrypt(:seekPassword, :key) ELSE NULL END
      WHERE id = :credentialId
    `, opts);
  },

  // ── Phase 2A write helpers ──

  async encryptUserBankFields(
    userId: string,
    bankName: string | null,
    bsbCode: string | null,
    bankAccountNo: string | null,
    bankAccountName: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { userId, key: KEY, bankName, bsbCode, bankAccountNo, bankAccountName }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE users SET
        "bankNameEncrypted" = CASE WHEN :bankName IS NOT NULL THEN pgp_sym_encrypt(:bankName, :key) ELSE NULL END,
        "bsbCodeEncrypted" = CASE WHEN :bsbCode IS NOT NULL THEN pgp_sym_encrypt(:bsbCode, :key) ELSE NULL END,
        "bankAccountNoEncrypted" = CASE WHEN :bankAccountNo IS NOT NULL THEN pgp_sym_encrypt(:bankAccountNo, :key) ELSE NULL END,
        "bankAccountNameEncrypted" = CASE WHEN :bankAccountName IS NOT NULL THEN pgp_sym_encrypt(:bankAccountName, :key) ELSE NULL END
      WHERE id = :userId
    `, opts);
  },

  async encryptCredentialExtendedFields(
    credentialId: string,
    seekEmail: string | null,
    assignedPCName: string | null,
    assignedPCEmail: string | null,
    assignedVetName: string | null,
    assignedVetEmail: string | null,
    assignedCompletedName: string | null,
    assignedCompletedEmail: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = {
      replacements: {
        credentialId, key: KEY,
        seekEmail, assignedPCName, assignedPCEmail,
        assignedVetName, assignedVetEmail,
        assignedCompletedName, assignedCompletedEmail,
      },
      type: QueryTypes.UPDATE as QueryTypes,
      transaction,
    };
    await db().query(`
      UPDATE credentials SET
        "seekEmailEncrypted" = CASE WHEN :seekEmail IS NOT NULL THEN pgp_sym_encrypt(:seekEmail, :key) ELSE NULL END,
        "AssignedPCNameEncrypted" = CASE WHEN :assignedPCName IS NOT NULL THEN pgp_sym_encrypt(:assignedPCName, :key) ELSE NULL END,
        "AssignedPCEmailEncrypted" = CASE WHEN :assignedPCEmail IS NOT NULL THEN pgp_sym_encrypt(:assignedPCEmail, :key) ELSE NULL END,
        "AssignedVetNameEncrypted" = CASE WHEN :assignedVetName IS NOT NULL THEN pgp_sym_encrypt(:assignedVetName, :key) ELSE NULL END,
        "AssignedVetEmailEncrypted" = CASE WHEN :assignedVetEmail IS NOT NULL THEN pgp_sym_encrypt(:assignedVetEmail, :key) ELSE NULL END,
        "AssignedCompletedNameEncrypted" = CASE WHEN :assignedCompletedName IS NOT NULL THEN pgp_sym_encrypt(:assignedCompletedName, :key) ELSE NULL END,
        "AssignedCompletedEmailEncrypted" = CASE WHEN :assignedCompletedEmail IS NOT NULL THEN pgp_sym_encrypt(:assignedCompletedEmail, :key) ELSE NULL END
      WHERE id = :credentialId
    `, opts);
  },

  async encryptJobsiteCredentialFields(
    credentialId: string,
    email: string | null,
    generatedPassword: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { credentialId, key: KEY, email, generatedPassword }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE jobsite_credentials SET
        "emailEncrypted" = CASE WHEN :email IS NOT NULL THEN pgp_sym_encrypt(:email, :key) ELSE NULL END,
        "emailHash" = CASE WHEN :email IS NOT NULL THEN ENCODE(DIGEST(LOWER(:email), 'sha256'), 'hex') ELSE NULL END,
        "generatedPasswordEncrypted" = CASE WHEN :generatedPassword IS NOT NULL THEN pgp_sym_encrypt(:generatedPassword, :key) ELSE NULL END
      WHERE id = :credentialId
    `, opts);
  },

  async encryptReferrerEmailFields(
    referrerId: string,
    referredEmail: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { referrerId, key: KEY, referredEmail }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE referrers SET
        "referredEmailEncrypted" = CASE WHEN :referredEmail IS NOT NULL THEN pgp_sym_encrypt(:referredEmail, :key) ELSE NULL END,
        "referredEmailHash" = CASE WHEN :referredEmail IS NOT NULL THEN ENCODE(DIGEST(LOWER(:referredEmail), 'sha256'), 'hex') ELSE NULL END
      WHERE id = :referrerId
    `, opts);
  },

  // ── Missing info helpers ──

  async getDecryptedMissingRequestPersonalMessage(requestId: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT get_decrypted_missing_request_personal_message(:requestId, :key) AS message`,
      { replacements: { requestId, key: KEY }, type: QueryTypes.SELECT }
    );
    return (result as any)?.message ?? null;
  },

  async encryptMissingRequestPersonalMessage(
    requestId: string,
    message: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { requestId, key: KEY, message }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE missing_info_requests SET
        "personalMessageEncrypted" = CASE WHEN :message IS NOT NULL THEN pgp_sym_encrypt(:message, :key) ELSE NULL END
      WHERE id = :requestId
    `, opts);
  },

  async getDecryptedMissingResponseFieldValue(responseId: string): Promise<string | null> {
    const [result] = await db().query(
      `SELECT get_decrypted_missing_response_field_value(:responseId, :key) AS value`,
      { replacements: { responseId, key: KEY }, type: QueryTypes.SELECT }
    );
    return (result as any)?.value ?? null;
  },

  async encryptMissingResponseFieldValue(
    responseId: string,
    value: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { responseId, key: KEY, value }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE missing_info_responses SET
        "fieldValueEncrypted" = CASE WHEN :value IS NOT NULL THEN pgp_sym_encrypt(:value, :key) ELSE NULL END
      WHERE id = :responseId
    `, opts);
  },
};
