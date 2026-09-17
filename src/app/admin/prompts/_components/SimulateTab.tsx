"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Play, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseVariables } from "./PromptMetadataPanel";
import HintMark from "./HintMark";
import { useRunVcsPromptSimulation, VcsPromptSimulationRun } from "../hooks/use-vcs-prompt-simulations";

// Variables like CV_TEXT or JOB_CONTEXT can easily run past 3000 chars —
// give them a tall textarea instead of the cramped single-line input other
// "str" variables (e.g. client_name, tone) get.
const LONG_TEXT_VARIABLE_PATTERN = /text|content|context|description|body|cv|letter|summary/i;

interface SimulateTabProps {
  vcsId: string;
  versionId: string | null;
  versionLabel: string;
  savedPromptText: string;
  hasUnsavedChanges: boolean;
}

const SimulateTab = ({
  vcsId,
  versionId,
  versionLabel,
  savedPromptText,
  hasUnsavedChanges,
}: SimulateTabProps) => {
  const queryClient = useQueryClient();
  const { mutateAsync: runSimulation, isPending } = useRunVcsPromptSimulation();

  const variables = useMemo(() => parseVariables(savedPromptText), [savedPromptText]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [lastRun, setLastRun] = useState<VcsPromptSimulationRun | null>(null);

  const handleRun = async () => {
    if (!versionId) return;
    try {
      const result = await runSimulation({ vcsId, versionId, variables: values });
      setLastRun(result.data);
      queryClient.invalidateQueries({ queryKey: ["vcs-prompts", "simulations", vcsId] });
      queryClient.invalidateQueries({ queryKey: ["vcs-prompts", "all-simulations"] });
      if (result.data.status === "success") {
        toast.success("Simulation complete.");
      } else {
        toast.error(result.data.errorMessage || "Simulation failed.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to run simulation.");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 sm:flex-row">
      <div className="flex w-full flex-col gap-3 border-gray-100 sm:w-64 sm:shrink-0 sm:border-r sm:pr-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Variable Inputs · {versionLabel}
          <HintMark text="Fill in a value for each {{variable}} to test how the AI responds — this doesn't affect production." />
        </p>

        {hasUnsavedChanges && (
          <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            Simulating the last saved version — save your draft to include recent edits.
          </div>
        )}

        {variables.length === 0 ? (
          <p className="text-xs text-gray-400">No {"{{variables}}"} in this prompt.</p>
        ) : (
          variables.map((variable) => {
            const isLongText = LONG_TEXT_VARIABLE_PATTERN.test(variable.name);
            return (
              <div key={variable.name} className="flex flex-col gap-1">
                <label className="font-mono text-xs text-gray-600">{variable.name}</label>
                {variable.type === "arr" || isLongText ? (
                  <Textarea
                    value={values[variable.name] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [variable.name]: e.target.value }))
                    }
                    className={`text-xs ${isLongText ? "min-h-[180px]" : "min-h-[70px]"}`}
                    placeholder={
                      variable.type === "arr" && !isLongText ? "e.g. finance, audit, risk" : undefined
                    }
                  />
                ) : (
                  <Input
                    value={values[variable.name] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [variable.name]: e.target.value }))
                    }
                    className="text-xs"
                  />
                )}
              </div>
            );
          })
        )}

        <Button
          className="gap-1.5"
          onClick={handleRun}
          disabled={!versionId || isPending}
        >
          <Play size={14} />
          {isPending ? "Running..." : "Run simulation"}
          <HintMark
            text="Sends this prompt and the values above to the AI as a test run — doesn't touch production."
            className="bg-white/20 text-white hover:bg-white/30"
          />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Simulation output
            <HintMark text="What the AI returned for the values you entered on the left." />
          </p>
          {lastRun && (
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                lastRun.status === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {lastRun.status === "success" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {lastRun.status === "success" ? `${lastRun.durationMs}ms` : "Failed"}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-4">
          {!lastRun ? (
            <p className="text-sm text-gray-400">
              Run a simulation to see output here. Output is saved to the History tab.
            </p>
          ) : lastRun.status === "failed" ? (
            <p className="whitespace-pre-wrap font-mono text-xs text-red-600">
              {lastRun.errorMessage}
            </p>
          ) : (
            <p className="whitespace-pre-wrap font-mono text-xs text-gray-700">{lastRun.output}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulateTab;
