import React from 'react';
import { 
    TrendingUp, TrendingDown, Users, ShoppingCart, 
    CreditCard, Activity, Globe, ChevronRight, 
    Filter, Calendar as CalendarIcon, MoreHorizontal
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip,
    LineChart, Line, CartesianGrid
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { PageHeader } from "@/components/ui/PageHeader";

const performanceData = [
    { name: 'Completed', value: 1125, color: '#0f172a' },
    { name: 'Remaining', value: 450, color: '#e2e8f0' },
];

const earningData = [
    { name: 'Jan', value: 186 },
    { name: 'Feb', value: 305 },
    { name: 'Mar', value: 237 },
    { name: 'Apr', value: 73 },
    { name: 'May', value: 209 },
    { name: 'Jun', value: 214 },
];

const salesReportData = [
    { name: 'Mon', value: 30, value2: 20 },
    { name: 'Tue', value: 40, value2: 35 },
    { name: 'Wed', value: 35, value2: 30 },
    { name: 'Thu', value: 50, value2: 45 },
    { name: 'Fri', value: 45, value2: 40 },
    { name: 'Sat', value: 60, value2: 55 },
    { name: 'Sun', value: 55, value2: 50 },
];

const countries = [
    { name: 'United states', flag: '🇺🇸', change: '+27.4%', amount: '+$1,999.00', status: 'up' },
    { name: 'Brazil', flag: '🇧🇷', change: '+20.1%', amount: '+$39.00', status: 'up' },
    { name: 'India', flag: '🇮🇳', change: '-5%', amount: '+$299.00', status: 'down' },
    { name: 'Australia', flag: '🇦🇺', change: '+10.9%', amount: '+$99.00', status: 'up' },
    { name: 'France', flag: '🇫🇷', change: '+2.1%', amount: '+$39.00', status: 'up' },
    { name: 'Greece', flag: '🇬🇷', change: '-0.1%', amount: '+$30.00', status: 'down' },
];

export const EcommerceDashboard: React.FC<{ userName?: string }> = ({ userName = "Jack" }) => {
    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header section */}
            <PageHeader
                title={`Hi ${userName}, Welcome back 👋`}
                subtitle="CORE ANALYTICS AND PERFORMANCE METRICS"
            >
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-3 text-[12px] font-black uppercase tracking-wider border-border/50 bg-card transition-all hover:bg-muted/50">
                        <CalendarIcon size={16} className="text-muted-foreground/60" />
                        14 Mar - 10 Apr
                    </Button>
                    <Button variant="default" className="gap-3 text-[12px] font-black uppercase tracking-wider hover:scale-[1.02] transition-all">
                        <Filter size={16} />
                        Filter
                    </Button>
                </div>
            </PageHeader>

            {/* Premium Pill Tabs */}
            <div className="flex p-1.5 bg-muted/40 rounded-[24px] border border-border/40 shadow-sm w-fit -mt-4 mb-4">
                <button className="flex items-center gap-2 px-10 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-card text-foreground shadow-sm ring-1 ring-border/50">
                    Overview
                </button>
                <button className="flex items-center gap-2 px-10 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all text-muted-foreground hover:text-foreground">
                    Reports
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Total Revenue', value: '$45,231.89', change: '+20.1%', icon: CreditCard, trend: 'up', color: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' },
                    { label: 'Subscriptions', value: '+2,350', change: '+180.1%', icon: Users, trend: 'up', color: 'bg-indigo-600 text-white' },
                    { label: 'Sales', value: '+12,234', change: '+19.2%', icon: ShoppingCart, trend: 'up', color: 'bg-emerald-500 text-white' },
                    { label: 'Active Now', value: '573', change: '+201', icon: Activity, trend: 'up', color: 'bg-rose-500 text-white' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -8 }}
                        className="relative flex flex-col justify-between p-9 bg-card border border-border/40 shadow-sm rounded-[32px] min-h-[180px] cursor-pointer group transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] shadow-xl transition-transform group-hover:scale-110 ${stat.color}`}>
                                <stat.icon size={24} strokeWidth={2.5} />
                            </div>
                            <div className={`flex items-center gap-1 font-black text-[11px] ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {stat.change}
                            </div>
                        </div>

                        <div className="mt-8">
                            <p className="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase opacity-80 mb-2">
                                {stat.label}
                            </p>
                            <h4 className="text-3xl font-black tracking-tighter text-foreground">
                                {stat.value}
                            </h4>
                            <p className="text-[9px] font-bold text-muted-foreground/40 mt-3 uppercase tracking-[0.1em]">
                                vs LAST MONTH PERIOD
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Middle row details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Performance Goal */}
                <Card className="lg:col-span-3 rounded-[32px] border border-border/40 shadow-sm bg-card p-9">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Status</p>
                    <CardTitle className="text-xl font-black tracking-tight mb-8">Performance Goal</CardTitle>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={performanceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {[
                                        { color: 'var(--foreground)' },
                                        { color: 'color-mix(in srgb, var(--foreground) 10%, transparent)' }
                                    ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-black tracking-tighter text-foreground">1.1K</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">Target</span>
                        </div>
                    </div>
                    <div className="text-center mt-6">
                        <Button className="w-full font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform">
                            Full Reports
                        </Button>
                    </div>
                </Card>

                {/* Monthly Earning */}
                <Card className="lg:col-span-6 rounded-[32px] border border-border/40 shadow-sm bg-card p-9">
                    <div className="flex items-start justify-between mb-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Financials</p>
                            <CardTitle className="text-xl font-black tracking-tight text-foreground">Monthly Earning</CardTitle>
                        </div>
                        <div className="text-right">
                           <h3 className="text-3xl font-black tracking-tighter text-foreground">$32.46K</h3>
                           <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black mt-2 tracking-widest">+12.4% INCREASE</Badge>
                        </div>
                    </div>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={earningData} layout="vertical" margin={{ left: -30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--muted-foreground)', opacity: 0.6 }} />
                                <Tooltip isAnimationActive={false} cursor={{fill: 'var(--foreground)', opacity: 0.05}} contentStyle={{ borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', background: 'var(--card)', color: 'var(--foreground)', width: '180px' }} />
                                <Bar dataKey="value" fill="currentColor" className="text-slate-800 dark:text-white" radius={[0, 8, 8, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Sales by Countries */}
                <Card className="lg:col-span-3 rounded-[32px] border border-border/40 shadow-sm bg-card p-9">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Region</p>
                            <CardTitle className="text-xl font-black tracking-tight text-foreground">Global Sales</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="w-10 text-muted-foreground/60 hover:bg-muted/50">
                            <MoreHorizontal size={20} />
                        </Button>
                    </div>
                    <div className="space-y-7">
                        {countries.map((c, i) => (
                            <div key={i} className="flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center transition-transform group-hover:scale-110">
                                        <span className="text-lg">{c.flag}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-black tracking-tight text-foreground/90">{c.name}</span>
                                        <div className={`flex items-center gap-1 text-[9px] font-black tracking-widest ${c.status === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {c.status === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {c.change.replace('+', '').replace('-', '')}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[13px] font-black tracking-tighter text-foreground">{c.amount}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
                <Card className="lg:col-span-9 rounded-[32px] border border-border/40 shadow-sm bg-card p-9">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Reports</p>
                            <CardTitle className="text-xl font-black tracking-tight text-foreground">Sales Evolution</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            <Select defaultValue="monthly">
                                <SelectTrigger className="h-10 w-32 text-[10px] font-black uppercase tracking-widest border border-border/40 bg-muted/20 rounded-xl text-foreground px-4">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="border-border/40 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50">
                                Export
                            </Button>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesReportData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--muted-foreground)', opacity: 0.5 }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--muted-foreground)', opacity: 0.5 }} />
                                <Tooltip isAnimationActive={false} contentStyle={{ borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', background: 'var(--card)', color: 'var(--foreground)', width: '180px' }} />
                                <Line type="monotone" dataKey="value" stroke="var(--foreground)" strokeWidth={4} dot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--foreground)' }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="value2" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="lg:col-span-3 rounded-[32px] border border-border/40 shadow-sm bg-card p-9">
                    <div className="flex items-center justify-between mb-10">
                        <CardTitle className="text-xl font-black tracking-tight text-foreground">Overview</CardTitle>
                        <Button variant="ghost" size="icon" className="w-10 text-muted-foreground/60">
                            <MoreHorizontal size={20} />
                        </Button>
                    </div>
                    <div className="space-y-6">
                        {[
                            { label: 'Store Sales', val: '$89,585', icon: ShoppingCart, color: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' },
                            { label: 'Visits', val: '$42,455', icon: Users, color: 'bg-indigo-600 text-white' },
                            { label: 'Conversions', val: '12.4%', icon: Activity, color: 'bg-emerald-500 text-white' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-5 p-5 rounded-[24px] hover:bg-muted/30 transition-all cursor-pointer group border border-transparent hover:border-border/40">
                                <div className={`w-14 h-14 rounded-[18px] ${item.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                                    <item.icon size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
                                    <p className="text-xl font-black tracking-tighter text-foreground">{item.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" className="w-full mt-10 border-border/60 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-muted/50 transition-all">
                        Deep Dive
                    </Button>
                </Card>
            </div>
        </div>
    );
};
