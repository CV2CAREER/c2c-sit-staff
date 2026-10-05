"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import {
  useJobsiteConfigs,
} from "@/hooks/api/jobsite-verification.api";
import { JobsiteConfig } from "@/types/jobsite-verification.types";
import AddJobsiteModal from "./AddJobsiteModal";

const COUNTRY_FLAGS: Record<string, string> = {
  Australia: "🇦🇺",
  Canada: "🇨🇦",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  "New Zealand": "🇳🇿",
  Ireland: "🇮🇪",
};

export default function JobsiteManageView() {
  const { configsByCountry, actions, isLoading } = useJobsiteConfigs();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [guideUrls, setGuideUrls] = useState<Record<string, string>>({});
  const [requiredStates, setRequiredStates] = useState<Record<string, boolean>>({});

  const getJobsiteMark = (jobsiteId: string) => {
    const isSeek = jobsiteId.toLowerCase().includes("seek");
    const isIndeed = jobsiteId.toLowerCase().includes("indeed");
    const mark = isSeek ? "SK" : isIndeed ? "IN" : jobsiteId.slice(0, 2).toUpperCase();
    const bg = isSeek ? "bg-[#e21b1b]" : isIndeed ? "bg-[#2557a7]" : "bg-[#14143c]";
    return { mark, bg };
  };

  const getFriendlyErrorMessage = (err: any, fallback: string): string => {
    const rawMsg = err?.response?.data?.message || err?.message;
    if (!rawMsg || typeof rawMsg !== "string") return fallback;
    if (
      rawMsg.toLowerCase().includes("route ") ||
      rawMsg.toLowerCase().includes("not found") ||
      rawMsg.toLowerCase().includes("cannot post") ||
      rawMsg.toLowerCase().includes("cannot get")
    ) {
      return "Service endpoint temporarily unreachable. Please try again in a moment.";
    }
    return rawMsg;
  };

  const handleToggleRequired = async (
    country: string,
    jobsiteId: string,
    currentVal: boolean
  ) => {
    const newVal = !currentVal;
    const key = `${country}-${jobsiteId}`;
    setRequiredStates((prev) => ({ ...prev, [key]: newVal }));

    try {
      await actions.toggleRequired({
        country,
        jobsiteId,
        required: newVal,
      });
      toast.success(
        `${jobsiteId} is now ${newVal ? "Required" : "Off"} for ${country}`
      );
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to update requirement. Please try again."));
      setRequiredStates((prev) => ({ ...prev, [key]: currentVal }));
    }
  };

  const handleSaveGuide = async (country: string, jobsiteId: string) => {
    const key = `${country}-${jobsiteId}`;
    const url = guideUrls[key];
    if (url === undefined) {
      toast.success("Video guide link saved");
      return;
    }

    try {
      await actions.updateVideoGuide({
        country,
        jobsiteId,
        videoGuideUrl: url,
      });
      toast.success("Video guide link saved");
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to save video guide. Please try again."));
    }
  };

  const handleAddJobsite = async (data: {
    jobsiteId: string;
    country: string;
    required: boolean;
    videoGuideUrl?: string;
  }) => {
    try {
      await actions.addJobsite(data);
      toast.success(`Jobsite ${data.jobsiteId} added for ${data.country}`);
      setIsAddModalOpen(false);
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to add jobsite. Please check the details and try again."));
      throw err;
    }
  };

  const countries = Object.keys(configsByCountry);

  return (
    <div className="flex flex-col gap-5">
      {/* Manage Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[#14143c]">
            Jobsite requirements by country
          </h2>
          <p className="mt-0.5 text-xs text-[#8a8fa3]">
            Turn a jobsite on or off per country and set the video guide clients see for it.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e9ff2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a8ddb]"
        >
          <Plus size={15} /> Add jobsite
        </button>
      </div>

      {/* Country Cards */}
      {countries.map((country) => {
        const jobsites = configsByCountry[country] || [];
        const flag = COUNTRY_FLAGS[country] || "🌐";

        return (
          <div
            key={country}
            className="overflow-hidden rounded-2xl border border-[#ececf2] bg-white shadow-sm"
          >
            {/* Country Card Head */}
            <div className="flex items-center justify-between border-b border-[#ececf2] bg-[#fafbfd] px-5 py-3.5">
              <div className="flex items-center gap-2.5 text-sm font-bold text-[#14143c]">
                <span className="text-lg">{flag}</span>
                <span>{country}</span>
              </div>
            </div>

            {/* Country Jobsite Rows */}
            <div className="divide-y divide-[#ececf2]">
              {jobsites.map((item) => {
                const key = `${country}-${item.jobsiteId}`;
                const { mark, bg } = getJobsiteMark(item.jobsiteId);
                const isRequired =
                  requiredStates[key] !== undefined
                    ? requiredStates[key]
                    : item.required;
                const currentUrl =
                  guideUrls[key] !== undefined
                    ? guideUrls[key]
                    : item.videoGuideUrl || "";

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-3.5"
                  >
                    {/* Jobsite Mark + Name */}
                    <div className="flex min-w-[180px] items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${bg}`}
                      >
                        {mark}
                      </div>
                      <div className="text-[13.5px] font-semibold text-[#14143c]">
                        {item.jobsiteId}
                      </div>
                    </div>

                    {/* Required / Off Toggle Switch */}
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isRequired}
                          onChange={() =>
                            handleToggleRequired(country, item.jobsiteId, isRequired)
                          }
                          className="peer sr-only"
                        />
                        <div className="h-5 w-9 rounded-full bg-[#d8dae3] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1e9ff2] peer-checked:after:translate-x-4"></div>
                      </label>
                      <span
                        className={
                          isRequired ? "text-[#14143c]" : "text-[#8a8fa3]"
                        }
                      >
                        {isRequired ? "Required" : "Off"}
                      </span>
                    </div>

                    {/* Video Guide URL Field */}
                    <div className="flex flex-1 items-center gap-2.5 min-w-[240px]">
                      <label className="text-[11.5px] font-semibold text-[#8a8fa3] shrink-0">
                        Video guide
                      </label>
                      <input
                        type="text"
                        value={currentUrl}
                        onChange={(e) =>
                          setGuideUrls((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder="https://scribehow.com/shared/..."
                        className="w-full rounded-lg border border-[#ececf2] px-3 py-1.5 text-xs text-[#14143c] outline-none focus:border-[#1e9ff2]"
                      />
                      <button
                        onClick={() => handleSaveGuide(country, item.jobsiteId)}
                        className="rounded-lg bg-[#eaf6fe] px-3.5 py-1.5 text-xs font-semibold text-[#1e9ff2] hover:bg-[#d9edfc]"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {countries.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-[#ececf2] bg-white p-12 text-center text-xs text-[#8a8fa3]">
          No jobsites configured yet. Click "+ Add jobsite" to create your first country requirement.
        </div>
      )}

      {/* Add Jobsite Modal */}
      <AddJobsiteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddJobsite}
        isSubmitting={actions.isAdding}
      />
    </div>
  );
}
