import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeRangeSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  styles?: string
}

export function TimeRangeSelector({value, onChange, styles}: TimeRangeSelectorProps) {
  return (
   <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-[180px] shadow-md text-primary-foreground ${styles}`}>
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="last-24-hrs">Last 24hrs</SelectItem>
        <SelectItem value="this-week">This week</SelectItem>
        <SelectItem value="this-month">This month</SelectItem>
      </SelectContent>
    </Select>
  );
}
