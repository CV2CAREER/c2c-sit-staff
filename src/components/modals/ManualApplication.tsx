/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from 'antd';
import { useCampaignMutations } from '@/hooks/api/admin/campaign';
import { ClipboardList, Link2, Sparkles, FileEdit } from 'lucide-react';

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

  // Show loading state while waiting for data
  const modalTitle = (
    <span className="flex items-center gap-2 text-gray-900">
      <FileEdit size={18} className="text-primary" />
      Review &amp; Edit Job Data
    </span>
  );

  if (!jobData) {
    return (
      <Modal
        title={modalTitle}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        centered
      >
        <div className="p-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading job data...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
    >
      <div className="p-4">
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">

          {/* Duplicate warning */}
          {jobData.is_duplicate && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
              ⚠️ This job appears to be a duplicate. Please review before saving.
            </div>
          )}

          {/* Editable fields */}
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide border-b border-gray-100 pb-2 mb-4">Job Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Job Title */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Job Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editedData.job_title || ''}
                  onChange={(e) => handleFieldChange('job_title', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Job Title"
                />
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Company <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editedData.company || ''}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Company Name"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Location <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editedData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="City, State, Country"
                />
              </div>

              {/* Job Type */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Job Type</label>
                <select
                  value={editedData.job_type || 'N/A'}
                  onChange={(e) => handleFieldChange('job_type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
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
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  value={editedData.country || ''}
                  onChange={(e) => handleFieldChange('country', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Country"
                />
              </div>

              {/* Salary */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Salary</label>
                <input
                  type="text"
                  value={editedData.salary || ''}
                  onChange={(e) => handleFieldChange('salary', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Salary or N/A"
                />
              </div>

              {/* Date Advertised */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Date Advertised</label>
                <input
                  type="date"
                  value={editedData.date_advertised || ''}
                  onChange={(e) => handleFieldChange('date_advertised', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              {/* Job URL */}
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Job URL</label>
                <input
                  type="text"
                  value={editedData.job_url || ''}
                  onChange={(e) => handleFieldChange('job_url', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="https://..."
                />
                {editedData.job_url && (
                  <a href={editedData.job_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-primary hover:underline">
                    Open link ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Read-only metadata */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-2 mb-4">Metadata (read-only)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-semibold text-gray-500">Job ID</p>
                <p className="text-sm text-gray-800 mt-0.5">{jobData.job_id || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-semibold text-gray-500">Client Name</p>
                <p className="text-sm text-gray-800 mt-0.5">{jobData.client_name || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-semibold text-gray-500">Internal Jobsite</p>
                <p className="text-sm text-gray-800 mt-0.5">{jobData.internal_jobsite || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-semibold text-gray-500">External Jobsite</p>
                <p className="text-sm text-gray-800 mt-0.5">{jobData.external_jobsite || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-semibold text-gray-500">AI Service</p>
                <p className="text-sm text-gray-800 mt-0.5">{jobData.ai_service || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-semibold text-gray-500">Extraction Source</p>
                <p className="text-sm text-gray-800 mt-0.5">{jobData.extraction_source || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md col-span-2">
                <p className="text-xs font-semibold text-gray-500">Duplicate</p>
                <p className={`text-sm font-semibold mt-0.5 ${jobData.is_duplicate ? 'text-red-600' : 'text-green-600'}`}>
                  {jobData.is_duplicate ? 'Yes — possible duplicate' : 'No'}
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-primary/20 text-primary font-medium transition-colors hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(editedData)}
            disabled={loading}
            className={`px-6 py-2 rounded-md text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
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
      const result: any = await extractCampaignJobsMutation.mutateAsync({
        clientId: clientId,
        joblink: isLink,
        pageContent: pageContent
      });
      
      toast.dismiss(loadingToast);

      const jobData = result?.job_data ?? result?.data?.job_data ?? null;

      if (jobData) {
        setExtractedJobData(jobData);
        setShowEditModal(true);
        toast.success(result?.message || 'AI extraction completed! Please review the data.');
      } else {
        toast.error('Failed to extract job data. Invalid response format.');
      }

    } catch (error: any) {
      // console.error('AI Extraction Error:', error);
      toast.dismiss(loadingToast);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to process with AI');
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
      const result: any = await saveCampaignJobsMutation.mutateAsync({
        clientId,
        joblink: isLink,
        jobData: editedData
      });
      
      toast.dismiss(loadingToast);
      
      if (result?.success) {
        toast.success(result?.message || 'Application saved successfully');
        setPageContent('');
        setExtractedJobData(null);
        setShowEditModal(false);
        if (setReload) setReload();
        onClose();
      } else {
        toast.error(result?.message || 'Failed to save application');
      }

    } catch (error: any) {
      // console.error('Save Error:', error);
      toast.dismiss(loadingToast);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save application');
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
      <div className="bg-white flex items-center justify-center p-6 sm:p-8 rounded-2xl shadow-lg overflow-y-auto max-w-4xl w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processWithAI();
          }}
          className="w-full"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList size={18} className="text-primary" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Add Manual Application</h3>
              <p className="text-sm text-gray-500">Paste a job link and its page content to extract the listing with AI.</p>
            </div>
          </div>

          <div className="overflow-y-auto pr-[10px] pl-[10px] max-h-[60vh] w-full">
            <div>
              <div className="space-y-5 mb-8 w-full">
                {/* Job link input */}
                <div className="space-y-1.5 w-full">
                  <label
                    htmlFor={'link'}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700"
                  >
                    <Link2 size={15} className="text-primary" />
                    Job Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    spellCheck={true}
                    required
                    placeholder="https://example.com/job-posting"
                    value={isLink}
                    onChange={(event) => setLink(event.target.value)}
                    name="link"
                    className="text-sm border border-input rounded-md w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>

                {/* Page Content */}
                <div className="space-y-1.5 w-full">
                  <label
                    htmlFor={'pageContent'}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700"
                  >
                    <ClipboardList size={15} className="text-primary" />
                    Paste Job Page Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    placeholder="Paste the entire job page content here (Ctrl+A, Ctrl+C, Ctrl+V)"
                    rows={6}
                    className="text-sm border border-input rounded-md w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-vertical"
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
              className="px-6 py-2 rounded-lg border border-primary/20 text-primary font-medium transition-colors hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={aiProcessing}
              className="px-6 py-2 rounded-lg text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {aiProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI is Extracting...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Extract with AI
                </>
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