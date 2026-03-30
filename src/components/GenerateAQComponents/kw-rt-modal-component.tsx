/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';
import { useState, useEffect, FC } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';
import { useAdminQueries, useAdminMutations } from '@/hooks/api/admin.api';
import ClientDocumentListingWrapper from './ClientDocumentListingWrapper';
import { FormatCvJobTitles, FormatCvKeyWords } from './AIKeywordRoleTitles';
import { useAuthStore } from '@/store/user.store';

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
  refetch?: boolean;
  masterSheet?: boolean;
}

const KwRtModalComponent: FC<ClientDocumentListingWrapperProps> = ({
  loading,
  data,
  fetchClientDocuments,
  mongoClientID,
  adminDashboard,
  keywordsAlone,
  roleTitlesAlone,
  setRefetch,
  refetch,
  masterSheet,
}) => {
  const [isCvJobTitlesModalOpen, setIsCvJobTitlesModalOpen] = useState(false);
  const [isCvKeywordsModalOpen, setIsCvKeywordsModalOpen] = useState(false);
  const [roleTitles, setRoleTitles] = useState<any[]>([]);
  const [kw, setKw] = useState<any[]>([]);
  const [rt, setRt] = useState<any[]>([]);
  const [approvedJobs, setApprovedJobs] = useState<any[]>([]);
  const [declinedJobs, setDeclinedJobs] = useState<any[]>([]);
  const [keywordPreferences, setKeywordsPreferences] = useState<any[]>([]);
  const [titlesPreferences, setTitlesPreferences] = useState<any[]>([]);
  const [excludedTitlesPreferencs, setExcludedTitlesPreferences] = useState<any[]>([]);
  const [exludedKeywordsPreferences, setExcludedKeywordsPreferences] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sortedRt, setSortedRt] = useState<any[]>([]);
  const [sortedKw, setSortedKw] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [retrievedResumeId, setRetrievedResuneId] = useState(null);
  const [resumeId] = useState(null);
  const [clientId] = useState(null);
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore((s) => s);

  const userIdToFetch = id ?? mongoClientID ?? clientId ?? user?._id;

  const {
    userDocsAndPreferencesDomain: { data: userDocsData, isSuccess: isFetchDocsSuccess },
  } = useAdminQueries({
    fetchUserDocsAndPreferences: true,
    userId: userIdToFetch,
  });

  const {
    generateKeywordRoleTitlesMutation,
    updateKeywordsMutation,
    updateTitlesMutation,
    shortenWordsMutation,
  } = useAdminMutations();

  const fetchdocs = async () => {
    if (isFetchDocsSuccess && userDocsData) {
      const result = { data: userDocsData };
      if (result?.data) {
        result.data.userDocs.forEach((doc: any) => {
          if (!Array.isArray(doc.document)) {
            doc.document = [doc.document];
          }
        });

        // const resumeId_ = resumeId ?? selected[0]?.original._id ?? selectedReumeId;

        const result_ = result.data.userDocs.find((obj: any) => obj.cvDataPoints.cvType === 'default');
        setRetrievedResuneId(result_?._id);

        setRoleTitles(result_?.cvJobTitles);
        setKeywords(result_?.keywords);

        setKeywordsPreferences(result.data.userPreference.keywords);
        setTitlesPreferences(result.data.userPreference.titles);
        setExcludedTitlesPreferences(result.data.userPreference.titlesExcluded);
        setExcludedKeywordsPreferences(result.data.userPreference.keywordsExcluded);
      }
    }
  };

  useEffect(() => {
    if (isFetchDocsSuccess) {
      fetchdocs();
    }
  }, [isFetchDocsSuccess, userDocsData, isUpdating, isCvJobTitlesModalOpen, isCvKeywordsModalOpen]);

  async function getShortened(keywords: string[]) {
    try {
      const response = await shortenWordsMutation.mutateAsync({ words: keywords });
      return (response as any).data || (response as unknown as any[]);
    } catch  {
      return keywords.map((k: string) => ({ long: k, short: '' }));
    }
  }

  const extractKeywords = async (increment?: any, existing?: any, defaultTrigger?: any) => {
    if (selected.length > 1) {
      toast.error('Please select only one document');
      return;
    }

    setIsUpdating(true);

    const payload = {
      id: selected[0]?.original?._id ?? resumeId ?? retrievedResumeId,
      keywords: true,
      increment: increment,
      existing: existing,
    };

    generateKeywordRoleTitlesMutation.mutate(payload, {
      onSuccess: async () => {
        toast.success('Keywords Generated');
        if (!defaultTrigger) {
          await handleSubmitTitlesKeywords(true);
        }
        setIsUpdating(false);
      },
      onError: () => {
        toast.error('An error occurred while generating Keywords');
        setIsUpdating(false);
      },
      onSettled: () => {
        if (adminDashboard) {
          setRefetch?.(true);
        }
      }
    });
  };

  const handleSubmitTitlesKeywords = async (keywordsMode?: boolean) => {
    const clientIdToUpdate = mongoClientID ?? id;

    if (keywordsMode) {
      updateKeywordsMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs }, {
        onSuccess: () => {
          toast.success('Keywords successfully updated');
        },
        onError: () => {
          toast.error('An error occurred while updating keywords');
        }
      });

      if (declinedJobs?.length) {
        updateKeywordsMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs: declinedJobs, declined: true });
      }
    } else {
      updateTitlesMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs }, {
        onSuccess: () => {
          toast.success('Titles successfully updated');
        },
        onError: () => {
          toast.error('An error occurred while updating titles');
        }
      });

      if (declinedJobs?.length) {
        updateTitlesMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs: declinedJobs, declined: true });
      }
    }

    if (adminDashboard) {
      setRefetch?.(true);
    }
  };

  const checkApproved = (jt: string) => {
    return approvedJobs?.some((title: string) => title.toLowerCase() === jt.toLowerCase());
  };

  const checkDeclined = (jt: string) =>
    declinedJobs?.some((title: string) => title.toLowerCase() === jt.toLowerCase());

  const extractRoleTitles = async (increment?: any, existing?: any, defaultTrigger?: any) => {
    if (selected.length > 1) {
      toast.error('Please select only one document');
      return;
    }

    setIsUpdating(true);

    const payload = {
      id: selected[0]?.original?._id ?? resumeId ?? retrievedResumeId,
      roleTitles: true,
      increment: increment,
      existing: existing,
    };

    generateKeywordRoleTitlesMutation.mutate(payload, {
      onSuccess: async () => {
        toast.success('Role Titles Generated');
        if (!defaultTrigger) {
          await handleSubmitTitlesKeywords();
        }
        setIsUpdating(false);
      },
      onError: () => {
        toast.error('An error occurred while generating role titles');
        setIsUpdating(false);
      },
      onSettled: () => {
        if (adminDashboard) {
          setRefetch?.(true);
        }
      }
    });
  };

  const handleApprovalChange = (jobTitle: string, status: string) => {
    if (status === 'Approved') {
      // @ts-ignore
      setApprovedJobs((prev: any) => [...prev, jobTitle]);
    } else if (status === 'Declined') {
      // @ts-ignore
      setDeclinedJobs((prev: any) => [...prev, jobTitle]);
    } else {
      setApprovedJobs((prev) => prev.filter((title) => title !== jobTitle));
    }
  };

  useEffect(() => {
    getShortened(sortedRt).then((r) => {
      // console.log({ r });
      setRt(r);
    });
  }, [sortedRt]);

  useEffect(() => {
    getShortened(sortedKw).then((r) => {
      // console.log({ r });
      setKw(r);
    });
  }, [sortedKw]);

  const handleSubmitTitles = async () => {
    setIsUpdating(true);
    const clientIdToUpdate = mongoClientID ?? id;

    updateTitlesMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs }, {
      onSuccess: () => {
        toast.success('Role titles successfully updated');
        setIsUpdating(false);
      },
      onError: () => {
        // console.error(error);
        toast.error('An error occurred while updating titles.');
        setIsUpdating(false);
      },
      onSettled: () => {
        if (adminDashboard) {
          setRefetch?.(true);
        }
      }
    });

    if (declinedJobs?.length) {
      updateTitlesMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs: declinedJobs, declined: true });
    }
  };

  const handleSubmitKeywords = async () => {
    setIsUpdating(true);
    const clientIdToUpdate = mongoClientID ?? id;

    updateKeywordsMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs }, {
      onSuccess: () => {
        toast.success('Keywords successfully updated');
        setIsUpdating(false);
      },
      onError: () => {
        // console.error(error);
        toast.error('An error occurred while updating keywords.');
        setIsUpdating(false);
      },
      onSettled: () => {
        if (adminDashboard) {
          setRefetch?.(true);
        }
      }
    });

    if (declinedJobs?.length) {
      updateKeywordsMutation.mutate({ clientId: clientIdToUpdate as string, approvedJobs: declinedJobs, declined: true });
    }
  };

  return (
    <div>
      <div
        className={
          masterSheet
            ? 'max-w-4xl w-full flex items-center justify-start rounded-lg py-4 px-2 flex-col overflow-y-auto'
            : ''
        }
      >
        <ClientDocumentListingWrapper
          setIsCvKeywordsModalOpen={setIsCvKeywordsModalOpen}
          excludeFeatures={['revamp', 'datapoints', 'accept', 'reject']}
          isCvKeywordsModalOpen={isCvKeywordsModalOpen}
          isCvJobTitlesModalOpen={isCvJobTitlesModalOpen}
          setIsCvJobTitlesModalOpen={setIsCvJobTitlesModalOpen}
          loading={loading}
          data={data}
          fetchClientDocuments={fetchClientDocuments}
          isUpdating={isUpdating}
          setIsUpdating={setIsUpdating}
          extractKeywords={extractKeywords}
          extractRoleTitles={extractRoleTitles}
          checkApproved={checkApproved}
          checkDeclined={checkDeclined}
          selected={selected}
          setSelected={setSelected}
          approvedJobs={approvedJobs}
          setApprovedJobs={setApprovedJobs}
          declinedJobs={declinedJobs}
          setDeclinedJobs={setDeclinedJobs}
          mongoClientID={user?._id}
          adminDashboard={false}
          keywordsAlone={keywordsAlone}
          roleTitlesAlone={roleTitlesAlone}
          setRefetch={setRefetch}
          refetch={refetch}
        />
      </div>
      <FormatCvKeyWords
        dataPoints={keywords}
        setIsCvKeywordsModalOpen={setIsCvKeywordsModalOpen}
        isCvKeywordsModalOpen={isCvKeywordsModalOpen}
        checkApproved={checkApproved}
        checkDeclined={checkDeclined}
        exludedKeywordsPreferences={exludedKeywordsPreferences}
        extractKeywords={extractKeywords}
        handleApprovalChange={handleApprovalChange}
        keywordPreferences={keywordPreferences}
        handleSubmitKeywords={handleSubmitKeywords}
        kw={kw}
        setSortedKw={setSortedKw as any}
        isUpdating={isUpdating}
        loading = {loading}
      />
      <FormatCvJobTitles
        dataPoints={roleTitles}
        setIsCvJobTitlesModalOpen={setIsCvJobTitlesModalOpen}
        isCvJobTitlesModalOpen={isCvJobTitlesModalOpen}
        checkApproved={checkApproved}
        checkDeclined={checkDeclined}
        excludedTitlesPreferencs={excludedTitlesPreferencs}
        extractRoleTitles={extractRoleTitles}
        handleApprovalChange={handleApprovalChange}
        handleSubmitTitles={handleSubmitTitles}
        rt={rt}
        setSortedRt={setSortedRt as any}
        titlesPreferences={titlesPreferences}
        isUpdating={isUpdating}
        loading = {loading}
      />
    </div>
  );
};

export default KwRtModalComponent;
