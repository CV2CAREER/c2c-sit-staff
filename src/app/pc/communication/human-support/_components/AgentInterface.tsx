"use client";

import AdminAgentInterface from "@/app/admin/communication/human-support/_components/AgentInterface";

/** Same screen as the admin one — only the route it links within differs. */
export default function AgentInterface() {
  return <AdminAgentInterface basePath="/pc/communication/human-support" />;
}
