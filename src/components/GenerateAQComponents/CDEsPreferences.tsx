"use client";
import { Chip } from "@material-tailwind/react";
import { useState } from "react";
import axios from "axios";
import CreatableSelect from "react-select/creatable";
import toast from "react-hot-toast";
import { disabliltyStatusOptions, maritalStatusOptions } from "@/data/options";
import { Pred } from "@/app/admin/campaign-mgt/_components/CampaignDataTable";

export default function CDEsPreferences({
  id,
  preference,
  loading,
  jobType,
  setReload,
  workingRights,
  setRefetch,
}: {
  id: string;
  preference: Pred;
  loading: boolean;
  jobType: any[];
  setReload: any;
  workingRights: any[];
  setRefetch: any;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFormData, setEditedFormData] = useState({
    role: preference?.role || "",
    titles: preference?.titles || [],
    titlesExcluded: preference?.titlesExcluded || [],
    keywords: preference?.keywords || [],
    advertisers: preference?.advertisers || [],
    advertisersExcluded: preference?.advertisersExcluded || [],
    jobTypes: preference?.jobTypes || [],
    jobTypesExcluded: preference?.jobTypesExcluded || [],
    minSalary: preference?.minSalary || 0,
    maxSalary: preference?.maxSalary || 0,
    classifications: preference?.classifications || [],
    classificationsExcluded: preference?.classificationsExcluded || [],
    workingRight: preference?.workingRight || [],
    country: preference?.country || "",
    city: preference?.city || [],
    locations: preference?.locations || [],
    stateExcluded: preference?.stateExcluded || [],
    cityExcluded: preference?.cityExcluded || [],
    body: preference?.body || [],
    bodyExcluded: preference?.bodyExcluded || [],
    coverletterIncluded: preference?.coverletterIncluded || [],
    // roleKeywordExclusive: preference?.roleKeywordExclusive || false,
    additionalComments: preference?.additionalComments || "",
    socialSecurityNumber: preference?.socialSecurityNumber || "",
    taxIdentificationNumber: preference?.taxIdentificationNumber || "",
    maritalStatus: preference?.maritalStatus || "",
    disabilityStatus: preference?.disabilityStatus || "",
    dateOfBirth: preference?.dateOfBirth || "",
    veteran: preference?.veteran,
  });

  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const salaryOptions = [
    { label: 0, value: 0 },
    { label: 40000, value: 40 },
    { label: 50000, value: 50 },
    { label: 60000, value: 60 },
    { label: 70000, value: 70 },
    { label: 80000, value: 80 },
    { label: 90000, value: 90 },
    { label: 100000, value: 100 },
    { label: 120000, value: 120 },
    { label: 150000, value: 150 },
    { label: 200000, value: 200 },
    { label: 250000, value: 250 },
    { label: 300000, value: 300 },
  ];

  const toggleEditMode = () => setIsEditing(!isEditing);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      event.preventDefault();
      setIsLoading(true);

      await axios.put(`/api/admin/jobPreference?uid=${id}`, editedFormData);
      toast.success(
        "User preference updated successfully. Kindly refresh this page!",
      );

      toggleEditMode();
      setIsLoading(false);

      setRefetch(true);
      setReload(true);
    } catch (error: any) {
      // console.log(error);
      setIsLoading(false);
      toast.error(error.response.data.message);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-between bg-gray-400 animate-pulse p-8 rounded-3xl">
          <div className="flex items-center">
            <div className="h-24 w-24 capitalize rounded-full text-[57px] p-4 bg-gray-300 animate-pulse text-career-blue-500 flex items-center justify-center mr-2 text-20 font-medium" />
            <div className="flex flex-col">
              <div className="flex">
                <div className="bg-gray-300 animate-pulse w-72 h-9 rounded-md mb-2" />

                <div className="bg-gray-300 animate-pulse w-16 ml-6 h-6 rounded-md mt-2" />
              </div>
              <div className="bg-gray-300 animate-pulse w-12 h-6 rounded-md mt-2" />
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-gray-300 animate-pulse w-72 h-12 rounded-md mr-4" />
            <div className="bg-gray-300 animate-pulse w-12 h-12 rounded-md" />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(auto,19.8rem))] gap-4 my-4 gap-y-8">
      <Section title="Job Types">
        <SubSection title="Preferred Job Types">
          {isEditing ? (
            <CreatableSelect
              isMulti
              options={jobType}
              onChange={(options) => {
                const stateExcludedArray = options.map(
                  (option: any) => option.value,
                );
                setEditedFormData({
                  ...editedFormData,
                  jobTypes: stateExcludedArray,
                });
              }}
              defaultValue={preference?.jobTypes.map((jobType: any) => ({
                label: jobType,
                value: jobType,
              }))}
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderColor: "black",
                  borderWidth: "1.5px",
                  borderRadius: "0.25rem",
                  width: "300px",
                }),
              }}
            />
          ) : (
            preference?.jobTypes
          )}
        </SubSection>
      </Section>

      <Section title="Salary Range">
        <SubSection title="Minimum Salary">
          {isEditing ? (
            <CreatableSelect
              options={salaryOptions}
              onChange={(options: any) => {
                setEditedFormData({
                  ...editedFormData,
                  minSalary: options.value,
                });
              }}
              defaultValue={{
                label: preference?.minSalary * 1000,
                value: preference?.minSalary * 1000,
              }}
              formatOptionLabel={({ label }) => formatCurrency(label)}
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderColor: "black",
                  borderWidth: "1.5px",
                  borderRadius: "0.25rem",
                  width: "300px",
                }),
              }}
            />
          ) : (
            (preference?.minSalary * 1000).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })
          )}
        </SubSection>
        <SubSection title="Maximum Salary">
          {isEditing ? (
            <CreatableSelect
              options={salaryOptions}
              onChange={(options: any) => {
                setEditedFormData({
                  ...editedFormData,
                  maxSalary: options.value,
                });
              }}
              defaultValue={{
                label: preference?.maxSalary * 1000,
                value: preference?.maxSalary * 1000,
              }}
              formatOptionLabel={({ label }) => formatCurrency(label)}
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderColor: "black",
                  borderWidth: "1.5px",
                  borderRadius: "0.25rem",
                  width: "300px",
                }),
              }}
            />
          ) : (
            (preference?.maxSalary * 1000).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })
          )}
        </SubSection>
      </Section>

      <Section title="Taxpayer Identification Number (TIN)">
        {isEditing ? (
          <input
            placeholder="TIN"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setEditedFormData({
                ...editedFormData,
                taxIdentificationNumber: event.target.value,
              });
            }}
            name="taxIdentificationNumber"
            // value={preference?.taxIdentificationNumber}
            className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full lg:w-[80%] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
          />
        ) : (
          preference?.taxIdentificationNumber
        )}
      </Section>

      <Section title="Social Security Number (SSN)">
        {isEditing ? (
          <input
            placeholder="SSN"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setEditedFormData({
                ...editedFormData,
                socialSecurityNumber: event.target.value,
              });
            }}
            name="socialSecurityNumber"
            // value={preference?.socialSecurityNumber}
            className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full lg:w-[80%] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
          />
        ) : (
          preference?.socialSecurityNumber
        )}
      </Section>

      <Section title="Working Rights">
        {isEditing ? (
          <CreatableSelect
            isMulti
            options={workingRights}
            onChange={(options) => {
              const stateExcludedArray = options.map(
                (option: any) => option.value,
              );
              setEditedFormData({
                ...editedFormData,
                stateExcluded: stateExcludedArray,
              });
            }}
            styles={{
              control: (provided) => ({
                ...provided,
                borderColor: "black",
                borderWidth: "1.5px",
                borderRadius: "0.25rem",
                width: "300px",
              }),
            }}
          />
        ) : (
          preference?.workingRight
        )}
      </Section>

      <Section title="Marital Status">
        {isEditing ? (
          <select
            id="maritalStatus"
            name="maritalStatus"
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              setEditedFormData({
                ...editedFormData,
                maritalStatus: event.target.value,
              });
            }}
            className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full lg:w-[80%] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
          >
            <option value="" disabled label="Select your marital status" />
            {maritalStatusOptions.map((item: any, index: number) => (
              <option value={item} label={item} key={index} />
            ))}
          </select>
        ) : (
          preference?.maritalStatus
        )}
      </Section>

      <Section title="Disability Status">
        {isEditing ? (
          <select
            id="disabilityStatus"
            name="disabilityStatus"
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              setEditedFormData({
                ...editedFormData,
                disabilityStatus: event.target.value,
              });
            }}
            className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full lg:w-[80%] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
          >
            <option value="" disabled label="Select your disability status" />
            {disabliltyStatusOptions.map((item: any, index: number) => (
              <option value={item} label={item} key={index} />
            ))}
          </select>
        ) : (
          preference?.disabilityStatus
        )}
      </Section>

      {!isEditing && (
        <div>
          <button
            onClick={toggleEditMode}
            className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Edit
          </button>
        </div>
      )}

      {isEditing && (
        <div>
          <div className="flex justify-start space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setIsLoading(false);
              }}
              className="bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              Cancel
            </button>
            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                className={`py-2 px-4 ${isLoading ? "opacity-50 bg-green-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-700"} text-white rounded`}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[1.375rem] font-medium">
        <span>{title}</span>
      </h4>
      <div className="grid mt-4 gap-6">{children}</div>
    </div>
  );
}

function SubSection({ title, children }: any) {
  return (
    <div className="">
      <h5 className="text-[#797979] font-medium mb-1">{title}</h5>
      <div className='empty:before:content-["N/A"] flex gap-2 flex-wrap'>
        {Array.isArray(children)
          ? children.map((c) => (
              <Chip
                key={c}
                value={c}
                variant="ghost"
                size="sm"
                className="!text-xs text-[#797979] !font-normal !capitalize"
              />
            ))
          : children}
      </div>
    </div>
  );
}
