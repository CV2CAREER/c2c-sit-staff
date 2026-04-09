import { Dispatch, SetStateAction } from "react";
import Select from "react-select";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import ShadcnDatePicker from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { FaSpinner } from "react-icons/fa6";
import {
  useCRTrackingQueries,
  useCRTrackingMutations,
} from "@/hooks/api/admin/cr-tracking";

// --- Type Definitions ---
interface ICRs {
  _id: string;
  id: string;
  description: string;
}

interface ICRTrackingOwner {
  _id: string;
  name: string;
  email: string;
  slackId: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// --- Zod Schema Definition ---
const timeRegex =
  /^(?:[01]\d|2[0-3]):[0-5]\d$|^(?:0?\d|1[0-2]):[0-5]\d (?:AM|PM)$/;

const EOTRequestSchema = z
  .object({
    CR: z.string().min(1, "CR is required"),
    developer: z.string().min(1, "Developer is required"),
    numberOfHours: z
      .string()
      .min(1, "Number of hours is required")
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Must be a positive number",
      }),
    durationStartDate: z.date({
      message: "Start date is required",
    }),
    durationStartTime: z
      .string()
      .min(1, "Start time is required")
      .regex(timeRegex, "Invalid time format (HH:mm or hh:mm AM/PM)"),
    durationEndDate: z.date({
      message: "End date is required",
    }),
    durationEndTime: z
      .string()
      .min(1, "End time is required")
      .regex(timeRegex, "Invalid time format (HH:mm or hh:mm AM/PM)"),
    NIL: z.string().min(1, "NIL is required"),
    note: z.string().optional(),
  })
  .refine(
    (data) => {
      const parseTimeString = (date: Date, timeStr: string) => {
        if (!timeStr) return null;
        if (timeStr.includes("AM") || timeStr.includes("PM")) {
          return dayjs(
            `${dayjs(date).format("YYYY-MM-DD")} ${timeStr}`,
            "YYYY-MM-DD hh:mm A"
          );
        } else {
          return dayjs(
            `${dayjs(date).format("YYYY-MM-DD")} ${timeStr}`,
            "YYYY-MM-DD HH:mm"
          );
        }
      };

      const startDateTime = parseTimeString(
        data.durationStartDate,
        data.durationStartTime
      );
      const endDateTime = parseTimeString(
        data.durationEndDate,
        data.durationEndTime
      );

      if (
        !startDateTime ||
        !endDateTime ||
        !startDateTime.isValid() ||
        !endDateTime.isValid()
      ) {
        return false;
      }

      return endDateTime.isAfter(startDateTime);
    },
    {
      message: "End date and time must be after start date and time",
      path: ["durationEndDate"],
    }
  );

type EOTRequestFormData = z.infer<typeof EOTRequestSchema>;

