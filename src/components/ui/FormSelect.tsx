"use client";

import * as React from "react";
import {
  Select,
  SelectCheckboxItem,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormField } from "@/components/ui/form";

interface FormSelectProps extends React.ComponentPropsWithoutRef<
  typeof Select
> {
  label?: string;
  placeholder?: string;
  options: { label: string; value: string }[];
  error?: string;
  className?: string;
  onChange?: (value: string) => void;
}

const FormSelect = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  FormSelectProps
>(({ label, placeholder, options, error, ...props }, ref) => {
  const { name } = useFormField();
  const inputId = React.useId();
  // @ts-expect-error: FormSelectProps incorrectly assumes 'multiple' exists on Radix Select. This component is being used as a multi-select wrapper.
  const isMulti = props.multiple || false;
  const isControlledValue =
    typeof props.value === "string" && props.value.length > 0;

  const handleValueChange = React.useCallback(
    (value: string) => {
      props.onValueChange?.(value);
      props.onChange?.(value);
    },
    [props],
  );

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
      <Select
        name={props.name || name}
        value={isControlledValue ? props.value : undefined}
        defaultValue={
          !isControlledValue && typeof props.defaultValue === "string"
            ? props.defaultValue
            : undefined
        }
        onValueChange={handleValueChange}
        disabled={props.disabled}
        // @ts-expect-error: Shadcn Select component does not natively support the 'multiple' prop.
        multiple={isMulti}
        className={props.className}
      >
                <SelectTrigger ref={ref} id={inputId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {props.children}
          {options.length > 0 ? (
            <SelectGroup>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {isMulti ? (
                    <>
                      <SelectCheckboxItem value={option.value}>
                        {option.label}
                      </SelectCheckboxItem>
                    </>
                  ) : (
                    option.label
                  )}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
});

FormSelect.displayName = "FormSelect";

export { FormSelect };
