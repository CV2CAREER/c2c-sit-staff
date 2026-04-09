"use client";

// Import core React hooks and types
import { Dispatch, SetStateAction, useEffect, useState } from "react";
// Import UI assets
import NothingFound from "../../../../../public/svg/nothing-found.svg";
// Import UI components and styling
import toast from "react-hot-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImSpinner2 } from "react-icons/im"; // Assuming react-icons is installed
import { usePromptsMutations } from "@/hooks/api/admin/prompts";

// --- Define Generic Interfaces ---
// These interfaces define the minimum structure required for the component's logic.
// All specific PromptCategory and PromptQuestion types from your different AI modules
// must extend these generic interfaces.

interface GenericCategoryData {
  _id: string;
  name: string;
  // This is crucial: the generic category needs to have a 'prompts' array
  // which will hold GenericPromptQuestion objects.
  prompts: GenericPromptQuestion[];
  [key: string]: any; // Allow for other specific properties
}

interface GenericPromptQuestion {
  _id: string;
  value: string;
  // Client inputs are a bit complex, let's define a generic for them too
  clientInputs?: GenericClientInput[];
  [key: string]: any; // Allow for other specific properties
}

interface GenericClientInput {
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox";
  options?: { label: string; value: string }[];
  [key: string]: any; // Allow for other specific properties
}

// --- Component Props Interface with Generics ---
// The component itself will be generic over TCategory and TQuestion,
// ensuring type safety while allowing different concrete types.

interface CategoryPromptsProps<
  TCategory extends GenericCategoryData,
  TQuestion extends GenericPromptQuestion,
> {
  setCurrentAction: Dispatch<SetStateAction<string | null>>;
  setActiveComponent: Dispatch<SetStateAction<string>>;
  setActivePrompt: Dispatch<SetStateAction<TQuestion | undefined>>; // Use TQuestion here
  categoryData: TCategory; // Use TCategory here
  apiBasePath: string; // The dynamic part of the API URL (e.g., "prompts/aq-ai")
}

// --- The Generic CategoryPrompts Component ---
const CategoryPrompts = <
  TCategory extends GenericCategoryData,
  TQuestion extends GenericPromptQuestion,
