import type { Metadata } from "next";
import { Suspense } from "react";
import MissingInformationClient from "./_components/MissingInformationClient";

export const metadata: Metadata = {
  title: "Missing Information | C2C Platform",
};

export default function MissingInformationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-[13px] text-[#9CA3AF]">Loading...</div>
      }
    >
      <MissingInformationClient />
    </Suspense>
  );
}
