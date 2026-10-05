"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader/PageHeader";
import { useJobsiteVerificationQueue } from "@/hooks/api/jobsite-verification.api";
import JobsiteReviewView from "./JobsiteReviewView";
import JobsiteManageView from "./JobsiteManageView";
import JobsiteCredentialsDataTable from "../../jobsite-credentials/_components/jobsite-credentials-data-table";
import SocialVerificationQueue from "../../social-verification/_components/SocialVerificationQueue";

type TopTab = "credentials" | "jobsites" | "social";
type SubView = "review" | "manage";

export default function VerificationsMain() {
  const [topTab, setTopTab] = useState<TopTab>("credentials");
  const [subView, setSubView] = useState<SubView>("review");

  const { listDomain } = useJobsiteVerificationQueue({});
  const stats = listDomain.stats;

  const handleTabChange = (tab: TopTab) => {
    setTopTab(tab);
    setSubView("review");
  };

  return (
    <div className="flex flex-col gap-5 mt-4 w-full">
      {/* Page Header */}
      <PageHeader
        title="Verifications"
        description="Review client credentials, jobsite verifications, and social verifications, or manage configuration."
      />

      {/* Top-Level Tabs (Credentials / Jobsites / Social) */}
      <div className="flex gap-2.5 pb-2 pt-1">
        <button
          onClick={() => handleTabChange("credentials")}
          className={`rounded-xl border px-6 py-2.5 text-xs font-semibold transition-colors ${
            topTab === "credentials"
              ? "border-[#1e9ff2] bg-[#eaf6fe] text-[#1e9ff2]"
              : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0]"
          }`}
        >
          Credentials
        </button>
        <button
          onClick={() => handleTabChange("jobsites")}
          className={`rounded-xl border px-6 py-2.5 text-xs font-semibold transition-colors ${
            topTab === "jobsites"
              ? "border-[#1e9ff2] bg-[#eaf6fe] text-[#1e9ff2]"
              : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0]"
          }`}
        >
          Jobsites
        </button>
        <button
          onClick={() => handleTabChange("social")}
          className={`rounded-xl border px-6 py-2.5 text-xs font-semibold transition-colors ${
            topTab === "social"
              ? "border-[#1e9ff2] bg-[#eaf6fe] text-[#1e9ff2]"
              : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0]"
          }`}
        >
          Social
        </button>
      </div>

      {/* CREDENTIALS TAB CONTENT */}
      {topTab === "credentials" && (
        <div className="flex flex-col gap-5 pt-1">
          <div className="inline-flex w-fit rounded-xl bg-[#eef0f5] p-1">
            <button
              onClick={() => setSubView("review")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                subView === "review"
                  ? "bg-white text-[#14143c] shadow-sm"
                  : "text-[#8a8fa3]"
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setSubView("manage")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                subView === "manage"
                  ? "bg-white text-[#14143c] shadow-sm"
                  : "text-[#8a8fa3]"
              }`}
            >
              Manage
            </button>
          </div>

          {subView === "review" ? (
            <JobsiteCredentialsDataTable />
          ) : (
            <div className="rounded-2xl border border-[#ececf2] bg-white p-8 text-center text-sm text-[#8a8fa3]">
              Credential management & configuration settings are integrated into the review table and automated ingestion.
            </div>
          )}
        </div>
      )}

      {/* JOBSITES TAB CONTENT */}
      {topTab === "jobsites" && (
        <div className="flex flex-col gap-5 pt-1">
          {/* Subtoggle + Stat Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-[#eef0f5] p-1">
              <button
                onClick={() => setSubView("review")}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  subView === "review"
                    ? "bg-white text-[#14143c] shadow-sm"
                    : "text-[#8a8fa3]"
                }`}
              >
                Review
              </button>
              <button
                onClick={() => setSubView("manage")}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  subView === "manage"
                    ? "bg-white text-[#14143c] shadow-sm"
                    : "text-[#8a8fa3]"
                }`}
              >
                Manage jobsites
              </button>
            </div>

            {/* Summary Stat Strip */}
            <div className="flex items-center gap-4 text-xs text-[#8a8fa3]">
              <span className="text-[#b7791f]">
                <strong className="font-bold text-[#b7791f]">
                  {stats.pendingCount}
                </strong>{" "}
                pending
              </span>
              <span className="text-[#16a34a]">
                <strong className="font-bold text-[#16a34a]">
                  {stats.approvedCount}
                </strong>{" "}
                approved
              </span>
              <span>
                <strong className="font-bold text-[#14143c]">
                  {stats.totalClients}
                </strong>{" "}
                clients
              </span>
            </div>
          </div>

          {/* Review View or Manage Jobsites View */}
          {subView === "review" ? (
            <JobsiteReviewView />
          ) : (
            <JobsiteManageView />
          )}
        </div>
      )}

      {/* SOCIAL TAB CONTENT */}
      {topTab === "social" && (
        <div className="flex flex-col gap-5 pt-1">
          <SocialVerificationQueue />
        </div>
      )}
    </div>
  );
}
