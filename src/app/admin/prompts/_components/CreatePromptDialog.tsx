"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateVcsPrompt } from "../hooks/use-vcs-prompts";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

interface CreatePromptDialogProps {
  onCreated: (id: string) => void;
}

const CreatePromptDialog = ({ onCreated }: CreatePromptDialogProps) => {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [active, setActive] = useState(true);

  const { mutateAsync: createPrompt, isPending } = useCreateVcsPrompt();

  const reset = () => {
    setKey("");
    setPrompt("");
    setActive(true);
  };

  const handleSubmit = async () => {
    const normalizedKey = slugify(key);

    if (!normalizedKey) {
      toast.error("Enter a valid key (e.g. cover_letter_generation_prompt).");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Prompt text is required.");
      return;
    }

    try {
      const result = await createPrompt({ key: normalizedKey, prompt, active });
      toast.success(`Prompt "${normalizedKey}" created.`);
      setOpen(false);
      reset();
      onCreated(result.data.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create prompt.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Button
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus size={16} />
        New Prompt
      </Button>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create Prompt</DialogTitle>
          <DialogDescription>
            Add a new key-based prompt to the VCS store. The key is how backend
            services look this prompt up, so pick something descriptive and
            stable.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Key
            </label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. cover_letter_generation_prompt"
            />
            {key && (
              <p className="text-xs text-gray-400">
                Will be saved as{" "}
                <span className="font-mono text-primary">{slugify(key)}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type the full prompt text..."
              className="min-h-[220px] font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">Active</span>
              <span className="text-xs text-gray-500">
                Inactive prompts won&apos;t be picked up by services querying this key.
              </span>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between pt-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePromptDialog;
