"use client";
import OverallClientMilestoneChart from "./_components/overall-clients-milestones";
import OnboardedClientsChart from "./_components/onboarded-clients";
import JobsitesChart from "./_components/jobsites";
import InFlightClients from "./_components/inflight-clients";
import CustomDateFilter from "@/components/DateFilterComponent/CustomDateFilter";
import PipelineOverview from "./_components/pipeline-overview";
import ApplicationsAccountsOverview from "./_components/applications-accounts-overview";
import CoverageOverview from "./_components/coverage-overview";
import ControllerWorkload from "./_components/controller-workload";
import PipelineQueues from "./_components/pipeline-queues";

export default function DashboardPage() {

  return (
    <section className="flex flex-col gap-4 mt-4">
      <section className="bg-gradient-to-r from-[#0066B2] from-[-11.61%] to-[#00BFF2] to-[103.59%] flex justify-between items-center flex-wrap gap-3 w-full text-white p-3 sm:p-5 shadow-[0_1px_10px_rgba(0,142,211,0.10)] rounded-xl">
        <div className="flex flex-col sm:flex-row  w-full justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Welcome back</h2>
            <h2 className="text-xl font-bold">Admin</h2>
          </div>
          <CustomDateFilter />
        </div>
        {/* <TimeRangeSelector styles="bg-white" /> */}
      </section>
      <PipelineOverview />
      <ApplicationsAccountsOverview />
      <CoverageOverview />
      <ControllerWorkload />
      <PipelineQueues />
      <InFlightClients />
      <OverallClientMilestoneChart />
      <OnboardedClientsChart />
      <JobsitesChart />
    </section>
  );
}
