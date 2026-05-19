'use client';
import { useState, useRef, useEffect, useCallback } from "react";
import { Button, Input, Avatar } from "antd";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { AiOutlineClose } from "react-icons/ai";
import { usePathname } from "next/navigation";
import Select from 'react-select';
import { useVaChatMutations } from "@/hooks/api/admin/va-chat";
import { useFetchData } from "@/hooks/useApi";
import { ASSISTANT_CLIENTS_ASSIGNED } from "@/constants/apiEndpoints/admin.endpoint";

const generateSessionId = () =>
  `va-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const FloatingVAChat = () => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<{ role: string; message: string }[]>([]);
  const [input, setInput] = useState("");
  const [convoType, setConvoType] = useState<'direct' | 'sample'>();
  const [showChats, setShowChats] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const ishomepage = pathname === '/';

  const canContinue = !!selectedClient && !!jobUrl;

  // Fetch clients assigned to this assistant
  const clientsQuery = useFetchData<{
    clientDetails: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      displayName: string;
    }>;
  }>({
    method: "GET",
    url: ASSISTANT_CLIENTS_ASSIGNED,
    queryKey: ["assistant-clients-assigned"],
    enabled: visible && convoType === 'sample',
  });

  const clientOptions = (clientsQuery.data?.data?.clientDetails ?? []).map((c) => ({
    value: c.id,
    label: c.displayName || `${c.firstName} ${c.lastName}`,
  }));

  const { sendMessage } = useVaChatMutations(sessionId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const toggleChat = () => setVisible(!visible);

  const handleClose = () => {
    setConvoType(undefined);
    setShowChats(false);
    setVisible(false);
    setMessages([]);
    setJobUrl('');
    setSelectedClient(null);
    setInput('');
    setIsTyping(false);
    setSessionId(generateSessionId());
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', message: trimmed }]);
    setInput('');
    setIsTyping(true);

    sendMessage.mutate(
      {
        message: trimmed,
        sessionId,
        userId: convoType === 'sample' ? selectedClient?.value : undefined,
        jobUrl: convoType === 'sample' && jobUrl ? jobUrl : undefined,
        type: convoType,
      },
      {
        onSuccess: (data: any) => {
          const aiMessage = data?.data?.message ?? data?.message ?? '';
          setMessages((prev) => [...prev, { role: 'assistant', message: aiMessage }]);
          setIsTyping(false);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', message: 'Sorry, something went wrong. Please try again.' },
          ]);
          setIsTyping(false);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const customRsStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'white',
      color: 'black',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#f0f0f0' : 'white',
      color: 'black',
      cursor: 'pointer',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: 'black',
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999,
    }),
  };

  return (
    <div
      id="va-chat-wrapper"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "va-chat-wrapper") {
          toggleChat();
          e.stopPropagation();
        }
      }}
      data-testid="floating-va-chat"
      className={`fixed flex flex-col items-start max-w-full lg:max-w-[45%] bottom-6 md:bottom-20 z-50
        ${ishomepage ? 'left-6 md:left-6' : 'right-6 md:right-6'}`}
    >
      <div>
        {visible ? (
          <div
            className="h-[700px] w-[90vw] max-w-[600px] bg-white shadow-lg rounded-lg p-4 border border-gray-300 md:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drag-handle cursor-move flex justify-between items-center">
              <h3 className="font-semibold">CVtoCAREER TPC Support</h3>
              <AiOutlineClose
                className="cursor-pointer text-xl"
                onClick={handleClose}
              />
            </div>

            {!showChats ? (
              <div className="p-4 mt-6">
                <p className="text-lg font-semibold mb-4">Hi, how can I help you today?</p>

                <div className="flex gap-4 flex-col md:flex-row">
                  <div
                    className={`cursor-pointer border-2 rounded-xl p-4 w-[200px] h-[180px] transition-all
                      ${convoType === 'direct' ? 'border-career-blue-800 bg-career-blue-100' : 'bg-gray-100 border-gray-300 hover:border-career-blue-300'}`}
                    onClick={() => {
                      setConvoType('direct');
                      setShowChats(true);
                    }}
                  >
                    <p className="font-medium text-career-blue-500 mb-2">Processes</p>
                    <p className="text-sm text-gray-700">
                      Ask me questions about CVtoCAREER processes and TPA roles.
                    </p>
                  </div>

                  <div
                    className={`cursor-pointer border-2 rounded-xl p-4 w-[200px] h-[180px] transition-all
                      ${convoType === 'sample' ? 'border-career-blue-800 bg-career-blue-100' : 'bg-gray-100 border-gray-300 hover:border-career-blue-300'}`}
                    onClick={() => setConvoType('sample')}
                  >
                    <p className="font-medium text-career-blue-500 mb-2">Customer</p>
                    <p className="text-sm text-gray-700">
                      Ask questions about a specific client.
                    </p>
                  </div>
                </div>

                {convoType === 'sample' && (
                  <div className="mt-6">
                    <p className="text-md font-semibold mb-2">Select a client</p>
                    <Select
                      styles={customRsStyles}
                      value={selectedClient}
                      options={clientOptions}
                      isLoading={clientsQuery.isLoading}
                      onChange={(value) => setSelectedClient(value)}
                      placeholder="Search clients..."
                    />
                    <p className="text-md font-semibold mb-2 mt-4">Paste a job link</p>
                    <input
                      type="text"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      placeholder="Paste a job link"
                      className="w-full p-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-career-blue-500"
                    />
                    <Button
                      disabled={!canContinue}
                      type="primary"
                      className={`h-[42px] ${canContinue ? 'bg-career-blue-800' : 'bg-career-blue-300'}`}
                      onClick={() => setShowChats(true)}
                    >
                      Continue
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="h-[85%] overflow-y-auto border p-2 rounded-lg bg-gray-50">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
                    >
                      {msg.role === 'assistant' && (
                        <Avatar className="mr-2 bg-career-blue-800">C</Avatar>
                      )}
                      <div
                        className={`px-3 py-2 max-w-[80%] rounded-lg ${
                          msg.role === 'user' ? 'bg-career-blue-800 text-white' : 'bg-gray-200'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start mb-2">
                      <Avatar className="mr-2 bg-career-blue-800">C</Avatar>
                      <div className="px-3 py-2 bg-gray-200 rounded-lg text-sm text-gray-500 italic">
                        Typing...
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="mt-3 flex max-h-[80px]">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="border-gray-400"
                    disabled={isTyping}
                  />
                  <Button
                    type="primary"
                    disabled={!input.trim() || isTyping}
                    loading={isTyping}
                    onClick={handleSend}
                    className="ml-2 h-[42px] bg-career-blue-800"
                  >
                    Send
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<IoChatbubbleEllipsesOutline className="text-white" />}
            onClick={toggleChat}
            className="shadow-lg bg-career-blue-800"
          />
        )}
      </div>
    </div>
  );
};

export default FloatingVAChat;
