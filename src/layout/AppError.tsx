"use client";

import React from "react";
import { FiAlertTriangle, FiRefreshCw, FiHome } from "react-icons/fi";

interface AppErrorProps {
  reset?: () => void;
}

const AppError = ({ reset }: AppErrorProps) => {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-lightblue/40 to-white px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5 sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <FiAlertTriangle className="h-8 w-8 text-yellow-500" />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Oops! Something isn&apos;t right
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          We ran into an unexpected problem while loading this page. This is on
          us, not you. Please try again in a moment, and if it keeps happening,
          kindly reach out to your{" "}
          <span className="font-semibold text-gray-700">admin</span> or the{" "}
          <span className="font-semibold text-gray-700">technology team</span>{" "}
          for help.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => (reset ? reset() : window.location.reload())}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <FiRefreshCw className="h-4 w-4" />
            Try again
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FiHome className="h-4 w-4" />
            Go home
          </button>
        </div>
      </div>
    </main>
  );
};

export default AppError;
