"use client";

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import SendReferralForm from "./SendReferralForm";
import { useSendReferralEmail } from "@/hooks/usePartnerDashboard";

interface SendReferralDialogProps {
  refUserId: string;
  onSuccess?: () => void; 
  referralLink: string;
}

export default function SendReferralDialog({
  refUserId,
  onSuccess,
  referralLink,
}: SendReferralDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: sendReferralEmail, isPending } = useSendReferralEmail();

  const handleSubmit = (data: { firstName: string; lastName: string; middleName?: string; email: string; phoneNumber: string }) => {
    sendReferralEmail(data, {
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
        Send Referral
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} className="fixed z-50 inset-0">
        <div className="flex items-center justify-center min-h-screen bg-black/30 p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <SendReferralForm onSubmit={handleSubmit} loading={isPending} />
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
