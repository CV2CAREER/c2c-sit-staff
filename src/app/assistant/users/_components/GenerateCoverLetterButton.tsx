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

  const handleGenerate = async () => {
    if (!jobContent.trim()) {
      toast.error("Job description is required");
      return;
    }

    try {
      const data = await generateCoverLetter({ userId, resumeUploadId, jobLink, jobContent });
      setCoverLetter(data?.coverLetter ?? "");
      setIsInputOpen(false);
      setIsResultOpen(true);
      toast.success("Cover letter generated");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to generate cover letter";
      toast.error(message);
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
