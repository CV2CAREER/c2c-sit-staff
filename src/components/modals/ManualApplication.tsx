/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosInstance from '@/services/api-client';
import { SERVER_URI } from '@/constants/env';

interface EditRoleModalProps {
  visible: boolean;
  onClose: () => void;
  clientId: any;
  setReload?: () => void;
}

const ManualApplicationsModal: React.FC<EditRoleModalProps> = ({
  visible,
  onClose,
  clientId,
  setReload
}) => {
  const [loading, setLoading] = useState(false);
  const [pageContent, setPageContent] = useState('');

  const [form, setForm] = useState({
    link: '',
    keyword: '',
  });

  const handleFieldChange = (field: keyof typeof form, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const setLink = (value: string) => handleFieldChange('link', value);
  const setKeyword = (value: string) => handleFieldChange('keyword', value);

  const { link: isLink, keyword: isKeyword } = form;

  const isValidURLFormat = (url: string) =>  {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

   /**
   * This function handles saving the data to the queue by communicating with the pushLink API
   */
  const handleSave = async () => {
    if (!isLink || !pageContent) {
      return toast.error("Please provide both Job Link and Page Content");
    }

    const validFormat = isValidURLFormat(isLink)
    if (!validFormat){
      return toast.error("Provided url is not a valid url please check and retry")
    }

    setLoading(true);

    try {
      const data = {
        joblink: isLink,
        // keyword: isKeyword,
        clientId: clientId,
        pageContent: pageContent
      };

      const response = await axiosInstance.post(`${SERVER_URI}/api/v1/admin/pushLink`, data);
      if (response.data.status.toLowerCase() === "success"){
        toast.success(response.data.message);
        setPageContent('');
        if (setReload) setReload();
        onClose();
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      // console.error('Error saving changes:', error);
      toast.error(error.response?.data?.message || 'Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setForm({
        link: '',
        keyword: '',
      });
      setPageContent('');
      setLoading(false);
    }
  }, [visible]);

  return (
    <div className="bg-white flex items-center justify-center p-8 rounded-2xl shadow-lg overflow-y-auto max-w-4xl w-full">
      <form
        onSubmit={(e) => {
        e.preventDefault();
        handleSave();
        }}
        className="w-full "
      >
        <div className="overflow-y-auto pr-[10px] pl-[10px] max-h-[60vh] w-full">
          <div>
            <div className="space-y-6 mb-8 max-h-[60vh] w-full gap-y-4 gap-x-6 grid-cols-1 md:grid-cols-2">

          
              {/*
              <div className="space-y-4 w-full">
                <label
                htmlFor={'keyword'}
                className="block text-lg font-medium text-gray-700"
                >
                Keyword
                </label>
                <input
                    spellCheck={true}
                    placeholder="Keyword"
                    value={isKeyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    name="keyword"
                    className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
                />
              </div>
              */}

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
                    placeholder="Job Link *"
                    value={isLink}
                    onChange={(event) => setLink(event.target.value)}
                    name="link"
                    className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
                />
              </div>
              
              {/* Page Content */}
              <div className="space-y-4 w-full col-span-2">
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
        <div className="flex justify-between items-center mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
          >
              Cancel
          </button>
          <button
            type="submit"
            className={`px-6 py-2 rounded-lg text-white transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
            loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-career-blue-800 hover:bg-career-blue-900 focus:ring-career-blue-500'
            }`}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Process with AI'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManualApplicationsModal;
