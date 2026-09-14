import type { Metadata } from "next";
import AgentInterface from "./_components/AgentInterface";

export const metadata: Metadata = {
  title: "Human Support",
};

export default function HumanSupportPage() {
  return <AgentInterface />;
}
