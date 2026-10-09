"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";

// Single source of truth for control dimensions, shared by every variant.
export const fieldControlClass =
  "flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-foreground";

export const fieldLockedClass =
  "flex h-9 w-full items-center rounded-md border border-input bg-muted pl-3 pr-8 text-sm text-muted-foreground";

interface LockedFieldProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "onChange"
  > {
  label?: React.ReactNode;
  value: string | number | undefined;
  hint?: React.ReactNode;
  className?: string;
  /**
   * Grid column this locked field displays.
   *
   * Deliberately not called `name`: a locked field has no write path, so it must
   * never register with react-hook-form and must never appear in the save
   * payload. This prop exists purely so scripts/check-modal-bindings.mjs can
   * verify the grid column is represented in the modal without reading it as a
   * writable binding.
   */
  field?: string;
}

const LockedField = React.forwardRef<HTMLInputElement, LockedFieldProps>(
  ({ label, value, hint, className, field: _field, ...props }, ref) => (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium leading-none">{label}</label>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          value={value ?? ""}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          onClick={(e) => e.preventDefault()}
          className={cn(fieldLockedClass, "cursor-not-allowed select-none")}
        />
        <Lock
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
);
LockedField.displayName = "LockedField";

const FieldLegend = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground",
      className
    )}
  >
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 rounded-[3px] border border-input bg-muted"
    />
    System-set, not editable
  </div>
);
FieldLegend.displayName = "FieldLegend";

interface FieldSwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange?: (value: boolean) => void;
  disabled?: boolean;
}

const FieldSwitch = React.forwardRef<HTMLDivElement, FieldSwitchProps>(
  ({ label, checked, onCheckedChange, disabled }, ref) => (
    <div
      ref={ref}
      className={cn(
        fieldControlClass,
        "justify-between",
        disabled && "bg-muted text-muted-foreground"
      )}
    >
      <span className="text-sm font-medium">{label}</span>
       <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="focus-visible:ring-primary"
      />
    </div>
  )
);
FieldSwitch.displayName = "FieldSwitch";

// SPR-21-41-013 AC7. A toggle the admin can see but not change. It is never
// registered with react-hook-form, so it cannot reach the payload at all.
// The `field` prop is a display-only marker consumed by
// scripts/check-modal-bindings.mjs; it is deliberately not forwarded.
const LockedSwitch = ({
  field: _field,
  ...props
}: { field?: string } & Omit<FieldSwitchProps, "onCheckedChange">) => (
  <FieldSwitch {...props} disabled />
);
LockedSwitch.displayName = "LockedSwitch";

interface MaskedPasswordProps {
  id?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

const MaskedPassword = React.forwardRef<HTMLDivElement, MaskedPasswordProps>(
  ({ id, name, value, onChange }, ref) => {
    const [revealed, setRevealed] = React.useState(false);

    return (
      <div ref={ref} className="relative">
        <input
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            fieldControlClass,
            "pr-10 focus-within:ring-1 focus-within:ring-primary"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setRevealed((prev) => !prev)}
          aria-label={revealed ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    );
  }
);
MaskedPassword.displayName = "MaskedPassword";

export { FieldLegend, FieldSwitch, LockedField, LockedSwitch, MaskedPassword };