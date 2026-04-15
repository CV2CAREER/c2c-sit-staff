import React from "react";
import type { Metadata } from "next";
import ChatBotLog from "./_components/ChatBotLog";

export const metadata: Metadata = {
  title: "Chatbot Logs | Admin Dashboard",
  description: "View and analyze support AI chatbot interaction logs.",
};

const ChatbotLogsPage = () => {
  return (
    <section className="px-4 pb-20">
      <ChatBotLog />
    </section>
  );
};

export default ChatbotLogsPage;
