"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import CreatePromptDialog from "./_components/CreatePromptDialog";
import RecycleBinDialog from "./_components/RecycleBinDialog";
import UsageAnalyticsSection from "./_components/UsageAnalyticsSection";
import PromptsTable from "./_components/PromptsTable";
import { VcsPrompt } from "./hooks/use-vcs-prompts";

const PromptsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUsage, setShowUsage] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vcs-prompts"] });

  const openEditor = (prompt: VcsPrompt) => {
    router.push(`/admin/prompts/${prompt.id}`);
  };

  return (
    <section className="flex flex-col gap-3 mt-4">
      <PageHeader
        title="AI Prompts"
        description="Manage every AI prompt configuration used across the platform — versioned and organized by key."
        renderJSX={
          <div className="flex items-center gap-2">
            <Button
              variant={showUsage ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setShowUsage((prev) => !prev)}
            >
              <Activity size={16} />
              Usage Analytics
            </Button>
            <RecycleBinDialog
              onRestored={() => {
                invalidate();
              }}
            />
            <CreatePromptDialog
              onCreated={(id) => {
                invalidate();
                router.push(`/admin/prompts/${id}`);
              }}
            />
          </div>
        }
        className="rounded-xl border border-primary/15 p-3 sm:p-3 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
      />

      <PromptsTable onEdit={openEditor} />

      {showUsage && <UsageAnalyticsSection />}
    </section>
  );
};

export default PromptsPage;
