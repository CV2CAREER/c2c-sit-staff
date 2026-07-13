"use client";
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Plus, X, Eye, EyeOff } from "lucide-react";
import AppModal from "@/components/modals/AppModal";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import toast from "react-hot-toast";

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  guest:      { label: "Guest",      color: "bg-slate-100 text-slate-700 border-slate-300" },
  client:     { label: "Client",     color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  partner:    { label: "Partner",    color: "bg-purple-50 text-purple-700 border-purple-300" },
  sales:      { label: "Sales",      color: "bg-orange-50 text-orange-700 border-orange-300" },
  cse:        { label: "CSE",        color: "bg-teal-50 text-teal-700 border-teal-300" },
  coach:      { label: "Coach",      color: "bg-indigo-50 text-indigo-700 border-indigo-300" },
  admin:      { label: "Admin",      color: "bg-red-50 text-red-700 border-red-300" },
  probono:    { label: "Pro Bono",   color: "bg-pink-50 text-pink-700 border-pink-300" },
  test:       { label: "Test",       color: "bg-gray-100 text-gray-500 border-gray-300" },
  customer:   { label: "Customer",   color: "bg-green-50 text-green-700 border-green-300" },
  technology: { label: "Technology", color: "bg-cyan-50 text-cyan-700 border-cyan-300" },
  business:   { label: "Business",   color: "bg-amber-50 text-amber-700 border-amber-300" },
  assistant:  { label: "Placement Controller",  color: "bg-violet-50 text-violet-700 border-violet-300" },
};

