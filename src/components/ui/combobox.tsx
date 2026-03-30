"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OptionType } from "@/types";

interface ComboboxProps {
  list: OptionType[];
  placeholder: string;
  selectedItem: OptionType | any | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<OptionType | any | null>>;
  noItemsMessage?: string;
  btnTriggerStyles?: string;
  loading?: boolean;
  loadingMore?: boolean;
  setLoadingMore?: (shouldLoad: boolean) => void;
}

export function Combobox({
  list,
  placeholder,
  selectedItem,
  setSelectedItem,
  noItemsMessage,
  btnTriggerStyles,
  loading = false,
  loadingMore = false,
  setLoadingMore,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const popoverContentRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!popoverContentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = popoverContentRef.current;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 50;

    if (isNearBottom && !loadingMore && setLoadingMore) {
      setLoadingMore(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={btnTriggerStyles ? btnTriggerStyles : "min-w-[200px] justify-between"}
        >
          {selectedItem
            ? list.find((item) => item.value === selectedItem.value)?.label
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[200px] p-0">
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList ref={popoverContentRef} onScroll={handleScroll}>
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
            ) : (
              <>
                <CommandEmpty>{noItemsMessage || "Nothing found."}</CommandEmpty>
                <CommandGroup>
                  {list?.map((item) => (
                    <CommandItem
                      key={String(item.value)}
                      value={String(item.value)}
                      onSelect={(currentValue: string) => {
                        const newItem = list.find((i) => String(i.value) === currentValue);
                        setSelectedItem(
                          currentValue === selectedItem?.value ? selectedItem?.value : newItem
                        );
                        setOpen(false);
                      }}
                    >
                      {item.label}
                      <Check
                        className={cn(
                          "ml-auto",
                          selectedItem?.value === item.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                  {loadingMore && (
                    <div className="w-full py-2 text-center text-sm text-muted-foreground">
                      Loading more...
                    </div>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
