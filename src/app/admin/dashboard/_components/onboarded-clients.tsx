"use client"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import { useState } from "react";

const chartConfig = {
  clients: {
    label: "Clients",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

import { useAdminQueries } from "@/hooks/api/admin.api";

export default function OnboardedClientsChart() {
  const [ range, setRange ] = useState("this-month");
  
  const { onboardedClientsDomain } = useAdminQueries({ 
    fetchOnboardedClients: true, 
    onboardedRange: range 
  });

  const { data: chartData = [], isLoading } = onboardedClientsDomain;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-md sm:text-lg md:text-2xl">
          <h1>Onboarded Clients</h1>
          <TimeRangeSelector styles="bg-gray-200" value={range} onChange={setRange} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : chartData.length <= 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Nothing to see here
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" interval="preserveStartEnd" />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey="clients"
                type="natural"
                stroke="var(--color-clients)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-clients)",
                }}
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
