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
import { UserCheck } from "lucide-react";

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
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex justify-between items-center text-md sm:text-lg md:text-2xl">
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCheck size={18} />
            </span>
            Onboarded Clients
          </span>
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
