"use client"

import * as React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { Tabs, Tab } from '@heroui/tabs';
import { useAdminQueries } from "@/hooks/api/admin.api";

const margin = { right: 24 };

const ApplicationPerformanceChart = () =>  {
  const [selected, setSelected] = React.useState('six-months');

  const { applicationChartDataDomain } = useAdminQueries({
    fetchApplicationChartData: true,
    chartPeriod: selected
  });

  const { data, isLoading } = applicationChartDataDomain;

  const hasData = data && (
    ((data as any).successful && (data as any).successful.some((count: number) => count > 0)) ||
    ((data as any).failed && (data as any).failed.some((count: number) => count > 0))
  );

  if (!hasData) {
    return (
      <div className="w-full bg-white rounded-md p-4 flex gap-4 flex-col justify-between shadow h-[300px]">
        <div className="w-fit ml-auto">
          {/* Your Tabs component */}
          <Tabs
            aria-label="Options"
            color="primary"
            size="sm"
            radius="full"
            selectedKey={selected}
            onSelectionChange={(key: any) => setSelected(key.toString())}
          >
            <Tab key="last-24-hrs" title="Last 24hrs" textValue="Last 24hrs" />
            <Tab key="last-week" title="Last Week" textValue="Last Week" />
            <Tab key="last-month" title="Last Month" textValue="Last Month" />
            <Tab key="six-months" title="Six Months" textValue="Six Months" />
          </Tabs>
        </div>

        {
          isLoading ? (
            <div className="flex items-center bg-gray-300 animate-pulse justify-center h-[300px]"></div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available for this period.
            </div>
          )
        }
      </div>
    );
  }
  
  const pData = (data as any)?.successful || [];
  const uData = (data as any)?.failed || [];
  const xLabels = (data as any)?.label || [];

  return (
    <div className="w-full bg-white rounded-md p-4 flex flex-col gap-4 justify-between shadow">
      <div className="w-fit ml-auto">
        <Tabs
          aria-label="Options"
          color="primary"
          size="sm"
          radius="full"
          selectedKey={selected}
          onSelectionChange={(key) => setSelected(key.toString())}
        >
          <Tab key="last-24-hrs" title="Last 24hrs" textValue="Last 24hrs" />
          <Tab key="last-week" title="Last Week" textValue="Last Week" />
          <Tab key="last-month" title="Last Month" textValue="Last Month" />
          <Tab key="six-months" title="Six Months" textValue="Six Months" />
        </Tabs>
      </div>

      {
        isLoading ? (
          <div className="flex items-center bg-gray-300 animate-pulse justify-center h-[300px]"></div>
        ) : (
          <LineChart
            height={300}
            series={[
              { data: pData, label: 'Successful' },
              { data: uData, label: 'Failed' },
            ]}
            xAxis={[{ scaleType: 'point', data: xLabels }]}
            yAxis={[{ width: 50 }]}
            margin={margin}
          />
        )
      }

    </div>
  )
}

export default ApplicationPerformanceChart;