'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
    Search, Filter, Plus, FileText, CheckCircle2, Clock,
    AlertTriangle, X, ChevronLeft, ChevronRight, MoreHorizontal,
    Download, Trash2, Edit, Eye, User, Calendar,
    Presentation, XCircle, Play, Maximize2, Minimize2,
    Zap, RefreshCcw, BarChart3, Sun, Moon, ArrowUpRight,
    TrendingUp, Activity, LayoutDashboard, Globe, Database,
    FileSpreadsheet, SlidersHorizontal, ChevronsLeft, ChevronsRight,
    ClipboardList, AlertCircle, Loader2, Mic, Bell, Info, FilterX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../translations';
import { supabase } from '../lib/supabaseClient';
import { ActivityLog } from '../types';
import { ActivityFormModal } from './ActivityFormModal';
import { UserAvatar } from './UserAvatar';
import { exportToExcel } from '../lib/excelExport';
import { StatCard } from './StatCard';
import { DangerConfirmModal } from './DangerConfirmModal';
import { ModalWrapper } from './ui/ModalWrapper';

// ─── Stat Card Component (lndev/ui Taskplus Style) ─────────────────────────────

// Removed local ActivityStatCard in favor of global StatCard

// ─── Status Badge Component (Shadcn Style) ──────────────────────────────────
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/PageHeader';


const getCategoryConfig = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('procure') || cat.includes('beli') || cat.includes('keuangan') || cat.includes('pembelian')) {
        return {
            icon: <FileSpreadsheet className="w-[15px] h-[15px] text-emerald-500 dark:text-emerald-400" />,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20'
        };
    }
    if (cat.includes('web') || cat.includes('dev') || cat.includes('soft') || cat.includes('code')) {
        return {
            icon: <Globe className="w-[15px] h-[15px] text-indigo-500 dark:text-indigo-400" />,
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20'
        };
    }
    if (cat.includes('it') || cat.includes('network') || cat.includes('sys') || cat.includes('infra') || cat.includes('tech')) {
        return {
            icon: <Zap className="w-[15px] h-[15px] text-amber-500 dark:text-amber-400" />,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20'
        };
    }
    if (cat.includes('hr') || cat.includes('people') || cat.includes('recru') || cat.includes('logis') || cat.includes('admin')) {
        return {
            icon: <User className="w-[15px] h-[15px] text-violet-500 dark:text-violet-400" />,
            color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20'
        };
    }
    // Fallback
    return {
        icon: <FileText className="w-[15px] h-[15px] text-slate-500 dark:text-zinc-400" />,
        color: 'text-slate-600 dark:text-zinc-400 bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/20'
    };
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'Completed':
            return (
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-none bg-emerald-500/10 dark:bg-emerald-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    {status}
                </Badge>
            );
        case 'In Progress':
            return (
                <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-none bg-blue-500/10 dark:bg-blue-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                    {status}
                </Badge>
            );
        case 'Pending':
            return (
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-none bg-amber-500/10 dark:bg-amber-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                    {status}
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="text-slate-600 dark:text-slate-400 border-none bg-slate-500/10 dark:bg-slate-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400" />
                    {status}
                </Badge>
            );
    }
};

// ─── Category Badge ────────────────────────────────────────────────────────────

const CategoryBadge = ({ category }: { category: string }) => {
    const config = getCategoryConfig(category);
    return (
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", config.color)}>
            {category}
        </span>
    );
};

// ─── Priority Badge ────────────────────────────────────────────────────────────

