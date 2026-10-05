import ErrorHandler from "@/utils/errorHandler";
import { fieldEncryption } from "@/utils/field-encryption";

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
  if (!email) throw new ErrorHandler("You are not assigned to this client", 403);

  const credentials = await fieldEncryption.findCredentialsByAssignedEmail(email);
  const assigned = credentials.some((c: any) => String(c.clientId) === String(clientId));
  if (!assigned) throw new ErrorHandler("You are not assigned to this client", 403);
}