>({
  setCurrentAction,
  setActiveComponent,
  setActivePrompt,
  categoryData,
  apiBasePath, // Receive the dynamic API base path
}: CategoryPromptsProps<TCategory, TQuestion>) => {
  // State for prompts specific to this component's active category
  const [allPrompts, setAllPrompts] = useState<TQuestion[] | null>(null); // Use TQuestion[]
  const [filteredPrompts, setFilteredPrompts] = useState<TQuestion[] | null>(
    null,
  ); // Use TQuestion[]

  // Modals and forms state remain largely the same, but with correct typing for newPromptData
  const [onAddPromptModal, setOnAddPromptModal] = useState(false);
  const [newPromptData, setNewPromptData] = useState<TQuestion | null>(null); // Use TQuestion
  const [addingPrompt, setAddingPrompt] = useState(false);

  const promptInputTypes: { label: string; value: string }[] = [
    { label: "Text", value: "text" },
    { label: "Textarea", value: "textarea" },
    { label: "Select", value: "select" },
    { label: "Radio", value: "radio" },
    { label: "Checkbox", value: "checkbox" },
  ];

  // --- TanStack Query Integration ---
  const { createPrompt } = usePromptsMutations(apiBasePath);

  // --- Functions | Process ---

  // Refactored addNewPrompt to use the dynamic apiBasePath
  async function addNewPrompt() {
    try {
      if (newPromptData && newPromptData?.value?.trim().length > 0) {
        setCurrentAction("Adding prompt!");
        setAddingPrompt(true);

        await createPrompt.mutateAsync({
          categoryId: categoryData._id,
          value: newPromptData.value,
          clientInputs: newPromptData.clientInputs,
        });

        setAddingPrompt(false);
        setNewPromptData(null);
        setCurrentAction(null);
        setActiveComponent("prompts"); // Go back to the prompt list view
        setOnAddPromptModal(false);
        toast.success("Added prompt successfully!");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to add prompt.`);
      setCurrentAction(null);
      setAddingPrompt(false);
    }
  }

  // Type the 'items' parameter correctly for uniqueByValue
  function uniqueByValue(items: GenericClientInput[]): GenericClientInput[] {
    const filtered = Array.from(
      items
        .reduce((result, object) => {
          result.set(object.label, object);
          return result;
        }, new Map<string, GenericClientInput>()) // Specify map types
        .values(),
    );
    return filtered;
  }

  // Ensure addValuesToOptions uses GenericClientInput and updates newPromptData correctly
  function addValuesToOptions(
    index: number,
    values: { label: string; value: string }[],
  ) {
    setNewPromptData((prevData) => {
      if (
        !prevData ||
        !prevData.clientInputs ||
        !prevData.clientInputs[index]
      ) {
        return prevData;
      }
      const updatedClientInputs = [...prevData.clientInputs];
      updatedClientInputs[index] = {
        ...updatedClientInputs[index],
        options: values,
      };
      return {
        ...prevData,
        clientInputs: updatedClientInputs,
      } as TQuestion; // Cast back to TQuestion
    });
  }

  // Ensure managePromptValue correctly updates newPromptData type
  function managePromptValue(
    skip: boolean = false,
    value = newPromptData?.value,
  ) {
    if (value && value?.length > 0) {
      const clientInputs: GenericClientInput[] = []; // Use GenericClientInput

      if (value.includes("{") && value.includes("}")) {
        const position: { letter: string; index: number }[] = [];
        value.split("").forEach((l, index) => {
          if (l === "{" || l === "}") {
            position.push({
              letter: l,
              index: index,
            });
          }
        });
        const sortedPositions = position.sort((a, b) => {
          return a.index - b.index;
        });

        for (let i = 0; i < sortedPositions.length; i++) {
          const pos = sortedPositions[i];
          const nextPos = sortedPositions[i + 1];
          if (pos.letter !== "{") {
            continue;
          }
          if (nextPos && nextPos.letter === "}") {
            const newText = value.substring(pos.index + 1, nextPos.index);
            if (nextPos.index === value.length - 1 || skip === true) {
              clientInputs.push({
                label: newText,
                type: "text", // Default type
              });

              setNewPromptData((d: TQuestion | null) => {
                // Use TQuestion here
                if (!d) {
                  // If d is null, we need to initialize it.
                  // This might require a default/initial TQuestion object
                  // to be passed or constructed. For now, a basic structure.
                  // IMPORTANT: You might need to adjust this initialization
                  // based on the actual structure of your TQuestion type.
                  return {
                    _id: "", // Or generate new ID
                    value: value,
                    clientInputs: uniqueByValue(clientInputs),
                  } as TQuestion;
                }
                return {
                  ...d,
                  clientInputs: uniqueByValue([
                    ...(d.clientInputs || []),
                    ...clientInputs,
                  ]),
                };
              });
            }
          }
        }
      }
    }
  }

  // --- Effects ---
  useEffect(() => {
    // When categoryData changes, update the prompts shown
    setAllPrompts(categoryData.prompts as TQuestion[]); // Cast to TQuestion[]
    setFilteredPrompts(categoryData.prompts as TQuestion[]); // Cast to TQuestion[]
  }, [categoryData]);

  useEffect(() => {
    managePromptValue(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPromptData?.value]);

  // --- Render JSX ---
  return (
    <div className="flex flex-col items-start w-full justify-between border-2 border-gray-200 min-h-[600px] max-h-[600px] max-w-[1024px] rounded-[5px] h-full">
      {/* prompts header */}
      <div className="!h-16 !min-h-16 border-b-gray-200 border-b-2 flex flex-row items-center justify-between px-4 w-full">
        <h3 className="text-16 !font-medium font-sharp-grotesk text-career-black-200">
          Category - /{categoryData.name}/
        </h3>
      </div>
      {/* prompts body */}
      {allPrompts && allPrompts?.length > 0 ? (
        <div className="body w-full h-screen max-h-fit px-4 flex flex-col items-start !justify-start overflow-y-hidden py-4">
          <div className="w-full flex flex-row justify-end">
            <input
              onChange={(e) => {
                if (e.target.value.length > 0) {
                  setFilteredPrompts(() => {
                    return (allPrompts || []).filter(
                      (
                        c, // Ensure allPrompts is not null
                      ) =>
                        c.value.toLowerCase().includes(e.target.value.trim()),
                    );
                  });
                } else setFilteredPrompts(allPrompts);
              }}
              className="!h-6 pl-2 min-h-[40px] w-[200px] outline-none border border-gray-600 focus:border-career-blue-500 rounded-[5px]"
              type="text"
              placeholder="Search"
            />
          </div>
          {filteredPrompts && filteredPrompts?.length > 0 ? (
            <div className="w-full h-full flex flex-col items-start overflow-y-auto no-scroll-btn gap-y-4 pt-3">
              {filteredPrompts?.map((prompt, index) => {
                return (
                  <div
                    className="flex flex-row items-end space-x-2 w-full"
                    key={index}
                  >
                    <div className="flex flex-col space-y-1 w-full">
                      <h3 className="text-xs text-gray-500 capitalize">
                        {index + 1}.
                      </h3>
                      <input
                        disabled
                        className="!h-6 pl-2 min-h-[52px] min-w-[200px] w-full outline-none border border-gray-600 focus:border-career-blue-500 rounded-[5px]"
                        type="text"
                        value={prompt?.value}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="!rounded-[0.25rem] !w-[80px]"
                      onClick={() => {
                        setActivePrompt(prompt);
                        setActiveComponent("promptDetails");
                      }}
                    >
                      View
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 justify-center w-full h-full">
              <Image
                src={NothingFound}
                width={128}
                height={128}
                className="w-32 h-32"
                alt="Nothing found"
              />
              <p className="text-gray-800 text-sm">
                No matching prompts found...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="body w-full h-screen max-h-fit px-4 flex flex-col items-start !justify-start overflow-y-hidden py-4">
          <div className="flex flex-col items-center space-y-4 justify-center w-full h-full">
            <Image
              src={NothingFound}
              width={128}
              height={128}
              className="w-32 h-32"
              alt="No prompts found"
            />
            <p className="text-gray-800 text-sm">No prompts found...</p>
          </div>
        </div>
      )}

      {/* prompts footer */}
      <div className="!h-16 !min-h-16 border-t-gray-100 border-t-2 flex flex-row items-center justify-between px-4 w-full">
        <Button
          className="!rounded-[0.25rem] !w-[300px] max-w-[300px] !h-[80%]"
          onClick={() => {
            setOnAddPromptModal(true);
            setCurrentAction("Enter prompt details!");
          }}
        >
          Add Prompt
        </Button>

        <div className="flex flex-col p-3 h-[70px]">
          <Button
            variant="outline"
            className="!rounded-[0.25rem] !h-[40px] !w-full transition-all"
            onClick={() => {
              setActiveComponent("simulation");
            }}
          >
            View Simulations
          </Button>
        </div>
      </div>

      {/* modals */}

      {/* add prompt */}
      <Dialog
        open={onAddPromptModal}
        onOpenChange={(isOpen) => {
          setOnAddPromptModal(isOpen);
          if (!isOpen) {
            setCurrentAction(null);
            setNewPromptData(null); // Reset data when modal closes
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col p-0">
          <DialogHeader className="px-3 py-3 border-b border-b-gray-200">
            <DialogTitle className="text-sm !font-medium font-sharp-grotesk text-gray-800">
              Add Prompt
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-row divide-x-2 w-full flex-grow divide-gray-100 overflow-hidden">
            <div className="flex flex-col w-full justify-between h-full p-2 overflow-y-auto no-scroll-btn">
              {/* form */}
              <div className="flex flex-col items-start space-y-1 w-fit px-3">
                <h3 className="text-xs text-gray-800 font-medium capitalize">
                  Prompt
                </h3>
                <textarea
                  value={newPromptData?.value || ""}
                  onChange={(e) => {
                    if (
                      (e.nativeEvent as InputEvent).inputType?.includes(
                        // Optional chaining for inputType
                        "insertFromPaste",
                      )
                    ) {
                      managePromptValue(true, e.target.value);
                    }
                    setNewPromptData((d) => {
                      // Initialize newPromptData if null before updating
                      const baseData =
                        d || ({ _id: "", value: "", clientInputs: [] } as any); // Provide default structure for TQuestion
                      return {
                        ...baseData,
                        value: e.target.value,
                      };
                    });
                  }}
                  placeholder="Type in query"
                  name="prompt"
                  id=""
                  cols={30}
                  className=" p-2 rounded-[5px] placeholder:text-sm outline-none "
                  rows={4}
                ></textarea>
              </div>

              <div className="flex items-center p-3 w-full">
                <Button
                  className="!h-[2.2rem] !w-full !rounded-[5px]"
                  size="sm"
                  onClick={() => {
                    addNewPrompt();
                  }}
                  disabled={
                    addingPrompt ||
                    !newPromptData?.value ||
                    newPromptData.value.trim().length === 0
                  }
                >
                  {addingPrompt ? (
                    <>
                      <ImSpinner2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding
                    </>
                  ) : (
                    "Add Prompt"
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-col h-full w-full  overflow-y-auto no-scroll-btn">
              <div className="flex flex-col p-3 h-[60%] overflow-y-auto no-scroll-btn space-y-3">
                <h3 className="text-xs text-gray-800 font-medium capitalize">
                  Client Inputs
                </h3>

                {newPromptData?.clientInputs &&
                newPromptData?.clientInputs?.length > 0 ? (
                  newPromptData?.clientInputs.map((input, index) => {
                    return (
                      <div
                        key={index}
                        className={`flex flex-col space-y-2 items-center w-full bg-gray-200 rounded-lg  px-2 ${["select", "radio", "checkbox"].includes(input.type) ? "pb-2" : ""}`}
                      >
                        <div className="flex flex-row justify-between items-center w-full bg-gray-200 min-h-[50px]">
                          <span className="text-xs text-black capitalize">
                            {input.label}
                          </span>

                          <div className="min-w-[70px] rounded-md relative">
                            <Select
                              value={input.type}
                              onValueChange={(value) => {
                                setNewPromptData((d) => {
                                  if (!d) return null;
                                  // Update the specific clientInput's type
                                  const updatedClientInputs =
                                    d.clientInputs?.map((ci, ciIndex) => {
                                      if (ciIndex === index) {
                                        return {
                                          ...ci,
                                          type: value as GenericClientInput["type"],
                                        };
                                      }
                                      return ci;
                                    }) || [];

                                  return {
                                    ...d,
                                    clientInputs:
                                      uniqueByValue(updatedClientInputs), // Re-apply uniqueByValue if needed
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue
                                  placeholder={`Select ${input.label}`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {promptInputTypes.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    className="text-xs"
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {["select", "radio", "checkbox"].includes(input.type) ||
                        (input.options && input.options?.length > 0) ? (
                          <input
                            type="text"
                            value={
                              input.options !== null
                                ? input.options
                                    ?.map((op) => {
                                      return op.label;
                                    })
                                    .join(" | ")
                                : ""
                            }
                            placeholder="Type in options ( | seperated)"
                            onChange={(e) => {
                              if (e.target.value.length > 0) {
                                const options = e.target.value.split(" | ");
                                addValuesToOptions(
                                  index,
                                  options.map((value) => {
                                    return {
                                      label: value,
                                      value: value,
                                    };
                                  }),
                                );
                              }
                            }}
                            className="rounded-lg text-sm w-full min-h-[50px] bg-gray-50 "
                          />
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center transition-all space-y-4 justify-center w-full h-full">
                    <Image
                      src={NothingFound}
                      width={128}
                      height={128}
                      className="w-32 h-32"
                      alt="No inputs"
                    />
                    <p className="text-gray-800 text-sm">No inputs!</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col p-3 h-[40%] space-y-2 ">
                <h3 className="text-xs text-gray-800 font-medium capitalize">
                  Code
                </h3>
                <textarea
                  disabled
                  value={
                    newPromptData?.value && newPromptData?.value?.length > 0
                      ? newPromptData?.value
                      : "No code yet!"
                  }
                  name="prompt"
                  id=""
                  cols={30}
                  className=" p-2 rounded-[5px] bg-gray-400 text-white text-sm text-left placeholder:text-sm"
                  rows={10}
                ></textarea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default CategoryPrompts;