const PriorityBadge = ({ type }: { type: string }) => {
    switch (type) {
        case 'Critical':
            return (
                <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-none bg-rose-500/10 dark:bg-rose-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    {type}
                </Badge>
            );
        case 'Major':
            return (
                <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-none bg-orange-500/10 dark:bg-orange-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {type}
                </Badge>
            );
        case 'Minor':
            return (
                <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-none bg-blue-500/10 dark:bg-blue-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {type}
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="text-slate-600 dark:text-slate-400 border-none bg-slate-500/10 dark:bg-slate-500/15 font-medium text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    {type}
                </Badge>
            );
    }
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const ActivityDetailModal = ({ isOpen, onClose, activity, userAvatars }: { isOpen: boolean; onClose: () => void; activity: ActivityLog | null; userAvatars: any }) => {
    const { language, t } = useLanguage();

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose}>
            {activity && (
                <>
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-border/40 flex justify-between items-start bg-muted/20 shrink-0">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <PriorityBadge type={activity.type} />
                                <StatusBadge status={activity.status} />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground tracking-tight leading-tight">{activity.activityName}</h2>
                            <p className="text-xs text-muted-foreground mt-1">{activity.category} · {activity.location}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="p-5 rounded-lg bg-muted/20 border border-border/40">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Fulfillment Status</p>
                                <StatusBadge status={activity.status} />
                            </div>
                            <div className="p-5 rounded-lg bg-muted/20 border border-border/40">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Resolution Duration</p>
                                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                                    <Clock size={16} className="text-primary" />
                                    {activity.duration || '-'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="p-5 rounded-lg bg-muted/20 border border-border/40">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Request Initiator</p>
                                <div className="flex items-center gap-3">
                                    <UserAvatar name={activity.requester} url={userAvatars[activity.requester] || activity.avatarUrl} size="sm" className="border-2 border-border shadow-sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground leading-none truncate">{activity.requester}</p>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">{activity.department}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 rounded-lg bg-muted/20 border border-border/40">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Handling Personnel</p>
                                <div className="flex items-center gap-3">
                                    <UserAvatar name={activity.itPersonnel} url={userAvatars[activity.itPersonnel]} size="sm" className="border-2 border-border shadow-sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground leading-none truncate">{activity.itPersonnel}</p>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">IT Solutions Group</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {activity.remarks && (
                            <div className="p-5 rounded-lg bg-muted/20 border border-border/40">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Fulfillment Remarks</p>
                                <p className="text-sm text-foreground leading-relaxed italic">
                                    "{activity.remarks}"
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between pt-6 border-t border-border/40">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Logged On</p>
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Calendar size={13} />
                                    {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-3.5 border-t border-border/40 gap-2 flex justify-end bg-muted/10 shrink-0">
                        <Button variant="outline" onClick={onClose}>
                            Close View
                        </Button>
                    </div>
                </>
            )}
        </ModalWrapper>
    );
};

// ─── Danger Modal ─────────────────────────────────────────────────────────────
// (Using global DangerConfirmModal)

// ─── Main Component ────────────────────────────────────────────────────────────

export const ActivityLogManager = ({ currentUser }: { currentUser: any }) => {
    const { language, setLanguage, t } = useLanguage();
    const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // UI State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [deleteActivity, setDeleteActivity] = useState<ActivityLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // RBAC Logic
    const roleLower = (currentUser?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
    const isStaff = roleLower === 'staff';
    const canManage = isAdmin || isSuperAdmin || isStaff;
    const canDelete = isAdmin || isSuperAdmin;

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchActivities = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedData: ActivityLog[] = data.map((item: any) => ({
                    id: item.id,
                    activityName: item.activity_name,
                    category: item.category,
                    requester: item.requester,
                    department: item.department,
                    itPersonnel: item.it_personnel,
                    type: item.type,
                    status: item.status,
                    duration: item.duration,
                    remarks: item.remarks,
                    location: item.location,
                    createdAt: item.created_at,
                    completedAt: item.completed_at,
                    avatarUrl: item.avatar_url
                }));
                setActivities(formattedData);
            }

            const [extDataRes, deptDataRes, userDataRes] = await Promise.all([
                supabase.from('phone_extensions').select('name, dept, photo_url'),
                supabase.from('departments').select('name').order('name'),
                supabase.from('user_accounts').select('username, full_name, avatar_url')
            ]);

            const avatarMap: Record<string, string> = {};
            const userList: any[] = [];

            if (extDataRes.data) {
                extDataRes.data.forEach((u: any) => {
                    userList.push({
                        name: u.name,
                        department: u.dept || 'Staff',
                        avatarUrl: u.photo_url
                    });
                    if (u.photo_url) {
                        avatarMap[u.name] = u.photo_url;
                    }
                });
            }

            if (userDataRes.data) {
                userDataRes.data.forEach((u: any) => {
                    if (u.avatar_url) {
                        avatarMap[u.username] = u.avatar_url;
                        if (u.full_name) {
                            avatarMap[u.full_name] = u.avatar_url;
                        }
                    }
                });
            }

            setUserAvatars(avatarMap);
            setUsers(userList);

            if (deptDataRes.data) {
                setDepartments(deptDataRes.data.map((d: any) => d.name));
            }

        } catch (error: any) {
            console.error('Error fetching activities:', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateFilterType, setDateFilterType] = useState('All');

    useEffect(() => {
        fetchActivities();
        const subscription = supabase
            .channel('activity_logs_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
                fetchActivities();
            })
            .subscribe();
        return () => { subscription.unsubscribe(); };
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        activities.forEach(a => { if (a.category) set.add(a.category); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [activities]);

    const filteredActivities = activities.filter(activity => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch = !q || [
            activity.activityName,
            activity.requester,
            activity.itPersonnel,
            activity.category,
            activity.department,
            activity.location,
            activity.type,
            activity.remarks
        ].some(field => (field ?? '').toString().toLowerCase().includes(q));
        const matchesStatus = statusFilter === 'All' || activity.status === statusFilter;
        const matchesCategory = categoryFilter === 'All' || activity.category === categoryFilter;

        let matchesDate = true;
        if (startDate && endDate) {
            const activityDate = new Date(activity.createdAt).toISOString().split('T')[0];
            matchesDate = activityDate >= startDate && activityDate <= endDate;
        }

        return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, categoryFilter, startDate, endDate]);

    const handleExportExcel = () => {
        if (filteredActivities.length === 0) return;
        const dataToExport = filteredActivities
            .filter(act => !act.remarks?.includes("Auto-generated purchase record from Requisition") && !act.activityName?.includes("Auto-generated purchase record from Requisition"))
            .map(act => ({
                "Activity Name": act.activityName,
                "Created At": act.createdAt ? new Date(act.createdAt).toLocaleString() : "-",
                "Completed At": act.completedAt ? new Date(act.completedAt).toLocaleString() : "-",
                "Category": act.category,
                "Requester": act.requester,
                "Department": act.department,
                "IT Personnel": act.itPersonnel,
                "Priority": act.type,
                "Status": act.status,
                "Duration": act.duration || "-",
                "Location": act.location,
                "Remarks": act.remarks || "-"
            }));
        exportToExcel(dataToExport, `GESIT-ACTIVITY-${new Date().toISOString().split('T')[0]}`);
    };

    const [isPresenting, setIsPresenting] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    const stats = useMemo(() => {
        const total = filteredActivities.length;
        const complete = filteredActivities.filter(a => a.status === 'Completed').length;
        const active = filteredActivities.filter(a => a.status === 'In Progress').length;
        const highAlerts = filteredActivities.filter(a => a.type === 'Critical' || a.type === 'Major').length;
        return { total, complete, active, highAlerts };
    }, [filteredActivities]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    useEffect(() => {
        if (isPresenting) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isPresenting]);

    const totalPages = Math.max(Math.ceil(filteredActivities.length / rowsPerPage), 1);
    const paginatedActivities = filteredActivities.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const startItem = (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, filteredActivities.length);

    const handleDateFilterTypeChange = (type: string) => {
        setDateFilterType(type);
        const today = new Date();
        if (type === 'All') { setStartDate(''); setEndDate(''); }
        else if (type === 'Today') { setStartDate(today.toISOString().split('T')[0]); setEndDate(today.toISOString().split('T')[0]); }
        else if (type === 'Week') {
            const first = new Date(today.setDate(today.getDate() - today.getDay()));
            const last = new Date(today.setDate(today.getDate() - today.getDay() + 6));
            setStartDate(first.toISOString().split('T')[0]); setEndDate(last.toISOString().split('T')[0]);
        } else if (type === 'Month') {
            setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
            setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
        } else if (type === 'Custom') {
            // Keep existing dates if any, or leave empty for user to fill
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

    // ─── Presenter Overlay ────────────────────────────────────────────────────

    const renderSlideshowOverlay = () => {
        if (!isPresenting) return null;
        const presentationActivities = [...filteredActivities].reverse();
        const currentActivity = presentationActivities[currentSlideIndex];
        return (
            <div className={`fixed inset-0 w-full h-full z-[5000] ${isDarkTheme ? 'bg-[#0f0f17]' : 'bg-[#f8fafc]'} flex flex-col items-center justify-center overflow-hidden m-0 p-0`}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-blue-600/10 rounded-full blur-[160px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-emerald-600/5 rounded-full blur-[160px]" />
                </div>

                <div className="absolute top-0 left-0 right-0 p-10 flex justify-between items-center z-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Activity className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <span className="block text-2xl font-black text-slate-900 dark:text-white leading-none">Activity Report</span>
                            <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Live Presentation Engine</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsDarkTheme(!isDarkTheme)} aria-label="Toggle Theme" className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800/50 text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                            {isDarkTheme ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
                        </button>
                        <button onClick={toggleFullScreen} aria-label="Toggle Fullscreen" className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800/50 text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                            {isFullScreen ? <Minimize2 size={20} strokeWidth={2.5} /> : <Maximize2 size={20} strokeWidth={2.5} />}
                        </button>
                        <button onClick={() => setIsPresenting(false)} className="px-6 py-4 rounded-xl bg-rose-500 text-white font-black text-[13px] hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2">
                            <XCircle size={18} strokeWidth={2.5} /> End Session
                        </button>
                    </div>
                </div>

                {currentActivity && (
                    <motion.div key={currentActivity.id} initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-40 w-full max-w-6xl px-12">
                        <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-100 dark:border-zinc-800 shadow-2xl p-20 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-6 transition-all duration-700">
                                <Activity size={300} strokeWidth={1} />
                            </div>

                            <div className="grid grid-cols-12 gap-16 items-center relative z-10">
                                <div className="col-span-4 flex flex-col items-center text-center border-r border-slate-50 dark:border-zinc-800/60 pr-16">
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                                        <UserAvatar name={currentActivity.requester} url={userAvatars[currentActivity.requester] || currentActivity.avatarUrl} size="xl" className="w-56 h-56 border-8 border-white dark:border-zinc-800 shadow-xl relative z-10" />
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">{currentActivity.requester}</div>
                                    <span className="text-[13px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em]">{currentActivity.department}</span>
                                    <div className="mt-8 flex flex-col gap-3 w-full">
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800">
                                            <p className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Location Anchor</p>
                                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{currentActivity.location}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-8">
                                    <div className="flex items-center gap-4 mb-8">
                                        <PriorityBadge type={currentActivity.type} />
                                        <StatusBadge status={currentActivity.status} />
                                        <CategoryBadge category={currentActivity.category} />
                                    </div>
                                    <h2 className="text-6xl font-black text-slate-900 dark:text-white mb-10 leading-[1.1] tracking-tighter">{currentActivity.activityName}</h2>
                                    {currentActivity.remarks && (
                                        <div className="p-10 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-800/30 mb-12 relative">
                                            <div className="absolute left-6 top-6 text-blue-200 dark:text-blue-900">
                                                <FileText size={40} strokeWidth={3} />
                                            </div>
                                            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300 italic leading-relaxed pl-14">
                                                "{currentActivity.remarks}"
                                            </p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-3 gap-10 pt-10 border-t border-slate-50 dark:border-zinc-800/60">
                                        <div>
                                            <span className="block text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-3">Support Unit</span>
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={currentActivity.itPersonnel} url={userAvatars[currentActivity.itPersonnel]} size="md" className="border-2 border-white dark:border-zinc-700" />
                                                <span className="text-lg font-black text-slate-900 dark:text-white leading-tight">{currentActivity.itPersonnel}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-3">Mission Duration</span>
                                            <div className="flex items-center gap-3 text-2xl font-black text-slate-900 dark:text-white">
                                                <Clock size={24} className="text-blue-500" strokeWidth={2.5} />
                                                {currentActivity.duration || '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="block text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-3">Logs Timestamp</span>
                                            <div className="flex items-center gap-3 text-2xl font-black text-emerald-500">
                                                <Calendar size={24} strokeWidth={2.5} />
                                                {formatDate(currentActivity.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="absolute bottom-16 flex items-center gap-10">
                    <button onClick={() => setCurrentSlideIndex(p => (p - 1 + presentationActivities.length) % presentationActivities.length)} aria-label="Previous Slide" className="p-6 rounded-full bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800/50 text-slate-400 hover:text-blue-600 transition-all shadow-xl hover:scale-110 active:scale-95"><ChevronLeft size={36} strokeWidth={2.5} /></button>
                    <div className="flex items-center gap-3 py-4 px-8 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800/50">
                        {presentationActivities.slice(0, 8).map((_, idx) => (
                            <div key={idx} onClick={() => setCurrentSlideIndex(idx)} role="button" aria-label={`Go to slide ${idx + 1}`} className={`rounded-full transition-all duration-500 cursor-pointer ${idx === currentSlideIndex ? 'w-10 h-3 bg-blue-600 shadow-lg shadow-blue-500/40' : 'w-3 h-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'}`} />
                        ))}
                        {presentationActivities.length > 8 && <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400 ml-2 uppercase tracking-widest leading-none">+{presentationActivities.length - 8} MORE</span>}
                    </div>
                    <button onClick={() => setCurrentSlideIndex(p => (p + 1) % presentationActivities.length)} aria-label="Next Slide" className="p-6 rounded-full bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800/50 text-slate-400 hover:text-blue-600 transition-all shadow-xl hover:scale-110 active:scale-95"><ChevronRight size={36} strokeWidth={2.5} /></button>
                </div>
            </div>
        );
    };

    // ─── Loading State ────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="p-6 md:p-8 space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-64" />
                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-48" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
                </div>
                <div className="h-[400px] bg-gray-200 dark:bg-gray-800 rounded-xl" />
            </div>
        );
    }

    // ─── Main Render ──────────────────────────────────────────────────────────

    return (
        <div className="w-full min-h-screen bg-transparent py-4 sm:py-6 px-0 sm:px-4 space-y-6 animate-in fade-in duration-200">
            {renderSlideshowOverlay()}

            {/* ─── Shadcn UI Header ─────────── */}
            <PageHeader title="Activity Logs" description="Monitor and manage all system activities.">
                <Button variant="outline" size="icon" aria-label="Start Live Presentation" onClick={() => { setIsPresenting(true); toggleFullScreen(); }}>
                    <Presentation className="w-4" />
                </Button>
                <Button variant="outline" onClick={handleExportExcel} className="h-9 px-3 shrink-0">
                    <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Export Excel</span>
                </Button>
                <Button variant="outline" size="icon" aria-label="Refresh Activities" onClick={fetchActivities} disabled={isLoading} className="shrink-0">
                    <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                {canManage && (
                    <Button
                        onClick={() => { setSelectedActivity(null); setIsFormOpen(true); }}
                        className="shrink-0"
                    >
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">New Activity</span>
                    </Button>
                )}
            </PageHeader>

            {/* ─── Shadcn Stat Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-6">
                <StatCard label="Total Activities" value={stats.total} icon={ClipboardList} percentageChange={5} subValue="vs last week" color="slate" />
                <StatCard label="Completed" value={stats.complete} icon={CheckCircle2} percentageChange={12} subValue="vs last week" color="emerald" status="on-track" />
                <StatCard label="In Progress" value={stats.active} icon={Activity} percentageChange={2} subValue="vs last week" color="blue" />
                <StatCard label="High Alert" value={stats.highAlerts} icon={AlertCircle} percentageChange={-5} subValue="vs last week" color="rose" status="at-risk" />
            </div>

            {/* ─── Activity List Table / Mobile List ──────────────────────── */}
            <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card">
                {/* Table Header / Search & Filters */}
                <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b p-4 sm:p-6">
                    <div>
                        <CardTitle>Recent Activities</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Comprehensive audit trail of internal activities.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto flex-1 max-w-3xl justify-end">
                        <div className="relative w-full sm:max-w-[240px] md:max-w-xs">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search name, category, dept, remarks..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-8 h-9 bg-muted/30 border-none rounded-md text-sm placeholder:text-muted-foreground/50 w-full"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <X size={14} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {dateFilterType === 'Custom' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-1.5 flex-1 sm:flex-none"
                                >
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="h-9 w-full sm:w-auto text-xs bg-transparent border border-input rounded-md"
                                    />
                                    <span className="text-muted-foreground text-xs shrink-0">to</span>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="h-9 w-full sm:w-auto text-xs bg-transparent border border-input rounded-md"
                                    />
                                </motion.div>
                            )}

                            <select
                                className="h-9 px-3 py-1 border border-input rounded-md text-xs font-medium bg-background text-foreground hover:bg-accent cursor-pointer outline-none flex-1 sm:flex-none"
                                value={dateFilterType}
                                aria-label="Filter by date range"
                                onChange={e => handleDateFilterTypeChange(e.target.value)}
                            >
                                <option value="All">All Time</option>
                                <option value="Today">Today</option>
                                <option value="Week">This Week</option>
                                <option value="Month">This Month</option>
                                <option value="Custom">Custom Period</option>
                            </select>
                        </div>

                        <div className="relative w-full sm:w-auto shrink-0">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <select
                                className="h-9 pl-9 pr-3 py-1 border border-input rounded-md text-xs font-medium bg-background text-foreground hover:bg-accent cursor-pointer outline-none appearance-none w-full sm:w-40"
                                value={statusFilter}
                                aria-label="Filter by status"
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>

                        <div className="relative w-full sm:w-auto shrink-0">
                            <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <select
                                className="h-9 pl-9 pr-3 py-1 border border-input rounded-md text-xs font-medium bg-background text-foreground hover:bg-accent cursor-pointer outline-none appearance-none w-full sm:w-44"
                                value={categoryFilter}
                                aria-label="Filter by category"
                                onChange={e => setCategoryFilter(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>

                {/* Table & Mobile Card List */}
                <CardContent className="p-0">
                    {/* Desktop View (Table) */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table className="table-fixed">
                            <TableHeader className="bg-muted/30 border-b border-border/50">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="pl-8 py-3 font-semibold text-xs text-foreground/80 w-[27%]">Activity Name</TableHead>
                                    <TableHead className="py-3 font-semibold text-xs text-foreground/80 w-[10%]">Status</TableHead>
                                    <TableHead className="py-3 font-semibold text-xs text-foreground/80 w-[8%]">Priority</TableHead>
                                    <TableHead className="py-3 font-semibold text-xs text-foreground/80 w-[15%]">Requester</TableHead>
                                    <TableHead className="py-3 font-semibold text-xs text-foreground/80 w-[10%]">Date</TableHead>
                                    <TableHead className="py-3 font-semibold text-xs text-foreground/80 w-[18%]">IT Personnel</TableHead>
                                    <TableHead className="py-3 pr-8 text-right font-semibold text-xs text-foreground/80 w-[12%]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedActivities.map((act) => (
                                    <TableRow
                                        key={act.id}
                                        className="group hover:bg-muted/30 border-b border-border/30 transition-colors"
                                    >
                                        <TableCell className="pl-8 py-5 cursor-pointer overflow-hidden" onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}>
                                            <div className="flex items-center gap-4 min-w-0">
                                                {(() => {
                                                    const config = getCategoryConfig(act.category);
                                                    return (
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm border", config.color, "group-hover:scale-105")}>
                                                            {config.icon}
                                                        </div>
                                                    );
                                                })()}
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors block truncate max-w-[240px] md:max-w-xs">{act.activityName}</span>
                                                    <div className="mt-1.5"><CategoryBadge category={act.category} /></div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="cursor-pointer" onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}><StatusBadge status={act.status} /></TableCell>
                                        <TableCell className="cursor-pointer" onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}><PriorityBadge type={act.type} /></TableCell>
                                        <TableCell className="cursor-pointer overflow-hidden" onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <UserAvatar name={act.requester} url={userAvatars[act.requester] || act.avatarUrl} size="sm" className="border-2 border-border shadow-sm shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-medium text-sm block leading-none text-foreground truncate max-w-[120px]">{act.requester}</span>
                                                    <span className="text-xs text-muted-foreground mt-1 block truncate max-w-[120px]">{act.department}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={13} className="shrink-0" />
                                                <span>{formatDate(act.createdAt)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="cursor-pointer overflow-hidden" onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <UserAvatar name={act.itPersonnel} url={userAvatars[act.itPersonnel]} size="sm" className="border-2 border-border shadow-sm shrink-0" />
                                                <span className="font-medium text-sm text-foreground truncate max-w-[120px]">{act.itPersonnel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex items-center justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="View Activity Details"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); setIsDetailOpen(true); }}
                                                    className="w-8 h-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
                                                >
                                                    <Eye size={15} />
                                                </Button>

                                                {(isAdmin || isSuperAdmin || (isStaff && act.itPersonnel === (currentUser?.fullName || currentUser?.username))) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Edit Activity"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); setIsFormOpen(true); }}
                                                        className="w-8 h-8 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200"
                                                    >
                                                        <Edit size={15} />
                                                    </Button>
                                                )}

                                                {(isAdmin || isSuperAdmin) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Delete Activity"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteActivity(act); }}
                                                        className="w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200"
                                                    >
                                                        <Trash2 size={15} />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View (Card List) */}
                    <div className="block md:hidden divide-y divide-border/60">
                        {paginatedActivities.map((act) => {
                            const config = getCategoryConfig(act.category);
                            return (
                                <div
                                    key={act.id}
                                    onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}
                                    className="p-4 space-y-3 hover:bg-muted/40 transition-colors cursor-pointer"
                                >
                                    {/* First Row: Category & Badges */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border shrink-0", config.color)}>
                                                {config.icon}
                                            </div>
<span className="text-xs font-medium text-muted-foreground">
                                                        {act.category}
                                                    </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <PriorityBadge type={act.type} />
                                            <StatusBadge status={act.status} />
                                        </div>
                                    </div>

                                    {/* Second Row: Activity Title */}
                                    <div>
                                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                            {act.activityName}
                                        </h3>
                                    </div>

                                    {/* Third Row: Requester & IT Personnel & Date */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserAvatar name={act.requester} url={userAvatars[act.requester] || act.avatarUrl} size="xs" className="shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <span className="text-xs text-muted-foreground block font-medium leading-none">Req</span>
                                                <span className="font-medium text-foreground block truncate mt-0.5">{act.requester}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserAvatar name={act.itPersonnel} url={userAvatars[act.itPersonnel]} size="xs" className="shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <span className="text-xs text-muted-foreground block font-medium leading-none">IT Personnel</span>
                                                <span className="font-medium text-foreground block truncate mt-0.5">{act.itPersonnel}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fourth Row: Date & Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar size={11} />
                                            <span>{formatDate(act.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="View Activity Details"
                                                onClick={() => { setSelectedActivity(act); setIsDetailOpen(true); }}
                                                className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                            >
                                                <Eye size={14} />
                                            </Button>

                                            {(isAdmin || isSuperAdmin || (isStaff && act.itPersonnel === (currentUser?.fullName || currentUser?.username))) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Edit Activity"
                                                    onClick={() => { setSelectedActivity(act); setIsFormOpen(true); }}
                                                    className="w-7 h-7 rounded-lg text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                            )}

                                            {(isAdmin || isSuperAdmin) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Delete Activity"
                                                    onClick={() => setDeleteActivity(act)}
                                                    className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {paginatedActivities.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shadow-inner border border-border">
                                    <ClipboardList size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium text-lg leading-tight">No records found</p>
                                    <p className="text-sm text-muted-foreground">We couldn't find any activities matching your current search or filters.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => { setSearchTerm(''); setStatusFilter('All'); setDateFilterType('All'); }}
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/60 bg-muted/20">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-muted-foreground w-full sm:w-auto">
                            <span>Showing {filteredActivities.length > 0 ? startItem : 0} to {endItem} of {filteredActivities.length}</span>

                            <div className="flex items-center gap-3 sm:ml-2 sm:pl-6 sm:border-l border-border/60">
                                <span>Rows</span>
                                <select
                                    value={rowsPerPage}
                                    aria-label="Rows per page"
                                    onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="bg-transparent border-none outline-none text-primary font-semibold cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <Button variant="ghost" size="icon" aria-label="Refresh" className="w-7 h-7 hover:bg-background/80" onClick={fetchActivities} title="Refresh">
                                    <RefreshCcw size={12} className="text-muted-foreground/60" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="icon" aria-label="First page" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-9 h-9 border-border/50">
                                <ChevronsLeft size={16} />
                            </Button>
                            <Button variant="outline" size="icon" aria-label="Previous page" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-9 h-9 border-border/50">
                                <ChevronLeft size={16} />
                            </Button>

                            <div className="flex items-center justify-center min-w-9 h-9 rounded-md bg-muted text-foreground text-xs font-semibold">
                                {currentPage}
                            </div>

                            <Button variant="outline" size="icon" aria-label="Next page" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-9 h-9 border-border/50">
                                <ChevronRight size={16} />
                            </Button>
                            <Button variant="outline" size="icon" aria-label="Last page" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-9 h-9 border-border/50">
                                <ChevronsRight size={16} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Modals ──────────────────────────────────────────────────── */}
            <ActivityDetailModal 
                isOpen={isDetailOpen} 
                onClose={() => setIsDetailOpen(false)} 
                activity={selectedActivity} 
                userAvatars={userAvatars} 
            />
            <ActivityFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={async (data) => {
                    setIsActionLoading(true);
                    try {
                        const payload = {
                            activity_name: data.activityName,
                            category: data.category,
                            requester: data.requester,
                            department: data.department,
                            it_personnel: data.itPersonnel,
                            type: data.type,
                            status: data.status,
                            remarks: data.remarks,
                            location: data.location,
                            duration: data.duration,
                            created_at: data.createdAt,
                            updated_at: data.updatedAt,
                            completed_at: data.completedAt
                        };
                        if (selectedActivity) {
                            await supabase.from('activity_logs').update(payload).eq('id', selectedActivity.id);
                        } else {
                            await supabase.from('activity_logs').insert([payload]);
                        }
                        fetchActivities();
                        setIsFormOpen(false);
                    } catch (err) { console.error(err); }
                    finally { setIsActionLoading(false); }
                }}
                initialData={selectedActivity}
                currentUserName={currentUser?.fullName || currentUser?.username}
                users={users}
                departments={departments.length > 0 ? departments : ['IT', 'Finance', 'HR', 'Operations', 'Sales', 'Marketing', 'Production', 'Logistics', 'Security']}
            />
            <DangerConfirmModal
                isOpen={!!deleteActivity}
                onClose={() => setDeleteActivity(null)}
                title="Delete Activity"
                message={<>Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-slate-100">{deleteActivity?.activityName}</span>? This action cannot be undone.</>}
                isLoading={isActionLoading}
                entityName={deleteActivity?.activityName}
                onConfirm={async () => {
                    if (!deleteActivity) return;
                    setIsActionLoading(true);
                    try {
                        await supabase.from('activity_logs').delete().eq('id', deleteActivity.id);
                        fetchActivities();
                        setDeleteActivity(null);
                    } catch (err) { console.error(err); }
                    finally { setIsActionLoading(false); }
                }}
            />
        </div>
    );
};

