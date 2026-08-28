import type { Metadata } from "next";
import PreferenceQuestionsPage from "./_components/PreferenceQuestionsPage";

export const metadata: Metadata = {
  title: "Question Classification",
};

export default function AdminPreferenceQuestionsPage() {
  return <PreferenceQuestionsPage />;
}
