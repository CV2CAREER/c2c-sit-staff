"use client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineSparkles,
  HiOutlineDocumentSearch,
  HiOutlineQuestionMarkCircle,
  HiCheckCircle,
} from "react-icons/hi";
import {
  useCvVariantGeneration,
  type SaveCvVariantFormat,
  type ConfirmedAnswer,
  type ConfirmQuestion,
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
  const [confirmQuestions, setConfirmQuestions] = useState<ConfirmQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Every answer confirmed across ALL rounds of this Generate session, not
  // just the latest one — each regenerate call re-sends the full cumulative
  // list, otherwise a fact confirmed in round 1 drops out of the AI's view
  // the moment round 2 only carries round 2's answers, and it can re-ask
  // (or re-derive) something already settled.
  const [confirmedSoFar, setConfirmedSoFar] = useState<ConfirmedAnswer[]>([]);
  // Hard backstop against the AI re-asking (possibly reworded) questions
  // round after round — after this many regenerate rounds we stop trusting
  // it to converge and just proceed to review with whatever's confirmed.
  const [questionRound, setQuestionRound] = useState(0);
  const MAX_QUESTION_ROUNDS = 2;
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
        setConfirmedSoFar([]);
        setQuestionRound(0);
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
    const newlyAnswered: ConfirmedAnswer[] = confirmQuestions
      .filter((q) => answers[q.question]?.trim())
      .map((q) => ({ question: q.question, answer: answers[q.question].trim() }));

    if (newlyAnswered.length === 0) {
      toast.error("Answer at least one question, or use Skip instead");
      return;
    }

    // Merge into everything confirmed in earlier rounds too — a later
    // answer for the same question text wins, but nothing already settled
    // gets dropped just because this round's list moved on from it.
    const merged = new Map(confirmedSoFar.map((a) => [a.question, a]));
    newlyAnswered.forEach((a) => merged.set(a.question, a));
    const confirmedAnswers = Array.from(merged.values());

    const nextRound = questionRound + 1;

    try {
      const { html, confirmQuestions: questions } = await generateCvVariant({
        userId,
        resumeUploadId,
        confirmedAnswers,
      });
      setCvVariantHtml(html);
      setConfirmedSoFar(confirmedAnswers);
      setQuestionRound(nextRound);

      // Give it a bounded number of chances to converge — if it's still
      // surfacing questions after this many rounds, trust the admin's
      // answers over the AI's persistence and move on rather than looping.
      if (questions.length > 0 && nextRound < MAX_QUESTION_ROUNDS) {
        setConfirmQuestions(questions);
        setAnswers((prev) => {
          const next: Record<string, string> = {};
          questions.forEach((q) => {
            next[q.question] = prev[q.question] ?? "";
          });
          return next;
        });
        toast("A few things are still unconfirmed", { icon: "ℹ️" });
        return;
      }

      if (questions.length > 0) {
        toast("Proceeding with what's confirmed — remaining items stay visible in the document", {
          icon: "ℹ️",
        });
      } else {
        toast.success("Confirmed — CV updated");
      }
      setIsQuestionsOpen(false);
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
    setConfirmedSoFar([]);
    setQuestionRound(0);
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

      {/* Loading modal — suppressed while the questions modal is open, since
          "Submit & regenerate" already shows its own inline loading state
          on that dialog's button; without this guard both dialogs render
          open at once (the loading modal stacking on top). */}
      <Dialog open={isGenerating && !isQuestionsOpen}>
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
          generation. This is purely an internal resolution step: the
          backend always strips its "Please Confirm" section out of the
          actual CV before it's ever previewed/saved, whether a question
          got answered, skipped, or left open. */}
      <Dialog open={isQuestionsOpen}>
        <DialogContent
          className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden rounded-2xl border-none p-0 shadow-2xl [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-2 border-b border-career-gray-300/60 bg-gradient-to-br from-[#0D9F6E]/5 to-transparent px-6 pb-4 pt-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0D9F6E]/10 text-[#0D9F6E]">
                <HiOutlineQuestionMarkCircle size={20} />
              </div>
              <DialogTitle className="text-lg">A few questions</DialogTitle>
            </div>
            <DialogDescription>
              The AI couldn&apos;t confirm these on its own. Answer what you already know — it
              gets folded back in as a confirmed fact. Skip to proceed with the CV as-is; these
              questions never appear in the actual CV either way, answered or not.
            </DialogDescription>
            <div className="flex items-center gap-2 pt-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-career-gray-300/50">
                <div
                  className="h-full rounded-full bg-[#0D9F6E] transition-all duration-300"
                  style={{
                    width: `${(Object.values(answers).filter((a) => a?.trim()).length / Math.max(confirmQuestions.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-career-gray-200">
                {Object.values(answers).filter((a) => a?.trim()).length} of {confirmQuestions.length} answered
              </span>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
            {confirmQuestions.map(({ question, options }, index) => {
              const currentAnswer = answers[question] ?? "";
              const isAnswered = !!currentAnswer.trim();
              return (
                <div
                  key={index}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    isAnswered
                      ? "border-[#0D9F6E]/30 bg-[#0D9F6E]/[0.03]"
                      : "border-career-gray-300/70 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-start gap-2">
                    {isAnswered ? (
                      <HiCheckCircle size={18} className="mt-0.5 shrink-0 text-[#0D9F6E]" />
                    ) : (
                      <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-career-gray-300/60 text-[10px] font-semibold text-career-gray-200">
                        {index + 1}
                      </span>
                    )}
                    <label className="text-13 font-medium leading-snug text-career-black-200">
                      {question}
                    </label>
                  </div>
                  {options && options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={isGenerating}
                          onClick={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question]: prev[question] === option ? "" : option,
                            }))
                          }
                          className={`rounded-full border px-3.5 py-1.5 text-13 font-medium transition-colors disabled:opacity-50 ${
                            currentAnswer === option
                              ? "border-[#0D9F6E] bg-[#0D9F6E] text-white"
                              : "border-career-gray-300/70 bg-white text-career-black-200 hover:border-[#0D9F6E]/40 hover:text-[#0D9F6E]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Textarea
                      value={currentAnswer}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [question]: e.target.value }))
                      }
                      disabled={isGenerating}
                      placeholder="Leave blank if you don't know — it just won't appear in the CV"
                      className="min-h-[60px] border-career-gray-300/70 bg-white text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="shrink-0 border-t border-career-gray-300/60 px-6 py-4">
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
        <DialogContent className="flex h-[85vh] max-h-[85vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>CV Variant</DialogTitle>
            <DialogDescription>
              Review the AI-designed CV below, then save it. The design (colors, layout, fonts)
              is the AI's own — reject and regenerate if you want a different look.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-career-gray-300 bg-career-gray-100">
            {previewUrl ? (
              // The #view=FitH fragment tells the browser's native PDF viewer
              // to fit the page to the iframe's width — without it, PDFs
              // default to a small zoom level surrounded by the viewer's own
              // dark chrome, making the preview look tiny inside the modal.
              <iframe
                title="CV Variant Preview"
                src={`${previewUrl}#view=FitH`}
                className="h-full w-full"
              />
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
