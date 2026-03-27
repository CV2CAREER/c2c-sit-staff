/* eslint-disable */
"use client";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  renderJSX?: React.ReactNode;
}

const PageHeader = ({
  title,
  renderJSX,
}: PageHeaderProps) => {
  const router = useRouter();
  return (
    <section className="bg-white flex justify-between items-center gap-3 w-full p-3 sm:p-5 shadow-md rounded-sm">
      <div className="flex items-center gap-3">
        <div
          onClick={() => router.back()}
          className="w-fit bg-gray-100 p-1 sm:p-2 rounded-full cursor-pointer"
        >
          <ArrowLeft />
        </div>
        <h2 className="text-sm md:text-xl font-bold">{title}</h2>
      </div>

      {renderJSX ? renderJSX : null}
    </section>
  );
};

export default PageHeader;
