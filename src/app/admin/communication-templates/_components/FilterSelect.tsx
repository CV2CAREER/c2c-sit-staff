import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import type { EmailTemplateType } from "@/hooks/useCommunicationTemplates";

interface FilterSelectProps {
  value: EmailTemplateType | "";
  setValue: Dispatch<SetStateAction<EmailTemplateType | "">>;
}

function FilterSelect({ value, setValue }: FilterSelectProps) {
  const handleChange = (event: SelectChangeEvent<string>) => {
    setValue(event.target.value as EmailTemplateType | "");
  };

  return (
    <FormControl>
      <Select
        value={value}
        onChange={handleChange}
        className="h-8"
        displayEmpty
        renderValue={() => (value ? (value === "admin" ? "Admin" : "Customer") : "Filter By Type")}
      >
        <MenuItem value="">All types</MenuItem>
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="customer">Customer</MenuItem>
      </Select>
    </FormControl>
  );
}

export default FilterSelect;
