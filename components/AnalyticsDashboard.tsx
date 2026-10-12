'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, CartesianGrid, XAxis, LabelList } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// --- DATA SETS ---

const areaData = [
  { month: 'Jan', desktop: 342, mobile: 245 },
  { month: 'Feb', desktop: 876, mobile: 654 },
  { month: 'Mar', desktop: 512, mobile: 387 },
  { month: 'Apr', desktop: 629, mobile: 521 },
  { month: 'May', desktop: 458, mobile: 412 },
  { month: 'Jun', desktop: 781, mobile: 598 },
  { month: 'Jul', desktop: 394, mobile: 312 },
  { month: 'Aug', desktop: 925, mobile: 743 },
  { month: 'Sep', desktop: 647, mobile: 489 },
  { month: 'Oct', desktop: 532, mobile: 476 },
  { month: 'Nov', desktop: 803, mobile: 687 },
  { month: 'Dec', desktop: 271, mobile: 198 }
];

const barData = [
  { month: 'January', desktop: 186, mobile: 80 },
  { month: 'February', desktop: 305, mobile: 200 },
  { month: 'March', desktop: 237, mobile: 120 },
  { month: 'April', desktop: 73, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'June', desktop: 214, mobile: 140 }
];

const pieData = [
  { browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
  { browser: 'safari', visitors: 200, fill: 'var(--color-safari)' },
  { browser: 'firefox', visitors: 187, fill: 'var(--color-firefox)' },
  { browser: 'edge', visitors: 173, fill: 'var(--color-edge)' },
  { browser: 'other', visitors: 90, fill: 'var(--color-other)' }
];

const salesData = [
  { name: 'Olivia Martin', email: 'olivia.martin@email.com', avatar: 'https://api.slingacademy.com/public/sample-users/1.png', fallback: 'OM', amount: '+$1,999.00' },
  { name: 'Jackson Lee', email: 'jackson.lee@email.com', avatar: 'https://api.slingacademy.com/public/sample-users/2.png', fallback: 'JL', amount: '+$39.00' },
  { name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com', avatar: 'https://api.slingacademy.com/public/sample-users/3.png', fallback: 'IN', amount: '+$299.00' },
  { name: 'William Kim', email: 'will@email.com', avatar: 'https://api.slingacademy.com/public/sample-users/4.png', fallback: 'WK', amount: '+$99.00' },
  { name: 'Sofia Davis', email: 'sofia.davis@email.com', avatar: 'https://api.slingacademy.com/public/sample-users/5.png', fallback: 'SD', amount: '+$39.00' }
];

// --- CHART CONFIGURATIONS ---

const chartConfigArea = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', color: 'var(--chart-2)' }
} satisfies ChartConfig;

const chartConfigPie = {
  visitors: { label: 'Visitors' },
  chrome: { label: 'Chrome', color: 'var(--chart-1)' },
  safari: { label: 'Safari', color: 'var(--chart-2)' },
  firefox: { label: 'Firefox', color: 'var(--chart-3)' },
  edge: { label: 'Edge', color: 'var(--chart-4)' },
  other: { label: 'Other', color: 'var(--chart-5)' }
} satisfies ChartConfig;

// --- CHART COMPONENTS ---

function AnalyticsAreaGraph() {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Traffic Sources</span>
          <Badge variant='outline' className="rounded-full shadow-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
            +18.2%
          </Badge>
        </CardTitle>
        <CardDescription>Desktop vs Mobile visitors for the year</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfigArea} className="min-h-[250px] w-full mt-4">
          <AreaChart accessibilityLayer data={areaData} margin={{ left: -20, right: 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} className="text-xs text-zinc-500" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area dataKey="mobile" type="monotone" fill="var(--color-mobile)" fillOpacity={0.1} stroke="var(--color-mobile)" strokeWidth={2} stackId="a" />
            <Area dataKey="desktop" type="monotone" fill="var(--color-desktop)" fillOpacity={0.2} stroke="var(--color-desktop)" strokeWidth={2} stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function AnalyticsBarGraph() {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Revenue Growth</span>
          <Badge variant='outline' className="rounded-full shadow-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
            -2.4%
          </Badge>
        </CardTitle>
        <CardDescription>Monthly revenue breakdown (Jan - Jun)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfigArea} className="min-h-[250px] w-full mt-4">
          <BarChart accessibilityLayer data={barData} margin={{ left: -20, right: 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} className="text-xs text-zinc-500" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function AnalyticsPieGraph() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="items-center pb-0">
        <CardTitle className="flex items-center justify-between w-full">
          <span>Browser Usage</span>
          <Badge variant='outline' className="rounded-full shadow-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
            +5.2%
          </Badge>
        </CardTitle>
        <CardDescription className="w-full text-left">Visitor demographics by browser</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center pb-0 mt-4">
        <ChartContainer config={chartConfigPie} className="mx-auto aspect-square w-full max-w-[250px] pb-4">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="visitors" hideLabel />} />
            <Pie data={pieData} innerRadius={60} dataKey="visitors" radius={10} cornerRadius={5} paddingAngle={2} stroke="none">
              <LabelList dataKey="visitors" stroke="none" fontSize={11} fontWeight={600} fill="#ffffff" formatter={(value: number) => value.toString()} />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function AnalyticsRecentSales() {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Recent Conversions</CardTitle>
        <CardDescription>You had 265 recent transactions today.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 lg:space-y-7 mt-2">
          {salesData.map((sale, index) => (
            <div key={index} className="flex items-center">
              <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <AvatarImage src={sale.avatar} alt="Avatar" />
                <AvatarFallback className="font-semibold text-xs tracking-wider">{sale.fallback}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1 overflow-hidden">
                <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-50">{sale.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{sale.email}</p>
              </div>
              <div className="ml-auto font-bold tabular-nums text-sm bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">
                {sale.amount}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- MAIN DASHBOARD COMPONENT ---

export default function AnalyticsDashboard() {
  return (
    <div className="flex flex-1 flex-col space-y-6 p-4 md:p-8 pt-6 w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 drop-shadow-sm flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
              <Activity className="h-6 w-6" />
            </div>
            Analytics Command Center
          </h2>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 ml-[52px]">
            Real-time performance metrics and user acquisition data.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        {/* Modern Pill-Shaped Tabs */}
        <div className="mb-6 flex overflow-x-auto pb-2 scrollbar-none">
          <TabsList className="h-auto p-1 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full shadow-inner border border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
            <TabsTrigger 
              value="overview" 
              className="rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-sm"
            >
              System Overview
            </TabsTrigger>
            <TabsTrigger 
              value="audience" 
              className="rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-sm"
            >
              Audience Info
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              disabled
              className="rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-[0.08em] opacity-50"
            >
              Export Reports (Pro)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 mt-0">
          
          {/* KPI Widget Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md dark:bg-zinc-900/50 backdrop-blur-xl border-zinc-200/60 dark:border-zinc-800/60 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Revenue</CardTitle>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-2">
                <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">$45,231.89</div>
                <div className="flex items-center mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2.5 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +20.1% from last month
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md dark:bg-zinc-900/50 backdrop-blur-xl border-zinc-200/60 dark:border-zinc-800/60 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Active Users</CardTitle>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-2">
                <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">+2,350</div>
                <div className="flex items-center mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 w-fit px-2.5 py-1 rounded-full border border-blue-200/50 dark:border-blue-800/50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +180.1% from last month
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md dark:bg-zinc-900/50 backdrop-blur-xl border-zinc-200/60 dark:border-zinc-800/60 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Sales</CardTitle>
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-2">
                <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">+12,234</div>
                <div className="flex items-center mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 w-fit px-2.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +19% from last month
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden transition-all duration-300 hover:shadow-md dark:bg-zinc-900/50 backdrop-blur-xl border-zinc-200/60 dark:border-zinc-800/60 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Active Now</CardTitle>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full border border-orange-200/50 dark:border-orange-800/50">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-2">
                <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">+573</div>
                <div className="flex items-center mt-3 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 w-fit px-2.5 py-1 rounded-full border border-orange-200/50 dark:border-orange-800/50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +201 since last hour
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="col-span-1 lg:col-span-4">
              <AnalyticsAreaGraph />
            </div>
            <div className="col-span-1 lg:col-span-3">
              <AnalyticsRecentSales />
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="col-span-1 lg:col-span-4">
              <AnalyticsBarGraph />
            </div>
            <div className="col-span-1 lg:col-span-3">
              <AnalyticsPieGraph />
            </div>
          </div>

        </TabsContent>
        
        <TabsContent value="audience" className="p-8 text-center text-zinc-500 dark:text-zinc-400 h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] mt-6">
          <Users className="w-12 h-12 mb-4 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Audience Demographics Locked</h3>
          <p className="max-w-[400px]">Detailed demographic charts, geographic mapping, and advanced audience tracking will appear here.</p>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
