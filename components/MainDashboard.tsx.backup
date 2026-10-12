'use client';

import React, { useState, useEffect } from 'react';
import ShoppingCart from '@spectrum-icons/workflow/ShoppingCart';
import Refresh from '@spectrum-icons/workflow/Refresh';
import Box from '@spectrum-icons/workflow/Box';
import Flashlight from '@spectrum-icons/workflow/Flashlight';
import Checklist from '@spectrum-icons/workflow/TaskList';
import Help from '@spectrum-icons/workflow/Help';
import ChevronRight from '@spectrum-icons/workflow/ChevronRight';
import AlertCircle from '@spectrum-icons/workflow/AlertCircle';
import Clock from '@spectrum-icons/workflow/Clock';
import GraphTrend from '@spectrum-icons/workflow/GraphTrend';
import Activity from '@spectrum-icons/workflow/History';
import Shield from '@spectrum-icons/workflow/Shield';
import GraphPie from '@spectrum-icons/workflow/GraphPie';
import GraphBarVertical from '@spectrum-icons/workflow/GraphBarVertical';
import ViewGrid from '@spectrum-icons/workflow/ViewGrid';
import Target from '@spectrum-icons/workflow/Target';
import ArrowUpRight from '@spectrum-icons/workflow/ArrowUpRight';
import CheckmarkCircle from '@spectrum-icons/workflow/CheckmarkCircle';
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
    ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, PieChart as RePieChart, Pie
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { ActivityLog, PortStatus, Announcement, UserAccount } from '../types';
import { StatCard } from './StatCard';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { twMerge } from "tailwind-merge";

// --- Types ---

interface VendorStat {
    name: string;
    total: number;
    transactionCount: number;
}

interface DashboardStats {
    totalAssets: number;
    activeAssets: number;
    openTickets: number;
    resolvedTickets: number;
    plannedTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    pendingPurchases: number;
    activePorts: number;
    totalPorts: number;
    errorPorts: number;
    totalUsers: number;
    totalDepts: number;
    pendingBudget: number;
    approvedBudget: number;
    totalPaidSpend: number;
    monthlyPaidSpend: number;
    activeLoans: number;
    overdueLoans: number;
    recentActivities: ActivityLog[];
    assetCategories: Record<string, number>;
    deptSpending: Record<string, number>;
    assetStatuses: {
        operational: number;
        maintenance: number;
        retired: number;
    };
    personalTasks: any[];
    upcomingLoans: any[];
    activeAnnouncements: Announcement[];
    vendors: VendorStat[];
    purchaseCategoryData: { name: string; value: number }[];
    budgetUtilization: {
        total: number;
        paid: number;
        utilizationRate: number;
    };
    ticketChartData?: { name: string; count: number }[];
    assetCategoryPieData?: { name: string; value: number }[];
    itUnitsCount?: number;
    gaUnitsCount?: number;
}

interface MainDashboardProps {
    onNavigate: (view: string) => void;
    userName?: string;
    userRole?: string;
    currentUser?: UserAccount | null;
}

// --- Helper Components ---

