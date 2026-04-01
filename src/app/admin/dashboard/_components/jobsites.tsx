"use client"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import LoadingSpinner from "@/components/reusable/LoadingSpinner"
import { useAdminQueries } from "@/hooks/api/admin.api"

const chartConfig = {
  internal: {
    label: "Internal",
    color: "hsl(var(--chart-1))",
  },
  external: {
    label: "External",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function JobsitesChart() {
  const { jobsiteStatsDomain } = useAdminQueries({
    fetchJobsiteStats: true
  });

  const { data: chartData = [], isLoading } = jobsiteStatsDomain;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-md sm:text-lg md:text-2xl">Jobsites</CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
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
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={true} />
              <XAxis
                dataKey="jobsite"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="internal" fill="var(--color-internal)" radius={4} />
              <Bar dataKey="external" fill="var(--color-external)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
