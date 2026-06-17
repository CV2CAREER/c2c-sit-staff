import { useAdminMutations } from "@/hooks/api/admin.api";
import AppModal from "../modals/AppModal";
import { Button } from "../ui/button";

const MutateAccountModal = ({
  open,
  setIsOpen,
  actionText,
  action,
  affirmButtonStyles,
  userId,
  mutateType = "",
}: {
  open: boolean;
  setIsOpen: (open: boolean) => void;
  actionText: string;
  action: string;
  affirmButtonStyles: string;
  userId: string;
  mutateType?: string;
}) => {
  const {
    accountActionMutation: acceptMutation,
    permanentDeleteUserMutation: deleteMutation,
    reviewDocumentMutation, // ← This is the key one
  } = useAdminMutations();

  const handleConfirm = () => {
    if (mutateType === "accept-documents") {
      reviewDocumentMutation.mutate({
        ids: [], // ← TODO: You need document IDs here
        status: "approved", // or "accepted" — check your backend
      });
    } else if (mutateType === "reject-documents") {
      reviewDocumentMutation.mutate({
        ids: [], // ← TODO: You need document IDs here
        status: "rejected",
      });
    } else if (action === "Accept") {
      acceptMutation.mutate({ userId, action: action.toLowerCase() });
    } else if (action === "Delete") {
      deleteMutation.mutate({ userId });
    }

    setIsOpen(false);
  };

  return (
    <AppModal
      isOpen={open}
      onClose={() => setIsOpen(false)}
      contentClassName="w-[200%]"
    >
      <div className="flex justify-center">
        <div className="bg-white rounded-lg w-72 p-6">
          <h2 className="font-semibold text-xl mb-6">
            Are you sure you want to {actionText}?
          </h2>
          <div className="flex justify-between gap-3">
            <Button
              className={`text-white p-2 w-1/2 rounded-lg ${affirmButtonStyles}`}
              onClick={handleConfirm}
            >
              {action}
            </Button>
            <Button
              className="shadow-sm p-2 w-1/2 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </AppModal>
  );
};
export default MutateAccountModal;

// import { Button } from "@/components/ui/button";
// import { useAdminMutations } from "@/hooks/api/admin.api";
// import AppModal from "../modals/AppModal";

// export const MutateAccountModal = ({
//   open,
//   setIsOpen,
//   actionText,
//   action, // e.g. "Accept", "Reject"
//   affirmButtonStyles,
//   userId,
//   mutateType, // ← New prop
// }: {
//   open: boolean;
//   setIsOpen: (open: boolean) => void;
//   actionText: string;
//   action: string;
//   affirmButtonStyles: string;
//   userId: string;
//   mutateType: string;
// }) => {
//   const {
//     accountActionMutation: acceptMutation,
//     permanentDeleteUserMutation: deleteMutation,
//     // Add your document mutations here (adjust names based on your hook)
//     acceptDocumentsMutation,
//     rejectDocumentsMutation,
//   } = useAdminMutations();

//   const handleConfirm = () => {
//     if (mutateType === "accept-documents" && acceptDocumentsMutation) {
//       acceptDocumentsMutation.mutate({ userId });
//     } else if (mutateType === "reject-documents" && rejectDocumentsMutation) {
//       rejectDocumentsMutation.mutate({ userId });
//     } else if (action === "Accept") {
//       acceptMutation.mutate({ userId, action: action.toLowerCase() });
//     } else if (action === "Delete") {
//       deleteMutation.mutate({ userId });
//     }

//     setIsOpen(false);
//   };

//   return (
//     <AppModal
//       isOpen={open}
//       onClose={() => setIsOpen(false)}
//       contentClassName="w-[200%]"
//     >
//       <div className="flex justify-center">
//         <div className="bg-white rounded-lg w-72">
//           <h2 className="font-semibold text-xl">
//             {`Are you sure you want to ${actionText}?`}
//           </h2>
//           <div className="flex justify-between mt-3">
//             <Button
//               className={`text-white p-2 w-1/2 rounded-lg ${affirmButtonStyles}`}
//               onClick={handleConfirm}
//             >
//               {action}
//             </Button>
//             <Button
//               className="ml-1 shadow-sm p-2 w-1/2 rounded-lg"
//               onClick={() => setIsOpen(false)}
//             >
//               Cancel
//             </Button>
//           </div>
//         </div>
//       </div>
//     </AppModal>
//   );
// };

// export default MutateAccountModal;
