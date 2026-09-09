"use client";

import { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HintMarkProps {
  text: string;
  className?: string;
}

// Small inline "!" badge that pops a one-line explanation of the label,
// button, or table column it sits next to. Rendered as a span (not a
// button) so it stays valid to nest inside things that are already
// buttons — tab triggers, action buttons, DataGrid column headers — and
// every handler stops propagation so clicking it never also triggers
// whatever it's attached to (a row click, a tab switch, a column sort).
const HintMark = ({ text, className = "" }: HintMarkProps) => {
  const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="What does this mean?"
          onClick={stop}
          onKeyDown={(e) => {
            stop(e);
            if (e.key === "Enter" || e.key === " ") e.preventDefault();
          }}
          className={cn(
            "inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold leading-none text-primary transition-colors hover:bg-primary/25",
            className,
          )}
        >
          !
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onClick={stop}
        className="w-64 text-xs leading-relaxed text-gray-600"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
};

// Helper for MUI DataGrid `renderHeader` — puts the same "!" hint next to a
// column's header text so table columns get the same affordance as labels
// and buttons elsewhere on the page.
export const columnHeaderHint = (headerName: string, hint: string): ReactNode => (
  <span className="flex items-center gap-1">
    {headerName}
    <HintMark text={hint} />
  </span>
);

export default HintMark;
