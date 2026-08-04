"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

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
  category: string;
  model: string;
  temperature: string;
  maxTokens: string;
  onCategoryChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onTemperatureChange: (value: string) => void;
  onMaxTokensChange: (value: string) => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
    {children}
  </div>
);

const PromptMetadataPanel = ({
  name,
  promptText,
  category,
  model,
  temperature,
  maxTokens,
  onCategoryChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
}: PromptMetadataPanelProps) => {
  const variables = useMemo(() => parseVariables(promptText), [promptText]);

  return (
    <Card className="w-full rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] sm:w-64 sm:shrink-0">
    <CardContent className="flex flex-col gap-4 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Prompt Metadata
      </p>

      <Field label="Name">
        <Input value={name} readOnly disabled className="font-mono text-xs" />
      </Field>

      <Field label="Category">
        <Input
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          placeholder="e.g. CV Production"
        />
      </Field>

      <Field label="Variables">
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

      <Field label="Model">
        <Input
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder="Not configured"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Temp">
          <Input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => onTemperatureChange(e.target.value)}
            placeholder="—"
          />
        </Field>
        <Field label="Max tokens">
          <Input
            type="number"
            min="1"
            value={maxTokens}
            onChange={(e) => onMaxTokensChange(e.target.value)}
            placeholder="—"
          />
        </Field>
      </div>
    </CardContent>
    </Card>
  );
};

export default PromptMetadataPanel;
