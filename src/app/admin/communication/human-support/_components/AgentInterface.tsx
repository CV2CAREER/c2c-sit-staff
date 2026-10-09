"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Send, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/user.store";
import {
  SupportMessage,
  SupportSession,
  useSupportDesk,
} from "@/hooks/useSupportDesk";

/** Second line of every staff signature. */
const SIGNATURE_TEAM = "CVtoCAREER Support";

type DisplayStatus = "Open" | "Replied" | "Closed" | "Resolved";

const STATUS_STYLES: Record<DisplayStatus, string> = {
  Open: "bg-amber-50 text-amber-700 border border-amber-200",
  Replied: "bg-green-50 text-green-700 border border-green-200",
  Closed: "bg-gray-100 text-gray-600 border border-gray-200",
  Resolved: "bg-gray-100 text-gray-600 border border-gray-200",
};

function getParticipantName(session: SupportSession) {
  const customer = session.customer;
  const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (customer?.email) return customer.email;
  if (session.subject) return session.subject;
  return `Session ${session.id.slice(0, 8)}`;
}

/**
 * Open = the client is waiting on us (they spoke last, or nobody has yet);
 * Replied = staff spoke last. Closed/resolved sessions keep their own state.
 */
function getDisplayStatus(
  session: SupportSession,
  lastSender?: SupportMessage["senderType"] | null,
): DisplayStatus {
  if (session.status === "closed") return "Closed";
  if (session.status === "resolved") return "Resolved";
  return lastSender === "staff" ? "Replied" : "Open";
}

function formatListTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return time;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Splits a "…\n\nName\nCVtoCAREER Support" reply into body + signature. */
function splitSignature(text: string) {
  const lines = text.split("\n");
  if (lines.length >= 2 && lines[lines.length - 1].trim() === SIGNATURE_TEAM) {
    const name = lines[lines.length - 2].trim();
    return {
      body: lines.slice(0, -2).join("\n").trimEnd(),
      signature: name ? `${name} · ${SIGNATURE_TEAM}` : SIGNATURE_TEAM,
    };
  }
  return { body: text, signature: null };
}

