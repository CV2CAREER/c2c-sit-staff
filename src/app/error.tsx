"use client";
import AppError from "@/layout/AppError";

export default function AppErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError reset={reset} />;
}
