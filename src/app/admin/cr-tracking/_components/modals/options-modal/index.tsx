import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaSpinner } from "react-icons/fa6";

const CudOptionsDialog = dynamic(() => import("./CudOptionsDialog"));

const CRTrackingOptionsModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>CR Options</Button>
      {open && (
        <Suspense fallback={<FaSpinner />}>
          <CudOptionsDialog isOpen={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default CRTrackingOptionsModal;
