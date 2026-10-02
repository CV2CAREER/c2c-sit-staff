import type { Metadata } from "next";
import FaqPage from "./_components/FaqPage";

export const metadata: Metadata = {
  title: "FAQ",
};

export default function AdminFaqPage() {
  return <FaqPage />;
}
