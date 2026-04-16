"use client";

import { Copy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/user.store";

export default function ReferralLinkClient() {
  const user = useAuthStore((state) => state.user);
  const [copied, setCopied] = useState(false);
  const isMounted = useRef(true);

  const referralLink = useMemo(() => {
    return `${process.env.NEXT_PUBLIC_CLIENT_URL}/register?ref=${user?.email}-partner`;
  }, [user?.email]);

  const copyToClipboard = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    if (!isMounted.current) return;
    setCopied(true);
    setTimeout(() => {
      if (isMounted.current) setCopied(false);
    }, 2000);
  };

  if (!user?.email) return null;

  return (
    <div className="mt-4 flex max-w-full flex-col gap-2 rounded-lg bg-[#E6F7FF] p-4 text-sm text-[#1890FF] sm:mt-0 sm:flex-row sm:items-center">
      <span className="whitespace-nowrap font-medium">Referral link:</span>
      <div className="flex items-center gap-2">
        <a
          href={referralLink}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium underline"
        >
          {referralLink}
        </a>
        <button
          type="button"
          onClick={copyToClipboard}
          className="text-[#1890FF] transition hover:text-[#40a9ff]"
          title="Copy referral link"
        >
          <Copy size={16} />
        </button>
        {copied ? (
          <span className="ml-2 text-xs text-green-600">Copied!</span>
        ) : null}
      </div>
    </div>
  );
}
