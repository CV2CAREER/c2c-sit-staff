import React from "react";
import type { Metadata } from "next";
import TrainChatbot from "./_components/TrainChatbot";

export const metadata: Metadata = {
  title: "Chatbot Trainer | Admin Dashboard",
  description: "Train the Support AI chatbot with new Q&A pairs for the vector-enabled backend.",
};

const ChatbotTrainerPage = () => {
  return (
    <section className="px-4 pb-20">
      <TrainChatbot />
    </section>
  );
};

export default ChatbotTrainerPage;
