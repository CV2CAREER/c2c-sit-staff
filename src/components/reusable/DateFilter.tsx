
import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DatePicker } from "antd";
import { IDateFilter } from "@/types/common";

interface DateFilterProps {
  onFilterDataChange: Dispatch<SetStateAction<IDateFilter>>;
}

const DateFilter: React.FC<DateFilterProps> = ({ onFilterDataChange }) => {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    onFilterDataChange({
      startDate: startDate ? startDate : null,
      endDate: endDate ? endDate : null,
    });
  }, [startDate, endDate, onFilterDataChange]);

  const handleStartDateChange = (_: any, dateString: string | null) => {
    setStartDate(dateString);
  };

  const handleEndDateChange = (_: any, dateString: string | null) => {
    setEndDate(dateString);
  };

  return (
    <>
      <DatePicker
        className="w-[calc(100% - 4px)] sm:w-auto block"
        placeholder="Start Date"
        onChange={handleStartDateChange}
      />
      <DatePicker
        className="w-[calc(100% - 4px)] sm:w-auto block"
        placeholder="End Date"
        onChange={handleEndDateChange}
      />
    </>
  );
};

export default DateFilter;
