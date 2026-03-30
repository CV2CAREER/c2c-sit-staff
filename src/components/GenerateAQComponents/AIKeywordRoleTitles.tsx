import { useEffect, useState, useMemo } from 'react';
import { FiLoader } from 'react-icons/fi';
import CustomModal from '../CustomModal/CustomModal';
import { KeywordChevronDown, Filter, Close, Refresh, AddToolTip } from './Icons';

interface ICVJobTitlesProps {
  titlesPreferences: any;
  excludedTitlesPreferencs: any;
  dataPoints: any;
  isCvJobTitlesModalOpen: boolean;
  setIsCvJobTitlesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSortedRt: React.Dispatch<React.SetStateAction<any[]>>;
  rt: any[];
  extractRoleTitles: (increment?: boolean, existing?: any) => void;
  handleSubmitTitles: () => void;
  handleApprovalChange: (jobTitle: any, status: any) => void;
  checkApproved: (jt: any) => boolean;
  checkDeclined: (jt: any) => boolean;
  setAQModal?: (data: any) => void;
  isUpdating: boolean;
  loading: boolean;
}

export const FormatCvJobTitles = ({
  dataPoints,
  titlesPreferences,
  excludedTitlesPreferencs,
  setSortedRt,
  rt,
  extractRoleTitles,
  handleSubmitTitles,
  isCvJobTitlesModalOpen,
  setIsCvJobTitlesModalOpen,
  checkApproved,
  checkDeclined,
  handleApprovalChange,
  setAQModal,
  isUpdating,
  loading
}: ICVJobTitlesProps) => {
  const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false);

  let jobTitles;
  try {
    // console.log({ dataPoints });
    // console.log(rt);
    const mergedArray = (dataPoints ?? []).flatMap((item: any) => {
      try {
        return JSON.parse(item);
      } catch {
        return [];
      }
    });
    jobTitles = mergedArray;
  } catch {
    // console.error("Error parsing CV job titles:", error);
    jobTitles = [];
  }

  if (!Array.isArray(jobTitles)) {
    // console.log('CV job titles is not an array');
    jobTitles = [];
  }

  const combinedArray = [
    ...new Set([...titlesPreferences, ...jobTitles, ...excludedTitlesPreferencs]),
  ];

  const sortedJobTitles = useMemo(() => {
    return [...combinedArray].sort((a, b) => {
      const isAApproved = titlesPreferences?.some((title: any) => title.toLowerCase() === a.toLowerCase());
      const isBApproved = titlesPreferences?.some((title: any) => title.toLowerCase() === b.toLowerCase());

      // Approved titles come first
      if (isAApproved && !isBApproved) return -1;
      if (!isAApproved && isBApproved) return 1;
      return 0; // Preserve original order for non-approved titles
    });
  }, [combinedArray, titlesPreferences]);

  useEffect(() => {
    setSortedRt(sortedJobTitles);
  }, [titlesPreferences, excludedTitlesPreferencs]);

  return (
    <>
      <CustomModal
        visibility={isCvJobTitlesModalOpen}
        toggleVisibility={setIsCvJobTitlesModalOpen}
        maxW={'70rem'}
      >
        <div className="bg-white rounded-3xl shadow-lg xl:max-w-full xl:w-[56rem] w-full mx-auto h-auto">
          <div className="w-full rounded-3xl whitespace-nowrap">
            <div className="min-w-full flex-shrink-0">
              <div className="flex justify-between rounded-xl mb-6 sticky top-0 z-10 bg-[#FAFAFA] p-4 items-center min-w-full left-0 right-0">
                <div className="flex items-center">
                  <button
                    onClick={() => setIsCvJobTitlesModalOpen((prev) => !prev)}
                    className="px-3"
                  >
                    <Close />
                  </button>
                  <button
                    onClick={() => extractRoleTitles()}
                    className="bg-[#EDFFFF] flex py-1 px-2 space-x-1 md:space-x-2 md:px-3 md:py-2 text-sm md:text-base rounded-md items-center"
                  >
                    <Refresh /> <span>Refresh</span>
                  </button>
                </div>
                <div>
                  <span className="text-gray-600 text-sm md:text-base">Total:</span> {rt.length}
                </div>

                <div>
                  <span className="text-sm md:text-base font-semibold text-career-blue-800">
                    Role Titles
                  </span>
                </div>
              </div>
              {/* Header */}
              <div className="flex justify-between bg-[#F3F3F3] border-b border-gray-300 py-3 px-4 text-gray-700 font-semibold">
                <div className="xl:w-1/3 w-2/5 cursor-pointer" onClick={() => null}>
                  <div className="flex items-center space-x-3">
                    <p>Long</p>
                    <Filter />
                    <AddToolTip title={'Long Version of Role Title'} description={'The full detailed job title that provides more context about the position (e.g., “Digital Marketing Manager,” “Senior Software Engineer ”).'}  />
                  </div>
                  <small>(Actual Role)</small>
                </div>
                <div className="xl:w-1/3 w-2/5 ms-4 cursor-pointer" onClick={() => null}>
                  <div className="flex items-center space-x-3">
                    <p>Short</p>
                    <Filter />
                    <AddToolTip title={'Short Version of Role Title'} description={'A simplified version of a job title that generates more search result (e.g., “Marketing Manager,” “Software Engineer,” “Business Analyst”).'}  />
                  </div>
                  <small>(Shortened Role)</small>
                </div>
                <div className="xl:w-1/3 w-1/5 text-right self-center">Action</div>
              </div>

              {(rt.length || loading || isUpdating) ? (
                <div className="flex flex-col max-h-[55vh] overflow-y-auto scrollbar scrollbar-thumb-career-blue-800 scrollbar-track-gray-200 text-gray-700">
                  {rt.map((rt, index) => (
                    //TODO add the component and pass props
                    <SingleOption
                      checkApproved={checkApproved}
                      checkDeclined={checkDeclined}
                      handleApprovalChange={handleApprovalChange}
                      short={rt.short}
                      id={index}
                      long={rt.long}
                      key={rt.id}
                      comp = {'rt'}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[60vh]">
                  <FiLoader className="animate-spin text-4xl" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:space-x-4  smallLaptop:flex-row justify-center w-full rounded-xl items-center p-4 bg-white sticky bottom-0 z-10 gap-[8px]">
            <button
              type="button"
              onClick={() => extractRoleTitles(true, jobTitles)}
              disabled = {isUpdating}
              className="whitespace-nowrap w-full py-2 bg-[#008ED3] text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50 flex items-center justify-center"
            >
              {(isUpdating || loading) ? (
                <>
                  <FiLoader className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                'Show More'
              )}
            </button>
            <button
              type="button"
              //onClick={() => handleSubmitTitles()}
              onClick={() => {
                setIsConfirmSaveModalOpen(true);
              }}
              disabled = {isUpdating}
              className="whitespace-nowrap w-full py-2 bg-[#008ED3] text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </CustomModal>
      <ConfirmSave
        isConfirmSaveModalOpen={isConfirmSaveModalOpen}
        setIsConfirmSaveModalOpen={setIsConfirmSaveModalOpen}
        handleSubmit={handleSubmitTitles}
        setAQModal={setAQModal as any}
        setIsCompModalOpen={setIsCvJobTitlesModalOpen}
      />
    </>
  );
};

interface IFormatCVKeywordsProps {
  keywordPreferences: any;
  exludedKeywordsPreferences: any;
  dataPoints: any;
  isCvKeywordsModalOpen: boolean;
  setIsCvKeywordsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSortedKw: React.Dispatch<React.SetStateAction<any[]>>;
  kw: any[];
  extractKeywords: (increment?: boolean, existing?: any) => void;
  handleApprovalChange: (jobTitle: any, status: any) => void;
  checkApproved: (jt: any) => boolean;
  checkDeclined: (jt: any) => boolean;
  handleSubmitKeywords: () => void;
  setAQModal?: (data: any) => void;
  isUpdating: boolean;
  loading: boolean;
}

export const FormatCvKeyWords = ({
  dataPoints,
  keywordPreferences,
  exludedKeywordsPreferences,
  setSortedKw,
  kw,
  extractKeywords,
  handleSubmitKeywords,
  isCvKeywordsModalOpen,
  setIsCvKeywordsModalOpen,
  checkApproved,
  checkDeclined,
  handleApprovalChange,
  setAQModal,
  isUpdating,
  loading
}: IFormatCVKeywordsProps) => {
  const [isConfirmSaveModalOpen, setIsConfirmSaveModalOpen] = useState(false);

  // console.log(dataPoints)
  const mergedArray = (dataPoints ?? [])
    .filter((item: any) => item !== '')
    .flatMap((item: any) => {
      try {
        return JSON.parse(item);
      } catch {
        // console.error('Invalid JSON', item, e);
        return []; // Return an empty array for invalid JSON
      }
    });

  let jobTitles;
  try {
    jobTitles = mergedArray;
  } catch {
    // console.log('Error parsing CV job titles:', error);
    jobTitles = [];
  }

  if (!Array.isArray(jobTitles)) {
    // console.log('CV job titles is not an array');
    jobTitles = [];
  }

  // const parsed = keywords.map(jsonArray => JSON.parse(jsonArray)).flat()
  const combinedArray = [
    ...new Set([...keywordPreferences, ...jobTitles, ...exludedKeywordsPreferences]),
  ];

  const sortedJobTitles = useMemo(() => {
    return [...combinedArray].sort((a, b) => {
      const isAApproved = keywordPreferences?.some(
        (title: any) => title.toLowerCase() === a.toLowerCase(),
      );
      const isBApproved = keywordPreferences?.some(
        (title: any) => title.toLowerCase() === b.toLowerCase(),
      );

      // Approved titles come first
      if (isAApproved && !isBApproved) return -1;
      if (!isAApproved && isBApproved) return 1;
      return 0; // Preserve original order for non-approved titles
    });
  }, [combinedArray, keywordPreferences]);

  useEffect(() => {
    setSortedKw(sortedJobTitles);
  }, [keywordPreferences, exludedKeywordsPreferences]);

  return (
    <>
      <CustomModal
        visibility={isCvKeywordsModalOpen}
        callbackTrigger={true}
        toggleVisibility={setIsCvKeywordsModalOpen}
        maxW={'70rem'}
      >
        <div className="bg-white rounded-3xl shadow-lg xl:max-w-full xl:w-[56rem] w-full mx-auto h-auto">
          <div className="w-full rounded-3xl whitespace-nowrap">
            <div className="min-w-full flex-shrink-0">
              <div className="flex justify-between rounded-xl mb-6 sticky top-0 z-10 bg-[#FAFAFA] p-4 items-center left-0 right-0">
                <div className="flex items-center">
                  <button onClick={() => setIsCvKeywordsModalOpen(false)} className="px-3">
                    <Close />
                  </button>
                  <button
                    onClick={() => extractKeywords()}
                    className="bg-[#EDFFFF] flex py-1 px-2 space-x-1 md:space-x-2 md:px-3 md:py-2 text-sm md:text-base rounded-md items-center"
                  >
                    <Refresh /> <span>Refresh</span>
                  </button>
                </div>
                <div>
                  <span className="text-gray-600 text-sm md:text-base">Total:</span> {kw.length}
                </div>
                <div>
                  <span className="text-sm md:text-base font-semibold text-career-blue-800">
                    Keywords
                  </span>
                </div>
              </div>
              {/* Header */}
              <div className="bg-[#F3F3F3] border-b border-gray-300 py-3 px-4 text-gray-700 font-semibold">
                <div className="flex justify-between">
                  <div className="xl:w-1/3 w-2/5 break-words cursor-pointer" onClick={() => null}>
                    <div className="flex items-center space-x-3">
                      <p>Long</p>
                      <Filter />
                    </div>
                    <small>(Actual Word)</small>
                  </div>
                  <div className="xl:w-1/3 w-2/5 ms-4 cursor-pointer" onClick={() => null}>
                    <div className="flex items-center space-x-3">
                      <p>Short</p>
                      <Filter />
                    </div>
                    <small>(Shortened Word)</small>
                  </div>
                  <div className="xl:w-1/3 w-1/5 text-right self-center">Action</div>
                </div>
              </div>

              {(kw.length || loading || isUpdating) ? (
                <div className="flex flex-col max-h-[55vh] overflow-y-auto scrollbar scrollbar-thumb-career-blue-800 scrollbar-track-gray-200 text-gray-700">
                  {kw.map((kw, index) => (
                    //TODO add the component and pass props
                    <SingleOption
                      checkApproved={checkApproved}
                      checkDeclined={checkDeclined}
                      handleApprovalChange={handleApprovalChange}
                      short={kw.short}
                      id={index}
                      long={kw.long}
                      key={kw.id}
                      comp ={'kw'}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[60vh]">
                  <FiLoader className="animate-spin text-4xl" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:space-x-4  smallLaptop:flex-row justify-center w-full rounded-xl items-center p-4 bg-white sticky bottom-0 z-10 gap-[8px]">
            <button
              type="button"
              onClick={() => extractKeywords(true, jobTitles)}
              disabled = {isUpdating}
              className="whitespace-nowrap w-full py-2 bg-[#008ED3] text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50 flex items-center justify-center"
            >
              {(isUpdating || loading) ? (
                <>
                  <FiLoader className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                'Show More'
              )}
            </button>
            <button
              type="button"
              //onClick={() => handleSubmitKeywords()}
              onClick={() => {
                setIsConfirmSaveModalOpen(true);
              }}
              disabled = {isUpdating}
              className="whitespace-nowrap w-full py-2 bg-[#008ED3] text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </CustomModal>
      <ConfirmSave
        isConfirmSaveModalOpen={isConfirmSaveModalOpen}
        setIsConfirmSaveModalOpen={setIsConfirmSaveModalOpen}
        handleSubmit={handleSubmitKeywords}
        setAQModal={setAQModal as any}
        setIsCompModalOpen={setIsCvKeywordsModalOpen}
      />
    </>
  );
};



interface ISingleOptionProps {
  id: number;
  short: string;
  long: string;
  checkApproved: (jt: any) => boolean;
  checkDeclined: (jt: any) => boolean;
  handleApprovalChange: (jobTitle: any, status: any) => void;
  comp:string
}

export const SingleOption = ({
  id,
  short,
  long,
  checkApproved,
  checkDeclined,
  handleApprovalChange,
  comp
}: ISingleOptionProps) => {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState(checkApproved(long));

  const addSpacesToCamelCase = (text: string) => {
    return text.replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  return (
    <div key={id} className="border-b border-2 border-[#F9F9F9]">
      {/* Main Row */}
      <div className="flex justify-between items-center py-4 px-6 text-sm xl:text-base">
        <div className="xl:w-1/3 w-2/5 break-words whitespace-normal pr-2">
          {addSpacesToCamelCase(long)}
        </div>
        <div className={`xl:w-1/3 w-2/5 ms-4 break-words whitespace-normal pr-2 ${comp === 'kw' && short === long? "text-career-blue-800":""}`}>
          {addSpacesToCamelCase(comp==='rt' ? short !== long ? short : '' : long || short)}
        </div>
        <div className="xl:w-1/3 w-1/5 flex justify-end">
          <button
            onClick={() => setOpen((prev) => !prev)}
            className={`bg-[#F5F7F9] transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            } rounded-full w-8 h-8 flex items-center justify-center`}
          >
            <KeywordChevronDown/>
          </button>
        </div>
      </div>

      {/* Expandable Section with Smooth Transition */}
      <div
        className={`overflow-hidden transition-all duration-600 ease-in-out ${
          open ? 'max-h-20 opacity-100 pb-2 px-6' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col text-xs sm:text-sm">
          {/* Left Column */}
          {short !== long ? (
            <div className="flex space-x-4">
              <label className="flex w-1/3 items-center gap-2">
                <input
                  type="radio"
                  name={`status-${id}`}
                  defaultChecked={checked}
                  onChange={() => {
                    handleApprovalChange(long, 'Approved');
                    setChecked(checkApproved(long));
                  }}
                  className="accent-gray-400"
                />
                I accept long
              </label>
              <label className="flex w-1/3 items-center gap-2">
                <input
                  type="radio"
                  name={`status-${id}`}
                  className="accent-gray-400"
                  onChange={() => {
                    handleApprovalChange(short, 'Approved');
                    setChecked(long !== short && checkApproved(short));
                  }}
                />
                I accept short
              </label>
              <div className="w-1/3"></div>
            </div>
          ) : (
            <label className="flex w-1/3 items-center gap-2">
              <input
                type="radio"
                name={`status-${id}`}
                defaultChecked={checked}
                onChange={() => {
                  handleApprovalChange(long, 'Approved');
                  setChecked(checkApproved(long));
                }}
                className="accent-gray-400"
              />
              I accept
            </label>
          )}
          {/* Right Column */}
          <div className="mt-1">
            <label className="flex w-1/3 items-center gap-2">
              <input
                type="radio"
                name={`status-${id}`}
                className="accent-blue-500"
                onChange={() => {
                  handleApprovalChange(short, 'Proposed');
                  handleApprovalChange(long, 'Proposed');
                }}
                defaultChecked={
                  !checkApproved(short) &&
                  !checkApproved(long) &&
                  !checkDeclined(short) &&
                  !checkDeclined(long)
                }
              />
              We propose
            </label>
            <div className="w-1/3"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConfirmSaveProps {
  isConfirmSaveModalOpen: boolean;
  setIsConfirmSaveModalOpen: (data: any) => void;
  handleSubmit: () => void;
  setAQModal: (data: any) => void;
  setIsCompModalOpen: (data: any) => void;
}

function ConfirmSave({
  isConfirmSaveModalOpen,
  setIsConfirmSaveModalOpen,
  handleSubmit,
  setAQModal,
  setIsCompModalOpen,
}: ConfirmSaveProps) {
  return (
    <div>
      <CustomModal
        visibility={isConfirmSaveModalOpen}
        toggleVisibility={() => setIsConfirmSaveModalOpen(false)}
      >
        <div className="flex justify-center">
          <div className="bg-white rounded-lg px-10 py-8">
            <h2 className="text-center text-lg font-semibold">{`Do You want to Continue?`}</h2>
            <p className="mt-3">
              {
                'You’ve saved your keywords and role titles Would you like to update them or continue to complete your job preferences?'
              }
            </p>
            <div className="flex space-x-4 mt-5">
              <button
                className="border border-gray-400 p-2 w-1/2 rounded-lg"
                onClick={() => {
                  //setAQModal(false);
                  setIsConfirmSaveModalOpen(false);
                  setIsCompModalOpen(true);
                }}
              >
                Edit Selection
              </button>
              <button
                className="bg-career-blue-500 text-white p-2 w-1/2 rounded-lg"
                onClick={() => {
                  handleSubmit();
                  setIsConfirmSaveModalOpen(false);
                  setAQModal(false);
                  setIsCompModalOpen(false);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
