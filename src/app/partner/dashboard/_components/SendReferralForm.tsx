"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { MuiTelInput } from "mui-tel-input";

interface FormValues {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

interface SendReferralFormProps {
  onSubmit: (data: FormValues) => void;
  loading?: boolean;
}

export default function SendReferralForm({ onSubmit, loading }: SendReferralFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <h1 className="text-2xl font-bold mb-4 text-black">Send Referral</h1>

      {/* First Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="firstName" className="text-sm font-medium text-[#1B1B1F]">
          First Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="firstName"
          placeholder="First Name"
          {...register("firstName", { required: "First name is required" })}
          className={`border border-[#ccc] rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#008ED3] ${
            errors.firstName ? "border-red-500" : ""
          }`}
        />
        {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName.message}</span>}
      </div>

      {/* Middle Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="middleName" className="text-sm font-medium text-[#1B1B1F]">
          Middle Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="middleName"
          placeholder="Middle Name"
          {...register("middleName", { required: "middle name is required" })}
          className="border border-[#ccc] rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#008ED3]"
        />
      </div>

      {/* Last Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="lastName" className="text-sm font-medium text-[#1B1B1F]">
          Last Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="lastName"
          placeholder="Last Name"
          {...register("lastName", { required: "Last name is required" })}
          className={`border border-[#ccc] rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#008ED3] ${
            errors.lastName ? "border-red-500" : ""
          }`}
        />
        {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName.message}</span>}
      </div>

      {/* Phone Number */}
      <div className="flex flex-col gap-1">
        <label htmlFor="phoneNumber" className="text-sm font-medium text-[#1B1B1F]">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <MuiTelInput
          id="phoneNumber"
          defaultCountry="AU"
          value={watch("phoneNumber")}
          onChange={(value: string) => setValue("phoneNumber", value, { shouldValidate: true })}
          onBlur={() => trigger("phoneNumber")}
          fullWidth
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              border: "1px solid #ccc",
              borderRadius: "8px",
            },
            "& input": {
              padding: "10.5px 14px",
              fontSize: "14px",
            },
          }}
        />
        {errors.phoneNumber && <span className="text-red-500 text-sm">{errors.phoneNumber.message}</span>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-[#1B1B1F]">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          placeholder="Email"
          {...register("email", { required: "Email is required" })}
          className={`border border-[#ccc] rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#008ED3] ${
            errors.email ? "border-red-500" : ""
          }`}
        />
        {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="bg-[#008ED3] text-white py-2 px-6 rounded-md hover:bg-opacity-90 transition text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Sending..." : "Send Referral"}
      </button>
    </form>
  );
}
