import React, { useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import toast from "react-hot-toast";
import AppModal from "./AppModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ShadcnDatePicker from "@/components/ui/date-picker";

interface JobMatchTriggerModalProps {
  visible: boolean;
  onCancel: () => void;
  credId: string;
  onTrigger: (options: any) => void;
}

const JobMatchTriggerModal: React.FC<JobMatchTriggerModalProps> = ({
  visible,
  onCancel,
  credId,
  onTrigger,
}) => {
  const [filterType, setFilterType] = useState<
    "date" | "range" | "first" | "custom"
  >("date");
  const [sampleType, setSampleType] = useState<
    "successful" | "unattended" | "all"
  >("all");
  const [date, setDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [sampleSize, setSampleSize] = useState<number>();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    const payload: any = {
      clientId: credId,
      filterType,
      sampleType,
    };

    try {
      switch (filterType) {
        case "date":
          if (!date) throw new Error("Please select a date");
          payload.date = date;
          break;
        case "range":
          if (!rangeStart || !rangeEnd)
            throw new Error("Please select full range");
          payload.dateRange = [rangeStart, rangeEnd];
          break;
        case "first":
          if (!sampleSize || sampleSize < 1 || sampleSize > 250) {
            throw new Error("Please enter a sample size between 1 and 250");
          }
          payload.sampleSize = sampleSize;
          break;
        case "custom":
          if (!rangeStart || !rangeEnd)
            throw new Error("Please select custom range");
          payload.customRange = [rangeStart, rangeEnd];
          break;
      }

      const response = await axios.post("/api/admin/matchJobs", payload);
      if (response.status >= 200 && response.status < 300) {
        toast.success("Job match submitted for processing");
        onTrigger(payload);
      } else {
        throw new Error(response.data.message || "Failed to trigger job match");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal title="Trigger Job Matches" isOpen={visible} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="w-full"
      >
        <div className="overflow-y-auto pr-[10px] pl-[10px] max-h-[60vh] w-full">
          <div className="space-y-6 mb-8 w-full grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
            {/* Filter Type */}
            <div className="space-y-4 w-full">
              <label
                htmlFor="filterType"
                className="block text-lg font-medium text-gray-700"
              >
                Filter Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as any)}
              >
                <SelectTrigger className="w-full bg-white shadow-md">
                  <SelectValue placeholder="Select Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Specific Date</SelectItem>
                  <SelectItem value="range">Date Range</SelectItem>
                  <SelectItem value="first">First N Jobs</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sample Type */}
            <div className="space-y-4 w-full">
              <label
                htmlFor="sampleType"
                className="block text-lg font-medium text-gray-700"
              >
                Sample Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={sampleType}
                onValueChange={(v) => setSampleType(v as any)}
              >
                <SelectTrigger className="w-full bg-white shadow-md">
                  <SelectValue placeholder="Select Sample Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="unattended">Unattended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            {filterType === "date" && (
              <ShadcnDatePicker
                label="Date"
                value={date ? new Date(date) : undefined}
                onChange={(d: Date | undefined) =>
                  setDate(d ? format(d, "yyyy-MM-dd") : "")
                }
                required
                fromDate={new Date(2000, 0, 1)}
                toDate={new Date()}
                helperText={!date ? "Please pick a date" : ""}
                error={!date}
              />
            )}

            {/* Range / Custom */}
            {(filterType === "range" || filterType === "custom") && (
              <>
                <ShadcnDatePicker
                  label="Start Date"
                  value={rangeStart ? new Date(rangeStart) : undefined}
                  onChange={(d: Date | undefined) =>
                    setRangeStart(d ? format(d, "yyyy-MM-dd") : "")
                  }
                  required
                  fromDate={new Date(2000, 0, 1)}
                  toDate={new Date()}
                  error={!rangeStart}
                />
                <ShadcnDatePicker
                  label="End Date"
                  value={rangeEnd ? new Date(rangeEnd) : undefined}
                  onChange={(d: Date | undefined) =>
                    setRangeEnd(d ? format(d, "yyyy-MM-dd") : "")
                  }
                  required
                  fromDate={
                    rangeStart ? new Date(rangeStart) : new Date(2000, 0, 1)
                  }
                  toDate={new Date()}
                  error={!rangeEnd}
                />
              </>
            )}

            {/* Sample Size */}
            {filterType === "first" && (
              <div className="space-y-4 w-full">
                <label
                  htmlFor="sampleSize"
                  className="block text-lg font-medium text-gray-700"
                >
                  Sample Size (1–250) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={sampleSize}
                  onChange={(e) =>
                    setSampleSize(parseInt(e.target.value) || undefined)
                  }
                  min={1}
                  max={250}
                  className="w-full border border-black rounded px-4 py-2"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-8">
          <Button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className={`px-6 py-2 rounded-lg text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-career-blue-800 hover:bg-career-blue-900"
            }`}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Trigger"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
};

export default JobMatchTriggerModal;
