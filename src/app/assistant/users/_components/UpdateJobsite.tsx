import CustomModal from "@/components/CustomModal/CustomModal";
import { useState } from "react";

interface UpdateJobsiteProps {
  visibility: boolean;
  toggleVisibility: () => void;
  data: any;
  handleSubmit: (data: any) => Promise<void>;
}

const UpdateJobsite = ({ visibility, toggleVisibility, data, handleSubmit }: UpdateJobsiteProps) => {
  const d = {...data}
  
  const [formData, setFormData] = useState({
    username: d?.username ?? "",
    password: d?.password ?? "",
    generatedEmail: d?.generatedEmail ?? "",
    id: d.id
  });

  const [loading, setLoading] = useState(false)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true)
    try{
      await handleSubmit(formData);
    }catch{
    }finally{
    setLoading(false)
    toggleVisibility();
    }
  };

  return (
    <CustomModal z="z-1500" visibility={visibility} toggleVisibility={toggleVisibility}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto z-1500">
        <h2 className="text-xl font-semibold mb-4">Update Jobsite</h2>
        <form onSubmit={onSubmit} className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Generated Email</label>
            <input
              type="text"
              name="generatedEmail"
              value={formData.generatedEmail}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              value={formData.password}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 transition ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {loading && (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                />
              </svg>
            )}
            {loading ? 'Submitting...' : 'Submit'}
          </button>
          </div>
        </form>
      </div>
    </CustomModal>
  );
};

export default UpdateJobsite;
