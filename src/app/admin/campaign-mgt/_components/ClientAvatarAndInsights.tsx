"use client";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { User } from "lucide-react";
import React, { useEffect, useState } from "react";
import { TableDropDownSearch } from "@/components/TableRedesign/TableHeader";

// SPR-21-02-004: identity fragment only — rendered inside ClientDataTable's
// single consolidated profile card. The stat cards, the retired action
// buttons (Dispatch Preference / Credentials / Manage Job Aggregators), the
// plan-requirement notice and the card chrome are all gone; Generate Password
// moved into the card's metaline.
const ClientAvatarAndInsights: React.FC<{ clientId: string | null | number }> = ({ clientId }) => {
  const [clientList, setClientList] = useState<any[]>([]);

  const {
    campaignClientsDomain: { data: allUserData },
    singleClientDomain: { data: singleClientData, isLoading: isSingleClientLoading },
  } = useAdminQueries({
    fetchCampaignClients: true,
    fetchSingleClient: !!clientId,
    userId: String(clientId),
    clientId: String(clientId),
  });

  useEffect(() => {
    if (allUserData) {
      // Handle both direct array response and nested data format
      const clientDataArray = allUserData;

      const mapped = clientDataArray
        ?.map((data: any) => ({
          Full_Name: `${data.seekExternalCredentials?.First_Name} ${data.seekExternalCredentials?.Middle_Name} ${data.seekExternalCredentials?.Last_Name}` || `${data.seekExternalCredentials?.Full_Name}`,
          id: data.id,
          _id: data.id,
        }))
        .filter((item: any) => item.Full_Name && item.id)
        .sort((a: any, b: any) => a.Full_Name.localeCompare(b.Full_Name)) || [];

      setClientList(mapped);
    }
  }, [allUserData]);

  const nameFromCredentials = [
    singleClientData?.seekExternalCredentials?.First_Name,
    singleClientData?.seekExternalCredentials?.Middle_Name,
    singleClientData?.seekExternalCredentials?.Last_Name,
  ].filter(Boolean).join(' ');

  const clientFullName = nameFromCredentials || singleClientData?.name || "";
  const clientCraft = singleClientData?.craft || singleClientData?.seekExternalCredentials?.Craft || "";

  if (isSingleClientLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-[70px] w-[70px] shrink-0 animate-pulse rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-56 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
          <User size={34} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{clientFullName}</h1>
          <p className="mt-0.5 text-[11px] text-[#5B6B7C]">
            Client ID: {clientId}
            {clientCraft && <> · Course of Study: {clientCraft}</>}
          </p>
        </div>
      </div>
      <div className="w-full sm:w-[280px]">
        <TableDropDownSearch
          listOfDisplayValues={['All Users', ...clientList?.map((value) => value.Full_Name)]}
          listOfValues={['', ...clientList?.map((value) => String(value.id))]}
          defaultValue={clientId as string | undefined}
          onChange={(e: any) => {
            window.location.href = `/admin/campaign-mgt/client/${e.id}`;
          }}
          values={[{ Full_Name: 'All User', id: '' }, ...clientList]}
          extraStyles={{ padding: 0, margin: 0 }}
          selectWidthClassName="w-full"
          rowClassName="flex items-center text-black"
        />
      </div>
    </div>
  );
};

export default ClientAvatarAndInsights;
