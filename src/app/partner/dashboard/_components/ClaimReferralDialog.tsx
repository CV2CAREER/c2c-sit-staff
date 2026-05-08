"use client";

import React, { useState } from "react";
import ClaimReferralForm from "./ClaimReferralForm";
import { Dialog } from "@headlessui/react";
import { useClaimReferral } from "@/hooks/usePartnerDashboard";

interface ClaimReferralDialogProps {
  refUserId: string;
  onSuccess?: () => void;
}

export default function ClaimReferralDialog({ refUserId, onSuccess }: ClaimReferralDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: claimReferral, isPending } = useClaimReferral();

  const handleSubmit = (data: { firstName: string; lastName: string; middleName?: string; email: string; phoneNumber: string }) => {
    claimReferral(data, {
      onSuccess: () => {
        setOpen(false);
        onSuccess?.();
      },
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#008ED3] text-white px-4 py-2 rounded-md font-medium"
      >
        Claim Referral
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} className="fixed z-50 inset-0">
        <div className="flex items-center justify-center min-h-screen bg-black/30 p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <ClaimReferralForm onSubmit={handleSubmit} loading={isPending} />
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
