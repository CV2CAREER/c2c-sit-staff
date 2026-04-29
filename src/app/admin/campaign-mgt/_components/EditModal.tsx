/* eslint-disable */
import React, { SetStateAction } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "antd"; // Import DatePicker from antd
import moment from "moment"; // Import moment
import SearchSelect from "@/components/ui/react-select";
import { OptionType } from "@/types";
import { SingleValue } from "react-select";
import countryList from "react-select-country-list";
import { CampaignTableColType } from "@/types/admin";
import toast from "react-hot-toast";
import { validateHeaderName } from "http";
import { VACell } from "./AssignVA";

const formSchema = z.object({
  Full_Name: z.string().min(2).max(50).optional().nullable(),
  First_Name: z.string().min(2).max(50).optional().nullable(),
  Middle_Name: z.string().optional().nullable(),
  Last_Name: z.string().min(2).max(50).optional().nullable(),
  Plan: z.string().optional().nullable(),
  ReturnCount: z.number().optional().nullable(),
  Order: z.string().optional().nullable(),
  SeekSubStartDate: z.string().optional().nullable(),
  SeekWeeklyMax: z.number().optional().nullable(),
  SeekSubDurDays: z.number().optional().nullable(),
  GraceDuration: z.number().optional().nullable(),
  Capitalized: z.string().optional().nullable(),
  Country: z.string().optional().nullable(),
  Active: z.boolean().optional().nullable(),
  SeekAnswerPriority: z.boolean().optional().nullable(),
  Seek_Aggregator: z.boolean().optional().nullable(),
  Linkedin_Aggregator: z.boolean().optional().nullable(),
  Jobserve_Aggregator: z.boolean().optional().nullable(),
  EscapeCity_Aggregator: z.boolean().optional().nullable(),
  WorkforceAustralia_Aggregator: z.boolean().optional().nullable(),
  Indeed_Aggregator: z.boolean().optional().nullable(),
  Monster_Aggregator: z.boolean().optional().nullable(),
  Jora_Aggregator: z.boolean().optional().nullable(),
  Adzuna_Aggregator: z.boolean().optional().nullable(),
  CareerOne_Aggregator: z.boolean().optional().nullable(),
  Reed_Aggregator: z.boolean().optional().nullable(),
  Adecco_Aggregator: z.number().optional().nullable(), // Changed to number to match the res data 0 or 1
  CVLibrary_Aggregator: z.boolean().optional().nullable(),
  NHSJobs_Aggregator: z.boolean().optional().nullable(),
  Throttle_Listing: z.boolean().optional().nullable(),
  Throttle_Duration: z.number().optional().nullable(),
  Batch: z.string().nullable(),
  Craft: z.string().nullable(),
  Status: z.string().nullable(),
  Alias_Email: z.string().email().optional().nullable(),
  Alias_Password: z.string().optional().nullable(),
  VaName: z.string().optional().nullable(),
  Assurance: z.string().optional().nullable()
});

type CampaignFormValues = z.infer<typeof formSchema>;

interface EditTableModalProps {
  client: CampaignTableColType;
  setDialog: (
    value: SetStateAction<
     "edit" | "soft-delete" | "restore" | "delete" | "generateAQ" | null
    >
  ) => void;
  editClientAction: () => UseMutationResult<
    ApiSuccess<any>,
    ApiError,
    { clientId: string | number; data: any }
  >;
}

const capitalizedData = [
  {
    value: "HOLD",
    label: "HOLD",
  },
  {
    value: "FLIGHT",
    label: "FLIGHT",
  },
  {
    value: "EMPLOYED",
    label: "EMPLOYED",
  },
];

