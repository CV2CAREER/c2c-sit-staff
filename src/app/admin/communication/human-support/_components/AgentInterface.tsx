"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Send, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader/PageHeader";
import {
  SupportMessage,
  SupportSession,
  useSupportDesk,
} from "@/hooks/useSupportDesk";

function getParticipantName(session: SupportSession) {
  const customer = session.customer;
  const fullName = [customer?.firstName, customer?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) return fullName;
  if (customer?.email) return customer.email;
  if (session.subject) return session.subject;
  return `Session ${session.id.slice(0, 8)}`;
}

function getSessionSummary(messages: SupportMessage[]) {
  if (!messages.length) return "No messages yet";
  return messages[messages.length - 1]?.message ?? "No messages yet";
}

function isCustomerMessage(message: SupportMessage) {
  return message.senderType === "customer";
}

export default function AgentInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSessionId = searchParams?.get("chatId");
  const [activeChat, setActiveChat] = React.useState<string | null>(
    initialSessionId ?? null,
  );
  const [searchValue, setSearchValue] = React.useState("");
  const [input, setInput] = React.useState("");

  const {
    sessionsDomain,
    messagesDomain,
    actions: { sendMessage, sendingMessage, endSession, endingSession },
  } = useSupportDesk({
    sessionId: activeChat,
    pollIntervalMs: 10000,
  });

  React.useEffect(() => {
    if (!searchParams) return;
    const nextChatId = searchParams.get("chatId");
    if (nextChatId !== activeChat) {
      setActiveChat(nextChatId);
    }
  }, [searchParams, activeChat]);

  const filteredSessions = React.useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return sessionsDomain.data;

    return sessionsDomain.data.filter((session) => {
      const participant = getParticipantName(session).toLowerCase();
      const subject = session.subject?.toLowerCase() ?? "";
      const status = session.status.toLowerCase();
      return (
        participant.includes(query) ||
        subject.includes(query) ||
        status.includes(query)
      );
    });
  }, [searchValue, sessionsDomain.data]);

  const activeSession = React.useMemo(
    () => sessionsDomain.data.find((session) => session.id === activeChat) ?? null,
    [sessionsDomain.data, activeChat],
  );

  const handleSelectChat = React.useCallback(
    (sessionId: string) => {
      setActiveChat(sessionId);
      router.push(`/admin/communication/human-support?chatId=${sessionId}`);
    },
    [router],
  );

  const handleSendMessage = React.useCallback(async () => {
    if (!activeChat || !input.trim()) return;

    try {
      await sendMessage({
        sessionId: activeChat,
        message: input.trim(),
        senderType: "staff",
      });
      setInput("");
    } catch (error) {
      toast.error("Failed to send support message.");
      // console.error(error);
    }
  }, [activeChat, input, sendMessage]);

  const handleEndSession = React.useCallback(async () => {
    if (!activeChat) return;

    try {
      await endSession(activeChat);
      toast.success("Support session closed.");
    } catch (error) {
      toast.error("Failed to close support session.");
      // console.error(error);
    }
  }, [activeChat, endSession]);

  return (
    <section className="mt-6 flex flex-col gap-6">
      <PageHeader
        title="Human Support"
        renderJSX={
          activeSession ? (
            <button
              type="button"
              onClick={handleEndSession}
              disabled={endingSession}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              {endingSession ? "Closing..." : "Close Session"}
            </button>
          ) : null
        }
      />

      <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-sm bg-white shadow-md">
        <aside className="flex w-80 flex-col border-r">
          <div className="border-b p-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search sessions"
                className="w-full rounded-full border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#80D7FF]"
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {sessionsDomain.isLoading ? (
              <div className="p-3 text-sm text-gray-500">Loading tickets...</div>
            ) : !filteredSessions.length ? (
              <div className="p-3 text-sm text-gray-500">
                No support sessions found.
              </div>
            ) : (
              filteredSessions.map((session) => {
                const selected = session.id === activeChat;
                const participantName = getParticipantName(session);
                const preview =
                  selected && messagesDomain.data.length
                    ? getSessionSummary(messagesDomain.data)
                    : session.subject || session.status;

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSelectChat(session.id)}
                    className={`mb-2 w-full rounded-lg p-3 text-left transition-colors ${
                      selected
                        ? "bg-[#0077B6] text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="font-semibold">{participantName}</div>
                    <div
                      className={`mt-1 line-clamp-2 text-xs ${
                        selected ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {preview}
                    </div>
                    <div
                      className={`mt-2 text-[11px] uppercase tracking-wide ${
                        selected ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      {session.status}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col">
          {activeSession ? (
            <>
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <div className="text-lg font-semibold">
                    {getParticipantName(activeSession)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {activeSession.subject || activeSession.customer?.email || "Support conversation"}
                  </div>
                </div>
                <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                  {activeSession.status}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-6">
                {messagesDomain.isLoading ? (
                  <div className="text-sm text-gray-500">Loading messages...</div>
                ) : !messagesDomain.data.length ? (
                  <div className="text-sm text-gray-500">
                    No messages yet for this session.
                  </div>
                ) : (
                  messagesDomain.data.map((message) => {
                    const customerMessage = isCustomerMessage(message);
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          customerMessage ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-lg rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            customerMessage
                              ? "bg-white text-gray-800"
                              : "bg-[#0077B6] text-white"
                          }`}
                        >
                          <div>{message.message}</div>
                          <div
                            className={`mt-2 text-[11px] ${
                              customerMessage ? "text-gray-400" : "text-blue-100"
                            }`}
                          >
                            {message.createdAt
                              ? new Date(message.createdAt).toLocaleString()
                              : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t bg-white p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="min-h-[48px] flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-[#80D7FF]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={sendingMessage || !input.trim()}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#0077B6] text-white transition-colors hover:bg-[#005f92] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              Select a conversation to begin
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
