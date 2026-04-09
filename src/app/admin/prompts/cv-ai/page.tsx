// app/admin/prompts/aq-ai/page.tsx
"use client";
import {
  PromptCategory,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts";
import GenericAIDashboard from "../_components/GenericAIDashboard";

const CVPage = () => {
  return (
    <GenericAIDashboard<PromptCategory, PromptQuestion, PromptSimulation>
      title="CV AI Prompts"
      apiBasePath="prompts/cv-ai" // The specific API endpoint base for AQ AI
      recordsLink="/admin/prompts/cv-ai/records" // The specific records link for AQ AI
      editLink = '/admin/prompts/cv-ai/edit'
      showSubmitConfirmation={true} // AQ AI requires submit confirmation
    />
  );
};

export default CVPage;
