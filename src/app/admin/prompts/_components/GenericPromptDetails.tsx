// components/GenericPromptDetails.tsx
"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import NothingFound from "../../../../../public/svg/nothing-found.svg";
import toast from "react-hot-toast";
import { usePromptsMutations } from "@/hooks/api/admin/prompts";
import Delete from "../../../../../public/gifs/delete-icon-3d.gif";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImSpinner2 } from "react-icons/im";
import { PromptCategory, PromptClientInput, PromptQuestion } from "@/data/ai-prompts";

// --- Import the Generic Interfaces ---
// These should ideally come from a shared types file (e.g., types/ai.ts or types/generic-ai.ts)
// For now, I'll assume they are defined in GenericAIDashboard.tsx or a similarly accessible location.
// Make sure these match the ones defined in GenericAIDashboard.tsx

// --- Props Interface for GenericPromptDetails ---
interface GenericPromptDetailsProps<
  TCategory extends PromptCategory,
  TQuestion extends PromptQuestion,
> {
  setCurrentAction: Dispatch<SetStateAction<string | null>>;
  setActiveComponent: Dispatch<SetStateAction<string>>;
  promptData: TQuestion; // Now generic
  activeCategory: TCategory | undefined; // Now generic
  apiBasePath: string; // Crucial for dynamic API calls
}

const GenericPromptDetails = <
  TCategory extends PromptCategory,
  TQuestion extends PromptQuestion,
