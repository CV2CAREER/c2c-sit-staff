"use client";
import { Button } from "@/components/ui/button";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { useConfirmationModal } from "@/hooks/useConfirmationModule";
import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";
import { Layers, LucideIcon, User, Bot } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AggregatorToggle from "./AggregatorToggle";
import { TableDropDownSearch } from "@/components/TableRedesign/TableHeader"

interface cardsDataProps {
  title: string;
  value: number;
  icon: {
    name: LucideIcon;
    bgColor: string;
    color: string;
  };
}

const ClientAvatarAndInsights: React.FC<{ clientId: string | null | number }> = ({ clientId }) => {
  const [applicationData, setApplicationData] = useState([0, 0, 0]);
  const [clientList, setClientList] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loaders, setLoaders] = useState({
    dpreferences: false,
    dcredentials: false,
  });

  const {
    campaignClientsDomain: { data: allUserData, isLoading: isClientsLoading },
    clientCampaignInsightsDomain: { data: clientCampaignData, isLoading },
    singleClientDomain: { data: singleClientData, isLoading: isSingleClientLoading },
  } = useAdminQueries({
    fetchCampaignClients: true,
    fetchClientCampaignInsights: !!clientId,
    fetchSingleClient: !!clientId,
    userId: String(clientId),
    clientId: String(clientId),
  });

  const {
    generatePasswordMutation,
    dispatchCredentialsMutation,
    sendPreferenceEmailMutation,
   } = useAdminMutations();

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

  // const plan = clientCampaignData?.data?.plan || null;
  const clientFullName = `${singleClientData?.seekExternalCredentials?.First_Name} ${singleClientData?.seekExternalCredentials?.Middle_Name} ${singleClientData?.seekExternalCredentials?.Last_Name}` || singleClientData?.name || clientCampaignData?.data?.name || "";
  const clientCraft = singleClientData?.seekExternalCredentials?.Craft || singleClientData?.craft || clientCampaignData?.data?.craft || "";

  useEffect(() => {
    if (clientCampaignData) {
      setApplicationData([
        clientCampaignData.data.statistics?.successfulApplications ?? 0,
        clientCampaignData.data.statistics?.failedApplications ?? 0,
        clientCampaignData.data.aggregatorCount ?? 0,
      ]);
    }
  }, [clientCampaignData]);

  async function handleGeneratePassword(userId: string) {
    try {
      toast.loading('Generating password...');
      await generatePasswordMutation.mutateAsync({ userId });
      toast.success('Password generated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate password');
    }
  }

  const handleDispatchCredentials = async (clientId: string) => {
    toast.loading("Dispatching credentials to client.");
    try {
      const res = await dispatchCredentialsMutation.mutateAsync({ clientId });
      toast.success(res.message || "Credentials dispatched successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch credentials");
    }
  };

  const handleDispatchPreferences = async (userId: string) => {
    toast.loading("Dispatching preferences...");
    try {

      await sendPreferenceEmailMutation.mutateAsync({
        userId
      });

      toast.success("Email sent successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    }
  };

   const { openConfirmationModal, ConfirmationModalComponent } = useConfirmationModal();
    
  const cardsData: cardsDataProps[] = [
    {
      title: "Successful Applications",
      value: applicationData[0],
      icon: {
        name: Layers,
        bgColor: "bg-green-200",
        color: "text-green-700",
      },
    },
    {
      title: "Failed Applications",
      value: applicationData[1],
      icon: {
        name: Layers,
        bgColor: "bg-red-200",
        color: "text-red-700",
      },
    },
    {
      title: "Active Jobsites",
      value: applicationData[2],
      icon: {
        name: Bot,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
  ];

  return (
    <main className="mt-6">
      <TableDropDownSearch
        listOfDisplayValues={['All Users', ...clientList?.map((value) => value.Full_Name)]}
        listOfValues={['', ...clientList?.map((value) => String(value.id))]}
        defaultValue={clientId as string | undefined}
        onChange={(e: any) => {
          window.location.href = `/admin/campaign-mgt/client/${e.id}`;
        }}
        values={[{ Full_Name: 'All User', id: '' }, ...clientList]}
      />

      <TimeRangeSelector styles="bg-white ml-auto mb-3" />

      <section className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        {/* Client Avatar Section */}
        <section className="w-full lg:w-[40%] bg-white flex items-center gap-5 shadow-md p-8 rounded-md">
          {isLoading ? (
            <>
              <div className="h-[70px] w-[70px] rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center items-center h-[70px] w-[70px] bg-lightblue rounded-full">
                <User size={50} className="text-blue" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mt-4">{clientFullName}</h1>
                <p className="text-sm text-gray-500">Client ID: {clientId}</p>
                <p>Craft: {clientCraft}</p>
              </div>
            </>
          )}
        </section>

        {/* Insights Cards */}
        <section className="w-full lg:w-[60%] flex flex-col gap-8 lg:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {isLoading
              ? Array(3)
                  .fill(0)
                  .map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white p-4 rounded-md shadow-md animate-pulse"
                    >
                      <div className="bg-gray-200 p-4 rounded-full w-10 h-10" />
                      <div className="space-y-2">
                        <div className="h-3 w-28 bg-gray-200 rounded" />
                        <div className="h-5 w-16 bg-gray-300 rounded" />
                      </div>
                    </div>
                  ))
              : cardsData.map((card, idx) => {
                  const LIcon = card.icon.name;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white p-4 rounded-md shadow-md"
                    >
                      <div
                        className={`${card.icon.bgColor} w-fit p-2 rounded-full`}
                      >
                        <LIcon className={card.icon.color} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          {card.title}
                        </p>
                        <h1 className="text-3xl font-bold text-gray-800">
                          {card.value}
                        </h1>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Buttons */}
          <div className="flex flex-col lg:flex-row gap-2 justify-center items-center">
            <Button className="w-full md:w-fit" 
            onClick={() => 
              openConfirmationModal({
                title: "Dispatch Preferences",
                description: "Are you sure you want to dispatch preferences?",
                onConfirm: () => handleDispatchPreferences(clientId as string),
              })
            }
            >Dispatch Preference</Button>

            <Button className="w-full md:w-fit" 
              onClick={() => 
                openConfirmationModal({
                  title: "Dispatch Preferences",
                  description: "Are you sure you want to dispatch crdentials?",
                  onConfirm: () => handleDispatchCredentials(clientId as string),
                })
              }
            >Dispatch Credentials</Button>

            <Button className="w-full md:w-fit" 
              onClick={() => 
                openConfirmationModal({
                  title: "Generate Password",
                  description: "Are you sure you want to generate password for this client?",
                  onConfirm: () => handleGeneratePassword(clientId as string),
                })
              }
            >Generate Password</Button>

            <AggregatorToggle clientId={Number(clientId as string)}/>
          </div>
        </section>
      </section>
      <ConfirmationModalComponent />

    
    </main>
  );
};

export default ClientAvatarAndInsights;
