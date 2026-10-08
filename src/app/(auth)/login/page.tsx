"use client"
export const dynamic = 'force-dynamic'

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
// import logo from "@/public/svg/h-logo.svg";
import logo from "../../../../public/svg/h-logo.svg"

import LoginForm from "./_components/LoginForm";

const HIGHLIGHTS = [
  "Track client campaigns end-to-end",
  "Manage users, aggregators, and applications",
  "Real-time insights across every dashboard",
];

export default async function LoginPage() {
  return (
    <section className="flex min-h-[100svh] w-full flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#003a66] via-[#00568f] to-[#008ED3] p-12 text-white lg:flex lg:w-1/2 xl:w-[45%]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <Link href={"/"} className="relative z-10">
          <Image alt="CVtoCAREER" src={logo} className="h-[38px] w-[176px] brightness-0 invert" />
        </Link>

        <div className="relative z-10 flex flex-col gap-6">
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            Welcome to the CVtoCAREER Staff Portal
          </h1>
          <p className="max-w-md text-base text-white/80">
            Manage clients, campaigns, and applications from a single, streamlined workspace built for the CVtoCAREER team.
          </p>
          <ul className="flex flex-col gap-3 text-sm text-white/90">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check size={14} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          &copy; {new Date().getFullYear()} CVtoCAREER. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-1 flex-col bg-white lg:w-1/2 xl:w-[55%]">
        <div className="flex items-center justify-between px-6 py-6 sm:px-10 lg:hidden">
          <Link href={"/"}>
            <Image alt="CVtoCAREER" src={logo} className="h-[38px] w-[176px]" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center bg-gray-50 p-6 sm:p-10 lg:bg-white">
          <Suspense fallback={<div className="text-sm text-gray-500 animate-pulse">Loading login form...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
