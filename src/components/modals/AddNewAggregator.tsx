"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { ImSpinner2 } from "react-icons/im";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminMutations } from "@/hooks/api/admin.api";

interface AddNewAggregatorProps {
  setShowModal: (status: boolean) => void;
}

/** Converts a File object to a Base64-encoded data-URI string. */
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const AddNewAggregator: React.FC<AddNewAggregatorProps> = ({
  setShowModal,
}) => {
  const { createAggregatorMutation } = useAdminMutations();
  const [name, setName] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const selectFile = (selected: File) => {
    if (selected.type !== "image/jpeg" && selected.type !== "image/png") {
      toast.error("Invalid file type. Only JPEG and PNG are allowed.");
      return;
    }
    setFile(selected);
    // Show a local object-URL preview immediately — no round-trip needed
    setPreview(URL.createObjectURL(selected));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) selectFile(droppedFile);
  };

  /**
   * Single-step submit:
   *  1. Convert the selected File to a Base64 string.
   *  2. POST to /api/v1/aggregator with { name, picture: { base64, filename } }.
   *  The backend AggregatorService detects picture.base64, uploads to Firebase,
   *  and stores the permanent URL — no separate upload endpoint required.
   */
  const handleSubmit = async () => {
    if (!name) return toast.error("Name is required");
    if (!file) return toast.error("Please select an aggregator image");

    try {
      const base64 = await toBase64(file);

      const payload = {
        name,
        picture: {
          base64,
          filename: file.name,
        },
      };

      const res = await createAggregatorMutation.mutateAsync(payload);

      if (res?.success) {
        toast.success("Aggregator created successfully");
        setShowModal(false);
      } else {
        toast.error(res?.message ?? "Failed to create aggregator");
      }
    } catch {
      toast.error("An error occurred while creating the aggregator");
    }
  };

  const isPending = createAggregatorMutation.isPending;

  return (
    <Dialog open={true} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Job Site</DialogTitle>
          <p className="text-career-gray-200">
            Add a new aggregator to existing Aggregator
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center my-6 gap-4">
          {/* Logo picker */}
          <div
            className="w-[56px] h-[56px] bg-blue rounded-full flex flex-col items-center justify-center cursor-pointer relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {isPending ? (
              <ImSpinner2 className="animate-spin text-2xl text-white" />
            ) : preview ? (
              <Image
                src={preview}
                alt="Aggregator logo preview"
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-camera"
              >
                <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0z" />
                <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />
                <path d="M18 7h2v3h-2z" />
              </svg>
            )}

            {!preview && !isPending && (
              <input
                type="file"
                accept="image/jpeg, image/png"
                onChange={(e) => {
                  if (e.target.files?.[0]) selectFile(e.target.files[0]);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            )}
          </div>

          {file && (
            <p className="text-xs text-career-gray-200 truncate max-w-[200px]">
              {file.name}
            </p>
          )}

          {/* Name input */}
          <input
            type="text"
            required
            spellCheck={true}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aggregator name"
            value={name}
            className="px-4 py-3 border-[2px] border-career-black-200 w-full h-12"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isPending || !file || !name}
          className="mt-4"
        >
          {isPending ? (
            <ImSpinner2 className="animate-spin" />
          ) : (
            "Add Aggregator"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewAggregator;
