"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ClaimReferralForm from "./ClaimReferralForm";
import { UserPlus } from "lucide-react";

export default function ClaimReferralDialog({ 
  refUserId, 
  onSuccess 
}: { 
  refUserId: string;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm">
          <UserPlus size={18} />
          Claim Referral
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Claim New Referral</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ClaimReferralForm 
            refUserId={refUserId} 
            onSuccess={() => {
              setOpen(false);
              onSuccess?.();
            }} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
