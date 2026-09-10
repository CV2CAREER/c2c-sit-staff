"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HintItem {
  label: string;
  description: string;
}

interface PageHintProps {
  title: string;
  items: HintItem[];
}

// A small "what does everything on this screen do" glossary, surfaced via a
// single (i) trigger so the explanation doesn't have to live as permanent
// on-screen clutter.
const PageHint = ({ title, items }: PageHintProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="What's on this page"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary transition-colors hover:bg-primary/10"
        >
          <Info size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-80 overflow-y-auto">
        <p className="mb-2 text-sm font-semibold text-gray-900">{title}</p>
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.label} className="text-xs leading-relaxed text-gray-600">
              <span className="font-medium text-gray-800">{item.label}: </span>
              {item.description}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default PageHint;
