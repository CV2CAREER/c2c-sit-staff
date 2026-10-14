import ErrorHandler from "@/utils/errorHandler";
import { fieldEncryption } from "@/utils/field-encryption";

/** Shown to a PC who opens a client they aren't assigned to. */
export const NOT_ASSIGNED_MESSAGE =
  "You can't view this client because they aren't assigned to you. If you need access, please ask an admin to assign them to you.";

type Actor = { id?: string; role?: string } | null | undefined;

/**
 * Access is not assignment (C2C-261): an assistant who can open a client's
 * page is not necessarily assigned to that client. Every VA endpoint that
 * reads a client's data checks this, whichever entry point it came from.
 * Admins can see every client.
 */
export async function assertClientAccess(actor: Actor, clientId: string) {
  if (!actor?.id) throw new ErrorHandler("Authentication required", 401);
  if (actor.role === "admin") return;

  const email = await fieldEncryption.getUserEmail(actor.id);
  if (!email) throw new ErrorHandler(NOT_ASSIGNED_MESSAGE, 403);

  // Client pages identify the client differently: /pc/users/[id] uses the
  // user's id (credentials.clientId), /pc/campaign-mgt/client/[id] uses the
  // credential's own id. Either is fine — both only ever match credentials
  // already assigned to this PC.
  const credentials = await fieldEncryption.findCredentialsByAssignedEmail(email);
  const assigned = credentials.some(
    (c: any) => String(c.clientId) === String(clientId) || String(c.id) === String(clientId),
  );
  if (!assigned) throw new ErrorHandler(NOT_ASSIGNED_MESSAGE, 403);
}
