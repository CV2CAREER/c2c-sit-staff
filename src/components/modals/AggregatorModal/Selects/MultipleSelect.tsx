'use client';

import Select, { InputActionMeta, MultiValueProps } from 'react-select';
import Tooltip from '@mui/material/Tooltip';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value?: { value: string; label: string }[];
  defaultValue?: { value: string; label: string }[];
  name: string;
  placeholder: string;
  onInputChange?: (newValue: string, actionMeta: InputActionMeta) => void;
  onChange: (selected: { value: string; label: string }[] | null) => void;
}

// Custom MultiValue component for selected options with tooltip
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CustomMultiValue = (props: MultiValueProps<{ value: string; label: string }>) => {
  const { data, removeProps } = props;

  return (
    <Tooltip title={data.label} arrow>
      <div className="custom-multi-value">
        <span>{data.label}</span>
        <span {...removeProps} style={{ cursor: 'pointer', marginLeft: '4px' }}>
          &times; {/* Close icon for removing selected option */}
        </span>
      </div>
    </Tooltip>
  );
};

const MultiSelect = ({ options, value, defaultValue, name, placeholder, onInputChange, onChange }: MultiSelectProps) => {
  return (
    <Select
      className="w-full"
      value={value}
      defaultValue={defaultValue}
      name={name}
      placeholder={placeholder}
      onChange={(newValue) => onChange(newValue ? [...newValue] : null)}
      options={options}
      onInputChange={onInputChange}
      // components={{ MultiValue: CustomMultiValue }} // Custom MultiValue component
      isMulti
    />
  );
};

export default MultiSelect;
