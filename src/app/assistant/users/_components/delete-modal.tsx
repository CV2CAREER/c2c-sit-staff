'use client';
import DeleteDropDown from './delete-dropdown';
import AppModal from '@/components/modals/AppModal';

function DeleteModal({ showModal, setShowModal, columnHeaders }: { 
  showModal: boolean; 
  setShowModal: (show: boolean) => void; 
  columnHeaders: any[] 
}) {
  return (
    <AppModal
      isOpen={showModal}
      onClose={()=>setShowModal(false)}
    >
      <div className="bg-white rounded-lg p-3">
        <h2 className="text-xl text-black mt-2 mb-4 font-semibold">Delete Dropdown Option</h2>
        <DeleteDropDown columnHeaders={columnHeaders} setShowModal={setShowModal} />
      </div>
    </AppModal>
  );
}

export default DeleteModal;
