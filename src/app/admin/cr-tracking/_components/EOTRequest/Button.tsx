"use client";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useState } from "react";

const EOTRequestModal = dynamic(() => import("./Modal"), { ssr: false });

export default function EOTRequest() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        Request EOT
      </Button>
      {isModalOpen && (
        <EOTRequestModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} />
      )}
    </>
  );
}
