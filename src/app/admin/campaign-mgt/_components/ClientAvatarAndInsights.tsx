"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirmationModal } from "@/hooks/useConfirmationModule";
import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";
import { Layers, LucideIcon, User, Bot, Send, KeyRound, ShieldCheck } from "lucide-react";
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
  const [applicationData, setApplicationData] = useState([0, 0, 0, 0, 0]);
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

  const profile = clientCampaignData?.data;

  const nameFromCredentials = [
    singleClientData?.seekExternalCredentials?.First_Name,
    singleClientData?.seekExternalCredentials?.Middle_Name,
    singleClientData?.seekExternalCredentials?.Last_Name,
  ].filter(Boolean).join(' ');

  const clientFullName = nameFromCredentials || singleClientData?.name || profile?.name || "";
  const clientCraft = singleClientData?.craft || singleClientData?.seekExternalCredentials?.Craft || profile?.craft || "";


  useEffect(() => {
    if (profile) {
      setApplicationData([
        profile.statistics?.successfulApplications ?? 0,
        profile.statistics?.failedApplications ?? 0,
        profile.aggregatorCount ?? 0
      ]);
    }
  }, [profile]);

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
    }
  ];

  return (
    <main className="flex flex-col gap-4">
      <section className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-stretch">
        {/* Client Avatar Section */}
        <Card className="w-full lg:w-[38%] rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
            {isLoading ? (
              <div className="flex items-center gap-4">
                <div className="h-[70px] w-[70px] rounded-full bg-gray-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex justify-center items-center h-[70px] w-[70px] shrink-0 bg-primary/10 rounded-full ring-4 ring-primary/5">
                    <User size={34} className="text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">{clientFullName}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Client ID: {clientId}</p>
                    {clientCraft && <p className="text-sm text-gray-600 mt-0.5">Craft: {clientCraft}</p>}
                  </div>
                </div>
                <div className="w-full">
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Insights Cards */}
        <section className="w-full lg:w-[62%] flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {isLoading
              ? Array(3)
                  .fill(0)
                  .map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white p-4 rounded-xl border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] animate-pulse"
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
                      className="flex items-center gap-3 bg-white p-4 rounded-xl border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
                    >
                      <div
                        className={`${card.icon.bgColor} w-fit p-2.5 rounded-full`}
                      >
                        <LIcon className={card.icon.color} size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">
                          {card.title}
                        </p>
                        <h1 className="text-2xl font-bold text-gray-900">
                          {card.value}
                        </h1>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Buttons */}
          <div className="flex flex-col lg:flex-row gap-3 justify-center items-center rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
            <Button
              variant="outline"
              className="w-full md:w-fit gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              onClick={() =>
                openConfirmationModal({
                  title: "Dispatch Preferences",
                  description: "Are you sure you want to dispatch preferences?",
                  onConfirm: () => handleDispatchPreferences(clientId as string),
                })
              }
            >
              <Send size={16} /> Dispatch Preference
            </Button>

            <Button
              variant="outline"
              className="w-full md:w-fit gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              onClick={() =>
                openConfirmationModal({
                  title: "Dispatch Preferences",
                  description: "Are you sure you want to dispatch crdentials?",
                  onConfirm: () => handleDispatchCredentials(clientId as string),
                })
              }
            >
              <ShieldCheck size={16} /> Dispatch Credentials
            </Button>

            <Button
              variant="outline"
              className="w-full md:w-fit gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              onClick={() =>
                openConfirmationModal({
                  title: "Generate Password",
                  description: "Are you sure you want to generate password for this client?",
                  onConfirm: () => handleGeneratePassword(clientId as string),
                })
              }
            >
              <KeyRound size={16} /> Generate Password
            </Button>

            <AggregatorToggle clientId={Number(clientId as string)}/>
          </div>
        </section>
      </section>
      <ConfirmationModalComponent />
    </main>
  );
};

export default ClientAvatarAndInsights;
