import { Suspense } from "react";
import AuthInitiateContent from "./_components/AuthInitiateContent";
import { Loader2 } from "lucide-react";

export default function AdminInitiatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-gray-600">Loading session...</p>
        </div>
      }
    >
      <AuthInitiateContent />
    </Suspense>
  );
}
