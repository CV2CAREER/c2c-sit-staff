import React, { useState, useRef } from "react";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { FormControl, Select, SelectChangeEvent } from "@mui/material";
import type { Dispatch, SetStateAction } from "react";

interface Template {
  templateName: string;
}

interface FilterSelectProps {
  templates: Template[];
  setFilter: Dispatch<SetStateAction<{ persona: string; template: string }>>;
}

function FilterSelect({ templates, setFilter }: FilterSelectProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openPopover, setOpenPopover] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [nestedOptions, setNestedOptions] = useState<string[]>([]);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    const newCategory = event.target.value;
    setSelectedCategory(newCategory);

    switch (newCategory) {
      case "template":
        setNestedOptions(templates.map((t) => t.templateName));
        break;
      case "persona":
        setNestedOptions(["admin", "client", "partner", "guest", "coach", "cse", "assistant", "test"]);
        break;
      default:
        setNestedOptions([]);
        break;
    }

    if (newCategory) {
      setAnchorEl(selectRef.current);
      setOpenPopover(true);
    } else {
      setOpenPopover(false);
    }
  };

  const handlePopoverClose = () => {
    setOpenPopover(false);
  };

  const handleNestedItemClick = (nestedOption: string) => {
    if (selectedCategory === "persona") {
      setFilter({ persona: nestedOption, template: "" });
    } else {
      setFilter({ persona: "", template: nestedOption });
    }
    setSelectedCategory("");
    setOpenPopover(false);
  };

  return (
    <FormControl>
      <Select
        labelId="nested-select-label"
        value={selectedCategory}
        onChange={handleCategoryChange}
        className="h-8"
        displayEmpty
        renderValue={() => "Filter By"}
        inputRef={selectRef}
      >
        <MenuItem value="" disabled>
          Filter By
        </MenuItem>
        <MenuItem value="template">Template</MenuItem>
        <MenuItem value="persona">Persona</MenuItem>
      </Select>

      <Popover
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <List>
          {nestedOptions.map((option) => (
            <ListItemButton key={option} onClick={() => handleNestedItemClick(option)}>
              <ListItemText primary={option} />
            </ListItemButton>
          ))}
          {nestedOptions.length === 0 && (
            <ListItemText style={{ padding: 16 }} primary="No options available" />
          )}
        </List>
      </Popover>
    </FormControl>
  );
}

export default FilterSelect;
