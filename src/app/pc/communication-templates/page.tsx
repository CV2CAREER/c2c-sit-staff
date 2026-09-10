import type { Metadata } from "next";
import CommunicationTemplatesPage from "./_components/CommunicationTemplatesPage";

export const metadata: Metadata = {
  title: "Communication Templates",
};

export default function AdminCommunicationTemplatesPage() {
  return <CommunicationTemplatesPage />;
}
