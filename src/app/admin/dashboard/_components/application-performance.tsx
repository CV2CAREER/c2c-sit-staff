/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState, useEffect } from "react";
import ApplicationStats from "./ApplictionStats";
import { range } from "lodash";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import DropDownFilter from "./DropDownFilter";
import Graph from "@/components/Graph/Graph";

const filterOptions = [
  {
    id: 1,
    label: "Last 24hrs",
    value: "last-24-hrs",
  },
  {
    id: 2,
    label: "Last Week",
    value: "last-week",
  },
  {
    id: 3,
    label: "Last Month",
    value: "last-month",
  },
  {
    id: 4,
    label: "Six Months",
    value: "six-months",
  },
];
interface IApplicationPerformanceProps {
  loading?: boolean;
  successData: number;
  failedData: number;
}

const ApplicationPerformance = ({
  loading = false,
  successData,
  failedData,
}: IApplicationPerformanceProps) => {
  // const [loading, setLoading] = useState<boolean>(false);
  // const [totalUsers, setTotalUsers] = useState(0);
  const [successGraphData, setSuccessGraphData] = useState<
    Array<{ date: string; total: number }>
  >([]);
  const [failedGraphData, setFailedGraphData] = useState<
    Array<{ date: string; total: number }>
  >([]);
  // const [totalapplications, setTotalApplications] = useState(0);
  const [totalFailed, setTotalFailed] = useState(null);
  // const [failedJobs, setFailedJobs] = useState([]);
  const [successfulJobs, setSuccessfulJobs] = useState([]);
  const [totalSuccessful, setTotalSuccessful] = useState(0);
  // const [aggData, setAggData] = useState([]);
  const [time, setTime] = useState<string>(filterOptions[0].label);
  const [user, setUser] = useState("No Client Selected");
  const [isActiveUser, setIsActiveUser] = useState<boolean>(false);

  const countByNow = (data: any) => {
    const failed7Days = [];
    const past7Days = (() => {
      const dates = [];
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate());
      const formattedDate = pastDate.toLocaleDateString().replace(/\//g, "-"); // Format adjustment
      dates.push(formattedDate);
      return dates;
    })();

    for (const d of past7Days) {
      if (Array.isArray(data)) {
        for (const x of data) {
          const [month, day, year] = x.date.split("-").map(Number);
          const formattedDate = `${month}-${day}-${year}`;
          if (formattedDate == d) {
            failed7Days.push(x.total);
          }
        }
      }
    }
    const total = failed7Days.reduce((acc, curr) => acc + curr, 0);

    return total;
  };

  const countByDate = (data: any) => {
    const failed7Days = [];
    const past7Days = (() => {
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        const formattedDate = pastDate.toLocaleDateString().replace(/\//g, "-"); // Format adjustment
        dates.push(formattedDate);
      }
      return dates;
    })();

    for (const d of past7Days) {
      if (Array.isArray(data)) {
        for (const x of data) {
          const [month, day, year] = x.date.split("-").map(Number);
          const formattedDate = `${month}-${day}-${year}`;
          if (formattedDate == d) {
            failed7Days.push(x.total);
          }
        }
      }
    }
    const total = failed7Days.reduce((acc, curr) => acc + curr, 0);

    return total;
  };

  const countByMonth = (data: any) => {
    const failed7Days = [];
    const past7Days = (() => {
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        const formattedDate = pastDate.toLocaleDateString().replace(/\//g, "-"); // Format adjustment
        dates.push(formattedDate);
      }
      return dates;
    })();

    for (const d of past7Days) {
      if (Array.isArray(data)) {
        for (const x of data) {
          const [month, day, year] = x.date.split("-").map(Number);
          const formattedDate = `${month}-${day}-${year}`;
          if (formattedDate == d) {
            failed7Days.push(x.total);
          }
        }
      }
    }
    const total = failed7Days.reduce((acc, curr) => acc + curr, 0);

    return total;
  };

  const countBy6Months = (data: any) => {
    const failed7Days = [];
    const past7Days = (() => {
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 6 * 30; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        const formattedDate = pastDate.toLocaleDateString().replace(/\//g, "-"); // Format adjustment
        dates.push(formattedDate);
      }
      return dates;
    })();

    for (const d of past7Days) {
      if (Array.isArray(data)) {
        for (const x of data) {
          const [month, day, year] = x.date.split("-").map(Number);
          const formattedDate = `${month}-${day}-${year}`;
          if (formattedDate == d) {
            failed7Days.push(x.total);
          }
        }
      }
    }
    const total = failed7Days.reduce((acc, curr) => acc + curr, 0);

    return total;
  };

  // Helper function to parse the date string
  const parseDate = (dateStr: {
    split: (arg0: string) => {
      (): any;
      new (): any;
      map: { (arg0: NumberConstructor): [any, any, any]; new (): any };
    };
  }) => {
    const [month, day, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper function to filter data by a given date range
  const filterByDateRange = (
    data: any[],
    startDate: number | Date,
    endDate: number | Date
  ) => {
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .filter((item: { date: any }) => {
        const itemDate = parseDate(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      })
      .map((item: { date: any; total: any }) => ({
        date: item.date,
        total: item.total,
      }));
  };

  // Function to filter data for the last 24 hours
  const getLast24HoursData = (data: any) => {
    const today = new Date();
    const oneDayAgo = new Date(new Date().setDate(today.getDate() - 1));
    return filterByDateRange(data, oneDayAgo, today);
  };

  // Function to filter data for the last 7 days
  const getLast7DaysData = (data: any) => {
    const today = new Date();
    const sevenDaysAgo = new Date(new Date().setDate(today.getDate() - 7));
    return filterByDateRange(data, sevenDaysAgo, today);
  };

  // Function to filter data for the last month
  const getLastMonthData = (data: any) => {
    const today = new Date();
    const oneMonthAgo = new Date(new Date().setMonth(today.getMonth() - 1));
    return filterByDateRange(data, oneMonthAgo, today);
  };

  // Function to filter data for the last 6 months
  const getLast6MonthsData = (data: any) => {
    const today = new Date();
    const sixMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 6));
    return filterByDateRange(data, sixMonthsAgo, today);
  };

  useEffect(() => {
    // Set 24hr report
    const failedNow = countByNow(failedData);
    const successNow = countByNow(successData);

    setTotalSuccessful(successNow);
    setTotalFailed(failedNow);
  }, [loading, isActiveUser, successfulJobs]);

  useEffect(() => {
    // On time change get the report based on time range
    if (failedData && successData) {
      if (time === "last-24-hrs") {
        const failedNow = countByNow(failedData);
        const successNow = countByNow(successData);
        const filteredSuccessNow = getLast24HoursData(successData);
        const filteredFailedNow = getLast24HoursData(failedData);

        setTotalSuccessful(successNow);
        setTotalFailed(failedNow);
        setSuccessGraphData(filteredSuccessNow);
        setFailedGraphData(filteredFailedNow);
      } else if (time === "last-week") {
        const failedWeek = countByDate(failedData);
        const successWeek = countByDate(successData);

        const filteredSuccessWeek = getLast7DaysData(successData);
        const filteredFailedWeek = getLast7DaysData(failedData);

        setTotalSuccessful(successWeek);
        setTotalFailed(failedWeek);

        setSuccessGraphData(filteredSuccessWeek);
        setFailedGraphData(filteredFailedWeek);
      } else if (time === "last-month") {
        const failedMonth = countByMonth(failedData);
        const successMonth = countByMonth(successData);

        const filteredSuccessMonth = getLastMonthData(successData);
        const filteredFailedMonth = getLastMonthData(failedData);

        setTotalSuccessful(successMonth);
        setTotalFailed(failedMonth);

        setSuccessGraphData(filteredSuccessMonth);
        setFailedGraphData(filteredFailedMonth);
      } else if (time === "six-months") {
        const failed6Month = countBy6Months(failedData);
        const success6Month = countBy6Months(successData);

        const filteredSuccess6Month = getLast6MonthsData(successData);
        const filteredFailed6Month = getLast6MonthsData(failedData);

        setTotalSuccessful(success6Month);
        setTotalFailed(failed6Month);

        setSuccessGraphData(filteredSuccess6Month);
        setFailedGraphData(filteredFailed6Month);
      }
    }
  }, [time, loading]);


  const handleSeleted = () => {
    setUser("No Client Selected");
    setIsActiveUser(false);
  };

  return (
    <div className="mt-6 w-full p-4 rounded-3xl bg-white sm:mr-4">
      <h2 className="text-xl font-bold mb-4">Applications Performance</h2>

      {loading ? (
        <div className="flex flex-wrap justify-between">
          {range(2).map((data, index) => (
            <div
              key={index}
              className="border rounded-md p-4 max-w-sm w-full mx-auto"
            >
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-2 bg-gray-300"></div>
                <div className="h-[28px]"></div>
                <div className="h-24 bg-gray-300 w-28"></div>
              </div>
            </div>
            // old loader
            // <div
            //   key={index}
            //   className="flex flex-col relative p-6 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] h-[152px] rounded-2xl bg-gray-300 animate-pulse mb-4 sm:mb-0"
            // >
            //   <h3 className="text-career-gray-200 font-medium text-sm sm:text-base lg:text-lg w-24 h-8 animate-pulse bg-gray-100 rounded-md mb-4" />
            //   <p className="absolute bottom-0 text-xs sm:text-sm lg:text-base font-medium text-career-black-200 w-16 rounded-md h-6 animate-pulse bg-gray-100" />
            // </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col items-start md:flex-row md:items-center md:justify-between mb-7 sm:mb-0">
            <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-x-8">
              <Dropdown>
                <DropdownTrigger className="bg-gray-300 rounded-lg px-2 py-1">
                  <button className="flex items-center gap-2">
                    <span>{time}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06 0L10 10.44l3.71-3.23a.75.75 0 111.06 1.06l-4.25 3.5a.75.75 0 01-1.06 0l-4.25-3.5a.75.75 0 010-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </DropdownTrigger>
                <DropdownMenu className="bg-white">
                  {filterOptions.map((option) => (
                    <DropdownItem
                      key={option.id}
                      onClick={() => setTime(option.value)}
                    >
                      {option.label}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>

              <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center">
                <h2 className="text-base md:text-lg">Client: {user}</h2>
                <p
                  className={`text-base md:text-lg hover:cursor-pointer ${
                    isActiveUser ? "flex" : "hidden"
                  }`}
                  onClick={() => handleSeleted()}
                >
                  x
                </p>
              </div>
              <DropDownFilter
                isUser={isActiveUser}
                activeUser={setIsActiveUser}
                updateUser={setUser}
                user={user}
              />
            </div>
          </div>

          <ApplicationStats
            statisticsData={[
              {
                id: 2,
                label: "Failed Applications",
                value: failedData,
              },
              {
                id: 3,
                label: "Successful Applications",
                value: successData,
              },
            ]}
            loading={loading}
          />
          <Graph successData={successGraphData} failedData={failedGraphData} />
        </>
      )}
    </div>
  );
};

export default ApplicationPerformance;
