// components/ui/time-picker.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Input } from "./input"; // Assuming your Input component is here
import { Button } from "./button"; // Assuming your Button component is here
import { cn } from "@/lib/utils"; // Your utility for class names
import { Label } from "./label"; // Your Label component

interface TimePickerProps {
  value?: string; // Time in "HH:mm" or "hh:mm A" format
  onChange: (time: string) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  className?: string; // For the root div
  disabled?: boolean;
  use12HourFormat?: boolean; // New prop to control 12/24 hour format
}

const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      label,
      error = false,
      helperText,
      required = false,
      className,
      disabled = false,
      use12HourFormat = false, // Default to 24-hour format
    },
    ref
  ) => {
    const [hour, setHour] = useState<number>(0);
    const [minute, setMinute] = useState<number>(0);
    const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

    // Parse the incoming value prop
    useEffect(() => {
      if (value) {
        const [hStr, mStr] = value.split(":");
        let h = parseInt(hStr, 10);
        let m = parseInt(mStr, 10);

        if (use12HourFormat && value.includes(" ")) {
          const parts = value.split(" ");
          h = parseInt(parts[0].split(":")[0], 10);
          m = parseInt(parts[0].split(":")[1], 10);
          setAmpm(parts[1] as "AM" | "PM");

          if (parts[1] === "PM" && h !== 12) h += 12;
          if (parts[1] === "AM" && h === 12) h = 0; // Midnight
        }

        setHour(h);
        setMinute(m);
      } else {
        setHour(0);
        setMinute(0);
        setAmpm("AM");
      }
    }, [value, use12HourFormat]);

    // Format and emit the time string
    const emitChange = useCallback(() => {
      let currentHour = hour;
      let currentAmpm = ampm;

      if (use12HourFormat) {
        if (currentHour === 0) {
          // Midnight (00:xx)
          currentHour = 12;
          currentAmpm = "AM";
        } else if (currentHour === 12) {
          // Noon (12:xx)
          currentAmpm = "PM";
        } else if (currentHour > 12) {
          currentHour -= 12;
          currentAmpm = "PM";
        } else {
          currentAmpm = "AM";
        }
      }

      const formattedHour = String(
        use12HourFormat ? currentHour : hour
      ).padStart(2, "0");
      const formattedMinute = String(minute).padStart(2, "0");

      const newTime = use12HourFormat
        ? `${formattedHour}:${formattedMinute} ${currentAmpm}`
        : `${formattedHour}:${formattedMinute}`;

      onChange(newTime);
    }, [hour, minute, ampm, onChange, use12HourFormat]);

    useEffect(() => {
      // Only emit change if value is not null/undefined to prevent initial empty string emission
      // and only if the component is not disabled
      if (value !== undefined && !disabled) {
        emitChange();
      }
    }, [hour, minute, ampm, emitChange, value, disabled]);

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let h = parseInt(e.target.value, 10);
      if (isNaN(h)) h = 0;
      if (h < 0) h = 23;
      if (h > 23) h = 0; // Loop around for 24-hour
      setHour(h);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let m = parseInt(e.target.value, 10);
      if (isNaN(m)) m = 0;
      if (m < 0) m = 59;
      if (m > 59) m = 0; // Loop around
      setMinute(m);
    };

    const toggleAmpm = () => {
      if (disabled) return;
      setAmpm((prev) => (prev === "AM" ? "PM" : "AM"));
    };

    const incrementHour: () => number | void = () => {
      if (disabled) return;
      setHour((prev) => {
        let newHour = prev + 1;
        if (newHour > 23) newHour = 0;
        return newHour;
      });
    };

    const decrementHour = () => {
      if (disabled) return;
      setHour((prev) => {
        let newHour = prev - 1;
        if (newHour < 0) newHour = 23;
        return newHour;
      });
    };

    const incrementMinute = () => {
      if (disabled) return;
      setMinute((prev) => {
        let newMinute = prev + 1;
        if (newMinute > 59) newMinute = 0;
        return newMinute;
      });
    };

    const decrementMinute = () => {
      if (disabled) return;
      setMinute((prev) => {
        let newMinute = prev - 1;
        if (newMinute < 0) newMinute = 59;
        return newMinute;
      });
    };

    const displayHour = use12HourFormat
      ? hour === 0
        ? 12
        : hour > 12
          ? hour - 12
          : hour
      : hour;

    return (
      <div className={cn("grid gap-2", className)} ref={ref}>
        {label && (
          <Label htmlFor={`time-picker-${label?.replace(/\s/g, "-") || "id"}`}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="flex items-center space-x-2">
          {/* Hour Input with controls */}
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="sm"
              type="button" // Prevent form submission
              onClick={incrementHour}
              disabled={disabled}
              className="h-6 w-8 p-0"
            >
              ▲
            </Button>
            <Input
              id={`time-picker-hour-${label?.replace(/\s/g, "-") || "id"}`}
              type="number"
              value={String(displayHour).padStart(2, "0")}
              onChange={handleHourChange}
              onBlur={emitChange} // Emit change on blur to ensure format is applied
              className={cn(
                "w-16 text-center",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              min={use12HourFormat ? 1 : 0}
              max={use12HourFormat ? 12 : 23}
              disabled={disabled}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button" // Prevent form submission
              onClick={decrementHour}
              disabled={disabled}
              className="h-6 w-8 p-0"
            >
              ▼
            </Button>
          </div>

          <span className="text-2xl font-bold">:</span>

          {/* Minute Input with controls */}
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              size="sm"
              type="button" // Prevent form submission
              onClick={incrementMinute}
              disabled={disabled}
              className="h-6 w-8 p-0"
            >
              ▲
            </Button>
            <Input
              id={`time-picker-minute-${label?.replace(/\s/g, "-") || "id"}`}
              type="number"
              value={String(minute).padStart(2, "0")}
              onChange={handleMinuteChange}
              onBlur={emitChange} // Emit change on blur
              className={cn(
                "w-16 text-center",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              min={0}
              max={59}
              disabled={disabled}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={decrementMinute}
              disabled={disabled}
              className="h-6 w-8 p-0"
            >
              ▼
            </Button>
          </div>

          {use12HourFormat && (
            <Button
              variant="outline"
              type="button"
              onClick={toggleAmpm}
              disabled={disabled}
              className="ml-2 w-16"
            >
              {ampm}
            </Button>
          )}
        </div>
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

TimePicker.displayName = "TimePicker";

export { TimePicker };
