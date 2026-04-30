"use client";

import React, { useMemo, useState } from "react";
import { useCoachQueries, useCoachMutations } from "@/hooks/api/coach";
import { DatePicker, TimePicker } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { Trash2, Plus, Calendar, Clock, Globe, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { timezones } from "./timezones";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeSlot {
  from: string;
  to: string;
}

const WEEKDAYSFULL = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const AvailableHours = () => {
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<TimeSlot[]>([{ from: "", to: "" }]);
  const [timeErrors, setTimeErrors] = useState<string[]>(Array(1).fill(""));
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>("");

  const { schedulesDomain } = useCoachQueries({ fetchSchedules: true });
  const { createSchedule, deleteSchedule } = useCoachMutations();

  const schedules = schedulesDomain.data || [];

  const handleDateChange = (value: any, dateString: string | null) => {
    setDate(dateString || "");
  };

  const handleTimeChange = (slotIndex: number, timeType: keyof TimeSlot) => (value: any, timeString: string | null) => {
    const time = timeString || "";
    const newSlots = [...slots];
    newSlots[slotIndex][timeType] = time;

    // Validate time range for 'to' field
    if (timeType === "to") {
      const fromTime = dayjs(newSlots[slotIndex].from, "HH:mm");
      const toTime = dayjs(time, "HH:mm");
      const diffMinutes = toTime.diff(fromTime, "minute");

      const updatedErrors = [...timeErrors];
      if (diffMinutes < 60) {
        updatedErrors[slotIndex] = "Must be at least 1 hour after 'From'";
      } else {
        updatedErrors[slotIndex] = "";
      }
      setTimeErrors(updatedErrors);
    }
    setSlots(newSlots);
  };

  const addSlot = () => {
    setSlots([...slots, { from: "", to: "" }]);
    setTimeErrors([...timeErrors, ""]);
  };

  const deleteSlot = (index: number) => {
    if (slots.length === 1) return;
    setSlots(slots.filter((_, i) => i !== index));
    setTimeErrors(timeErrors.filter((_, i) => i !== index));
  };

  const handleUploadSchedule = () => {
    if (!date) return toast.error("Please select a date");
    if (!selectedTimeZone) return toast.error("Please select a timezone");
    
    const validSlots = slots.filter((s) => s.from && s.to);
    if (validSlots.length === 0) return toast.error("Add at least one time slot");
    if (timeErrors.some((e) => e !== "")) return toast.error("Fix time errors");

    const payload = {
      date,
      day: WEEKDAYSFULL[new Date(date).getDay()],
      timezone: selectedTimeZone,
      time: validSlots.map((s) => ({ startTime: s.from, endTime: s.to })),
    };

    createSchedule.mutate(payload, {
      onSuccess: () => {
        toast.success("Schedule created");
        setDate("");
        setSlots([{ from: "", to: "" }]);
        setSelectedTimeZone("");
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteSchedule.mutate(id, {
        onSuccess: () => toast.success("Schedule deleted"),
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Creation Form */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              Select Date
            </label>
            <DatePicker 
              className="w-full h-10 rounded-lg border-gray-200" 
              onChange={handleDateChange} 
              value={date ? dayjs(date) : null}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              Time Zone
            </label>
            <Select onValueChange={setSelectedTimeZone} value={selectedTimeZone}>
              <SelectTrigger className="h-10 rounded-lg border-gray-200">
                <SelectValue placeholder="Choose timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            Time Slots
          </label>
          {slots.map((slot, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <TimePicker
                  placeholder="From"
                  format="HH:mm"
                  className="flex-1 h-10 rounded-lg"
                  onChange={handleTimeChange(index, "from")}
                  value={slot.from ? dayjs(slot.from, "HH:mm") : null}
                />
                <TimePicker
                  placeholder="To"
                  format="HH:mm"
                  className="flex-1 h-10 rounded-lg"
                  onChange={handleTimeChange(index, "to")}
                  value={slot.to ? dayjs(slot.to, "HH:mm") : null}
                />
                <button
                  onClick={() => deleteSlot(index)}
                  disabled={slots.length === 1}
                  className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              {timeErrors[index] && (
                <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1 ml-1">
                  <AlertCircle size={12} /> {timeErrors[index]}
                </p>
              )}
            </div>
          ))}
          <button
            onClick={addSlot}
            className="flex items-center gap-2 text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors mt-2"
          >
            <Plus size={16} /> Add More Time
          </button>
        </div>

        <button
          onClick={handleUploadSchedule}
          disabled={createSchedule.isPending || !date || !selectedTimeZone}
          className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createSchedule.isPending ? "Creating..." : "Save Availability"}
        </button>
      </section>

      {/* Existing Schedules */}
      <section>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Active Schedules</h3>
        {schedulesDomain.isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3].map(i => <div key={i} className="min-w-[280px] h-32 bg-gray-100 animate-pulse rounded-xl" />)}
          </div>
        ) : schedules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map((schedule: any) => (
              <div key={schedule._id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                      {schedule.day}
                    </span>
                    <h4 className="font-bold text-gray-900 mt-1">
                      {moment(schedule.date).format("MMM DD, YYYY")}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDelete(schedule._id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="space-y-2 mt-4">
                  {schedule.time.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <Clock size={14} className="text-gray-400" />
                      {t.startTime} - {t.endTime}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-50 text-[11px] text-gray-400 flex items-center gap-1">
                  <Globe size={12} /> {schedule.timezone}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
            <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-lg font-medium">No schedules found</p>
            <p className="text-sm">Set your availability above to let students book sessions.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AvailableHours;
