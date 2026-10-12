'use client';

import React, { useState, useEffect } from 'react';
import {
    X, Shield, Package, HardDrive, Settings, History,
    ExternalLink, Camera, Cloud, AlertCircle, CheckCircle2,
    Calendar, Tag, MapPin, Layers, Server, Activity,
    ChevronRight, Info
} from 'lucide-react';
import { NetworkSwitch, ITAsset, ActivityLog, PortStatus } from '../types';
import { supabase } from '../lib/supabaseClient';
import { UserAvatar } from './UserAvatar';
import { Button } from "@/components/ui/button";

interface DeviceProfileDrawerProps {
    device: NetworkSwitch | null;
    isOpen: boolean;
    onClose: () => void;
}

export const DeviceProfileDrawer: React.FC<DeviceProfileDrawerProps> = ({ device, isOpen, onClose }) => {
    const [assetData, setAssetData] = useState<ITAsset | null>(null);
    const [maintenanceLogs, setMaintenanceLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'maintenance'>('overview');

    useEffect(() => {
        if (isOpen && device) {
            fetchLinkedData();
        }
    }, [isOpen, device]);

    const fetchLinkedData = async () => {
        if (!device) return;
        setIsLoading(true);
        try {
            // 1. Fetch Asset Data via Serial Number
            if (device.serialNumber) {
                const { data: asset } = await supabase
                    .from('it_assets')
                    .select('*')
                    .eq('serial_number', device.serialNumber)
                    .single();

                if (asset) {
                    setAssetData({
                        id: asset.id,
                        assetId: asset.asset_id,
                        item: asset.item_name,
                        category: asset.category,
                        brand: asset.brand,
                        serialNumber: asset.serial_number,
                        status: asset.status,
                        location: asset.location,
                        user: asset.user_assigned,
                        remarks: asset.remarks,
                        company: asset.company,
                        department: asset.department,
                        purchaseDate: asset.purchase_date,
                        warrantyExp: asset.warranty_exp,
                        image_url: asset.image_url,
                        specs: asset.specs || {}
                    } as ITAsset);
                }
            }

            // 2. Fetch Maintenance Logs (Searching by device name in remarks or activity name)
            const { data: logs } = await supabase
                .from('activity_logs')
                .select('*')
                .or(`activity_name.ilike.%${device.name}%,remarks.ilike.%${device.name}%`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (logs) {
                setMaintenanceLogs(logs.map((l: any) => ({
                    id: l.id,
                    activityName: l.activity_name,
                    category: l.category,
                    status: l.status,
                    createdAt: l.created_at,
                    itPersonnel: l.it_personnel,
                    remarks: l.remarks
                } as any)));
            }
        } catch (err) {
            console.error('Error fetching linked device data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!device) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
            case 'Used':
            case 'Online': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'Broken': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            case 'Repair': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    return (
        <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] z-[200] transition-all duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10 md:hidden"
                    onClick={onClose}
                />
            )}

            <div className="h-full bg-background shadow-2xl border-l border-border/60 flex flex-col overflow-hidden">
                {/* Header Section */}
                <div className="relative px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute top-4 right-4 h-8 w-8 rounded-lg text-muted-foreground"
                    >
                        <X size={18} />
                    </Button>

                    <div className="flex items-center gap-3 mb-4 pr-10">
                        <div className="w-12 h-12 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center text-foreground">
                            <Server size={24} strokeWidth={2} />
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground font-medium block mb-0.5">Network Identity</span>
                            <h2 className="text-lg font-semibold text-foreground leading-none">{device.name}</h2>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${getStatusColor(device.status || assetData?.status || 'Online')}`}>
                            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            {device.status || assetData?.status || 'Operational'}
                        </div>
                        <div className="px-3 py-1.5 rounded-lg border border-border/60 bg-background text-xs font-medium text-muted-foreground">
                            ID: {assetData?.assetId || 'Virtual'}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="inline-flex w-[calc(100%-3rem)] h-9 items-center justify-center gap-1 bg-muted p-1 rounded-lg border border-border/40 mx-6 mt-4 overflow-hidden">
                    {[
                        { id: 'overview', icon: Info, label: 'Overview' },
                        { id: 'technical', icon: Settings, label: 'Specs' },
                        { id: 'maintenance', icon: History, label: 'Logs' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48 space-y-4">
                            <Activity className="animate-spin text-foreground" size={28} />
                            <p className="text-xs font-medium text-muted-foreground">Resending digital pulses...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {/* Asset Image */}
                                    <div className="relative group">
                                        <div className="w-full h-48 rounded-lg bg-muted/40 border border-border/60 overflow-hidden flex items-center justify-center">
                                            {assetData?.image_url ? (
                                                <img src={assetData.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                    <Camera size={32} className="text-muted-foreground" />
                                                    <span className="text-xs font-medium uppercase text-muted-foreground">No Physical Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" className="absolute bottom-3 right-3 h-9 w-9 rounded-lg bg-foreground/80 text-background backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all">
                                            <Camera size={16} />
                                        </Button>
                                    </div>

                                    {/* Core Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                                            <span className="text-xs font-medium text-muted-foreground block mb-1">Logic IP</span>
                                            <span className="text-sm font-mono font-semibold text-foreground tracking-tight">{device.ip || 'DHCP'}</span>
                                        </div>
                                        <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                                            <span className="text-xs font-medium text-muted-foreground block mb-1">Uptime</span>
                                            <span className="text-sm font-semibold text-foreground">{device.uptime || 'Stable'}</span>
                                        </div>
                                    </div>

                                    {/* Location & Ownership */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 rounded-lg border border-border/40">
                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                                <MapPin size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-medium text-muted-foreground block mb-0.5">Deployment Zone</span>
                                                <p className="text-sm font-semibold text-foreground">{device.location} • {device.rack}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-lg border border-border/40">
                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                                <Shield size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-medium text-muted-foreground block mb-0.5">Custodian / Dept</span>
                                                <p className="text-sm font-semibold text-foreground">{assetData?.user || 'IT Infrastructure'} • {assetData?.department || 'Global'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Documentation Notes */}
                                    {device.notes && (
                                        <div className="p-5 rounded-lg bg-muted/30 border border-border/40">
                                            <span className="text-xs font-medium text-muted-foreground block mb-2">Documentation Notes</span>
                                            <p className="text-sm text-muted-foreground leading-relaxed italic">"{device.notes}"</p>
                                        </div>
                                    )}

                                    {/* Audit Trail Section */}
                                    <div className="p-5 rounded-lg bg-muted/40 border border-border/40 space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <History size={14} className="text-muted-foreground" />
                                            <span className="text-sm font-semibold text-foreground">Digital Audit Trail</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-xs font-medium text-muted-foreground block">Provisioned By</span>
                                                <p className="text-sm font-semibold text-foreground leading-tight">{device.createdBy || 'System'}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{device.createdAt ? new Date(device.createdAt).toLocaleString() : 'Historical'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xs font-medium text-muted-foreground block">Last Synchronized</span>
                                                <p className="text-sm font-semibold text-emerald-500 leading-tight">{device.updatedBy || 'Automatic'}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{device.updatedAt ? new Date(device.updatedAt).toLocaleString() : 'Live'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="flex items-center justify-between p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 group hover:bg-emerald-500 hover:text-white transition-all">
                                            <div className="text-left">
                                                <span className="text-xs font-medium uppercase text-emerald-500 group-hover:text-white/80 block mb-0.5">Config</span>
                                                <span className="text-sm font-semibold uppercase">Backup</span>
                                            </div>
                                            <Cloud size={18} className="text-emerald-500 group-hover:text-white" />
                                        </button>
                                        <button className="flex items-center justify-between p-4 rounded-lg border border-zinc-500/20 bg-zinc-500/5 group hover:bg-foreground hover:text-background transition-all">
                                            <div className="text-left">
                                                <span className="text-xs font-medium uppercase text-zinc-500 group-hover:text-white/85 block mb-0.5">Specs</span>
                                                <span className="text-sm font-semibold uppercase">Datasheet</span>
                                            </div>
                                            <ExternalLink size={18} className="text-zinc-500 group-hover:text-white" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'technical' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <h3 className="text-sm font-semibold text-foreground mb-3">Hardware Specifications</h3>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Manufacturer', value: assetData?.brand || 'Generic' },
                                            { label: 'Model Series', value: device.model },
                                            { label: 'Logical VLAN', value: device.vlan || 'Hybrid' },
                                            { label: 'Physical Interface', value: `${device.totalPorts} Ports RJ45` },
                                            { label: 'Serial Identity', value: device.serialNumber || 'N/A' },
                                            { label: 'Current Load', value: `${device.ports.filter(p => p.status === PortStatus.ACTIVE).length} / ${device.totalPorts} Active` }
                                        ].map((spec, i) => (
                                            <div key={i} className="flex justify-between items-center p-4 rounded-lg bg-muted/30 border border-border/40">
                                                <span className="text-xs font-medium text-muted-foreground">{spec.label}</span>
                                                <span className="text-sm font-semibold text-foreground">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <h3 className="text-sm font-semibold text-foreground mt-6 mb-3">Lifecycle & Warranty</h3>
                                    <div className="bg-muted/40 rounded-lg p-5 border border-border/40 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <Shield size={64} className="text-muted-foreground" />
                                        </div>
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex justify-between items-center text-xs font-medium">
                                                <span className="text-muted-foreground">Purchase Date</span>
                                                <span className="text-foreground font-semibold">{assetData?.purchaseDate ? new Date(assetData.purchaseDate).toLocaleDateString() : 'Historical'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-medium">
                                                <span className="text-muted-foreground">Warranty Expires</span>
                                                <span className={new Date(assetData?.warrantyExp || '') < new Date() ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                                                    {assetData?.warrantyExp ? new Date(assetData.warrantyExp).toLocaleDateString() : 'Indefinite'}
                                                </span>
                                            </div>
                                            <div className="pt-4 mt-2 border-t border-border/40 flex gap-2">
                                                <Button variant="outline" className="flex-1">Claim Support</Button>
                                                <Button className="flex-1">Renew Logic</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'maintenance' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-semibold text-foreground">Operational Logs</h3>
                                        <Button variant="link" size="sm" className="px-0 font-medium">+ New Entry</Button>
                                    </div>

                                    {maintenanceLogs.length === 0 ? (
                                        <div className="p-10 text-center border-2 border-dashed border-border/60 rounded-lg">
                                            <AlertCircle size={32} className="text-muted-foreground/40 mx-auto mb-4" />
                                            <p className="text-xs font-medium text-muted-foreground">Zero maintenance records found for this frequency.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {maintenanceLogs.map((log, i) => (
                                                <div key={i} className="relative pl-6 pb-6 border-l border-border/40 last:pb-0">
                                                    <div className="absolute top-0 -left-1.5 w-3 h-3 rounded-full bg-primary shadow border-2 border-background" />
                                                    <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                                                        <div className="flex justify-between items-start mb-2 gap-4">
                                                            <h4 className="text-sm font-semibold text-foreground leading-none">{log.activityName}</h4>
                                                            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic mb-3">"{log.remarks || 'No technical notes recorded.'}"</p>
                                                        <div className="flex items-center gap-2">
                                                            <UserAvatar name={log.itPersonnel} size="xs" />
                                                            <span className="text-xs font-semibold text-foreground">{log.itPersonnel}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer / External Search */}
                <div className="px-6 py-3.5 border-t border-border/40 bg-muted/10 shrink-0">
                    <Button className="w-full">
                        <Activity size={16} />
                        Live Network Probe
                    </Button>
                </div>
            </div>
        </div>
    );
};

