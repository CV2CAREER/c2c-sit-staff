import { Suspense } from "react";
import MissingInfoRequestsPageClient from "./_components/MissingInfoRequestsPageClient";

export const metadata = {
  title: "Missing Info Outstanding Requests | C2C Platform",
};

export default function MissingInfoRequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[13px] text-[#9CA3AF]">Loading requests...</div>}>
      <MissingInfoRequestsPageClient />
    </Suspense>
  );
}