function StatusPill({ status }: { status: DisplayStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

interface AgentInterfaceProps {
  /** Route this screen lives on — admin and PC share the component. */
  basePath?: string;
}

export default function AgentInterface({
  basePath = "/admin/communication/human-support",
}: AgentInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSessionId = searchParams?.get("chatId");
  const [activeChat, setActiveChat] = React.useState<string | null>(initialSessionId ?? null);
  const [searchValue, setSearchValue] = React.useState("");
  const [input, setInput] = React.useState("");

  const staff = useAuthStore((s) => s.user);
  const staffName = [staff?.firstName, staff?.lastName].filter(Boolean).join(" ").trim();
  const signature = `${staffName || "CVtoCAREER Team"}\n${SIGNATURE_TEAM}`;

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
      const preview = session.lastMessage?.message.toLowerCase() ?? "";
      return participant.includes(query) || subject.includes(query) || preview.includes(query);
    });
  }, [searchValue, sessionsDomain.data]);

  const activeSession = React.useMemo(
    () => sessionsDomain.data.find((session) => session.id === activeChat) ?? null,
    [sessionsDomain.data, activeChat],
  );

  const messages = messagesDomain.data;
  const activeStatus = activeSession
    ? getDisplayStatus(
        activeSession,
        messages.length ? messages[messages.length - 1].senderType : activeSession.lastMessage?.senderType,
      )
    : null;
  const canReply = activeStatus === "Open" || activeStatus === "Replied";
  const firstName = activeSession?.customer?.firstName?.trim() || "there";

  // Prefill the reply with a greeting and signature whenever a different
  // conversation is opened (not on every poll).
  React.useEffect(() => {
    if (!activeSession) return;
    setInput(
      `Hi ${firstName},\n\nThanks for reaching out. Let me look into this and get back to you with a clear answer shortly.\n\n${signature}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  const handleSelectChat = React.useCallback(
    (sessionId: string) => {
      setActiveChat(sessionId);
      router.push(`${basePath}?chatId=${sessionId}`);
    },
    [router, basePath],
  );

  const handleSendMessage = React.useCallback(async () => {
    if (!activeChat || !input.trim()) return;

    try {
      await sendMessage({ sessionId: activeChat, message: input.trim() });
      setInput("");
      toast.success("Reply sent — delivered to the chat and the client's Inbox.");
    } catch {
      toast.error("Failed to send support message.");
    }
  }, [activeChat, input, sendMessage]);

  const handleEndSession = React.useCallback(async () => {
    if (!activeChat) return;

    try {
      await endSession(activeChat);
      toast.success("Support session closed.");
    } catch {
      toast.error("Failed to close support session.");
    }
  }, [activeChat, endSession]);

  return (
    <section className="mt-6 flex flex-col gap-6">
      <PageHeader
        title="Human Support"
        description="Conversations clients start from the support chat, including chatbot handoffs."
        renderJSX={
          activeSession && activeStatus ? (
            <div className="flex items-center gap-3">
              <StatusPill status={activeStatus} />
              {canReply && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEndSession}
                  disabled={endingSession}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                  {endingSession ? "Closing..." : "Close session"}
                </Button>
              )}
            </div>
          ) : null
        }
      />

      {!sessionsDomain.isLoading && sessionsDomain.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-20 text-center text-sm text-gray-400">
          No support sessions found.
        </div>
      ) : (
        <div className="flex h-[calc(100vh-240px)] min-h-[480px] gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
          {/* Session list */}
          <aside className="flex w-72 shrink-0 flex-col">
            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search sessions"
                className="w-full rounded-full border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#0B96D6]"
              />
            </label>

            <div className="flex-1 overflow-y-auto pr-1">
              {sessionsDomain.isLoading ? (
                <div className="p-3 text-sm text-gray-500">Loading sessions...</div>
              ) : !filteredSessions.length ? (
                <div className="p-3 text-sm text-gray-500">No sessions match your search.</div>
              ) : (
                filteredSessions.map((session) => {
                  const selected = session.id === activeChat;
                  const status = getDisplayStatus(session, session.lastMessage?.senderType);
                  const preview =
                    session.lastMessage?.message.split("\n")[0] ||
                    session.subject ||
                    "No messages yet";

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectChat(session.id)}
                      className={`mb-2 w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-[#0B96D6] bg-[#EAF6FC]"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {getParticipantName(session)}
                        </span>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {formatListTime(session.lastMessage?.createdAt ?? session.createdAt)}
                        </span>
                      </div>
                      {session.fromBot && (
                        <span className="my-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700">
                          From chatbot
                        </span>
                      )}
                      <p className="truncate text-xs text-gray-500">{preview}</p>
                      <div className="mt-1.5">
                        <StatusPill status={status} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Conversation */}
          <main className="flex min-w-0 flex-1 flex-col">
            {activeSession ? (
              <>
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-gray-900">
                    {getParticipantName(activeSession)}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {activeSession.subject || activeSession.customer?.email || "Support conversation"}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {activeSession.fromBot && !!activeSession.transcript?.length && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-900">
                        💬 Escalated from chatbot — what the bot already told the client
                      </p>
                      <div className="mt-2 space-y-1">
                        {activeSession.transcript.map((turn, index) => (
                          <p key={index} className="text-xs text-amber-950">
                            <span className="font-semibold">
                              {turn.role === "user" ? firstName : "Bot"}:
                            </span>{" "}
                            {turn.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {messagesDomain.isLoading ? (
                    <div className="text-sm text-gray-500">Loading messages...</div>
                  ) : !messages.length ? (
                    <div className="text-sm text-gray-500">No messages yet for this session.</div>
                  ) : (
                    messages.map((message) => {
                      if (message.senderType === "system") {
                        return (
                          <p key={message.id} className="my-2 text-center text-xs text-gray-400">
                            {message.message}
                          </p>
                        );
                      }

                      if (message.senderType === "customer") {
                        return (
                          <div key={message.id} className="mb-2.5 text-right">
                            <div className="inline-block max-w-[80%] whitespace-pre-line rounded-[11px_11px_3px_11px] bg-[#0B96D6] px-3 py-2 text-left text-sm text-white">
                              {message.message}
                            </div>
                          </div>
                        );
                      }

                      const { body, signature: sig } = splitSignature(message.message);
                      return (
                        <div key={message.id} className="mb-2.5">
                          <div className="inline-block max-w-[85%] whitespace-pre-line rounded-[11px_11px_11px_3px] border border-green-200 bg-green-50 px-3 py-2 text-sm text-gray-800">
                            {body}
                            {sig && <div className="mt-1.5 text-[11px] text-gray-500">{sig}</div>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {canReply ? (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        // Replies are multi-line, so Enter adds a line; Ctrl/⌘+Enter sends.
                        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      rows={6}
                      className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#0B96D6]"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400">
                        Sent to the client&apos;s chat and their Inbox · Ctrl+Enter to send
                      </span>
                      <Button
                        onClick={() => void handleSendMessage()}
                        disabled={sendingMessage || !input.trim()}
                      >
                        <Send className="h-4 w-4" />
                        {sendingMessage ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
                    This session is {activeStatus?.toLowerCase()}. Replies are disabled.
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                Select a conversation to begin
              </div>
            )}
          </main>
        </div>
      )}
    </section>
  );
}
