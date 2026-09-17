"use client";
import { Select, MenuItem } from "@mui/material";
import { useSearchParams, useRouter } from "next/navigation";
import ReactSelect from "react-select";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaSpinner } from "react-icons/fa6";
import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";

const JOBSITE_OPTIONS = [
  { value: "Select Jobsite", label: "Select Jobsite" },
  { value: "ADECCO", label: "Adecco" },
  { value: "ADECCO_STAGE", label: "Adecco Stage" },
  { value: "Adzuna", label: "Adzuna" },
  { value: "Adzuna_STAGE", label: "Adzuna Stage" },
  { value: "CareerOne", label: "CareerOne" },
  { value: "CareerOne_STAGE", label: "CareerOne Stage" },
  { value: "JOBBANK", label: "Job Bank" },
  { value: "JOBBANK_STAGE", label: "Job Bank Stage" },
  { value: "Jobserve", label: "Jobserve" },
  { value: "Jobserve_STAGE", label: "Jobserve Stage" },
  { value: "Jora", label: "Jora" },
  { value: "Jora_STAGE", label: "Jora Stage" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "MichaelPage", label: "Michael Page" },
  { value: "MichaelPage_STAGE", label: "Michael Page Stage" },
  { value: "Randstad", label: "Randstad" },
  { value: "Randstad_STAGE", label: "Randstad Stage" },
  { value: "Reed", label: "Reed" },
  { value: "Reed_STAGE", label: "Reed Stage" },
  { value: "SEEK", label: "Seek" },
  { value: "SEEK_STAGE", label: "Seek Stage" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "Select Environment", label: "Select Environment" },
  { value: "_TEST", label: "Test" },
  { value: "_LIVE", label: "Live" },
];

export default function SampleForm({
  setEnvironment,
}: {
  setEnvironment: Dispatch<SetStateAction<string>>;
}) {
  const [data, setData] = useState({
    environment: "",
    queue: "",
    email: "",
  });

  const { clientSampleUsersDomain } = useAdminQueries({
    fetchClientSampleUsers: true,
  });
  const { runClientSampleMutation } = useAdminMutations();

  const searchParams = useSearchParams();
  const router = useRouter();

  const handleSubmit = async () => {
    if (
      !data["email"] ||
      !data["environment"] ||
      !data["queue"] ||
      data["queue"] === "Select Jobsite"
    )
      return toast.error("Please complete all fields!");

    runClientSampleMutation.mutate(data, {
      onSuccess: () => {
        toast.success(
          `Email ${data["email"]} added to ${data["queue"] + data["environment"]} queue`
        );
      },
    });
  };

  useEffect(() => {
    const currentEnv = searchParams?.get("environment");
    if (data?.environment && data.environment !== currentEnv) {
      const params = new URLSearchParams(searchParams?.toString());
      params.set("environment", data.environment);
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [data.environment, searchParams, router]);

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <Select
        onChange={(e) =>
          setData((prev) => ({
            ...prev,
            queue: e.target.value,
          }))
        }
        defaultValue="Select Jobsite"
        className="w-48 h-8 bg-white text-xs md:text-sm text-gray-500"
      >
        {JOBSITE_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            className="text-gray-500"
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>

      <Select
        onChange={(e) => {
          setData((prev) => ({ ...prev, environment: e.target.value }));
          setEnvironment(e.target.value);
        }}
        defaultValue="Select Environment"
        className="w-48 h-8 bg-white text-xs md:text-sm text-gray-500"
      >
        {ENVIRONMENT_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            className="text-gray-500"
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>

      <ReactSelect
        placeholder="Select User"
        styles={{
          control: (base: any) => ({
            ...base,
            fontSize: "14px",
            lineHeight: "20px",
            borderRadius: "5px",
            width: "220px",
            "&:hover": {
              borderColor: "#38bdf8",
              boxShadow: "0px 0px 2px #E5E7EB",
            },
          }),
        }}
        isMulti={false}
        isLoading={clientSampleUsersDomain.isLoading}
        options={(clientSampleUsersDomain.data || [])
          .map((user) => ({
            value: user.Alias_Email,
            label: user.Full_Name ? `${user.Full_Name}` : user.Alias_Email,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))}
        onChange={(selectedOption) =>
          setData((prev) => ({
            ...prev,
            email: selectedOption ? (selectedOption as any).value : "",
          }))
        }
      />

      <button
        onClick={handleSubmit}
        className="bg-sky-500 px-3 max-w-max py-1 rounded-md text-white"
        disabled={runClientSampleMutation.isPending}
      >
        {!runClientSampleMutation.isPending ? (
          "Run Sample"
        ) : (
          <FaSpinner className="animate-spin" />
        )}
      </button>
    </div>
  );
}
