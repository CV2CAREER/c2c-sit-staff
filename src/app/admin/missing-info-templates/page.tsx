import type { Metadata } from "next";
import TemplatesClient from "./_components/TemplatesClient";

export const metadata: Metadata = {
  title: "Missing Information Templates",
};

export default function MissingInfoTemplatesPage() {
  return <TemplatesClient />;
}
