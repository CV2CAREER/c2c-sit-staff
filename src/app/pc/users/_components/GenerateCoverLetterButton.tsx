"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { useCoverLetterGeneration, type SaveCoverLetterFormat } from "@/hooks/useCoverLetterGeneration";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface GenerateCoverLetterButtonProps {
  userId: string;
  resumeUploadId: string;
}

/**
 * Flow behind the "Generate" button in the Cover Letter column:
 * 1. Collect the job link + job description.
 * 2. Show the AI-generated cover letter, editable, for review.
 * 3. Save as PDF or DOC — uploads to Firebase and records a `coverletter`
 *    Upload for the client.
 * 4. Show a download link for the saved file.
 */
export default function GenerateCoverLetterButton({
  userId,
  resumeUploadId,
}: GenerateCoverLetterButtonProps) {
  const {
    generateCoverLetter,
    isGenerating,
    previewCoverLetter,
    isPreviewing,
    saveCoverLetter,
    isSaving,
    savingFormat,
    getDownloadUrl,
  } = useCoverLetterGeneration();

  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [jobLink, setJobLink] = useState("");
  const [jobContent, setJobContent] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [savedDocument, setSavedDocument] = useState<{
    publicId: string;
    name: string;
  } | null>(null);
  // "review" = Reject/Download/Continue gate; "confirm" = the actual Save
  // as DOC/PDF step. Keeps generating something and it becoming visible to
  // the client as two distinct, deliberate actions.
  const [reviewStage, setReviewStage] = useState<"review" | "confirm">("review");
  const [isRejecting, setIsRejecting] = useState(false);

  const handleGenerate = async () => {
    if (!jobContent.trim()) {
      toast.error("Job description is required");
      return;
    }

    try {
      const data = await generateCoverLetter({ userId, resumeUploadId, jobLink, jobContent });
      setCoverLetter(data?.coverLetter ?? "");
      setIsInputOpen(false);
      setReviewStage("review");
      setIsResultOpen(true);
      toast.success("Cover letter generated");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to generate cover letter";
      toast.error(message);
    }
  };

  const handleReject = () => {
    setIsRejecting(true);
    const toastId = toast.loading("Rejecting cover letter...");
    setIsResultOpen(false);
    setCoverLetter("");
    setReviewStage("review");
    toast.dismiss(toastId);
    toast.success("Cover letter rejected");
    setIsRejecting(false);
  };

  const [previewingFormat, setPreviewingFormat] = useState<SaveCoverLetterFormat | null>(null);
  const handleDownloadPreview = async (format: SaveCoverLetterFormat) => {
    const toastId = toast.loading("Preparing preview...");
    setPreviewingFormat(format);
    try {
      const { blob, filename } = await previewCoverLetter({
        userId,
        resumeUploadId,
        coverLetter,
        format,
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      toast.dismiss(toastId);
    } catch (error: any) {
      toast.dismiss(toastId);
      // A plain Error here (not error.isAxiosError) means the hook already
      // extracted the real backend message from the blob response body —
      // trust it. Otherwise fall back to the normal JSON-error shape.
      const message = error?.isAxiosError
        ? error?.response?.data?.message || "Failed to generate preview"
        : error?.message || "Failed to generate preview";
      toast.error(message);
    } finally {
      setPreviewingFormat(null);
    }
  };

  const handleSave = async (format: SaveCoverLetterFormat) => {
    try {
      const data = await saveCoverLetter({ userId, resumeUploadId, coverLetter, format });
      const document_ = data?.upload?.document;
      if (!document_?.publicId) {
        toast.error("Cover letter saved, but no download reference was returned");
        return;
      }
      setSavedDocument({ publicId: document_.publicId, name: document_.name });
      setIsResultOpen(false);
      setIsDownloadOpen(true);
      toast.success("Cover letter saved");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to save cover letter";
      toast.error(message);
    }
  };

  const handleDownload = async () => {
    if (!savedDocument) return;
    toast.loading("Downloading cover letter");

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
      toast.error(err?.message || "Failed to download cover letter");
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

      <Dialog open={isInputOpen} onOpenChange={setIsInputOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Cover Letter</DialogTitle>
            <DialogDescription>
              Paste the job link and job description — the AI will write a
              cover letter tailored to this resume.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-link">Job Link</Label>
              <Input
                id="job-link"
                placeholder="https://..."
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-content">Job Description</Label>
              <Textarea
                id="job-content"
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
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Generated Cover Letter</DialogTitle>
            <DialogDescription>
              Review and edit the AI-generated cover letter, then save it.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={16}
              className="font-mono text-sm"
            />
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
                  onClick={() => handleDownloadPreview("docx")}
                >
                  {isPreviewing && previewingFormat === "docx" ? "Preparing..." : "Download DOC"}
                </Button>
                <Button
                  variant="outline"
                  disabled={isPreviewing || isRejecting}
                  onClick={() => handleDownloadPreview("pdf")}
                >
                  {isPreviewing && previewingFormat === "pdf" ? "Preparing..." : "Download PDF"}
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
                  onClick={() => setIsResultOpen(false)}
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

      <Dialog open={isDownloadOpen} onOpenChange={setIsDownloadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cover Letter Saved</DialogTitle>
            <DialogDescription>
              The cover letter has been saved to the client&apos;s documents.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              className="bg-[#0D9F6E] rounded-full hover:bg-[#0b8a5f]"
              onClick={handleDownload}
            >
              Download Cover Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
