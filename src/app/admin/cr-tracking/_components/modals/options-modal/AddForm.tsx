/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/AddForm.tsx
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

import { AddFormProps } from "./types";
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

const AddForm: React.FC<AddFormProps> = ({
  onClose,
  onSuccess,
  itemType,
  itemLabelField = "name",
}) => {
  const [existingItems, setExistingItems] = useState<any[]>([]);
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

  // Effect to reset form and fetch existing items when itemType changes
  useEffect(() => {
    fetchExistingItems();
    // Set default values for react-hook-form
    switch (itemType) {
      case "owner":
        form.reset({ name: "", email: "", slackId: "", role: null });
        break;
      case "impacted-persona":
        form.reset({ label: "" });
        break;
      default:
        form.reset({ name: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType, form.reset]); // Depend on form.reset to ensure it's stable

  const fetchExistingItems = async () => {
    try {
      const response = await axiosInstance.get(
        `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=${itemType}`
      );
      setExistingItems(response.data.data);
    } catch {
      toast.error(`Failed to fetch existing ${itemType.replace(/-/g, " ")}`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      await axiosInstance.post(
        `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=${itemType}`,
        values
      );
      toast.success(`${itemType.replace(/-/g, " ")} added successfully`);
      setIsLoading(false);
      onSuccess();
      fetchExistingItems();
      form.reset();
    } catch{
      toast.error(`Failed to add ${itemType.replace(/-/g, " ")}`);
      setIsLoading(false);
    }
  };

  const renderFormFields = () => {
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
              control={form.control}
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
                      onValueChange={(value) => form.setValue("role", value)} // Use setValue for react-hook-form.onChange} // Use onSelect for AntSelect
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
                    placeholder={`Enter new ${itemType.replace(/-/g, " ")} label`}
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
                    className="w-full px-3 py-2 mt-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#007ab3] focus:border-transparent"
                    placeholder={`Enter new ${itemType.replace(/-/g, " ")} name`}
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
    <div className="bg-white p-6 rounded-2xl shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Add{" "}
        {itemType
          .replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")}
      </h2>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Existing{" "}
          {itemType
            .replace(/-/g, " ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")}
        </h3>
        {existingItems.length > 0 ? (
          <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
            {existingItems.map((item, index) => (
              <li
                key={index}
                className="py-2 px-3 bg-white mb-2 rounded shadow-sm hover:bg-gray-100 transition-colors"
              >
                {item[itemLabelField as keyof typeof item]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">
            No {itemType.replace(/-/g, " ")} added yet.
          </p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {renderFormFields()}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white bg-[#007ab3] rounded-md hover:bg-[#005a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007ab3] transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isLoading
                ? "Adding..."
                : `Add ${itemType
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

export default AddForm;
