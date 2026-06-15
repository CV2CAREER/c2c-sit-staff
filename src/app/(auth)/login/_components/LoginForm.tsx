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
import { Eye, EyeOff } from "lucide-react";
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

  return (
    <Form {...form}>
      <form
        className={`className="bg-white flex flex-col gap-9 rounded-lg w-full px-4 md:px-12 py-4 md:py-7 shadow-xl font-poppins ${loginUserLoading || form.formState.isSubmitting ? 'opacity-75 pointer-events-none' : ''}`}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-[4px]">
          <h1 className="font-semibold text-xl md:text-3xl text-[#333333]">
            Log In
          </h1>
          <p className="font-normal text-sm md:text-base text-[#555555]">
            Please login to access your account 
          </p>
        </div>
        {/* Login Loading Overlay */}
        {(loginUserLoading || form.formState.isSubmitting) && (
          <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center z-10 rounded-lg">
            <FiLoader className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-gray-700">Logging in...</p>
            <p className="text-xs text-gray-500 mt-1">Please wait while we verify your credentials</p>
          </div>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Johndoe@example.com" {...field} />
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
              <div className="flex justify-between items-center">
                <FormLabel>Password</FormLabel>
                <a
                  href="https://iat.customer.cvtocareer.com/forgot-password"
                  className="text-[#008ED3] text-xs hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <FormControl>
                <div className="flex gap-3 justify-between items-center border rounded-md">
                  <Input
                    className="border-none shadow-none rounded-tr-none rounded-br-none"
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    {...field}
                  />
                  <span
                    className="flex items-center pr-3 cursor-pointer"
                    onClick={handleShowPassword}
                  >
                    {showPassword ? <Eye /> : <EyeOff />}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={loginUserLoading || form.formState.isSubmitting}
        >
          {loginUserLoading || form.formState.isSubmitting ? (
            <>
              <FiLoader className="mr-2 h-4 w-4 animate-spin" />
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
