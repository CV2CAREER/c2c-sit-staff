"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HintMark from "./HintMark";
import { getPromptUsedByLabel } from "./promptUsedBy";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Every model a prompt can be routed to — each one resolves, on the backend,
// to its own DigitalOcean Gradient agent (own endpoint + access key; DO has
// no single endpoint where a model param switches models on an agent-bound
// call). 'gpt-oss-120b' is the shared default every prompt uses until it's
// changed here; 'claude-sonnet-4.6' is a second, already-configured agent.
// Keep this in sync with SUPPORTED_AI_MODELS in the backend's
// src/config/ai-models.ts (c2c-iat-staff-backend) — the two aren't derived
// from a shared source since they live in separate repos. Adding a third
// model: create its DO agent, wire its endpoint/key into the backend, add it
// there, then add its name here.
const AVAILABLE_MODELS = ["gpt-oss-120b", "claude-sonnet-4.6"];

// No override UI in this phase — type is inferred from the variable name
// each time the panel renders, not persisted.
const inferVariableType = (name: string): "arr" | "str" => (/s$/i.test(name) ? "arr" : "str");

export const parseVariables = (promptText: string) => {
  const seen = new Set<string>();
  const variables: { name: string; type: "arr" | "str" }[] = [];

  for (const match of promptText.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);
    variables.push({ name, type: inferVariableType(name) });
  }

  return variables;
};

interface PromptMetadataPanelProps {
  name: string;
  promptText: string;
  model: string;
  onModelChange: (value: string) => void;
}

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
      {label}
      {hint && <HintMark text={hint} />}
    </label>
    {children}
  </div>
);

const PromptMetadataPanel = ({
  name,
  promptText,
  model,
  onModelChange,
}: PromptMetadataPanelProps) => {
  const variables = useMemo(() => parseVariables(promptText), [promptText]);

  return (
    <Card className="w-full rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] sm:w-64 sm:shrink-0">
    <CardContent className="flex flex-col gap-4 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Prompt Metadata
      </p>

      <Field label="Name" hint="The prompt's key — read-only here, set when it was created.">
        <Input value={name} readOnly disabled className="font-mono text-xs" />
      </Field>

      <Field
        label="Variables"
        hint="{{placeholders}} detected in the prompt text — each one must be supplied when the AI runs it."
      >
        {variables.length === 0 ? (
          <p className="text-xs text-gray-400">No {"{{variables}}"} in this prompt.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {variables.map((variable) => (
              <div
                key={variable.name}
                className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-2 py-1"
              >
                <span className="truncate font-mono text-xs text-primary">
                  {"{{"}
                  {variable.name}
                  {"}}"}
                </span>
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {variable.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field
        label="Model"
        hint="Which AI model this prompt actually runs on. Leave unset to use the shared default — switching this takes effect on the next AI call, no redeploy needed."
      >
        <Select value={model || undefined} onValueChange={onModelChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Not configured" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Used By"
        hint="The feature or service that calls this prompt key."
      >
        <p className="text-xs text-gray-500">Changes here affect all services listed below.</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          {getPromptUsedByLabel(name)}
        </div>
      </Field>
    </CardContent>
    </Card>
  );
};

export default PromptMetadataPanel;
