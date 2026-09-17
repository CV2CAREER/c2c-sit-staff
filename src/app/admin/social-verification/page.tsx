import type { Metadata } from "next";
import SocialVerificationQueue from "./_components/SocialVerificationQueue";

export const metadata: Metadata = {
  title: "Social Verification",
};

export default function AdminSocialVerificationPage() {
  return <SocialVerificationQueue />;
}
