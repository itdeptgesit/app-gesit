'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar, Plus, ChevronLeft, ChevronRight, RefreshCcw,
    Loader2, Pencil, Trash2, CalendarRange, LayoutList, X,
    Clock, User, Tag, AlertCircle, CheckCircle2, LogIn, LogOut, RefreshCw,
    MapPin, Users, Cloud, Globe
} from 'lucide-react';
import { WeeklyPlan, UserAccount } from '../types';
import { sendGmailNotification } from '../lib/googleApi';
import { WeeklyTaskModal } from './WeeklyTaskModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    signInWithGoogle, signOutGoogle, isGoogleConnected,
    fetchEventsForMonth, GCalEvent, gcalStartDate, gcalEndDate, gcalStartTime, gcalEndTime,
    GCalCalendar, fetchCalendarList
} from '../lib/googleCalendar';

const INDONESIAN_HOLIDAYS: { [key: string]: string } = {
    // 2025 — National Holidays
    '2025-01-01': 'Tahun Baru Masehi',
    '2025-01-27': 'Isra Mi\'raj',
    '2025-01-29': 'Tahun Baru Imlek',
    '2025-03-29': 'Hari Raya Nyepi',
    '2025-03-31': 'Idul Fitri',
    '2025-04-01': 'Idul Fitri',
    '2025-04-18': 'Wafat Yesus Kristus',
    '2025-05-01': 'Hari Buruh Internasional',
    '2025-05-12': 'Hari Raya Waisak',
    '2025-05-29': 'Kenaikan Yesus Kristus',
    '2025-06-01': 'Hari Lahir Pancasila',
    '2025-06-06': 'Idul Adha',
    '2025-06-27': 'Tahun Baru Islam',
    '2025-08-17': 'Hari Kemerdekaan RI',
    '2025-09-05': 'Maulid Nabi Muhammad',
    '2025-12-25': 'Hari Raya Natal',
    // 2025 — Cuti Bersama
    '2025-01-28': 'Cuti Bersama Isra Mikraj',
    '2025-01-30': 'Cuti Bersama Imlek',
    '2025-03-28': 'Cuti Bersama Nyepi',
    '2025-04-02': 'Cuti Bersama Idul Fitri',
    '2025-04-03': 'Cuti Bersama Idul Fitri',
    '2025-04-04': 'Cuti Bersama Idul Fitri',
    '2025-04-07': 'Cuti Bersama Idul Fitri',
    '2025-05-13': 'Cuti Bersama Waisak',
    '2025-05-30': 'Cuti Bersama Kenaikan Yesus',
    '2025-12-26': 'Cuti Bersama Natal',
    // 2026 — National Holidays
    '2026-01-01': 'Tahun Baru Masehi',
    '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
    '2026-02-17': 'Tahun Baru Imlek 2577',
    '2026-03-19': 'Hari Raya Nyepi',
    '2026-03-21': 'Idul Fitri 1447 H',
    '2026-03-22': 'Idul Fitri 1447 H',
    '2026-04-03': 'Wafat Yesus Kristus',
    '2026-04-05': 'Kebangkitan Yesus Kristus',
    '2026-05-01': 'Hari Buruh Internasional',
    '2026-05-14': 'Kenaikan Yesus Kristus',
    '2026-05-27': 'Idul Adha 1447 H',
    '2026-05-31': 'Hari Raya Waisak',
    '2026-06-01': 'Hari Lahir Pancasila',
    '2026-06-16': 'Tahun Baru Islam 1448 H',
    '2026-08-17': 'Hari Kemerdekaan RI',
    '2026-08-25': 'Maulid Nabi Muhammad SAW',
    '2026-12-25': 'Hari Raya Natal',
    // 2026 — Cuti Bersama
    '2026-02-16': 'Cuti Bersama Imlek',
    '2026-03-18': 'Cuti Bersama Nyepi',
    '2026-03-20': 'Cuti Bersama Idul Fitri',
    '2026-03-23': 'Cuti Bersama Idul Fitri',
    '2026-03-24': 'Cuti Bersama Idul Fitri',
    '2026-05-15': 'Cuti Bersama Kenaikan Yesus',
    '2026-05-28': 'Cuti Bersama Idul Adha',
    '2026-12-24': 'Cuti Bersama Natal',
};

// Cuti Bersama get amber styling instead of red
const isCutiBersamaDate = (dateStr: string) =>
    !!INDONESIAN_HOLIDAYS[dateStr]?.toLowerCase().includes('cuti bersama');

