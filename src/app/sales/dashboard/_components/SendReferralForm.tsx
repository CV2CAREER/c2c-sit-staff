"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useReferralMutations } from "@/hooks/api/admin/referral";
import toast from "react-hot-toast";

interface FormValues {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

export default function SendReferralForm({ 
  onSuccess 
}: { 
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const { createReferral } = useReferralMutations();

  const handleFormSubmit = (data: FormValues) => {
    createReferral.mutate(
      data,
      {
        onSuccess: () => {
          toast.success("Referral sent successfully");
          onSuccess();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to send referral");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">First Name *</label>
          <input
            {...register("firstName", { required: "Required" })}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="First Name"
          />
          {errors.firstName && <span className="text-[10px] text-red-500">{errors.firstName.message}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Last Name *</label>
          <input
            {...register("lastName", { required: "Required" })}
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Last Name"
          />
          {errors.lastName && <span className="text-[10px] text-red-500">{errors.lastName.message}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Middle Name</label>
        <input
          {...register("middleName")}
          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Optional"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Phone Number *</label>
        <input
          {...register("phoneNumber", { required: "Required" })}
          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="+61 ..."
        />
        {errors.phoneNumber && <span className="text-[10px] text-red-500">{errors.phoneNumber.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address *</label>
        <input
          {...register("email", { required: "Required" })}
          type="email"
          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="email@example.com"
        />
        {errors.email && <span className="text-[10px] text-red-500">{errors.email.message}</span>}
      </div>

      <button
        type="submit"
        disabled={createReferral.isPending}
        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 mt-4"
      >
        {createReferral.isPending ? "Sending..." : "Send Referral"}
      </button>
    </form>
  );
}
