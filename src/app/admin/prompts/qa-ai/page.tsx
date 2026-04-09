"use client";
import {
  PromptCategory,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts";
import GenericAIDashboard from "../_components/GenericAIDashboard";

const QAPage = () => {
  return (
    <GenericAIDashboard<PromptCategory, PromptQuestion, PromptSimulation>
      title="QA AI Prompts"
      apiBasePath="prompts/qa-ai" // The specific API endpoint base for AQ AI
      recordsLink="/admin/prompts/qa-ai/records" // The specific records link for AQ AI
      showSubmitConfirmation={true} // AQ AI requires submit confirmation
    />
  );
};

export default QAPage;
