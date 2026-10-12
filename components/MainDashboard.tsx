'use client';

import React, { useState, useEffect } from 'react';
import {
    ShoppingCart,
    RefreshCw,
    Package,
    Zap,
    ListChecks,
    HelpCircle,
    ChevronRight,
    AlertCircle,
    Clock,
    TrendingUp,
    Activity,
    Shield,
    PieChart,
    BarChart2,
    LayoutGrid,
    Target,
    ArrowUpRight,
    CheckCircle2,
} from 'lucide-react';
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
    <div onClick={onClick} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-primary/30 transition-all cursor-pointer group">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                type === 'critical' ? 'bg-destructive/10 text-destructive' :
                type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                'bg-muted text-muted-foreground'
            }`}>
                {type === 'critical' ? <AlertCircle size={14} /> : type === 'warning' ? <Clock size={14} /> : <ListChecks size={14} />}
            </div>
            <div>
                <h2 className="font-semibold text-foreground text-sm">{title}</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Attention required</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{count}</span>
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-all" />
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
        <div className="pb-8 space-y-6">
            <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as DashboardMode)} className="w-full">
                {/* Header */}
                <PageHeader
                    title="Overview"
                    description={`Welcome back, ${userName?.split(' ')[0] || 'User'}. Here's what needs your attention.`}
                >
                    <div className="flex items-center gap-2">
                        <TabsList className="h-8">
                            <TabsTrigger value="personal" className="text-xs h-6 px-3">Personal</TabsTrigger>
                            <TabsTrigger value="organization" className="text-xs h-6 px-3">Organization</TabsTrigger>
                        </TabsList>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchData}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </PageHeader>

                {/* --- DASHBOARD CONTENT SWITCHER --- */}
                <TabsContent value="personal" className="mt-6 space-y-6">
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
                                {/* KPI Row */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        label="My Open Tickets" value={stats.openTickets} subValue="+2 Today"
                                        icon={HelpCircle} color="blue" onClick={() => onNavigate('helpdesk')}
                                    />
                                    <StatCard
                                        label="My Asset Loans" value={myActiveLoans.length} subtext="On Loan"
                                        icon={Package} color="amber" onClick={() => onNavigate('asset-loan')}
                                    />
                                    <StatCard
                                        label="Pending Procurement" value={stats.pendingPurchases} subtext="Pending"
                                        icon={ShoppingCart} color="emerald" onClick={() => onNavigate('purchase')}
                                    />
                                    <StatCard
                                        label="My Tasks Today" value={stats.personalTasks.length} subtext={`${overdueTasksCount} Overdue`}
                                        icon={ListChecks} color="indigo" onClick={() => onNavigate('weekly')}
                                    />
                                </div>

                                {/* Main Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* My Tasks */}
                                    <div className="bg-card rounded-lg p-4 border border-border">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-foreground">My Tasks</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {stats.personalTasks.length > 0 ? (
                                                stats.personalTasks.slice(0, 4).map((task) => (
                                                    <div key={task.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                                                        <div className="w-1 h-4 rounded-full bg-primary/60 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-foreground truncate">{task.task}</p>
                                                            <p className="text-xs text-muted-foreground">{task.due_date || 'Today'}</p>
                                                        </div>
                                                        {task.status === 'Overdue' && <Badge variant="destructive" className="text-[10px] h-4 px-1">Late</Badge>}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-xs text-muted-foreground">No tasks assigned</div>
                                            )}
                                            <Button variant="ghost" size="sm" className="w-full mt-1 text-xs h-7" onClick={() => onNavigate('weekly')}>
                                                View All Tasks
                                            </Button>
                                        </div>
                                    </div>

                                    {/* My Tickets */}
                                    <div className="bg-card rounded-lg p-4 border border-border">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-foreground">My Tickets</h3>
                                            <Activity size={14} className="text-muted-foreground" />
                                        </div>
                                        <div className="h-40 w-full">
                                            {stats.ticketChartData && stats.ticketChartData.some(d => d.count > 0) ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ReBarChart data={stats.ticketChartData}>
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                        <ReTooltip cursor={{ fill: 'transparent' }} />
                                                        <Bar dataKey="count" fill="#103065" radius={[3, 3, 0, 0]}>
                                                            {stats.ticketChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#103065', '#d97706', '#16a34a'][index % 3]} />
                                                            ))}
                                                        </Bar>
                                                    </ReBarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center">
                                                    <CheckCircle2 size={24} className="text-emerald-500 mb-2 opacity-50" />
                                                    <p className="text-xs text-muted-foreground">No active tickets</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3">
                                            <Button variant="ghost" size="sm" onClick={() => onNavigate('helpdesk')} className="w-full text-xs h-7">
                                                View My Tickets <ChevronRight size={12} className="ml-1" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* My Borrowed Assets */}
                                    <div className="bg-card rounded-lg p-4 border border-border">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-foreground">My Assets</h3>
                                            <Package size={14} className="text-muted-foreground" />
                                        </div>
                                        <div className="space-y-2">
                                            {myActiveLoans.length > 0 ? (
                                                myActiveLoans.slice(0, 3).map((loan: any, i) => (
                                                    <div key={loan.id || i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                                                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                            <Package size={13} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-foreground truncate">{loan.it_assets?.item_name || 'IT Asset'}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{loan.loan_id || 'Active Loan'}</p>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {loan.expected_return_date ? new Date(loan.expected_return_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : 'Active'}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-6 text-center text-xs text-muted-foreground">No borrowed assets</div>
                                            )}
                                            <Button variant="ghost" size="sm" className="w-full mt-1 text-xs h-7" onClick={() => onNavigate('asset-loan')}>
                                                View All <ChevronRight size={12} className="ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="bg-card rounded-lg p-4 border border-border">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
                                        <Activity size={14} className="text-muted-foreground" />
                                    </div>
                                    <div className="divide-y divide-border">
                                        {stats.recentActivities.length > 0 ? stats.recentActivities.slice(0, 4).map((act, i) => (
                                            <div key={i} className="flex gap-3 py-3">
                                                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                                    <Activity size={13} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-foreground">{act.activityName}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{act.itPersonnel} · {new Date(act.createdAt).toLocaleDateString('id-ID')}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-8">
                                                <p className="text-xs text-muted-foreground">No recent activities found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </TabsContent>

                <TabsContent value="organization" className="mt-6 space-y-6">
                    {/* Critical Alerts */}
                    {(stats.overdueLoans > 0 || stats.openTickets > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.overdueLoans > 0 && (
                                <div
                                    onClick={() => onNavigate('asset-loan')}
                                    className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-destructive/10 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-md bg-destructive flex items-center justify-center text-white shrink-0">
                                            <Shield size={14} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">Overdue Assets Detected</h3>
                                            <p className="text-xs text-destructive">{stats.overdueLoans} asset loans past return date.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-destructive group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            )}
                            {stats.openTickets > 0 && (
                                <div
                                    onClick={() => onNavigate('helpdesk')}
                                    className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-blue-500/10 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center text-white shrink-0">
                                            <HelpCircle size={14} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">Active Support Tickets</h3>
                                            <p className="text-xs text-blue-600">{stats.openTickets} tickets waiting for response.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Open Tickets" value={stats.openTickets}
                            icon={HelpCircle} color="blue" onClick={() => onNavigate('helpdesk')}
                        />
                        <StatCard
                            label="Pending Procurement" value={stats.pendingPurchases}
                            icon={ShoppingCart} color="amber" onClick={() => onNavigate('purchase')}
                        />
                        <StatCard
                            label="Total Assets" value={stats.totalAssets}
                            icon={Package} color="purple" onClick={() => onNavigate('assets')}
                            subValue="IT Inventory"
                        />
                        <StatCard
                            label="Active Loans" value={stats.activeLoans}
                            icon={ArrowUpRight} color="emerald" onClick={() => onNavigate('asset-loan')}
                            subValue={`${stats.overdueLoans} overdue`}
                        />
                    </div>

                    {/* Analysis Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Budget Utilization */}
                        <div className="bg-card rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-semibold text-foreground">Budget Utilization</h3>
                                <PieChart size={14} className="text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">Paid vs Total Commitment</p>
                            <div className="h-40 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={[
                                                { name: 'Paid', value: stats.budgetUtilization.paid },
                                                { name: 'Pending', value: Math.max(0, stats.budgetUtilization.total - stats.budgetUtilization.paid) }
                                            ]}
                                            innerRadius={50}
                                            outerRadius={68}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            <Cell fill="#16a34a" />
                                            <Cell fill="#e0e0e0" />
                                        </Pie>
                                        <ReTooltip />
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-bold text-foreground">{stats.budgetUtilization.utilizationRate}%</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">Utilized</span>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-between items-center bg-muted/50 p-2 rounded-md">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
                                    <p className="text-xs font-semibold text-emerald-600">{formatCurrency(stats.budgetUtilization.paid)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                                    <p className="text-xs font-semibold text-foreground">{formatCurrency(stats.budgetUtilization.total)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Critical Alerts */}
                        <div className="bg-card rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
                            </div>
                            <div className="space-y-2">
                                {stats.overdueLoans > 0 && (
                                    <div
                                        onClick={() => onNavigate('asset-loan')}
                                        className="p-2 bg-destructive/5 rounded-md border border-destructive/20 flex items-center gap-2 cursor-pointer hover:bg-destructive/10 transition-all"
                                    >
                                        <Shield size={13} className="text-destructive shrink-0" />
                                        <span className="text-xs text-destructive">{stats.overdueLoans} asset loans overdue</span>
                                    </div>
                                )}
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900/30 flex items-center gap-2">
                                    <AlertCircle size={13} className="text-amber-600 shrink-0" />
                                    <span className="text-xs text-foreground">{stats.openTickets} tickets currently open</span>
                                </div>
                                {stats.overdueLoans === 0 && stats.openTickets === 0 && (
                                    <div className="py-6 text-center">
                                        <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2 opacity-40" />
                                        <p className="text-xs text-muted-foreground">No critical alerts</p>
                                    </div>
                                )}
                            </div>
                            <Button variant="ghost" size="sm" className="w-full mt-3 text-xs h-7" onClick={() => onNavigate('asset-loan')}>View All Asset Loans</Button>
                        </div>

                        {/* Purchase by Category */}
                        <div className="bg-card rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-semibold text-foreground">Purchase by Category</h3>
                                <TrendingUp size={14} className="text-muted-foreground" />
                            </div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReBarChart
                                        layout="vertical"
                                        data={stats.purchaseCategoryData.slice(0, 5)}
                                        margin={{ left: 10, right: 24 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={90}
                                            tick={{ fontSize: 10, fill: '#737373' }}
                                        />
                                        <ReTooltip
                                            formatter={(value: number) => formatCurrency(value)}
                                            contentStyle={{ borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '11px' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                                            {stats.purchaseCategoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#103065', '#BC9C33', '#3b82f6', '#16a34a', '#d97706'][index % 5]} />
                                            ))}
                                        </Bar>
                                    </ReBarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Asset Details & Activities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Asset Composition */}
                        <div className="bg-card rounded-lg p-4 border border-border lg:col-span-1">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Asset Matrix</h3>
                            <div className="h-40 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={stats.assetCategoryPieData && stats.assetCategoryPieData.length > 0 ? stats.assetCategoryPieData : [{ name: 'Assets', value: stats.totalAssets || 1 }]}
                                            innerRadius={42}
                                            outerRadius={58}
                                            dataKey="value"
                                        >
                                            <Cell fill="#103065" />
                                            <Cell fill="#BC9C33" />
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#16a34a" />
                                        </Pie>
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-lg font-bold">{stats.totalAssets}</span>
                                    <span className="text-[9px] uppercase text-muted-foreground">Total</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase">IT Units</p>
                                    <p className="text-sm font-semibold">{stats.itUnitsCount}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase">GA Units</p>
                                    <p className="text-sm font-semibold">{stats.gaUnitsCount}</p>
                                </div>
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="bg-card rounded-lg p-4 border border-border lg:col-span-2">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-foreground">Activity Log</h3>
                                <Activity size={14} className="text-muted-foreground" />
                            </div>
                            <div className="divide-y divide-border">
                                {stats.recentActivities.length > 0 ? stats.recentActivities.map((act, i) => (
                                    <div key={i} className="flex gap-3 py-2">
                                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                            <Activity size={12} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-foreground truncate">{act.activityName}</p>
                                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{new Date(act.createdAt).toLocaleDateString('id-ID')}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{act.itPersonnel}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center text-xs text-muted-foreground">No activity records</div>
                                )}
                            </div>
                        </div>

                        {/* Active Loans */}
                        <div className="bg-card rounded-lg p-4 border border-border lg:col-span-1">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Active Loans</h3>
                            <div className="divide-y divide-border">
                                {stats.upcomingLoans.length > 0 ? (
                                    stats.upcomingLoans.slice(0, 5).map((loan: any, i) => (
                                        <div key={loan.id || i} className="flex items-center gap-2 py-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-semibold shrink-0">
                                                {loan.borrower_name ? loan.borrower_name.substring(0, 2).toUpperCase() : 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-foreground truncate">{loan.borrower_name || 'User'}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{loan.it_assets?.item_name || 'Device'}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {loan.expected_return_date ? new Date(loan.expected_return_date).toLocaleDateString('id-ID', { month: '2-digit', day: '2-digit' }) : 'N/A'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-xs text-muted-foreground">No active loans</div>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
