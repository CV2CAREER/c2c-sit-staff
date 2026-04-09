"use client";
import React from "react";
import Link from "next/link";

const promptRoutes = [
  { name: "QA AI Prompt", href: "/admin/prompts/qa-ai" },
  { name: "AQ AI Prompt", href: "/admin/prompts/aq-ai" },
  { name: "CV AI Prompt", href: "/admin/prompts/cv-ai" },
  { name: "Preference AI Prompt", href: "/admin/prompts/preference-ai" },
  { name: "Job Match AI Prompt", href: "/admin/prompts/job-match-ai" },
  {
    name: "Interview Preparation",
    href: "/admin/prompts/interview-preparation",
  },
  { name: "Keyword Generator", href: "/admin/prompts/keyword-generator" },
  { name: "Market Viability", href: "/admin/prompts/market-viability" },
  { name: "VA AI Prompt", href: "/admin/prompts/va-ai" },
];

const Page = () => {
  return (
    <div className="flex flex-col h-full min-h-full">
      {/* Header Section */}
      <div className="mt-6 mb-12">
        <div className="w-full bg-gray-200 rounded-2xl p-4 md:p-6 flex flex-col xl:flex-row items-center justify-between">
          <div className="text-black md:w-full lg:w-1/2 lg:pr-6">
            <h2 className="text-lg md:text-2xl mb-1 font-medium font-sharp-grotesk">
              AI Prompts Dashboard
            </h2>
            <p className="text-sm text-gray-700">
              Select a prompt category to manage.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full rounded-3xl bg-white p-6 shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">
          Available Prompt Categories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promptRoutes.map((route, index) => (
            <Link key={index} href={route.href} className="w-full">
              <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg border-2 border-gray-200 hover:shadow-lg transition-all cursor-pointer h-full">
                <p className="text-lg font-medium text-career-blue-500 hover:text-blue transition-all text-center">
                  {route.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Page;
