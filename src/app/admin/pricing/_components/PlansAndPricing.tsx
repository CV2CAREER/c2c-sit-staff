// PlansAndPricing.tsx
"use client";
import React from "react";
import { currencyFormatterFunc } from "@/utils/helperFns";
import { classNames } from "@/utils/helperFns";
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
  const otherFeatures = pricing.extra ? pricing.extra.split(",").map(f => f.trim()) : [];
  const numericMultiplier = Number(multiplier);
  const convertedPrice =
    pricing.price * (Number.isFinite(numericMultiplier) && numericMultiplier > 0 ? numericMultiplier : 1);

  return (
    <div className="bg-sky-50 rounded-2xl overflow-hidden flex flex-col w-[24rem] max-w-[80vw] flex-shrink-0">
      <div
        className={classNames(
          "p-8 flex items-center justify-between",
          pricing.styleData?.background || "bg-[#008ED3]"
        )}
      >
        <span className="text-32 flex flex-row justify-end items-end smallLaptop:text-3xl bigLaptop:text-4xl font-medium text-white mix-blend-difference font-sharp-grotesk">
          {currencyFormatterFunc({
            to: symbol?.currencyCode || "AUD",
            amount: convertedPrice,
          })}{" "}
          <p className=" text-sm ml-1">{symbol?.currencyCode}</p>
        </span>
        <span className="inline-flex py-2 px-6 bg-white rounded-full">
          {pricing.title}
        </span>
      </div>
      <div className="p-8 flex-grow grid grid-rows-[1fr,auto]">
        <ul className="grid gap-6 h-fit">
          {pricing.jobApplications ? (
            <li className="flex gap-4 items-start">
              <span className="inline-block w-2 h-2 mt-2 flex-shrink-0 bg-current"></span>
              <span>{pricing.jobApplications} Job Applications</span>
            </li>
          ) : null}
          <li className="flex gap-4 items-start">
            <span className="inline-block w-2 h-2 mt-2 flex-shrink-0 bg-current"></span>
            <span>{`${pricing.validityPeriod} Subscription With ${pricing.subscriptionBreak} Pause Option`}</span>
          </li>
          <li className="flex gap-4 items-start">
            <span className="inline-block w-2 h-2 mt-2 flex-shrink-0 bg-current"></span>
            <span>{`${pricing.profileLimit} Client Profile Application`}</span>
          </li>
          {otherFeatures.map((data: string, index: number) => (
            <li className="flex gap-4 items-start" key={index}>
              <span className="inline-block w-2 h-2 mt-2 flex-shrink-0 bg-current"></span>
              <span>{data}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-center mt-auto">
          <button
            onClick={() => handleClick(pricing)}
            className="px-4 py-2 mt-10 !text-sm font-medium tracking-wide text-white capitalize transition-colors  transform bg-[#008ED3] rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <p>Edit</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;
