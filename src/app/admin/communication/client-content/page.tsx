import type { Metadata } from "next";
import ClientContentPage from "./_components/ClientContentPage";

export const metadata: Metadata = {
  title: "Client Content",
};

export default function AdminClientContentPage() {
  return <ClientContentPage />;
}
