// components/DeleteForm.tsx
"use client";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { useState, useEffect } from "react"; // Added useEffect for potential future use or consistency
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

import { DeleteFormProps } from "./types";

// Define Zod schema for the delete form
const deleteSchema = z.object({
  selectedItem: z.string().min(1, "Please select an item to delete."),
});

const DeleteForm: React.FC<DeleteFormProps> = ({
  onClose,
  onSuccess,
  items,
  itemType,
  itemLabelField = "name",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof deleteSchema>>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      selectedItem: "", // Initialize with an empty string
    },
  });

  // Reset the form when items or itemType changes, or when the form is submitted successfully
  useEffect(() => {
    form.reset({ selectedItem: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, itemType, form.reset]);

  const onSubmit = async (values: z.infer<typeof deleteSchema>) => {
    setIsLoading(true);
    try {
      await axiosInstance.delete(
        `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=${itemType}&id=${values.selectedItem}`
      );
      toast.success(`${itemType.replace(/-/g, " ")} deleted successfully`);
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch {
      toast.error(`Failed to delete ${itemType.replace(/-/g, " ")}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl">
      <h2 className="text-2xl font-bold mb-4">
        Delete{" "}
        {itemType
          .replace(/-/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")}
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="selectedItem"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>
                  Select {itemType.replace(/-/g, " ")} to Delete
                </FormLabel>
                <FormControl>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#007ab3] focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
                    {...field} // Binds value and onChange
                  >
                    <option value="">
                      Select an {itemType.replace(/-/g, " ")}
                    </option>
                    {items.map((item: any) => (
                      <option key={item._id} value={item._id}>
                        {item[itemLabelField as keyof typeof item]}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
              disabled={isLoading || !form.formState.isValid} // Disable if loading or form is invalid
              className={`px-4 py-2 text-sm font-medium text-white font-sharp-grotesk bg-[#007ab3] rounded-md ${isLoading || !form.formState.isValid ? "opacity-50 cursor-not-allowed" : "hover:bg-[#007ab3]"} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isLoading
                ? "Deleting..."
                : `Delete ${itemType
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

export default DeleteForm;
