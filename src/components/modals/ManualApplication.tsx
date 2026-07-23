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
  cover_letter?: string;
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
  if (!jobData) {
    return (
      <Modal
        title={null}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={640}
        centered
        closable={false}
      >
        <div className="px-[26px] pt-5 pb-[14px] text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto" style={{ borderColor: '#2196D8' }}></div>
          <p className="mt-4" style={{ color: '#6B7280', fontSize: '13px' }}>Loading job data...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      closable={false}
    >
      <div>
        {/* Modal Header — centered title + context */}
        <div className="px-[26px] pt-5 pb-0 text-center">
          <h3 className="text-[17px] font-bold m-0 mb-[3px]" style={{ color: '#1F2937' }}>Review & Edit Job Data</h3>
          <p className="text-[11.5px] m-0 mb-[14px]" style={{ color: '#6B7280' }}>
            {editedData.job_title || 'Job'} · {editedData.client_name || 'Client'}
          </p>
        </div>

        {/* Duplicate warning */}
        {jobData.is_duplicate && (
          <div className="mx-[26px] mb-3 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 rounded-md text-red-700 text-sm font-medium">
            ⚠️ This job appears to be a duplicate. Please review before saving.
          </div>
        )}

        {/* Modal Body — scrollable */}
        <div className="px-[26px] py-[18px] overflow-y-auto max-h-[65vh] space-y-[15px]" style={{ flex: 1 }}>

          {/* Job Title */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Job Title <span style={{ color: '#E5484D' }}>*</span></label>
            <input
              type="text"
              value={editedData.job_title || ''}
              onChange={(e) => handleFieldChange('job_title', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
              placeholder="Job Title"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Company <span style={{ color: '#E5484D' }}>*</span></label>
            <input
              type="text"
              value={editedData.company || ''}
              onChange={(e) => handleFieldChange('company', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
              placeholder="Company Name"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Location <span style={{ color: '#E5484D' }}>*</span></label>
            <input
              type="text"
              value={editedData.location || ''}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
              placeholder="City, State, Country"
            />
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Job Type</label>
            <select
              value={editedData.job_type || 'N/A'}
              onChange={(e) => handleFieldChange('job_type', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
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
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Country</label>
            <input
              type="text"
              value={editedData.country || ''}
              onChange={(e) => handleFieldChange('country', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
              placeholder="Country"
            />
          </div>

          {/* Salary */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Salary</label>
            <input
              type="text"
              value={editedData.salary || ''}
              onChange={(e) => handleFieldChange('salary', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
              placeholder="Salary or N/A"
            />
          </div>

          {/* Date Advertised */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Date Advertised</label>
            <input
              type="date"
              value={editedData.date_advertised || ''}
              onChange={(e) => handleFieldChange('date_advertised', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
            />
          </div>

          {/* Job URL */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Job URL</label>
            <input
              type="text"
              value={editedData.job_url || ''}
              onChange={(e) => handleFieldChange('job_url', e.target.value)}
              className="w-full px-3 py-[11px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[13px]"
              style={{ borderColor: '#E2E6EA' }}
              placeholder="https://..."
            />
            {editedData.job_url && (
              <a href={editedData.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                Open link ↗
              </a>
            )}
          </div>

          {/* Cover Letter Required */}
          <div>
            <label className="block text-[13px] font-semibold mb-[7px]" style={{ color: '#1F2937' }}>Cover letter required? <span style={{ color: '#E5484D' }}>*</span></label>
            <div className="flex gap-2">
              {['Yes', 'No'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleFieldChange('cover_letter', option)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    editedData.cover_letter === option
                      ? 'text-white border-0'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  style={editedData.cover_letter === option
                    ? option === 'Yes'
                      ? { background: '#2196D8', borderColor: '#2196D8' }
                      : { background: '#E5484D', borderColor: '#E5484D' }
                    : { borderColor: '#E2E6EA' }}
                >
                  <span>{option}</span>
                  {editedData.cover_letter === option && <span className="ml-2">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Read-only metadata */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-[7px]" style={{ color: '#9CA3AF' }}>Metadata (read-only)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md" style={{ background: '#F3FAFB' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>Job ID</p>
                <p className="text-sm mt-0.5" style={{ color: '#1F2937' }}>{jobData.job_id || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-md" style={{ background: '#F3FAFB' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>Client Name</p>
                <p className="text-sm mt-0.5" style={{ color: '#1F2937' }}>{jobData.client_name || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-md" style={{ background: '#F3FAFB' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>Internal Jobsite</p>
                <p className="text-sm mt-0.5" style={{ color: '#1F2937' }}>{jobData.internal_jobsite || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-md" style={{ background: '#F3FAFB' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>External Jobsite</p>
                <p className="text-sm mt-0.5" style={{ color: '#1F2937' }}>{jobData.external_jobsite || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-md" style={{ background: '#F3FAFB' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>AI Service</p>
                <p className="text-sm mt-0.5" style={{ color: '#1F2937' }}>{jobData.ai_service || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-md" style={{ background: '#F3FAFB' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>Extraction Source</p>
                <p className="text-sm mt-0.5" style={{ color: '#1F2937' }}>{jobData.extraction_source || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-md col-span-2" style={{ background: '#F3FAFB' }}>
                <p className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>Duplicate</p>
                <p className={`text-sm font-semibold mt-0.5 ${jobData.is_duplicate ? 'text-red-600' : 'text-green-600'}`}>
                  {jobData.is_duplicate ? 'Yes — possible duplicate' : 'No'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex justify-between px-[26px] py-[14px]" style={{ borderTop: '1px solid #E2E6EA', background: '#FAFBFC' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-[11px] rounded-lg text-[13.5px] font-semibold border-0 cursor-pointer"
            style={{ background: '#F1F3F5', color: '#6B7280' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(editedData)}
            disabled={loading || !editedData.cover_letter}
            className={`px-6 py-[11px] rounded-lg text-[13.5px] font-semibold border-0 transition-opacity ${
              (loading || !editedData.cover_letter) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{
              background: (loading || !editedData.cover_letter) ? '#9CA3AF' : '#22B14C',
              color: '#fff',
            }}
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