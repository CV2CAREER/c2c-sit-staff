"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useAdminQueries } from "@/hooks/api/admin.api";
import ShadcnDatePicker from "@/components/ui/date-picker";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, MessageSquare, User, Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatLog {
  _id: string;
  public_url: string;
  log_name: string;
  timestamp: string;
}

interface ParsedChatLog {
  sender: string;
  message: string;
}

/**
 * Helper to parse the prompt string into Q&A pairs from the raw log text
 */
const parseChatLogs = (logData: string): ParsedChatLog[] => {
  const entries = logData
    .split("-----------------------------")
    .map((e) => e.trim());
  const chats: ParsedChatLog[] = [];

  entries.forEach((entry) => {
    const match = entry.match(
      /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3}Z)?) \| (Bot|User|System):\n([\s\S]*)$/
    );
    if (match) {
      const [, , sender, raw] = match;
      const msg = raw.trim();
      if (sender === "System" && msg.includes("User disconnected")) return;
      chats.push({ sender, message: msg });
    }
  });

  return chats;
};

const ChatBotLog = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ParsedChatLog[]>([]);
  const [isLogFetching, setIsLogFetching] = useState(false);

  const formattedDate = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  const { chatbotLogsDomain } = useAdminQueries({
    fetchChatbotLogs: true,
    chatbotLogsDate: formattedDate,
  });

  const sessions: ChatLog[] = useMemo(() => {
    return chatbotLogsDomain.data || [];
  }, [chatbotLogsDomain.data]);

  const selectedSession = useMemo(() => {
    return sessions.find((s) => s._id === selectedSessionId || s.timestamp === selectedSessionId);
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    const fetchLogContent = async () => {
      if (!selectedSession?.public_url) {
        setMessages([]);
        return;
      }

      setIsLogFetching(true);
      try {
        const response = await fetch(selectedSession.public_url);
        const text = await response.text();
        setMessages(parseChatLogs(text));
      } catch (error) {
        console.error("Failed to fetch log content:", error);
        setMessages([]);
      } finally {
        setIsLogFetching(false);
      }
    };

    fetchLogContent();
  }, [selectedSession]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto mt-4">
      {/* Date Selector Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <PageHeader title="Chatbot Logs" description={`Viewing sessions for ${format(selectedDate, "PPP")}`} />
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-blue-500" size={20} />
          <ShadcnDatePicker
            value={selectedDate}
            onChange={(date) => {
              if (date) {
                setSelectedDate(date);
                setSelectedSessionId("");
              }
            }}
            className="w-[240px]"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)] min-h-[600px]">
        {/* Session List Sidebar */}
        <Card className="w-full lg:w-80 flex flex-col shadow-sm border-gray-100 overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b py-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              Sessions
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                {sessions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-2 space-y-1">
                {chatbotLogsDomain.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <p className="text-xs">Loading sessions...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400 text-center px-4">
                    <MessageSquare size={32} className="opacity-20" />
                    <p className="text-xs">No sessions found for this date.</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session._id || session.timestamp}
                      onClick={() => setSelectedSessionId(session._id || session.timestamp)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-lg transition-all group flex flex-col gap-1",
                        selectedSessionId === (session._id || session.timestamp)
                          ? "bg-blue-50 border-blue-100 shadow-sm"
                          : "hover:bg-gray-50 text-gray-600"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium transition-colors",
                        selectedSessionId === (session._id || session.timestamp) ? "text-blue-700" : "text-gray-900"
                      )}>
                        {format(parseISO(session.timestamp), "HH:mm:ss")}
                      </span>
                      <span className="text-[10px] text-gray-400 group-hover:text-gray-500 truncate">
                        {session.log_name}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Viewer */}
        <Card className="flex-1 flex flex-col shadow-sm border-gray-100 overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {selectedSession ? (
                <>
                  <MessageSquare size={16} className="text-blue-500" />
                  Session @ {format(parseISO(selectedSession.timestamp), "PPP HH:mm:ss")}
                </>
              ) : (
                "Message Viewer"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden bg-[#f8f9fa]">
            <div className="h-full p-6 overflow-y-auto">
              <div className="flex flex-col gap-4">
                {!selectedSessionId ? (
                  <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
                    <div className="p-4 bg-white rounded-full shadow-sm">
                      <MessageSquare size={48} className="opacity-20" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-500">No Session Selected</p>
                      <p className="text-xs">Select a session from the sidebar to view the conversation.</p>
                    </div>
                  </div>
                ) : isLogFetching ? (
                  <div className="flex flex-col items-center justify-center py-40 gap-3 text-gray-400">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                    <p className="text-sm animate-pulse">Fetching message history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 gap-3 text-red-400">
                    <AlertCircle size={40} className="opacity-50" />
                    <p className="text-sm">No messages found in this log or failed to parse.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex w-full gap-3",
                        msg.sender === "User" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                        msg.sender === "User" ? "bg-blue-600 text-white" : "bg-white text-blue-600"
                      )}>
                        {msg.sender === "User" ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={cn(
                        "max-w-[80%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed",
                        msg.sender === "User" 
                          ? "bg-blue-600 text-white rounded-tr-none" 
                          : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                      )}>
                        <div className={cn(
                          "text-[10px] font-bold uppercase tracking-wider mb-1",
                          msg.sender === "User" ? "text-blue-100" : "text-blue-600"
                        )}>
                          {msg.sender}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBotLog;
