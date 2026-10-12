'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Activity, Clock, CheckCircle2, AlertCircle, Users,
    Box, ArrowUpRight, ArrowDownRight, MoreHorizontal,
    Plus, Download, ExternalLink, Shield, Zap, TrendingUp,
    ChevronRight, MessageSquare
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

const WorknestDashboard = ({ userName, currentUser, onNavigate }: any) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalActivities: 0,
        pendingTickets: 0,
        activeAssets: 0,
        totalUsers: 0
    });
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [recentTickets, setRecentTickets] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Stats
            const { count: actCount } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true });
            const { count: ticketCount } = await supabase.from('helpdesk_tickets').select('*', { count: 'exact', head: true }).neq('status', 'Resolved');
            const { count: assetCount } = await supabase.from('assets').select('*', { count: 'exact', head: true });
            const { count: userCount } = await supabase.from('user_accounts').select('*', { count: 'exact', head: true });

            setStats({
                totalActivities: actCount || 0,
                pendingTickets: ticketCount || 0,
                activeAssets: assetCount || 0,
                totalUsers: userCount || 0
            });

            // 2. Fetch Recent Activities
            const { data: latestActivities } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentActivities(latestActivities || []);

            // 3. Fetch Recent Tickets
            const { data: latestTickets } = await supabase
                .from('helpdesk_tickets')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);
            setRecentTickets(latestTickets || []);

            // 4. Activity Trend (Last 7 Days)
            const dates = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const { data: trendLogs } = await supabase
                .from('activity_logs')
                .select('created_at')
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            const counts = trendLogs?.reduce((acc: any, log: any) => {
                const day = log.created_at.split('T')[0];
                acc[day] = (acc[day] || 0) + 1;
                return acc;
            }, {});

            setTrendData(dates.map(d => ({
                day: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
                count: counts[d] || 0
            })));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const StatPill = ({ title, value, icon: Icon, color, trend }: any) => (
        <div className="bg-white dark:bg-[#1a1d23] rounded-xl p-8 shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col gap-4 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">{title}</p>
                <div className="flex items-end gap-3">
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
                    {trend && (
                        <div className={`flex items-center text-[11px] font-black mb-1.5 ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trend > 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1 rotate-180" />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto space-y-10">
            {/* Header / Welcome */}
            <PageHeader
                title={`${greeting()}, ${userName?.split(' ')[0] || 'Member'}`}
                description="System Portal active & operational status"
            >
                <div className="flex gap-4">
                    <Button
                        onClick={() => navigate('/activity')}
                        className="font-bold gap-2"
                    >
                        <Plus size={18} strokeWidth={3} />
                        New Log Entry
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 border border-slate-200 dark:border-zinc-800"
                    >
                        <Download size={18} strokeWidth={2.5} />
                    </Button>
                </div>
            </PageHeader>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatPill title="Total Activities" value={stats.totalActivities} icon={Activity} color="bg-blue-600" trend={12} />
                <StatPill title="Pending Tickets" value={stats.pendingTickets} icon={MessageSquare} color="bg-rose-500" trend={-5} />
                <StatPill title="Managed Assets" value={stats.activeAssets} icon={Box} color="bg-emerald-500" trend={2} />
                <StatPill title="Team Members" value={stats.totalUsers} icon={Users} color="bg-slate-900" trend={0} />
            </div>

            {/* Middle Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Trend Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-[#1a1d23] rounded-xl p-10 shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Activity Momentum</h2>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Last 7 days performance</p>
                        </div>
                        <select className="bg-slate-50 dark:bg-zinc-900 border-none rounded-xl text-[11px] font-black py-3 px-6 focus:ring-0 cursor-pointer">
                            <option>Daily View</option>
                            <option>Weekly View</option>
                        </select>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }}
                                    dy={20}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', padding: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 6' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#2563eb"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Panel: Tickets Summary */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-slate-900 dark:bg-blue-600 rounded-xl p-10 text-white shadow-xl shadow-blue-500/10">
                        <div className="flex justify-between items-start mb-10">
                            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                                <Zap size={24} className="text-white" fill="white" />
                            </div>
                            <span className="px-4 py-2 bg-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest">Urgent</span>
                        </div>
                        <h3 className="text-3xl font-black mb-3 leading-tight tracking-tight">Operational Support Ready</h3>
                        <p className="text-blue-100/70 text-[13px] font-bold leading-relaxed mb-8">
                            There are currently <span className="text-white">{stats.pendingTickets}</span> helpdesk tickets awaiting your tactical attention.
                        </p>
                        <button onClick={() => navigate('/helpdesk')} className="w-full py-5 bg-white text-blue-600 rounded-xl text-[13px] font-black hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                            Access Helpdesk <ArrowUpRight size={18} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Quick Access List */}
                    <div className="bg-white dark:bg-[#1a1d23] rounded-xl p-8 border border-slate-100 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-6">Recent Tickets</p>
                        <div className="space-y-4">
                            {recentTickets.map(ticket => (
                                <div key={ticket.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                        <MessageSquare size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{ticket.subject}</p>
                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{ticket.status}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Activities */}
            <div className="bg-white dark:bg-[#1a1d23] rounded-xl p-10 shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden relative">
                <div className="absolute top-0 right-0 opacity-5 scale-150 rotate-12 pointer-events-none">
                    <Shield size={300} strokeWidth={1} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity Feed</h2>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live tracking database</p>
                    </div>
                    <button onClick={() => navigate('/activity')} className="px-8 py-4 bg-slate-50 dark:bg-zinc-800 text-[12px] font-black text-slate-600 dark:text-zinc-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                        View Full Logs <ChevronRight size={16} />
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] border-b border-slate-50 dark:border-zinc-800/60">
                                <th className="pb-6 px-4">Activity</th>
                                <th className="pb-6 px-4">Operator</th>
                                <th className="pb-6 px-4">Location</th>
                                <th className="pb-6 px-4">Status</th>
                                <th className="pb-6 px-4">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {recentActivities.map(act => (
                                <tr key={act.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                                <Activity size={18} strokeWidth={2.5} />
                                            </div>
                                            <span className="text-[13px] font-black text-slate-900 dark:text-white tracking-tight">{act.activity_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 text-[13px] font-bold text-slate-500 dark:text-zinc-400">{act.requester}</td>
                                    <td className="py-6 px-4 text-[13px] font-bold text-slate-500 dark:text-zinc-400">{act.location}</td>
                                    <td className="py-6 px-4">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${act.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' :
                                            act.status === 'In Progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' :
                                                'bg-orange-50 text-orange-600 dark:bg-orange-950/30'
                                            }`}>
                                            {act.status}
                                        </span>
                                    </td>
                                    <td className="py-6 px-4 text-[13px] font-bold text-slate-400">
                                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WorknestDashboard;

