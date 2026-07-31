"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineSparkles, HiOutlineBriefcase } from "react-icons/hi";
import {
  useRoleTitleGeneration,
  type RoleTitleGenerationResult,
} from "@/hooks/useRoleTitleGeneration";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface GenerateRoleTitlesButtonProps {
  userId: string;
  resumeUploadId: string;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  Evidenced: "bg-[#0D9F6E] text-white",
  Adjacent: "bg-amber-400 text-white",
  Aspirational: "bg-slate-300 text-slate-800",
};

const LOADING_STEPS = [
  "Reading the resume…",
  "Decomposing role titles…",
  "Cross-checking evidence…",
  "Scoring AI career resilience…",
  "Finalizing recommendations…",
];

/**
 * Flow behind the "Generate" button in the Generate RTR column:
 * 1. Show a loading modal while AI generates Role Title Recommendations.
 * 2. Show the parsed roles (+ candidate name / QA flags) for admin review.
 * 3. Save to DB — persists as a ClientSupportDocument
 *    (category: roleTitleRecommendations), same as a manual CSV upload.
 */
export default function GenerateRoleTitlesButton({
  userId,
  resumeUploadId,
}: GenerateRoleTitlesButtonProps) {
  const { generateRoleTitles, isGenerating, saveRoleTitles, isSaving } =
    useRoleTitleGeneration();

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [result, setResult] = useState<RoleTitleGenerationResult | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Cycle the loading copy every couple of seconds while generation runs —
  // purely cosmetic, generation itself is a single request.
  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((step) => (step + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    try {
      const data = await generateRoleTitles({ userId, resumeUploadId });
      if (!data?.roles?.length) {
        toast.error("No role titles were returned");
        return;
      }
      setResult(data);
      setIsReviewOpen(true);
      toast.success("Role title recommendations generated");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to generate role title recommendations";
      toast.error(message);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    try {
      await saveRoleTitles({ userId, aiResult: result });
      toast.success("Role title recommendations saved");
      setIsReviewOpen(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to save role title recommendations";
      toast.error(message);
    }
  };

  return (
    <>
      <Button
        className="bg-[#0D9F6E] rounded-full border-none text-white font-semibold shadow-none hover:bg-[#0b8a5f] hover:shadow-none"
        disabled={isGenerating}
        onClick={handleGenerate}
      >
        {isGenerating ? "Generating..." : "Generate"}
      </Button>

      <Dialog open={isGenerating}>
        <DialogContent
          className="max-w-sm border-none bg-transparent shadow-none [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="relative overflow-hidden rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#0D9F6E] via-emerald-300 to-[#0D9F6E]" />

            <motion.div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0D9F6E]/10 text-[#0D9F6E]"
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            >
              <HiOutlineBriefcase size={30} />
            </motion.div>

            <h3 className="mt-5 flex items-center justify-center gap-1.5 text-lg font-medium text-career-black-200">
              <HiOutlineSparkles className="text-[#0D9F6E]" />
              Generating Role Titles
            </h3>

            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStep}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mt-2 text-13 text-career-gray-200"
              >
                {LOADING_STEPS[loadingStep]}
              </motion.p>
            </AnimatePresence>

            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-career-gray-300">
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#0D9F6E] to-emerald-400"
                animate={{ x: ["-100%", "220%"] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Role Title Recommendations</DialogTitle>
            <DialogDescription>
              {result?.candidate_name
                ? `Generated for ${result.candidate_name}. Review before saving.`
                : "Review the AI-generated role titles before saving."}
            </DialogDescription>
          </DialogHeader>

          {result?.qa_flags && result.qa_flags.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">QA Flags</p>
              <ul className="mt-1 list-disc pl-5">
                {result.qa_flags.map((flag, index) => (
                  <li key={index}>
                    <span className="font-medium">{flag.type}:</span> {flag.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-[24rem] overflow-auto rounded-md border border-career-gray-300">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#D4FFFF]">
                <tr>
                  <th className="p-2">Role Title</th>
                  <th className="p-2">Classification</th>
                  <th className="p-2">Craft</th>
                  <th className="p-2">Industry</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">AI Resilience</th>
                </tr>
              </thead>
              <tbody>
                {result?.roles.map((role, index) => (
                  <tr key={index} className="border-t border-career-gray-300">
                    <td className="p-2 font-medium">{role.role_title}</td>
                    <td className="p-2">{role.classification}</td>
                    <td className="p-2">{role.craft}</td>
                    <td className="p-2">{role.industry}</td>
                    <td className="p-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_BADGE_CLASSES[role.status] ?? "bg-slate-200"
                        }`}
                      >
                        {role.status}
                      </span>
                    </td>
                    <td className="p-2">{role.ai_career_resilience_rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => setIsReviewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Saving..." : "Save to RTR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
