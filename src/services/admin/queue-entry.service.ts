import { QueueEntry, QueueEntryQueue } from "../../models/v1/queue-entry.model";
import { MissingInfoTemplate } from "../../models/v1/missing-info-template.model";
import { activePcsService } from "./active-pcs.service";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("queue-entry-service");

type AuthUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
} | null | undefined;

const displayName = (user: AuthUser): string => {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return name || user?.email || "Unknown";
};

/**
 * Staff-queue lifecycle (SPR-21-51-002). Resolve is manual-only — the
 * ticket decision (51-002, option 3) is that no automation fires on resolve.
 * The system-queue side (51-003 creation/escalation) is added in Phase 3;
 * this service already enforces the resolutionNote rule for it.
 */
export class QueueEntryService {
  /**
   * Raise a Housekeeping template as a staff task. Backend enforces the
   * category rule from the register (only Database/Housekeeping templates
   * raise staff tasks), so a stray caller cannot create one from e.g.
   * "Additional visas".
   */
  async raiseStaffTask(templateId: string, user: AuthUser): Promise<QueueEntry> {
    const template = await MissingInfoTemplate.findByPk(templateId);
    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }
    if (template.category !== "housekeeping") {
      throw new ErrorHandler(
        "Only Housekeeping templates can be raised as staff tasks",
        400,
      );
    }

    const entry = await QueueEntry.create({
      queue: "staff",
      title: template.name,
      raisedById: (user as any)?.id || "unknown",
      raisedByName: displayName(user),
      status: "open",
    });
    logger.info(
      `Raised staff task "${entry.title}" (#${entry.id}) by ${entry.raisedByName}`,
    );
    return entry;
  }

  async listQueueEntries(
    queue: QueueEntryQueue,
    status?: "open" | "resolved",
  ): Promise<QueueEntry[]> {
    const where: Record<string, unknown> = { queue };
    if (status) where.status = status;
    return QueueEntry.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
  }

  async assignOwner(
    id: string,
    ownerId: string,
    ownerName: string,
    user: AuthUser,
  ): Promise<QueueEntry> {
    const entry = await QueueEntry.findByPk(id);
    if (!entry) {
      throw new ErrorHandler("Queue entry not found", 404);
    }
    if (entry.status !== "open") {
      throw new ErrorHandler("Resolved entries cannot be reassigned", 400);
    }
    if (!ownerId || !ownerName) {
      throw new ErrorHandler("ownerId and ownerName are required", 400);
    }
    if (entry.queue === "staff") {
      const roster = await activePcsService.getActivePCs();
      if (!roster.some((pc) => pc.id === ownerId)) {
        throw new ErrorHandler("Owner is not an active Placement Controller", 400);
      }
    }

    entry.assignedToId = ownerId;
    entry.assignedToName = ownerName;
    await entry.save();
    logger.info(
      `Queue entry #${id} assigned to ${ownerName} by ${displayName(user)}`,
    );
    return entry;
  }

  /**
   * Manual resolve (both queues). System entries additionally require a
   * resolution note as proof-of-work (51-003 DoD); staff entries may omit it.
   */
  async resolveEntry(
    id: string,
    user: AuthUser,
    note?: string,
  ): Promise<QueueEntry> {
    const entry = await QueueEntry.findByPk(id);
    if (!entry) {
      throw new ErrorHandler("Queue entry not found", 404);
    }
    if (entry.status !== "open") {
      throw new ErrorHandler("Entry is already resolved", 400);
    }
    const trimmed = (note || "").trim();
    if (entry.queue === "system" && !trimmed) {
      throw new ErrorHandler(
        "A resolution note (proof of work) is required to action system entries",
        400,
      );
    }

    entry.status = "resolved";
    entry.resolvedById = (user as any)?.id || "unknown";
    entry.resolvedByName = displayName(user);
    if (trimmed) entry.resolutionNote = trimmed;
    await entry.save();
    logger.info(`Queue entry #${id} (${entry.queue}) resolved by ${entry.resolvedByName}`);
    return entry;
  }

  /** Create a system-queue entry from a client action (Phase 3 hook). */
  async createSystemEntry(data: {
    title: string;
    clientId?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    triggerKey?: string | null;
    routedStaff?: Record<string, unknown> | null;
    raisedById?: string;
    raisedByName?: string;
  }): Promise<QueueEntry> {
    return QueueEntry.create({
      queue: "system",
      title: data.title,
      raisedById: data.raisedById || "system",
      raisedByName: data.raisedByName || "System (client action)",
      status: "open",
      clientId: data.clientId || null,
      clientName: data.clientName || null,
      clientEmail: data.clientEmail || null,
      triggerKey: data.triggerKey || null,
      routedStaff: data.routedStaff || null,
      escalationLevel: 0,
      nextEscalationAt: null,
    });
  }
}

export const queueEntryService = new QueueEntryService();
