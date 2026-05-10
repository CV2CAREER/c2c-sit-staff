"use client";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SingleValue } from "react-select";
import { OptionType } from "@/types";
import { FiLoader } from "react-icons/fi";
import countryList from "react-select-country-list";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import SearchSelect from "@/components/ui/react-select";
import { EditProfileFormSchema } from "@/utils/validationSchemas";
import {
  useGetPartnerProfile,
  usePartnerProfileUpdate,
} from "@/hooks/usePartnerDashboard";

const EditProfile: React.FC = () => {
  const { profile, isLoading: profileLoading } = useGetPartnerProfile();
  const { mutate: updateProfile, isPending } = usePartnerProfileUpdate();

  const countries = countryList()
    .getData()
    .map((country) => ({ ...country, value: country.label }));

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof EditProfileFormSchema>>({
    resolver: zodResolver(EditProfileFormSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      country: "",
    },
  });

  // Pre-populate form once profile data is fetched
  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName ?? "",
        middleName: profile.middleName ?? "",
        lastName: profile.lastName ?? "",
        phoneNumber: profile.phoneNumber ?? "",
        country: profile.country ?? "",
        password: "",
        confirmPassword: "",
      });
    }
  }, [profile, form]);

  function onSubmit(values: z.infer<typeof EditProfileFormSchema>) {
    updateProfile({
      firstName: values.firstName,
      lastName: values.lastName,
      middleName: values.middleName,
      phoneNumber: values.phoneNumber,
      country: values.country,
      password: values.password || undefined,
    });
  }

  return (
    <Form {...form}>
      <form
        className="bg-white rounded-md shadow-lg p-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
        </div>

        {profileLoading ? (
          <div className="flex items-center justify-center py-10">
            <FiLoader className="h-6 w-6 animate-spin text-[#008ED3]" />
          </div>
        ) : (
          <section className="flex flex-col lg:flex-row *:w-full *:md:w-1/2 gap-3">
            <section className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input className="py-2" placeholder="First Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 *:w-1/2">
                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Middle Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Last Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PhoneInput
                        value={field.value || ""}
                        country={"au"}
                        containerStyle={{ width: "100%", borderRadius: "none", height: "45px" }}
                        inputStyle={{ width: "100%", borderRadius: "none", height: "45px", paddingLeft: "58px" }}
                        buttonStyle={{ borderRadius: "none", backgroundColor: "white", padding: "0 8px" }}
                        dropdownStyle={{ borderRadius: "none", maxWidth: "252px" }}
                        onChange={(value) => field.onChange(value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-3 justify-between items-center border rounded-md">
                        <Input
                          className="border-none shadow-none rounded-tr-none rounded-br-none"
                          placeholder="New Password (optional)"
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                        <span
                          className="flex items-center pr-3 cursor-pointer"
                          onClick={() => setShowPassword((p) => !p)}
                        >
                          {showPassword ? <Eye /> : <EyeOff />}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-3 justify-between items-center border rounded-md">
                        <Input
                          className="border-none shadow-none rounded-tr-none rounded-br-none"
                          placeholder="Confirm Password"
                          type={showConfirmPassword ? "text" : "password"}
                          {...field}
                        />
                        <span
                          className="flex items-center pr-3 cursor-pointer"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                        >
                          {showConfirmPassword ? <Eye /> : <EyeOff />}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <SearchSelect
                        name="country"
                        placeholder="Country of Residence"
                        className="col-span-full text-[#455A64] border rounded-md shadow-sm p-[-10px]"
                        options={countries}
                        onChange={(e: SingleValue<OptionType>) => {
                          if (e) field.onChange(e.value);
                          return false;
                        }}
                        value={countries.find((c) => c.value === field.value) || null}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>
          </section>
        )}

        <Button className="mt-5" type="submit" disabled={isPending || profileLoading}>
          {isPending ? (
            <FiLoader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default EditProfile;
