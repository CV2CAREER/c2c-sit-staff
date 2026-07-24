/* eslint-disable */
"use client";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  renderJSX?: React.ReactNode;
  className?: string;
}

const PageHeader = ({
  title,
  description,
  renderJSX,
  className,
}: PageHeaderProps) => {
  const router = useRouter();
  return (
    <section className={cn("bg-white flex justify-between items-center gap-3 w-full p-3 sm:p-5 shadow-md rounded-sm", className)}>
      <div className="flex items-center gap-3">
        <div
          onClick={() => router.back()}
          className="w-fit bg-gray-100 p-1 sm:p-2 rounded-full cursor-pointer"
        >
          <ArrowLeft />
        </div>
        <div className="flex flex-col">
          <h2 className="text-sm md:text-xl font-bold">{title}</h2>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {renderJSX ? renderJSX : null}
    </section>
  );
};

export default PageHeader;
