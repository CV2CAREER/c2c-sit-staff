import AppModal from '@/components/modals/AppModal';
import AddDropDownForm from './Forms/add-dropdown-form';

interface AddModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

function AddModal({ showModal, setShowModal }: AddModalProps) {
  return (
    <AppModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
    >
      <div className="bg-white rounded-lg p-3">
        <h2 className="text-xl text-black mt-2 mb-4 font-semibold">Add New Dropdown Option</h2>
        <AddDropDownForm  setShowModal={setShowModal} />
      </div>
    </AppModal>
  );
}

export default AddModal;
