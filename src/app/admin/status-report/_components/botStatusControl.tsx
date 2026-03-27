"use client";

import React from "react";
import Switch from "@mui/material/Switch";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { BotName } from "@/types/admin.types";

interface BotStatusControlProps {
  botName: BotName;
  status: "On" | "Off" | "Unknown";
  isLoading: boolean;
  botError?: string | null;
  onToggle: (botName: BotName) => void;
}

export const BotStatusControl: React.FC<BotStatusControlProps> = ({
  botName,
  status,
  isLoading,
  onToggle,
  botError,
}) => (
  <div className="w-full bg-[#e5e7eb] p-6 rounded-2xl mt-6">
    <div className="flex flex-col items-center justify-between">
      <h3 className="text-24 !font-medium font-sharp-grotesk text-career-black-200 mb-4">
        {botName} Bot Status
      </h3>
      {isLoading ? (
        <CircularProgress size={24} />
      ) : status === "Unknown" || botError ? (
        <span className="text-sm text-red-500">
          {botError ? `Error fetching ${botName} bot` : "Status unavailable"}
        </span>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            gap: 1,
          }}
        >
          <span>Off</span>
          <Switch
            checked={status === "On"}
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
            onChange={() => onToggle(botName)}
            disabled={isLoading}
          />
          <span>On</span>
        </Box>
      )}
    </div>
  </div>
);