>({
  setCurrentAction,
  setActiveComponent,
  promptData,
  activeCategory,
  apiBasePath, // Receive the apiBasePath from GenericAIDashboard
}: GenericPromptDetailsProps<TCategory, TQuestion>) => {
  // --- State Management ---
  const [newPromptData, setNewPromptData] = useState<TQuestion>({
    ...promptData,
  });
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptToDeleteId, setPromptToDeleteId] = useState<string>(""); // Renamed for clarity

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPromptProgress, setDeletingPromptProgress] = useState<
    string | null
  >(null); // Renamed for clarity

  const promptInputTypes: { label: string; value: string }[] = [
    { label: "Text", value: "text" },
    { label: "Textarea", value: "textarea" },
    { label: "Select", value: "select" },
    { label: "Radio", value: "radio" },
    { label: "Checkbox", value: "checkbox" },
  ];

  // --- Functions | Process ---

  // --- TanStack Query Integration ---
  const { updatePrompt, deletePrompt: deletePromptMutation } = usePromptsMutations(apiBasePath);

  // --- Functions | Process ---

  // Function to update the prompt via API
  async function editPrompt() {
    try {
      if (newPromptData?.value?.trim().length === 0) {
        toast.error("Prompt value cannot be empty.");
        return;
      }

      setCurrentAction("Editing prompt!");
      setEditingPrompt(true);

      await updatePrompt.mutateAsync({
        id: newPromptData._id,
        values: newPromptData,
      });

      setEditingPrompt(false);
      setCurrentAction(null);
      toast.success("Edited prompt successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to update prompt.`);
      setCurrentAction(null);
      setEditingPrompt(false);
    }
  }

  // Function to delete the prompt via API
  async function deletePrompt(id: string) {
    try {
      setCurrentAction("Deleting prompt!");
      setDeletingPromptProgress(id);

      await deletePromptMutation.mutateAsync(id);

      setActiveComponent("categoryPrompts"); // Go back to the prompts list
      setIsDeleteModalOpen(false); // Close delete confirmation modal

      setDeletingPromptProgress(null);
      setCurrentAction(null);
      toast.success("Deleted prompt successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to delete prompt.`);
      setCurrentAction(null);
      setDeletingPromptProgress(null);
    }
  }

  // Ensures unique client inputs by 'label'
  function uniqueByLabel(items: PromptClientInput[]): PromptClientInput[] {
    const filtered = Array.from(
      items
        .reduce((result, object) => {
          if (object.label) {
            // Ensure label exists before using as key
            result.set(object.label, object);
          }
          return result;
        }, new Map())
        .values()
    );
    return filtered;
  }

  // Logic to parse prompt value for client inputs (e.g., {input_label})
  function managePromptValue(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skipInitialCheck: boolean = false,
    value: string = newPromptData.value
  ) {
    const newClientInputs: PromptClientInput[] = [];

    if (
      value &&
      value.length > 0 &&
      value.includes("{") &&
      value.includes("}")
    ) {
      const regex = /{([^}]+)}/g; // Matches content inside curly braces
      let match;
      while ((match = regex.exec(value)) !== null) {
        const label = match[1].trim();
        if (label) {
          newClientInputs.push({ label: label, type: "text" }); // Default to 'text' type
        }
      }
    }

    // Merge new inputs with existing ones, preserving types and options
    setNewPromptData((prevData) => {
      const mergedInputs: PromptClientInput[] = [];
      const existingInputMap = new Map(
        (prevData.clientInputs || []).map((input: any) => [input.label, input])
      );

      // Add new inputs, or use existing if label matches
      newClientInputs.forEach((newInput) => {
        const existingInput = existingInputMap.get(newInput.label);
        if (existingInput) {
          mergedInputs.push(existingInput); // Keep existing type and options
          existingInputMap.delete(newInput.label); // Mark as used
        } else {
          mergedInputs.push(newInput); // Add new input
        }
      });

      // Add back any remaining existing inputs that were not found in the new list
      // This is crucial for inputs that might have been manually added/modified
      // and are no longer directly parseable from the prompt value.
      // Be careful with this logic; it depends on whether you want to strictly sync
      // inputs with parsed values or allow manual additions.
      // For now, let's keep it simple: if parsed, only add parsed.
      // If you want to retain manually added inputs that are *not* in the prompt value,
      // you'd need more complex merging.
      // For this generic component, we'll assume parsed inputs are the primary source.
      // If a user removes a {tag} from the prompt, its input should disappear.

      // If `skipInitialCheck` is true (e.g., on paste), we might want to be more aggressive
      // in replacing to avoid duplicates if `useEffect` hasn't caught up.
      return {
        ...prevData,
        clientInputs: uniqueByLabel(mergedInputs), // Apply uniqueness by label
      };
    });
  }

  // Function to add/update options for select/radio/checkbox inputs
  function updateClientInputOptions(
    index: number,
    optionValues: { label: string; value: string }[]
  ) {
    setNewPromptData((d) => {
      const updatedInputs = [...(d.clientInputs || [])];
      if (updatedInputs[index]) {
        updatedInputs[index] = {
          ...updatedInputs[index],
          options: optionValues,
        };
      }
      return { ...d, clientInputs: updatedInputs };
    });
  }

  // --- Effects ---
  useEffect(() => {
    // Re-parse client inputs when the prompt value changes
    managePromptValue(false, newPromptData.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPromptData.value]); // Dependency on newPromptData.value for parsing

  useEffect(() => {
    // Reset form data when the selected prompt changes from parent
    setNewPromptData({ ...promptData });
  }, [promptData]); // Dependency on promptData from props

  return (
    <div className="flex flex-col items-start w-full justify-between border-2 border-gray-200 min-h-[600px] max-h-[700px] max-w-[1024px] rounded-[5px] h-full">
      {/* prompts header */}
      <div className="!h-16 !min-h-16 border-b-gray-200 border-b-2 flex flex-row items-center justify-between px-4 w-full">
        <div className="flex flex-row items-center space-x-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 cursor-pointer"
            onClick={() => {
              setActiveComponent("categoryPrompts"); // Go back to prompts list
              setCurrentAction(null);
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>

          <h3 className="text-16 !font-medium font-sharp-grotesk text-career-black-200">
            Category - /{activeCategory?.name}/
          </h3>
        </div>
        <Image
          src={Delete}
          unoptimized
          className="w-10 h-10 cursor-pointer"
          onClick={() => {
            setPromptToDeleteId(newPromptData._id); // Set ID of prompt to delete
            setIsDeleteModalOpen(true);
            setCurrentAction("Confirm Deletion!");
          }}
          alt="Delete Icon"
        />
      </div>

      {/* prompts body */}
      <div className="body w-full h-full flex flex-col items-start !justify-start overflow-y-hidden">
        <div className="flex flex-row divide-x-2 w-full h-full divide-gray-100 overflow-auto no-scroll-btn">
          {/* Left Panel: Prompt and Client Inputs */}
          <div className="flex flex-col w-[65%] justify-between h-full p-2 overflow-y-auto no-scroll-btn">
            {/* Prompt Textarea */}
            <div className="flex flex-col items-start space-y-2 w-full px-3">
              <h3 className="text-sm text-gray-800 font-medium capitalize">
                Prompt
              </h3>
              <textarea
                value={newPromptData?.value}
                onChange={(e) => {
                  setNewPromptData((d) => ({
                    ...d,
                    value: e.target.value,
                  }));
                }}
                placeholder="Type in query (e.g., 'Generate an article about {topic}')"
                name="prompt"
                id="prompt-textarea"
                cols={30}
                className="p-2 rounded-[5px] placeholder:text-sm outline-none w-full border border-gray-300 focus:border-career-blue-500"
                rows={10}
              ></textarea>
            </div>

            {/* Client Inputs Section */}
            <div className="flex flex-col p-3 h-full space-y-3">
              <h3 className="text-sm text-gray-800 font-medium capitalize">
                Client Inputs
              </h3>

              {newPromptData?.clientInputs &&
              newPromptData?.clientInputs?.length > 0 ? (
                newPromptData.clientInputs.map((input, index) => (
                  <div
                    key={input.label + index} // Use label + index for unique key if labels aren't strictly unique initially
                    className={`flex flex-col space-y-2 items-center w-full bg-gray-100 rounded-lg px-2 ${
                      ["select", "radio", "checkbox"].includes(input.type)
                        ? "pb-2"
                        : ""
                    }`}
                  >
                    <div className="flex flex-row justify-between items-center w-full min-h-[50px] rounded-lg">
                      <span className="text-xs text-black capitalize">
                        {input.label}
                      </span>

                      <div className="min-w-[100px] rounded-md">
                        <Select
                          value={input.type}
                          onValueChange={(value) => {
                            setNewPromptData((d) => {
                              const updatedInputs = [...(d.clientInputs || [])];
                              updatedInputs[index] = {
                                ...updatedInputs[index],
                                type: value as any, // Update type
                                // Clear options if changing to text/textarea
                                options:
                                  value === "text" || value === "textarea"
                                    ? undefined
                                    : updatedInputs[index]?.options,
                              };
                              return {
                                ...d,
                                clientInputs: uniqueByLabel(updatedInputs),
                              };
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue
                              placeholder={`Select type for ${input.label}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {promptInputTypes.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-xs"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Input for Options (if type is select, radio, or checkbox) */}
                    {["select", "radio", "checkbox"].includes(input.type) && (
                      <input
                        type="text"
                        value={
                          input.options
                            ? input.options.map((op) => op.label).join(" | ")
                            : ""
                        }
                        placeholder="Type in options ( | separated)"
                        onChange={(e) => {
                          const options = e.target.value
                            .split(" | ")
                            .map((value) => ({
                              label: value.trim(),
                              value: value.trim(),
                            }));
                          updateClientInputOptions(index, options);
                        }}
                        className="rounded-lg text-sm w-full min-h-[40px] bg-white border border-gray-200 p-2"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center transition-all space-y-4 justify-center w-full h-full">
                  <Image
                    src={NothingFound}
                    className="w-32 h-32"
                    alt="No Inputs Found"
                  />
                  <p className="text-gray-800 text-sm">
                    No client inputs found in prompt value (e.g.
                    &#123;input&#125;)!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Code Output Preview */}
          <div className="flex flex-col h-full w-[35%] overflow-y-auto no-scroll-btn">
            <div className="flex flex-col p-3 h-full space-y-2">
              <h3 className="text-sm text-gray-800 font-medium capitalize">
                Code Output Preview
              </h3>
              <textarea
                disabled
                value={
                  newPromptData?.value.length > 0
                    ? newPromptData?.value
                    : "No code yet!"
                }
                name="prompt-code-output"
                id="prompt-code-output"
                cols={30}
                className="p-2 rounded-[5px] bg-gray-700 text-white text-sm text-left placeholder:text-sm resize-none h-full"
                rows={10}
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* prompts footer */}
      <div className="!h-16 !min-h-16 border-t-gray-200 border-t-2 flex flex-row items-center justify-between px-4 w-full">
        <Button
          className="!rounded-[0.25rem] !w-[300px] max-w-[300px] !h-[80%]"
          onClick={editPrompt}
          size="sm"
          disabled={
            editingPrompt ||
            newPromptData?.value.trim().length === 0 ||
            JSON.stringify(newPromptData) === JSON.stringify(promptData) // Disable if no changes
          }
        >
          {editingPrompt ? (
            <>
              <ImSpinner2 className="mr-2 h-4 w-4 animate-spin" />
              Updating
            </>
          ) : (
            "Update Prompt"
          )}
        </Button>

        <p
          className="text-lg font-semibold text-career-blue-500 transition-all hover:text-blue cursor-pointer font-sharp-grotesk"
          onClick={() => {
            setActiveComponent("categoryPrompts"); // Go back to category prompts view
            setCurrentAction(null);
          }}
        >
          Go back to Prompts!
        </p>
      </div>

      {/* Delete Prompt Confirmation Dialog */}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(isOpen) => {
          setIsDeleteModalOpen(isOpen);
          if (!isOpen) {
            setPromptToDeleteId(""); // Clear the ID when dialog closes
            setCurrentAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm !font-medium font-sharp-grotesk text-gray-800">
              Delete Prompt
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-800 font-medium capitalize pt-2">
              Are you sure you want to delete prompt with ID-{" "}
              <span className="font-bold text-sm text-black">
                {promptToDeleteId}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-between pt-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="sm"
                className="!h-[2.2rem] w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              className="!h-[2.2rem] w-full sm:w-auto"
              onClick={() => {
                if (promptToDeleteId) deletePrompt(promptToDeleteId);
              }}
              disabled={deletingPromptProgress !== null} // Disable if a delete is in progress
            >
              {deletingPromptProgress === promptToDeleteId ? (
                <>
                  <ImSpinner2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete Prompt"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GenericPromptDetails;
