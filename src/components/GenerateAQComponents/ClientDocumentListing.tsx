/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';
import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Hlogo from '../../../public/svg/h-logo.svg';
import { Button } from '@material-tailwind/react';
import toast from 'react-hot-toast';
import { useAdminMutations } from '@/hooks/api/admin.api';
import { FiLoader, FiX } from 'react-icons/fi';
import { FieldArray, Formik } from 'formik';
import { Select } from 'antd';
import CustomTable from './CustomTable';
import CustomModal from '../CustomModal/CustomModal';
import { ViewDocRevamps } from '../modals/ViewDocRevamps';
import { LoaderIcon } from 'lucide-react';

interface ClientDocumentListingProps {
  showButtons?: boolean;
  columns: any;
  data: any;
  loading?: boolean;
  handler?: (whatToHandle: string) => void;
  fetchClientDocuments: () => void;
  selectedCvDataPoints?: any;
  setSelectedCvDataPoints?: (data: any) => void;
  selectedCvJobTitles?: any;
  selectedCVKeywords?: any;
  setSelectedCvJobTitles?: (data: any) => void;
  setSelectedCvKeywords?: (data: any) => void;
  isModalOpen?: boolean;
  setIsModalOpen?: (data: any) => void;
  isCvJobTitlesModalOpen?: boolean;
  setIsCvJobTitlesModalOpen?: (data: any) => void;
  isCvKeywordsModalOpen?: boolean;
  setIsCvKeywordsModalOpen?: (data: any) => void;
  credentialId?: any;
  mongoClientID?: any;
  resumeId?: any;
  adminDashboard?: boolean;
  keywordsAlone?: boolean;
  roleTitlesAlone?: boolean;
  setRefetch?: (data: any) => void;
  refetch?: boolean;
  revampedDocsOpen?: boolean;
  currentRevamp?: any;
  setCurrentRevamp: (state: any) => void;
  setRevampedDocsOpen?: (data: any) => void;
  clientId?: any;
  setIsUpdating?: (data: any) => void;
  isUpdating: boolean;
  extractKeywords: (increment?: boolean, existing?: any, defaultTrigger?: boolean) => void;
  extractRoleTitles: (increment?: boolean, existing?: any, defaultTrigger?: boolean) => void;
  checkApproved: (jt: any) => boolean;
  checkDeclined: (jt: any) => boolean;
  selected: any[];
  setSelected: (data: any) => void;
  approvedJobs: any[];
  setApprovedJobs: (data: any) => void;
  declinedJobs: any[];
  setDeclinedJobs: (data: any) => void;
  excludeFeatures?: string[]
}

