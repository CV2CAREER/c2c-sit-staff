"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SendReferralForm from "./SendReferralForm";
import { Send } from "lucide-react";

export default function SendReferralDialog({ 
  onSuccess 
}: { 
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm">
          <Send size={18} />
          Send Referral
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Send New Referral</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <SendReferralForm 
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
