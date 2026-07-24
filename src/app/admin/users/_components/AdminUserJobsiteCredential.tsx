import React, { useState } from "react";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { IconButton, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { KeyRound } from "lucide-react";
import RejectCredentialModal from "../../jobsite-credentials/_components/reject-credential-modal";
import ConfirmActionModal from "../../jobsite-credentials/_components/confirm-action-modal";
import { JobsiteCredentialRejectionReason } from "@/types/jobsite-credential.types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  forwarded: "Forwarded",
  accepted: "Accepted",
  active: "Active",
  failed: "Failed",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  forwarded: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

// Staff-facing equivalent of the admin Management -> Jobsite Credentials
// table, scoped to a single client. Staff (assistant role) has no access
// to the Management nav item, so this card is their only surface for the
// full Accept -> Test -> Approve/Reject pipeline (Approve/Reject stay
// disabled until Test has been clicked at least once this ACCEPTED
// period), plus the manual "Add Credential" fallback (C2C-179) for a
// client who cannot self-serve.
const AdminUserJobsiteCredential = ({ userId }: { userId: string }) => {
  const { clientJobsiteCredential, isClientJobsiteCredentialLoading } =
    useAdminQueries({ userId, fetchClientJobsiteCredential: true });
  const {
    addJobsiteCredentialManually,
    isAddingCredential,
    acceptJobsiteCredential,
    isAccepting,
    sendTestEmail,
    isSendingTestEmail,
    approveJobsiteCredential,
    isApproving,
    unapproveJobsiteCredential,
    isUnapproving,
    rejectJobsiteCredential,
    isRejecting,
    revealJobsiteCredentialPassword,
  } = useAdminMutations();

  const [email, setEmail] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(
    null,
  );
  // Replaces window.confirm() for Accept and Unapprove.
  const [confirmingAction, setConfirmingAction] = useState<
    "accept" | "unapprove" | null
  >(null);

  const credential = clientJobsiteCredential;

  const handleAdd = () => {
    if (!email.trim()) return;
    addJobsiteCredentialManually(
      { clientId: userId, email: email.trim() },
      { onSuccess: () => setEmail("") },
    );
  };

  const handleAccept = () => {
    if (!credential) return;
    setConfirmingAction("accept");
  };

  const handleSendTestEmail = () => {
    if (!credential) return;
    sendTestEmail({ id: credential.id });
  };

  const handleApprove = () => {
    if (!credential) return;
    approveJobsiteCredential({ id: credential.id });
  };

  const handleUnapprove = () => {
    if (!credential) return;
    setConfirmingAction("unapprove");
  };

  const handleConfirmAction = () => {
    if (!credential || !confirmingAction) return;
    if (confirmingAction === "accept") {
      acceptJobsiteCredential(
        { id: credential.id },
        { onSuccess: () => setConfirmingAction(null) },
      );
    } else {
      unapproveJobsiteCredential(
        { id: credential.id },
        { onSuccess: () => setConfirmingAction(null) },
      );
    }
  };

  const handleReject = (
    reason: JobsiteCredentialRejectionReason,
    note?: string,
  ) => {
    if (!credential) return;
    rejectJobsiteCredential(
      { id: credential.id, reason, note },
      { onSuccess: () => setRejecting(false) },
    );
  };

  const handleReveal = () => {
    if (!credential) return;
    revealJobsiteCredentialPassword(
      { id: credential.id },
      {
        onSuccess: (data: any) => {
          setRevealedPassword(data?.data?.password ?? null);
        },
      },
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-career-gray-300/60 bg-white shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-career-blue-800 via-career-blue-300 to-career-blue-800" />
      <div className="p-4 md:p-6 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-career-blue-800/10 text-career-blue-800">
            <KeyRound size={20} />
          </span>
          <h3 className="text-xl md:text-2xl font-semibold">Jobsite Credential</h3>
        </div>

      {isClientJobsiteCredentialLoading ? (
        <div className="h-16 animate-pulse bg-gray-100 rounded-md" />
      ) : credential ? (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Application email</span>
            <span className="font-medium">{credential.email}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <span
              className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                STATUS_STYLE[credential.status] ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {STATUS_LABEL[credential.status] ?? credential.status}
            </span>
          </div>

          {credential.status === "active" && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Jobsite password</span>
              <div className="flex items-center gap-1">
                <span className="font-medium tracking-widest">
                  {revealedPassword ?? "••••••••"}
                </span>
                <Tooltip
                  title="Reveal password — this action is logged"
                  placement="top"
                  slotProps={{ popper: { style: { zIndex: 1500 } } }}
                >
                  <IconButton size="small" onClick={handleReveal}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          )}

          {credential.rejectionReason && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Rejection reason</span>
              <span className="font-medium">{credential.rejectionReason}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
            {credential.status === "forwarded" && (
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isAccepting}
              >
                Accept
              </Button>
            )}

            {credential.status === "accepted" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={!credential.testedAt || isApproving}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-500"
                  onClick={() => setRejecting(true)}
                  disabled={!credential.testedAt}
                >
                  Reject
                </Button>
              </>
            )}

            {credential.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-500 text-red-500"
                onClick={handleUnapprove}
                disabled={isUnapproving}
              >
                Unapprove
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">
            This client has no application email on file. Use this only when
            the client cannot self-serve from their own profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="Application email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!email.trim() || isAddingCredential}
            >
              {isAddingCredential ? "Adding…" : "Add Credential"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={rejecting} onOpenChange={(open) => !open && setRejecting(false)}>
        {rejecting && (
          <RejectCredentialModal
            credentialId={credential?.id ?? ""}
            isRejecting={isRejecting}
            onClose={() => setRejecting(false)}
            onReject={handleReject}
          />
        )}
      </Dialog>

      <Dialog
        open={!!confirmingAction}
        onOpenChange={(open) => !open && setConfirmingAction(null)}
      >
        {confirmingAction && (
          <ConfirmActionModal
            title={
              confirmingAction === "accept"
                ? "Accept this credential?"
                : "Unapprove this credential?"
            }
            description={
              confirmingAction === "accept"
                ? "This confirms the client has completed email forwarding, and the client will no longer be able to edit this email."
                : "This clears the current jobsite password and reverts to Accepted — applications will be blocked again until it's re-approved."
            }
            confirmLabel={confirmingAction === "accept" ? "Accept" : "Unapprove"}
            isConfirming={confirmingAction === "accept" ? isAccepting : isUnapproving}
            destructive={confirmingAction === "unapprove"}
            onConfirm={handleConfirmAction}
            onClose={() => setConfirmingAction(null)}
          />
        )}
      </Dialog>
      </div>
    </div>
  );
};

export default AdminUserJobsiteCredential;
