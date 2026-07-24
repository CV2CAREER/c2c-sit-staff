/* eslint-disable no-console */
"use client";
import React, { useEffect, useState } from "react";
import { FiLoader } from "react-icons/fi";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { LoginSchema } from "@/utils/validationSchemas";
import { useAuthMutations } from "@/hooks/api/auth.api";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const handleShowPassword = (): void => {
    setShowPassword(!showPassword);
  };
  // const router = useRouter();

  const searchParams = useSearchParams();
  // const callbackUrl = searchParams?.get("callbackUrl") || undefined;
  const error = searchParams?.get("error");

  // Consume auth hook — login mutation drives state, redirect, and store sync
  const {
    loginDomain: { loginUser, loginUserLoading },
  } = useAuthMutations();

  // Show error messages based on URL parameters
  useEffect(() => {
    if (error) {
      switch (error) {
        case "unauthorized":
          toast.error(
            "Access denied. You don't have permission to access this area."
          );
          break;
        case "unauthorized_app":
          toast.error("You don't have permission to access that application.");
          break;
        case "SessionRequired":
          toast.error("Please sign in to continue.");
          break;
        default:
          toast.error("An error occurred. Please try signing in again.");
      }
    }
  }, [error]);

  /*---- Form Definition ----*/
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /*---- Submit handler ----*/
  async function onSubmit(values: z.infer<typeof LoginSchema>) {
    const toastId = toast.loading("Signing in...");

    loginUser(
      {
        email: values.email.trim().toLowerCase(),
        password: values.password,
      },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success("Login successful!");
          // Role-based redirect is handled automatically in useAuthMutations onSuccess
        },
        onError: (error) => {
          toast.dismiss(toastId);
          let message = "Invalid email or password. Please try again.";

          // 403 = valid credentials but role not permitted by backend (Staff validation)
          if (error?.statusCode === 403) {
            message =
              "Access denied: This account does not have staff permissions.";
          } else if (error?.message) {
            message = error.message;
          }

          toast.error(message);
        },
      }
    );
  }

  // // Use Effect to redirect after successful login
  // useEffect(() => {
  //   const isAuthenticated = status === "authenticated";
  //   const userRole = (session as any)?.user?.role;

  //   if (!isAuthenticated || !userRole) return;

  //   const trimmedCallbackUrl = callbackUrl?.trim();

  //   if (trimmedCallbackUrl) {
  //     router.push(trimmedCallbackUrl);
  //   } else {
  //     redirectBasedOnRole(userRole);
  //   }
  // }, [status, session, redirectBasedOnRole, callbackUrl, router]);

  const isBusy = loginUserLoading || form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        className={`relative flex w-full max-w-xl flex-col gap-7 rounded-2xl border border-primary/15 bg-white px-6 py-8 shadow-[0_4px_24px_rgba(0,142,211,0.12)] font-poppins sm:px-12 sm:py-10 ${isBusy ? "pointer-events-none opacity-75" : ""}`}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock size={22} />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 md:text-base">
              Sign in to access your staff dashboard
            </p>
          </div>
        </div>

        {/* Login Loading Overlay */}
        {isBusy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[1px]">
            <FiLoader className="mb-3 h-9 w-9 animate-spin text-primary" />
            <p className="text-sm font-medium text-gray-700">Signing in...</p>
            <p className="mt-1 text-xs text-gray-500">Please wait while we verify your credentials</p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Email</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-white focus-within:shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
                    <Mail size={16} className="shrink-0 text-primary" />
                    <Input
                      className="h-11 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                      placeholder="johndoe@example.com"
                      {...field}
                    />
                  </div>
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
                <div className="flex items-center justify-between">
                  <FormLabel className="text-gray-700">Password</FormLabel>
                  <a
                    href={`${process.env.NEXT_PUBLIC_CUSTOMER_URL}/forgot-password`}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot Password?
                  </a>
                </div>
                <FormControl>
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-white focus-within:shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
                    <Lock size={16} className="shrink-0 text-primary" />
                    <Input
                      className="h-11 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      {...field}
                    />
                    <button
                      type="button"
                      className="flex shrink-0 items-center text-primary/60 transition-colors hover:text-primary"
                      onClick={handleShowPassword}
                      tabIndex={-1}
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isBusy}>
          {isBusy ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
};
