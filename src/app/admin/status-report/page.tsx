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
  const [botStatus, setBotStatus] = useState<BotStatusState>(
    () =>
      Object.fromEntries(
        BOT_NAMES.map((name) => [name, "Unknown"]),
      ) as BotStatusState,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_error, setError] = useState<string | null>(null);

  // --- Centralized API Hooks (Queries) ---
  const { botStatusDomain: seekDomain } = useAdminQueries({ fetchBotStatus: true, botName: "Seek" });
  const { botStatusDomain: joraDomain } = useAdminQueries({ fetchBotStatus: true, botName: "Jora" });
  const { botStatusDomain: reedDomain } = useAdminQueries({ fetchBotStatus: true, botName: "Reed" });
  const { botStatusDomain: jobserveDomain } = useAdminQueries({ fetchBotStatus: true, botName: "Jobserve" });
  
  const { answerModeDomain } = useAdminQueries({ fetchAnswerMode: true });
  const { data: answerModeData, isLoading: isAnswerModeDataLoading, error: answerModeError } = answerModeDomain;

  // --- Centralized API Hooks (Mutations) ---
  const { toggleBotMutation, updateAnswerModeMutation } = useAdminMutations();

  // Check if any bot is still loading
  const isBotStatusLoading = seekDomain.isLoading || joraDomain.isLoading || jobserveDomain.isLoading;
  const botStatusError = seekDomain.error || joraDomain.error || jobserveDomain.error;

  // Update bot status when individual queries complete
  useEffect(() => {
    const newBotStatus: Partial<BotStatusState> = {};
    let hasUpdates = false;

    if (seekDomain.data) {
      newBotStatus["Seek"] = seekDomain.data === "On" ? "On" : "Off";
      hasUpdates = true;
    }
    if (joraDomain.data) {
      newBotStatus["Jora"] = joraDomain.data === "On" ? "On" : "Off";
      hasUpdates = true;
    }
    if (reedDomain.data) {
      newBotStatus["Reed"] = reedDomain.data === "On" ? "On" : "Off";
      hasUpdates = true;
    }
    if (jobserveDomain.data) {
      newBotStatus["Jobserve"] = jobserveDomain.data === "On" ? "On" : "Off";
      hasUpdates = true;
    }

    if (hasUpdates) {
      setBotStatus((prev) => ({ ...prev, ...newBotStatus }));
    }

    // Handle errors
    const errorMessages = [];
    if (seekDomain.error) errorMessages.push(`Seek: ${seekDomain.error.message}`);
    if (joraDomain.error) errorMessages.push(`Jora: ${joraDomain.error.message}`);
    if (reedDomain.error) errorMessages.push(`Reed: ${reedDomain.error.message}`);
    if (jobserveDomain.error) errorMessages.push(`Jobserve: ${jobserveDomain.error.message}`);

    if (errorMessages.length > 0) {
      setError(errorMessages.join(", "));
    } else {
      setError(null);
    }
  }, [seekDomain.data, joraDomain.data, reedDomain.data, jobserveDomain.data, seekDomain.error, joraDomain.error, reedDomain.error, jobserveDomain.error]);

  const getBotError = (botName: string): string | null => {
    switch (botName) {
      case "Seek": return seekDomain.error?.message || null;
      case "Jora": return joraDomain.error?.message || null;
      case "Reed": return reedDomain.error?.message || null;
      case "Jobserve": return jobserveDomain.error?.message || null;
      default: return null;
    }
  };

  const handleAnswerModeToggle = () => {
    if (answerMode && !updateAnswerModeMutation.isPending && answerModeData && answerModeData[0]) {
      const target = answerModeData[0];
      const nextMode = answerMode === "AI" ? "DB" : "AI";
      const statusToSend = nextMode === "AI" ? "True" : "False";

      updateAnswerModeMutation.mutate(
        { id: target.id, description: target.description, status: statusToSend },
        {
          onSuccess: () => {
            toast.success(`Answer mode updated to ${nextMode}`);
            setAnswerMode(nextMode);
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
    const currentStatus = botStatus[botName];
    const newAction = currentStatus === "On" ? "stop" : "start";

    toggleBotMutation.mutate(
      { bot: botName.toLowerCase(), action: newAction },
      {
        onSuccess: () => {
          toast.success(`${botName} bot ${newAction}ed successfully`);
          const expectedNewStatus = newAction === "start" ? "On" : "Off";
          setBotStatus((prev) => ({ ...prev, [botName]: expectedNewStatus }));
        },
        onError: (err) => {
          toast.error(err.message || `Failed to ${newAction} ${botName} bot`);
        }
      }
    );
  };

  useEffect(() => {
    if (answerModeData && answerModeData[0]) {
      setAnswerMode(answerModeData[0].status === "True" ? "AI" : "DB");
    }
  }, [answerModeData]);

  useEffect(() => {
    if (botStatusError) setError("Failed to load bot status data");
  }, [botStatusError]);

  useEffect(() => {
    if (answerModeError) setError("Failed to load answer mode data");
  }, [answerModeError]);

  const isInitialLoading = isBotStatusLoading || isAnswerModeDataLoading;

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
                  isLoading={
                    toggleBotMutation.isPending &&
                    toggleBotMutation.variables?.bot === bot.toLowerCase()
                  }
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
