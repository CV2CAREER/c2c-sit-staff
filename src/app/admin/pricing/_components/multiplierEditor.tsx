import React, { useRef, useEffect } from "react";
import { useAdminMutations } from "@/hooks/api/admin.api";

interface MultiplierEditorProps {
  locationId: string;
  currentMultiplier: string | null;
  disabled?: boolean;
}

const MultiplierEditor: React.FC<MultiplierEditorProps> = ({
  locationId,
  currentMultiplier,
  disabled = false,
}) => {
  const { updateMultiplierMutation } = useAdminMutations();
  const mulRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset input value if the currentMultiplier prop changes externally
  useEffect(() => {
    if (mulRef.current) {
      mulRef.current.value = ""; // Clear input when multiplier changes
    }
  }, [currentMultiplier]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mulRef.current || !mulRef.current.value || disabled) return;

    const baseMultiplier = mulRef.current.value;
    updateMultiplierMutation.mutate({
      locationId,
      multiplier: baseMultiplier,
    }, {
      onSuccess: () => {
        formRef.current?.reset();
      }
    });
  };

  return (
    <form
      onSubmit={handleUpdate}
      ref={formRef}
      className="flex flex-col gap-[1rem] justify-end items-center"
    >
      <div>
        Current Multiplier: <span>{currentMultiplier ?? "N/A"}</span>
      </div>
      <div className="flex flex-row gap-[1rem] justify-center items-center">
        <label htmlFor="multiplierInput">Multiplier:</label>
        <input
          id="multiplierInput"
          type="number"
          step="any"
          className="rounded-lg border-opacity-65 border p-1" // Added border for visibility
          ref={mulRef}
          required
          disabled={disabled}
        />
        <button
          className="bg-[#008ED3] text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={disabled}
        >
          Update
        </button>
      </div>
    </form>
  );
};

export default MultiplierEditor;
