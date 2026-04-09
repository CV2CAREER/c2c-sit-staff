import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { FaSpinner } from "react-icons/fa6";

const CreateCRTrackingModalContent = dynamic(() => import("./content"));

const CreateCRTrackingModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create CR</Button>
      {open && (
        <Suspense fallback={<FaSpinner />}>
          <CreateCRTrackingModalContent open={open} setOpen={setOpen} />
        </Suspense>
      )}
    </>
  );
};

export default CreateCRTrackingModal;
