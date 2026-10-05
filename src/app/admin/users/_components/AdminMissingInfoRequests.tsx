"use client";

import React, { useState } from "react";
import {
  useClientMissingInfoRequests,
  useRequestResponses,
} from "@/hooks/api/missing-info-template.api";
import ViewResponsesModal from "../../missing-info-requests/_components/ViewResponsesModal";
import StaffTabContent from "./StaffTabContent";

export default function AdminMissingInfoRequests({
  userId,
}: {
  userId: string;
}) {
  const { data: requests, isLoading } = useClientMissingInfoRequests(userId);
  const [viewResponsesId, setViewResponsesId] = useState<string | null>(null);
  const { data: responsesData, isLoading: isResponsesLoading } =
    useRequestResponses(viewResponsesId || "");

  const empty = !isLoading && requests.length === 0;

  return (
    <div className="rounded-xl border border-[#E5E9EF] bg-white p-5 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#0F1E2E]">
          Missing Information Requests
        </h2>
        <p className="text-[12px] text-[#5B6B7C]">
          All requests raised for this client, newest first
        </p>
      </div>

      {empty ? (
        <div className="py-12 text-center">
          <p className="text-[13px] font-semibold text-[#0F1E2E]">
            No missing information yet
          </p>
          <p className="mt-1 text-[12px] text-[#95A3B2]">
            Request information from this client when you need it.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <a
              href="/admin/missing-information"
              className="rounded-lg bg-[#0B96D6] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#0876A8]"
            >
              Request new info
            </a>
            <a
              href="/admin/missing-information"
              className="rounded-lg border border-[#E5E9EF] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#10365A] hover:border-[#0B96D6] hover:text-[#0B96D6]"
            >
              Request from Client
            </a>
          </div>
        </div>
      ) : (
        <StaffTabContent
          requests={requests}
          isLoading={isLoading}
          onViewResponses={setViewResponsesId}
        />
      )}

      <ViewResponsesModal
        open={viewResponsesId !== null}
        onClose={() => setViewResponsesId(null)}
        data={responsesData}
        isLoading={isResponsesLoading}
      />
    </div>
  );
}
