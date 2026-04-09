import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader/PageHeader";
import AccessLevelComponent from "./_components/AccessLevelComponent/AccessLevelComponent";

export const metadata: Metadata = {
  title: "Access Levels",
};

export default function AccessLevelPage() {
  return (
    <div className="flex flex-col gap-8 mt-8">
      <PageHeader title="Access Level" />
      <AccessLevelComponent />
    </div>
  );
}
