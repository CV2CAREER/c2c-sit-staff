"use client";

import { useEffect, useMemo, useState } from "react";
import AnimatedButton from "@/components/ui/animated-button";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import { allPersonas, isPersona, Persona, viewAsRules, ViewAsRules } from "@/constants/viewAsRules";
import { usePersonaSettings } from "@/hooks/usePersonaSettings";

type LoadingState = "idle" | "loading-data" | "saving-data" | "saved-data";

const normalizeRules = (rules?: ViewAsRules) => {
  return rules ?? viewAsRules;
};

export default function PersonaViewAsSettings() {
  const { rules, isLoading, saveRule } = usePersonaSettings();
  const [editingPersona, setEditingPersona] = useState<Persona>("admin");
  const [currentRules, setCurrentRules] = useState<ViewAsRules>(viewAsRules);
  const [loadingState, setLoadingState] = useState<LoadingState>("loading-data");

  useEffect(() => {
    if (isLoading) {
      setLoadingState("loading-data");
      return;
    }

    setCurrentRules(normalizeRules(rules));
    setLoadingState("idle");
  }, [isLoading, rules]);

  const activeTargets = useMemo(() => currentRules[editingPersona] ?? [], [currentRules, editingPersona]);

  const toggleViewAccess = (target: Persona | "*") => {
    setCurrentRules((prev) => {
      const existing = prev[editingPersona] ?? [];
      const hasWildcard = existing.includes("*" as Persona);

      if (target === "*") {
        return {
          ...prev,
          [editingPersona]: hasWildcard ? [] : ["*" as Persona],
        };
      }

      if (hasWildcard) {
        return {
          ...prev,
          [editingPersona]: [target as Persona],
        };
      }

      const next = existing.includes(target as Persona)
        ? existing.filter((item) => item !== target)
        : [...existing, target as Persona];

      return {
        ...prev,
        [editingPersona]: next,
      };
    });
  };

  const saveChanges = async () => {
    setLoadingState("saving-data");
    saveRule.mutate(
      {
        persona: editingPersona,
        allowedTargets: currentRules[editingPersona] as Array<Persona | "*">,
      },
      {
        onSuccess: () => {
          setLoadingState("saved-data");
          setTimeout(() => setLoadingState("idle"), 500);
        },
        onError: () => {
          setLoadingState("idle");
        },
      },
    );
  };

  if (loadingState === "loading-data") {
    return (
      <div className="w-full p-6 space-y-6 bg-white rounded-sm shadow-sm">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6 bg-white rounded-sm shadow-sm">
      <div className="space-y-2">
        <p className="text-gray-600">
          Configure which roles each persona can view the system as
        </p>
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Configuring view-as rules for:
        </label>
        <select
          value={editingPersona}
          onChange={(event) => {
            if (isPersona(event.target.value)) {
              setEditingPersona(event.target.value);
            }
          }}
          className="block w-full px-4 py-2 text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          {allPersonas.map((persona) => (
            <option key={persona} value={persona} className="capitalize">
              {persona}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Allowed View-As Targets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer">
            <Checkbox
              checked={activeTargets.includes("*" as Persona)}
              onCheckedChange={() => toggleViewAccess("*")}
            />
            <span>
              <span className="block font-medium">Wildcard Access (*)</span>
              <span className="block text-sm text-gray-500">Can view as any role</span>
            </span>
          </label>

          {allPersonas.map((persona) =>
            persona !== editingPersona ? (
              <label key={persona} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer">
                <Checkbox
                  checked={activeTargets.includes("*" as Persona) || activeTargets.includes(persona)}
                  onCheckedChange={() => toggleViewAccess(persona)}
                />
                <span>
                  <span className="block font-medium capitalize">{persona}</span>
                  <span className="block text-sm text-gray-500">Can view as {persona.replace("_", " ")}</span>
                </span>
              </label>
            ) : null,
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <AnimatedButton
          onClick={saveChanges}
          isLoading={loadingState === "saving-data"}
          isSuccess={loadingState === "saved-data"}
          loadingLabel="Saving..."
          label="Save Rules"
          variant="primary"
          className="!rounded-full"
        />
      </div>
    </div>
  );
}
