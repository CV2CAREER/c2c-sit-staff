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

const AddNewAggregator: React.FC<AddNewAggregatorProps> = ({
  setShowModal,
}) => {
  const { fileUploadMutation, createAggregatorMutation } = useAdminMutations();
  const [name, setName] = useState<string>("");
  const [imgUrl, setImgUrl] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile &&
      (droppedFile.type === "image/jpeg" || droppedFile.type === "image/png")
    ) {
      setFile(droppedFile);
    } else {
      toast.error("Invalid file type. Only JPEG and PNG are allowed.");
    }
  };

  const handleImageUpload = async () => {
    if (!name) return toast.error("Name is required");

    if (!file) return toast.error("Upload an aggregator image");

    const formData = new FormData();
    formData.append("picture", file);

    try {
      const data = await fileUploadMutation.mutateAsync(formData);

      if (data.success) {
        const picture = data.data[0]?.picture;
        const payload = {
          picture: picture,
          name,
        };

        setImgUrl(payload?.picture?.fileUrl);
        await handleCreateAggregator(payload);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("An error occurred while uploading image");
    }
  };

  const handleCreateAggregator = async (payload: any) => {
    try {
      const res = await createAggregatorMutation.mutateAsync(payload);
      if (res.success) {
        toast.success("Aggregator created");
        setShowModal(false);
      }
    } catch {
      toast.error("An error occurred while creating aggregator");
    }
  };

  return (
    <Dialog open={true} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Job Site</DialogTitle>
          <p className="text-career-gray-200">
            Add a new aggregator to existing Aggregator
          </p>
        </DialogHeader>
        <div className="flex flex-col items-center my-6">
          <div
            className="w-[56px] h-[56px] bg-blue rounded-full flex flex-col items-center justify-center cursor-pointer relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="">
              {fileUploadMutation.isPending || createAggregatorMutation.isPending ? (
                <ImSpinner2 className="animate-spin text-2xl text-white" />
              ) : imgUrl ? (
                <Image src={imgUrl} alt="" width={40} height={40} />
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
            </div>
            {!imgUrl && !fileUploadMutation.isPending && !createAggregatorMutation.isPending && (
              <input
                type="file"
                accept="image/jpeg, image/png"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            )}
          </div>
          <input
            type="text"
            required
            spellCheck={true}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aggregator name"
            value={name}
            className="px-4 py-3 border-[2px] border-career-black-200 w-full h-12 ml-4"
          />
        </div>
        <Button
          onClick={handleImageUpload}
          disabled={fileUploadMutation.isPending || createAggregatorMutation.isPending || !file || !name}
          className="mt-4"
        >
          {fileUploadMutation.isPending || createAggregatorMutation.isPending ? (
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