// Category color mapping (vibrant, like reference image)
const CATEGORY_COLORS: { [key: string]: { bg: string; text: string; dot: string } } = {
    'Meeting': { bg: 'bg-indigo-600', text: 'text-white', dot: 'bg-indigo-500' },
    'Maintenance': { bg: 'bg-amber-500', text: 'text-white', dot: 'bg-amber-500' },
    'Project': { bg: 'bg-violet-600', text: 'text-white', dot: 'bg-violet-500' },
    'Support': { bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-emerald-500' },
    'Default': { bg: 'bg-slate-500', text: 'text-white', dot: 'bg-slate-400' },
};

// Priority badges
const PRIORITY_STYLE: { [key: string]: string } = {
    'High': 'border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400',
    'Medium': 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    'Low': 'border border-slate-500/20 bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

// Status badge
const STATUS_STYLE: { [key: string]: string } = {
    'Done': 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    'In Progress': 'border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    'To Do': 'border border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400',
    'Pending': 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

interface WeeklyPlanManagerProps {
    currentUser: UserAccount | null;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseDate = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const getSafeDateInfo = (dateStr: string) => {
    if (dateStr === 'Undated') return { dayNum: '??', weekday: 'No Date', monthYear: '' };
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return {
            dayNum: String(d),
            weekday: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
            monthYear: dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        };
    } catch (e) {
        return { dayNum: '??', weekday: 'Error', monthYear: '' };
    }
};

export const WeeklyPlanManager = ({ currentUser }: WeeklyPlanManagerProps): React.ReactElement => {
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<WeeklyPlan[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'Month' | 'List'>('Month');
    const [editingTask, setEditingTask] = useState<WeeklyPlan | null>(null);
    const [deleteTask, setDeleteTask] = useState<WeeklyPlan | null>(null);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<WeeklyPlan | null>(null);
    const [locationFilter, setLocationFilter] = useState<string>('');
    const [dateScope, setDateScope] = useState<'today' | 'month'>('today');
    const popoverRef = useRef<HTMLDivElement>(null);

    // ── Google Calendar state ──────────────────────────────────────────────
    const [gcalConnected, setGcalConnected] = useState(isGoogleConnected());
    const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
    const [gcalLoading, setGcalLoading] = useState(false);
    const [gcalConnecting, setGcalConnecting] = useState(false);
    const [selectedGcalEvent, setSelectedGcalEvent] = useState<GCalEvent | null>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<Date | null>(null);

    const roleLower = (currentUser?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
    const isStaff = roleLower === 'staff';
    const canManage = isAdmin || isSuperAdmin || isStaff;
    const canDelete = isAdmin || isSuperAdmin;

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('weekly_plans')
                .select('id, task, description, assignee, assignee_email, assignee_avatar, gdrive_attachments, priority, status, due_date, start_date, week, category, related_purchase_id, start_time, location');
            if (error) throw error;
            if (data) {
                setTasks(data.map(t => ({
                    id: t.id,
                    task: t.task,
                    description: t.description,
                    remarks: t.description,
                    assignee: t.assignee,
                    assigneeEmail: t.assignee_email,
                    assigneeAvatar: t.assignee_avatar,
                    gdriveAttachments: t.gdrive_attachments || [],
                    priority: t.priority,
                    status: t.status,
                    dueDate: (t.due_date && t.due_date.toLowerCase() !== 'nan' && t.due_date !== '-') ? t.due_date : null,
                    startDate: t.start_date || null,
                    startTime: t.start_time || '09:00',
                    week: t.week,
                    category: t.category,
                    relatedPurchaseId: t.related_purchase_id,
                    location: t.location || ''
                })));
            }
        } catch (err: any) {
            console.error("Fetch tasks error:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, []);

    // ── Google Calendar helpers ────────────────────────────────────────────
    const fetchGCalEvents = useCallback(async () => {
        if (!isGoogleConnected()) return;
        setGcalLoading(true);
        try {
            const calendars = await fetchCalendarList();
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();

            const allEventsPromises = calendars.map(cal =>
                fetchEventsForMonth(year, month, cal.id, cal.backgroundColor).catch(() => [])
            );

            const eventsArrays = await Promise.all(allEventsPromises);
            const allEvents = eventsArrays.flat();

            setGcalEvents(allEvents);
        } catch (err: any) {
            console.warn('GCal fetch error:', err.message);
            // Token may have expired — clear connection
            if (err.message?.includes('401') || err.message?.includes('403')) {
                setGcalConnected(false);
                setGcalEvents([]);
            }
        } finally {
            setGcalLoading(false);
        }
    }, [viewDate]);

    useEffect(() => {
        if (gcalConnected) fetchGCalEvents();
        else setGcalEvents([]);
    }, [gcalConnected, fetchGCalEvents]);

    const handleGcalConnect = async () => {
        setGcalConnecting(true);
        try {
            await signInWithGoogle();
            setGcalConnected(true);
            showToast('Google Calendar connected!', 'success');
        } catch (err: any) {
            showToast('Google sign-in cancelled or failed.', 'error');
        } finally {
            setGcalConnecting(false);
        }
    };

    const handleGcalDisconnect = () => {
        signOutGoogle();
        setGcalConnected(false);
        setGcalEvents([]);
        showToast('Google Calendar disconnected.', 'success');
    };

    // Close popover on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setSelectedTask(null);
                setSelectedGcalEvent(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);


    const handleEdit = (task: WeeklyPlan) => {
        setEditingTask(task);
        setSelectedTask(null);
        setIsModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteTask) return;
        setIsActionLoading(true);
        try {
            const { error } = await supabase.from('weekly_plans').delete().eq('id', deleteTask.id);
            if (error) throw error;
            await fetchTasks();
            setDeleteTask(null);
            showToast("Task deleted", "success");
        } catch (err: any) {
            showToast("Delete failed: " + (err.message || "Unknown error"), 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const navigate = (direction: number) => {
        const next = new Date(viewDate);
        next.setMonth(next.getMonth() + direction);
        setViewDate(next);
    };

    const getCategoryStyle = (category: string) =>
        CATEGORY_COLORS[category] || CATEGORY_COLORS['Default'];

    // Google Calendar events for a given date
    const getGCalEventsForDate = (date: Date): GCalEvent[] => {
        const dateStr = formatDate(date);
        return gcalEvents.filter(ev => {
            const start = gcalStartDate(ev);
            const end = gcalEndDate(ev);
            return dateStr >= start && dateStr <= end;
        });
    };

    // Build month calendar grid (Sun–Sat columns)
    const monthGrid = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const grid: { date: Date; currentMonth: boolean }[] = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            grid.push({ date: new Date(year, month - 1, prevMonthDays - i), currentMonth: false });
        }
        for (let i = 1; i <= totalDays; i++) {
            grid.push({ date: new Date(year, month, i), currentMonth: true });
        }
        const remaining = 42 - grid.length;
        for (let i = 1; i <= remaining; i++) {
            grid.push({ date: new Date(year, month + 1, i), currentMonth: false });
        }
        return grid;
    }, [viewDate]);

    // Get tasks that appear on a given date (multi-day spanning)
    const getTasksForDate = (date: Date): WeeklyPlan[] => {
        const dateStr = formatDate(date);
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            const start = task.startDate || task.dueDate;
            const end = task.dueDate;
            return dateStr >= start && dateStr <= end;
        });
    };

    // Check if a task starts on this specific date
    const isTaskStart = (task: WeeklyPlan, date: Date) => {
        const dateStr = formatDate(date);
        return (task.startDate || task.dueDate) === dateStr;
    };

    // Check if a task ends on this specific date
    const isTaskEnd = (task: WeeklyPlan, date: Date) => {
        const dateStr = formatDate(date);
        return task.dueDate === dateStr;
    };

    // Check if it's a multi-day task
    const isMultiDay = (task: WeeklyPlan) => {
        return task.startDate && task.startDate !== task.dueDate;
    };

    // Count total events for current month
    const totalEventsThisMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstStr = formatDate(new Date(year, month, 1));
        const lastStr = formatDate(new Date(year, month + 1, 0));
        return tasks.filter(t => {
            if (!t.dueDate) return false;
            const start = t.startDate || t.dueDate;
            return start <= lastStr && t.dueDate >= firstStr;
        }).length;
    }, [tasks, viewDate]);

    // Combine all tasks and gcal events for List Mode sorting
    const allItemsList = useMemo(() => {
        return [
            ...tasks.map(t => ({ type: 'supabase' as const, data: t })),
            ...gcalEvents.map(e => ({ type: 'gcal' as const, data: e }))
        ].sort((a, b) => {
            const startA = a.type === 'supabase' ? (a.data.startDate || a.data.dueDate || '') : gcalStartDate(a.data);
            const startB = b.type === 'supabase' ? (b.data.startDate || b.data.dueDate || '') : gcalStartDate(b.data);
            return startA.localeCompare(startB);
        });
    }, [tasks, gcalEvents]);

    // Extract unique locations from all events
    const uniqueLocations = useMemo(() => {
        const locs = new Set<string>();
        tasks.forEach(t => {
            if (t.location?.trim()) locs.add(t.location.trim());
        });
        gcalEvents.forEach(e => {
            if (e.location?.trim()) locs.add(e.location.trim());
        });
        return Array.from(locs).sort();
    }, [tasks, gcalEvents]);

    // Filter events by location and dateScope
    const filteredItems = useMemo(() => {
        const todayStr = (() => {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        })();

        return allItemsList.filter(item => {
            // 1. Date Scope Filter
            if (dateScope === 'today') {
                if (item.type === 'gcal') {
                    const start = gcalStartDate(item.data);
                    const end = gcalEndDate(item.data);
                    const isToday = start <= todayStr && end >= todayStr;
                    if (!isToday) return false;
                } else {
                    const start = item.data.startDate || item.data.dueDate || '';
                    const end = item.data.dueDate || '';
                    const isToday = start <= todayStr && end >= todayStr;
                    if (!isToday) return false;
                }
            }

            // 2. Location Filter
            if (locationFilter) {
                const loc = item.type === 'gcal' ? item.data.location : item.data.location;
                if (!loc?.toLowerCase().includes(locationFilter.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });
    }, [allItemsList, locationFilter, dateScope]);

        // Group filtered items by date
        const groupedItems = useMemo(() => {
            const groups: { [date: string]: typeof filteredItems } = {};
            filteredItems.forEach(item => {
                const dateStr = item.type === 'supabase'
                    ? (item.data.startDate || item.data.dueDate || 'Undated')
                    : gcalStartDate(item.data);
                if (!groups[dateStr]) {
                    groups[dateStr] = [];
                }
                groups[dateStr].push(item);
            });

            // Sort dates: put Undated at the end
            return Object.keys(groups).sort((a, b) => {
                if (a === 'Undated') return 1;
                if (b === 'Undated') return -1;
                return a.localeCompare(b);
            }).map(date => ({
                date,
                items: groups[date]
            }));
        }, [filteredItems]);

        return (
            <div className="h-full flex flex-col gap-4 animate-in fade-in duration-700 pb-8">
                {/* ── PAGE HEADER ── */}
                <PageHeader
                    title={viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    description="Assignment Planner & Operational Schedule"
                >
                    <div className="flex items-center gap-3">
                        {/* Event count badge */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/60">
                            <CalendarRange size={14} className="text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">{totalEventsThisMonth} events</span>
                        </div>

                        {/* Date range display */}
                        <div className="hidden md:flex items-center text-xs font-medium text-muted-foreground gap-1">
                            {viewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' – '}
                            {new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>

                        {/* View toggle */}
                        <div className="flex items-center bg-muted p-1 rounded-lg border border-border/60">
                            {[
                                { id: 'Month', icon: CalendarRange, label: 'Grid' },
                                { id: 'List', icon: LayoutList, label: 'List' },
                            ].map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setViewMode(v.id as any)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        viewMode === v.id
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <v.icon size={13} />
                                    {v.label}
                                </button>
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center bg-background border border-border/60 rounded-lg overflow-hidden shadow-sm">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted/50 text-muted-foreground border-r border-border/60 transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setViewDate(new Date())} className="px-3 text-xs font-semibold hover:bg-muted/50 text-foreground transition-colors h-full">
                                Today
                            </button>
                            <button onClick={() => navigate(1)} className="p-2 hover:bg-muted/50 text-muted-foreground border-l border-border/60 transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {canManage && (
                            <Button
                                onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                                className="text-xs font-semibold flex items-center gap-1.5"
                            >
                                <Plus size={14} />
                                Add Event
                            </Button>
                        )}

                        {/* ── Google Calendar button ── */}
                        {gcalConnected ? (
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3.5 h-3.5" alt="GCal Logo" />
                                    <span className="hidden sm:inline">Google Cal</span>
                                    {gcalLoading && <RefreshCw size={11} className="animate-spin" />}
                                </div>
                                <button
                                    onClick={handleGcalDisconnect}
                                    title="Disconnect Google Calendar"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-700/40"
                                >
                                    <LogOut size={13} />
                                </button>
                            </div>
                        ) : (
                            <Button
                                onClick={handleGcalConnect}
                                disabled={gcalConnecting}
                                variant="outline"
                                size="sm"
                                className="gap-2 text-xs font-semibold shadow-sm"
                            >
                                {gcalConnecting
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3.5 h-3.5" alt="GCal Logo" />
                                }
                                <span className="hidden sm:inline">{gcalConnecting ? 'Connecting…' : 'Connect Google Cal'}</span>
                            </Button>
                        )}
                    </div>
                </PageHeader>

                {/* ── MAIN CALENDAR CONTAINER ── */}
                <div className="bg-card rounded-2xl border border-border/60 shadow-sm flex-1 overflow-hidden flex flex-col relative">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <RefreshCcw className="animate-spin text-blue-500" size={28} />
                            <p className="text-xs font-semibold text-muted-foreground">Synchronizing Schedule...</p>
                        </div>
                    ) : viewMode === 'Month' ? (
                        <>
                            {/* Day headers */}
                            <div className="grid grid-cols-7 border-b border-border/60 bg-muted/50 shrink-0">
                                {DAY_HEADERS.map(day => (
                                    <div key={day} className={cn(
                                        "py-3 text-center text-xs font-semibold",
                                        (day === 'Sat' || day === 'Sun') ? 'text-rose-400 dark:text-rose-500' : 'text-muted-foreground'
                                    )}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <div className="grid grid-cols-7 min-w-[800px]" style={{ gridAutoRows: 'minmax(120px, 1fr)' }}>
                                    {monthGrid.map((cell, idx) => {
                                        const dateStr = formatDate(cell.date);
                                        const dayTasks = getTasksForDate(cell.date);
                                        const holidayName = INDONESIAN_HOLIDAYS[dateStr];
                                        const isCutiBersama = isCutiBersamaDate(dateStr);
                                        const isNationalHoliday = !!holidayName && !isCutiBersama;
                                        const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                                        const isToday = cell.date.toDateString() === new Date().toDateString();

                                        const dayGCalEvents = getGCalEventsForDate(cell.date);

                                        const allItems = [
                                            ...dayTasks.map(t => ({ type: 'supabase' as const, data: t })),
                                            ...dayGCalEvents.map(e => ({ type: 'gcal' as const, data: e }))
                                        ];

                                        const visible = allItems.slice(0, 3);
                                        const overflow = allItems.length - 3;

                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "border-r border-b border-border/60 p-2 flex flex-col gap-1 min-h-[120px] relative group",
                                                    !cell.currentMonth && "bg-muted/40",
                                                    cell.currentMonth && isCutiBersama && "bg-amber-50/40 dark:bg-amber-900/10",
                                                    cell.currentMonth && !isCutiBersama && (isNationalHoliday || isWeekend) && "bg-rose-50/20 dark:bg-rose-900/5",
                                                    "hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors"
                                                )}
                                            >
                                                {/* Top row: date number + holiday label */}
                                                <div className="flex items-start justify-between mb-1">
                                                    <span className={cn(
                                                        "w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-bold shrink-0 transition-all",
                                                        isToday
                                                            ? 'bg-blue-600 text-white shadow-md'
                                                            : isCutiBersama
                                                                ? 'text-amber-600 dark:text-amber-400'
                                                                : (isNationalHoliday || isWeekend)
                                                                    ? 'text-rose-500 dark:text-rose-400'
                                                                    : 'text-slate-500 dark:text-zinc-400',
                                                        !cell.currentMonth && "opacity-30"
                                                    )}>
                                                        {cell.date.getDate()}
                                                    </span>
                                                    {holidayName && cell.currentMonth && (
                                                        <span className={cn(
                                                            "text-xs font-medium leading-tight text-right max-w-[80px] truncate px-1 py-0.5 rounded",
                                                            isCutiBersama
                                                                ? 'text-amber-600 dark:text-amber-400 border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                                                                : 'text-rose-500 dark:text-rose-400'
                                                        )}>
                                                            {holidayName}
                                                        </span>
                                                    )}
                                                </div>

                                                {canManage && cell.currentMonth && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingTask(null);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex z-10 shadow-sm"
                                                    >
                                                        +
                                                    </button>
                                                )}

                                                {/* Task pills */}
                                                <div className="flex flex-col gap-0.5 flex-1">
                                                    {visible.map((item, i) => {
                                                        if (item.type === 'gcal') {
                                                            const ev = item.data;
                                                            const start = gcalStartDate(ev);
                                                            const end = gcalEndDate(ev);
                                                            const isStart = start === dateStr;
                                                            const isEnd = end === dateStr;
                                                            const multi = start !== end;

                                                            const roundClass = multi
                                                                ? isStart && isEnd ? 'rounded'
                                                                    : isStart ? 'rounded-l rounded-r-none'
                                                                        : isEnd ? 'rounded-r rounded-l-none'
                                                                            : 'rounded-none'
                                                                : 'rounded';

                                                            const pl = (!isStart && multi) ? 'pl-1' : 'pl-1.5';
                                                            const time = gcalStartTime(ev);

                                                            return (
                                                                <button
                                                                    key={`gcal-${ev.id}-${i}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedGcalEvent(ev);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full text-left py-0.5 pr-2 text-xs font-semibold text-white truncate cursor-pointer transition-opacity hover:opacity-80 flex items-center gap-1 leading-relaxed",
                                                                        !ev.backgroundColor && "bg-pink-500 dark:bg-pink-600",
                                                                        roundClass, pl,
                                                                        !cell.currentMonth && "opacity-40"
                                                                    )}
                                                                    style={ev.backgroundColor ? { backgroundColor: ev.backgroundColor } : undefined}
                                                                    title={ev.summary}
                                                                >
                                                                    {isStart && (
                                                                        <div className="shrink-0 flex items-center justify-center w-3 h-3 rounded bg-white/20 text-white text-[8px] font-black leading-none">
                                                                            G
                                                                        </div>
                                                                    )}
                                                                    {multi ? (
                                                                        <>
                                                                            {isStart && <span className="truncate flex-1">{ev.summary}</span>}
                                                                            {!isStart && <span className="truncate opacity-0 select-none flex-1">{ev.summary}</span>}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="truncate flex-1">{ev.summary}</span>
                                                                            {time && <span className="opacity-70 shrink-0 text-[8px] font-medium">{time}</span>}
                                                                        </>
                                                                    )}
                                                                </button>
                                                            );
                                                        }

                                                        // Supabase Task
                                                        const task = item.data;
                                                        const style = getCategoryStyle(task.category);
                                                        const isStart = isTaskStart(task, cell.date);
                                                        const isEnd = isTaskEnd(task, cell.date);
                                                        const multi = isMultiDay(task);

                                                        const roundClass = multi
                                                            ? isStart && isEnd ? 'rounded'
                                                                : isStart ? 'rounded-l rounded-r-none'
                                                                    : isEnd ? 'rounded-r rounded-l-none'
                                                                        : 'rounded-none'
                                                            : 'rounded';

                                                        const pl = (!isStart && multi) ? 'pl-1' : 'pl-2';

                                                        return (
                                                            <button
                                                                key={`task-${task.id}-${i}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTask(task);
                                                                }}
                                                                className={cn(
                                                                    "w-full text-left py-0.5 pr-2 text-xs font-semibold text-white truncate cursor-pointer transition-opacity hover:opacity-80 flex items-center gap-1 leading-relaxed",
                                                                    style.bg, roundClass, pl,
                                                                    !cell.currentMonth && "opacity-40"
                                                                )}
                                                                title={task.task}
                                                            >
                                                                {multi ? (
                                                                    <>
                                                                        {isStart && <span className="truncate flex-1">{task.task}</span>}
                                                                        {!isStart && <span className="truncate opacity-0 select-none flex-1">{task.task}</span>}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="truncate flex-1">{task.task}</span>
                                                                        {task.startTime && <span className="opacity-70 shrink-0 text-[8px] font-medium">{task.startTime}</span>}
                                                                    </>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                    {overflow > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDayEvents(cell.date);
                                                            }}
                                                            className="text-xs font-semibold text-blue-500 dark:text-blue-400 hover:text-blue-700 text-left px-1"
                                                        >
                                                            {overflow} more...
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ── LIST VIEW ── */
                        <div className="flex-1 overflow-auto custom-scrollbar p-6 flex flex-col gap-4">
                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-2xl border border-border/60 shrink-0">
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <MapPin size={16} className="text-slate-400" />
                                        <span className="text-xs font-medium text-muted-foreground">Filter Lokasi:</span>
                                        <select
                                            value={locationFilter}
                                            onChange={(e) => setLocationFilter(e.target.value)}
                                            className="text-sm bg-background border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground cursor-pointer transition-all hover:border-border"
                                        >
                                            <option value="">Semua Lokasi ({uniqueLocations.length})</option>
                                            {uniqueLocations.map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <CalendarRange size={16} className="text-slate-400" />
                                        <span className="text-xs font-medium text-muted-foreground">Periode:</span>
                                        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border/60">
                                            <button
                                                type="button"
                                                onClick={() => setDateScope('today')}
                                                className={cn(
                                                    "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                                                    dateScope === 'today'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                Hari Ini
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDateScope('month')}
                                                className={cn(
                                                    "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                                                    dateScope === 'month'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                Bulan Ini
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs font-medium text-muted-foreground">
                                    Menampilkan {filteredItems.length} dari {allItemsList.length} Agenda
                                </div>
                            </div>

                            {/* Event Timeline / Day Groups */}
                            {filteredItems.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-40">
                                    <Calendar size={48} className="text-muted-foreground/40 mb-3" />
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {locationFilter ? 'Tidak ada agenda di lokasi ini' : 'Tidak ada agenda terjadwal'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {groupedItems.map((group) => {
                                        const dateInfo = getSafeDateInfo(group.date);

                                        return (
                                            <div key={group.date} className="flex flex-col lg:flex-row gap-4 border-b border-border/60 pb-6 last:border-0 last:pb-0">
                                                {/* Date Column */}
                                                <div className="lg:w-40 shrink-0 flex lg:flex-col items-baseline lg:items-start gap-2 lg:gap-0.5 pt-1">
                                                    <div className="text-2xl font-bold text-primary leading-none">
                                                        {dateInfo.dayNum}
                                                    </div>
                                                    <div className="flex lg:flex-col items-baseline lg:items-start gap-1 lg:gap-0">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {dateInfo.weekday}
                                                        </span>
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {dateInfo.monthYear}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Items List */}
                                                <div className="flex-1 space-y-2">
                                                    {group.items.map((item, idx) => {
                                                        const isGcal = item.type === 'gcal';
                                                        let ev: any, task: any, style: any, multi: boolean, time: string, loc: string;

                                                        if (isGcal) {
                                                            ev = item.data;
                                                            style = null;
                                                            multi = gcalStartDate(ev) !== gcalEndDate(ev);
                                                            time = gcalStartTime(ev);
                                                            loc = ev.location || '';
                                                        } else {
                                                            task = item.data;
                                                            style = getCategoryStyle(task.category);
                                                            multi = isMultiDay(task);
                                                            time = task.startTime || '';
                                                            loc = task.location || '';
                                                        }

                                                        return (
                                                            <div
                                                                key={isGcal ? `gcal-row-${ev.id}-${idx}` : `task-row-${task.id}`}
                                                                onClick={() => isGcal ? setSelectedGcalEvent(ev) : setSelectedTask(task)}
                                                                className="w-full flex items-center justify-between gap-4 p-3 bg-card border border-border/60 rounded-2xl hover:bg-muted/40 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group relative cursor-pointer"
                                                            >
                                                                {/* Left color stripe */}
                                                                {isGcal ? (
                                                                    <div
                                                                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                                                                        style={{ backgroundColor: ev.backgroundColor || '#ec4899' }}
                                                                    />
                                                                ) : (
                                                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", style.bg)} />
                                                                )}

                                                                <div className="pl-3 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
                                                                    {/* Left side: Time, Title, Description */}
                                                                    <div className="flex-1 flex items-start md:items-center gap-3 min-w-0">
                                                                        {/* Time Badge */}
                                                                        <div className="shrink-0 flex items-center gap-1.5 min-w-[80px] bg-muted/50 px-2 py-0.5 rounded border border-border/60 justify-center">
                                                                            {isGcal ? (
                                                                                <>
                                                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3.5 h-3.5 shrink-0" alt="" />
<span className="text-xs font-semibold text-muted-foreground">
                        {time || 'All Day'}
                    </span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Clock size={11} className="text-slate-400 shrink-0" />
<span className="text-xs font-semibold text-muted-foreground">
                        {time || '09:00'}
                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>

                                                                        {/* Title & Description */}
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary dark:group-hover:text-primary transition-colors leading-snug">
                                                                                    {isGcal ? ev.summary : task.task}
                                                                                </span>
                                                                                {isGcal && (
                                                                                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">Google</span>
                                                                                )}
                                                                            </div>
                                                                            {!isGcal && task.description && (
                                                                                <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                                                                                    {task.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Right side: Metadata, badges, location, assignee */}
                                                                    <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 md:justify-end">
                                                                        {/* Location */}
                                                                        {loc && (
                                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60 font-medium">
                                                                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                                                                <span className="max-w-[130px] truncate" title={loc}>{loc}</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Badges for Supabase tasks */}
                                                                        {!isGcal && (
                                                                            <div className="flex items-center gap-1 flex-wrap">
<span className={cn("text-xs font-medium px-2 py-0.5 rounded-md text-white", style.bg)}>{task.category}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", PRIORITY_STYLE[task.priority])}>{task.priority}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", STATUS_STYLE[task.status])}>{task.status}</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Assignee */}
                                                                        {!isGcal && task.assignee && (
                                                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded border border-border/60 text-xs text-foreground font-semibold">
                                                                                {task.assigneeAvatar ? (
                                                                                    <img src={task.assigneeAvatar} className="w-4 h-4 rounded-full object-cover shrink-0 border border-border/60" alt="" referrerPolicy="no-referrer" />
                                                                                ) : (
                                                                                    <User size={11} className="text-slate-400 shrink-0" />
                                                                                )}
                                                                                <span className="max-w-[90px] truncate">{task.assignee}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Action buttons on absolute position (only for Supabase Tasks) */}
                                                                {!isGcal && (
                                                                    <div
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 p-1 rounded-lg shadow-sm border border-border/60 z-10"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {canManage && (
                                                                            <button onClick={() => handleEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                                                                                <Pencil size={11} />
                                                                            </button>
                                                                        )}
                                                                        {canDelete && (
                                                                            <button onClick={() => setDeleteTask(task)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-all">
                                                                                <Trash2 size={11} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TASK DETAIL POPOVER ── */}
                    {selectedTask && typeof window !== 'undefined' && createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTask(null)}>
                            <div
                                ref={popoverRef}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-background rounded-2xl shadow-2xl border border-border/60 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden font-sans"
                            >
                                {/* Color header bar */}
                                <div className={cn("h-1.5 w-full", getCategoryStyle(selectedTask.category).bg)} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md text-white", getCategoryStyle(selectedTask.category).bg)}>
                                                {selectedTask.category}
                                            </span>
                                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", PRIORITY_STYLE[selectedTask.priority])}>
                                                {selectedTask.priority}
                                            </span>
                                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", STATUS_STYLE[selectedTask.status])}>
                                                {selectedTask.status}
                                            </span>
                                        </div>
                                        <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground p-1">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <h3 className="text-base font-semibold text-foreground mb-2 leading-snug">{selectedTask.task}</h3>

                                    {selectedTask.description && (
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-3 border-t border-border/60 pt-3">{selectedTask.description}</p>
                                    )}

                                    <div className="space-y-2 border-t border-border/60 pt-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <CalendarRange size={13} className="text-slate-400 shrink-0" />
                                            {isMultiDay(selectedTask)
                                                ? <span>{selectedTask.startDate} <span className="text-muted-foreground/50">→</span> {selectedTask.dueDate}</span>
                                                : <span>{selectedTask.dueDate}</span>
                                            }
                                        </div>
                                        {selectedTask.startTime && !isMultiDay(selectedTask) && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                <Clock size={13} className="text-slate-400 shrink-0" />
                                                {selectedTask.startTime}
                                            </div>
                                        )}
                                        {selectedTask.location && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                <MapPin size={13} className="text-slate-400 shrink-0" />
                                                <span>{selectedTask.location}</span>
                                            </div>
                                        )}
                                        {selectedTask.assignee && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                {selectedTask.assigneeAvatar ? (
                                                    <img src={selectedTask.assigneeAvatar} className="w-5 h-5 rounded-full object-cover shrink-0 border border-border/60" alt="" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <User size={13} className="text-slate-400 shrink-0" />
                                                )}
                                                <span>{selectedTask.assignee}</span>
                                                {selectedTask.assigneeEmail && (
                                                    <span className="text-xs font-medium text-muted-foreground">({selectedTask.assigneeEmail})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Google Drive Attachments Display */}
                                    {selectedTask.gdriveAttachments && selectedTask.gdriveAttachments.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-border/60">
                                            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                                <Cloud size={11} />
                                                Drive Attachments
                                            </h4>
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                                {selectedTask.gdriveAttachments.map((file, i) => (
                                                    <a
                                                        key={i}
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center justify-between p-2 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {file.iconUrl ? (
                                                                <img src={file.iconUrl} className="w-3.5 h-3.5 shrink-0" alt="" />
                                                            ) : (
                                                                <Cloud size={12} className="text-slate-400 shrink-0" />
                                                            )}
                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                                                        </div>
                                                        <Globe size={11} className="text-slate-400 shrink-0" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(canManage || canDelete) && (
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                                            {canManage && (
                                                <Button
                                                    onClick={() => handleEdit(selectedTask)}
                                                    className="flex-1 gap-1.5"
                                                    size="sm"
                                                >
                                                    <Pencil size={13} /> Edit
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => { setDeleteTask(selectedTask); setSelectedTask(null); }}
                                                    className="flex-1 gap-1.5"
                                                    size="sm"
                                                >
                                                    <Trash2 size={13} />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* ── GCAL EVENT DETAIL POPOVER ── */}
                    {selectedGcalEvent && typeof window !== 'undefined' && createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedGcalEvent(null)}>
                            <div
                                ref={popoverRef}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-background rounded-2xl shadow-2xl border border-border/60 w-full max-w-[420px] mx-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col font-sans"
                            >
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-muted dark:bg-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3.5 h-3.5" alt="GCal" />
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                Google Calendar
                                            </span>
                                        </div>
                                        <button onClick={() => setSelectedGcalEvent(null)} className="text-muted-foreground hover:text-foreground p-1 -mr-2 -mt-1 transition-colors">
                                            <X size={18} strokeWidth={1.5} />
                                        </button>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-xl font-bold text-foreground mb-6 leading-tight pr-2">
                                        {selectedGcalEvent.summary}
                                    </h3>

                                    {/* Description (if any) */}
                                    {selectedGcalEvent.description && (
                                        <div
                                            className="text-sm text-muted-foreground leading-relaxed mb-6 prose prose-sm max-w-none prose-a:text-blue-500"
                                            dangerouslySetInnerHTML={{ __html: selectedGcalEvent.description }}
                                        />
                                    )}

                                    {/* Details List */}
                                    <div className="space-y-4">
                                        {/* Date */}
                                        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                                            <CalendarRange size={16} strokeWidth={1.5} className="text-slate-400 shrink-0" />
                                            {gcalStartDate(selectedGcalEvent) !== gcalEndDate(selectedGcalEvent)
                                                ? <span>{gcalStartDate(selectedGcalEvent)} <span className="text-muted-foreground/50 mx-1">→</span> {gcalEndDate(selectedGcalEvent)}</span>
                                                : <span>{gcalStartDate(selectedGcalEvent)}</span>
                                            }
                                        </div>

                                        {/* Time */}
                                        {gcalStartTime(selectedGcalEvent) && (
                                            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                                                <Clock size={16} strokeWidth={1.5} className="text-slate-400 shrink-0" />
                                                <span>
                                                    {gcalStartTime(selectedGcalEvent)}
                                                    {gcalEndTime(selectedGcalEvent) && ` - ${gcalEndTime(selectedGcalEvent)}`}
                                                </span>
                                            </div>
                                        )}

                                        {/* Location */}
                                        {selectedGcalEvent.location && (
                                            <div className="flex items-start gap-4 text-sm font-medium text-muted-foreground">
                                                <MapPin size={16} strokeWidth={1.5} className="text-slate-400 shrink-0 mt-0.5" />
                                                <span className="leading-snug">{selectedGcalEvent.location}</span>
                                            </div>
                                        )}

                                        {/* Attendees */}
                                        {selectedGcalEvent.attendees && selectedGcalEvent.attendees.length > 0 && (
                                            <div className="flex items-start gap-4 text-sm text-muted-foreground pt-1">
                                                <Users size={16} strokeWidth={1.5} className="text-slate-400 shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="mb-3 font-semibold text-foreground">
                                                        {selectedGcalEvent.attendees.length} guests
                                                    </div>
                                                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                                                        {selectedGcalEvent.attendees.map((attendee, i) => (
                                                            <div key={i} className="flex items-center gap-3 text-muted-foreground">
                                                                {attendee.responseStatus === 'accepted' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                                                                {attendee.responseStatus === 'declined' && <X size={14} className="text-rose-500 shrink-0" />}
                                                                {attendee.responseStatus === 'tentative' && <AlertCircle size={14} className="text-amber-500 shrink-0" />}
                                                                {attendee.responseStatus === 'needsAction' && <div className="w-[14px] h-[14px] rounded-full border-[1.5px] border-slate-300 dark:border-slate-600 shrink-0" />}

                                                                <span className="truncate max-w-[220px]">
                                                                    {attendee.displayName || attendee.email.split('@')[0]}
                                                                </span>

                                                                {attendee.organizer && <span className="text-xs font-medium text-muted-foreground shrink-0">Organizer</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    {selectedGcalEvent.htmlLink && (
                                        <div className="mt-8 pt-6 border-t border-border/60">
                                            <a
                                                href={selectedGcalEvent.htmlLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full flex items-center justify-center h-12 rounded-lg text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all shadow-md"
                                            >
                                                View in Google Calendar
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* ── DAY OVERVIEW MODAL ── */}
                    {selectedDayEvents && (() => {
                        const dateStr = formatDate(selectedDayEvents);
                        const dayTasks = getTasksForDate(selectedDayEvents);
                        const dayGCalEvs = getGCalEventsForDate(selectedDayEvents);
                        const allItemsList = [
                            ...dayGCalEvs.map(e => ({ type: 'gcal' as const, data: e })),
                            ...dayTasks.map(t => ({ type: 'supabase' as const, data: t })),
                        ].sort((a, b) => {
                            const startA = a.type === 'supabase' ? (a.data.startDate || a.data.dueDate || '') : gcalStartDate(a.data);
                            const startB = b.type === 'supabase' ? (b.data.startDate || b.data.dueDate || '') : gcalStartDate(b.data);
                            return startA.localeCompare(startB);
                        });
                        return typeof window !== 'undefined' && createPortal(
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedDayEvents(null)}>
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-background rounded-2xl shadow-2xl border border-border/60 w-full max-w-[460px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
                                >
                                    {/* Header */}
                                    <div className="px-6 py-5 border-b border-border/60 shrink-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                                    {selectedDayEvents.toLocaleDateString('en-US', { weekday: 'long' })}
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-bold text-foreground leading-none">
                                                        {selectedDayEvents.getDate()}
                                                    </span>
                                                    <span className="text-base font-medium text-muted-foreground">
                                                        {selectedDayEvents.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-xs text-muted-foreground font-medium">
                                                    {allItemsList.length} event{allItemsList.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedDayEvents(null)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
                                                <X size={18} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-2">
                                        {allItemsList.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                                <CalendarRange size={32} strokeWidth={1} className="mb-3 opacity-50" />
                                                <p className="text-sm font-medium">No events on this day</p>
                                            </div>
                                        ) : allItemsList.map((item, idx) => {
                                            if (item.type === 'gcal') {
                                                const ev = item.data;
                                                const calColor = ev.backgroundColor || '#ec4899';
                                                return (
                                                    <button
                                                        key={`modal-gcal-${ev.id}-${idx}`}
                                                        onClick={() => { setSelectedDayEvents(null); setSelectedGcalEvent(ev); }}
                                                        className="w-full flex items-stretch gap-4 p-4 bg-muted/40 rounded-xl text-left hover:bg-muted/60 transition-colors group"
                                                    >
                                                        {/* Color stripe */}
                                                        <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: calColor }} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3 h-3 shrink-0" alt="" />
                                                                <span className="text-xs font-medium text-muted-foreground">Google Calendar</span>
                                                            </div>
                                                            <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                                {ev.summary}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                {gcalStartTime(ev) && (
                                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <Clock size={10} />
                                                                        {gcalStartTime(ev)}{gcalEndTime(ev) && ` – ${gcalEndTime(ev)}`}
                                                                    </span>
                                                                )}
                                                                {ev.location && (
                                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                                                        <MapPin size={10} className="shrink-0" />
                                                                        <span className="truncate max-w-[160px]">{ev.location}</span>
                                                                    </span>
                                                                )}
                                                                {ev.attendees && ev.attendees.length > 0 && (
                                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                                        <Users size={10} />
                                                                        {ev.attendees.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-muted-foreground/50 group-hover:text-foreground transition-colors self-center shrink-0">
                                                            <ChevronRight size={14} />
                                                        </div>
                                                    </button>
                                                );
                                            }

                                            const task = item.data;
                                            const style = getCategoryStyle(task.category);
                                            return (
                                                <button
                                                    key={`modal-task-${task.id}`}
                                                    onClick={() => { setSelectedDayEvents(null); setSelectedTask(task); }}
                                                    className="w-full flex items-stretch gap-4 p-4 bg-muted/40 rounded-xl text-left hover:bg-muted/60 transition-colors group"
                                                >
                                                    <div className={cn("w-1 rounded-full shrink-0", style.bg)} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md text-white", style.bg)}>{task.category}</span>
                                                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", STATUS_STYLE[task.status])}>{task.status}</span>
                                                        </div>
                                                        <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                            {task.task}
                                                        </div>
                                                        {task.assignee && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                                                                {task.assigneeAvatar ? (
                                                                    <img src={task.assigneeAvatar} alt={task.assignee} className="w-5 h-5 rounded-full object-cover" />
                                                                ) : (
                                                                    <User size={10} />
                                                                )}
                                                                <span>{task.assignee}</span>
                                                                {task.assigneeEmail && (
                                                                    <span className="text-xs text-muted-foreground">({task.assigneeEmail})</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {task.location && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                                <MapPin size={10} className="shrink-0" />
                                                                <span>{task.location}</span>
                                                            </div>
                                                        )}
                                                        {task.gdriveAttachments && task.gdriveAttachments.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {task.gdriveAttachments.map((file, i) => (
                                                                    <a key={i} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                                                        {file.iconUrl ? <img src={file.iconUrl} className="w-3 h-3" alt="" /> : <Cloud size={12} />}
                                                                        {file.name}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground/50 group-hover:text-foreground transition-colors self-center shrink-0">
                                                        <ChevronRight size={14} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>,
                            document.body
                        );
                    })()}
                </div>

                {/* ── MODALS ── */}
                <WeeklyTaskModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    initialData={editingTask}
                    onSubmit={async (newTask) => {
                        try {
                            if (!newTask.task) return;
                            const dateObj = newTask.dueDate ? new Date(newTask.dueDate) : new Date();
                            const payload = {
                                task: newTask.task,
                                description: newTask.description || newTask.remarks || '',
                                assignee: newTask.assignee || 'IT',
                                assignee_email: newTask.assigneeEmail || null,
                                assignee_avatar: newTask.assigneeAvatar || null,
                                gdrive_attachments: newTask.gdriveAttachments || [],
                                status: newTask.status || 'To Do',
                                due_date: newTask.dueDate,
                                start_date: newTask.startDate || newTask.dueDate,
                                category: newTask.category || 'Maintenance',
                                priority: newTask.priority || 'Medium',
                                week: `W${Math.ceil(dateObj.getDate() / 7)}`,
                                location: newTask.location || null
                            };
                            if (editingTask) {
                                await supabase.from('weekly_plans').update(payload).eq('id', editingTask.id);
                            } else {
                                await supabase.from('weekly_plans').insert([payload]);
                            }
                            setIsModalOpen(false);
                            setEditingTask(null);
                            await fetchTasks();
                            showToast(editingTask ? "Task updated" : "Task created", "success");

                            // Send Gmail Notification to Assignee (Fire & Forget)
                            if (newTask.assigneeEmail) {
                                sendGmailNotification({
                                    task: newTask.task,
                                    description: newTask.description || '',
                                    priority: newTask.priority || 'Medium',
                                    status: newTask.status || 'To Do',
                                    dueDate: newTask.dueDate || '',
                                    startDate: newTask.startDate,
                                    assignee: newTask.assignee || 'IT',
                                    assigneeEmail: newTask.assigneeEmail,
                                    creatorName: currentUser?.fullName,
                                    isNew: !editingTask,
                                }).catch(e => console.warn('Could not send Gmail notification:', e));
                            }
                        } catch (err: any) {
                            showToast("Failed: " + (err.message || "Database error"), "error");
                        }
                    }}
                    currentUserName={currentUser?.fullName}
                />

                <DangerConfirmModal
                    isOpen={!!deleteTask}
                    onClose={() => setDeleteTask(null)}
                    onConfirm={executeDelete}
                    title="Delete Task"
                    message={`Are you sure you want to delete "${deleteTask?.task}"?`}
                    isLoading={isActionLoading}
                />
            </div>
        );
};

export default WeeklyPlanManager;