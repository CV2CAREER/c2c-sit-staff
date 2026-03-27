"use client";
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";

const chartConfig = {
  commenced: {
    label: "Commenced",
    color: "hsl(var(--chart-1))",
  },
  hold: {
    label: "Hold",
    color: "hsl(var(--chart-2))",
  },
  expired: {
    label: "Expired",
    color: "hsl(var(--chart-3))",
  },
  offerNotification: {
    label: "Offer Notification",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

import { useAdminQueries } from "@/hooks/api/admin.api";

export default function OverallClientMilestoneChart() {
  const [range, setRange] = useState("this-month");
  
  const { milestoneStatsDomain } = useAdminQueries({ 
    fetchMilestoneStats: true, 
    milestonesRange: range 
  });

  const { data: chartData = [], isLoading } = milestoneStatsDomain;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-md sm:text-lg md:text-2xl">
          <h1>Overall Client Milestone</h1>
          <TimeRangeSelector styles="bg-gray-200" value={range} onChange={setRange}/>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          {isLoading ? (
            <LoadingSpinner />
          ) : chartData.length <= 0 ? ( 
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground"> 
                Nothing to see here  
            </div> ):
          (
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="commenced"
              stackId="a"
              fill="var(--color-commenced)"
              radius={[0, 0, 4, 4]}
              cursor="none"
            />
            <Bar
              dataKey="hold"
              stackId="a"
              fill="var(--color-hold)"
              radius={[0, 0, 0, 0]}
              cursor="none"
            />
            <Bar
              dataKey="expired"
              stackId="a"
              fill="var(--color-expired)"
              radius={[0, 0, 0, 0]}
              cursor="none"
            />
            <Bar
              dataKey="offerNotification"
              stackId="a"
              fill="var(--color-offerNotification)"
              radius={[4, 4, 0, 0]}
              cursor="none"
            />
          </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
