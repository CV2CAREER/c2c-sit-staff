// import Home from "@/layout/Home";
"use client";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    window.location.href = "/login";
  }, []);

  return (
    <div className=" w-screen h-screen flex justify-center items-center">
      <div className="flex justify-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#9B59B6] rounded-full animate-spin" />
      </div>
    </div>
  );
}