const ClientDocumentListing: React.FC<ClientDocumentListingProps> = ({
  columns,
  data,
  loading = false,
  fetchClientDocuments,
  selectedCvDataPoints,
  setIsCvJobTitlesModalOpen,
  isModalOpen,
  setIsModalOpen,
  setIsCvKeywordsModalOpen,
  credentialId,
  mongoClientID,
  adminDashboard,
  keywordsAlone,
  roleTitlesAlone,
  revampedDocsOpen,
  currentRevamp,
  setRevampedDocsOpen,
  clientId,
  isUpdating,
  setIsUpdating,
  extractKeywords,
  extractRoleTitles,
  selected,
  setSelected,
  setApprovedJobs,
  setDeclinedJobs,
  excludeFeatures = [],
}) => {
  // const router = useRouter();
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [isRange, setIsRange] = useState(null);
  const [retrievedId, setRetrieveId] = useState(null);
  const {
    reviewDocumentMutation,
    extractCVDataPointsMutation,
    reverseUserIdMutation,
    cvRevampMutation,
    getSignedUrlMutation,
    fileUploadMutation,
    reviewDocumentPostMutation,
  } = useAdminMutations();
  const { id } = useParams() as { id: string };
  const [revampLoading, setRevampLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function camelCaseToTitleCase(camelCaseString: string) {
    return (
      camelCaseString
        // Insert a space before each uppercase letter
        .replace(/([A-Z])/g, ' $1')
        // Capitalize the first letter of each word
        .replace(/^./, (str: string) => str.toUpperCase())
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleApprovalChange = (jobTitle: string, status: string) => {
    if (status === 'Approved') {
      setApprovedJobs((prev: any) => [...prev, jobTitle]);
    } else if (status === 'Declined') {
      setDeclinedJobs((prev: any) => [...prev, jobTitle]);
    } else {
      setApprovedJobs((prev: any) => prev.filter((title: string) => title !== jobTitle));
    }
  };

  const handleDecision = async (status: 'accept' | 'reject') => {
    const data = {
      ids: selected.map((d) => d.original._id),
      status,
    };

    // @ts-ignore
    setIsUpdating(true);

    try {
      await reviewDocumentMutation.mutateAsync({ ids: data.ids, status: data.status });
      toast.success('Documents updated successfully');
      fetchClientDocuments();
    } catch {
      toast.error('An error occurred while updating documents');
    } finally {
      // @ts-ignore
      setIsUpdating(false);
    }
  };

  const setNative = async () => {
    if (selected.length > 1) {
      toast.error('Please select only one document');
      return;
    }

    toast.loading('Please wait while the AI System reads your CV');

    const data = {
      id: selected[0].original._id,
      cvType: 'default',
    };

    // @ts-ignore
    setIsUpdating(true);

    try {
      await extractCVDataPointsMutation.mutateAsync({ id: data.id, cvType: 'default' });
      toast.success('CV/Resume set as default');
      await fetchClientDocuments();
    } catch {
      toast.error('An error occurred while setting CV as Native');
    } finally {
      if (keywordsAlone) {
        await extractKeywords(false, [], true);
        setIsUpdating?.(false);
        setIsCvKeywordsModalOpen?.(true);
      } else if (roleTitlesAlone) {
        await extractRoleTitles(false, [], true);
        setIsUpdating?.(false);
        setIsCvJobTitlesModalOpen?.(true);
      } else {
        await extractRoleTitles(false, [], true);
        await extractKeywords(false, [], true);
        setIsUpdating?.(false);
        setIsCvJobTitlesModalOpen?.(true);
      }
    }
  };

  const getUserId = async (id: any) => {
    if (id) {
      try {
        const res: any = await reverseUserIdMutation.mutateAsync({ clientId: id });
        const retrieved = res?.data?._id || res?._id || res?.data?.id;
        if (retrieved) {
          setRetrieveId(retrieved);
        }
      } catch (error: any) {
        toast.error(error.message || 'Error reversing user ID');
      }
    }
  };

  const pushDatatoQueue = async () => {
    getUserId(selected[0]?.original.userId?._id);

    if (selected.length > 1) {
      toast.error('Please select only one document');
      return;
    }

    if (!isRange) {
      toast.error('Please select a range');
      return;
    }

    const keywords = selected[0]?.original.keywords;
    const roletitles = selected[0]?.original?.cvJobTitles;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = {
      id: credentialId ?? retrievedId,
      resume: selected[0]?.original.document[0].fileUrl,
      keywords: [...keywords, ...roletitles],
      range: isRange,
    };
  };

  const extractDataPoints = async () => {
    if (selected.length > 1) {
      toast.error('Please select only one document');
      return;
    }

    const data = {
      id: selected[0].original._id,
    };
    setIsUpdating?.(true);

    try {
      await extractCVDataPointsMutation.mutateAsync({ id: data.id });
      toast.success('Data Points Extracted');
      fetchClientDocuments();
    } catch {
      toast.error('An error occurred while extracting Data Points');
    } finally {
      setIsUpdating?.(false);
    }
  };

  async function handleDownlodDocs() {
    toast.loading('Preparing documents for download...');
    const d = selected.map((s) => ({
      name: s.values['document[0].filename'],
      updatedAt: s.values.updatedAt,
      type: s.values.type,
    }));

    const links = d.map((doc) => {
      const target = data.find(
        (dt: any) =>
          dt.document[0].filename === doc.name &&
          dt.updatedAt === doc.updatedAt &&
          dt.type === doc.type,
      );
      return {
        filePath: `${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${target?.document[0].cloudFilename}`,
        name: target?.document[0].filename,
      };
    });

    for (const { filePath, name } of links) {
      try {
        const res = await getSignedUrlMutation.mutateAsync({ filePath });
        if (res && res.data) {
          const url = res.data.url;
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch {
        // console.error(`Failed to download ${name}:`, err);
      }
    }
  }

  const isExtracted = (doc: any) => {
    return !!doc?.cvJobTitles.length;
  };

  const resumePresent = () => {
    return selected.some((item) => item.original?.type == 'resume' && isExtracted(item.original));
  };

  const revampCV = async (cvId: string) => {
    setRevampLoading(true);
    try {
      const res = await cvRevampMutation.mutateAsync({ cvId, create: true });
      toast.success(res.message || 'document submitted for revamping');
    } catch (err: any) {
      toast.error(err?.message || 'failed to submit document for revamping');
    } finally {
      setRevampLoading(false);
    }
  };

  // console.log('selected', selected);

  const handleRevampCV = async () => {
    const cvIds: any[] = [];
    selected.forEach((s) => {
      const doc = s.original;
      if (doc == 'resume' || isExtracted(doc)) {
        cvIds.push(doc._id);
      }
    });

    if (cvIds.length === 0) {
      toast.error('No valid documents selected for revamping.');
      return;
    }

    const url = `${process.env.NEXT_PUBLIC_BACKGROUND_SERVICE_URL}/api/cv-production/add`;
    if (!url) {
      // console.error('Background service URL is not defined.');
      toast.error('Service URL is missing. Please check your environment variables.');
      return;
    }

    try {
      await Promise.all(
        cvIds.map(async (id) => {
          return await revampCV(id);
        }),
      );
    } catch  {
      // console.error('Error submitting documents for revamping:', error);
      toast.error('An error occurred while submitting documents.');
    }
  };

  const finalDocsData: any = useMemo(() => data, [data]);
  // console.log('final', finalDocsData);

  const formatCvDataPoints = (dataPoints: any) => {
    if (!dataPoints) return null;

    return (
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl w-full">
        <div className="flex justify-between items-center mb-6">
          <span className="text-white bg-white text-lg font-semibold w-12 h-12 rounded-full flex items-center justify-center"></span>
          <h2 className="text-2xl font-semibold text-career-blue-800">CV Data Points</h2>
        </div>

        <div className="space-y-6 mb-8 overflow-y-auto max-h-[60vh]">
          <DataPointSection label="CV Type" content={dataPoints.cvType} />
          <DataPointSection label="Contact Information" content={dataPoints.contactInformation} />
          <DataPointSection label="Professional Summary" content={dataPoints.professionalSummary} />

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">Work Experience</h3>
            {dataPoints.workExperience?.map((exp: any, index: number) => (
              <div key={index} className="ml-4 mb-4">
                <p className="font-medium">
                  {exp.jobTitle} at {exp.organization}
                </p>
                <p className="text-sm text-gray-600">{exp.dates}</p>
                <p className="mt-1">{exp.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">Education</h3>
            {dataPoints.education?.map((edu: any, index: number) => (
              <p key={index} className="ml-4">
                {edu.degree}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">Skills</h3>
            <ul className="list-disc ml-8">
              {dataPoints.skills?.map((skill: any, index: number) => <li key={index}>{skill}</li>)}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">Achievements</h3>
            <ul className="list-disc ml-8">
              {dataPoints.achievements?.map((achievement: any, index: number) => (
                <li key={index}>{achievement}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">Certifications/Licenses</h3>
            <ul className="list-disc ml-8">
              {dataPoints.certificationsLicenses?.map((certification: any, index: number) => (
                <div key={index} className="ml-4 mb-4">
                  <p className="font-medium">
                    {certification.name} at {certification.organization}
                  </p>
                  <p className="text-sm text-gray-600">{certification.dates}</p>
                  <p className="mt-1">{certification.description}</p>
                </div>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">Relevant Projects</h3>
            <ul className="list-disc ml-8">
              {dataPoints.relevantProjects?.map((project: any, index: number) => <li key={index}>{project}</li>)}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">Languages</h3>
            <ul className="list-disc ml-8">
              {dataPoints.languages?.map((language: any, index: number) => <li key={index}>{language}</li>)}
            </ul>
          </div>
        </div>

        <div className="flex justify-end items-center mt-8">
          <button
            onClick={() => setIsModalOpen?.(false)}
            className="px-6 py-2 bg-career-blue-800 text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 w-full rounded-3xl bg-white">
      {loading ? (
        <div className="h-[200px] flex items-center justify-center animate-pulse">
          <Image className="" src={Hlogo.src} alt="Laigus logo" width={179} height={79} />
        </div>
      ) : (
        <>
          {!!selected?.length && (
            <div className="mt-8 flex flex-col items-start justify-start gap-2 mb-4">
              {!adminDashboard && (
                <div className="flex flex-row justify-center items-center gap-[8px]">
                  <p>Select Range:</p>
                  <Select
                    className="w-[40px] my-4 mr-3"
                    style={{ width: 120 }}
                    onChange={setIsRange}
                    options={[...Array(24).keys()].map((k) => ({
                      value: k + 1,
                      label: `${k + 1} Month${k > 0 ? 's' : ''}`,
                    }))}
                  />
                </div>
              )}
              <div className="mt-8 flex items-center justify-end gap-4 mb-4 w-full">
                {!adminDashboard && !excludeFeatures.includes('populate') && (
                  <Button
                              onResize={() => {}}
            onResizeCapture={() => {}}
                    placeholder=""
                    disabled={isUpdating}
                    onPointerEnterCapture={() => {}}
                    onPointerLeaveCapture={() => {}}
                    onClick={() => pushDatatoQueue()}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      Populate
                    </span>
                  </Button>
                )}

                <Button
                  placeholder=""
                              onResize={() => {}}
            onResizeCapture={() => {}}
                  disabled={isUpdating}
                  onPointerEnterCapture={() => {}}
                  onPointerLeaveCapture={() => {}}
                  onClick={() => {
                    handleDownlodDocs();
                  }}
                  className="bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="m12 15.577l-3.539-3.538l.708-.72L11.5 13.65V5h1v8.65l2.33-2.33l.709.719zM6.616 19q-.691 0-1.153-.462T5 17.384v-2.423h1v2.423q0 .231.192.424t.423.192h10.77q.23 0 .423-.192t.192-.424v-2.423h1v2.423q0 .691-.462 1.153T17.384 19z"
                      />
                    </svg>
                    Download
                  </span>
                </Button>

                {!adminDashboard && !excludeFeatures.includes('revamp')  && !credentialId && resumePresent() && (
                  <Button
                    placeholder=""
                                onResize={() => {}}
            onResizeCapture={() => {}}
                    disabled={isUpdating || revampLoading}
                    onPointerEnterCapture={() => {}}
                    onPointerLeaveCapture={() => {}}
                    onClick={() => {
                      handleRevampCV();
                    }}
                    className="bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-3 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 16 16"
                      >
                        <path fill="white" d="M10 0H2v16h12V4zm3 15H3V1h6v4h4zM10 4V1l3 3z" />
                        <path
                          fill="white"
                          d="M4.7 7.7L4 7v3h3L5.8 8.8C6.2 8 7.1 7.5 8 7.5c1.4 0 2.5 1.1 2.5 2.5H12c0-2.2-1.8-4-4-4c-1.3 0-2.5.7-3.3 1.7m5.1 4.1c-.5.5-1.1.8-1.8.7c-1 0-1.9-.6-2.3-1.5H4.1c.4 1.7 2 3 3.8 3c1.1 0 2.1-.5 2.8-1.2L12 14v-3H9z"
                        />
                      </svg>
                      Revamp Resume
                    </span>
                  </Button>
                )}

                <Button
                  placeholder=""
                              onResize={() => {}}
            onResizeCapture={() => {}}
                  disabled={isUpdating}
                  onPointerEnterCapture={() => {}}
                  onPointerLeaveCapture={() => {}}
                  onClick={() => setNative()}
                  className="bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                      />
                    </svg>
                    Default
                  </span>
                </Button>

                {!credentialId && !adminDashboard && !excludeFeatures.includes('datapoints') && (
                  <Button
                    placeholder=""
                                onResize={() => {}}
            onResizeCapture={() => {}}
                    disabled={isUpdating}
                    onPointerEnterCapture={() => {}}
                    onPointerLeaveCapture={() => {}}
                    onClick={() => extractDataPoints()}
                    className="bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                        />
                      </svg>
                      Data Points
                    </span>
                  </Button>
                )}

                {!adminDashboard && !excludeFeatures.includes('keywords') && (
                  <Button
                    placeholder=""
                                onResize={() => {}}
            onResizeCapture={() => {}}
                    disabled={isUpdating}
                    onPointerEnterCapture={() => {}}
                    onPointerLeaveCapture={() => {}}
                    onClick={() => extractKeywords()}
                    className="bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                        />
                      </svg>
                      Keywords
                    </span>
                  </Button>
                )}

                {!adminDashboard && !excludeFeatures.includes('roletitles') && (
                  <Button
                    placeholder=""
                                onResize={() => {}}
            onResizeCapture={() => {}}
                    disabled={isUpdating}
                    onPointerEnterCapture={() => {}}
                    onPointerLeaveCapture={() => {}}
                    onClick={() => extractRoleTitles()}
                    className="bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                        />
                      </svg>
                      Role Titles
                    </span>
                  </Button>
                )}

                {!credentialId && !adminDashboard && !excludeFeatures.includes('reject') && (
                  <Button
                    placeholder=""
                                onResize={() => {}}
            onResizeCapture={() => {}}
                    disabled={isUpdating}
                    onPointerEnterCapture={() => {}}
                    onPointerLeaveCapture={() => {}}
                    onClick={() => handleDecision('reject')}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                      Reject
                    </span>
                  </Button>
                )}

                {!credentialId && !adminDashboard && !excludeFeatures.includes('accept') && (
                  <Button
                    placeholder=""
                                onResize={() => {}}
            onResizeCapture={() => {}}
                    disabled={isUpdating}
                    onPointerEnterCapture={() => {}}
                    onPointerLeaveCapture={() => {}}
                    onClick={() => handleDecision('accept')}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      Accept
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {!loading ? (
            <CustomTable
              columns={columns}
              data={finalDocsData}
              tdClass="p-2"
              thClass="bg-career-blue-200 p-4"
              tHeadClass="whitespace-nowrap"
              setSelected={setSelected}
            />
          ) : (
            <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
              <FiLoader className="animate-spin text-4xl" />
            </div>
          )}
          {!adminDashboard && (
            <Button
              placeholder=""
                          onResize={() => {}}
            onResizeCapture={() => {}}
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              disabled={fileUploadMutation.isPending || reviewDocumentPostMutation.isPending}
              color="blue"
              ripple={false}
              className="mt-4 bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
              onClick={() => {
                setIsReviseModalOpen(true);
              }}
            >
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {fileUploadMutation.isPending || reviewDocumentPostMutation.isPending ? 'Uploading...' : 'Upload Revised Document'}
              </span>
            </Button>
          )}

          {isUpdating && (
            <CustomModal visibility={isUpdating}>
              <div className="p-4 rounded-2xl gap-[8px] text-white flex justify-center items-center flex-col">
                <LoaderIcon className="animate-spin text-4xl" />
                <p>Loading, Please Wait</p>
              </div>
            </CustomModal>
          )}

          <CustomModal visibility={isReviseModalOpen} toggleVisibility={setIsReviseModalOpen}>
            <div className="bg-white p-4 sm:p-6 rounded-2xl">
              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setIsReviseModalOpen(false);
                  }}
                >
                  <FiX className="text-2xl" />
                </button>
              </div>
              <h2>
                <span className="text-24 !font-medium font-sharp-grotesk mt-4 text-career-black-200">
                  Upload Revised Document
                </span>
              </h2>
              <p>Upload the revised documents here.</p>
              <Formik
                initialValues={{
                  resume: [],
                  coverletter: [],
                }}
                onSubmit={async (values) => {
                  const formData = new FormData();
                  values.resume.forEach((file: any) => {
                    formData.append('resume', file.file);
                  });
                  values.coverletter.forEach((file: any) => {
                    formData.append('coverletter', file.file);
                  });

                  try {
                    const uploadRes = await fileUploadMutation.mutateAsync(formData);
                    const files = uploadRes.data;
                    await reviewDocumentPostMutation.mutateAsync({ 
                      files, 
                      uid: id ?? mongoClientID ?? clientId 
                    });
                    toast.success('Document uploaded successfully');
                    fetchClientDocuments();
                    setIsReviseModalOpen(false);
                  } catch {
                    toast.error('An error occurred while uploading document');
                  }
                }}
              >
                {({ handleSubmit, values }) => (
                  <form onSubmit={handleSubmit}>
                    <FieldArray name="resume">
                      {({ push, remove, form }) => (
                        <div>
                          <label className="flex flex-col text-center my-2 p-6 border border-career-gray-200 cursor-pointer rounded-lg">
                            <input
                              className="sr-only"
                              type="file"
                              multiple
                              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e: any) => {
                                // Check if the files is valid
                                // Push the files to the array
                                for (let i = 0; i < e.target.files.length; i++) {
                                  if (
                                    e.target.files[i].type !== 'application/pdf' &&
                                    e.target.files[i].type !== 'application/msword' &&
                                    e.target.files[i].type !==
                                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                                    // e.target.files[i].type !== 'image/png' &&
                                    // e.target.files[i].type !== 'image/jpeg'
                                  ) {
                                    toast.error('Please select a valid file');
                                    return;
                                  }
                                  push({
                                    file: e.target.files[i],
                                    name: e.target.files[i].name,
                                  });
                                }
                              }}
                            />
                            <span>Add {!!form.values?.resume?.length && 'more'} resume files</span>
                          </label>
                          <div className="space-y-2">
                            {form.values?.resume?.map((file: any, index: number) => {
                              return (
                                <div
                                  key={index}
                                  className={
                                    'flex items-center justify-between bg-gray-200 p-2 rounded-lg mt-2'
                                  }
                                >
                                  <span className="block truncate flex-grow">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      remove(index);
                                    }}
                                  >
                                    <FiX />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </FieldArray>
                    <FieldArray name="coverletter">
                      {({ push, remove, form }) => (
                        <div>
                          <label className="flex flex-col text-center my-2 p-6 border border-career-gray-200 cursor-pointer rounded-lg">
                            <input
                              className="sr-only"
                              type="file"
                              multiple
                              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e: any) => {
                                // Check if the files is valid
                                // Push the files to the array
                                for (let i = 0; i < e.target.files?.length; i++) {
                                  if (
                                    e.target.files[i].type !== 'application/pdf' &&
                                    e.target.files[i].type !== 'application/msword' &&
                                    e.target.files[i].type !==
                                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                                    // e.target.files[i].type !== 'image/png' &&
                                    // e.target.files[i].type !== 'image/jpeg'
                                  ) {
                                    toast.error('Please select a valid file');
                                    return;
                                  }
                                  push({
                                    file: e.target.files[i],
                                    name: e.target.files[i].name,
                                  });
                                }
                              }}
                            />
                            <span>
                              Add {!!form.values?.coverletter?.length && 'more'} cover letters
                            </span>
                          </label>
                          <div className="space-y-2">
                            {form.values?.coverletter?.map((file: any, index: number) => {
                              return (
                                <div
                                  key={index}
                                  className={
                                    'flex items-center justify-between bg-gray-200 p-2 rounded-lg mt-2'
                                  }
                                >
                                  <span className="block truncate flex-grow">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      remove(index);
                                    }}
                                  >
                                    <FiX />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </FieldArray>
                    <Button
                      placeholder=""
                                  onResize={() => {}}
            onResizeCapture={() => {}}
                      onPointerEnterCapture={() => {}}
                      onPointerLeaveCapture={() => {}}
                      type="submit"
                      ripple={false}
                      color="blue"
                      className="!capitalize my-4"
                      disabled={
                        (!values.resume.length && !values.coverletter.length) ||
                        fileUploadMutation.isPending || 
                        reviewDocumentPostMutation.isPending
                      }
                    >
                      {fileUploadMutation.isPending || reviewDocumentPostMutation.isPending ? 'Uploading...' : 'Upload'}
                    </Button>
                    {/* accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" */}
                  </form>
                )}
              </Formik>
            </div>
          </CustomModal>

          <CustomModal visibility={isModalOpen as boolean} toggleVisibility={setIsModalOpen}>
            {formatCvDataPoints(selectedCvDataPoints)}
          </CustomModal>

          <CustomModal visibility={revampedDocsOpen as boolean} toggleVisibility={setRevampedDocsOpen}>
            <ViewDocRevamps
              doc={currentRevamp}
              refetchData={fetchClientDocuments}
              close={() => {
                // @ts-ignore
                setRevampedDocsOpen(false);
              }}
            />
          </CustomModal>
        </>
      )}
    </div>
  );
};

const DataPointSection: React.FC<{ label: string; content: string }> = ({ label, content }) => (
  <div className="space-y-1">
    <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
    <p className="text-gray-600">{content}</p>
  </div>
);

export default ClientDocumentListing;
