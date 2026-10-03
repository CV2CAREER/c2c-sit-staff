// PlansAndPricing.tsx — SPR-21-56-006 admin card. Mirrors the customer-side
// /plan-and-pricing visual (white body, border-top accent, Most Popular pill
// for Gold, FiCheck bullets) and reads bullets from the shared TIER_META so
// admin + external pages never drift on client-facing copy.
"use client";
import React from "react";
import { FiCheck } from "react-icons/fi";
import { currencyFormatterFunc } from "@/utils/helperFns";
import { PricingPlan } from "@/types/pricing.types";
import { TIER_META } from "@/data/planTierMeta";

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
  const numericMultiplier = Number(multiplier);
  const effectiveMultiplier =
    Number.isFinite(numericMultiplier) && numericMultiplier > 0 ? numericMultiplier : 1;
  const convertedPrice = pricing.price * effectiveMultiplier;

  const meta = TIER_META[pricing.title] ?? {
    accentColor: "#0ea5e9",
    tagline: "",
    bullets: [] as string[],
  };
  const isFeatured = !!meta.featured;
  const isEmerald = pricing.title?.toLowerCase() === "emerald";

  const trackLabel = pricing.profileLimit === 1 ? "1 career track" : "2 career tracks";
  const termText = isEmerald
    ? `${pricing.validityPeriod || "10 days"} · partner-referred trial`
    : `${pricing.validityPeriod || ""} · ${trackLabel}`;

  return (
    <div
      className="relative bg-white rounded-2xl border-t-4 shadow-sm flex flex-col overflow-hidden w-full min-w-0 min-h-[22rem] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{ borderTopColor: meta.accentColor }}
    >
      {isFeatured && (
        <span className="absolute top-4 right-4 bg-[#0ea5e9] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
          Most Popular
        </span>
      )}

      <div className="p-5 sm:p-7 flex-grow">
        <h3 className="text-xl font-bold text-[#0d2d4a] mb-1">{pricing.title}</h3>
        {meta.tagline && (
          <p className="text-gray-400 text-sm mb-5">{meta.tagline}</p>
        )}

        <div className="flex items-baseline gap-1 mb-1 flex-wrap">
          <span className="text-2xl font-extrabold text-[#0d2d4a] break-words">
            {currencyFormatterFunc({
              to: symbol?.currencyCode || "AUD",
              amount: convertedPrice,
            })}
          </span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {symbol?.currencyCode}
          </span>
        </div>
        <p className="text-gray-400 text-xs mb-6">{termText}</p>

        <ul className="space-y-3">
          {meta.bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2.5 text-sm text-gray-600"
            >
              <FiCheck className="text-[#0ea5e9] mt-0.5 flex-shrink-0 w-4 h-4" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 pb-5 sm:px-7 sm:pb-7">
        <button
          onClick={() => handleClick(pricing)}
          className={
            isFeatured
              ? "w-full py-2.5 rounded-xl font-semibold text-sm bg-[#008ED3] text-white hover:bg-[#0074AD] shadow-md shadow-blue-200/50 transition-all duration-200"
              : "w-full py-2.5 rounded-xl font-semibold text-sm border border-[#008ED3] text-[#008ED3] hover:bg-[#f0f9ff] transition-all duration-200"
          }
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPlan;
