import { Suspense } from "react";
import UnifiedBuilderClient from "./_components/UnifiedBuilderClient";

export const metadata = {
  title: "Template Builder",
};

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
      </div>
    }>
      <UnifiedBuilderClient />
    </Suspense>
  );
}
