"use client";
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { usePromptsQueries, usePromptsMutations } from "@/hooks/api/admin/prompts";

// Import shared UI assets
import ProcessIcon from "../../../../../public/png/process-icon.png";
import NothingFound from "../../../../../public/svg/nothing-found.svg";
import Image from "next/image";
import Link from "next/link";

// Dialog and Button (assuming these are shared UI components)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Framer Motion for animations
import { AnimatePresence, motion } from "framer-motion";

// --- Import the Generic Sub-components ---
// These are the reusable UI building blocks
import GenericCategories from "./GenericCategories"; // Renamed from Categories
import GenericCategoryPrompts from "./GenericCategoryPrompts"; // Renamed from CategoryPrompts
import GenericPromptDetails from "./GenericPromptDetails"; // Renamed from PromptDetails
import GenericPromptsSimulation from "./GenericPromptsSimulation";
import {
  PromptCategory,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts";
import PageHeader from "@/components/PageHeader/PageHeader";

// --- Generic AIDashboard Props Interface ---
// This defines what each specific AI page needs to provide to the dashboard.
interface GenericAIDashboardProps {
  title: string; // e.g., "Answered Questions AI Prompts"
  apiBasePath: string; // e.g., "prompts/aq-ai", "prompts/cv-ai"
  recordsLink: string; // e.g., "/admin/prompts/aq-ai/records"
  editLink?: string;
  // Optional: If a module has a specific confirmation for submitting to AI
  showSubmitConfirmation?: boolean; // To handle differences between qa-ai and cv-ai flows
}

// --- The Generic AIDashboard Component ---
const GenericAIDashboard = <
  TCategory extends PromptCategory,
  TQuestion extends PromptQuestion,
  TSimulation extends PromptSimulation,
>({
  title,
  apiBasePath,
  recordsLink,
  editLink,
  showSubmitConfirmation = false,
}: GenericAIDashboardProps) => {
  // --- Dashboard-level State Management ---
  const [activeComponent, setActiveComponent] = useState<string>("prompts"); // Default to showing prompts
  const [currentAction, setCurrentAction] = useState<string | null>(null); // For showing current operations

  // Data states
  const [activeCategory, setActiveCategory] = useState<TCategory | null>(null);
  const [activePrompt, setActivePrompt] = useState<TQuestion | null>(null);

  // --- TanStack Query Integration ---
  const { 
    promptsDataDomain, 
    simulationsDomain,
    queueDomain
  } = usePromptsQueries({ basePath: apiBasePath });

  const {
    clearQueue,
    addToQueue,
    submitToVcs
  } = usePromptsMutations(apiBasePath);

  const allCategories = useMemo(() => promptsDataDomain.data?.full || [], [promptsDataDomain.data]);
  const allPrompts = useMemo(() => promptsDataDomain.data?.prompts || [], [promptsDataDomain.data]);
  const allSimulations = useMemo(() => simulationsDomain.data || [], [simulationsDomain.data]);

  // Sync activeCategory if not set
  useEffect(() => {
    if (allCategories.length > 0 && !activeCategory) {
      setActiveCategory(allCategories[0] as TCategory);
    }
  }, [allCategories, activeCategory]);

  // UI states
  const [sendingReports, setSendingReports] = useState<boolean>(false);
  const [submitToAIModal, setSubmitToAIModal] = useState(false); // For confirmation dialog

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [allNotifications, setAllNotifications] = useState<
    { _id: string; name: string }[]
  >([]);

  // --- Functions for Notifications (specific to this dashboard's UI) ---
  async function deleteNotification(id: string) {
    // Optimistic update
    setAllNotifications((notifications) =>
      notifications.filter((c) => c._id !== id)
    );
  }

  // --- Function to Submit Prompts to AI ---
  const submitToAI = async (input: string) => {
    setSendingReports(true);
    setCurrentAction("Submitting prompts to AI...");

    try {
      // Clear any existing queue
      if (queueDomain.data?.length > 0) {
        await clearQueue.mutateAsync();
      }

      // Add to queue
      await addToQueue.mutateAsync(input);

      // Trigger VCS
      await submitToVcs.mutateAsync(input);

      toast.success("Prompts submitted to AI-Bot successfully!");
      setSubmitToAIModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit prompts to AI.");
    } finally {
      setCurrentAction(null);
      setSendingReports(false);
    }
  };


  // --- Render Logic ---
  return (
    <div className="flex flex-col min-h-full gap-y-5 mt-5">
      <PageHeader title={title} />
      {/* Main Content Area */}
      <div className="w-full rounded-lg bg-white p-5">
        <div className="flex flex-row items-start justify-between w-full gap-x-10">
          {/* Left Panel: Dynamic Content based on activeComponent */}
          <div className="flex flex-col items-start space-y-10 w-full h-full">
            {/* Action Buttons for the Dashboard */}
            <div className="w-full flex flex-row mt-3 justify-between h-fit items-center">
              <div className="flex flex-row items-center space-x-3">
                <Button
                  className="!rounded-[0.25rem] !h-[40px] !w-full !max-w-[200px] transition-all"
                  disabled={
                    sendingReports || !allPrompts || allPrompts.length === 0
                  }
                  onClick={() => {
                    if (showSubmitConfirmation) {
                      setSubmitToAIModal(true);
                    } else {
                      const promptString = allPrompts
                        .map((p) => p.value)
                        .join("\n \n");
                      submitToAI(promptString);
                    }
                  }}
                  title="Submit to AI"
                >
                  {sendingReports ? "Submitting..." : "Submit to AI"}
                </Button>
                <Link href={recordsLink} className="w-full transition-all">
                  <Button className="!rounded-[0.25rem] !h-[40px] !w-full !max-w-[200px] transition-all">
                    View records!
                  </Button>
                </Link>
                {editLink && <Link href={editLink} className="w-full transition-all">
                  <Button className="!rounded-[0.25rem] !h-[40px] !w-full !max-w-[200px] transition-all">
                    Edit CV Style!
                  </Button>
                </Link> }
                <Button
                  className="!rounded-[0.25rem] !h-[40px] !w-full !max-w-[200px] transition-all"
                  onClick={() => setShowNotifications((current) => !current)}
                >
                  {!showNotifications
                    ? "View notifications!"
                    : "Hide notifications!"}
                </Button>
              </div>
            </div>
            {promptsDataDomain.isLoading ? (
              <div className=" flex flex-col w-full justify-center items-center border-2 border-gray-200 min-h-[600px] max-h-[600px] max-w-[1024px] rounded-[5px] h-full">
                <p className="text-career-blue-500 text-sm">Loading data...</p>
              </div>
            ) : activeCategory ? (
              activeComponent === "prompts" ? (
                <GenericCategoryPrompts<TCategory, TQuestion>
                  setCurrentAction={setCurrentAction}
                  setActiveComponent={setActiveComponent}
                  setActivePrompt={setActivePrompt as any}
                  categoryData={activeCategory}
                  apiBasePath={apiBasePath}
                />
              ) : activeComponent === "promptDetails" && activePrompt ? (
                <GenericPromptDetails<TCategory, TQuestion>
                  promptData={activePrompt}
                  setCurrentAction={setCurrentAction}
                  setActiveComponent={setActiveComponent}
                  activeCategory={activeCategory} // Pass this for context
                  apiBasePath={apiBasePath}
                />
              ) : activeComponent === "simulation" ? (
                <GenericPromptsSimulation<TQuestion, TSimulation>
                  setCurrentAction={setCurrentAction}
                  setActiveComponent={setActiveComponent}
                  allPrompts={allPrompts as TQuestion[]} // All prompts from the active category
                  allSimulations={allSimulations as TSimulation[]} // All simulations for the module
                  apiBasePath={apiBasePath}
                />
              ) : null
            ) : (
              <div className=" flex flex-col w-full justify-center items-center border-2 border-gray-200 min-h-[600px] max-h-[600px] max-w-[1024px] rounded-[5px] h-full">
                <Image src={NothingFound} className="w-36 h-36" alt="" />
                <p className="text-gray-800 text-sm">
                  No selected category! Please select one from the right.
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Categories, Process Icon, Notifications */}
          <div className="flex flex-col items-center space-y-1.5">
            {/* Categories List (always visible on the right) */}
            <GenericCategories<TCategory>
              setCurrentAction={setCurrentAction}
              setActiveComponent={setActiveComponent}
              setActiveCategory={setActiveCategory as any}
              categories={allCategories as TCategory[]}
              endPoint={apiBasePath} // GenericCategories uses this prop name
              activeCategory={activeCategory as TCategory}
              loadingCategories={promptsDataDomain.isLoading}
            />

            {/* Process Icon / Current Action Display */}
            <div className="h-24 max-w-[400px] min-w-[350px] w-full flex flex-col items-center justify-center transition-all hover:shadow-lg rounded-[5px] border-2 border-gray-200">
              <div className="space-y-1 flex flex-col items-center justify-center">
                <Image
                  src={ProcessIcon}
                  className="w-[50px] h-[50px] animate-spin"
                  alt=""
                />
                {!currentAction ? (
                  <span className="text-sm text-black font-light font-sharp-grotesk">
                    No actions yet!
                  </span>
                ) : (
                  <span className="text-sm px-3 pb-1.5 text-center text-black font-sharp-grotesk">
                    {currentAction}
                  </span>
                )}
              </div>
            </div>

            {/* Notifications Panel */}
            <AnimatePresence>
              {showNotifications ? (
                <motion.div
                  key="notificationModal"
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="!h-[350px] !max-h-[450px] w-full flex flex-col items-center hover:shadow-lg justify-center transition-all  rounded-[5px] border-2 border-gray-200"
                >
                  {allNotifications.length > 0 ? (
                    <div className="flex flex-col items-center p-2 space-y-2 overflow-y-auto !justify-start w-full h-full  no-scroll-btn">
                      {allNotifications.map((notification, index) => (
                        <div
                          key={index}
                          onClick={() => deleteNotification(notification._id)}
                          className="hover:shadow-md cursor-pointer flex flex-row flex-wrap w-full items-center justify-between overflow-hidden rounded-lg p-3 min-h-[30px] max-h-[50px] h-fit bg-[#F5F5DC]"
                        >
                          <p className="text-xs text-left text-black max-w-[70%]">
                            {notification.name}
                          </p>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="!w-5 !min-w-5 min-h-5 !h-5 text-blue"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center transition-all space-y-4 justify-center w-full h-full">
                      <Image src={NothingFound} className="w-32 h-32" alt="" />
                      <p className="text-gray-800 text-sm">
                        No new notifications!
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Submit to AI Confirmation Dialog */}
        <Dialog
          open={submitToAIModal}
          onOpenChange={(state: boolean) => setSubmitToAIModal(state)}
        >
          <DialogContent className="bg-white rounded-[5px] flex flex-col items-start p-0">
            <DialogHeader className="flex flex-row items-center justify-between border-b border-b-gray-600 px-3 py-3 w-full">
              <DialogTitle className="text-lg !font-medium font-sharp-grotesk text-gray-800">
                Confirm Submit
              </DialogTitle>
              <DialogClose asChild>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 cursor-pointer"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </DialogClose>
            </DialogHeader>

            <div className="flex flex-col w-full h-full justify-between p-3 items-end space-y-4">
              <p className="text-lg text-gray-800 w-full text-left">
                Are you sure you want to submit all the prompts to AI? This
                would overwrite previously saved AI Prompts.
              </p>

              <Button
                className="!rounded-[0.25rem] !h-[40px] !w-full !max-w-[100px] transition-all !bg-blue"
                onClick={() => {
                  const promptString = allPrompts
                    .map((p) => p.value)
                    .join("\n \n");
                  submitToAI(promptString);
                }}
                disabled={sendingReports}
              >
                {sendingReports ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GenericAIDashboard;