export const EditCampaignClientModal: React.FC<EditTableModalProps> = ({
  client,
  setDialog,
  editClientAction,
}) => {
  const queryClient = useQueryClient();
  
  const countries = countryList()
    .getData()
    .map((country) => ({ ...country, value: country.label }));

  // Form Definition
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Full_Name: client.Full_Name,
      First_Name: client.First_Name,
      Middle_Name: client.Middle_Name,
      Last_Name: client.Last_Name,
      Plan: client.Plan,
      ReturnCount: Number(client.ReturnCount),
      Order: client.Order,
      SeekSubStartDate: client.SeekSubStartDate,
      Assurance: client.Assurance,
      SeekWeeklyMax: client.SeekWeeklyMax,
      SeekSubDurDays: client.SeekSubDurDays,
      GraceDuration: client.GraceDuration,
      Capitalized: client.Capitalized,
      Country: client.Country,
      Active: client.Active ?? false,
      SeekAnswerPriority: client.SeekAnswerPriority ?? false,
      Seek_Aggregator: client.Seek_Aggregator ?? false,
      Linkedin_Aggregator: client.Linkedin_Aggregator ?? false,
      Jobserve_Aggregator: client.Jobserve_Aggregator ?? false,
      EscapeCity_Aggregator: client.EscapeCity_Aggregator ?? false,
      WorkforceAustralia_Aggregator: client.WorkforceAustralia_Aggregator ?? false,
      Indeed_Aggregator: client.Indeed_Aggregator ?? false,
      Monster_Aggregator: client.Monster_Aggregator ?? false,
      Jora_Aggregator: client.Jora_Aggregator ?? false,
      Adzuna_Aggregator: client.Adzuna_Aggregator ?? false,
      CareerOne_Aggregator: client.CareerOne_Aggregator ?? false,
      Reed_Aggregator: client.Reed_Aggregator ?? false,
      Adecco_Aggregator: client.Adecco_Aggregator ?? 0,
      CVLibrary_Aggregator: client.CVLibrary_Aggregator ?? false,
      NHSJobs_Aggregator: client.NHSJobs_Aggregator ?? false,
      Throttle_Listing: client.Throttle_Listing ?? false,
      Throttle_Duration: client.Throttle_Duration ?? null,
      Batch: client.Batch ?? null,
      Craft: client.Craft ?? null,
      Status: client.Status ?? null,
      Alias_Email: client.Alias_Email ?? null,
      Alias_Password: client.Alias_Password ?? null,
      VaName: client.VaName ?? null
    },
  });

  // Submit handler
  const onSubmit = (values: CampaignFormValues) => {
    // Check if the data from the form is different from the current values
    const updatedData = Object.entries(values).reduce(
  (acc: Partial<z.infer<typeof formSchema>>, [key, value]) => {
    const typedKey = key as keyof z.infer<typeof formSchema>;
    const currentValue = client[typedKey];
    let processedValue: typeof value | undefined = value; 

    if (typeof processedValue === "string") {
      processedValue = processedValue.trim();
    }

    if (processedValue === null) {
        processedValue = undefined;
    }

    if (processedValue !== currentValue && processedValue !== "" && processedValue !== " ") {
      if (processedValue !== undefined || formSchema.shape[typedKey]?.isOptional()) {
         if (typedKey in formSchema.shape) {
            // @ts-ignore
            acc[typedKey] = processedValue as any;
        }
      }
    }

    // Only add to updatedData if the value is different and not empty
    if (value !== currentValue && value !== "" && value !== " ") {
      if (typedKey in formSchema.shape) {
        // Properly handle null values for TypeScript
        const safeValue = value === null ? undefined : value;
        (acc as any)[typedKey] = safeValue;
      }
    }

      return acc;
    },
    {} as Partial<z.infer<typeof formSchema>>
  );

    // If there are no changes, return early
    if (Object.keys(updatedData).length === 0) {
      toast("No changes detected.");
      setDialog(null);
    } else {
      toast.loading("Updating client...");
      
      editClientAction().mutate({
        clientId: client.id,
        data: {
          ...updatedData,
        },
      }, {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Client updated successfully");
          setDialog(null);
          
          // Refresh campaign clients table
          queryClient.invalidateQueries({ queryKey: ["admin-fetch-campaign-clients"] });
        },
        onError: (err) => {
          toast.dismiss();
          toast.error(err.message || "Failed to update client");
        }
      });
    }
  }

  return (
    <DialogContent className="h-[70vh] overflow-auto">
      <DialogHeader>
        <DialogTitle className="text-blue">Edit Client's Info</DialogTitle>
        <DialogDescription>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 text-black"
            >
              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="First_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Itoro" 
                          {...field} 
                          value={field.value ?? ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Middle_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Itoro" 
                          {...field} 
                          value={field.value ?? ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="Last_Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
                          {...field} 
                          value={field.value ?? ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Plan"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="Alias_Email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alias Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Alias Email"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Alias_Password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel> Alias Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Alias Password"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="ReturnCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Count</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Return Count"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Order"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 w-full">
                <FormField
                  control={form.control}
                  name="Assurance"
                  render={({ field }) => (
                    <FormItem className="w-[50%]">
                      <FormLabel>Assurance</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="SeekSubStartDate"
                  render={({ field }) => (
                    <FormItem className="w-[50%]">
                      <FormLabel>Subscription Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          format="DD-MM-YYYY"
                          value={field.value ? moment(field.value, "DD-MM-YYYY") : null}
                          onChange={(dateMoment: moment.Moment | null) => {
                            field.onChange(dateMoment ? dateMoment.format("DD-MM-YYYY") : null);
                          }}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="SeekSubDurDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Duration Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Sub Duration Days"
                          value={field.value as number}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="GraceDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Duration</FormLabel>
                        <FormControl>
                        <Input
                          type="number"
                          placeholder="Grace Duration"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 w-full">
                <FormField
                  control={form.control}
                  name="Capitalized"
                  render={({ field }) => (
                  <FormItem className="">
                    <FormLabel>Capitalized</FormLabel>
                    <FormControl>
                    <SearchSelect
                      name="Capitalized"
                      placeholder="Capitalized"
                      className="col-span-full text-[#455A64] w-full"
                      options={capitalizedData}
                      onChange={(e: SingleValue<OptionType>) => {
                      if (e) {
                        form.setValue("Capitalized", e.value);
                      }
                      return false;
                      }}
                      onBlur={field.onBlur}
                      value={
                      (form.getValues("Capitalized") &&
                        capitalizedData.find(
                        (c) => c.value === form.getValues("Capitalized")
                        )) ||
                      null
                      }
                    />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Country"
                  render={({ field }) => (
                  <FormItem className="w-[50%]">
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                    <SearchSelect
                      name="Country"
                      placeholder="Country of Residence"
                      className="col-span-full text-[#455A64] w-full"
                      options={countries}
                      onChange={(e: SingleValue<OptionType>) => {
                      if (e) {
                        form.setValue("Country", e.value);
                      }
                      return false;
                      }}
                      onBlur={field.onBlur}
                      value={
                      (form.getValues("Country") &&
                        countries.find(
                        (c) => c.value === form.getValues("Country")
                        )) ||
                      null
                      }
                    />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <FormField
                  control={form.control}
                  name="Active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="SeekAnswerPriority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer Priority</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Seek_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Seek Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Reed_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Reed Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Jora_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Jora Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Adzuna_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Adzuna Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="CareerOne_Aggregator"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>CareerOne Aggregator</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value as any}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="Batch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Batch"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Craft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Craft</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Craft"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="">Placement Controller</label>
                <VACell data={client}/>
              </div>
            </form>
          </Form>
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setDialog(null);
          }}
        >
          Cancel
        </Button>
        <Button onClick={() => form.handleSubmit(onSubmit)()}>Update</Button>
      </DialogFooter>
    </DialogContent>
  );
};
