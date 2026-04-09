/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/forms/CRTrackingPage1Form.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
import { CRCompleteForm, useCRTrackingStore } from "@/store/crTrackingStore";
import { useState } from "react";
import toast from "react-hot-toast";
import { zodResolver } from "@hookform/resolvers/zod"; // Import zodResolver
import { z } from "zod"; // Import z
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import ImageUploadSectionUpdated from "./image-upload-section-new";

// Define the Zod schema for your form
const crTrackingPage1Schema = z.object({
  currentState: z.string().min(1, "Current State is required"),
  futureState: z.string().min(1, "Future State is required"),
  context: z.string().min(1, "Context is required"),
  businessImpact: z.string().min(1, "Business Impact is required"),
});

// Infer the TypeScript type from the Zod schema
type CRTrackingPage1FormInputs = z.infer<typeof crTrackingPage1Schema>;

// Define the type for the props
interface CRTrackingPage1FormProps {
  defaultValues?: CRTrackingPage1FormInputs;
  onSubmit?: () => void; // Callback for successful submission
  onClose: () => void;
  onBack: () => void;
}

interface IField {
  name: string;
  label: string;
  imagePath?: string;
  placeholder: string;
  imageURLs?: string[];
  stateType?: 'current' | 'future';
  setImageUrls?: (urls: string[]) => void;
}

// Simulate an API call
const createCRTrackingEntry = async (data: CRCompleteForm) => {
  const response = await axiosInstance.post(endpoints.ADMIN_CR_TRACKING, data);
  return response.data;
};

