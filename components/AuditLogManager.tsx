'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, RefreshCcw, Clock, Shield, Filter,
    RotateCcw, Eye, User, Calendar, Activity,
    ChevronLeft, ChevronRight, HardDrive, Cpu,
    FileText, UserPlus, Trash2, ArrowRightLeft
} from 'lucide-react';
import { AuditLog, UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { StatCard } from './StatCard';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AuditLogManagerProps {
    currentUser: UserAccount | null;
}

export const AuditLogManager: React.FC<AuditLogManagerProps> = ({ currentUser }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [isSimulation, setIsSimulation] = useState(false);
    const itemsPerPage = 12;

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            // We simulate some data if the table doesn't exist yet, 
            // or fetch from 'user_activity_logs'
            const { data, error } = await supabase
                .from('user_activity_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error && error.code === '42P01') {
                // Table not found
                setIsSimulation(true);
                setLogs([
                    { id: 1, userName: 'Admin', userRole: 'Admin', action: 'Update Asset', module: 'Assets', details: 'Changed status for ASSET-001 from Idle to Used', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
                    { id: 2, userName: 'IT Support', userRole: 'Staff', action: 'Create Extension', module: 'Extensions', details: 'Added new extension 102 for John Doe', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
                    { id: 3, userName: 'Admin', userRole: 'Admin', action: 'Delete User', module: 'User Management', details: 'Terminated account for user@example.com', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
                ]);
            } else if (data) {
                setIsSimulation(false);
                setLogs(data.map(l => ({
                    id: l.id,
                    userName: l.user_name,
                    userRole: l.user_role,
                    action: l.action,
                    module: l.module,
                    details: l.details,
                    ipAddress: l.ip_address,
                    createdAt: l.created_at
                })));
            } else if (error) {
                console.error("Supabase Error:", error);
            }
        } catch (err) {
            console.error("Error fetching logs:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
            return matchesSearch && matchesModule;
        });
    }, [logs, searchTerm, moduleFilter]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(start, start + itemsPerPage);
    }, [filteredLogs, currentPage]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const getModuleIcon = (module: string) => {
        switch (module) {
            case 'Assets': return <Cpu size={14} />;
            case 'Extensions': return <Activity size={14} />;
            case 'User Management': return <User size={14} />;
            case 'System': return <Shield size={14} />;
            default: return <FileText size={14} />;
        }
    };

    const getActionColor = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('create') || a.includes('add')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
        if (a.includes('delete') || a.includes('remove')) return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800';
        if (a.includes('update') || a.includes('change')) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800';
        return 'text-slate-500 bg-slate-50 dark:bg-zinc-800 border-slate-100 dark:border-zinc-700';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200 pb-10">
            <PageHeader
                title="System Tracking Log"
                description="Audit Trail & Comprehensive Activity Monitor"
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchLogs}
                        className="text-xs font-medium"
                    >
                        <RefreshCcw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Protocol
                    </Button>
                </div>
            </PageHeader>

            {isSimulation && (
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-dashed border-amber-200 dark:border-amber-800/50 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
                            <Activity size={32} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 tracking-tight">Database Table Missing</h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                                The `user_activity_logs` table does not exist in your Supabase project.
                                Currently displaying <span className="underline underline-offset-4">simulation data</span>.
                            </p>
                        </div>
                        <div className="bg-background p-4 rounded-2xl border border-border/60">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Supabase SQL Blueprint</p>
                            <code className="text-xs font-mono text-primary break-all">
                                CREATE TABLE user_activity_logs ( id BIGSERIAL PRIMARY KEY, user_name TEXT, user_role TEXT, action TEXT, module TEXT, details TEXT, ip_address TEXT, created_at TIMESTAMPTZ DEFAULT NOW() );
                            </code>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Total Events" value={logs.length} icon={Shield} color="blue" />
                <StatCard label="Active Modules" value={new Set(logs.map(l => l.module)).size} icon={HardDrive} color="indigo" />
                <StatCard label="Recent Updates" value={logs.filter(l => new Date(l.createdAt) > new Date(Date.now() - 3600000)).length} icon={Clock} color="emerald" />
            </div>

            <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by user, action or details..."
                        className="w-full pl-10 bg-input/30 dark:bg-zinc-800 rounded-md"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="h-9 px-3 bg-background border border-input rounded-md text-sm font-medium text-foreground focus:outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50"
                        value={moduleFilter}
                        onChange={e => setModuleFilter(e.target.value)}
                    >
                        <option value="All">All Modules</option>
                        {Array.from(new Set(logs.map(l => l.module))).map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => { setSearchTerm(''); setModuleFilter('All'); }}
                        className="h-9 w-9 shrink-0"
                    >
                        <RotateCcw size={16} />
                    </Button>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Timestamp</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Security Principal</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Action Event</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Module Context</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Technical Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="py-20 text-center"><RefreshCcw className="animate-spin text-primary mx-auto" size={24} /></TableCell></TableRow>
                            ) : paginatedLogs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="py-24 text-center text-muted-foreground text-sm font-medium">No activity sequences identified.</TableCell></TableRow>
                            ) : paginatedLogs.map((log) => (
                                <TableRow key={log.id} className="group hover:bg-muted/30 align-top">
                                    <TableCell className="py-5 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono font-medium text-foreground">
                                                {new Date(log.createdAt).toLocaleDateString('en-GB')}
                                            </span>
                                            <span className="text-xs font-mono text-muted-foreground mt-0.5">
                                                {new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-md bg-muted text-foreground flex items-center justify-center font-semibold text-xs border border-border/60">
                                                {log.userName.substring(0, 2)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-foreground">{log.userName}</span>
                                                <span className="text-xs text-muted-foreground">{log.userRole}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <Badge variant="outline" className={getActionColor(log.action)}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <div className="p-1.5 bg-muted/50 rounded-md border border-border/60">
                                                {getModuleIcon(log.module)}
                                            </div>
                                            <span className="text-xs font-medium">{log.module}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <p className="text-xs text-muted-foreground leading-relaxed max-w-md line-clamp-2">
                                            {log.details || 'System operation executed successfully.'}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="px-6 py-3.5 bg-muted/10 border-t border-border/60 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Page {currentPage} of {totalPages || 1}</p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="h-8 w-8"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="h-8 w-8"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="text-blue-200" size={24} />
                        <h3 className="text-xl font-bold tracking-tight">Security Protocol Notice</h3>
                    </div>
                    <p className="text-sm text-blue-100 font-medium leading-relaxed max-w-2xl opacity-90 uppercase tracking-[0.05em]">
                        Audit logs are immutable and represent a chronological record of system operations. These records are critical for compliance, security monitoring, and troubleshooting infrastructure changes.
                    </p>
                </div>
            </div>
        </div>
    );
};