const PriorityItem = ({ title, count, type, onClick }: any) => (
    <div onClick={onClick} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border shadow-sm hover:border-primary/30 transition-all cursor-pointer group">
        <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${type === 'critical' ? 'bg-destructive/10 text-destructive' :
                type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-muted text-muted-foreground'
                }`}>
                {type === 'critical' ? <AlertCircle size="S" /> : type === 'warning' ? <Clock size="S" /> : <Checklist size="S" />}
            </div>
            <div>
                <h2 className="font-semibold text-foreground text-sm">{title}</h2>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">Attention required</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{count}</span>
            <span className="text-muted-foreground group-hover:text-primary transition-all">
                <ChevronRight size="XS" />
            </span>
        </div>
    </div>
);

const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

// --- Dashboard Modes ---
type DashboardMode = 'personal' | 'organization';

// --- Main Component ---

export const MainDashboard: React.FC<MainDashboardProps> = ({ onNavigate, userName, userRole = 'User', currentUser }) => {
    const [isLoading, setIsLoading] = useState(true);
    const effectiveRole = (currentUser?.role || userRole || '').toLowerCase();
    const isAdmin = effectiveRole === 'admin' || effectiveRole === 'super admin' || effectiveRole === 'staff';
    const [activeMode, setActiveMode] = useState<DashboardMode>(isAdmin ? 'organization' : 'personal');
    const [stats, setStats] = useState<DashboardStats>({
        totalAssets: 0, activeAssets: 0,
        openTickets: 0, resolvedTickets: 0,
        plannedTasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0,
        pendingPurchases: 0, activePorts: 0, totalPorts: 0, errorPorts: 0,
        totalUsers: 0, totalDepts: 0,
        pendingBudget: 0, approvedBudget: 0, totalPaidSpend: 0, monthlyPaidSpend: 0,
        activeLoans: 0, overdueLoans: 0,
        recentActivities: [],
        assetCategories: {},
        deptSpending: {},
        assetStatuses: { operational: 0, maintenance: 0, retired: 0 },
        personalTasks: [], upcomingLoans: [], activeAnnouncements: [],
        vendors: [],
        purchaseCategoryData: [],
        budgetUtilization: { total: 0, paid: 0, utilizationRate: 0 },
        ticketChartData: [],
        assetCategoryPieData: [],
        itUnitsCount: 0,
        gaUnitsCount: 0
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
                { data: assets },
                { count: openTickets },
                { count: resolvedTickets },
                { data: tasks },
                { data: ports },
                { data: purchases },
                { data: purchaseRecords },
                { data: allTickets },
                { count: userCount },
                { count: deptCount },
                { count: activeLoans },
                { data: activities },
                { data: pTasks },
                { data: loans },
                { data: announcements },
                { count: totalOverdueLoans }
            ] = await Promise.all([
                supabase.from('it_assets').select('status, category'),
                isAdmin ? supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open') : supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open').eq('requester_email', currentUser?.email),
                isAdmin ? supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).in('status', ['Resolved', 'Closed']) : supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).in('status', ['Resolved', 'Closed']).eq('requester_email', currentUser?.email),
                supabase.from('weekly_plans').select('status'),
                supabase.from('switch_ports').select('status'),
                supabase.from('purchase_plans').select('status, total_price'),
                supabase.from('purchase_records').select('total_va, purchase_date, status, department'),
                isAdmin ? supabase.from('helpdesk_tickets').select('priority, status') : supabase.from('helpdesk_tickets').select('priority, status').eq('requester_email', currentUser?.email),
                supabase.from('user_accounts').select('*', { count: 'exact', head: true }),
                supabase.from('departments').select('*', { count: 'exact', head: true }),
                supabase.from('it_asset_loans').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
                supabase.from('activity_logs').select('*').order('id', { ascending: false }).limit(5),
                supabase.from('weekly_plans').select('*').eq('assignee', userName || 'IT Support').neq('status', 'Done').order('due_date', { ascending: true }).limit(5),
                supabase.from('it_asset_loans').select('*, it_assets(item_name)').eq('status', 'Active').order('expected_return_date', { ascending: true }).limit(5),
                supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }),
                supabase.from('it_asset_loans').select('*', { count: 'exact', head: true }).neq('status', 'Returned').lt('expected_return_date', new Date().toISOString())
            ]);

            // Process Data
            const overdueLoans = totalOverdueLoans || 0;

            const deptSpending = (purchaseRecords || []).filter((r: any) => r.status === 'Paid').reduce((acc: any, curr: any) => {
                const dept = curr.department || 'General';
                acc[dept] = (acc[dept] || 0) + (curr.total_va || 0);
                return acc;
            }, {} as Record<string, number>);

            const activePortsCount = ports?.filter((p: any) => p.status === PortStatus.ACTIVE).length || 0;
            const errorPortsCount = ports?.filter((p: any) => p.status === PortStatus.ERROR).length || 0;

            const vendors = (purchaseRecords || []).filter((r: any) => r.status === 'Paid').reduce((acc: any, curr: any) => {
                const vendorName = curr.vendor || 'Unknown';
                if (!acc[vendorName]) {
                    acc[vendorName] = { name: vendorName, total: 0, transactionCount: 0 };
                }
                acc[vendorName].total += (curr.total_va || 0);
                acc[vendorName].transactionCount += 1;
                return acc;
            }, {} as Record<string, VendorStat>);

            const vendorList = (Object.values(vendors) as VendorStat[]).sort((a, b) => b.total - a.total);

            const pendingBudget = purchases?.filter(p => p.status.includes('Pending')).reduce((sum, p) => sum + (p.total_price || 0), 0) || 0;

            const assetStatuses = {
                operational: assets?.filter((a: any) => ['Active', 'Used', 'Deployed'].includes(a.status)).length || 0,
                maintenance: assets?.filter((a: any) => ['Repair', 'Maintenance'].includes(a.status)).length || 0,
                retired: assets?.filter((a: any) => ['Broken', 'Disposed', 'Sold', 'Lost'].includes(a.status)).length || 0,
            };

            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyPaidSpend = (purchaseRecords || [])
                .filter((r: any) => {
                    if (r.status !== 'Paid' || !r.purchase_date) return false;
                    const d = new Date(r.purchase_date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })
                .reduce((sum, r) => sum + (Number(r.total_va) || 0), 0);

            const openTicketsCount = allTickets?.filter((t: any) => t.status === 'Open').length || 0;
            const wipTicketsCount = allTickets?.filter((t: any) => t.status === 'In Progress').length || 0;
            const resolvedTicketsCount = allTickets?.filter((t: any) => ['Resolved', 'Closed'].includes(t.status)).length || 0;
            const ticketChartData = [
                { name: 'Open', count: openTicketsCount },
                { name: 'WIP', count: wipTicketsCount },
                { name: 'Resolved', count: resolvedTicketsCount }
            ];

            const assetCategories = (assets || []).reduce((acc: any, curr: any) => {
                const cat = curr.category || 'Other';
                acc[cat] = (acc[cat] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const assetCategoryPieData = Object.entries(assetCategories)
                .map(([name, value]) => ({ name, value: value as number }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 4);

            const itUnitsCount = assets?.filter((a: any) => 
                ['laptop', 'desktop', 'server', 'network', 'switch', 'hardware', 'printer', 'ups', 'monitor', 'accessories'].some(cat => 
                    (a.category || '').toLowerCase().includes(cat)
                )
            ).length || 0;
            const gaUnitsCount = (assets?.length || 0) - itUnitsCount;

            setStats({
                totalAssets: assets?.length || 0,
                activeAssets: assetStatuses.operational,
                openTickets: openTickets || 0,
                resolvedTickets: resolvedTickets || 0,
                plannedTasks: tasks?.length || 0,
                completedTasks: tasks?.filter((t: any) => t.status === 'Done').length || 0,
                inProgressTasks: tasks?.filter((t: any) => t.status === 'In Progress').length || 0,
                todoTasks: tasks?.filter((t: any) => t.status === 'To Do' || t.status === 'Pending').length || 0,
                pendingPurchases: purchases?.filter(p => p.status.includes('Pending')).length || 0,
                activePorts: activePortsCount,
                totalPorts: ports?.length || 0,
                errorPorts: errorPortsCount,
                totalUsers: userCount || 0,
                totalDepts: deptCount || 0,
                pendingBudget,
                approvedBudget: purchases?.filter(p => p.status === 'Approved').reduce((sum, p) => sum + (p.total_price || 0), 0) || 0,
                totalPaidSpend: purchaseRecords?.filter((r: any) => r.status === 'Paid').reduce((sum, r) => sum + (r.total_va || 0), 0) || 0,
                monthlyPaidSpend,
                activeLoans: activeLoans || 0,
                overdueLoans,
                recentActivities: (activities || []).map((a: any) => ({ ...a, activityName: a.activity_name, itPersonnel: a.it_personnel, createdAt: a.created_at })),
                assetCategories,
                deptSpending,
                assetStatuses,
                personalTasks: pTasks || [],
                upcomingLoans: loans || [],
                activeAnnouncements: announcements || [],
                vendors: vendorList,
                purchaseCategoryData: Object.entries((purchaseRecords || []).filter((r: any) => r.status === 'Paid').reduce((acc: any, curr: any) => {
                    const cat = curr.category || 'Other';
                    acc[cat] = (acc[cat] || 0) + (curr.total_va || 0);
                    return acc;
                }, {} as Record<string, number>)).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value),
                budgetUtilization: (() => {
                    const total = (purchaseRecords || []).reduce((sum: number, r: any) => sum + (Number(r.total_va) || 0), 0);
                    const paid = (purchaseRecords || []).filter((r: any) => r.status === 'Paid').reduce((sum: number, r: any) => sum + (Number(r.total_va) || 0), 0);
                    return {
                        total,
                        paid,
                        utilizationRate: total > 0 ? Math.round((paid / total) * 100) : 0
                    };
                })(),
                ticketChartData,
                assetCategoryPieData,
                itUnitsCount,
                gaUnitsCount
            });



        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Already calculated: isAdmin, activeMode

    return (
        <div className="pb-12 space-y-8 animate-in fade-in duration-500">
            <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as DashboardMode)} className="w-full">
                {/* Header */}
                <PageHeader
                    title="Control Center"
                    description={`Systems operational. Welcome back, ${userName?.split(' ')[0] || 'User'}.`}
                >
                    <div className="flex items-center gap-4">
                        {/* Tab Switcher - Now using Standardized Tabs Component */}
                        <TabsList>
                            <TabsTrigger value="personal">
                                Personal
                            </TabsTrigger>
                            <TabsTrigger value="organization">
                                Organization
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1" />

                        <div className="hidden md:flex items-center gap-2">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                                    <ViewGrid size="S" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="h-9 w-40 bg-muted/50 border border-border rounded-lg pl-9 pr-4 text-xs focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={fetchData}
                                className="w-9 border-border bg-background"
                            >
                                <span className={isLoading ? 'animate-spin' : ''}><Refresh size="S" /></span>
                            </Button>
                        </div>
                    </div>
                </PageHeader>

                {/* --- DASHBOARD CONTENT SWITCHER --- */}
                <TabsContent value="personal" className="mt-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    {/* PERSONAL VIEW (Referencing Screenshot 1) */}
                    {(() => {
                        const myActiveLoans = stats.upcomingLoans.filter((loan: any) => 
                            (loan.borrower_email && currentUser?.email && loan.borrower_email.toLowerCase() === currentUser.email.toLowerCase()) ||
                            (loan.borrower_name && userName && loan.borrower_name.toLowerCase() === userName.toLowerCase())
                        );
                        const overdueTasksCount = stats.personalTasks.filter((t: any) => 
                            t.status === 'Overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done')
                        ).length;

                        return (
                            <>
                                {/* Stat Cards - Row 1 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard
                                        label="My Open Tickets" value={stats.openTickets} subValue="+2 Today"
                                        icon={Help} color="blue" onClick={() => onNavigate('helpdesk')}
                                    />
                                    <StatCard
                                        label="My Asset Loans" value={myActiveLoans.length} subtext="On Loan"
                                        icon={Box} color="amber" onClick={() => onNavigate('asset-loan')}
                                    />
                                    <StatCard
                                        label="My Procurement" value={stats.pendingPurchases} subtext="Pending"
                                        icon={ShoppingCart} color="emerald" onClick={() => onNavigate('purchase')}
                                    />
                                    <StatCard
                                        label="My Tasks Today" value={stats.personalTasks.length} subtext={`${overdueTasksCount} Overdue`}
                                        icon={Checklist} color="indigo" onClick={() => onNavigate('weekly')}
                                    />
                                </div>

                                {/* Main Grid - Row 2 */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* My Tasks Today */}
                                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-base font-semibold text-foreground">My Tasks Today</h2>
                                        </div>
                                        <div className="space-y-4">
                                            {stats.personalTasks.length > 0 ? (
                                                stats.personalTasks.slice(0, 3).map((task) => (
                                                    <div key={task.id} className="flex items-center gap-3 group">
                                                        <div className="w-5 h-5 rounded border border-slate-300 dark:border-zinc-700 flex items-center justify-center group-hover:border-primary transition-colors cursor-pointer">
                                                            <div className="w-2 h-2 bg-primary rounded-sm opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-foreground truncate">{task.task}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">{task.due_date || 'Today'}</p>
                                                        </div>
                                                        {task.status === 'Overdue' && <Badge variant="destructive" className="text-[8px] h-3.5 px-1 font-bold">OVERDUE</Badge>}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-xs text-muted-foreground italic">
                                                    No tasks assigned for today
                                                </div>
                                            )}
                                            <Button variant="link" className="h-auto text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary mt-2 p-0 animate-pulse-subtle" onClick={() => onNavigate('weekly')}>
                                                View All Tasks
                                            </Button>
                                        </div>
                                    </div>

                                    {/* My Tickets Overview Chart */}
                                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-base font-semibold text-foreground">My Tickets</h2>
                                            <span className="text-slate-500 dark:text-zinc-400"><Activity size="S" /></span>
                                        </div>
                                        <div className="h-48 w-full">
                                            {stats.ticketChartData && stats.ticketChartData.some(d => d.count > 0) ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ReBarChart data={stats.ticketChartData}>
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                                                        <ReTooltip cursor={{ fill: 'transparent' }} />
                                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                                            {stats.ticketChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#f59e0b', '#10b981'][index % 3]} />
                                                            ))}
                                                        </Bar>
                                                    </ReBarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center py-6">
                                                    <span className="text-emerald-500 mb-2 opacity-55">
                                                        <CheckmarkCircle size="M" />
                                                    </span>
                                                    <p className="text-xs text-muted-foreground font-semibold">No active tickets found</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 text-center">
                                            <Button variant="link" size="sm" onClick={() => onNavigate('helpdesk')} className="text-xs font-semibold text-primary p-0">
                                                View My Tickets <span className="ml-1"><ChevronRight size="XS" /></span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* My Borrowed Assets */}
                                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-base font-semibold text-foreground">My Assets</h2>
                                            <span className="text-slate-500 dark:text-zinc-400"><Box size="S" /></span>
                                        </div>
                                        <div className="space-y-4">
                                            {myActiveLoans.length > 0 ? (
                                                myActiveLoans.slice(0, 3).map((loan: any, i) => (
                                                    <div key={loan.id || i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-white/5 shrink-0">
                                                            <Box size="S" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-foreground truncate">{loan.it_assets?.item_name || 'IT Asset'}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{loan.loan_id || 'Active Loan'}</p>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                                            {loan.expected_return_date ? new Date(loan.expected_return_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Active'}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-8 text-center text-xs text-muted-foreground italic">
                                                    No borrowed assets
                                                </div>
                                            )}
                                            <Button variant="outline" className="w-full mt-4 justify-between text-[10px] font-semibold uppercase tracking-wider" onClick={() => onNavigate('asset-loan')}>
                                                View All <span className="ml-1"><ChevronRight size="S" /></span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3 - Recent Activity & History */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
                                            <span className="text-slate-500 dark:text-zinc-400"><Activity size="S" /></span>
                                        </div>
                                        <div className="space-y-6">
                                            {stats.recentActivities.length > 0 ? stats.recentActivities.slice(0, 3).map((act, i) => (
                                                <div key={i} className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-colors">
                                                        <Activity size="S" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">{act.activityName}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{act.itPersonnel} • {new Date(act.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-10">
                                                    <p className="text-xs text-muted-foreground">No recent activities found.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </TabsContent>

                <TabsContent value="organization" className="mt-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    {/* ORGANIZATION VIEW (Referencing Screenshot 2) */}
                    {/* Header Controls for Organization */}
                    <div className="flex justify-end pr-4">
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Live Data</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </div>

                    {/* Critical Alerts - MOVED TO TOP FOR VISIBILITY */}
                    {(stats.overdueLoans > 0 || stats.openTickets > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-500">
                            {stats.overdueLoans > 0 && (
                                <div 
                                    onClick={() => onNavigate('asset-loan')}
                                    className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-rose-500/15 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                                            <Shield size="S" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Overdue Assets Detected</h2>
                                            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{stats.overdueLoans} asset loans are past their return date.</p>
                                        </div>
                                    </div>
                                    <span className={twMerge("group-hover:translate-x-1 transition-transform", "text-rose-500")}>
                                        <ChevronRight size="S" />
                                    </span>
                                </div>
                            )}

                            {stats.openTickets > 0 && (
                                <div 
                                    onClick={() => onNavigate('helpdesk')}
                                    className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-blue-500/15 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                            <Help size="S" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Support Tickets</h2>
                                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{stats.openTickets} tickets are currently waiting for response.</p>
                                        </div>
                                    </div>
                                    <span className={twMerge("group-hover:translate-x-1 transition-transform", "text-blue-500")}>
                                        <ChevronRight size="S" />
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stat Cards - Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            label="Open Tickets" value={stats.openTickets}
                            icon={Help} color="blue" onClick={() => onNavigate('helpdesk')}
                            percentageChange={3.2} status="on-track"
                        />
                        <StatCard
                            label="Pending Procurement" value={stats.pendingPurchases}
                            icon={ShoppingCart} color="amber" onClick={() => onNavigate('purchase')}
                            percentageChange={6.4}
                        />
                        <StatCard
                            label="Total Assets" value={stats.totalAssets}
                            icon={Box} color="purple" onClick={() => onNavigate('assets')}
                            percentageChange={5.2} subValue="IT Inventory"
                        />
                        <StatCard
                            label="Task Health" value="100%"
                            icon={Flashlight} color="emerald" onClick={() => onNavigate('weekly')}
                            percentageChange={2.0} status="on-track" subValue="Overall Rate"
                        />
                    </div>

                    {/* Row 2 - Analysis Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Budget Utilization Chart */}
                        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-base font-semibold text-foreground">Budget Utilization</h2>
                                <span className="text-slate-500 dark:text-zinc-400"><GraphPie size="S" /></span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-4">Paid vs Total Commitment</p>
                            
                            <div className="h-48 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={[
                                                { name: 'Paid', value: stats.budgetUtilization.paid },
                                                { name: 'Pending', value: Math.max(0, stats.budgetUtilization.total - stats.budgetUtilization.paid) }
                                            ]}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#10b981" />
                                            <Cell fill="#e2e8f0" />
                                        </Pie>
                                        <ReTooltip />
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold text-foreground">{stats.budgetUtilization.utilizationRate}%</span>
                                    <span className="text-[8px] font-black text-slate-500 dark:text-zinc-400 uppercase">Utilized</span>
                                </div>
                            </div>
                            
                            <div className="mt-4 flex justify-between items-center bg-muted/30 p-3 rounded-xl">
                                <div>
                                    <p className="text-[8px] font-semibold text-slate-500 dark:text-zinc-400 uppercase">Paid Amount</p>
                                    <p className="text-xs font-bold text-emerald-600">{formatCurrency(stats.budgetUtilization.paid)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-semibold text-slate-500 dark:text-zinc-400 uppercase">Total Committed</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(stats.budgetUtilization.total)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Critical Alerts */}
                        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-semibold text-foreground">Critical Alerts</h2>
                            </div>
                            <div className="space-y-3">
                                {stats.overdueLoans > 0 && (
                                    <div 
                                        onClick={() => onNavigate('asset-loan')}
                                        className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-3 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                                    >
                                        <span className="text-rose-500"><Shield size="S" /></span>
                                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                                            {stats.overdueLoans} asset loans are currently overdue
                                        </span>
                                    </div>
                                )}
                                
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                                    <span className="text-amber-500"><AlertCircle size="XS" /></span>
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{stats.openTickets} tickets are currently open</span>
                                </div>
                                
                                {stats.overdueLoans === 0 && stats.openTickets === 0 && (
                                    <div className="py-8 text-center">
                                        <span className="text-emerald-500 mx-auto mb-2 opacity-30"><CheckmarkCircle size="XXL" /></span>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">No critical alerts</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-8 text-center border-t pt-4">
                                <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary" onClick={() => onNavigate('asset-loan')}>View All Asset Loans</Button>
                            </div>
                        </div>

                        {/* Purchase by Category Chart */}
                        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-base font-semibold text-foreground">Project Revenue Trend</h2>
                                <span className="text-slate-500 dark:text-zinc-400"><GraphTrend size="XS" /></span>
                            </div>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReBarChart
                                        layout="vertical"
                                        data={stats.purchaseCategoryData.slice(0, 5)}
                                        margin={{ left: 10, right: 30 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={100}
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                        />
                                        <ReTooltip
                                            formatter={(value: number) => formatCurrency(value)}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {stats.purchaseCategoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e'][index % 5]} />
                                            ))}
                                        </Bar>
                                    </ReBarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 text-center border-t pt-2">
                                <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Based on Verified Payments</p>
                            </div>
                        </div>
                    </div>

                    {/* Row 3 - Asset Details & Activities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Asset Composition Pie */}
                        <div className="bg-card rounded-xl p-6 border border-border shadow-sm lg:col-span-1">
                            <h2 className="text-sm font-semibold text-foreground mb-4">Asset Matrix</h2>
                            <div className="h-48 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie 
                                            data={stats.assetCategoryPieData && stats.assetCategoryPieData.length > 0 ? stats.assetCategoryPieData : [{ name: 'Assets', value: stats.totalAssets || 1 }]} 
                                            innerRadius={50} 
                                            outerRadius={70} 
                                            dataKey="value"
                                        >
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#f59e0b" />
                                            <Cell fill="#f43f5e" />
                                            <Cell fill="#10b981" />
                                        </Pie>
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-bold">{stats.totalAssets}</span>
                                    <span className="text-[8px] font-semibold uppercase text-slate-500 dark:text-zinc-400">Total</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">IT UNITS</p>
                                    <p className="text-sm font-bold">{stats.itUnitsCount}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">GA UNITS</p>
                                    <p className="text-sm font-bold">{stats.gaUnitsCount}</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Purchase Activities */}
                        <div className="bg-card rounded-xl p-6 border border-border shadow-sm lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-semibold text-foreground">Asset Activity Log</h2>
                                <span className="text-slate-500 dark:text-zinc-400"><Activity size="XS" /></span>
                            </div>
                            <div className="space-y-4">
                                {stats.recentActivities.length > 0 ? stats.recentActivities.map((act, i) => (
                                    <div key={i} className="flex gap-4 p-3 bg-muted/20 rounded-xl hover:bg-muted/40 transition-all border border-transparent hover:border-border">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Activity size="S" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className="text-sm font-bold text-foreground truncate">{act.activityName}</p>
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 shrink-0">{new Date(act.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">{act.itPersonnel}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-10 text-center opacity-30 italic text-xs">No ledger movement detected</div>
                                )}
                            </div>
                        </div>

                        {/* Active Loans List */}
                        <div className="bg-card rounded-xl p-6 border border-border shadow-sm lg:col-span-1">
                            <h2 className="text-sm font-semibold text-foreground mb-4">Active Loans</h2>
                            <div className="space-y-4">
                                {stats.upcomingLoans.length > 0 ? (
                                    stats.upcomingLoans.slice(0, 4).map((loan: any, i) => (
                                        <div key={loan.id || i} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-white/5 shrink-0 font-bold text-[10px] uppercase">
                                                {loan.borrower_name ? loan.borrower_name.substring(0, 2) : 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate">{loan.borrower_name || 'User'}</p>
                                                <p className="text-[9px] text-slate-500 dark:text-zinc-400 truncate">{loan.it_assets?.item_name || 'Device'}</p>
                                            </div>
                                            <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400 text-right">
                                                {loan.expected_return_date ? new Date(loan.expected_return_date).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }) : 'N/A'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-xs text-muted-foreground italic">
                                        No active asset loans
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
