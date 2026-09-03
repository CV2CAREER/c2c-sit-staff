"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineSparkles,
  HiOutlineDocumentSearch,
  HiCheckCircle,
  HiXCircle,
} from "react-icons/hi";
import {
  useInterviewPackGeneration,
  type InterviewPackProcess,
  type SaveInterviewPackFormat,
} from "@/hooks/useInterviewPackGeneration";
import { flattenInterviewPackToHtml } from "@/utils/interviewPackFormat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CvVariantEditor from "./CvVariantEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface GenerateInterviewPackButtonProps {
  userId: string;
  resumeUploadId: string;
}

const STAGE_LABELS = ["Foundational", "STAR Answer Bank", "Technical Deep-Dive", "Closing"];

const PROCESSING_MESSAGES = [
  "Connecting with AI…",
  "Processing…",
  "Reading the CV and job ad…",
  "Drafting this section…",
];

type StageStatus = "pending" | "running" | "done" | "failed";

function StageStatusIcon({ status }: { status: StageStatus }) {
  if (status === "done") return <HiCheckCircle className="shrink-0 text-[#0D9F6E]" size={22} />;
  if (status === "failed") return <HiXCircle className="shrink-0 text-red-500" size={22} />;
  if (status === "running") {
    return (
      <motion.span
        className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-[#0D9F6E] border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      />
    );
  }
  return <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-slate-300" />;
}

/**
 * Flow behind the "Generate" button in the Interview Pack column:
 * 1. Collect the job link + job description.
 * 2. Start (or transparently resume) a 4-stage InterviewPackProcess and run
 *    each stage one AI call at a time, showing genuine per-stage progress —
 *    a failed stage can be retried without re-running the stages that
 *    already succeeded.
 * 3. Combine all 4 stages into one editable, rich-text preview.
 * 4. Save as PDF or DOC — uploads to Firebase and records an `otherDocs`
 *    Upload for the client.
 * 5. Show a download link for the saved file.
 */
export default function GenerateInterviewPackButton({
  userId,
  resumeUploadId,
}: GenerateInterviewPackButtonProps) {
  const {
    startInterviewPack,
    runInterviewPackStage,
    getInterviewPackProcess,
    previewInterviewPack,
    isPreviewing,
    saveInterviewPack,
    isSaving,
    savingFormat,
    getDownloadUrl,
  } = useInterviewPackGeneration();

  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isDriving, setIsDriving] = useState(false);
  const [jobLink, setJobLink] = useState("");
  const [jobContent, setJobContent] = useState("");
  const [process, setProcess] = useState<InterviewPackProcess | null>(null);
  const [editedHtml, setEditedHtml] = useState("");
  const [savedDocument, setSavedDocument] = useState<{ publicId: string; name: string } | null>(null);
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  // "review" = Reject/Download/Continue gate; "confirm" = the actual Save
  // as DOC/PDF step. Keeps generating something and it becoming visible to
  // the client as two distinct, deliberate actions.
  const [reviewStage, setReviewStage] = useState<"review" | "confirm">("review");
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    if (!isDriving) {
      setProcessingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProcessingMessageIndex((index) => (index + 1) % PROCESSING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isDriving]);

  const getStageStatus = (stageNumber: number): StageStatus => {
    if (!process) return "pending";
    if (process.status === "completed") return "done";
    if (process.currentStage > stageNumber) return "done";
    if (process.currentStage === stageNumber) {
      // isDriving must win over a stale "failed" status: on retry, process
      // still reflects the previous attempt's failure until the in-flight
      // call resolves, so checking status first would keep showing the old
      // error instead of the active retry.
      if (isDriving) return "running";
      return process.status === "failed" ? "failed" : "pending";
    }
    return "pending";
  };

  const runStage = async (processId: string): Promise<InterviewPackProcess> => {
    try {
      const updated = await runInterviewPackStage({ userId, processId });
      setProcess(updated);
      return updated;
    } catch (error) {
      try {
        const latest = await getInterviewPackProcess(processId, userId);
        setProcess(latest);
      } catch {
        // Best-effort refresh — surface the original error either way.
      }
      throw error;
    }
  };

  const driveStages = async (initial: InterviewPackProcess) => {
    setIsDriving(true);
    try {
      let current = initial;
      while (current.status !== "completed") {
        current = await runStage(current.id);
      }
      setEditedHtml(
        flattenInterviewPackToHtml(
          current.stage1Result,
          current.stage2Result,
          current.stage3Result,
          current.stage4Result,
        ),
      );
      setIsProgressOpen(false);
      setReviewStage("review");
      setIsReviewOpen(true);
      toast.success("Interview pack generated");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to generate interview pack";
      toast.error(message);
    } finally {
      setIsDriving(false);
    }
  };

  const handleReject = () => {
    setIsRejecting(true);
    const toastId = toast.loading("Rejecting interview pack...");
    setIsReviewOpen(false);
    setEditedHtml("");
    setReviewStage("review");
    toast.dismiss(toastId);
    toast.success("Interview pack rejected");
    setIsRejecting(false);
  };

  const handleDownloadPreview = async () => {
    const toastId = toast.loading("Preparing preview...");
    try {
      const { blob, filename } = await previewInterviewPack({
        userId,
        resumeUploadId,
        interviewPack: editedHtml,
        format: "pdf",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      toast.dismiss(toastId);
    } catch (error: any) {
      toast.dismiss(toastId);
      const message = error?.response?.data?.message || "Failed to generate preview";
      toast.error(message);
    }
  };

  const handleGenerate = async () => {
    if (!jobContent.trim()) {
      toast.error("Job description is required");
      return;
    }

    setIsInputOpen(false);
    setIsProgressOpen(true);

    try {
      const started = await startInterviewPack({ userId, resumeUploadId, jobContent, jobLink });
      setProcess(started);
      await driveStages(started);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to start interview pack";
      toast.error(message);
      setIsProgressOpen(false);
    }
  };

  const handleRetry = () => {
    if (!process) return;
    driveStages(process);
  };

  const handleSave = async (format: SaveInterviewPackFormat) => {
    try {
      const data = await saveInterviewPack({ userId, resumeUploadId, interviewPack: editedHtml, format });
      const document_ = data?.upload?.document;
      if (!document_?.publicId) {
        toast.error("Interview pack saved, but no download reference was returned");
        return;
      }
      setSavedDocument({ publicId: document_.publicId, name: document_.name });
      setIsReviewOpen(false);
      setIsDownloadOpen(true);
      toast.success("Interview pack saved");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to save interview pack";
      toast.error(message);
    }
  };

  const handleDownload = async () => {
    if (!savedDocument) return;
    toast.loading("Downloading interview pack");

    try {
      const url = await getDownloadUrl(savedDocument.publicId, savedDocument.name);
      if (!url) throw new Error("No download URL received from server");

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", savedDocument.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || "Failed to download interview pack");
    }
  };

  return (
    <>
      <Button
        className="bg-[#0D9F6E] rounded-full border-none text-white font-semibold shadow-none hover:bg-[#0b8a5f] hover:shadow-none"
        onClick={() => {
          setJobLink("");
          setJobContent("");
          setIsInputOpen(true);
        }}
      >
        Generate
      </Button>

      {/* Input modal */}
      <Dialog open={isInputOpen} onOpenChange={setIsInputOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Interview Pack</DialogTitle>
            <DialogDescription>
              Paste the job link and job description — the AI builds a full
              interview preparation pack tailored to this resume, in 4 stages.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interview-pack-job-link">Job Link</Label>
              <Input
                id="interview-pack-job-link"
                placeholder="https://..."
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interview-pack-job-content">Job Description</Label>
              <Textarea
                id="interview-pack-job-content"
                rows={8}
                placeholder="Paste the job description / vacancy advert here"
                value={jobContent}
                onChange={(e) => setJobContent(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
              onClick={handleGenerate}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress modal — real per-stage tracking, not a fake cycling animation */}
      <Dialog open={isProgressOpen}>
        <DialogContent
          className="max-w-md border-none bg-transparent shadow-none [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#0D9F6E] via-emerald-300 to-[#0D9F6E]" />

            <div className="text-center">
              <motion.div
                className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0D9F6E]/10 text-[#0D9F6E]"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              >
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-[#0D9F6E]/30"
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                />
                <HiOutlineDocumentSearch size={30} />
              </motion.div>

              <h3 className="mt-5 flex items-center justify-center gap-1.5 text-lg font-medium text-career-black-200">
                <HiOutlineSparkles className="text-[#0D9F6E]" />
                Generating Interview Pack
              </h3>
              <p className="mt-1 text-13 text-career-gray-200">
                Each section is generated one at a time for the best result.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              {STAGE_LABELS.map((label, index) => {
                const stageNumber = index + 1;
                const status = getStageStatus(stageNumber);
                return (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                  >
                    <StageStatusIcon status={status} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-career-black-200">
                        Stage {stageNumber}: {label}
                      </p>
                      {status === "running" && (
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={processingMessageIndex}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="mt-0.5 text-xs text-[#0D9F6E]"
                          >
                            {PROCESSING_MESSAGES[processingMessageIndex]}
                          </motion.p>
                        </AnimatePresence>
                      )}
                      {status === "failed" && process?.errorMessage && (
                        <p className="mt-0.5 text-xs text-red-600">{process.errorMessage}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {process?.status === "failed" && !isDriving && (
              <div className="mt-5 flex justify-center">
                <Button
                  className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
                  onClick={handleRetry}
                >
                  Retry Stage {process.currentStage}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review + edit modal */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Interview Preparation Pack</DialogTitle>
            <DialogDescription>
              Review and format the combined pack below so it reads like a
              polished, presentable document, then save.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <CvVariantEditor content={editedHtml} onChange={setEditedHtml} />
          </div>

          <DialogFooter className="shrink-0">
            {reviewStage === "review" ? (
              <>
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isRejecting || isPreviewing}
                  onClick={handleReject}
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  variant="outline"
                  disabled={isPreviewing || isRejecting}
                  onClick={handleDownloadPreview}
                >
                  {isPreviewing ? "Preparing..." : "Download"}
                </Button>
                <Button
                  className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
                  disabled={isPreviewing || isRejecting}
                  onClick={() => setReviewStage("confirm")}
                >
                  Continue →
                </Button>
              </>
            ) : (
              <>
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
                  onClick={() => handleSave("docx")}
                >
                  {isSaving && savingFormat === "docx" ? "Saving..." : "Save as DOC"}
                </Button>
                <Button
                  className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
                  disabled={isSaving}
                  onClick={() => handleSave("pdf")}
                >
                  {isSaving && savingFormat === "pdf" ? "Saving..." : "Save as PDF"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download modal */}
      <Dialog open={isDownloadOpen} onOpenChange={setIsDownloadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Interview Pack Saved</DialogTitle>
            <DialogDescription>
              The interview pack has been saved to the client&apos;s documents.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
              onClick={handleDownload}
            >
              Download Interview Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
