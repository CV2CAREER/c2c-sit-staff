"use client";

import { FormSelect } from "@/components/ui/FormSelect";
import { countries } from "@/data/countries";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {  useForm } from "react-hook-form";
import { z } from "zod";

import { DatePicker, DatePickerProps } from "antd";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/FormInput";
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
  country: z.string().min(1, "Country is required"),
  date: z.string().optional(),
});

interface PromotionCountryFormProps {
  onSubmit: (values: z.infer<typeof promotionSchema>) => Promise<void>;
  loading: boolean;
}

const PromotionCountryForm: React.FC<PromotionCountryFormProps> = ({
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
    reset,
    formState: { errors },
  } = form;

  const onChange: DatePickerProps["onChange"] = (_, dateString) => {
    setDate(dateString);
  };

  const handleFormSubmit = handleSubmit((data) => {
    if (!date) {
      setDateError("Expiry date is required");
      return;
    }
    setDateError("");
    onSubmit({ ...data, date: date as string })?.then(() => {
      setDate(null);
      reset();
    });
  });

  return (
    <div className="bg-white rounded-lg p-4">
      <h1 className="font-medium font-sharp-grotesk text-center text-2xl">
        Add promotion by country
      </h1>

      <div className=" flex justify-center ">
        <div className="pt-8 w-full sm:w-[500px]">
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FormInput
                        spellCheck={true}
                        required
                        label="Name"
                        placeholder="Name Of Promotion"
                        error={errors.name?.message}
                        {...field}
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
                        spellCheck={true}
                        required
                        label="Promotion Code"
                        placeholder="Promotion Code"
                        error={errors.promotionCode?.message}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FormSelect
                        label="Country"
                        className="col-span-full"
                        error={errors.country?.message}
                        options={countries.map((country) => ({
                          label: country.label,
                          value: country.label,
                        }))}
                        name={field.name}
                        value={
                          typeof field.value === "string" ? field.value : undefined
                        }
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <DatePicker
                  className="w-full border-black mt-4 rounded-none p-2.5"
                  placeholder="Expiry Date"
                  onChange={onChange}
                />
                {dateError && (
                  <p className="text-[12px] mt-2 text-red-500">{dateError}</p>
                )}
              </div>

              <Button
                className="w-full"
                size="sm"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Promotion"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default PromotionCountryForm;
