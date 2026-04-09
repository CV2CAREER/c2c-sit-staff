import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader/PageHeader";
import PersonaViewAsSettings from "./_components/settings";

export const metadata: Metadata = {
  title: "Persona Settings",
};

export default function PersonaSettingsPage() {
  return (
    <div className="flex flex-col gap-8 mt-8">
      <PageHeader title="Persona Settings" />
      <PersonaViewAsSettings />
    </div>
  );
}
