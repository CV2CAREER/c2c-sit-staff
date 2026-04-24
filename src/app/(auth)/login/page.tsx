export const dynamic = 'force-dynamic'

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
// import logo from "@/public/svg/h-logo.svg";
import logo from "../../../../public/svg/h-logo.svg"

import LoginForm from "./_components/LoginForm";
// import loginHero from "@/public/png/c2c-hero-login.png";
import loginHero from "../../../../public/png/c2c-hero-login.png"

export default async function LoginPage() {
  return (
    <section className="h-[100svh]">
      <div className="w-full flex flex-row justify-between items-center py-6 px-8 lg:px-16">
        <Link href={"/"}>
          <Image alt="login page" src={logo} className="w-[194px] h-[42px]" />
        </Link>
      </div>

      <div className="flex flex-row w-full h-[90.5svh]">
        <main className="w-full h-full hidden lg:flex">
          <Image
            src={loginHero}
            width={1000}
            height={1000}
            alt="login-hero"
            className="h-full w-full"
          />
        </main>

        <article className="w-[976px] flex flex-col gap-[32px] justify-center p-8 lg:p-16">
          <div>
            <h1 className="font-semibold text-3xl text-[#333333]">Log in</h1>
            <p className="font-normal text-base text-[#333333]">
              Log into your account
            </p>
          </div>
          <Suspense fallback={<div className="text-sm text-gray-500 animate-pulse">Loading login form...</div>}>
            <LoginForm />
          </Suspense>
        </article>
      </div>
    </section>
  );
}
