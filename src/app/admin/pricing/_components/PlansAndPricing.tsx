// PlansAndPricing.tsx
"use client";
import React from "react";
import { currencyFormatterFunc } from "@/utils/helperFns";
import { PricingPlan } from "@/types/pricing.types";

interface SubscriptionPlanProps {
  handleClick: (plan: PricingPlan) => void;
  pricing: PricingPlan;
  symbol: { currencyCode?: string; currencySymbol?: string };
  multiplier: string;
}

const SubscriptionPlan: React.FC<SubscriptionPlanProps> = ({
  handleClick,
  pricing,
  symbol,
  multiplier,
}) => {
  const otherFeatures = pricing.extra
    ? pricing.extra
      .split(",")
      .map((feature) => feature.trim())
      .filter((feature) => feature.length > 0)
    : [];
  const numericMultiplier = Number(multiplier);
  const convertedPrice =
    pricing.price * (Number.isFinite(numericMultiplier) && numericMultiplier > 0 ? numericMultiplier : 1);

  return (
    <div className="bg-[#EEF7FF] rounded-2xl overflow-hidden flex flex-col w-[18rem] min-h-[18rem] max-w-[82vw] flex-shrink-0">
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <span className="text-[1.1rem] leading-none flex flex-row justify-end items-end font-semibold text-[#171717] font-sharp-grotesk">
          {currencyFormatterFunc({
            to: symbol?.currencyCode || "AUD",
            amount: convertedPrice,
          })}{" "}
          <p className="text-[0.4rem] ml-1 mb-[0.18rem] font-semibold uppercase tracking-[0.02em]">
            {symbol?.currencyCode}
          </p>
        </span>
        <span className="inline-flex py-2 px-5 bg-white rounded-full text-[0.6rem] leading-none text-[#171717] shadow-[0_0_0_1px_rgba(23,23,23,0.04)]">
          {pricing.title}
        </span>
      </div>
      <div className="px-6 pb-5 flex-grow grid grid-rows-[1fr,auto]">
        <ul className="grid gap-5 h-fit text-[0.62rem] leading-[1.45] text-[#171717]">
          {pricing.jobApplications ? (
            <li className="flex gap-4 items-start">
              <span className="inline-block w-[0.33rem] h-[0.33rem] mt-[0.5rem] flex-shrink-0 bg-current"></span>
              <span>{pricing.jobApplications}</span>
            </li>
          ) : null}
          {otherFeatures.map((data: string, index: number) => (
            <li className="flex gap-4 items-start" key={`${data}-${index}`}>
              <span className="inline-block w-[0.33rem] h-[0.33rem] mt-[0.5rem] flex-shrink-0 bg-current"></span>
              <span>{data}</span>
            </li>
          ))}
          <li className="flex gap-4 items-start">
            <span className="inline-block w-[0.33rem] h-[0.33rem] mt-[0.5rem] flex-shrink-0 bg-current"></span>
            <span>{`${pricing.validityPeriod} Subscription With ${pricing.subscriptionBreak} Pause Option Before Duration Hard End Date`}</span>
          </li>
          <li className="flex gap-4 items-start">
            <span className="inline-block w-[0.33rem] h-[0.33rem] mt-[0.5rem] flex-shrink-0 bg-current"></span>
            <span>{`${pricing.profileLimit} Client Profile Application`}</span>
          </li>
        </ul>
        <div className="flex items-center justify-center mt-auto">
          <button
            onClick={() => handleClick(pricing)}
            className="px-4 py-2 mt-10 !text-sm font-medium tracking-wide text-white capitalize transition-colors transform bg-[#008ED3] rounded-md hover:bg-[#0077B0] focus:outline-none focus:bg-[#0077B0] disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <p>Edit</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;