export default function EOTRequestModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EOTRequestFormData>({
    resolver: zodResolver(EOTRequestSchema),
    defaultValues: {
      CR: "",
      developer: "",
      numberOfHours: "",
      durationStartDate: undefined,
      durationStartTime: "",
      durationEndDate: undefined,
      durationEndTime: "",
      NIL: "",
      note: "",
    },
  });

  const durationStartDate = useWatch({ control, name: "durationStartDate" });

  // ── Domain Hooks ──
  const { eotCRsDomain, eotOwnersDomain } = useCRTrackingQueries({
    fetchEOTCRs: isOpen,
    fetchEOTOwners: isOpen,
  });

  const { createEOTMutation } = useCRTrackingMutations();

  const CRs = eotCRsDomain.data as ICRs[] | undefined;
  const isCRsLoading = eotCRsDomain.isLoading;
  const owners = eotOwnersDomain.data as ICRTrackingOwner[] | undefined;
  const isOwnersLoading = eotOwnersDomain.isLoading;

  const onSubmit = async (data: EOTRequestFormData) => {
    const convertTo24Hour = (timeStr: string) => {
      const [hStr, mStr] = timeStr.split(":");
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr.substring(0, 2), 10);

      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        const ampm = timeStr.includes("PM") ? "PM" : "AM";
        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
      }
      return { h, m };
    };

    const { h: startH, m: startM } = convertTo24Hour(data.durationStartTime);
    const { h: endH, m: endM } = convertTo24Hour(data.durationEndTime);

    const startDateTime = dayjs(data.durationStartDate)
      .set("hour", startH)
      .set("minute", startM)
      .toDate();
    const endDateTime = dayjs(data.durationEndDate)
      .set("hour", endH)
      .set("minute", endM)
      .toDate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedValues: any = {
      ...data,
      duration: {
        start: startDateTime,
        end: endDateTime,
      },
    };
    delete formattedValues.durationStartDate;
    delete formattedValues.durationStartTime;
    delete formattedValues.durationEndDate;
    delete formattedValues.durationEndTime;

    createEOTMutation.mutate(formattedValues, {
      onSuccess: () => {
        setIsOpen(false);
        reset();
      },
      onError: (error: { message?: string }) => {
        toast.error(error?.message || "Failed to create EOT request");
      },
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px] p-8 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl mt-4 mb-2 font-semibold text-center">
            Request Extension of Time
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Fill in the details to request an extension of time.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label htmlFor="CR">CR</Label>
            <Controller
              name="CR"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  id="CR"
                  isSearchable
                  options={
                    isCRsLoading
                      ? [{ label: "Loading...", value: "", isDisabled: true }]
                      : CRs?.map((cr) => ({
                          label: `${cr.id}: ${cr.description}`,
                          value: cr._id,
                        }))
                  }
                  value={
                    field.value
                      ? isCRsLoading
                        ? { label: "Loading...", value: "", isDisabled: true }
                        : CRs?.map((cr) => ({
                            label: `${cr.id}: ${cr.description}`,
                            value: cr._id,
                          })).find((option) => option.value === field.value)
                      : null
                  }
                  onChange={(option) => field.onChange(option?.value || "")}
                  isClearable
                  classNamePrefix="react-select"
                  className="block w-full text-base text-gray-700 transition duration-150 ease-in-out bg-white rounded-md"
                  isDisabled={isCRsLoading || createEOTMutation.isPending}
                />
              )}
            />
            {errors.CR && (
              <p className="text-red-500 text-sm">{errors.CR.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="developer">Developer</Label>
            <Controller
              name="developer"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  id="developer"
                  isSearchable
                  options={
                    isOwnersLoading
                      ? [{ label: "Loading...", value: "", isDisabled: true }]
                      : owners?.map((owner) => ({
                          label: owner.name,
                          value: owner._id,
                        }))
                  }
                  value={
                    field.value
                      ? isOwnersLoading
                        ? { label: "Loading...", value: "", isDisabled: true }
                        : owners
                            ?.map((owner) => ({
                              label: owner.name,
                              value: owner._id,
                            }))
                            .find((option) => option.value === field.value)
                      : null
                  }
                  onChange={(option) => field.onChange(option?.value || "")}
                  isClearable
                  classNamePrefix="react-select"
                  className="block w-full text-base text-gray-700 transition duration-150 ease-in-out bg-white rounded-md"
                  isDisabled={isOwnersLoading || createEOTMutation.isPending}
                />
              )}
            />
            {errors.developer && (
              <p className="text-red-500 text-sm">{errors.developer.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numberOfHours">Number of Hours</Label>
            <Input
              id="numberOfHours"
              type="number"
              {...register("numberOfHours")}
              className="block w-full px-3 py-2 text-base text-gray-700 transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={createEOTMutation.isPending}
            />
            {errors.numberOfHours && (
              <p className="text-red-500 text-sm">
                {errors.numberOfHours.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Controller
              name="durationStartDate"
              control={control}
              render={({ field }) => (
                <ShadcnDatePicker
                  label="Start Date"
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.durationStartDate}
                  helperText={errors.durationStartDate?.message}
                  required
                  disabled={field.disabled || createEOTMutation.isPending}
                  fromDate={today}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Controller
              name="durationStartTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  label="Start Time"
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.durationStartTime}
                  helperText={errors.durationStartTime?.message}
                  required
                  disabled={field.disabled || createEOTMutation.isPending}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Controller
              name="durationEndDate"
              control={control}
              render={({ field }) => (
                <ShadcnDatePicker
                  label="End Date"
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.durationEndDate}
                  helperText={errors.durationEndDate?.message}
                  required
                  disabled={field.disabled || createEOTMutation.isPending}
                  fromDate={durationStartDate || today}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Controller
              name="durationEndTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  label="End Time"
                  value={field.value}
                  onChange={field.onChange}
                  error={!!errors.durationEndTime}
                  helperText={errors.durationEndTime?.message}
                  required
                  disabled={field.disabled || createEOTMutation.isPending}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="NIL">NIL</Label>
            <Controller
              name="NIL"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  id="NIL"
                  isSearchable
                  options={
                    isOwnersLoading
                      ? [{ label: "Loading...", value: "", isDisabled: true }]
                      : owners?.map((owner) => ({
                          label: owner.name,
                          value: owner._id,
                        }))
                  }
                  value={
                    field.value
                      ? isOwnersLoading
                        ? { label: "Loading...", value: "", isDisabled: true }
                        : owners
                            ?.map((owner) => ({
                              label: owner.name,
                              value: owner._id,
                            }))
                            .find((option) => option.value === field.value)
                      : null
                  }
                  onChange={(option) => field.onChange(option?.value || "")}
                  isClearable
                  classNamePrefix="react-select"
                  className="block w-full text-base text-gray-700 transition duration-150 ease-in-out bg-white rounded-md"
                  isDisabled={isOwnersLoading || createEOTMutation.isPending}
                />
              )}
            />
            {errors.NIL && (
              <p className="text-red-500 text-sm">{errors.NIL.message}</p>
            )}
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              {...register("note")}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={createEOTMutation.isPending}
            />
            {errors.note && (
              <p className="text-red-500 text-sm">{errors.note.message}</p>
            )}
          </div>

          <DialogFooter className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createEOTMutation.isPending}
              className="bg-blue hover:bg-blue text-white"
            >
              Request EOT & Notify{" "}
              {(isSubmitting || createEOTMutation.isPending) && (
                <FaSpinner className="ml-2 animate-spin" />
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
