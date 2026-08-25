"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineSparkles,
  HiOutlineDocumentSearch,
  HiOutlineColorSwatch,
} from "react-icons/hi";
import {
  useCvVariantGeneration,
  type CvVariantResult,
  type SaveCvVariantFormat,
} from "@/hooks/useCvVariantGeneration";
import { flattenCvVariantToHtml, collectCvVariantFlags } from "@/utils/cvVariantFormat";
import { Button } from "@/components/ui/button";
import CvVariantEditor from "./CvVariantEditor";
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
  "Selecting the house style…",
  "Elevating flat bullets into outcomes…",
  "Tagging AI-authored content…",
  "Finalizing the CV variant…",
];

const STYLE_BADGE_CLASSES: Record<string, string> = {
  modern: "bg-career-blue-800/10 text-career-blue-800",
  classic: "bg-slate-200 text-slate-700",
  contemporary: "bg-emerald-100 text-emerald-700",
};

/**
 * Flow behind the "Generate" button in the Generate CV Variant column:
 * 1. Show a loading modal while AI consolidates + enriches the CV.
 * 2. Show the style/flags summary + an editable, flattened text preview.
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
  const [result, setResult] = useState<CvVariantResult | null>(null);
  const [editedHtml, setEditedHtml] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [savedDocument, setSavedDocument] = useState<{ publicId: string; name: string } | null>(null);
  // "review" = Reject/Download/Continue gate; "confirm" = the actual Save
  // as DOC/PDF step. Keeps generating something and it becoming visible to
  // the client as two distinct, deliberate actions.
  const [reviewStage, setReviewStage] = useState<"review" | "confirm">("review");
  const [isRejecting, setIsRejecting] = useState(false);

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
      const data = await generateCvVariant({ userId, resumeUploadId });
      if (!data || Object.keys(data).length === 0) {
        toast.error("No CV variant was returned");
        return;
      }
      const html = flattenCvVariantToHtml(data);
      if (!html.trim()) {
        toast.error("The AI response couldn't be turned into a CV — try generating again");
        return;
      }
      setResult(data);
      setEditedHtml(html);
      setReviewStage("review");
      setIsReviewOpen(true);
      toast.success("CV variant generated");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to generate CV variant";
      toast.error(message);
    }
  };

  const handleReject = () => {
    setIsRejecting(true);
    const toastId = toast.loading("Rejecting CV variant...");
    setIsReviewOpen(false);
    setResult(null);
    setEditedHtml("");
    setReviewStage("review");
    toast.dismiss(toastId);
    toast.success("CV variant rejected");
    setIsRejecting(false);
  };

  const handleDownloadPreview = async () => {
    const toastId = toast.loading("Preparing preview...");
    try {
      const { blob, filename } = await previewCvVariant({
        userId,
        resumeUploadId,
        cvVariant: editedHtml,
        format: "pdf",
        design: result?.design,
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

  const handleSave = async (format: SaveCvVariantFormat) => {
    try {
      const data = await saveCvVariant({
        userId,
        resumeUploadId,
        cvVariant: editedHtml,
        format,
        design: result?.design,
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

  const flags = result ? collectCvVariantFlags(result) : [];

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

      {/* Review + edit modal */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>CV Variant</DialogTitle>
            <DialogDescription>
              {result?.client_name
                ? `Generated for ${result.client_name}. Format it below so it reads like a presentable CV, then save.`
                : "Review and format the AI-generated CV variant, then save it."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            {result && (
              <div className="flex flex-wrap items-center gap-2 text-13">
                {result.style_variant && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold capitalize ${
                      STYLE_BADGE_CLASSES[result.style_variant] ?? "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <HiOutlineColorSwatch />
                    {result.style_variant}
                  </span>
                )}
                {result.style_reasoning && (
                  <span className="text-career-gray-200">{result.style_reasoning}</span>
                )}
                {result.design && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-career-gray-300 px-2.5 py-1">
                    <span
                      className="h-3 w-3 rounded-full border border-black/10"
                      style={{ backgroundColor: result.design.accent_color }}
                    />
                    <span className="capitalize text-career-gray-200">
                      {result.design.font_family} · {result.design.density}
                    </span>
                  </span>
                )}
              </div>
            )}

            {flags.length > 0 && (
              <div className="max-h-32 overflow-auto rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Flags — review before saving</p>
                <ul className="mt-1 list-disc pl-5">
                  {flags.map((item, index) => (
                    <li key={index}>
                      <span className="font-medium">{item.source}:</span> {item.flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
