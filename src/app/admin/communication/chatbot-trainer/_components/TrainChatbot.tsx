"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Save, Loader2, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

interface TrainingEntry {
  id: string;
  question: string;
  response: string;
}

/**
 * Helper to parse the prompt string into Q&A pairs
 */
const promptToQA = (prompt: string): TrainingEntry[] => {
  if (!prompt) return [];
  const entries: TrainingEntry[] = [];
  const regex = /QUESTION:\s*([\s\S]*?)\s*ANSWER:\s*([\s\S]*?)(?=\s*QUESTION:|$)/g;
  let match;

  while ((match = regex.exec(prompt)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question || answer) {
      entries.push({
        id: Math.random().toString(36).substr(2, 9),
        question,
        response: answer
      });
    }
  }
  return entries;
};

const TrainChatbot = () => {
  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  const { supportAiPromptDomain } = useAdminQueries({
    fetchChatbotTrainer: true,
  });

  const {
    saveChatbotEntryMutation,
    deleteChatbotEntryMutation
  } = useAdminMutations();

  useEffect(() => {
    if (supportAiPromptDomain.data?.prompt) {
      const qa = promptToQA(supportAiPromptDomain.data.prompt);
      setEntries(qa);
    }
  }, [supportAiPromptDomain.data?.prompt]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !response.trim()) {
      toast.error("Please provide both a question and a response.");
      return;
    }

    try {
      await toast.promise(
        saveChatbotEntryMutation.mutateAsync({ question, response }),
        {
          loading: "Saving entry...",
          success: "QA pair added successfully!",
          error: "Failed to save entry.",
        }
      );
      setQuestion("");
      setResponse("");
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleDelete = async (q: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;

    try {
      await toast.promise(
        deleteChatbotEntryMutation.mutateAsync({ question: q }),
        {
          loading: "Deleting question...",
          success: "Question deleted successfully!",
          error: "Failed to delete question.",
        }
      );
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const isLoading = supportAiPromptDomain.isLoading;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-20 mt-8">
      <PageHeader title="Chatbot Trainer (Support AI)" />

      {/* Entry Form */}
      <section className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 transition-all hover:shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <PlusCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Add New Training Data</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="question" className="block text-sm font-semibold text-gray-700 ml-1">
              Question
            </label>
            <Input
              id="question"
              placeholder="What is the user likely to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white transition-all text-base py-6"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="response" className="block text-sm font-semibold text-gray-700 ml-1">
              Response
            </label>
            <Textarea
              id="response"
              placeholder="Provide the AI's response..."
              rows={5}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white transition-all text-base"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saveChatbotEntryMutation.isPending || !question || !response}
              className="bg-blue hover:opacity-90 text-white px-8 py-6 rounded-lg text-lg font-medium flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {saveChatbotEntryMutation.isPending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Save size={20} />
              )}
              {saveChatbotEntryMutation.isPending ? "Saving Pair..." : "Save QA Pair"}
            </Button>
          </div>
        </form>
      </section>

      {/* Entries List */}
      <section className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            Existing Training Entries
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {entries.length} Pairs
            </span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => supportAiPromptDomain.refetch()}
            className="text-gray-500 hover:text-blue-600"
          >
            Refresh Data
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4 w-1/3">Question</th>
                <th className="px-6 py-4 w-1/2">Response</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Loader2 className="animate-spin text-blue-500" size={40} />
                      <p className="animate-pulse">Loading training data...</p>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center text-gray-400">
                    No training pairs found. Start by adding one above.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 align-top font-medium text-gray-700">
                      {entry.question}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {entry.response}
                    </td>
                    <td className="px-6 py-4 align-top text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.question)}
                        disabled={deleteChatbotEntryMutation.isPending}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        title="Delete entry"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default TrainChatbot;
