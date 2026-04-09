/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/UpdateForm.tsx
"use client";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form"; // Import useForm and FormProvider
import { z } from "zod"; // For schema validation
import { zodResolver } from "@hookform/resolvers/zod"; // Resolver for zod with react-hook-form

// Import Shadcn Form components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // Assuming these are in components/ui/form

import { UpdateFormProps, Owner, ImpactedPersona, BaseOption } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roles = [
  "Developer",
  "C&S",
  "Operations Manager",
  "Technology Analyst",
  "Tech lead",
  "Project Owner",
];

// Define Zod schemas for validation
const ownerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  slackId: z.string().min(1, "Slack ID is required"),
  role: z.string().min(1, "Role is required").nullable(), // Role can be null initially
});

const impactedPersonaSchema = z.object({
  label: z.string().min(1, "Label is required"),
});

const defaultSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const UpdateForm: React.FC<UpdateFormProps> = ({
  onClose,
  onSuccess,
  items,
  itemType,
  itemLabelField = "name",
}) => {
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Determine the schema based on itemType
  const getSchema = () => {
    switch (itemType) {
      case "owner":
        return ownerSchema;
      case "impacted-persona":
        return impactedPersonaSchema;
      default:
        return defaultSchema;
    }
  };

  const form = useForm<
    z.infer<
      typeof ownerSchema | typeof impactedPersonaSchema | typeof defaultSchema
    >
  >({
    // @ts-ignore
    resolver: zodResolver(getSchema()),
    defaultValues: {}, // Will be set in useEffect
  });

  // Effect to reset form and populate fields when selectedId or itemType changes
  useEffect(() => {
    if (selectedId && items) {
      const selectedItem = items.find((item) => item._id === selectedId);
      if (selectedItem) {
        switch (itemType) {
          case "owner":
            const ownerItem = selectedItem as Owner;
            form.reset({
              name: ownerItem.name || "",
              email: ownerItem.email || "",
              slackId: ownerItem.slackId || "",
              role: ownerItem.role || null,
            });
            break;
          case "impacted-persona":
            const personaItem = selectedItem as ImpactedPersona;
            form.reset({ label: personaItem.label || "" });
            break;
          default:
            const baseItem = selectedItem as BaseOption;
            form.reset({ name: baseItem.name || "" });
        }
      }
    } else {
      form.reset({}); // Clear form data if no item is selected
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, items, itemType, form.reset]);

  const handleItemSelect = (value: string) => {
    setSelectedId(value);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    setIsLoading(true);

    if (!selectedId) {
      toast.error(`Please select a ${itemType.replace(/-/g, " ")} to update.`);
      setIsLoading(false);
      return;
    }

    try {
      await axiosInstance.put(
        `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=${itemType}&id=${selectedId}`,
        values
      );
      toast.success(`${itemType.replace(/-/g, " ")} updated successfully`);
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch {
      toast.error(`Failed to update ${itemType.replace(/-/g, " ")}`);
      setIsLoading(false);
    }
  };

  const renderFormFields = () => {
    if (!selectedId) return null;
    switch (itemType) {
      case "owner":
        return (
          <>
            <FormField
              // @ts-ignore
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      spellCheck={true}
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007ab3] focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-ignore
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      spellCheck={true}
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007ab3] focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-ignore
              control={form.contol}
              name="slackId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Slack ID<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      spellCheck={true}
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007ab3] focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              // @ts-ignore
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Role<span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => form.setValue("role", value)} // Use setValue for AntSelect(value)} // Use onSelect for AntSelect
                      value={field.value || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r: string, i) => (
                          <SelectItem key={i} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case "impacted-persona":
        return (
          <FormField
            // @ts-ignore
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Label<span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <input
                    spellCheck={true}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007ab3] focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return (
          <FormField
            // @ts-ignore
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name<span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <input
                    spellCheck={true}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007ab3] focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl">
      <h2 className="text-2xl font-bold mb-4">
        Update{" "}
        {itemType
          .replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")}
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label
              htmlFor={itemType}
              className="block text-sm font-medium text-gray-700"
            >
              Select {itemType.replace(/-/g, " ")}
            </label>
            <Select value={selectedId} onValueChange={handleItemSelect}>
              <SelectTrigger className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007ab3] focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2">
                <SelectValue
                  placeholder={`Select an ${itemType.replace(/-/g, " ")}`}
                />
              </SelectTrigger>
              <SelectContent className="overflow-hidden bg-white rounded-md shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
                {items.map((item: any) => (
                  <SelectItem
                    key={item._id}
                    value={item._id}
                    className="text-sm leading-none data-[state=checked]:bg-career-blue-200 flex items-center h-[30px] pr-[35px] pl-[25px] py-6 relative select-none data-[highlighted]:outline-none data-[highlighted]:bg-blue-gray-50 data-[highlighted]:text-violet1"
                  >
                    {item[itemLabelField as keyof typeof item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderFormFields()}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedId}
              className={`px-4 py-2 text-sm font-medium text-white font-sharp-grotesk bg-[#007ab3] rounded-md ${isLoading || !selectedId ? "opacity-50 cursor-not-allowed" : "hover:bg-[#007ab3]"} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isLoading
                ? "Updating..."
                : `Update ${itemType
                    .replace(/-/g, " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}`}
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default UpdateForm;
