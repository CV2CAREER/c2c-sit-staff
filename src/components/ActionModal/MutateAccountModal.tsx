import AppModal from "../modals/AppModal";
import { Button } from "../ui/button";

const MutateAccountModal = ({
  open,
  onClose,
  actionText,
  action,
  userId,
  acceptMutation,
}: {
  open: boolean;
  onClose: () => void;
  actionText: string;
  action: string;
  userId: string;
  acceptMutation: any;
}) => {
  const handleConfirm = () => {
    acceptMutation.mutate({ userId, action: action.toLowerCase() });
    onClose();
  };

  return (
    <AppModal isOpen={open} onClose={onClose} contentClassName="w-[200%]">
      <div className="flex justify-center">
        <div className="bg-white rounded-lg w-72 p-6">
          <h2 className="font-semibold text-xl text-center">
            Are you sure you want to {actionText}?
          </h2>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              {action}
            </Button>
          </div>
        </div>
      </div>
    </AppModal>
  );
};
export default MutateAccountModal;
