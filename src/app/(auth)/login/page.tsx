import { Metadata } from "next";
import Login from "./_components/Login";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Log in to your CVtoCAREER account and continue your career journey.",
  robots: { index: false, follow: false }, // no need to index login page
};

export default async function LoginPage() {
  return <Login />;
}
