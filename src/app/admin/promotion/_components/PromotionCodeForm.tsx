"use client";

import { FormInput } from "@/components/ui/FormInput";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FiLoader } from "react-icons/fi";
import { DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const promotionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(20, "Too Long!"),
  promotionCode: z
    .string()
    .trim()
    .min(1, "Promotion Code is required")
    .max(20, "Too Long!"),
  date: z.string().optional(),
});

interface PromotionCodeFormProps {
  onSubmit: (values: z.infer<typeof promotionSchema>) => Promise<void>;
  loading: boolean;
}

const PromotionCodeForm: React.FC<PromotionCodeFormProps> = ({
  onSubmit,
  loading,
}) => {
  const [date, setDate] = useState<string | string[] | null>(null);
  const [dateError, setDateError] = useState<string>("");

  const form = useForm<z.infer<typeof promotionSchema>>({
    resolver: zodResolver(promotionSchema),
  });

  const {
    handleSubmit,
    formState: { errors },
  } = form;

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    setDate(dateString);
  };

  const handleFormSubmit = handleSubmit((data) => {
    if (!date) {
      setDateError("Expfiry date is required");
      return;
    }
    setDateError("");
    onSubmit({ ...data, date: date as string })?.then(() => {
      setDate(null);
      form.reset();
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FormInput
                  label="Name"
                  placeholder="Name Of Promotion"
                  {...field}
                  error={errors.name?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="promotionCode"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FormInput
                  label="Promotion Code"
                  placeholder="Promotion Code"
                  {...field}
                  error={errors.promotionCode?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DatePicker
          className="w-full border-black mt-4 rounded-none p-2.5"
          placeholder="Expiry Date"
          onChange={onChange}
        />
        {dateError && (
          <p className="text-[12px] mt-2 text-red-500">{dateError}</p>
        )}

        <Button className="w-full" size="sm" type="submit" disabled={loading}>
          {loading ? <FiLoader className="animate-spin" /> : "Create Promotion"}
        </Button>
      </form>
    </Form>
  );
};

export default PromotionCodeForm;
