'use client';
import React, { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import axiosInstance from '@/services/api-client';
import { SERVER_URI } from '@/constants/env';
import { ADMIN_EXTRACT_CV_DATA_POINTS } from '@/constants/apiEndpoints/admin.endpoint';
// import { Button as AntButton } from 'antd';
import { Button as AntButton } from 'antd';
import Icon from '../../../public/icons';
import ClientDocumentListing from './ClientDocumentListing';
import { changeDateFormat } from '@/utils/helperFns';
import { useAdminMutations } from '@/hooks/api/admin.api';
import useClickOutside from '@/hooks/useClickOutside';

interface ClientDocumentListingWrapperProps {
  data: any;
  loading: boolean;
  fetchClientDocuments: () => void;
  credentialId?: any;
  mongoClientID?: any;
  adminDashboard?: boolean;
  keywordsAlone?: boolean;
  roleTitlesAlone?: boolean;
  setRefetch?: (data: any) => void;
  setIsCvKeywordsModalOpen?: (data: any) => void;
  isCvKeywordsModalOpen?: boolean;
  setIsCvJobTitlesModalOpen?: (data: any) => void;
  isCvJobTitlesModalOpen?: boolean;
  setIsUpdating?: (data: any) => void;
  isUpdating?: boolean;
  refetch?: boolean;
  extractKeywords?: (increment?: boolean, existing?: any, defaultTrigger?: boolean) => void;
  extractRoleTitles?: (increment?: boolean, existing?: any, defaultTrigger?: boolean) => void;
  checkApproved?: (jt: any) => boolean;
  checkDeclined?: (jt: any) => boolean;
  selected?: any[];
  setSelected?: (data: any) => void;
  approvedJobs?: any[];
  setApprovedJobs?: (data: any) => void;
  declinedJobs?: any[];
  setDeclinedJobs?: (data: any) => void;
  setAQModal?: (data: any) => void;
  excludeFeatures?: string[];
}
const ClientDocumentListingWrapper: React.FC<ClientDocumentListingWrapperProps> = ({
  data,
  loading,
  fetchClientDocuments,
  credentialId,
  mongoClientID,
  adminDashboard,
  keywordsAlone,
  roleTitlesAlone,
  setRefetch,
  refetch,
  isCvKeywordsModalOpen,
  setIsCvKeywordsModalOpen,
  isCvJobTitlesModalOpen,
  setIsCvJobTitlesModalOpen,
  isUpdating,
  setIsUpdating,
  extractKeywords,
  extractRoleTitles,
  checkApproved,
  checkDeclined,
  selected,
  setSelected,
  approvedJobs,
  setApprovedJobs,
  declinedJobs,
  setDeclinedJobs,
  setAQModal,
  excludeFeatures = [],
}) => {
  const [current] = useState<any>(-1);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [optionsIndex, setOptionsIndex] = useState<number>(-1);
  const [itemLoader, setItemLoader] = useState<boolean>(false);
  const [tempParam, setTempParam] = useState<any>();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCvDataPoints, setSelectedCvDataPoints] = useState(null);
  const [selectedCvJobTitles, setSelectedCvJobTitles] = useState(null);
  const [selectedCVKeywords, setSelectedCvKeywords] = useState(null);
  const [resumeId, setResumeId] = useState(null);
  const [clientId, setClientId] = useState(null);

  //const [isCvJobTitlesModalOpen, setIsCvJobTitlesModalOpen] = useState(false);
  //const [isCvKeywordsModalOpen, setIsCvKeywordsModalOpen] = useState(false);

  const [revampedDocsOpen, setRevampedDocsOpen] = useState(false);
  const [currentRevamp, setCurrentRevamp] = useState();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { getRootProps, getInputProps, fileRejections, acceptedFiles, open } = useDropzone({
    accept: {
      'image/jpeg': ['.pdf', '.doc', '.docx'],
      'image/png': ['.pdf', '.doc', '.docx'],
    },
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
  });

  const {
    cvRevampMutation,
    adminUpdateClientDocumentsMutation,
    fileUploadMutation,
  } = useAdminMutations();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const node = useClickOutside(() => {
    setActiveIndex(-1);
    setItemLoader(false);
    setOptionsIndex(-1);
    setTempParam(undefined);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRevampCV = async (param: any) => {
    cvRevampMutation.mutate(
      { cvId: param?._id, create: true },
      {
        onSuccess: (res: any) => {
          toast.success(res?.message || 'document submitted for revamping');
        },
        onError: (err: any) => {
          toast.error(err?.message || 'failed to submit document for revamping');
        },
      }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleDocStatus = async (param: any, status: string) => {
    setItemLoader(true);
    adminUpdateClientDocumentsMutation.mutate(
      { id: param?._id, body: { status } },
      {
        onSuccess: (data: any) => {
          if (data?.success) {
            fetchClientDocuments();
            toast.success(data.message);
          } else {
            toast.error(data.message);
          }
          setActiveIndex(-1);
          setItemLoader(false);
        },
        onError: () => {
          toast.error('An error occurred while updating this document');
          setActiveIndex(-1);
          setItemLoader(false);
        },
      }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleImageUpload = async () => {
    setItemLoader(true);

    const formData = new FormData();
    formData.append(String(tempParam?.type).toLowerCase(), acceptedFiles[0]);

    fileUploadMutation.mutate(formData, {
      onSuccess: (data: any) => {
        if (!data.success) {
          setItemLoader(false);
          return toast.error(data.message);
        }

        let uploadedProfilePicture;
        if (String(tempParam?.type).toLowerCase() === 'resume') {
          uploadedProfilePicture = data.data[0]?.resume;
        } else {
          uploadedProfilePicture = data.data[0]?.coverletter;
        }

        const payload2 = String(tempParam?.type).toLowerCase() === 'resume'
          ? { resume: uploadedProfilePicture }
          : { coverletter: uploadedProfilePicture };

        handleReviewDoc(payload2);
      },
      onError: () => {
        toast.error('An error occurred while uploading image');
        setItemLoader(false);
      },
    });
  };

  const handleReviewDoc = async (payload: any) => {
    adminUpdateClientDocumentsMutation.mutate(
      { id: tempParam?._id, body: payload },
      {
        onSuccess: (response2Data: any) => {
          if (response2Data.success) {
            toast.success('Document uploaded');
            fetchClientDocuments();
          }
          setActiveIndex(-1);
          setItemLoader(false);
        },
        onError: () => {
          toast.error('An error occurred while uploading image');
          setActiveIndex(-1);
          setItemLoader(false);
        },
      }
    );
  };

  const isEmptyCvDataPoints = (dataPoints: any) => {
    if (!dataPoints) return true;

    const fieldsToCheck = [
      // 'cvType',
      'skills',
      'achievements',
      'certificationsLicenses',
      'relevantProjects',
      'languages',
      'professionalAssociationsVolunteerWork',
      'workExperience',
      'education',
    ];

    return fieldsToCheck.every((field) => {
      if (Array.isArray(dataPoints[field])) {
        return dataPoints[field].length === 0;
      }
      return !dataPoints[field] || dataPoints[field] === '';
    });
  };

  const isEmptyCVJobTitles = (dataPoints: any) => {
    return !dataPoints || !Array.isArray(dataPoints) || dataPoints.length === 0;
  };

  const handlePopulateKeywords = async (row: any) => {
    try {
      const roletitles = JSON.parse(row?.cvJobTitles);
      const keywords = JSON.parse(row.keywords);

      const _data = [...roletitles, ...keywords];

      if (_data.length > 0) {
        toast.loading('Populating Keywords...');
        await axiosInstance.post(`${SERVER_URI}${ADMIN_EXTRACT_CV_DATA_POINTS}`, {
          id: row._id,
          populateKeywords: _data.join('; '),
        });
        toast.success('Keywords populated successfully');
      } else {
        toast.error('No keywords to populate');
      }
    } catch {
      // console.error('Error populating keywords:', error);
      toast.error('An error occurred while populating keywords');
    }
  };

  const answerPriorityColumns = useMemo(
    () => [
      {
        Header: 'File Name',
        accessor: 'document[0].filename',
      },
      {
        Header: 'Type',
        accessor: 'type',
      },
      {
        Header: 'Source',
        accessor: 'source',
      },
      {
        Header: 'Date Updated',
        accessor: 'updatedAt',
        Cell: (props: any) => {
          return (
            <div className="">{changeDateFormat(props.row.original.updatedAt, 'DD/MM/YYYY')}</div>
          );
        },
      },
      {
        Header: 'Extraction Type',
        accessor: 'cvType',
        Cell: ({ row }) => (
          <div className="text-career-gray-200 text-14 font-medium capitalize">
            {row.original.cvDataPoints.cvType}
          </div>
        ),
      },
      {
        Header: 'Suggested Job Titles',
        accessor: 'cvJobTitles',
        Cell: ({ row }) => (
          <div
            className={`${!isEmptyCVJobTitles(row.original?.cvJobTitles) ? 'cursor-pointer text-blue-500 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            onClick={() => {
              if (!isEmptyCVJobTitles(row.original?.cvJobTitles)) {
                setSelectedCvJobTitles(row.original?.cvJobTitles);
                setResumeId(row.original._id);
                setIsCvJobTitlesModalOpen?.(true);
              }
            }}
          >
            {!isEmptyCVJobTitles(row.original?.cvJobTitles) ? 'View' : 'No data'}
          </div>
        ),
      },
      {
        Header: 'Suggested Keywords',
        accessor: 'keywords',
        Cell: ({ row }) => (
          <div
            className={`${!isEmptyCVJobTitles(row.original.keywords) ? 'cursor-pointer text-blue-500 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            onClick={() => {
              if (!isEmptyCVJobTitles(row.original.keywords)) {
                setSelectedCvKeywords(row.original.keywords);
                setResumeId(row.original._id);
                setIsCvKeywordsModalOpen?.(true);
              }
            }}
          >
            {!isEmptyCVJobTitles(row.original.keywords) ? 'View' : 'No data'}
          </div>
        ),
      },
    ],
    [current >= 0, activeIndex, itemLoader],
  );

  const keywordsColumns = useMemo(
    () => [
      {
        Header: 'File Name',
        accessor: 'document[0].filename',
      },
      {
        Header: 'Type',
        accessor: 'type',
      },
      // {
      //   Header: 'Status',
      //   accessor: 'status',
      // },
      {
        Header: 'Extraction Type',
        accessor: 'cvType',
        Cell: ({ row }: {row: any}) => (
          <div className="text-career-gray-200 text-14 font-medium capitalize">
            {row.original.cvDataPoints.cvType}
          </div>
        ),
      },
      {
        Header: 'Suggested Keywords',
        accessor: 'keywords',
        Cell: ({ row }) => (
          <div
            className={`${!isEmptyCVJobTitles(row.original.keywords) ? 'cursor-pointer text-blue-500 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            onClick={() => {
              if (!isEmptyCVJobTitles(row.original.keywords)) {
                setSelectedCvKeywords(row.original.keywords);
                setResumeId(row.original._id);
                setIsCvKeywordsModalOpen?.(true);
                setAQModal?.(false);
              }
            }}
          >
            {!isEmptyCVJobTitles(row.original.keywords) ? 'View' : 'No data'}
          </div>
        ),
      },
    ],
    [current >= 0, activeIndex, itemLoader],
  );

  const roleTitlesColumns = useMemo(
    () => [
      {
        Header: 'File Name',
        accessor: 'document[0].filename',
      },
      {
        Header: 'Type',
        accessor: 'type',
      },
      {
        Header: 'Status',
        accessor: 'status',
      },
      {
        Header: 'Extraction Type',
        accessor: 'cvType',
        Cell: ({ row } : { row: any}) => (
          <div className="text-career-gray-200 text-14 font-medium capitalize">
            {row.original.cvDataPoints.cvType}
          </div>
        ),
      },
      {
        Header: 'Suggested Job Titles',
        accessor: 'cvJobTitles',
        Cell: ({ row }) => (
          <div
            className={`${!isEmptyCVJobTitles(row.original?.cvJobTitles) ? 'cursor-pointer text-blue-500 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            onClick={() => {
              if (!isEmptyCVJobTitles(row.original?.cvJobTitles)) {
                setSelectedCvJobTitles(row.original?.cvJobTitles);
                setResumeId(row.original._id);
                setIsCvJobTitlesModalOpen?.(true);
                setAQModal?.(false);
              }
            }}
          >
            {!isEmptyCVJobTitles(row.original?.cvJobTitles) ? 'View' : 'No data'}
          </div>
        ),
      },
    ],
    [current >= 0, activeIndex, itemLoader],
  );

  const columns = useMemo(
    () => [
      {
        Header: 'File Name',
        accessor: 'document[0].filename',
      },
      {
        Header: 'Type',
        accessor: 'type',
      },
      // {
      //   Header: 'Status',
      //   accessor: 'status',
      // },
      {
        Header: 'Source',
        accessor: 'source',
      },
      {
        Header: 'Date Updated',
        accessor: 'updatedAt',
        Cell: (props: any) => {
          return (
            <div className="">{changeDateFormat(props.row.original.updatedAt, 'DD/MM/YYYY')}</div>
          );
        },
      },
      {
        Header: 'Extraction Type',
        accessor: 'cvType',
        Cell: ({ row }) => (
          <div className="text-career-gray-200 text-14 font-medium capitalize">
            {row.original.cvDataPoints.cvType}
          </div>
        ),
      },
      {
        Header: 'Data Points',
        accessor: 'cvDataPoints',
        Cell: ({ row }) => (
          <div
            className={`${!isEmptyCvDataPoints(row.original.cvDataPoints) ? 'cursor-pointer text-blue-500 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            onClick={() => {
              if (!isEmptyCvDataPoints(row.original.cvDataPoints)) {
                setSelectedCvDataPoints(row.original.cvDataPoints);
                setIsModalOpen(true);
              }
            }}
          >
            {!isEmptyCvDataPoints(row.original.cvDataPoints) ? 'View' : 'No data'}
          </div>
        ),
      },
      {
        Header: 'Suggested Keywords',
        accessor: 'keywords',
        Cell: ({ row }) => (
          <div
            className={`${!isEmptyCVJobTitles(row.original.keywords) ? 'cursor-pointer text-blue-500 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            onClick={() => {
              if (!isEmptyCVJobTitles(row.original.keywords)) {
                setSelectedCvKeywords(row.original.keywords);
                setResumeId(row.original._id);
                setClientId(row.original.userId._id);
                setIsCvKeywordsModalOpen?.(true);
              }
            }}
          >
            {!isEmptyCVJobTitles(row.original.keywords) ? 'View' : 'No data'}
          </div>
        ),
      },
      {
        Header: 'Suggested Job Titles',
        accessor: 'cvJobTitles',
        Cell: ({ row }) => (
          <div
            className={`${!isEmptyCVJobTitles(row.original?.cvJobTitles) ? 'cursor-pointer text-blue-500 hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
            onClick={() => {
              if (!isEmptyCVJobTitles(row.original?.cvJobTitles)) {
                setSelectedCvJobTitles(row.original?.cvJobTitles);
                setResumeId(row.original._id);
                setClientId(row.original.userId._id);
                setIsCvJobTitlesModalOpen?.(true);
                setAQModal?.(false);
              }
            }}
          >
            {!isEmptyCVJobTitles(row.original?.cvJobTitles) ? 'View' : 'No data'}
          </div>
        ),
      },
      {
        Header: 'Populate Keywords',
        accessor: 'populateKeywords',
        Cell: ({ row }) => {
          return (
            !isEmptyCVJobTitles(row.original?.cvJobTitles) && (
              <AntButton
                className="px-4 py-1 rounded-sm mx-2 my-2 bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                onClick={() => handlePopulateKeywords(row.original)}
              >
                Populate Keywords
              </AntButton>
            )
          );
        },
      },
      {
        Header: 'View Revamped Versions',
        accessor: 'viewRevamped',
        Cell: ({ row }) => {
          return (
            !isEmptyCVJobTitles(row.original?.cvJobTitles) && (
              <AntButton
                className="px-4 py-1 rounded-sm mx-2 my-2 bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                onClick={() => {
                  setCurrentRevamp(row.original);
                  setRevampedDocsOpen(true);
                }}
              >
                View Revamped Versions
              </AntButton>
            )
          );
        },
      },
    ],
    [current >= 0, activeIndex, itemLoader],
  );

  return (
    <>
      <div className="w-full bg-white pb-6 px-6 rounded-2xl">
        <div className=" flex items-center justify-between">
          <div className="flex flex-col gap-8">
            {adminDashboard && (
              <div className="flex flex-col">
                <h3 className="text-24 !font-medium font-sharp-grotesk text-career-black-200 capitalize">
                  Steps
                </h3>
                <span>
                  1. Check the box next to your CV/Resume.
                </span>
                <span>2. Click 'Default' to set the CV.</span>
                <span>
                  3. After setting default, a menu appears to generate titles or keywords.
                </span>
              </div>
            )}
            <h3 className="text-24 !font-medium font-sharp-grotesk text-career-black-200 capitalize">
              {adminDashboard ? 'Documents' : 'Client Documents'}
            </h3>
          </div>
          {!adminDashboard && (
            <div className="mb-8 flex items-center bg-career-gray-300 bigLaptop:w-[31rem] h-12 rounded-[2.5rem] px-4 py-3">
              <Icon name="search" />
              <input
                type="text"
                placeholder="Search"
                className="border-none outline-none ring-0 focus:ring-0 focus:border-none focus:outline-0 bg-career-gray-300 ml-4 w-full placeholder:text-14 placeholder:font-medium placeholder:text-career-gray-200"
              />
            </div>
          )}
        </div>
        <ClientDocumentListing
          loading={loading}
          columns={
            credentialId
              ? answerPriorityColumns
              : keywordsAlone
                ? keywordsColumns
                : roleTitlesAlone
                  ? roleTitlesColumns
                  : columns
          }
          excludeFeatures={excludeFeatures}
          fetchClientDocuments={fetchClientDocuments}
          data={data}
          selectedCvDataPoints={selectedCvDataPoints}
          setSelectedCvDataPoints={setSelectedCvDataPoints}
          selectedCvJobTitles={selectedCvJobTitles}
          selectedCVKeywords={selectedCVKeywords}
          setSelectedCvJobTitles={setSelectedCvJobTitles}
          setSelectedCvKeywords={setSelectedCvKeywords}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          isCvJobTitlesModalOpen={isCvJobTitlesModalOpen}
          isCvKeywordsModalOpen={isCvKeywordsModalOpen}
          setIsCvKeywordsModalOpen={setIsCvKeywordsModalOpen}
          setIsCvJobTitlesModalOpen={setIsCvJobTitlesModalOpen}
          revampedDocsOpen={revampedDocsOpen}
          currentRevamp={currentRevamp}
          setCurrentRevamp={setCurrentRevamp}
          setRevampedDocsOpen={setRevampedDocsOpen}
          credentialId={credentialId || null}
          mongoClientID={mongoClientID}
          resumeId={resumeId}
          adminDashboard={adminDashboard}
          keywordsAlone={keywordsAlone}
          roleTitlesAlone={roleTitlesAlone}
          setRefetch={setRefetch}
          refetch={refetch}
          clientId={clientId}
          isUpdating={isUpdating as boolean}
          setIsUpdating={setIsUpdating}
          extractKeywords={extractKeywords as any}
          extractRoleTitles={extractRoleTitles as any}
          checkApproved={checkApproved as any}
          checkDeclined={checkDeclined as any}
          selected={selected as any}
          setSelected={setSelected as any}
          approvedJobs={approvedJobs as any}
          setApprovedJobs={setApprovedJobs as any}
          declinedJobs={declinedJobs as any}
          setDeclinedJobs={setDeclinedJobs as any}
        />
      </div>
    </>
  );
};

export default ClientDocumentListingWrapper;
