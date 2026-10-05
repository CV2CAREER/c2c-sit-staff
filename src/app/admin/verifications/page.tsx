import type { Metadata } from "next";
import VerificationsMain from "./_components/VerificationsMain";

export const metadata: Metadata = {
  title: "Verifications | CVtoCAREER Admin",
};

export default function AdminVerificationsPage() {
  return <VerificationsMain />;
}
