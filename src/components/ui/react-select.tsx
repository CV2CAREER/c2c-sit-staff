/* eslint-disable */
import React from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { OptionType } from "@/types";
// import Select, { SingleValue } from 'react-select';  // @TODO: solve lint issues


interface SearchSelectProps {
  name: string;
  placeholder: string;
  className?: string;
  options: OptionType[];
  onChange: any; // @TODO: solve lint issues
  onBlur?: any; // @TODO: solve lint issues
  value: any;
  // Lets the user type a value that is not in `options` ("Use "…"").
  creatable?: boolean;
  // Shows an × so the value can be cleared (onChange receives null).
  isClearable?: boolean;
}

// Matches the shadcn <Select> (components/ui/select.tsx), e.g. the Persona
// dropdown in the Users edit modal, and the 36px <Input> height.
const customStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    borderColor: "hsl(var(--input))",
    borderRadius: "6px",
    backgroundColor: "transparent",
    fontSize: "14px",
    boxShadow: state.isFocused
      ? "0 0 0 1px hsl(var(--primary))"
      : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": { borderColor: "hsl(var(--input))" },
  }),
  valueContainer: (base: any) => ({
    ...base,
    height: "34px",
    padding: "0 12px",
  }),
  input: (base: any) => ({ ...base, margin: 0, padding: 0 }),
  placeholder: (base: any) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    margin: 0,
  }),
  singleValue: (base: any) => ({ ...base, color: "inherit", margin: 0 }),
  indicatorSeparator: () => ({ display: "none" }),
  indicatorsContainer: (base: any) => ({ ...base, height: "34px" }),
  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "0 12px 0 0",
    color: "currentColor",
    opacity: 0.5,
    "& svg": { width: 16, height: 16 },
  }),
  clearIndicator: (base: any) => ({ ...base, padding: "0 4px" }),
  menu: (base: any) => ({
    ...base,
    zIndex: 50,
    marginTop: "4px",
    borderRadius: "6px",
    border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--popover))",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    overflow: "hidden",
  }),
  menuList: (base: any) => ({ ...base, padding: "4px" }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "14px",
    padding: "6px 32px 6px 8px",
    borderRadius: "4px",
    cursor: "default",
    position: "relative",
    color: "hsl(var(--popover-foreground))",
    backgroundColor: state.isFocused ? "hsl(var(--accent))" : "transparent",
    "&:active": { backgroundColor: "hsl(var(--accent))" },
    // Check mark on the selected item instead of a blue fill
    "&::after": state.isSelected
      ? { content: '"\\2713"', position: "absolute", right: "8px", fontSize: "13px" }
      : {},
  }),
};

const SearchSelect: React.FC<SearchSelectProps> = ({
  name,
  placeholder,
  className,
  options,
  onChange,
  onBlur,
  value,
  creatable = false,
  isClearable = false,
}) => {
  const SelectComponent: any = creatable ? CreatableSelect : Select;
  return (
    <div className={className}>
      <SelectComponent
        name={name}
        options={options}
        placeholder={placeholder}
        styles={customStyles}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
        isClearable={isClearable}
        {...(creatable ? { formatCreateLabel: (input: string) => `Use "${input}"` } : {})}
      />
    </div>
  );
};

export default SearchSelect;
