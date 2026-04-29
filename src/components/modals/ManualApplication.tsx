/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from 'antd';
import { useCampaignMutations } from '@/hooks/api/admin/campaign';

interface EditRoleModalProps {
  visible: boolean;
  onClose: () => void;
  clientId: any;
  setReload?: () => void;
}

// Define the JobData interface for type safety
interface JobData {
  job_title: string;
  company: string;
  location: string;
  job_type: string;
  country: string;
  salary: string;
  date_advertised: string;
  job_id?: string;
  internal_jobsite?: string;
  external_jobsite?: string;
  job_site_name?: string;
  extraction_source?: string;
  ai_service?: string;
  client_name?: string;
  job_url?: string;
  is_duplicate?: boolean;
  job_title_display?: string;
  [key: string]: any;
}

// Editable AI Preview Modal Component
const AIEditModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: (editedData: JobData) => void;
  jobData: JobData | null;
  loading: boolean;
}> = ({ visible, onClose, onConfirm, jobData, loading }) => {
  const [editedData, setEditedData] = useState<JobData>({} as JobData);

  useEffect(() => {
    if (jobData) {
      setEditedData(jobData);
    }
  }, [jobData]);

  const handleFieldChange = (field: keyof JobData, value: string) => {
    setEditedData((prev: JobData) => ({ ...prev, [field]: value }));
  };

  if (!jobData) return null;

  return (
    <Modal
      title="Review & Edit Job Data"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
    >
      <div className="p-4">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Job Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editedData.job_title || ''}
              onChange={(e) => handleFieldChange('job_title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Job Title"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editedData.company || ''}
              onChange={(e) => handleFieldChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Company Name"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editedData.location || ''}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="City, State, Country"
            />
          </div>

          {/* Job Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Job Type
            </label>
            <select
              value={editedData.job_type || 'N/A'}
              onChange={(e) => handleFieldChange('job_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="N/A">Select Job Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Permanent">Permanent</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              value={editedData.country || ''}
              onChange={(e) => handleFieldChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Country"
            />
          </div>

          {/* Salary */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Salary
            </label>
            <input
              type="text"
              value={editedData.salary || 'N/A'}
              onChange={(e) => handleFieldChange('salary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Salary or N/A"
            />
          </div>

          {/* Date Advertised */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Date Advertised
            </label>
            <input
              type="date"
              value={editedData.date_advertised || ''}
              onChange={(e) => handleFieldChange('date_advertised', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Job Site Info - Read Only */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-2 bg-gray-50 rounded">
              <span className="text-xs font-semibold">Internal Jobsite:</span>
              <span className="text-xs ml-2">{jobData.internal_jobsite || 'N/A'}</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="text-xs font-semibold">External Jobsite:</span>
              <span className="text-xs ml-2">{jobData.external_jobsite || 'N/A'}</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="text-xs font-semibold">Job ID:</span>
              <span className="text-xs ml-2">{jobData.job_id || 'N/A'}</span>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="text-xs font-semibold">Job Site:</span>
              <span className="text-xs ml-2">{jobData.job_site_name || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(editedData)}
            disabled={loading}
            className={`px-6 py-2 rounded-md text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {loading ? 'Saving...' : 'Confirm & Save to Database'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ManualApplicationsModal: React.FC<EditRoleModalProps> = ({
  visible,
  onClose,
  clientId,
  setReload
}) => {
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [pageContent, setPageContent] = useState('');
  const [extractedJobData, setExtractedJobData] = useState<JobData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [form, setForm] = useState({
    link: '',
  });

  const { extractCampaignJobsMutation, saveCampaignJobsMutation } = useCampaignMutations();

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const setLink = (value: string) => handleFieldChange('link', value);

  const { link: isLink } = form;

  const isValidURLFormat = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * This function calls the AI extraction API to get job data
   */
  const processWithAI = async () => {
    if (!isLink || !pageContent) {
      return toast.error("Please provide both Job Link and Page Content");
    }

    const validFormat = isValidURLFormat(isLink);
    if (!validFormat) {
      return toast.error("Provided URL is not a valid URL. Please check and retry");
    }

    setAiProcessing(true);
    const loadingToast = toast.loading('Extracting job data with AI...');

    try {
      const result = await extractCampaignJobsMutation.mutateAsync({
        clientId: clientId,
        joblink: isLink,
        pageContent: pageContent
      });
      
      toast.dismiss(loadingToast);
      
      // Store the extracted job data and show edit modal
      setExtractedJobData(result.data);
      setShowEditModal(true);
      toast.success(`AI extraction completed! Please review the data.`);

    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error?.response?.data?.message || 'Failed to process with AI');
    } finally {
      setAiProcessing(false);
    }
  };

  /**
   * This function saves the edited job data to the database
   */
  const saveEditedJobData = async (editedData: JobData) => {
    setLoading(true);
    const loadingToast = toast.loading('Saving to database...');

    try {
      await saveCampaignJobsMutation.mutateAsync({
        clientId,
        joblink: isLink,
        jobData: Array.isArray(editedData) ? editedData : [editedData]
      });
      
      toast.dismiss(loadingToast);
      toast.success('Application saved successfully');
      setPageContent('');
      setExtractedJobData(null);
      setShowEditModal(false);
      if (setReload) setReload();
      onClose();

    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error?.response?.data?.message || 'Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setForm({
        link: '',
      });
      setPageContent('');
      setLoading(false);
      setAiProcessing(false);
      setExtractedJobData(null);
      setShowEditModal(false);
    }
  }, [visible]);

  return (
    <>
      <div className="bg-white flex items-center justify-center p-8 rounded-2xl shadow-lg overflow-y-auto max-w-4xl w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processWithAI();
          }}
          className="w-full"
        >
          <div className="overflow-y-auto pr-[10px] pl-[10px] max-h-[60vh] w-full">
            <div>
              <div className="space-y-6 mb-8 w-full">
                {/* Job link input */}
                <div className="space-y-4 w-full">
                  <label
                    htmlFor={'link'}
                    className="block text-lg font-medium text-gray-700"
                  >
                    Job Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    spellCheck={true}
                    required
                    placeholder="https://example.com/job-posting"
                    value={isLink}
                    onChange={(event) => setLink(event.target.value)}
                    name="link"
                    className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
                  />
                </div>

                {/* Page Content */}
                <div className="space-y-4 w-full">
                  <label
                    htmlFor={'pageContent'}
                    className="block text-lg font-medium text-gray-700"
                  >
                    Paste Job Page Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    placeholder="Paste the entire job page content here (Ctrl+A, Ctrl+C, Ctrl+V)"
                    rows={6}
                    className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent resize-vertical"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Button container */}
          <div className="flex justify-between items-center mt-8 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg text-white font-medium transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center ${
                aiProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
              disabled={aiProcessing}
              style={{ backgroundColor: aiProcessing ? '#9CA3AF' : '#2563EB' }}
            >
              {aiProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI is Extracting...
                </>
              ) : (
                'Extract with AI' 
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Editable AI Preview Modal */}
      <AIEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={saveEditedJobData}
        jobData={extractedJobData}
        loading={loading}
      />
    </>
  );
};

export default ManualApplicationsModal;