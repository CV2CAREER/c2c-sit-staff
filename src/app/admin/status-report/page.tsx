/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import Switch from "@mui/material/Switch";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import AggregatorsThrottle from "@/components/reusable/throttle";
import { BOT_NAMES } from "@/utils/constants";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import TableManager from "./_components/tableManager";
import PageHeader from "@/components/PageHeader/PageHeader";
import { BotStatusControl } from "./_components/botStatusControl";
import toast from "react-hot-toast";

type BotName = (typeof BOT_NAMES)[number];
type BotStatusState = Record<BotName, "On" | "Off" | "Unknown">;
type AnswerModeState = "AI" | "DB" | null;

const StatusReportPage = () => {
  const [answerMode, setAnswerMode] = useState<AnswerModeState>(null);
  const [togglingBot, setTogglingBot] = useState<BotName | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatusState>(
    () =>
      Object.fromEntries(
        BOT_NAMES.map((name) => [name, "Unknown"]),
      ) as BotStatusState,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_error, setError] = useState<string | null>(null);

  // --- Centralized API Hooks (Queries) ---
  const { 
    botStatusDomain: consolidatedBotDomain,
    answerModeDomain: consolidatedAnswerDomain,
    adminStatusDomain 
  } = useAdminQueries({ 
    fetchAdminStatus: true,
    fetchBotStatus: true, // We still use this to trigger the mapping in admin.api.ts
  });
  
  // --- Centralized API Hooks (Mutations) ---
  const { toggleBotMutation, updateAnswerModeMutation } = useAdminMutations();

  const isBotStatusLoading = adminStatusDomain.isLoading;
  const botStatusError = adminStatusDomain.error;

  // Update bot status when consolidated data changes
  useEffect(() => {
    if (consolidatedBotDomain.data) {
      const status = consolidatedBotDomain.data.status as BotStatusState[BotName];
      setBotStatus(prev => {
        const next = { ...prev };
        BOT_NAMES.forEach(name => {
          next[name] = status;
        });
        return next;
      });
    }

    if (botStatusError) {
      setError(`Backend error: ${botStatusError.message}`);
    } else {
      setError(null);
    }
  }, [consolidatedBotDomain.data?.status, botStatusError]);

  const getBotError = (botName: string): string | null => {
    return botStatusError?.message || null;
  };

  const handleAnswerModeToggle = () => {
    if (answerMode && !updateAnswerModeMutation.isPending) {
      const nextMode = answerMode === "AI" ? "db" : "ai";

      updateAnswerModeMutation.mutate(
        { questionAnswerMode: nextMode },
        {
          onSuccess: () => {
            toast.success(`Answer mode updated to ${nextMode.toUpperCase()}`);
            setAnswerMode(nextMode.toUpperCase() as AnswerModeState);
          },
          onError: (err) => {
            setError(`Failed to update answer mode: ${err.message}`);
            toast.error("Failed to update answer mode");
          }
        }
      );
    }
  };

  const handleBotToggle = (botName: BotName) => {
    if (toggleBotMutation.isPending) return;

    const currentStatus = botStatus[botName];
    const nextEnabled = currentStatus !== "On";
    setTogglingBot(botName);

    toggleBotMutation.mutate(
      { botEnabled: nextEnabled },
      {
        onSuccess: () => {
          toast.success(`Bots ${nextEnabled ? "started" : "stopped"} successfully`);
          const expectedNewStatus = nextEnabled ? "On" : "Off";
          setBotStatus((prev) => {
            const next = { ...prev };
            BOT_NAMES.forEach(name => {
              next[name] = expectedNewStatus;
            });
            return next;
          });
          // Re-pull the authoritative status right away rather than trusting
          // the next 15s poll — otherwise an in-flight poll response from
          // before the toggle can land after it and stomp this update back
          // to the old value.
          adminStatusDomain.refetch?.();
        },
        onError: (err) => {
          toast.error(err.message || `Failed to ${nextEnabled ? "start" : "stop"} bots`);
        },
        onSettled: () => {
          setTogglingBot(null);
        },
      }
    );
  };

  useEffect(() => {
    if (consolidatedAnswerDomain.data && consolidatedAnswerDomain.data[0]) {
      setAnswerMode(consolidatedAnswerDomain.data[0].mode.toUpperCase() as AnswerModeState);
    }
  }, [consolidatedAnswerDomain.data]);

  useEffect(() => {
    const pollId = window.setInterval(() => {
      adminStatusDomain.refetch?.();
    }, 15000);

    return () => window.clearInterval(pollId);
  }, [adminStatusDomain.refetch]);

  const isInitialLoading = isBotStatusLoading || consolidatedAnswerDomain.isLoading;

  return (
    <div className="flex flex-col gap-8 mt-8">
      <PageHeader title="Status Report" />

      <div className="w-full bg-white p-6 rounded-2xl mt-6">
        <div className="flex flex-col items-center justify-between">
          <h3 className="text-lg text-career-black-200 mb-4 font-semibold">
            Question Answer Mode
          </h3>
          {isInitialLoading ? (
            <CircularProgress />
          ) : answerMode ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                gap: 1,
              }}
            >
              <span>DB</span>
              <Switch
                checked={answerMode === "AI"}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "rgb(34 197 94)",
                    "&:hover": { backgroundColor: "rgba(34, 197, 94, 0.08)" },
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "rgb(34 197 94)",
                  },
                  "& .MuiSwitch-switchBase": {
                    color: "rgb(239 68 68)",
                    "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.08)" },
                  },
                  "& .MuiSwitch-switchBase + .MuiSwitch-track": {
                    backgroundColor: "rgb(239 68 68)",
                  },
                }}
                onChange={handleAnswerModeToggle}
                disabled={updateAnswerModeMutation.isPending}
              />
              <span>AI</span>
            </Box>
          ) : (
            <span className="text-gray-500">
              Answer mode status unavailable.
            </span>
          )}
        </div>
      </div>

      <AggregatorsThrottle />
      <TableManager />
      <div className="">
        {isInitialLoading ? (
          <div className="flex flex-col gap-4 justify-center items-center h-32">
            <h3 className="text-lg font-semibold">Bot Controls</h3>
            <CircularProgress size={40} />
          </div>
        ) : (
          <div className="flex flex-col text-left gap-6 bg-white rounded-3xl p-8 mb-12">
            <h3 className="text-lg font-semibold">Bot Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {BOT_NAMES.map((bot: BotName) => (
                <BotStatusControl
                  key={bot}
                  botName={bot}
                  status={botStatus[bot]}
                  isLoading={toggleBotMutation.isPending && togglingBot === bot}
                  botError={getBotError(bot)}
                  onToggle={handleBotToggle}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusReportPage;
