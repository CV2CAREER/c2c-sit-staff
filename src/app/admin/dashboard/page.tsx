"use client";
import DashboardCards from "./_components/dashboard-cards";
import OverallClientMilestoneChart from "./_components/overall-clients-milestones";
import OnboardedClientsChart from "./_components/onboarded-clients";
import JobsitesChart from "./_components/jobsites";
import VaAllocation from "./_components/va-allocation";
import InFlightClients from "./_components/inflight-clients";
import CustomDateFilter from "@/components/DateFilterComponent/CustomDateFilter";
import DashboardCardsApplication from "./_components/DashboardCardsApplication";
import ApplicationPerformanceChart from "./_components/ApplicationsChart";

export default function DashboardPage() {

  // const { data, isLoading } = useFetchData<any>(
  //   ["fetch-dashboard-performance"],
  //   "/api/admin/job-management/applications",
  //   {
  //     dataCount: true,
  //   }
  // );


  // console.log("DashboardPPerformanceData", data);
  // const successfulJobs = data?.data?.successCount || null;
  // const failedJobs = data?.data?.failedCount || null;

  return (
    <section className="flex flex-col gap-6 mt-6">
      <section className="bg-gradient-to-r from-[#0066B2] from-[-11.61%] to-[#00BFF2] to-[103.59%] flex justify-between items-center flex-wrap gap-3 w-full text-white p-3 sm:p-5 shadow-md rounded-sm">
        <div className="flex flex-col sm:flex-row  w-full justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Welcome back</h2>
            <h2 className="text-xl font-bold">Admin</h2>
          </div>
          <CustomDateFilter />
        </div>
        {/* <TimeRangeSelector styles="bg-white" /> */}
      </section>
      <DashboardCards />
      <VaAllocation />
      <InFlightClients />
      <DashboardCardsApplication />
      <ApplicationPerformanceChart />
      {/* <ApplicationPerformance
        loading={isLoading}
        successData={successfulJobs}
        failedData={failedJobs}
      /> */}
      <OverallClientMilestoneChart />
      <OnboardedClientsChart />
      <JobsitesChart />
    </section>
  );
}
