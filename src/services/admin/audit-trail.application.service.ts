import { AuditTrail } from "../../models/v1/audit-trail.model";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("audit-trail-service");

export interface AuditLogInput {
  action: string;
  actorUserId: string;
  targetType: string;
  targetKey?: string | null;
  before?: any;
  after?: any;
  metadata?: any;
}

class AuditTrailApplicationService {
  private async resolveActorEmail(actorUserId: string): Promise<string | null> {
    try {
      const user = await User.findByPk(actorUserId);
      return user?.email ?? null;
    } catch {
      return null;
    }
  }

  async log(input: AuditLogInput): Promise<void> {
    const actorEmail = await this.resolveActorEmail(input.actorUserId);

    await AuditTrail.create({
      action: input.action,
      actorUserId: input.actorUserId,
      actorEmail,
      targetType: input.targetType,
      targetKey: input.targetKey ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      metadata: input.metadata ?? null,
    });

    logger.info(
      `Audit logged: action=${input.action}, actor=${input.actorUserId}, target=${input.targetType}:${input.targetKey ?? "-"}`,
    );
  }
}

export const auditTrailApplicationService = new AuditTrailApplicationService();