const GENDERS = [
  { value: "Male",               icon: "♂" },
  { value: "Female",             icon: "♀" },
  { value: "Prefer Not to Say",  icon: "–" },
];

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  gender: string;
  phoneNumber: string;
  whatsappNumber: string;
  country: string;
  currentCityOfResidence: string;
  role: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  gender: "",
  phoneNumber: "",
  whatsappNumber: "",
  country: "",
  currentCityOfResidence: "",
  role: "guest",
  password: "",
  confirmPassword: "",
};

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const AddUserBtn = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<FormData, "confirmPassword">) => {
      const response = await axiosInstance.post(endpoints.ADMIN_USERS, {
        users: [
          {
            firstName: data.firstName,
            middleName: data.middleName || undefined,
            lastName: data.lastName,
            email: data.email,
            gender: data.gender || undefined,
            phoneNumber: data.phoneNumber || undefined,
            whatsappNumber: data.whatsappNumber || undefined,
            country: data.country || undefined,
            currentCityOfResidence: data.currentCityOfResidence || undefined,
            role: data.role,
            password: data.password || undefined,
          },
        ],
      });
      return response.data;
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await axiosInstance.post(endpoints.ADMIN_SEND_USER_OTP(userId));
      return response.data;
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ userId, otp }: { userId: string; otp: string }) => {
      const response = await axiosInstance.post(endpoints.ADMIN_VERIFY_USER_OTP(userId), { otp });
      return response.data;
    },
  });

  const resetAndClose = () => {
    setOpen(false);
    setStep(1);
    setForm(EMPTY_FORM);
    setErrors({});
    setCreatedUserId(null);
    setOtp("");
    setOtpError("");
  };

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Valid email is required";
    if (form.password && form.password.length < 8)
      errs.password = "Password must be at least 8 characters";
    if (form.password && form.password !== form.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1Submit = async () => {
    if (!validate()) return;
    const toastId = toast.loading("Creating user...");
    try {
      const result = await createUserMutation.mutateAsync({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        email: form.email,
        gender: form.gender,
        phoneNumber: form.phoneNumber,
        whatsappNumber: form.whatsappNumber,
        country: form.country,
        currentCityOfResidence: form.currentCityOfResidence,
        role: form.role,
        password: form.password,
      });
      const userId = result?.data?.created?.[0]?.userId;
      if (!userId) throw new Error("User created but ID not returned");
      setCreatedUserId(userId);
      toast.success("User created successfully", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create user", {
        id: toastId,
      });
    }
  };

  const handleSendOtp = async (userId: string) => {
    const toastId = toast.loading("Sending OTP...");
    try {
      await sendOtpMutation.mutateAsync(userId);
      toast.success("OTP sent to email", { id: toastId });
      setStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to send OTP", {
        id: toastId,
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setOtpError("Please enter the OTP");
      return;
    }
    if (!createdUserId) return;
    const toastId = toast.loading("Verifying OTP...");
    try {
      await verifyOtpMutation.mutateAsync({ userId: createdUserId, otp });
      toast.success("Email verified successfully", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      resetAndClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Invalid OTP";
      setOtpError(msg);
      toast.error(msg, { id: toastId });
    }
  };

  const handleResendOtp = async () => {
    if (!createdUserId) return;
    setOtpError("");
    await handleSendOtp(createdUserId);
  };

  const field = (
    key: keyof FormData,
    label: string,
    type = "text",
    placeholder = ""
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        className={`${inputClass} ${errors[key] ? "border-red-400" : ""}`}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  const passwordField = (
    key: "password" | "confirmPassword",
    label: string,
    placeholder: string,
    show: boolean,
    onToggle: () => void
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`${inputClass} pr-10 ${errors[key] ? "border-red-400" : ""}`}
          value={form[key]}
          placeholder={placeholder}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <>
      <Button className="flex gap-2" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add User
      </Button>

      <AppModal
        isOpen={open}
        onClose={resetAndClose}
        closeOnOutsideClick={false}
        contentClassName="max-w-lg w-full"
      >
        <div className="sticky top-0 bg-white z-10 px-5 sm:px-8 pt-6 pb-3">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {step === 1 ? "Add New User" : step === 2 ? "Email Verification" : "Verify Email"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 1
                  ? "Fill in the user's details below"
                  : step === 2
                    ? "Choose how to handle email verification"
                    : "Enter the OTP sent to the user's email"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      s === step ? "w-6 bg-blue-600" : s < step ? "w-3 bg-blue-300" : "w-3 bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <DialogClose
                onClick={resetAndClose}
                className="rounded-sm opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4 text-gray-600" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>
          <div className="border-b border-gray-100" />
        </div>

        {step === 1 && (
          <div className="px-5 sm:px-8 pb-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("firstName", "First Name *", "text", "John")}
              {field("middleName", "Middle Name", "text", "Optional")}
            </div>
            {field("lastName", "Last Name *", "text", "Doe")}
            {field("email", "Email *", "email", "john@example.com")}

            <div>
              <label className={labelClass}>Gender</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GENDERS.map(({ value, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, gender: f.gender === value ? "" : value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                      ${form.gender === value
                        ? "bg-blue-600 text-green-500 border-blue-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                      }`}
                  >
                    <span className="text-xs">{icon}</span>
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("phoneNumber", "Voice Number", "tel", "+1 234 567 8900")}
              {field("whatsappNumber", "WhatsApp Number", "tel", "+1 234 567 8900")}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("country", "Country of Residence", "text", "United States")}
              {field("currentCityOfResidence", "Current City", "text", "New York")}
            </div>

            <div>
              <label className={labelClass}>Sign Up As</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {Object.entries(ROLE_CONFIG).map(([value, { label, color }]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: value }))}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left
                      ${form.role === value
                        ? `${color} ring-2 ring-offset-1 ring-blue-400 shadow-sm`
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {form.role === value && <span className="mr-1">✓</span>}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {passwordField("password", "Password", "Min. 8 characters", showPassword, () => setShowPassword((v) => !v))}
            {passwordField("confirmPassword", "Confirm Password", "Repeat password", showConfirmPassword, () => setShowConfirmPassword((v) => !v))}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={resetAndClose} disabled={createUserMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleStep1Submit} disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-5 sm:px-8 pb-8 flex flex-col items-center gap-6 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
              ✉️
            </div>
            <div>
              <p className="text-gray-700 font-medium mb-2">
                Do you have access to the user&apos;s email?
              </p>
              <p className="text-sm text-gray-500">
                If yes, an OTP will be sent to <strong>{form.email}</strong> to verify the account.
                If you skip, the user will remain unverified.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                  resetAndClose();
                }}
                disabled={sendOtpMutation.isPending}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={() => createdUserId && handleSendOtp(createdUserId)}
                disabled={sendOtpMutation.isPending}
              >
                {sendOtpMutation.isPending ? "Sending..." : "Yes, Send OTP"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="px-5 sm:px-8 pb-8 pt-4 flex flex-col gap-5">
            <p className="text-sm text-gray-600">
              An OTP has been sent to <strong>{form.email}</strong>. Enter it below to verify the account.
            </p>
            <div>
              <label className={labelClass}>Enter OTP</label>
              <input
                type="text"
                className={`${inputClass} tracking-widest text-center text-lg font-semibold ${otpError ? "border-red-400" : ""}`}
                value={otp}
                placeholder="000000"
                maxLength={6}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  setOtpError("");
                }}
              />
              {otpError && <p className="text-xs text-red-500 mt-1">{otpError}</p>}
            </div>
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline self-start disabled:opacity-50"
              onClick={handleResendOtp}
              disabled={sendOtpMutation.isPending}
            >
              {sendOtpMutation.isPending ? "Resending..." : "Resend OTP"}
            </button>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={resetAndClose} disabled={verifyOtpMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleVerifyOtp} disabled={verifyOtpMutation.isPending || !otp}>
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </div>
        )}
      </AppModal>
    </>
  );
};

export default AddUserBtn;
