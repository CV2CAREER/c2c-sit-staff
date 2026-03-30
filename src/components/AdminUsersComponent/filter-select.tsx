"use client";
import * as Select from "@radix-ui/react-select";
import { MdArrowDropDown, MdOutlineCheck } from "react-icons/md";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function FilterSelect(props: {
  options: { label: string; value: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select.Root value={props.value} onValueChange={props.onValueChange}>
      <Select.Trigger className="inline-flex items-center justify-center px-3 text-sm text-career-blue-800 leading-none py-1 border border-career-blue-800 rounded-full gap-2 bg-white !font-medium outline-none">
        <Select.Value placeholder={props.placeholder || "Filter by"} />
        <Select.Icon>
          <MdArrowDropDown className="text-2xl" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="overflow-hidden bg-white rounded-md shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
          <Select.Viewport>
            <Select.Group>
              {props.options.map((option, index) => (
                <Select.Item
                  key={index}
                  value={option.value}
                  className="text-sm leading-none data-[state=checked]:bg-career-blue-200 flex items-center h-[30px] pr-[35px] pl-[25px] py-6 relative select-none data-[highlighted]:outline-none data-[highlighted]:bg-blue-gray-50 data-[highlighted]:text-violet1"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function UpdateSelect(props: {
  options: { label: string; value: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root value={props.value} onValueChange={props.onValueChange}>
      <Select.Trigger
        disabled={props.disabled}
        className="inline-flex items-center  justify-between px-3  text-xs leading-none py-1 !rounded-sm gap-1.5 w-full bg-career-gray-300 !font-medium outline-none"
      >
        <Select.Value placeholder={props.placeholder || "Filter by"} />
        <Select.Icon>
          <MdArrowDropDown className="text-2xl" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="overflow-hidden z-[100] bg-white rounded-md shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
          <Select.Viewport>
            <Select.Group className="flex flex-col gap-4">
              {props.options.map((option, index) => (
                <Select.Item
                  key={index}
                  value={option.value}
                  className="text-sm leading-none data-[state=checked]:bg-career-blue-200 flex items-center h-[25px] pr-[35px] pl-[25px] py-6 relative select-none data-[highlighted]:outline-none data-[highlighted]:bg-blue-gray-50 data-[highlighted]:text-violet1 hover:cursor-pointer hover:text-blue"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function MultipleSelect({
  options,
  values,
  onValueChange,
  label,
}: {
  options: string[];
  values: Set<string>;
  onValueChange: (value: Set<string>) => void;
  label: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex items-center justify-center px-3 text-sm text-career-blue-800 leading-none py-1 border border-career-blue-800 rounded-full gap-2 bg-white !font-medium outline-none">
        {label} <MdArrowDropDown className="text-2xl" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[220px] h-[200px] bg-white overflow-y-scroll rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
          sideOffset={5}
        >
          {options.map((option, index) => (
            <DropdownMenu.CheckboxItem
              key={index}
              className="text-[13px] leading-none text-violet11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-career-gray-200 data-[disabled]:pointer-events-none data-[highlighted]:bg-career-blue-200 data-[highlighted]:text-violet1"
              checked={values.has(option)}
              onCheckedChange={(checked) => {
                const newValues = new Set(values);
                if (checked) {
                  newValues.add(option);
                } else {
                  newValues.delete(option);
                }
                onValueChange(newValues);
              }}
            >
              <DropdownMenu.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
                <MdOutlineCheck />
              </DropdownMenu.ItemIndicator>
              {option}
            </DropdownMenu.CheckboxItem>
          ))}

          <DropdownMenu.Arrow className="fill-white" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
