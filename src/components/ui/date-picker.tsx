import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Label } from "./label";

// Define props for your custom Shadcn DatePicker
interface ShadcnDatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  placeholder?: string;

  // CHANGED: Use fromDate and toDate instead of fromYear and toYear
  fromDate?: Date; // Accepts a Date object for the earliest selectable date
  toDate?: Date; // Accepts a Date object for the latest selectable date

  disableDates?: Parameters<typeof Calendar>[0]["disabled"];
  [key: string]: any;
}

const ShadcnDatePicker = React.forwardRef<
  HTMLButtonElement,
  ShadcnDatePickerProps
>(
  (
    {
      label,
      value,
      onChange,
      error = false,
      helperText,
      required = false,
      className,
      buttonClassName,
      disabled = false,
      placeholder = "Pick a date",
      // CHANGED: Destructure fromDate and toDate
      fromDate,
      toDate,
      disableDates,
      ...calendarProps
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);

    const id = `date-picker-${label?.replace(/\s/g, "-") || "id"}-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={cn("grid gap-2", className)}>
        {label && (
          <Label htmlFor={id}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Popover open={open} onOpenChange={setOpen} modal>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal rounded-md",
                !value && "text-muted-foreground",
                error && "border-destructive focus-visible:ring-destructive",
                buttonClassName
              )}
              id={id}
              ref={ref}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP") : <span>{placeholder}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date:any) => {
                onChange(date);
                setOpen(false);
              }}
              // CHANGED: Pass fromDate and toDate to Calendar
              fromDate={fromDate}
              toDate={toDate}
              disabled={disableDates}
              {...calendarProps}
            />
          </PopoverContent>
        </Popover>
        {helperText && (
          <p
            className={cn(
              "text-sm mt-1",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ShadcnDatePicker.displayName = "ShadcnDatePicker";

export default ShadcnDatePicker;
