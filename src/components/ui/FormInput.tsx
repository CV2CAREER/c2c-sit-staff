"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { useFormField } from "@/components/ui/form";

interface FormInputProps extends React.ComponentPropsWithoutRef<typeof Input> {
  label?: string;
  error?: string;
}

const FormInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  FormInputProps
>(({ label, error, ...props }, ref) => {
  const { name } = useFormField();
  const inputId = React.useId();

  return (
    <div className="space-y-2">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      ) : null}
      <Input ref={ref} id={inputId} name={name} {...props} />
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
});
FormInput.displayName = "FormInput";

export { FormInput };
