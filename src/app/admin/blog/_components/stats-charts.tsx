"use client"
import { Newspaper, Users } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
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
const chartData = [
  { month: "January", posts: 186, followers: 80 },
  { month: "February", posts: 305, followers: 200 },
  { month: "March", posts: 237, followers: 120 },
  { month: "April", posts: 73, followers: 190 },
  { month: "May", posts: 209, followers: 130 },
  { month: "June", posts: 214, followers: 140 },
]

const chartConfig = {
  desktop: {
    label: "Posts",
    color: "hsl(var(--chart-1))",
    icon: Newspaper,
  },
  mobile: {
    label: "Followers",
    color: "hsl(var(--chart-2))",
    icon: Users,
  },
} satisfies ChartConfig

import { useBlogQueries } from "@/hooks/api/admin/blog";
import { Skeleton } from "@/components/ui/skeleton";

const BlogStatChartsPage = () => {
  const { blogStatsDomain } = useBlogQueries();
  
  if (blogStatsDomain.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Area Chart - Icons</CardTitle>
        <CardDescription>
          Showing total visitors for the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="posts"
              type="natural"
              fill="var(--color-posts)"
              fillOpacity={0.4}
              stroke="var(--color-posts)"
              stackId="a"
            />
            <Area
              dataKey="followers"
              type="natural"
              fill="var(--color-followers)"
              fillOpacity={0.4}
              stroke="var(--color-followers)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default BlogStatChartsPage;