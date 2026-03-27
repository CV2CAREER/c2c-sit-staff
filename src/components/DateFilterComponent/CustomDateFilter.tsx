import React from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useFilterStore } from "@/store/filterStore";
const CustomDateFilter: React.FC = () => {
  const { startDate, endDate, setStartDate, setEndDate } =
    useFilterStore();

  const handleStartDateChange = (date: dayjs.Dayjs | null) => {
    setStartDate(date ? date.format("YYYY-MM-DD") : "");
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    setEndDate(date ? date.format("YYYY-MM-DD") : "");
  };

  return (
    <div className="w-full sm:w-auto sm:min-w-[200px] flex flex-col sm:flex-row gap-2 sm:gap-4 place-items-center">
      <DatePicker
        className="w-[calc(100% - 4px)] sm:w-auto block"
        placeholder="Start Date"
        value={startDate ? dayjs(startDate) : null}
        onChange={handleStartDateChange}
      />
      <DatePicker
        className="w-[calc(100% - 4px)] sm:w-auto block"
        placeholder="End Date"
        value={endDate ? dayjs(endDate) : null}
        onChange={handleEndDateChange}
      />
    </div>
  );
};

export default CustomDateFilter;
