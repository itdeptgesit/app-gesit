
'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, ArrowRight, Cable, Network, ShieldCheck, Server, Filter, Video, PhoneCall, Zap } from 'lucide-react';
import { NetworkSwitch, PortStatus, DeviceType } from '../types';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WiringScheduleProps {
    switches: NetworkSwitch[];
}

export const WiringSchedule: React.FC<WiringScheduleProps> = ({ switches }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('All');

    const allConnections = useMemo(() => {
        return switches.flatMap(sw =>
            sw.ports.map(port => ({
                switchName: sw.name,
                switchModel: sw.model,
                switchId: sw.id,
                port: port,
                uplink: switches.find(s => s.id === port.uplinkDeviceId)?.name
            }))
        ).filter(item => item.port.status !== PortStatus.DISABLED);
    }, [switches]);

    const filteredConnections = useMemo(() => {
        return allConnections.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = item.switchName.toLowerCase().includes(searchLower) ||
                (item.port.deviceConnected || '').toLowerCase().includes(searchLower) ||
                (item.port.patchPanelPort || '').toLowerCase().includes(searchLower) ||
                (item.port.ipAddress || '').toLowerCase().includes(searchLower);

            const matchesDevice = deviceFilter === 'All' ? true : item.switchId === deviceFilter;

            return matchesSearch && matchesDevice;
        });
    }, [allConnections, searchTerm, deviceFilter]);

    const getSourceIcon = (name: string, model: string) => {
        const n = name.toLowerCase();
        const m = model.toLowerCase();
        if (n.includes('nvr') || m.includes('nvr')) return <Video size={12} />;
        if (n.includes('dvr') || m.includes('dvr')) return <Zap size={12} className="text-blue-500" />;
        if (n.includes('pabx') || m.includes('pabx') || n.includes('lsa')) return <PhoneCall size={12} />;
        return <Server size={12} />;
    };

    return (
        <div className="bg-white dark:bg-zinc-950 rounded-b-xl overflow-hidden flex flex-col min-h-[400px]">
            {/* Table Toolbar */}
            <div className="px-6 py-5 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600" size={14} />
                    <Input
                        placeholder="Search by target, IP, or patch port..."
                        className="w-full pl-10 h-11 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300 transition-all font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
                        <Filter size={14} className="text-slate-400" />
                        <select
                            className="bg-transparent text-[10px] font-bold uppercase text-slate-600 dark:text-zinc-400 focus:outline-none cursor-pointer"
                            value={deviceFilter}
                            onChange={e => setDeviceFilter(e.target.value)}
                        >
                            <option value="All">All Source Hardware</option>
                            {switches.map(sw => (
                                <option key={sw.id} value={sw.id}>{sw.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar max-h-[500px]">
                <Table className="w-full">
                    <TableHeader className="bg-white dark:bg-zinc-950 sticky top-0 z-10">
                        <TableRow className="border-b border-slate-100 dark:border-zinc-800 hover:bg-transparent">
                            <TableHead className="px-6 h-12 text-[9px] font-bold uppercase tracking-widest text-slate-400">Source Device</TableHead>
                            <TableHead className="px-6 h-12 text-[9px] font-bold uppercase tracking-widest text-slate-400">Circuit ID</TableHead>
                            <TableHead className="px-6 h-12 text-[9px] font-bold uppercase tracking-widest text-slate-400">Patch Location</TableHead>
                            <TableHead className="px-6 h-12 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                            <TableHead className="px-6 h-12 text-[9px] font-bold uppercase tracking-widest text-slate-400">Connection Target</TableHead>
                            <TableHead className="px-6 h-12 text-[9px] font-bold uppercase tracking-widest text-slate-400">Infrastructure</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-50 dark:divide-slate-900">
                        {filteredConnections.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="px-6 py-24 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No connections found matching filters.</TableCell></TableRow>
                        ) : filteredConnections.map((conn, idx) => (
                            <TableRow key={`${conn.switchId}-${conn.port.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                                <TableCell className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                            {getSourceIcon(conn.switchName, conn.switchModel)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-tight leading-none">{conn.switchName}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none">{conn.switchModel}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 font-mono text-slate-500 dark:text-zinc-400 text-[11px] font-bold">P-{conn.port.portNumber.toString().padStart(2, '0')}</TableCell>
                                <TableCell className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-md font-mono text-[10px] font-bold border border-slate-200 dark:border-zinc-700">
                                        {conn.port.patchPanelPort || 'N/A'}
                                    </span>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-center">
                                    <div className={`w-2 h-2 mx-auto rounded-full ${conn.port.status === PortStatus.ACTIVE ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'}`}></div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    {conn.uplink ? (
                                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-[9px] border border-indigo-100/50 dark:border-indigo-500/20 uppercase">
                                            <ShieldCheck size={10} /> {conn.uplink}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase leading-none tracking-tight">{conn.port.deviceConnected || 'UNASSIGNED'}</span>
                                            {conn.port.ipAddress && <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{conn.port.ipAddress}</span>}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                        <Cable size={12} className="opacity-50" />
                                        {conn.port.cableType || conn.port.cableLength || 'Cat6'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="px-6 py-4 bg-white dark:bg-zinc-950 text-[9px] text-slate-400 font-bold uppercase tracking-widest flex justify-between items-center border-t border-slate-100 dark:border-zinc-800">
                <span className="flex items-center gap-2"><Network size={12} /> Segments Found: {filteredConnections.length}</span>
                <span className="opacity-50">Authorized Infrastructure Report</span>
            </div>
        </div>
    );
};

