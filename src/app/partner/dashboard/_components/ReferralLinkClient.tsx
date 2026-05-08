"use client";

import React, { useRef, useState } from "react";
import { Copy } from "lucide-react";

type Props = {
  referralLink: string;
};

const ReferralLinkClient: React.FC<Props> = ({ referralLink }) => {
  const [copied, setCopied] = useState(false);
  const isMounted = useRef(true);

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    if (!isMounted.current) return;
    setCopied(true);
    setTimeout(() => {
      if (isMounted.current) setCopied(false);
    }, 2000);
  };

  if (!referralLink) return null;

  return (
    <div className="bg-[#E6F7FF] p-4 rounded-lg text-sm text-[#1890FF] flex flex-col sm:flex-row sm:items-center gap-2 mt-4 md:mt-0 break-words max-w-full">
      <span className="font-medium whitespace-nowrap">Referral link:</span>
      <div className="flex items-center gap-2">
        <a
          href={referralLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline break-all"
        >
          {referralLink}
        </a>
        <button
          onClick={copyToClipboard}
          className="text-[#1890FF] hover:text-[#40a9ff] transition"
          title="Copy referral link"
        >
          <Copy size={16} />
        </button>
        {copied && (
          <span className="text-green-600 text-xs ml-2 transition-opacity animate-fade-in">
            Copied!
          </span>
        )}
      </div>
    </div>
  );
};

export default ReferralLinkClient;
