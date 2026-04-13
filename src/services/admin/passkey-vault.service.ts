import * as bcrypt from "bcryptjs";
import { PassKeyVault } from "../../models/v1/passkey-vault.model";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("passkey-vault-service");

const BCRYPT_SALT_ROUNDS = 10;

class PassKeyVaultService {
  /**
   * Get audit trail passkey
   */
  async getAuditTrailPasskey() {
    logger.debug("Fetching audit trail passkey");
    
    return await PassKeyVault.findOne({
      where: { name: 'audit-trail' },
      raw: true
    });
  }

  /**
   * Set or update audit trail passkey with bcrypt encryption
   */
  async setAuditTrailPasskey(passKey: string, userId: string) {
    logger.debug(`Setting audit trail passkey by user ${userId}`);

    // Encrypt passkey before storing
    const hashedKey = await bcrypt.hash(passKey, BCRYPT_SALT_ROUNDS);

    const existing = await PassKeyVault.findOne({
      where: { name: 'audit-trail' }
    });

    if (existing) {
      await existing.update({
        key: hashedKey,
        updateBy: userId
      });
      return { updated: true };
    } else {
      await PassKeyVault.create({
        name: 'audit-trail',
        key: hashedKey,
        createdBy: userId
      });
      return { created: true };
    }
  }

  /**
   * Verify passkey against stored bcrypt hash
   */
  async verifyPasskey(passKey: string) {
    logger.debug("Verifying audit trail passkey");

    const storedKey = await this.getAuditTrailPasskey();

    if (storedKey) {
      return await bcrypt.compare(passKey, storedKey.key);
    }

    return false;
  }
}

export const passKeyVaultService = new PassKeyVaultService();