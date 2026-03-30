'use client';

import { useState, useEffect } from 'react';
import MultiSelect from './MultipleSelect';
import { InputActionMeta } from 'react-select';

interface LocationSelectProps {
  locationOptions: string[];
  name: string;
  placeholder: string;
  editedData?: Record<string, any>;
  handleInputChange: ((field: string, value: string[]) => void) | (() => void);
  column?: { field: string };
}

export const LocationSelect = ({
  locationOptions,
  name,
  placeholder,
  editedData,
  handleInputChange,
  column,
}: LocationSelectProps) => {
  const [filteredOptions, setFilteredOptions] = useState<{ value: string; label: string }[]>([]);

  // Convert location options to { value, label } format
  useEffect(() => {
    const initialOptions = locationOptions.slice(0, 50).map((location) => ({
      value: location,
      label: location,
    }));
    setFilteredOptions(initialOptions);
  }, [locationOptions]);

  const handleSearchChange = (inputValue: string, actionMeta: InputActionMeta) => {
    if (actionMeta.action === 'input-change') {
      const filtered = locationOptions
        .filter((option) => option.toLowerCase().includes(inputValue.toLowerCase()))
        .map((location) => ({
          value: location,
          label: location,
        }));
      setFilteredOptions(filtered);
    }
  };

  const handleChange = (selectedOptions: { value: string; label: string }[] | null) => {
    const values = selectedOptions?.map((option) => option.value) || [];
    if (column) {
      handleInputChange(column.field, values);
    } else {
      // @ts-expect-error: handleInputChange overload mismatch
      handleInputChange(values);
    }
  };

  
  const selectedValues =
  editedData && column && typeof editedData[column.field] === 'string'
    ? editedData[column.field]
        .split(',')
        .map((value: string) => value.trim()) // Split by commas and trim any extra spaces
    : [];

  // Map the selected values to the { value, label } format
  const defaultValues = selectedValues.map((value: any) => ({
    value,
    label: value,
  }));

  // Ensure `editedData[column.field]` is an array and map it to react-select format

  return (
    <MultiSelect
      options={filteredOptions}
      defaultValue={defaultValues} // Pass mapped default values
      name={name}
      placeholder={placeholder}
      onInputChange={handleSearchChange}
      onChange={handleChange}
    />
  );
};


interface ClassificationSelectProps {
  tableConstants: Record<string, any[]>;
  editedData: Record<string, any>;
  column: { field: string };
  handleInputChange: (field: string, value: string[]) => void;
}

export const ClassificationSelect = ({
  tableConstants,
  editedData,
  column,
  handleInputChange,
}: ClassificationSelectProps) => {
  const classificationOptions = [
    ...(tableConstants['Classification_Name']?.map((option) => ({
      value: option.Classification,
      label: option.Classification_Name,
    })) || []),
    ...(tableConstants['Classification']?.map((option) => ({
      value: option,
      label: option,
    })) || []),
  ];


  // Handle comma-separated string from editedData[column.field]
  const selectedValues =
  typeof editedData[column.field] === 'string'
    ? editedData[column.field]
        .split(',')
        .map((value: string) => value.trim()) // Split by commas and trim any extra spaces
    : [];

  // Map the selected values to the { value, label } format
  const defaultValues = selectedValues.map((value: any) => {
    const match = classificationOptions.find((option) => option.value === value);
    return match || { value, label: value };
  });


  const handleChange = (selectedOptions: { value: string; label: string }[] | null) => {
    const values = selectedOptions?.map((option) => option.value) || [];
    handleInputChange(column.field, values);
  };



  return (
    <MultiSelect
      options={classificationOptions}
      defaultValue={defaultValues} // Pass mapped default values
      name="classification"
      placeholder="Select Classification"
      onChange={handleChange}
    />
  );
};



