"use client";
import React from "react"; 
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader/PageHeader";
import Toggle from "@/components/Elements/Toggle";
import SlackIdManager from "./_components/SlackUser";
import AggregatorListingWrapper from "./_components/AggregatorListingWrapper";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";

const ControlPanelPage = () => {
  const { 
    aggregatorsDomain, 
    resourcesDomain
  } = useAdminQueries({
    fetchAggregators: true,
    fetchResources: true,
    resourceType: 'CRON_JOB_THROTTLE_MODE'
  });

  const { updateResourceMutation } = useAdminMutations();

  const reminderMode = resourcesDomain.data?.data?.value === 'GP';

  const handleEmailReminderToggle = async (value: boolean) => {
    try {
      await updateResourceMutation.mutateAsync({
        resourceName: 'CRON_JOB_THROTTLE_MODE',
        value: value ? 'GP' : 'AP',
      });
      toast.success('Updated successfully!');
    } catch {
      toast.error('Could not update!');
    }
  };

  return (
    <section className="mt-6 mb-12">
      <PageHeader title='Jobsite Management'/>
      
      <AggregatorListingWrapper
        loading={aggregatorsDomain.isLoading}
        data={aggregatorsDomain.data || []}
      />

      <SlackIdManager loading={aggregatorsDomain.isLoading} queue={"CSM"} title={"C and S"} />
      <SlackIdManager loading={aggregatorsDomain.isLoading} queue={"DEVOPS"} title={"Digital Traceability Log"}/>
      <SlackIdManager loading={aggregatorsDomain.isLoading} queue={"WALLET"} title={"Wallet"}/>
      <SlackIdManager loading={aggregatorsDomain.isLoading} queue={"SLACK_USERS"} title={"Aggregator"}/>

      <div className="w-full bg-white p-6 rounded-2xl mt-6">
        <div className="flex flex-col items-center justify-between">
          <h3 className="text-24 !font-medium font-sharp-grotesk text-career-black-200 mb-4">
            Email Reminder Mode
          </h3>
          <div className="w-full space-x-2 flex flex-row items-center">
            <span className="">AP</span>
            <Toggle
              isLoading={updateResourceMutation.isPending}
              callback={(value: boolean) => {
                if (value !== reminderMode) {
                  handleEmailReminderToggle(value);
                }
              }}
              initial={reminderMode}
            />
            
            <span className="">GP</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ControlPanelPage;
