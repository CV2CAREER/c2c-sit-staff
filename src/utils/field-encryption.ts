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
    email: string | null | undefined,
    phoneNumber: string | null | undefined,
    whatsappNumber: string | null | undefined,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { userId, key: KEY, email: email ?? null, phoneNumber: phoneNumber ?? null, whatsappNumber: whatsappNumber ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE users SET
        "emailEncrypted" = CASE WHEN :email IS NOT NULL AND :email <> '' THEN pgp_sym_encrypt(:email, :key) ELSE "emailEncrypted" END,
        "emailHash" = CASE WHEN :email IS NOT NULL AND :email <> '' THEN ENCODE(DIGEST(LOWER(:email), 'sha256'), 'hex') ELSE "emailHash" END,
        "phoneNumberEncrypted" = CASE WHEN :phoneNumber IS NOT NULL THEN pgp_sym_encrypt(:phoneNumber, :key) ELSE "phoneNumberEncrypted" END,
        "phoneNumberHash" = CASE WHEN :phoneNumber IS NOT NULL THEN ENCODE(DIGEST(:phoneNumber, 'sha256'), 'hex') ELSE "phoneNumberHash" END,
        "whatsappNumberEncrypted" = CASE WHEN :whatsappNumber IS NOT NULL THEN pgp_sym_encrypt(:whatsappNumber, :key) ELSE "whatsappNumberEncrypted" END
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
    const opts = { replacements: { profileId, key: KEY, ssn: ssn ?? null, tin: tin ?? null, dob: dob ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE profiles SET
        "socialSecurityNumberEncrypted" = CASE WHEN :ssn IS NOT NULL THEN pgp_sym_encrypt(:ssn, :key) ELSE "socialSecurityNumberEncrypted" END,
        "taxIdentificationNumberEncrypted" = CASE WHEN :tin IS NOT NULL THEN pgp_sym_encrypt(:tin, :key) ELSE "taxIdentificationNumberEncrypted" END,
        "dateOfBirthEncrypted" = CASE WHEN :dob IS NOT NULL THEN pgp_sym_encrypt(:dob, :key) ELSE "dateOfBirthEncrypted" END
      WHERE id = :profileId
    `, opts);
  },

  async encryptCredentialFields(
    credentialId: string,
    seekPassword: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { credentialId, key: KEY, seekPassword: seekPassword ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE credentials SET
        "seekPasswordEncrypted" = CASE WHEN :seekPassword IS NOT NULL THEN pgp_sym_encrypt(:seekPassword, :key) ELSE "seekPasswordEncrypted" END
      WHERE id = :credentialId
    `, opts);
  },

  // ── Phase 2A write helpers ──

  async encryptUserBankFields(
    userId: string,
    bankName: string | null | undefined,
    bsbCode: string | null | undefined,
    bankAccountNo: string | null | undefined,
    bankAccountName: string | null | undefined,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { userId, key: KEY, bankName: bankName ?? null, bsbCode: bsbCode ?? null, bankAccountNo: bankAccountNo ?? null, bankAccountName: bankAccountName ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE users SET
        "bankNameEncrypted" = CASE WHEN :bankName IS NOT NULL THEN pgp_sym_encrypt(:bankName, :key) ELSE "bankNameEncrypted" END,
        "bsbCodeEncrypted" = CASE WHEN :bsbCode IS NOT NULL THEN pgp_sym_encrypt(:bsbCode, :key) ELSE "bsbCodeEncrypted" END,
        "bankAccountNoEncrypted" = CASE WHEN :bankAccountNo IS NOT NULL THEN pgp_sym_encrypt(:bankAccountNo, :key) ELSE "bankAccountNoEncrypted" END,
        "bankAccountNameEncrypted" = CASE WHEN :bankAccountName IS NOT NULL THEN pgp_sym_encrypt(:bankAccountName, :key) ELSE "bankAccountNameEncrypted" END
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
    // Fields explicitly touched this call (e.g. an unassign setting a value
    // to null) — for these, null means "clear it", not "leave unchanged".
    // Anything not in this set keeps its previous behavior: null = untouched.
    touchedFields: string[] = [],
  ): Promise<void> {
    const touched = (field: string) => touchedFields.includes(field);
    const opts = {
      replacements: {
        credentialId, key: KEY,
        seekEmail: seekEmail ?? null, assignedPCName: assignedPCName ?? null, assignedPCEmail: assignedPCEmail ?? null,
        assignedVetName: assignedVetName ?? null, assignedVetEmail: assignedVetEmail ?? null,
        assignedCompletedName: assignedCompletedName ?? null, assignedCompletedEmail: assignedCompletedEmail ?? null,
      },
      type: QueryTypes.UPDATE as QueryTypes,
      transaction,
    };
    await db().query(`
      UPDATE credentials SET
        "seekEmailEncrypted" = CASE WHEN :seekEmail IS NOT NULL THEN pgp_sym_encrypt(:seekEmail, :key) ${touched('seekEmail') ? 'WHEN :seekEmail IS NULL THEN NULL' : ''} ELSE "seekEmailEncrypted" END,
        "AssignedPCNameEncrypted" = CASE WHEN :assignedPCName IS NOT NULL THEN pgp_sym_encrypt(:assignedPCName, :key) ${touched('AssignedPCName') ? 'WHEN :assignedPCName IS NULL THEN NULL' : ''} ELSE "AssignedPCNameEncrypted" END,
        "AssignedPCEmailEncrypted" = CASE WHEN :assignedPCEmail IS NOT NULL THEN pgp_sym_encrypt(:assignedPCEmail, :key) ${touched('AssignedPCEmail') ? 'WHEN :assignedPCEmail IS NULL THEN NULL' : ''} ELSE "AssignedPCEmailEncrypted" END,
        "AssignedVetNameEncrypted" = CASE WHEN :assignedVetName IS NOT NULL THEN pgp_sym_encrypt(:assignedVetName, :key) ${touched('AssignedVetName') ? 'WHEN :assignedVetName IS NULL THEN NULL' : ''} ELSE "AssignedVetNameEncrypted" END,
        "AssignedVetEmailEncrypted" = CASE WHEN :assignedVetEmail IS NOT NULL THEN pgp_sym_encrypt(:assignedVetEmail, :key) ${touched('AssignedVetEmail') ? 'WHEN :assignedVetEmail IS NULL THEN NULL' : ''} ELSE "AssignedVetEmailEncrypted" END,
        "AssignedCompletedNameEncrypted" = CASE WHEN :assignedCompletedName IS NOT NULL THEN pgp_sym_encrypt(:assignedCompletedName, :key) ${touched('AssignedCompletedName') ? 'WHEN :assignedCompletedName IS NULL THEN NULL' : ''} ELSE "AssignedCompletedNameEncrypted" END,
        "AssignedCompletedEmailEncrypted" = CASE WHEN :assignedCompletedEmail IS NOT NULL THEN pgp_sym_encrypt(:assignedCompletedEmail, :key) ${touched('AssignedCompletedEmail') ? 'WHEN :assignedCompletedEmail IS NULL THEN NULL' : ''} ELSE "AssignedCompletedEmailEncrypted" END
      WHERE id = :credentialId
    `, opts);
  },

  async encryptJobsiteCredentialFields(
    credentialId: string,
    email: string | null,
    generatedPassword: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { credentialId, key: KEY, email: email ?? null, generatedPassword: generatedPassword ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE jobsite_credentials SET
        "emailEncrypted" = CASE WHEN :email IS NOT NULL THEN pgp_sym_encrypt(:email, :key) ELSE "emailEncrypted" END,
        "emailHash" = CASE WHEN :email IS NOT NULL THEN ENCODE(DIGEST(LOWER(:email), 'sha256'), 'hex') ELSE "emailHash" END,
        "generatedPasswordEncrypted" = CASE WHEN :generatedPassword IS NOT NULL THEN pgp_sym_encrypt(:generatedPassword, :key) ELSE "generatedPasswordEncrypted" END
      WHERE id = :credentialId
    `, opts);
  },

  async encryptReferrerEmailFields(
    referrerId: string,
    referredEmail: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const opts = { replacements: { referrerId, key: KEY, referredEmail: referredEmail ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE referrers SET
        "referredEmailEncrypted" = CASE WHEN :referredEmail IS NOT NULL THEN pgp_sym_encrypt(:referredEmail, :key) ELSE "referredEmailEncrypted" END,
        "referredEmailHash" = CASE WHEN :referredEmail IS NOT NULL THEN ENCODE(DIGEST(LOWER(:referredEmail), 'sha256'), 'hex') ELSE "referredEmailHash" END
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
    const opts = { replacements: { requestId, key: KEY, message: message ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE missing_info_requests SET
        "personalMessageEncrypted" = CASE WHEN :message IS NOT NULL THEN pgp_sym_encrypt(:message, :key) ELSE "personalMessageEncrypted" END
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
    const opts = { replacements: { responseId, key: KEY, value: value ?? null }, type: QueryTypes.UPDATE as QueryTypes, transaction };
    await db().query(`
      UPDATE missing_info_responses SET
        "fieldValueEncrypted" = CASE WHEN :value IS NOT NULL THEN pgp_sym_encrypt(:value, :key) ELSE "fieldValueEncrypted" END
      WHERE id = :responseId
    `, opts);
  },
};
