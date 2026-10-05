'use client';
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useVaChatMutations } from "@/hooks/api/admin/va-chat";
import { useFetchData } from "@/hooks/useApi";
import { useAuthStore } from "@/store/user.store";
import AssistantCustomerFlow from "./AssistantCustomerFlow";
import ClientSelect, { AssignedClient, ClientOption, toClientOptions } from "./ClientSelect";
import {
  ADMIN_VA_CLIENT_SEARCH,
  ASSISTANT_CLIENTS_ASSIGNED,
  ASSISTANT_VA_CLIENT,
} from "@/constants/apiEndpoints/admin.endpoint";
import axiosInstance from "@/services/api-client";

const generateSessionId = () =>
  `va-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Client pages the widget scopes itself to. /assistant/* redirects to /pc/*,
// so the PC paths cover the old assistant URLs too.
const CLIENT_PAGE_PATTERN = /^\/(?:admin|pc)\/(?:users|campaign-mgt\/client)\/([^/]+)\/?$/;

const clientIdFromPath = (pathname: string | null) => {
  const match = pathname?.match(CLIENT_PAGE_PATTERN);
  return match ? decodeURIComponent(match[1]) : null;
};

type ConvoType = 'direct' | 'sample';
type ChatMessage = { role: 'user' | 'assistant'; message: string; failed?: boolean };

// Starter questions shown until the first message is sent.
const SUGGESTIONS: Record<ConvoType, string[]> = {
  direct: [
    'What does a Placement Controller do?',
    'How do we decide which jobs to apply for?',
  ],
  sample: [
    "Summarise this client's work history",
    'Describe their experience managing a team',
  ],
};

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[25px] w-[25px] fill-white" aria-hidden="true">
      <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
    </svg>
  );
}

const FloatingVAChat = () => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [convoType, setConvoType] = useState<ConvoType>();
  const [showChats, setShowChats] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [isTyping, setIsTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const ishomepage = pathname === '/';

  // PCs (assistants) get the Selection Criteria Assistant in Customer mode
  // (SPR-20-01-014 → 021); admins keep the free-form client chat.
  const role = useAuthStore((s) => s.user?.role);
  const isAssistant = role === 'assistant';
  const isAdmin = role === 'admin';

  // On a client's page the client is taken from the URL — no picker.
  const pageClientId = clientIdFromPath(pathname);
  const pageClientQuery = useFetchData<{ id: string; name: string }>({
    method: "GET",
    url: pageClientId ? ASSISTANT_VA_CLIENT(pageClientId) : "",
    queryKey: ["va-chat-client", pageClientId ?? ""],
    enabled: !!pageClientId,
  });
  const pageClient = pageClientQuery.data?.data;
  const pageClientOption = pageClient ? { value: pageClient.id, label: pageClient.name } : null;

  const activeClient = pageClientId ? pageClientOption : selectedClient;

  const canContinue = !!selectedClient && !!jobUrl;

  // Off a client page the picker is needed. Admins search every client on
  // the server; anyone else only sees the clients assigned to them.
  const clientsQuery = useFetchData<{ clientDetails: AssignedClient[] }>({
    method: "GET",
    url: ASSISTANT_CLIENTS_ASSIGNED,
    queryKey: ["assistant-clients-assigned"],
    enabled: visible && convoType === 'sample' && !pageClientId && !isAssistant && !isAdmin,
  });

  const clientOptions = toClientOptions(clientsQuery.data?.data?.clientDetails);

  const searchAllClients = useCallback(async (query: string) => {
    const { data } = await axiosInstance.get<{ data: AssignedClient[] }>(ADMIN_VA_CLIENT_SEARCH, {
      params: { q: query },
    });
    return toClientOptions(data?.data);
  }, []);

  const { sendMessage } = useVaChatMutations(sessionId);

  const scrollToBottom = useCallback(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Tracks the live session so a reply to a conversation that has since been
  // reset (closed, or the client changed) is dropped instead of shown.
  const sessionRef = useRef(sessionId);
  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  const resetConversation = () => {
    setConvoType(undefined);
    setShowChats(false);
    setMessages([]);
    setJobUrl('');
    setSelectedClient(null);
    setInput('');
    setIsTyping(false);
    setSessionId(generateSessionId());
  };

  const handleClose = () => {
    resetConversation();
    setVisible(false);
  };

  // A customer conversation belongs to the client on screen — moving to a
  // different client (or off a client page) starts over.
  useEffect(() => {
    if (convoType === 'sample') resetConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageClientId]);

  const startChat = (type: ConvoType) => {
    setConvoType(type);
    setMessages([]);
    setSessionId(generateSessionId());
    setShowChats(true);
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const sentSessionId = sessionId;
    setMessages((prev) => [...prev, { role: 'user', message: trimmed }]);
    setInput('');
    setIsTyping(true);

    sendMessage.mutate(
      {
        message: trimmed,
        sessionId,
        userId: convoType === 'sample' ? activeClient?.value : undefined,
        jobUrl: convoType === 'sample' && jobUrl ? jobUrl : undefined,
        type: convoType,
      },
      {
        onSuccess: (data: { data?: { message?: string }; message?: string }) => {
          if (sessionRef.current !== sentSessionId) return;
          const aiMessage = data?.data?.message ?? data?.message ?? '';
          setMessages((prev) => [...prev, { role: 'assistant', message: aiMessage }]);
          setIsTyping(false);
        },
        onError: () => {
          if (sessionRef.current !== sentSessionId) return;
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', message: 'Sorry, something went wrong. Please try again.', failed: true },
          ]);
          setIsTyping(false);
        },
      }
    );
  };

  const isPicking = !showChats;
  const clientName = activeClient?.label;
  const hasUserMessage = messages.some((m) => m.role === 'user');

  return (
    <div
      data-testid="floating-va-chat"
      className={`fixed bottom-10 md:bottom-20 z-50 ${ishomepage ? 'left-5' : 'right-5'}`}
    >
      {!visible ? (
        <button
          type="button"
          aria-label="Open support chat"
          onClick={() => setVisible(true)}
          className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#0B96D6] shadow-[0_6px_22px_rgba(11,150,214,0.45)] transition-transform hover:scale-105"
        >
          <ChatIcon />
          <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#DC2626]" />
        </button>
      ) : (
        <div
          className={`flex max-h-[74vh] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-[13px] bg-white shadow-[0_16px_46px_rgba(9,13,24,0.26)]
            ${isAssistant && convoType === 'sample' && showChats ? 'w-[380px]' : 'w-[340px]'}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-4 pb-2.5 pt-3.5">
            <span className="text-sm font-bold text-[#10365A]">CVtoCAREER TPC Support</span>
            <button
              type="button"
              aria-label="Close chat"
              onClick={handleClose}
              className="text-base leading-none text-[#94A3B8] hover:text-[#64748B]"
            >
              ✕
            </button>
          </div>

          {isPicking ? (
            /* Mode picker */
            <div className="overflow-y-auto pb-3.5">
              <p className="px-4 pb-3 text-[14.5px] font-bold text-[#0F172A]">
                Hi, how can I help you today?
              </p>
              <div className="flex gap-2.5 px-4">
                <button
                  type="button"
                  onClick={() => startChat('direct')}
                  className="flex-1 rounded-[9px] border border-[#E5E7EB] bg-[#F7F9FB] px-3 py-3 text-left transition-colors hover:border-[#0B96D6] hover:bg-[#F0F9FF]"
                >
                  <span className="mb-1 block text-[13px] font-bold text-[#0B96D6]">Processes</span>
                  <span className="block text-[10.5px] leading-snug text-[#64748B]">
                    Ask me questions about CVtoCAREER processes and roles.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!!pageClientId && !pageClient}
                  onClick={() =>
                    // Assistants pick the client inside their own flow.
                    pageClientId || isAssistant ? startChat('sample') : setConvoType('sample')
                  }
                  className={`flex-1 rounded-[9px] border px-3 py-3 text-left transition-colors hover:border-[#0B96D6] hover:bg-[#F0F9FF] disabled:cursor-default disabled:opacity-70 disabled:hover:border-[#E5E7EB] disabled:hover:bg-[#F7F9FB]
                    ${convoType === 'sample' && !pageClientId ? 'border-[#0B96D6] bg-[#F0F9FF]' : 'border-[#E5E7EB] bg-[#F7F9FB]'}`}
                >
                  <span className="mb-1 block text-[13px] font-bold text-[#0B96D6]">Customer</span>
                  <span className="block text-[10.5px] leading-snug text-[#64748B]">
                    {!pageClientId ? (
                      'Ask questions about a specific client.'
                    ) : pageClient ? (
                      <>Ask questions about <b className="text-[#10365A]">{pageClient.name}</b>.</>
                    ) : pageClientQuery.isError ? (
                      pageClientQuery.error?.message || 'Could not load this client.'
                    ) : (
                      'Loading client…'
                    )}
                  </span>
                </button>
              </div>

              {/* Off a client page there is no client in context, so pick one. */}
              {convoType === 'sample' && !pageClientId && (
                <div className="mx-4 mt-3.5 flex flex-col gap-2">
                  <label className="text-[10.5px] font-bold text-[#64748B]">Select a client</label>
                  {isAdmin ? (
                    <ClientSelect
                      value={selectedClient}
                      onChange={setSelectedClient}
                      loadOptions={searchAllClients}
                      placeholder="Search all clients by name or ID…"
                    />
                  ) : (
                    <ClientSelect
                      value={selectedClient}
                      options={clientOptions}
                      isLoading={clientsQuery.isLoading}
                      onChange={setSelectedClient}
                    />
                  )}
                  <label className="mt-1 text-[10.5px] font-bold text-[#64748B]">Job link</label>
                  <input
                    type="text"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="Paste a job link"
                    className="w-full rounded-md border border-[#E5E7EB] px-2.5 py-2 text-xs focus:border-[#0B96D6] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => startChat('sample')}
                    className="mt-1 self-start rounded-md bg-[#0B96D6] px-3.5 py-2 text-[11.5px] font-bold text-white disabled:opacity-45"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          ) : isAssistant && convoType === 'sample' ? (
            <AssistantCustomerFlow
              pageClient={pageClientOption}
              pageClientId={pageClientId}
              sessionId={sessionId}
              onBack={resetConversation}
            />
          ) : (
            <>
              {/* Back to modes */}
              <div className="flex items-center gap-2 px-4 pb-2">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="text-[10px] text-[#64748B] hover:text-[#10365A]"
                >
                  ← {convoType === 'sample' ? 'Customer' : 'Processes'}
                </button>
                {convoType === 'sample' && clientName && (
                  <span className="ml-auto max-w-[190px] truncate text-[10px] font-semibold text-[#10365A]">
                    {clientName}
                  </span>
                )}
              </div>

              {/* Messages */}
              <div ref={bodyRef} className="min-h-[110px] flex-1 overflow-y-auto px-3.5 pb-2 pt-0.5">
                <div className="mb-2.5 text-xs">
                  <div className="inline-block max-w-[95%] rounded-[11px_11px_11px_3px] bg-[#F1F5F9] px-[11px] py-[9px]">
                    {convoType === 'sample' ? (
                      <>
                        Ask me about <b>{clientName}</b>. Everything in this chat is about this client
                        only — paste a job link in your message to compare it with their profile.
                      </>
                    ) : (
                      'Ask me about CVtoCAREER processes and roles.'
                    )}
                  </div>
                </div>

                {messages.map((msg, index) =>
                  msg.role === 'user' ? (
                    <div key={index} className="mb-2.5 text-right text-xs">
                      <div className="inline-block max-w-[86%] whitespace-pre-line rounded-[11px_11px_3px_11px] bg-[#0B96D6] px-[11px] py-[7px] text-left text-white">
                        {msg.message}
                      </div>
                    </div>
                  ) : (
                    <div key={index} className="mb-2.5 text-xs">
                      <div
                        className={`inline-block max-w-[95%] whitespace-pre-line rounded-[11px_11px_11px_3px] px-[11px] py-[9px]
                          ${msg.failed ? 'border border-[#FECACA] bg-[#FEE2E2] text-[#7F1D1D]' : 'bg-[#F1F5F9]'}`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  )
                )}

                {isTyping && (
                  <div className="mb-2.5 text-xs">
                    <div className="inline-flex items-center gap-1 rounded-[11px_11px_11px_3px] bg-[#F1F5F9] px-[11px] py-[11px]">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#94A3B8] [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#94A3B8] [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#94A3B8]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions — only before the first question */}
              {!hasUserMessage && convoType && (
                <div className="flex flex-col gap-1 px-3.5 pb-2.5">
                  {SUGGESTIONS[convoType].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-[7px] border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-left text-[10.5px] text-[#0B96D6] hover:border-[#0B96D6]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Composer */}
              <div className="flex gap-1.5 border-t border-[#F1F5F9] bg-[#FCFDFE] px-3.5 py-2.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={
                    convoType === 'sample' && clientName
                      ? `Ask about ${clientName}...`
                      : 'How can we help?'
                  }
                  disabled={isTyping}
                  className="min-w-0 flex-1 rounded-md border border-[#E5E7EB] bg-white px-[9px] py-[7px] text-[11.5px] focus:border-[#0B96D6] focus:outline-none disabled:bg-[#F8FAFC]"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || isTyping}
                  className="rounded-md bg-[#0B96D6] px-3 py-[7px] text-[11.5px] font-bold text-white disabled:opacity-45"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingVAChat;
