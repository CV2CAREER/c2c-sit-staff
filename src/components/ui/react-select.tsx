/* eslint-disable */
import React from "react";
import Select from "react-select";
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
}

const customStyles = {
  placeholder: (base: any) => ({
    ...base,
    color: "#607D8B", // Tailwind: text-gray-500
    fontSize: "0.875rem", // Tailwind: text-sm
    paddingTop: "0.675rem", // Customize the padding of the input text
    paddingBottom: "0.675rem",
  }),
  control: (base: any) => ({
    ...base,
    borderRadius: "0.375rem", // Tailwind: rounded-md
    borderColor: "#666666", // Tailwind: border-gray-300
  }),
  input: (base: any) => ({
    ...base,
    color: "#455A64", // Tailwind equivalent: text-gray-700
    fontSize: "0.875rem", // Tailwind equivalent: text-sm
    paddingTop: "0.675rem", // Customize the padding of the input text
    paddingBottom: "0.675rem",
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
}) => {
  return (
    <div className={className}>
      <Select
        name={name}
        options={options}
        placeholder={placeholder}
        styles={customStyles}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
      />
    </div>
  );
};

export default SearchSelect;
