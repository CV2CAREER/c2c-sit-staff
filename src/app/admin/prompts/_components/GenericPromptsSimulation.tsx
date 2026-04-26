// components/GenericPromptsSimulation.tsx
"use client";

// Import core React hooks and types
import { Dispatch, SetStateAction, useEffect, useState } from "react";

// Import UI assets and components
import NothingFound from "../../../../../public/svg/nothing-found.svg";
import toast from "react-hot-toast";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { SERVER_URI } from "@/constants/env";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ImSpinner2 } from "react-icons/im"; // Assuming react-icons is installed
import moment from "moment"; // Ensure moment.js is installed
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import * as RadixLabel from "@radix-ui/react-label";
import MuiAccordion from "@mui/material/Accordion";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MuiRadioGroup from "@mui/material/RadioGroup";
import MuiFormControlLabel from "@mui/material/FormControlLabel";
import MuiRadio from "@mui/material/Radio";
import { CheckIcon } from "lucide-react"; // Assuming lucide-react is installed
import {
  PromptClientInput,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts";

// --- Component Props Interface with Generics ---
interface PromptsSimulationProps<
  TQuestion extends PromptQuestion,
  TSimulation extends PromptSimulation,
> {
  setCurrentAction: Dispatch<SetStateAction<string | null>>;
  setActiveComponent: Dispatch<SetStateAction<string>>;
  allPrompts: TQuestion[]; // Use TQuestion[]
  allSimulations: TSimulation[]; // Use TSimulation[]
  apiBasePath: string; // Dynamic API path (e.g., "prompts/aq-ai" or "prompts/cv-ai")
}

// --- The Generic PromptsSimulation Component ---
const PromptsSimulation = <
  TQuestion extends PromptQuestion,
  TSimulation extends PromptSimulation,
>({
  setCurrentAction,
  setActiveComponent,
  allPrompts,
  allSimulations,
  apiBasePath, // Receive the dynamic API base path
}: PromptsSimulationProps<TQuestion, TSimulation>) => {
  const [testData, setTestData] = useState<Record<string, any>>({}); // More specific type for testData
  const [processing, setProcessing] = useState(false);
  const [deletingSim, setDeletingSim] = useState<string | null>(null);
  const [clientInputs, setClientInputs] = useState<PromptClientInput[]>([]); // Use PromptClientInput[]
  const [simulationMode, setSimulationMode] = useState<string>("questionInput");
  const [questionID, setQuestionID] = useState<string | null>(null);
  const [fetchingQuestion, setFetchingQuestion] = useState<boolean>(false);

  const [fullPromptString, setFullPromptString] = useState<string>("");
  const [simulations, setSimulations] = useState<TSimulation[] | null>(null); // Use TSimulation[]

  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(
    false
  );

  // --- Functions | Process ---

  const runSimulation = async () => {
    let promptString: string = fullPromptString;

    setProcessing(true);

    // Replace placeholders in the prompt string with testData values
    for (const field of Object.keys(testData)) {
      // Handle array values (e.g., from checkboxes)
      if (Array.isArray(testData[field])) {
        promptString = promptString.replaceAll(
          `{${field}}`,
          `{${testData[field].join(", ")}}` // Join array values for prompt
        );
      } else {
        promptString = promptString.replaceAll(
          `{${field}}`,
          `{${testData[field]}}`
        );
      }
    }

    setFullPromptString(promptString); // Update the displayed prompt string

    try {
      // Use dynamic apiBasePath for the simulation endpoint
      const runProcess = await axiosInstance.post(
        `${SERVER_URI}${endpoints.ADMIN_PROMPTS_SIMULATION(apiBasePath)}`,
        {
          prompt: promptString,
        }
      );

      // Cast the returned data to the specific TSimulation type
      setSimulations((current: TSimulation[] | null) => {
        if (!current) return [runProcess.data.data as TSimulation];
        return [...current, runProcess.data.data as TSimulation];
      });
      setProcessing(false);
      toast.success(runProcess.data.message);
    } catch (error: any) {
      setProcessing(false);
      if (axios.isAxiosError(error) && error.response) {
        // Use axios.isAxiosError for type narrowing
        toast.error(error.response.data.message);
      } else {
        toast.error(
          error.message?.toString() || "An unexpected error occurred."
        );
      }
    }
  };

  // Type the 'items' parameter correctly for uniqueByValue
  function uniqueByValue(items: PromptClientInput[]): PromptClientInput[] {
    const set = new Set();
    return items.filter((item) => {
      const isDuplicate = set.has(item?.label);
      set.add(item?.label);
      return !isDuplicate;
    });
  }

  async function deleteSimulation(id: string) {
    try {
      setCurrentAction("Deleting simulation!"); // Correct action message
      setDeletingSim(id);

      // Use dynamic apiBasePath for the delete endpoint
      await axiosInstance.delete(
        `${SERVER_URI}${endpoints.ADMIN_PROMPTS_SIMULATION(apiBasePath)}?id=${id}`
      );

      setSimulations((sims) => {
        return sims?.filter((s) => s._id !== id) || null;
      });

      setDeletingSim(null);
      toast.success("Deleted simulation successfully!");
    } catch {
      toast.error(`Failed to delete simulation.`);
      setCurrentAction(null);
      setDeletingSim(null);
    }
  }

  // NOTE: getQuestionData is highly specific to the AQ AI module's data structure.
  // For true generic behavior, this function might need to be passed as a prop,
  // or a more generalized data fetching and mapping mechanism would be required.
  // For now, I'm assuming it remains specific to how 'questionID' retrieves data.
  async function getQuestionData() {
    if (!questionID) {
      toast.error("Please enter a Question ID.");
      return;
    }
    try {
      setFetchingQuestion(true);
      // This endpoint and data structure are very specific to AQ AI.
      // If other AI modules have different question data sources, this needs further generalization
      // (e.g., by passing a 'fetchQuestionData' prop function).
      const getRecord = await axiosInstance(
        `${SERVER_URI}/api/v1/admin/applications/questions?justId=${true}&question_id=${questionID}`
      );
      toast.success("Fetched question!");

      const value = getRecord.data.data;
      const newTestData: Record<string, any> = {};

      if (value) {
        // Map specific keys from fetched data to generic testData labels
        if (value.Question) newTestData["question"] = value.Question;
        if (value.Client) newTestData["fullName"] = value.Client;
        if (value.Country) newTestData["country"] = value.Country;
        if (value.Location) newTestData["job_location"] = value.Location;
        else newTestData["job_location"] = "Australia"; // Default if not found
        if (value.JobTitle) newTestData["applied_job"] = value.JobTitle;
        if (value.Options) newTestData["options"] = value.Options;
        if (value.Selection_Type)
          newTestData["input_type"] = value.Selection_Type;
      }
      setTestData(newTestData); // Set all testData at once
      setFetchingQuestion(false);
    } catch {
      setFetchingQuestion(false);
      toast.error("Unable to fetch question (" + questionID + ")");
    }
  }

  // --- Effects ---
  useEffect(() => {
    setSimulations(allSimulations); // Initialize simulations from props

    let promptString: string = "";
    let gatheredClientInputs: PromptClientInput[] = [];

    // Loop through allPrompts to build the full prompt string and collect client inputs
    for (const prompt of allPrompts) {
      if (prompt?.value) {
        promptString += prompt.value + " \n \n";
      }
      if (prompt?.clientInputs && prompt.clientInputs.length > 0) {
        gatheredClientInputs = [
          ...gatheredClientInputs,
          ...prompt.clientInputs,
        ];
      }
    }

    setFullPromptString(promptString);
    setClientInputs(uniqueByValue(gatheredClientInputs)); // Deduplicate collected client inputs
  }, [allPrompts, allSimulations]); // Depend on allPrompts and allSimulations props

  const handleAccordionChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAccordion(isExpanded ? panel : false);
    };

  // --- Render JSX ---
  return (
    <div className="flex flex-col items-start w-full justify-between border-2 border-gray-200 min-h-[600px] max-h-[700px] max-w-[1024px] rounded-[5px] h-full">
      {/* prompts header */}
      <div className="!h-16 !min-h-16 border-b-gray-200 border-b-2 flex flex-row items-center justify-between px-4 w-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 cursor-pointer"
          onClick={() => {
            setActiveComponent("prompts");
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
          Simulation
        </h3>
      </div>
      {/* prompts body */}

      <div className="body w-full flex flex-col items-start h-full !justify-start overflow-y-hidden">
        <div className="flex flex-row w-full h-full overflow-y-auto">
          <div className="flex flex-col w-[50%] justify-between h-full p-2 relative overflow-y-auto no-scroll-btn border-r-2 border-r-gray-100">
            {/* form */}
            <div className="flex flex-col p-3 h-full w-full space-y-4 mt-4 no-scroll-btn">
              <div className="flex items-center gap-2 justify-end w-full">
                <RadixCheckbox.Root
                  id="simulationModeCheckbox"
                  checked={simulationMode === "questionInput"}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setSimulationMode("questionInput");
                    } else {
                      setSimulationMode("allInputs");
                    }
                  }}
                  className="peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-career-blue-500 data-[state=checked]:bg-blue data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RadixCheckbox.Indicator className="flex items-center justify-center text-current">
                    <CheckIcon className="h-3 w-3" />
                  </RadixCheckbox.Indicator>
                </RadixCheckbox.Root>
                <RadixLabel.Root
                  htmlFor="simulationModeCheckbox"
                  className="capitalize text-sm font-medium text-gray-700"
                >
                  Use Question ID
                </RadixLabel.Root>
              </div>
              <h3 className="text-lg text-gray-700 font-sharp-grotesk font-medium capitalize mt-2">
                Simulation Inputs
              </h3>

              {/* Conditionally render Question ID input */}
              {simulationMode === "questionInput" ? (
                <div className="flex flex-col items-start w-full space-y-2 rounded-lg h-full">
                  <h3 className="text-xs text-gray-800 font-medium capitalize">
                    Question ID
                  </h3>
                  <div className="flex flex-row items-center space-x-1 w-full">
                    <input
                      placeholder={`Type in ID`}
                      className="!h-[40px] pl-2 min-h-[40px] min-w-[200px] w-full outline-none placeholder:text-sm border border-gray-600 rounded-[5px]"
                      onChange={(e) => {
                        setQuestionID(e.target.value);
                      }}
                      type="text"
                      value={questionID ?? ""}
                    />
                    <button
                      disabled={
                        !questionID ||
                        questionID.length === 0 ||
                        fetchingQuestion
                      }
                      onClick={getQuestionData}
                      className={`!min-w-[40px] !h-[40px] rounded-[5px] ${questionID?.length && questionID?.length > 0 ? "bg-blue" : "bg-gray-200"} grid place-items-center`}
                    >
                      {fetchingQuestion ? (
                        <ImSpinner2 className="animate-spin text-white text-20" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5 text-white"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Render client inputs dynamically */}
              {clientInputs?.length > 0 ? (
                clientInputs.map((input, index) => {
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-start w-full space-y-2 rounded-lg h-full"
                    >
                      <h3 className="text-xs text-gray-800 font-medium capitalize">
                        {input.label}
                      </h3>

                      {(() => {
                        switch (input.type) {
                          case "textarea":
                            return (
                              <textarea
                                value={testData?.[input.label] || ""}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setTestData((d: Record<string, any>) => {
                                    const updatedData = {
                                      ...d,
                                      [input.label]: newValue,
                                    };
                                    if (newValue.length === 0) {
                                      delete updatedData[input.label];
                                    }
                                    return updatedData;
                                  });
                                }}
                                placeholder={`Type in ${input.label}`}
                                name="prompt"
                                id=""
                                cols={20}
                                className="p-2 rounded-[5px] placeholder:text-sm outline-none w-full min-h-[70px] h-[70px] max-h-[140px]"
                                rows={5}
                              ></textarea>
                            );
                          case "select":
                            if (
                              input.options?.length &&
                              input.options?.length > 0
                            ) {
                              return (
                                <div className="min-h-[50px] w-full">
                                  <Select
                                    value={testData?.[input.label] || ""}
                                    onValueChange={(value: string) => {
                                      setTestData((d: Record<string, any>) => {
                                        const updatedData = {
                                          ...d,
                                          [input.label]: value,
                                        };
                                        if (value.length === 0) {
                                          delete updatedData[input.label];
                                        }
                                        return updatedData;
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue
                                        placeholder={`Select ${input.label}`}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {input.options.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            }
                            return null; // Handle case where select has no options
                          case "checkbox":
                            if (
                              input.options?.length &&
                              input.options?.length > 0
                            ) {
                              return (
                                <div className="max-h-fit flex flex-row items-center flex-wrap flex-auto w-full gap-3">
                                  {input.options?.map((option, idx) => (
                                    <div
                                      className="flex items-center gap-2"
                                      key={`${input.label}-checkbox-${idx}`}
                                    >
                                      <RadixCheckbox.Root
                                        id={`${input.label}-${option.value}-${idx}`}
                                        checked={
                                          Array.isArray(
                                            testData[input.label]
                                          ) &&
                                          testData[input.label].includes(
                                            option.value
                                          )
                                        }
                                        onCheckedChange={(checked) => {
                                          setTestData(
                                            (d: Record<string, any>) => {
                                              const currentValues = (
                                                Array.isArray(d[input.label])
                                                  ? d[input.label]
                                                  : []
                                              ) as string[];
                                              let updatedValues: string[];
                                              if (checked === true) {
                                                updatedValues = [
                                                  ...new Set([
                                                    ...currentValues,
                                                    option.value,
                                                  ]),
                                                ];
                                              } else {
                                                updatedValues =
                                                  currentValues.filter(
                                                    (item: string) =>
                                                      item !== option.value
                                                  );
                                              }
                                              const updatedData = {
                                                ...d,
                                                [input.label]: updatedValues,
                                              };
                                              if (updatedValues.length === 0) {
                                                delete updatedData[input.label];
                                              }
                                              return updatedData;
                                            }
                                          );
                                        }}
                                        className="peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-career-blue-500 data-[state=checked]:bg-blue data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <RadixCheckbox.Indicator className="flex items-center justify-center text-current">
                                          <CheckIcon className="h-3 w-3" />
                                        </RadixCheckbox.Indicator>
                                      </RadixCheckbox.Root>
                                      <RadixLabel.Root
                                        htmlFor={`${input.label}-${option.value}-${idx}`}
                                        className="capitalize text-sm font-medium text-gray-700"
                                      >
                                        {option.label}
                                      </RadixLabel.Root>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          case "radio":
                            if (
                              input.options?.length &&
                              input.options?.length > 0
                            ) {
                              return (
                                <MuiRadioGroup
                                  row
                                  aria-labelledby={`${input.label}-radio-group`}
                                  name={input.label}
                                  value={testData[input.label] || ""}
                                  onChange={(event) => {
                                    const newValue = event.target.value;
                                    setTestData((d: Record<string, any>) => {
                                      const updatedData = {
                                        ...d,
                                        [input.label]: newValue,
                                      };
                                      if (newValue.length === 0) {
                                        delete updatedData[input.label];
                                      }
                                      return updatedData;
                                    });
                                  }}
                                  className="max-h-fit flex flex-row items-center flex-wrap flex-auto w-full gap-3"
                                >
                                  {input.options?.map((option, radioIdx) => (
                                    <MuiFormControlLabel
                                      key={`${input.label}-radio-${radioIdx}`}
                                      value={option.value}
                                      control={<MuiRadio size="small" />}
                                      label={
                                        <span className="capitalize text-sm font-medium text-gray-700">
                                          {option.label}
                                        </span>
                                      }
                                      sx={{ marginRight: "8px" }}
                                    />
                                  ))}
                                </MuiRadioGroup>
                              );
                            }
                            return null;
                          default: // Handles 'text' and any unrecognized types
                            return (
                              <input
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setTestData((d: Record<string, any>) => {
                                    const updatedData = {
                                      ...d,
                                      [input.label]: newValue,
                                    };
                                    if (newValue.length === 0) {
                                      delete updatedData[input.label];
                                    }
                                    return updatedData;
                                  });
                                }}
                                placeholder={`Type in ${input.label}`}
                                className="!h-6 pl-2 min-h-[40px] min-w-[200px] w-full outline-none placeholder:text-sm border border-gray-600 rounded-[5px]"
                                type="text"
                                value={testData?.[input.label] || ""}
                              />
                            );
                        }
                      })()}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center transition-all space-y-4 justify-center w-full h-full">
                  <Image src={NothingFound} className="w-32 h-32" alt="" />
                  <p className="text-gray-800 text-sm">No inputs required!</p>
                </div>
              )}
            </div>

            <div className="flex flex-col min-h-[400px] h-full w-full pt-5">
              <div className="flex flex-col p-3 space-y-2 h-[300px]">
                <h3 className="text-lg text-gray-700 font-sharp-grotesk font-medium capitalize">
                  Code Output
                </h3>
                <textarea
                  disabled
                  value={fullPromptString || "No code yet!"}
                  name="prompt"
                  id=""
                  cols={30}
                  className=" p-2 rounded-[5px] bg-gray-400 text-white text-sm text-left placeholder:text-sm !h-[300px]"
                  rows={10}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full w-[50%] overflow-y-auto no-scroll-btn">
            <div className="flex flex-col p-3 h-[90%] space-y-2 ">
              <h3 className="text-sm text-gray-800 font-medium capitalize">
                Responses
              </h3>
              {simulations && simulations?.length > 0 ? (
                <div>
                  {simulations?.map((simulation, index) => {
                    return (
                      <MuiAccordion
                        key={simulation._id || index} // Use unique ID if available, otherwise index
                        expanded={
                          expandedAccordion ===
                          `panel-${simulation._id || index}`
                        }
                        onChange={handleAccordionChange(
                          `panel-${simulation._id || index}`
                        )}
                        sx={{
                          border: "1px solid #e5e7eb",
                          "&:not(:last-child)": { borderBottom: 0 },
                          "&:before": { display: "none" },
                          boxShadow: "none",
                          "&.Mui-expanded": { margin: "auto" },
                        }}
                      >
                        <MuiAccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`panel-${simulation._id || index}-content`}
                          id={`panel-${simulation._id || index}-header`}
                          sx={{
                            backgroundColor: "rgba(0, 0, 0, .03)",
                            borderBottom: "1px solid rgba(0, 0, 0, .125)",
                            minHeight: "48px",
                            "&.Mui-expanded": { minHeight: "48px" },
                            "& .MuiAccordionSummary-content": {
                              "&.Mui-expanded": { margin: "12px 0" },
                            },
                          }}
                        >
                          <span className="text-sm font-medium text-gray-700">{`${index + 1}. ${moment(simulation.createdAt).format("DD, MMM - HH:mm")}`}</span>
                        </MuiAccordionSummary>
                        <MuiAccordionDetails sx={{ padding: "16px" }}>
                          <div className="flex flex-col w-full space-y-10">
                            <p className="text-gray-500 dark:text-gray-400">
                              {simulation.response}
                            </p>
                            <Button
                              className="!h-[2.2rem] !w-full !rounded-[5px] cursor-pointer !bg-red-500 text-white"
                              onClick={() => deleteSimulation(simulation._id)}
                              size="sm"
                              disabled={deletingSim === simulation._id} // Disable only the specific deleting sim
                            >
                              {deletingSim === simulation._id
                                ? "Deleting"
                                : "Delete"}
                            </Button>
                          </div>
                        </MuiAccordionDetails>
                      </MuiAccordion>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center transition-all space-y-4 justify-center w-full h-full">
                  <Image src={NothingFound} className="w-32 h-32" alt="" />
                  <p className="text-gray-800 text-sm">No simulation yet!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* prompts footer */}
      <div className="!h-16 !min-h-16 border-t-gray-200 border-t-2 flex flex-row items-center justify-between px-4 w-full">
        <Button
          className="!rounded-[0.25rem] !w-[300px] max-w-[300px] !h-[80%]"
          onClick={runSimulation}
          disabled={
            processing || Object.keys(testData).length < clientInputs?.length
          } // Basic validation
          size="sm"
        >
          {processing ? "Simulating" : "Run Simulation"}
        </Button>

        <p
          className="text-lg font-semibold text-career-blue-500 transition-all hover:text-blue cursor-pointer font-sharp-grotesk"
          onClick={() => {
            setActiveComponent("prompts");
          }}
        >
          Go home!
        </p>
      </div>
    </div>
  );
};

export default PromptsSimulation;