export const CRTrackingPage1Form = ({
  defaultValues,
  onClose,
  onBack,
}: CRTrackingPage1FormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors }, // Destructure errors from formState
  } = useForm<CRTrackingPage1FormInputs>({
    resolver: zodResolver(crTrackingPage1Schema), // Integrate Zod resolver
    defaultValues: {
      // Provide default values to avoid uncontrolled component warnings
      currentState: "",
      futureState: "",
      context: "",
      businessImpact: "",
      ...defaultValues, // Spread any provided defaultValues
    },
  });

  const [isLoading, setIsLoading] = useState(false); // State for loading indicator
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [images, setImages] = useState<{
    currentState: string[];
    futureState: string[];
  }>({
    currentState: [],
    futureState: [],
  });  
  const [currentStateImageURLs, setCurrentStateImageURLs] = useState<string[]>([]);
  const [futureStateImageURLs, setFutureStateImageURLs] = useState<string[]>([]);  
  const { setCrTrackingPage1Data, formData: firstFormData } = useCRTrackingStore(); // Get formData from the store
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');  


  const fields: IField[] = [
    {
      name: "currentState",
      label: "Current State",
      imagePath: "currentState",
      imageURLs: currentStateImageURLs,
      stateType: 'current',
      setImageUrls: setCurrentStateImageURLs,
      placeholder: "What is broken/ Negatively impacted.",
    },
    {
      name: "futureState",
      label: "Future State",
      imagePath: "futureState",
      imageURLs: futureStateImageURLs,
      stateType: 'future',
      setImageUrls: setFutureStateImageURLs,
      placeholder: "What will this fix resolve? or/and What's new",
    },
    {
      name: "context",
      label: "Context",
      placeholder: "What brought about this discovery?",
    },
    {
      name: "businessImpact",
      label: "Business Impact",
      placeholder:
        "This is what happens to the business when this implementation takes place",
    },
  ]; 

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    stateType: 'current' | 'future',
  ) => {
    setIsUploading(true);
    const files = event.target.files;
    if (files && files.length > 0) {
      const uploadPromises = Array.from(files).map((file) => {
        const formData = new FormData();
        formData.append('file', file);
        return axiosInstance.post(endpoints.ADMIN_CR_TRACKING_DOCUMENT_UPLOAD, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });

      try {
        const responses = await Promise.all(uploadPromises);
        const fileUrls = responses.map((response) => response.data.data[0].file.fileUrl);

        if (stateType === 'current') {
          setCurrentStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        } else {
          setFutureStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        }

        toast.success('Files uploaded successfully');
      } catch {
        toast.error('Failed to upload files');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleGoogleDriveUpload = async (files: any[], stateType: 'current' | 'future') => {
    setIsUploading(true);
    try {
      const fileUrls = files.map((file) => file.webViewLink || file.embedUrl);

      if (stateType === 'current') {
        setCurrentStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
      } else {
        setFutureStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
      }

      toast.success('Files selected successfully from Google Drive');
    } catch {
      toast.error('Failed to select files from Google Drive');
    } finally {
      setIsUploading(false);
    }
  };  

  const handleCloudUpload = async (service: string, stateType: 'current' | 'future') => {
    setIsUploading(true);
    try {
      const fileUrls = await openCloudFilePicker(service);

      if (fileUrls && fileUrls.length > 0) {
        if (stateType === 'current') {
          setCurrentStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        } else {
          setFutureStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        }

        toast.success(`Files selected successfully from ${service}`);
      }
    } catch{
      toast.error(`Failed to select files from ${service}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (url: string) => {
    await axiosInstance.delete(endpoints.ADMIN_CR_TRACKING_DOCUMENT_UPLOAD, { data: { url } });
  };

  const openCloudFilePicker = (service: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const windowFeatures = `width=${width},height=${height},left=${left},top=${top}`;

      const popup = window.open(
        `/api/cloud-picker?service=${service}`,
        'CloudFilePicker',
        windowFeatures,
      );

      window.addEventListener(
        'message',
        function (event) {
          if (event.origin === window.location.origin) {
            if (event.data.type === 'cloudFiles') {
              resolve(event.data.files);
              popup?.close();
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.message));
              popup?.close();
            }
          }
        },
        false,
      );
    });
  };  

  const handleUrlUpload = async (stateType: 'current' | 'future') => {
    if (!urlInput) {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsAddingUrl(true);

    try {
      const response = await fetch('/api/admin/documents/validate-and-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message === 'URL is a valid image') {
          if (stateType === 'current') {
            setCurrentStateImageURLs((prevUrls) => [...prevUrls, urlInput]);
          } else {
            setFutureStateImageURLs((prevUrls) => [...prevUrls, urlInput]);
          }
          setUrlInput('');
          toast.success('Image URL added successfully');
        } else {
          toast.error('Invalid image URL');
        }
      } else {
        toast.error("Failed to add URL. Please ensure it's a valid image URL.");
      }
    } catch {
      toast.error("Failed to add URL. Please ensure it's a valid image URL.");
    } finally {
      setIsAddingUrl(false);
    }
  };

  const internalSubmit = async (data: CRTrackingPage1FormInputs) => {
    // Save current form's data to the store (optional, but good for multi-step forms)
    // @ts-ignore
    setCrTrackingPage1Data(data);

    // Combine data from the first form and the current form
    const combinedData = {
      ...firstFormData, // Data from the first form
      ...data, // Data from the current form (CRTrackingPage1Form)
      currentStateImageURLs: currentStateImageURLs,
      futureStateImageUrls: futureStateImageURLs,
    };

    setIsLoading(true);
    try {
      // Make the API call with the combined data
      await createCRTrackingEntry(combinedData as CRCompleteForm);
      toast.success("CR Tracking entry created successfully!");
      onClose(); // Call the parent onSubmit to navigate or show success
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(internalSubmit)} className="space-y-8">
      {fields.map((item) => (
        <div key={item.name} className="space-y-2">
          <label className="block text-lg font-medium text-gray-700">
            {item.label} <span className="text-red-500">*</span>
          </label>
          <Controller
            name={item.name as keyof CRTrackingPage1FormInputs} // Type assertion for dynamic name
            control={control}
            // Zod will handle validation, so 'rules' prop is no longer needed here
            render={(
              { field } // 'fieldState: { error }' is not needed here as errors are accessed from 'errors' object
            ) => (
              <>
                <textarea
                  {...field}
                  placeholder={item.placeholder}
                  className={`w-full bg-gray-50 border p-4 text-sm rounded-lg ${
                    errors[item.name as keyof CRTrackingPage1FormInputs] // Access error using item.name
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  rows={6}
                />
                {errors[item.name as keyof CRTrackingPage1FormInputs] && ( // Display error message
                  <p className="text-red-500 text-xs mt-1">
                    {
                      errors[item.name as keyof CRTrackingPage1FormInputs]
                        ?.message
                    }
                  </p>
                )}
{/* 
                {item.imagePath && (
                  <div className="mt-4 space-y-4">
                    <ImageUploadSection
                      title={item.label + "Images"}
                      imageURLs={
                        item.imagePath
                          ? images[item.imagePath as keyof typeof images]
                          : []
                      }
                      setImageURLs={(newUrls) => {
                        if (item.imagePath) {
                          setImages((prev) => ({
                            ...prev,
                            // @ts-ignore
                            [item.imagePath]: newUrls,
                          }));
                        }
                      }}
                    />
                  </div>
                )} */}

                {item.imageURLs && (
                  <div className="mt-4 space-y-4">
                    <ImageUploadSectionUpdated
                      stateType={item.stateType as 'current' | 'future'}
                      handleFileUpload={handleFileUpload}
                      handleCloudUpload={handleCloudUpload}
                      handleUrlUpload={handleUrlUpload}
                      urlInput={urlInput}
                      setUrlInput={setUrlInput}
                      isAddingUrl={isAddingUrl}
                      imageURLs={item.imageURLs}
                      isUploading={isUploading}
                      handleGoogleDriveUpload={handleGoogleDriveUpload}
                      handleFileDelete={handleFileDelete}
                      setImageUrls={item.setImageUrls as any}
                    />
                  </div>
                )}
              </>
            )}
          />
        </div>
      ))}
      <DialogFooter>
        <div className="flex justify-end pt-4 space-x-4">
          <Button
            type="button"
            className="px-6 py-2 bg-gray-300 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading} // Disable button while loading
            onClick={onBack}
          >
            Go back
          </Button>
          <Button
            type="submit"
            className="px-6 py-2 bg-blue text-white rounded-lg hover:bg-blue disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading} // Disable button while loading
          >
            {isLoading ? "Submitting..." : "Save"}
          </Button>
          <Button
            type="button"
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading} // Disable button while loading
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
};

export default CRTrackingPage1Form;
