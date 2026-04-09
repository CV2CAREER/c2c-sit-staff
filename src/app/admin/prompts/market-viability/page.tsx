// app/admin/prompts/aq-ai/page.tsx
"use client";
import {
  PromptCategory,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts";
import GenericAIDashboard from "../_components/GenericAIDashboard";

const AQPage = () => {
  return (
    <GenericAIDashboard<PromptCategory, PromptQuestion, PromptSimulation>
      title="Market Viability AI Prompts"
      apiBasePath="prompts/market-viability" // The specific API endpoint base for AQ AI
      recordsLink="/admin/prompts/market-viability/records" // The specific records link for AQ AI
      showSubmitConfirmation={true} // AQ AI requires submit confirmation
    />
  );
};

export default AQPage;
