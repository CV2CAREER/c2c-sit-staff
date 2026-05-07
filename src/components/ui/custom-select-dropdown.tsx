"use client";
import React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OptionType } from "@/types";

interface CustomSelectDropDownProps {
  selected: OptionType | undefined;
  setSelected: React.Dispatch<React.SetStateAction<OptionType | any>>;
  menu: OptionType[];
}

const CustomSelectDropDown = ({selected, setSelected, menu}: CustomSelectDropDownProps) => {
  return (
    <Select
        onValueChange={(value) => {
            const newItem = menu?.find(i => i.value === value);
            setSelected(value === newItem?.value ? newItem : menu[0])
          }}
      >
        <SelectTrigger className="w-[180px] bg-white shadow-md">
          <SelectValue
            placeholder={selected?.label || menu[0].label}
          />
        </SelectTrigger>
        <SelectContent>
          {menu?.map((item, idx) => (
            <SelectItem key={idx} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
    </Select>
  );
}

export default CustomSelectDropDown;