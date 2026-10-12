import React, { useState, useEffect, useMemo } from 'react';
import {
    FolderKanban, ListChecks, CheckCircle2,
    Calendar, Zap, TrendingUp,
    Database, Activity, Megaphone,
    ShoppingCart, Box, Shield,
    MessageSquare, RefreshCcw, ChevronRight, Info, Phone, Search, ArrowUpRight, Target,
    Wallet, CheckCircle2 as CheckCircle2Icon, Clock, Briefcase, Tag, Star
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
    ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { UserAccount, Announcement } from '../types';
import { StatCard } from './StatCard';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../translations';

// SHADCN UI IMPORTS
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
    id: number;
    task: string;
    category: string;
    dueDate: string;
    priority: 'Low' | 'Medium' | 'High';
    status: string;
    owner?: string;
    startTime?: string;
}

interface ProjectItem {
    id: number;
    name: string;
    status: 'Completed' | 'In Progress' | 'On Hold' | 'Pending';
    progress: number;
    totalTasks: number;
    completedTasks: number;
    dueDate: string;
    owner: string;
    department?: string;
    priority?: string;
}

interface PerformanceData {
    day: string;
    value: number;
    value2?: number;
}

interface TaskplusDashboardProps {
    onNavigate: (view: string) => void;
    userName?: string;
    userRole?: string;
    currentUser?: UserAccount | null;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", bg?: string, dot: string }> = {
        'Completed': { variant: 'outline', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
        'In Progress': { variant: 'outline', bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500' },
        'On Hold': { variant: 'outline', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500' },
        'Pending': { variant: 'outline', bg: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700/50', dot: 'bg-slate-400' },
        'Done': { variant: 'outline', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
        'To Do': { variant: 'outline', bg: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700/50', dot: 'bg-slate-400' },
    };
    const c = config[status] || config['Pending'];
    return (
        <Badge variant={c.variant} className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 ${c.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {status}
        </Badge>
    );
};

// ─── Component ────────────────────────────────────────────────────────────

export const TaskplusDashboard: React.FC<TaskplusDashboardProps> = ({ onNavigate, userName, userRole = 'User', currentUser }) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [projectSearch, setProjectSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeMode, setActiveMode] = useState<'PERSONAL' | 'ORGANIZATION'>(currentUser?.role === 'Admin' ? 'ORGANIZATION' : 'PERSONAL');
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [activityYear, setActivityYear] = useState<string>('last_12M');

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    const [stats, setStats] = useState({
        // Personal KPI
        myOpenActivities: 0,
        myOpenTickets: 0,
        myTasksTodayCount: 0,
        myProcurementRequests: 0,
        myAssetLoans: 0,
        myOverdueItems: 0,

        // Organization KPI
        totalOpenTickets: 0,
        totalActiveActivities: 0,
        pendingProcurement: 0,
        totalPurchaseThisMonth: 0,
        totalITAssets: 0,
        activeAssetLoans: 0,
        taskCompletionRate: '0%',
        totalHighPriority: 0,
        totalOverdueOrg: 0,
        supportSLA: 0,
        supportRating: 0,

        // Detailed Data
        procurementStats: { pending: 0, approved: 0, rejected: 0, totalBudget: 0 },
        personalAlerts: [] as string[],
        orgCritical: [] as string[],
        assetBreakdown: { it: 0, ga: 0, categories: {} as any },

        // Purchase Record Summary
        purchaseSummary: {
            totalDisbursed: 0,
            totalLiability: 0,
            fiscalVolume: 0,
            pendingCount: 0,
            totalRecords: 0,
            topCategories: [] as { name: string; total: number; percentage: number }[],
            topDepartments: [] as { name: string; total: number; percentage: number }[],
        },

        // Activity Heatmap
        activityHeatmap: {} as Record<string, number>,
        activityTotal: 0,
        activeAssetLoanCount: 0,
        overdueAssetLoanCount: 0,
        topHandlers: [] as {name: string, count: number}[]
    });

    const [listData, setListData] = useState({
        myTasksToday: [] as any[],
        myActivities: [] as any[],
        myProcurement: [] as any[],
        myBorrowedAssets: [] as any[],
        orgActivities: [] as any[],
        orgRecentTickets: [] as any[],
        allProjects: [] as ProjectItem[]
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const tenDaysAgo = new Date(); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            const [
                { data: weeklyPlans },
                { data: purchasePlans },
                { data: helpTickets },
                { data: activities },
                { data: itAssets },
                { data: announcementsData },
                { data: purchaseRecords },
                { count: activeLoanCount },
                { count: overdueCount }
            ] = await Promise.all([
                supabase.from('weekly_plans').select('*').order('due_date', { ascending: true }),
                supabase.from('purchase_plans').select('*').order('request_date', { ascending: false }),
                supabase.from('helpdesk_tickets').select('*').order('created_at', { ascending: false }),
                supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
                supabase.from('it_assets').select('*'),
                supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
                supabase.from('purchase_records').select('id, subtotal, status, category, department, purchase_date, vendor').order('purchase_date', { ascending: false }),
                supabase.from('it_asset_loans').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
                supabase.from('it_asset_loans').select('*', { count: 'exact', head: true }).neq('status', 'Returned').lt('expected_return_date', new Date().toISOString())
            ]);

            const currentUserName = currentUser?.fullName || '';

            const currentUserFirstName = currentUserName.split(' ')[0];

            // --- PERSONAL CALCULATIONS ---
            const myActivitiesRaw = (activities || []).filter(a => (a.requester === currentUserName || a.assigned_to === currentUserName) && a.status !== 'Completed');
            const myTicketsRaw = (helpTickets || []).filter(t => t.requester_name === currentUserName && (t.status === 'Open' || t.status === 'In Progress'));
            const myTasksToday = (weeklyPlans || []).filter(w => {
                const isAssigned = w.owner === currentUserName || w.assignee === currentUserName || w.assignee === currentUserFirstName;
                const start = w.start_date || w.due_date;
                const end = w.due_date;
                const isToday = start <= today && end >= today;
                return isToday && isAssigned;
            });
            const myProcurements = (purchasePlans || []).filter(p => p.requester === currentUserName);
            const myLoans = (itAssets || []).filter(a => a.user_assigned === currentUserName && a.status === 'Used');

            // Overdue logic
            const overdueTasksCount = (weeklyPlans || []).filter(w => {
                const isAssigned = w.owner === currentUserName || w.assignee === currentUserName || w.assignee === currentUserFirstName;
                return isAssigned && w.status !== 'Done' && w.status !== 'Completed' && w.due_date && w.due_date < today;
            }).length;
            const overdueActivitiesCount = (activities || []).filter(a => (a.requester === currentUserName || a.assigned_to === currentUserName) && a.status !== 'Completed' && a.due_date && a.due_date < today).length;
            const myOverdueTotal = overdueTasksCount + overdueActivitiesCount;

            const personalAlerts: string[] = [];
            if (myOverdueTotal > 0) personalAlerts.push(`${myOverdueTotal} planner overdue`);
            const oldProcurement = myProcurements.find(p => (p.status === 'In Review' || p.status === 'Draft') && p.request_date && new Date(p.request_date) < fiveDaysAgo);
            if (oldProcurement) personalAlerts.push(`1 procurement pending > 5 hari`);
            const nearDueLoan = myLoans.find(a => a.due_date && (new Date(a.due_date).getTime() - new Date().getTime()) < 3 * 24 * 3600 * 1000);
            if (nearDueLoan) personalAlerts.push(`1 loan hampir jatuh tempo`);
            
            // Add actual overdue loans to personal alerts if any
            const myOverdueLoans = (itAssets || []).filter(a => a.user_assigned === currentUserName && a.status === 'Overdue').length;
            if (myOverdueLoans > 0) personalAlerts.push(`${myOverdueLoans} asset overdue`);

            // --- ORGANIZATION CALCULATIONS ---
            const totalTickets = (helpTickets || []).filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
            const activeActivities = (activities || []).filter(a => a.status !== 'Completed');
            const pendingProc = (purchasePlans || []).filter(p => p.status === 'In Review' || p.status === 'Draft');
            const thisMonthPurchases = (purchasePlans || []).filter(p => {
                if (!p.request_date) return false;
                const d = new Date(p.request_date);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            const totalPurchaseVal = thisMonthPurchases.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const totalAssets = (itAssets || []).length;
            const activeLoans = (itAssets || []).filter(a => a.status === 'Used').length;
            const completionRate = weeklyPlans && weeklyPlans.length > 0 ?
                `${Math.round((weeklyPlans.filter(w => w.status === 'Done' || w.status === 'Completed').length / weeklyPlans.length) * 100)}%` : '0%';

            // --- SLA & RATING CALCULATIONS (Consistent with HelpdeskManager) ---
            const resolvedTickets = (helpTickets || []).filter(t => t.status === 'Resolved' || t.status === 'Closed');
            
            let totalSlaHours = 0;
            let resolvedWithDates = 0;
            
            resolvedTickets.forEach(t => {
                // Use responded_at (actual processing start) with fallback to created_at
                const startTime = t.responded_at || t.created_at;
                if (startTime && t.resolved_at) {
                    const start = new Date(startTime);
                    const end = new Date(t.resolved_at);
                    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    if (diffHours >= 0) {
                        totalSlaHours += diffHours;
                        resolvedWithDates++;
                    }
                }
            });
            
            const avgSlaHours = resolvedWithDates > 0 ? (totalSlaHours / resolvedWithDates).toFixed(1) : '0';
            
            const ratedTickets = (helpTickets || []).filter(t => t.rating && t.rating > 0);
            const totalRating = ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0);
            const avgRating = ratedTickets.length > 0 ? (totalRating / ratedTickets.length).toFixed(1) : '0';

            // --- TOP HANDLERS ---
            const validStaff = new Set<string>();
            (activities || []).forEach(a => {
                if (a.itPersonnel && typeof a.itPersonnel === 'string' && a.itPersonnel.trim() !== '' && a.itPersonnel !== 'undefined' && a.itPersonnel !== 'null') validStaff.add(a.itPersonnel);
                if (a.assigned_to && typeof a.assigned_to === 'string' && a.assigned_to.trim() !== '' && a.assigned_to !== 'undefined' && a.assigned_to !== 'null') validStaff.add(a.assigned_to);
            });
            (helpTickets || []).forEach(t => {
                if (t.assigned_to && typeof t.assigned_to === 'string' && t.assigned_to.trim() !== '' && t.assigned_to !== 'undefined' && t.assigned_to !== 'null') validStaff.add(t.assigned_to);
                if (t.resolved_by && typeof t.resolved_by === 'string' && t.resolved_by.trim() !== '' && t.resolved_by !== 'undefined' && t.resolved_by !== 'null') validStaff.add(t.resolved_by);
            });

            if (validStaff.size === 0) {
                validStaff.add(currentUserName || 'IT Technician');
            }

            const activeTickets = (helpTickets || []).filter(t => t.status === 'Open' || t.status === 'In Progress');
            const handlerMap: Record<string, number> = {};
            
            validStaff.forEach(staff => handlerMap[staff] = 0);

            activeTickets.forEach(t => {
                const handler = t.assigned_to || t.assignedTo || t.resolved_by;
                if (handler && typeof handler === 'string' && handlerMap[handler] !== undefined) {
                    handlerMap[handler] += 1;
                }
            });

            const topHandlersList = Object.entries(handlerMap)
                .map(([name, count]) => ({name, count}))
                .filter(h => h.name && h.name.length > 0)
                .sort((a,b) => b.count - a.count)
                .slice(0, 3);

            const orgAlerts: string[] = [];
            const oldTickets = totalTickets.filter(t => new Date(t.created_at) < threeDaysAgo).length;
            if (oldTickets >= 3) orgAlerts.push(`${oldTickets} tickets > 3 hari belum close`);
            const oldOrgProc = pendingProc.filter(p => p.request_date && new Date(p.request_date) < sevenDaysAgo).length;
            if (oldOrgProc >= 2) orgAlerts.push(`${oldOrgProc} procurement pending > 7 hari`);
            const overdueTotal = (weeklyPlans || []).filter(w => (w.status !== 'Done' && w.status !== 'Completed') && w.due_date && w.due_date < today).length;
            if (overdueTotal > 0) orgAlerts.push(`${overdueTotal} items overdue`);
            
            // Add Overdue Loans to Org Alerts
            const totalOverdueLoans = overdueCount || 0;
            if (totalOverdueLoans > 0) orgAlerts.push(`${totalOverdueLoans} asset loans overdue`);

            // --- PROJECTS DATA (FROM WEEKLY PLANS) ---

            // --- PROJECTS DATA (FROM WEEKLY PLANS) ---
            const projectPlans = (weeklyPlans || []).filter(w => w.category === 'Project');
            const groupedProjects: Record<string, { tasks: any[]; latestDate: string; owner: string; dept: string; priority: string }> = {};

            projectPlans.forEach(task => {
                const name = task.task.split(':')[0] || 'Operational';
                if (!groupedProjects[name]) {
                    groupedProjects[name] = {
                        tasks: [],
                        latestDate: task.due_date || today,
                        owner: task.assignee || 'IT',
                        dept: task.department || 'GENERAL',
                        priority: task.priority || 'Medium'
                    };
                }
                groupedProjects[name].tasks.push(task);
                if (task.due_date > groupedProjects[name].latestDate) groupedProjects[name].latestDate = task.due_date;
                // Keep the highest priority
                if (task.priority === 'High') groupedProjects[name].priority = 'High';
            });

            const projectItems: ProjectItem[] = Object.entries(groupedProjects).map(([name, data], index) => {
                const total = data.tasks.length;
                const completed = data.tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                return {
                    id: index + 1,
                    name: name,
                    status: (progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending') as any,
                    progress,
                    totalTasks: total,
                    completedTasks: completed,
                    dueDate: data.latestDate,
                    owner: data.owner,
                    department: data.dept,
                    priority: data.priority
                };
            });

            // Asset Breakdown - Real Categorization
            const itCategoryList = ['Laptop', 'PC', 'Server', 'Network', 'Monitor', 'Printer', 'Hardware'];
            let itCount = 0;
            let gaCount = 0;
            const assetCats: any = {};
            (itAssets || []).forEach(a => {
                const cat = a.category || 'Other';
                assetCats[cat] = (assetCats[cat] || 0) + 1;
                if (itCategoryList.some(c => cat.includes(c))) itCount++;
                else gaCount++;
            });

            setStats({
                myOpenActivities: myActivitiesRaw.length,
                myOpenTickets: myTicketsRaw.length,
                myTasksTodayCount: myTasksToday.length,
                myProcurementRequests: myProcurements.length,
                myAssetLoans: myLoans.length,
                myOverdueItems: myOverdueTotal,

                totalOpenTickets: totalTickets.length,
                totalActiveActivities: activeActivities.length,
                pendingProcurement: pendingProc.length,
                totalPurchaseThisMonth: totalPurchaseVal,
                totalITAssets: totalAssets,
                activeAssetLoans: activeLoanCount || 0,
                taskCompletionRate: completionRate,
                totalHighPriority: (weeklyPlans || []).filter(w => w.priority === 'High' && w.status !== 'Done' && w.status !== 'Completed').length,
                totalOverdueOrg: overdueCount || 0,
                activeAssetLoanCount: activeLoanCount || 0,
                overdueAssetLoanCount: overdueCount || 0,
                supportSLA: Number(avgSlaHours),
                supportRating: Number(avgRating),
                topHandlers: topHandlersList,

                procurementStats: {
                    pending: myProcurements.filter(p => p.status === 'In Review').length,
                    approved: myProcurements.filter(p => p.status === 'Approved').length,
                    rejected: myProcurements.filter(p => p.status === 'Rejected').length,
                    totalBudget: myProcurements.reduce((acc, curr) => acc + (curr.amount || 0), 0)
                },
                personalAlerts,
                orgCritical: orgAlerts,
                assetBreakdown: {
                    it: itCount,
                    ga: gaCount,
                    categories: assetCats
                },

                // Purchase Record Summary
                purchaseSummary: (() => {
                    const recs = purchaseRecords || [];
                    const totalDisbursed = recs.filter(r => r.status === 'Paid').reduce((sum: number, r: any) => sum + (r.subtotal || 0), 0);
                    const totalLiability = recs.filter(r => r.status !== 'Paid').reduce((sum: number, r: any) => sum + (r.subtotal || 0), 0);
                    const fiscalVolume = recs.reduce((sum: number, r: any) => sum + (r.subtotal || 0), 0);
                    const pendingCount = recs.filter(r => r.status === 'Pending').length;

                    // Top Categories
                    const catMap: Record<string, number> = {};
                    recs.forEach((r: any) => {
                        const cat = r.category || 'Uncategorized';
                        catMap[cat] = (catMap[cat] || 0) + (r.subtotal || 0);
                    });
                    const topCategories = Object.entries(catMap)
                        .map(([name, total]) => ({ name, total, percentage: fiscalVolume > 0 ? Math.round((total / fiscalVolume) * 100) : 0 }))
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 5);

                    // Top Departments
                    const deptMap: Record<string, number> = {};
                    recs.forEach((r: any) => {
                        const dept = r.department || 'Unknown';
                        deptMap[dept] = (deptMap[dept] || 0) + (r.subtotal || 0);
                    });
                    const topDepartments = Object.entries(deptMap)
                        .map(([name, total]) => ({ name, total, percentage: fiscalVolume > 0 ? Math.round((total / fiscalVolume) * 100) : 0 }))
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 5);

                    return { totalDisbursed, totalLiability, fiscalVolume, pendingCount, totalRecords: recs.length, topCategories, topDepartments };
                })(),

                // Activity Heatmap — count activities per day from multiple sources
                activityHeatmap: (() => {
                    const heatmap: Record<string, number> = {};
                    // Count from activity_logs
                    (activities || []).forEach((a: any) => {
                        const day = a.created_at?.split('T')[0];
                        if (day) heatmap[day] = (heatmap[day] || 0) + 1;
                    });
                    // Count from helpdesk_tickets
                    (helpTickets || []).forEach((t: any) => {
                        const day = t.created_at?.split('T')[0];
                        if (day) heatmap[day] = (heatmap[day] || 0) + 1;
                    });
                    // Count from weekly_plans
                    (weeklyPlans || []).forEach((w: any) => {
                        const day = w.created_at?.split('T')[0] || w.due_date;
                        if (day) heatmap[day] = (heatmap[day] || 0) + 1;
                    });
                    return heatmap;
                })(),
                activityTotal: (activities || []).length + (helpTickets || []).length + (weeklyPlans || []).length,
            });

            setListData({
                myTasksToday,
                myActivities: myActivitiesRaw.slice(0, 5),
                myProcurement: myProcurements.slice(0, 5),
                myBorrowedAssets: myLoans,
                orgActivities: activeActivities.slice(0, 10),
                orgRecentTickets: totalTickets.slice(0, 10),
                allProjects: projectItems
            });

            // --- PERFORMANCE DATA (REAL TICKET TRENDS) ---
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const performanceTrend = last7Days.map(date => {
                const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                const ticketsOnDay = (helpTickets || []).filter(t => t.created_at?.split('T')[0] === date);
                const resolvedOnDay = (helpTickets || []).filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.updated_at?.split('T')[0] === date);

                return {
                    day: dayLabel,
                    value: ticketsOnDay.length, // Open/New
                    value2: resolvedOnDay.length // Resolved
                };
            });
            setPerformanceData(performanceTrend);

            setAnnouncements(announcementsData || []);

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchData(); 

        // Real-time subscription to auto-refresh dashboard when data changes
        const channel = supabase
            .channel('dashboard-auto-refresh')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'it_asset_loans' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'helpdesk_tickets' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_plans' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_plans' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredProjects = useMemo(() => {
        return listData.allProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()));
    }, [listData.allProjects, projectSearch]);

    const rpp = 10;
    const paginatedProjects = filteredProjects.slice((currentPage - 1) * rpp, currentPage * rpp);
    const totalPages = Math.max(Math.ceil(filteredProjects.length / rpp), 1);

    if (isLoading) {
        return (
            <div className="space-y-5 animate-pulse min-h-screen">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="h-10 bg-muted rounded-xl w-64" />
                        <div className="h-5 bg-muted rounded-xl w-80" />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-700 pb-16">

            {/* --- CORE HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between items-start gap-6 pt-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                            <Target size={16} className="animate-pulse" />
                        </div>
                        <Badge variant="outline" className="text-[10px] font-semibold tracking-wider uppercase border-primary/20 text-primary bg-primary/5 px-2.5 py-0.5 rounded-full">
                            {activeMode === 'PERSONAL' ? 'Operation Hub' : 'System Gesit'}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {activeMode === 'PERSONAL' ? 'My Workspace' : 'Control Tower'}
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-lg">
                        {activeMode === 'PERSONAL'
                            ? 'Manage your daily technical roadmap and equipment efficiency.'
                            : 'Real-time synchronization of organizational health and infrastructure status.'}
                    </p>
                </div>

                <div className="flex p-1 bg-muted/50 rounded-lg border border-border">
                    {(['PERSONAL', 'ORGANIZATION'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setActiveMode(mode)}
                            className={`px-6 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all
                                ${activeMode === mode
                                    ? 'bg-background text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100'
                                }
                            `}
                        >
                            {mode === 'PERSONAL' ? 'Personal' : 'Organization'}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- DASHBOARD CONTENT --- */}
            {activeMode === 'PERSONAL' ? (
                /* 🔷 MY WORKSPACE (PERSONAL) */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">

                    {/* 1. Summary Cards (Personal KPI) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard label="My Activities" value={stats.myOpenActivities} icon={Activity} color="indigo" subValue="Pending" />
                        <StatCard label="My Open Tickets" value={stats.myOpenTickets} icon={MessageSquare} color="blue" subValue="Active" />
                        <StatCard label="My Tasks Today" value={stats.myTasksTodayCount} icon={ListChecks} color="sky" subValue="Due today" />
                        <StatCard label="My Procurement" value={stats.myProcurementRequests} icon={ShoppingCart} color="amber" subValue="Requests" />
                        <StatCard label="My Asset Loans" value={stats.myAssetLoans} icon={Box} color="purple" subValue="Borrowed" />
                        <StatCard label="My Overdue Items" value={stats.myOverdueItems} icon={Zap} color="rose" subValue="Urgent" status={stats.myOverdueItems > 0 ? "at-risk" : "on-track"} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* 2. My Tasks Today (Planner Integration) */}
                        <Card className="lg:col-span-4 rounded-xl border-border shadow-sm overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-bold flex items-center justify-between">
                                    Today's Tasks
                                    <Badge variant="secondary" className="bg-primary/5 text-primary">Planner</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                {listData.myTasksToday.length > 0 ? (
                                    listData.myTasksToday.map((task, i) => {
                                        const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0];
                                        return (
                                            <div key={task.id} className={`flex gap-3 group p-3 rounded-lg border transition-all ${isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border/50'}`}>
                                                <div className={`w-1 h-8 rounded-full ${isOverdue ? 'bg-destructive' : 'bg-primary'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-sm font-semibold truncate ${isOverdue ? 'text-destructive' : ''}`}>{task.task}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{task.startTime || '08:00'}</span>
                                                        <div className="w-1 h-1 rounded-full bg-border" />
                                                        <StatusBadge status={task.status} />
                                                    </div>
                                                </div>
                                                {isOverdue && <Badge variant="destructive" className="h-4 text-[7px] font-bold">OVERDUE</Badge>}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 flex flex-col items-center text-center">
                                        <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mb-4">
                                            <Calendar className="text-muted-foreground/30" size={32} />
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-loose">No task scheduled today.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 3. My Activities & 6. Personal Alerts */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Personal Alerts (Smart Feature) */}
                            {stats.personalAlerts.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {stats.personalAlerts.map((alert, i) => (
                                        <div key={i}
                                            onClick={() => {
                                                const lower = alert.toLowerCase();
                                                if (lower.includes('procurement')) onNavigate('procurement');
                                                else if (lower.includes('loan')) onNavigate('asset-loan');
                                                else onNavigate('activities');
                                            }}
                                            className="p-4 bg-destructive/5 hover:bg-destructive/10 border border-destructive/10 rounded-xl flex items-center gap-3 animate-in fade-in duration-500 cursor-pointer transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                                                <Info size={16} />
                                            </div>
                                            <span className="text-xs font-semibold uppercase tracking-tight text-destructive">{alert}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* My Activities (Activity Logs) */}
                                <Card className="rounded-xl border-border shadow-sm">
                                    <CardHeader className="p-6 pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-semibold">Assigned to Me</CardTitle>
                                            <Button variant="link" size="sm" className="text-[10px] font-bold uppercase tracking-wider text-primary" onClick={() => onNavigate('weekly')}>View All</Button>
                                        </div>
                                    </CardHeader>
                                    <div className="px-0">
                                        <Table>
                                            <TableBody>
                                                {listData.myActivities.map((act) => (
                                                    <TableRow key={act.id} className="border-border/50 hover:bg-muted/30">
                                                        <TableCell className="pl-6 py-3">
                                                            <p className="text-sm font-semibold">{act.activity_name || act.category}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge variant="outline" className={`text-[7px] h-3.5 px-1 ${act.priority === 'High' ? 'text-destructive border-destructive/30' : ''}`}>{act.priority || 'Medium'}</Badge>
                                                                <span className="text-[9px] font-medium text-muted-foreground uppercase">Due: {act.due_date || '-'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="pr-6 text-right"><StatusBadge status={act.status} /></TableCell>
                                                    </TableRow>
                                                ))}
                                                {listData.myActivities.length === 0 && (
                                                    <TableRow><TableCell colSpan={2} className="h-40 text-center text-muted-foreground uppercase text-[10px] tracking-widest">No activities</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>

                                {/* 4. My Procurement Requests */}
                                <Card className="rounded-xl border-border shadow-sm">
                                    <CardHeader className="p-6 pb-2">
                                        <CardTitle className="text-base font-semibold">Procurement</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-4">
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: 'Pending', val: stats.procurementStats.pending, color: 'text-amber-500' },
                                                { label: 'Approved', val: stats.procurementStats.approved, color: 'text-emerald-500' },
                                                { label: 'Rejected', val: stats.procurementStats.rejected, color: 'text-destructive' },
                                            ].map((st, i) => (
                                                <div key={i} className="text-center p-3 bg-muted/40 rounded-xl border border-border/50">
                                                    <p className={`text-xl font-bold ${st.color}`}>{st.val}</p>
                                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{st.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-5 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/10 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-xl" />
                                            <p className="text-[10px] uppercase font-semibold tracking-wider opacity-90">Estimated Budget</p>
                                            <h3 className="text-2xl font-bold tracking-tight mt-0.5">{formatCurrency(stats.procurementStats.totalBudget)}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* 5. My Borrowed Assets */}
                        <Card className="lg:col-span-12 rounded-xl border-border shadow-sm overflow-hidden bg-card">
                            <CardHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center justify-between bg-muted/20">
                                <div>
                                    <CardTitle className="text-lg font-bold">Personal Inventory</CardTitle>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase mt-0.5">Equipment in your possession</p>
                                </div>
                                <Box className="text-primary/30" size={24} />
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-border/50">
                                            <TableHead className="pl-6 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Asset Name</TableHead>
                                            <TableHead className="h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Serial / ID</TableHead>
                                            <TableHead className="h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                                            <TableHead className="text-right pr-6 h-10 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {listData.myBorrowedAssets.map((asset) => {
                                            const assetDueDate = asset.due_date ? new Date(asset.due_date) : null;
                                            const isNearDue = assetDueDate && (assetDueDate.getTime() - new Date().getTime()) < 3 * 24 * 3600 * 1000;
                                            return (
                                                <TableRow key={asset.id} className={`border-border/20 hover:bg-muted/30 transition-colors group ${isNearDue ? 'bg-destructive/5' : ''}`}>
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                                                                <Database size={14} />
                                                            </div>
                                                            <span className="text-sm font-semibold">{asset.item_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-xs text-muted-foreground">{asset.serial_number || '-'}</TableCell>
                                                    <TableCell className={`text-xs font-bold ${isNearDue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                        {asset.due_date ? new Date(asset.due_date).toLocaleDateString() : '-'}
                                                        {isNearDue && <span className="ml-2 inline-block px-1.5 py-0.5 bg-destructive text-white rounded text-[7px] font-bold uppercase tracking-tight">Express</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6"><StatusBadge status={asset.status} /></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {listData.myBorrowedAssets.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="h-40 text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">You have no active asset loans</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                /* 🏢 CONTROL TOWER (ORGANIZATION) */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    
                    {/* --- [NEW] MAJOR ALERTS FOR ADMINS --- */}
                    {(stats.totalOverdueOrg > 0 || stats.totalOpenTickets > 0) && (
                        <div className="flex flex-col md:flex-row gap-4 mb-2">
                            {stats.totalOverdueOrg > 0 && (
                                <div 
                                    onClick={() => onNavigate('asset-loan')}
                                    className="flex-1 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-rose-500/20 transition-all shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                                            <Shield size={20} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Aset Terlambat!</h4>
                                            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5">{stats.totalOverdueOrg} barang belum dikembalikan tepat waktu.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-rose-500 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}

                            {stats.totalOpenTickets > 0 && (
                                <div 
                                    onClick={() => onNavigate('helpdesk')}
                                    className="flex-1 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-blue-500/20 transition-all shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Tiket Masuk!</h4>
                                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1.5">{stats.totalOpenTickets} tiket baru butuh balasan kamu.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* 1. Summary Cards (Global KPI) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        <StatCard label="Activities" value={stats.totalActiveActivities} icon={Activity} color="indigo" subValue="In progress" />
                        <StatCard label="Procurement" value={stats.pendingProcurement} icon={ShoppingCart} color="amber" subValue="To review" />
                        <StatCard label="Spending" value={formatCurrency(stats.totalPurchaseThisMonth)} icon={TrendingUp} color="emerald" subValue="This Month" />
                        <StatCard label="Inventory" value={stats.totalITAssets} icon={Database} color="purple" subValue="Items" />
                        <StatCard label="Loans" value={stats.activeAssetLoans} icon={Box} color="sky" subValue="Out" />
                        <StatCard label="Efficiency" value={stats.taskCompletionRate} icon={Zap} color="orange" subValue="Rate" />
                    </div>

                    {/* 2. Purchase Record Summary */}
                    <Card className="rounded-xl border-border shadow-sm overflow-hidden bg-card">
                        <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Wallet size={16} />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold">Purchase Record</CardTitle>
                                    <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Financial Summary</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[9px] font-bold uppercase tracking-wider text-primary" onClick={() => onNavigate('procurement')}>
                                View All <ChevronRight size={10} className="ml-1" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Disbursed</p>
                                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(stats.purchaseSummary.totalDisbursed)}</p>
                                </div>
                                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Liability</p>
                                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 tracking-tight">{formatCurrency(stats.purchaseSummary.totalLiability)}</p>
                                </div>
                                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Volume</p>
                                    <p className="text-base font-bold text-blue-600 dark:text-blue-400 tracking-tight">{formatCurrency(stats.purchaseSummary.totalDisbursed + stats.purchaseSummary.totalLiability)}</p>
                                </div>
                                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Records</p>
                                    <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{stats.purchaseSummary.totalRecords}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag size={11} className="text-indigo-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Top Categories</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {stats.purchaseSummary.topCategories.map((cat) => (
                                            <div key={cat.name} className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground uppercase">
                                                <span>{cat.name}</span>
                                                <span className="text-foreground font-bold">{formatCurrency(cat.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Briefcase size={11} className="text-emerald-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Department Spend</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {stats.purchaseSummary.topDepartments.map((dept) => (
                                            <div key={dept.name} className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground uppercase">
                                                <span>{dept.name}</span>
                                                <span className="text-foreground font-bold">{formatCurrency(dept.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Support Dynamics & Support Rating */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <Card className="lg:col-span-8 rounded-xl border-border shadow-sm overflow-hidden bg-card">
                            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold uppercase tracking-tight">Support Dynamics</CardTitle>
                                    <p className="text-[9px] font-medium text-muted-foreground uppercase">Resolution Velocity</p>
                                </div>
                                <Select defaultValue="last7days">
                                    <SelectTrigger className="w-[120px] rounded-lg bg-muted/40 border-border/50 font-bold uppercase text-[9px] tracking-wider h-8">
                                        <SelectValue placeholder="Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="last7days">Last 7 Days</SelectItem>
                                        <SelectItem value="monthly">This Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent className="p-5 h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={performanceData}>
                                        <defs>
                                            <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="[&_line]:stroke-border" strokeOpacity={0.1} />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} />
                                        <ReTooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'hsl(var(--card))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorOpen)" name="New Tickets" />
                                        <Area type="monotone" dataKey="value2" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-4 rounded-xl border-border shadow-sm overflow-hidden bg-primary/5 flex flex-col items-center justify-between p-7 relative isolate h-full">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/10 pointer-events-none" />
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-300 via-primary to-blue-300 pointer-events-none" />

                            <div className="flex-none mb-6 text-center">
                                <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground mb-1">{t('ticketingAnalytics')}</h4>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('itServicePerformance')}</p>
                            </div>

                            <div className="w-full flex-1 flex flex-col justify-center mb-6">
                                <div className="flex justify-between items-center px-2">
                                    <div className="flex flex-col items-center gap-1.5 w-1/2 border-r border-border/60">
                                        <div className="bg-rose-500/10 p-2.5 rounded-full mb-1">
                                            <Clock size={16} className="text-rose-500" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[24px] font-black text-foreground drop-shadow-sm leading-none">{stats.supportSLA}h</span>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">{t('avgSla')}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5 w-1/2">
                                        <div className="bg-amber-500/10 p-2.5 rounded-full mb-1 flex items-center justify-center gap-0.5">
                                            <Star size={16} className="text-amber-500 fill-amber-500" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[24px] font-black text-foreground drop-shadow-sm leading-none flex items-baseline gap-1">
                                            {stats.supportRating} <span className="text-[12px] text-muted-foreground/50">/ 5</span>
                                        </span>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">{t('userRating')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full font-sans mb-5 z-10">
                                <div className="flex items-center gap-2 mb-3 px-1 border-b border-border/50 pb-2">
                                    <Target size={12} className="text-primary" />
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-foreground">{t('topHandlers')}</h5>
                                </div>
                                <div className="space-y-2.5">
                                    {stats.topHandlers.map((handler, i) => (
                                        <div key={i} className="flex justify-between items-center bg-card/40 border border-border/40 p-2 rounded-lg backdrop-blur-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                                                    {handler.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-semibold text-foreground">{handler.name}</span>
                                            </div>
                                            <Badge variant={handler.count > 0 ? 'default' : 'outline'} className={`text-[9px] h-5 opacity-80 ${handler.count === 0 ? 'border-primary/20 text-muted-foreground bg-primary/5' : 'bg-primary/20 text-primary'}`}>
                                                {handler.count} {t('activeTickets')}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full bg-card/80 backdrop-blur-md border border-border/50 rounded-lg p-3 flex flex-col flex-none relative z-10 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-bold uppercase text-foreground/70">{t('serviceHealth')}</span>
                                    <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                                        {Number(stats.supportRating) >= 4 ? t('excellent') : t('good')}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min((Number(stats.supportRating) / 5) * 100, 100)}%` }} />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* 4. Activity & Inventory Side-by-Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* PLATFORM ACTIVITY (GitHub Style) */}
                        <Card className="lg:col-span-8 rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                            <CardContent className="p-6 md:p-8 flex flex-col gap-8">
                                <div className="w-full overflow-x-auto pb-4 pr-4 no-scrollbar">
                                    <div className="flex items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-2">
                                            <Activity size={16} strokeWidth={2.5} className="text-emerald-400 dark:text-emerald-500" />
                                            <h3 className="text-[13px] font-black tracking-wider uppercase text-foreground">Platform Activity</h3>
                                        </div>
                                        <Select value={activityYear} onValueChange={setActivityYear}>
                                            <SelectTrigger className="w-[130px] h-8 text-[10px] font-bold uppercase tracking-wider bg-transparent border-border/50 focus:ring-emerald-500/50">
                                                <SelectValue placeholder="Select Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="last_12M">Last 12 Months</SelectItem>
                                                <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                                                <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                                                <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="min-w-max">
                                        {(() => {
                                            const today = new Date();
                                            let startDate: Date;
                                            let endDate: Date;
                                            let totalWeeks = 0;

                                            if (activityYear === 'last_12M') {
                                                totalWeeks = 52;
                                                startDate = new Date(today);
                                                startDate.setDate(today.getDate() - (totalWeeks * 7));
                                                startDate.setDate(startDate.getDate() - startDate.getDay());
                                                endDate = new Date(today);
                                            } else {
                                                const year = parseInt(activityYear);
                                                startDate = new Date(year, 0, 1);
                                                startDate.setDate(startDate.getDate() - startDate.getDay()); // Go back to Sunday
                                                endDate = new Date(year, 11, 31);
                                                const msDiff = endDate.getTime() - startDate.getTime();
                                                totalWeeks = Math.ceil(msDiff / (1000 * 60 * 60 * 24 * 7)) + 1;
                                            }

                                            const weeks: any[] = [];
                                            let monthLabels: { label: string; offset: number }[] = [];
                                            let currentMonth = -1;

                                            for (let w = 0; w < totalWeeks; w++) {
                                                const week: any[] = [];
                                                const weekDate = new Date(startDate);
                                                weekDate.setDate(startDate.getDate() + (w * 7));

                                                const labelDate = new Date(weekDate);
                                                labelDate.setDate(weekDate.getDate() + 3);

                                                if (labelDate.getMonth() !== currentMonth) {
                                                    currentMonth = labelDate.getMonth();
                                                    monthLabels.push({
                                                        label: labelDate.toLocaleDateString('en-US', { month: 'short' }),
                                                        offset: w
                                                    });
                                                }

                                                for (let d = 1; d <= 5; d++) {
                                                    const dayDate = new Date(weekDate);
                                                    dayDate.setDate(weekDate.getDate() + d);
                                                    const key = dayDate.toISOString().split('T')[0];
                                                    week.push({ count: stats.activityHeatmap[key] || 0, date: key });
                                                }
                                                weeks.push(week);
                                            }

                                            monthLabels = monthLabels.filter((m, i, arr) => {
                                                if (i === 0 && arr.length > 1 && arr[1].offset - m.offset < 3) return false;
                                                return true;
                                            });

                                            return (
                                                <div className="flex flex-col select-none">
                                                    {/* Month Labels */}
                                                    <div className="flex relative h-5 mb-2">
                                                        {monthLabels.map((m, i) => (
                                                            <span key={i} className="absolute text-[11px] font-medium text-muted-foreground/50" style={{ left: `${m.offset * 16}px` }}> {/* ~16px per column */}
                                                                {m.label}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {/* Day Labels - Only Mon, Wed, Fri */}
                                                        <div className="flex flex-col h-[76px] justify-between text-[9px] font-bold text-muted-foreground/40 uppercase">
                                                            <span className="h-[12px] flex items-center pr-1">Mon</span>
                                                            <span className="h-[12px] flex items-center pr-1">Wed</span>
                                                            <span className="h-[12px] flex items-center pr-1">Fri</span>
                                                        </div>

                                                        {/* Grid */}
                                                        <div className="flex gap-[4px]">
                                                            {weeks.map((week, wIdx) => (
                                                                <div key={wIdx} className="flex flex-col gap-[4px]">
                                                                    {week.map((day: any, dIdx: number) => {
                                                                        const val = day.count;
                                                                        const colorClass = val === 0 ? 'bg-slate-200/70 dark:bg-zinc-800'
                                                                            : val < 3 ? 'bg-[#9be9a8] dark:bg-emerald-900/60'
                                                                                : val < 6 ? 'bg-[#40c463] dark:bg-emerald-600'
                                                                                    : val < 10 ? 'bg-[#30a14e] dark:bg-emerald-500'
                                                                                        : 'bg-[#216e39] dark:bg-emerald-400';
                                                                        return (
                                                                            <div
                                                                                key={dIdx}
                                                                                title={`${val} activities on ${day.date}`}
                                                                                className={`w-[12px] h-[12px] rounded-[3px] transition-all duration-200 ${colorClass} hover:scale-150 relative z-0 hover:z-10 hover:ring-2 hover:ring-emerald-400/50 hover:shadow-md cursor-pointer`}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Footer Options */}
                                                    <div className="flex items-center justify-between mt-4">
                                                        <span className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-help italic">
                                                            Learn how we count contributions
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-muted-foreground/50">Less</span>
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-slate-200/70 dark:bg-zinc-800" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#9be9a8] dark:bg-emerald-900/60" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#40c463] dark:bg-emerald-600" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#30a14e] dark:bg-emerald-500" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#216e39] dark:bg-emerald-400" />
                                                            <span className="text-[10px] text-muted-foreground/50">More</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="w-full flex flex-col justify-start pt-6 border-t border-border/40">
                                    <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">Recent Logs</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3.5">
                                        {listData.orgActivities.slice(0, 6).map((act, i) => (
                                            <div key={i} className="flex gap-2.5 items-start px-1 group cursor-pointer">
                                                <div className="w-1.5 h-1.5 rounded-sm bg-emerald-400 mt-1 shrink-0 group-hover:bg-emerald-500 transition-colors" />
                                                <p className="text-[9.5px] font-bold text-foreground/80 leading-snug uppercase pt-0.5 group-hover:text-foreground transition-colors line-clamp-2">
                                                    {act.activity_name || act.category}
                                                </p>
                                            </div>
                                        ))}
                                        {listData.orgActivities.length === 0 && (
                                            <p className="text-[10px] text-muted-foreground italic">No recent logs.</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* INVENTORY CHART */}
                        <Card className="lg:col-span-4 rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex flex-col">
                            <CardHeader className="p-6 md:p-8 pb-0 border-none">
                                <CardTitle className="text-[13px] font-black tracking-wider uppercase text-foreground">Inventory</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center">
                                {/* The Pie Chart */}
                                <div className="w-full h-44 relative mb-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <ReTooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'hsl(var(--card))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                                            <Pie
                                                data={Object.entries(stats.assetBreakdown.categories).map(([name, value], idx) => ({ name, value, color: ['#3b82f6', '#10b981', '#111827', '#f59e0b', '#8b5cf6', '#ef4444'][idx % 6] }))}
                                                innerRadius={65} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none"
                                            >
                                                {Object.entries(stats.assetBreakdown.categories).map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#111827', '#f59e0b', '#8b5cf6', '#ef4444'][index % 6]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                                        <span className="text-3xl font-black text-foreground tracking-tight leading-none">{stats.totalITAssets}</span>
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total</span>
                                    </div>
                                </div>

                                {/* Custom Legend Grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-5 w-full max-w-[200px] mt-auto">
                                    {Object.entries(stats.assetBreakdown.categories).slice(0, 4).map(([name, value], idx) => (
                                        <div key={name} className="flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]" style={{ backgroundColor: ['#3b82f6', '#10b981', '#111827', '#f59e0b'][idx % 4] }} />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black leading-none text-foreground">{value as number}</span>
                                                <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground mt-1 truncate max-w-[70px]">{name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 5. Recent Projects Table */}
                    <Card className="rounded-xl border-border shadow-sm overflow-hidden bg-card">
                        <CardHeader className="p-5 border-b border-border/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-tight">Project Initiatives</CardTitle>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                    <Input
                                        placeholder="Search projects..."
                                        className="h-8 w-[200px] pl-8 text-[10px] rounded-lg bg-muted/40 border-border/50 font-medium"
                                        value={projectSearch}
                                        onChange={(e) => setProjectSearch(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="sm" className=".5 border-border/50 text-muted-foreground">
                                    <RefreshCcw size={12} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest h-10">Project Name</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest h-10">Department</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest h-10">Status</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest h-10">Timeline</TableHead>
                                        <TableHead className="text-right text-[9px] font-bold uppercase tracking-widest h-10">Priority</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProjects.length > 0 ? paginatedProjects.map((item, idx) => (
                                        <TableRow key={item.id} className="hover:bg-muted/20 border-border/50 transition-colors">
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${idx % 2 === 0 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                        {item.name?.charAt(0) || 'P'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold truncate uppercase">{item.name}</p>
                                                        <p className="text-[8px] text-muted-foreground uppercase font-medium">Ref: PJ-{2000 + item.id}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{item.department || 'GENERAL'}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={item.status} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1.5 w-24">
                                                    <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase">
                                                        <span>Progress</span>
                                                        <span>{item.progress}%</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${item.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${item.priority === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                                    {item.priority || 'Normal'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                                No projects found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <div className="p-4 border-t border-border/50 flex items-center justify-between">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Showing {paginatedProjects.length} of {filteredProjects.length} initiatives</p>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="sm" className="w-7 border-border/50" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}><ChevronRight size={12} className="rotate-180" /></Button>
                                    <Button variant="outline" size="sm" className="w-7 bg-primary/10 border-primary/20 text-primary font-bold text-[10px]">{currentPage}</Button>
                                    <Button variant="outline" size="sm" className="w-7 border-border/50" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}><ChevronRight size={12} /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

