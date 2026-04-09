// app/admin/prompts/aq-ai/page.tsx
"use client";
import {
  PromptCategory,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts";
import GenericAIDashboard from "../_components/GenericAIDashboard";

const VAPage = () => {
  return (
    <GenericAIDashboard<PromptCategory, PromptQuestion, PromptSimulation>
      title="VA AI Prompts"
      apiBasePath="prompts/va-ai" // The specific API endpoint base for AQ AI
      recordsLink="/admin/prompts/va-ai/records" // The specific records link for AQ AI
      showSubmitConfirmation={true} // AQ AI requires submit confirmation
    />
  );
};

export default VAPage;
