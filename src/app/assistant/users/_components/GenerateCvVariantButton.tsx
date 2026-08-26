"use client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineSparkles, HiOutlineDocumentSearch } from "react-icons/hi";
import {
  useCvVariantGeneration,
  type SaveCvVariantFormat,
  type ConfirmedAnswer,
} from "@/hooks/useCvVariantGeneration";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface GenerateCvVariantButtonProps {
  userId: string;
  resumeUploadId: string;
}

const LOADING_STEPS = [
  "Reading every supplied document…",
  "Resolving conflicting details…",
  "Designing the layout…",
  "Elevating flat bullets into outcomes…",
  "Styling the finished document…",
  "Finalizing the CV variant…",
];

/**
 * Flow behind the "Generate" button in the Generate CV Variant column:
 * 1. Show a loading modal while the AI writes and designs the CV.
 * 2. Show a rendered preview of the AI's own design (no inline editing —
 *    a rich-text editor would strip the AI's custom CSS the moment it
 *    touched the content) with Reject / Download / Continue.
 * 3. Save as PDF or DOC — uploads to Firebase, records a new `resume`
 *    Upload, and advances the client's onboarding progress bar.
 * 4. Show a download link for the saved file.
 */
export default function GenerateCvVariantButton({
  userId,
  resumeUploadId,
}: GenerateCvVariantButtonProps) {
  const {
    generateCvVariant,
    isGenerating,
    previewCvVariant,
    isPreviewing,
    saveCvVariant,
    isSaving,
    savingFormat,
    getDownloadUrl,
  } = useCvVariantGeneration();

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [confirmQuestions, setConfirmQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cvVariantHtml, setCvVariantHtml] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [savedDocument, setSavedDocument] = useState<{ publicId: string; name: string } | null>(null);
  // "review" = Reject/Download/Continue gate; "confirm" = the actual Save
  // as DOC/PDF step. Keeps generating something and it becoming visible to
  // the client as two distinct, deliberate actions.
  const [reviewStage, setReviewStage] = useState<"review" | "confirm">("review");
  const [isRejecting, setIsRejecting] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

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

  // Revoke the preview object URL whenever it's replaced/cleared, and on
  // unmount — otherwise each generation leaks a blob URL.
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  };

  // Opens the review modal for a given HTML result and renders its preview —
  // shared by the no-questions path, "Skip", and "Submit & regenerate" once
  // no open questions remain.
  const openReview = async (html: string) => {
    setCvVariantHtml(html);
    setReviewStage("review");
    setIsReviewOpen(true);
    try {
      const { blob } = await previewCvVariant({
        userId,
        resumeUploadId,
        cvVariant: html,
        format: "pdf",
      });
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (previewError: any) {
      toast.error(
        previewError?.response?.data?.message || "Generated, but the preview failed to render",
      );
    }
  };

  const handleGenerate = async () => {
    try {
      const { html, confirmQuestions: questions } = await generateCvVariant({ userId, resumeUploadId });
      if (!html?.trim()) {
        toast.error("No CV variant was returned");
        return;
      }
      setCvVariantHtml(html);
      toast.success("CV variant generated");

      // The AI couldn't confirm some facts on its own (missing dates, unclear
      // responsibilities, etc.) — ask the admin now, before ever showing the
      // review step, rather than letting the AI guess and risk inventing
      // something (see CV_VARIANT_REQUIRED_PROMPT's factual-integrity rules).
      if (questions.length > 0) {
        setConfirmQuestions(questions);
        setAnswers({});
        setIsQuestionsOpen(true);
        return;
      }

      await openReview(html);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to generate CV variant";
      toast.error(message);
    }
  };

  const handleSkipQuestions = async () => {
    setIsQuestionsOpen(false);
    await openReview(cvVariantHtml);
  };

  const handleSubmitAnswers = async () => {
    const confirmedAnswers: ConfirmedAnswer[] = confirmQuestions
      .filter((q) => answers[q]?.trim())
      .map((q) => ({ question: q, answer: answers[q].trim() }));

    if (confirmedAnswers.length === 0) {
      toast.error("Answer at least one question, or use Skip instead");
      return;
    }

    try {
      const { html, confirmQuestions: questions } = await generateCvVariant({
        userId,
        resumeUploadId,
        confirmedAnswers,
      });
      setCvVariantHtml(html);

      if (questions.length > 0) {
        // Still something open (could be the same question phrased
        // differently, or a new one) — keep the modal up with the updated
        // list rather than assuming everything's resolved.
        setConfirmQuestions(questions);
        setAnswers((prev) => {
          const next: Record<string, string> = {};
          questions.forEach((q) => {
            next[q] = prev[q] ?? "";
          });
          return next;
        });
        toast("A few things are still unconfirmed", { icon: "ℹ️" });
        return;
      }

      setIsQuestionsOpen(false);
      toast.success("Confirmed — CV updated");
      await openReview(html);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to regenerate CV variant");
    }
  };

  const handleReject = () => {
    setIsRejecting(true);
    const toastId = toast.loading("Rejecting CV variant...");
    setIsReviewOpen(false);
    setCvVariantHtml("");
    setConfirmQuestions([]);
    setAnswers({});
    clearPreview();
    setReviewStage("review");
    toast.dismiss(toastId);
    toast.success("CV variant rejected");
    setIsRejecting(false);
  };

  const handleDownloadPreview = () => {
    if (!previewBlob) {
      toast.error("Preview isn't ready yet");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(previewBlob);
    link.download = "CV_Variant_Preview.pdf";
    link.click();
  };

  const handleSave = async (format: SaveCvVariantFormat) => {
    try {
      const data = await saveCvVariant({
        userId,
        resumeUploadId,
        cvVariant: cvVariantHtml,
        format,
      });
      const document_ = data?.upload?.document;
      if (!document_?.publicId) {
        toast.error("CV variant saved, but no download reference was returned");
        return;
      }
      setSavedDocument({ publicId: document_.publicId, name: document_.name });
      setIsReviewOpen(false);
      setIsDownloadOpen(true);
      toast.success("CV variant saved");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to save CV variant";
      toast.error(message);
    }
  };

  const handleDownload = async () => {
    if (!savedDocument) return;
    toast.loading("Downloading CV variant");

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
      toast.error(err?.message || "Failed to download CV variant");
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

      {/* Loading modal */}
      <Dialog open={isGenerating}>
        <DialogContent
          className="max-w-sm border-none bg-transparent shadow-none [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="relative overflow-hidden rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#0D9F6E] via-emerald-300 to-[#0D9F6E]" />

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
              Generating CV Variant
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

            <div className="mt-5 flex justify-center gap-1.5">
              {LOADING_STEPS.map((_, index) => (
                <motion.span
                  key={index}
                  className="h-1.5 w-1.5 rounded-full bg-[#0D9F6E]"
                  animate={{ opacity: index === loadingStep ? 1 : 0.25 }}
                  transition={{ duration: 0.25 }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* A few questions — the AI couldn't confirm some facts on its own.
          Answering here becomes CONFIRMED evidence fed back into a fresh
          generation; skipping leaves them as-is in the document (still
          visible to the client in its own "Please Confirm" section). */}
      <Dialog open={isQuestionsOpen}>
        <DialogContent
          className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>A few questions</DialogTitle>
            <DialogDescription>
              The AI couldn&apos;t confirm these on its own. Answer what you already know — it
              gets folded back in as a confirmed fact. Skip to proceed with the CV as-is; anything
              left unanswered stays visible to the client in the document itself.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            {confirmQuestions.map((question, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <label className="text-13 font-medium text-career-black-200">{question}</label>
                <Textarea
                  value={answers[question] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [question]: e.target.value }))
                  }
                  placeholder="Leave blank if you don't know — it'll stay as an open question"
                  className="min-h-[70px] text-sm"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" disabled={isGenerating} onClick={handleSkipQuestions}>
              Skip — use as-is
            </Button>
            <Button
              className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
              disabled={isGenerating}
              onClick={handleSubmitAnswers}
            >
              {isGenerating ? "Regenerating..." : "Submit & regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review modal — preview only, no inline editing */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>CV Variant</DialogTitle>
            <DialogDescription>
              Review the AI-designed CV below, then save it. The design (colors, layout, fonts)
              is the AI's own — reject and regenerate if you want a different look.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-career-gray-300 bg-career-gray-100">
            {previewUrl ? (
              <iframe title="CV Variant Preview" src={previewUrl} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-career-gray-200">
                {isPreviewing ? "Rendering preview…" : "Preview unavailable — try Download instead."}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            {reviewStage === "review" ? (
              <>
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isRejecting}
                  onClick={handleReject}
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!previewBlob || isRejecting}
                  onClick={handleDownloadPreview}
                >
                  Download
                </Button>
                <Button
                  className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
                  disabled={isRejecting}
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
            <DialogTitle>CV Variant Saved</DialogTitle>
            <DialogDescription>
              The CV variant has been saved to the client&apos;s documents and
              their onboarding progress has advanced to CV Variant Dispatch.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
              onClick={handleDownload}
            >
              Download CV Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
