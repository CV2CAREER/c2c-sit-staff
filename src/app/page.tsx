import Home from "@/layout/Home";
import { Suspense } from "react";

export default async function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className=" w-screen h-screen flex justify-center">
          <div className="flex justify-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#9B59B6] rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}
