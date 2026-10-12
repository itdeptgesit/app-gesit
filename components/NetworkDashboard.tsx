
'use client';

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import {
    Server, RefreshCcw, Layout, Search, GitBranch, Plus,
    Loader2, Pencil, Trash2, Save, Cable, Activity,
    Layers, AlertTriangle, Globe, Wifi, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NetworkSwitch, SwitchPort, PortStatus, UserAccount, DeviceType } from '../types';
import { SwitchVisualizer } from './SwitchVisualizer';
import { PortDetailModal } from './PortDetailModal';
import { WiringSchedule } from './WiringSchedule';
import { SwitchFormModal } from './SwitchFormModal';
import { TopologyDiagram } from './TopologyDiagram';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import { exportToExcel } from '../lib/excelExport';
import { FileSpreadsheet } from 'lucide-react';
import { useToast } from './ToastProvider';
import { DeviceProfileDrawer } from './DeviceProfileDrawer';
import { NetworkSummaryBar } from './NetworkSummaryBar';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface NetworkDashboardProps {
    onBack: () => void;
    currentUser: UserAccount | null;
}

function getDeviceKind(sw: NetworkSwitch): 'core' | 'ap' | 'switch' {
    const model = (sw.model || '').toLowerCase();
    const name = (sw.name || '').toLowerCase();
    const uplinkId = (sw.uplinkId || '').toLowerCase();
    if (uplinkId === 'internet' || uplinkId === 'gateway' || uplinkId === 'root' || /core|isp|router|mikrotik/.test(model)) return 'core';
    if (model.includes('ap') || model.includes('unifi') || /access ?point/.test(name) || name.includes('ap')) return 'ap';
    return 'switch';
}

export const NetworkDashboard: React.FC<NetworkDashboardProps> = ({ onBack, currentUser }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [switches, setSwitches] = useState<NetworkSwitch[]>([]);
    const [internetPos, setInternetPos] = useState({ x: 1070, y: 120 });
    const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);
    const [selectedSwitch, setSelectedSwitch] = useState<NetworkSwitch | null>(null);
    const [editingDevice, setEditingDevice] = useState<NetworkSwitch | null>(null);
    const [coreNodeId, setCoreNodeId] = useState<string | number | null>(null);
    const [deleteDevice, setDeleteDevice] = useState<NetworkSwitch | null>(null);
    const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'topology' | 'status' | 'wiring' | 'devices'>('topology');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileDevice, setProfileDevice] = useState<NetworkSwitch | null>(null);
    const [centeringTrigger, setCenteringTrigger] = useState(0);
    const [isPending, startTransition] = useTransition();

    // RBAC Logic
    const roleLower = (currentUser?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
    const isStaff = roleLower === 'staff';
    const canManage = isAdmin || isSuperAdmin || isStaff;
    const canDelete = isAdmin || isSuperAdmin;

    const fetchNetworkData = async () => {
        setIsLoading(true);
        try {
            const { data: switchData } = await supabase
                .from('network_switches')
                .select(`
                    *,
                    creator:created_by(full_name),
                    updater:updated_by(full_name)
                `)
                .order('display_order', { ascending: true });
            const { data: portData } = await supabase.from('switch_ports').select('*');

            if (switchData) {
                // Find Core Node first
                const coreNode = switchData.find(sw => sw.uplink_id === null) ||
                    switchData.find(sw => sw.id === 'internet') ||
                    switchData.find(sw => sw.name.toLowerCase().includes('core hub')) ||
                    switchData.find(sw => (sw.name || '').toLowerCase().includes('mikrotik')) ||
                    switchData.find(sw => (sw.name || '').toLowerCase().includes('gateway'));

                if (coreNode) {
                    setInternetPos({ x: coreNode.pos_x ?? 1070, y: coreNode.pos_y ?? 120 });
                    setCoreNodeId(coreNode.id);
                } else {
                    setInternetPos({ x: 1070, y: 120 });
                    setCoreNodeId(null);
                }

                // 1. Process Physical Switches
                const mappedSwitches: NetworkSwitch[] = switchData.map(sw => {
                    const switchPorts = portData?.filter(p => p.switch_id === sw.id).map(p => ({
                        id: p.id.toString(),
                        portNumber: p.port_number,
                        status: p.status,
                        deviceConnected: p.device_connected,
                        deviceType: p.device_type,
                        vlan: p.vlan,
                        cableLength: p.cable_length,
                        cableType: p.cable_type || 'Cat6',
                        ipAddress: p.ip_address,
                        macAddress: p.mac_address,
                        linkSpeed: p.link_speed,
                        patchPanelPort: p.patch_panel_port,
                        uplinkDeviceId: p.uplink_device_id?.toString()
                    })) || [];

                    return {
                        id: sw.id.toString(),
                        name: sw.name || 'Unnamed Device',
                        location: sw.location || 'Unknown',
                        rack: sw.rack || 'Unracked',
                        model: sw.model || 'Generic',
                        ip: sw.ip || 'DHCP',
                        serialNumber: sw.serial_number,
                        totalPorts: sw.total_ports || 0,
                        uptime: sw.uptime || 'Stable',
                        posX: sw.pos_x ?? 1200,
                        posY: sw.pos_y ?? 400,
                        uplinkId: sw.uplink_id?.toString() || 'internet',
                        ports: switchPorts.sort((a, b) => a.portNumber - b.portNumber),
                        status: sw.status || 'active',
                        notes: sw.notes,
                        createdBy: sw.creator?.full_name || sw.created_by,
                        createdAt: sw.created_at,
                        updatedBy: sw.updater?.full_name || sw.updated_by,
                        updatedAt: sw.updated_at
                    };
                });

                // 2. Scan Ports for ALL connected leaf devices (CCTV, PC, Server, AP, etc.)
                const subNodes: NetworkSwitch[] = [];
                mappedSwitches.forEach(sw => {
                    const activeLeafPorts = sw.ports.filter(port =>
                        port.status === PortStatus.ACTIVE &&
                        port.deviceType !== DeviceType.UNKNOWN &&
                        port.deviceType !== DeviceType.UPLINK &&
                        !port.uplinkDeviceId
                    );

                    const leafCount = activeLeafPorts.length;

                    activeLeafPorts.forEach((port, index) => {
                        const leafId = `port-device-${port.id}`;

                        // Dynamic Spreading: Calculate angle based on actual leaf count per switch
                        // We use a base angle and spread them 360 degrees or a wide arc
                        const baseAngle = -Math.PI / 2; // Start from top
                        const spreadAngle = (Math.PI * 2) / Math.max(1, leafCount);
                        const angle = baseAngle + (index * spreadAngle);

                        // Multi-layered staggering to handle dense clusters
                        // Every 8 nodes we move to the next "ring"
                        const ring = Math.floor(index / 8);
                        const radius = 250 + (ring * 120);

                        subNodes.push({
                            id: leafId,
                            name: port.deviceConnected || `${port.deviceType}-${port.portNumber}`,
                            model: port.deviceType,
                            location: sw.location,
                            rack: sw.rack,
                            ip: port.ipAddress || 'Active',
                            totalPorts: 1,
                            uptime: 'Online',
                            uplinkId: sw.id,
                            uplinkPort: port.portNumber,
                            vlan: port.vlan,
                            posX: sw.posX ? sw.posX + Math.cos(angle) * radius : 1500,
                            posY: sw.posY ? sw.posY + Math.sin(angle) * radius : 400,
                            ports: [{
                                id: `port-${port.id}`,
                                portNumber: 1,
                                status: PortStatus.ACTIVE,
                                deviceType: port.deviceType,
                                ipAddress: port.ipAddress,
                                macAddress: port.macAddress,
                                linkSpeed: port.linkSpeed
                            }]
                        });
                    });
                });

                setSwitches([...mappedSwitches, ...subNodes]);
                setHasUnsavedChanges(false);
            }
        } catch (err: any) { console.error(err); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchNetworkData(); }, []);

    const handleUpdateSwitches = (updatedSwitches: NetworkSwitch[], newInternetPos?: { x: number, y: number }) => {
        // Synchronize internet node inside the switches array if internetPos is provided
        let finalSwitches = updatedSwitches;
        if (newInternetPos) {
            finalSwitches = updatedSwitches.map(sw =>
                (sw.id === 'internet' || (coreNodeId && sw.id.toString() === coreNodeId.toString()))
                    ? { ...sw, posX: newInternetPos.x, posY: newInternetPos.y }
                    : sw
            );
            setInternetPos(newInternetPos);
        } else {
            // Fix: If a node matching coreNodeId was moved, sync the internetPos state too
            const movedCore = updatedSwitches.find(sw => coreNodeId && sw.id.toString() === coreNodeId.toString());
            if (movedCore && movedCore.posX !== undefined && movedCore.posY !== undefined) {
                if (movedCore.posX !== internetPos.x || movedCore.posY !== internetPos.y) {
                    setInternetPos({ x: movedCore.posX, y: movedCore.posY });
                }
            }
        }
        setSwitches(finalSwitches);
        setHasUnsavedChanges(true);
    };

    const handleSaveLayout = async () => {
        if (!canManage) return;
        setIsSaving(true);
        try {
            const updates = [];

            // 1. Prepare updates for all physical switches positions
            for (const sw of switches) {
                if (!sw.id.startsWith('port-device-') && sw.id !== 'internet' && sw.id.toString() !== coreNodeId?.toString()) {
                    updates.push(
                        supabase.from('network_switches').update({
                            pos_x: Math.round(sw.posX ?? 1200),
                            pos_y: Math.round(sw.posY ?? 400),
                            uplink_id: sw.uplinkId === 'internet' ? null : sw.uplinkId
                        }).eq('id', sw.id)
                    );
                }
            }

            // 2. Explicitly update the Internet/Core node position in the database by its stored ID
            if (coreNodeId) {
                updates.push(
                    supabase.from('network_switches')
                        .update({
                            pos_x: Math.round(internetPos.x),
                            pos_y: Math.round(internetPos.y)
                        })
                        .eq('id', coreNodeId)
                );
            }

            const results = await Promise.all(updates);
            const errors = results.filter(r => r.error).map(r => r.error);
            if (errors.length > 0) throw errors[0];

            setHasUnsavedChanges(false);
            setCenteringTrigger(prev => prev + 1);
            showToast("Circuit architecture synchronized successfully.", 'success');
            await fetchNetworkData();
        } catch (err: any) {
            console.error("Save error:", err);
            showToast("Error saving layout: " + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePort = async (updatedPort: SwitchPort) => {
        if (!canManage) return;
        setIsSaving(true);
        try {
            const payload = {
                device_connected: updatedPort.deviceConnected,
                status: updatedPort.status,
                device_type: updatedPort.deviceType,
                vlan: updatedPort.vlan,
                cable_type: updatedPort.cableType,
                cable_length: updatedPort.cableLength,
                ip_address: updatedPort.ipAddress,
                mac_address: updatedPort.macAddress,
                link_speed: updatedPort.linkSpeed,
                uplink_device_id: updatedPort.uplinkDeviceId || null,
                patch_panel_port: updatedPort.patchPanelPort
            };

            const { error } = await supabase
                .from('switch_ports')
                .update(payload)
                .eq('id', updatedPort.id);

            if (error) throw error;

            setSelectedPort(null);
            await fetchNetworkData();
        } catch (err: any) {
            showToast("Failed to update port: " + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDevice = async (deviceData: NetworkSwitch) => {
        if (!canManage) return;
        setIsSaving(true);
        try {
            const payload: any = {
                name: deviceData.name,
                location: deviceData.location,
                rack: deviceData.rack,
                model: deviceData.model,
                ip: deviceData.ip,
                serial_number: deviceData.serialNumber,
                display_order: deviceData.displayOrder,
                total_ports: deviceData.totalPorts,
                uplink_id: deviceData.uplinkId === 'internet' ? null : deviceData.uplinkId,
                status: deviceData.status,
                notes: deviceData.notes,
                updated_by: currentUser?.id,
                updated_at: new Date().toISOString()
            };

            if (editingDevice && !editingDevice.id.toString().startsWith('temp-')) {
                const { error } = await supabase.from('network_switches').update(payload).eq('id', editingDevice.id);
                if (error) throw error;

                // Sync Ports
                const oldPortCount = Number(editingDevice.totalPorts);
                const newPortCount = Number(deviceData.totalPorts);

                if (newPortCount > oldPortCount) {
                    // Add new ports
                    const portsToAdd = (deviceData.ports || [])
                        .filter(p => p.portNumber > oldPortCount)
                        .map(p => ({
                            switch_id: editingDevice.id,
                            port_number: p.portNumber,
                            status: PortStatus.IDLE,
                            device_type: DeviceType.UNKNOWN,
                            patch_panel_port: p.patchPanelPort || `PP-${p.portNumber}`,
                            cable_type: p.cableType || 'Cat6'
                        }));
                    if (portsToAdd.length > 0) {
                        const { error: portAddErr } = await supabase.from('switch_ports').insert(portsToAdd);
                        if (portAddErr) throw portAddErr;
                    }
                } else if (newPortCount < oldPortCount) {
                    // Remove extra ports
                    const { error: portRemErr } = await supabase
                        .from('switch_ports')
                        .delete()
                        .eq('switch_id', editingDevice.id)
                        .gt('port_number', newPortCount);
                    if (portRemErr) throw portRemErr;
                }
            } else {
                const { data: newSwitch, error: switchError } = await supabase
                    .from('network_switches')
                    .insert([{
                        ...payload,
                        created_by: currentUser?.id,
                        created_at: new Date().toISOString(),
                        pos_x: Math.round(editingDevice?.posX ?? 1200),
                        pos_y: Math.round(editingDevice?.posY ?? 400)
                    }])
                    .select()
                    .single();

                if (switchError) throw switchError;

                if (newSwitch && deviceData.ports && deviceData.ports.length > 0) {
                    const portsPayload = deviceData.ports.map((p: any) => ({
                        switch_id: newSwitch.id,
                        port_number: p.portNumber,
                        status: p.status || PortStatus.IDLE,
                        device_type: p.deviceType || DeviceType.UNKNOWN,
                        patch_panel_port: p.patch_panel_port || `PP-${p.portNumber}`,
                        vlan: p.vlan,
                        cable_length: p.cableType || 'Cat6'
                    }));
                    const { error: portError } = await supabase.from('switch_ports').insert(portsPayload);
                    if (portError) throw portError;
                }
            }
            setIsAddDeviceOpen(false);
            await fetchNetworkData();
        } catch (err: any) {
            showToast("Failed to save node: " + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const executeDeleteDevice = async () => {
        if (!deleteDevice || !canDelete) return;
        setIsSaving(true);
        try {
            if (canManage && String(deleteDevice.id) !== 'internet' && !deleteDevice.id.toString().startsWith('temp-') && !deleteDevice.id.toString().startsWith('port-device-')) {
                await supabase.from('switch_ports').delete().eq('switch_id', deleteDevice.id);
                const { error } = await supabase.from('network_switches').delete().eq('id', deleteDevice.id);
                if (error) throw error;
            }
            setDeleteDevice(null);
            await fetchNetworkData();
        } catch (err: any) {
            showToast("Failed to delete node: " + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNode = (type: DeviceType, x: number, y: number) => {
        // Pre-populate node data
        const newNode: NetworkSwitch = {
            id: `temp-${Date.now()}`,
            name: `New ${type}`,
            model: type,
            location: 'Main Site',
            rack: 'Unracked',
            ip: '-',
            totalPorts: (type === DeviceType.ROUTER) ? 4 : 1,
            uptime: 'Initial',
            posX: x,
            posY: y,
            ports: [],
            status: 'active'
        };
        setEditingDevice(newNode);
        setIsAddDeviceOpen(true);
    };

    const handleDeleteNode = (id: string) => {
        if (id.startsWith('port-device-')) {
            showToast("Cannot delete derived leaf devices directly. Disconnect from port instead.", "warning");
            return;
        }
        const sw = switches.find(s => s.id === id);
        if (sw) setDeleteDevice(sw);
    };

    const handleConnectNodes = async (childId: string, parentId: string) => {
        if (childId.startsWith('port-device-') || parentId.startsWith('port-device-')) {
            showToast("Only infrastructure nodes can be wired manually.", "warning");
            return;
        }

        if (childId.startsWith('temp-') || (parentId !== 'internet' && parentId.startsWith('temp-'))) {
            showToast("Please save individual nodes before wiring them.", "warning");
            return;
        }

        // Optimistic update local state
        handleUpdateSwitches(switches.map(s => String(s.id) === String(childId) ? { ...s, uplinkId: parentId } : s));

        setIsSaving(true);
        try {
            const dbUplinkId = parentId === 'internet' ? null : parentId;
            const { error } = await supabase
                .from('network_switches')
                .update({ uplink_id: dbUplinkId })
                .eq('id', childId);

            if (error) throw error;
            showToast("Circuit map synchronized", 'success');
            await fetchNetworkData();
        } catch (err: any) {
            showToast("Link failure: " + err.message, 'error');
            // Revert state if needed, but fetchNetworkData will handle it
            await fetchNetworkData();
        } finally {
            setIsSaving(false);
        }
    };

    const handleWipeTopology = async () => {
        setIsSaving(true);
        try {
            await supabase.rpc('wipe_tables', { table_names: ['switch_ports', 'network_switches'] });
            showToast("Topology erased successfully", 'success');
            setWipeConfirmOpen(false);
            await fetchNetworkData();
        } catch (err: any) {
            showToast("Failed to wipe topology: " + err.message, 'error');
        } finally {
            setIsSaving(true);
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    const filteredSwitches = useMemo(() => {
        return switches.filter(sw => !sw.id.startsWith('port-device-')).filter(sw => sw.name.toLowerCase().includes(searchTerm.toLowerCase()) || sw.ip.toLowerCase().includes(searchTerm.toLowerCase()) || sw.model.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [switches, searchTerm]);

    const handleExportSwitches = () => {
        const physicalSwitches = switches.filter(sw => !sw.id.startsWith('port-device-') && sw.id !== 'internet');
        if (physicalSwitches.length === 0) return;

        const dataToExport = physicalSwitches.map(sw => ({
            "Device Name": sw.name,
            "Model": sw.model,
            "IP Address": sw.ip,
            "Serial Number": sw.serialNumber || "-",
            "Location": sw.location,
            "Rack": sw.rack,
            "Total Ports": sw.totalPorts,
            "Governance Status": sw.status || "active",
            "Technical Notes": sw.notes || "-"
        }));

        exportToExcel(dataToExport, `GESIT-NETWORK-NODES-${new Date().toISOString().split('T')[0]}`);
    };

    const handleExportWiring = () => {
        const physicalSwitches = switches.filter(sw => !sw.id.startsWith('port-device-') && sw.id !== 'internet');
        const allPorts: any[] = [];

        physicalSwitches.forEach(sw => {
            sw.ports.forEach(p => {
                allPorts.push({
                    "Switch": sw.name,
                    "Port": p.portNumber,
                    "Status": p.status,
                    "Connected Device": p.deviceConnected || "-",
                    "Device Type": p.deviceType,
                    "IP Address": p.ipAddress || "-",
                    "MAC Address": p.macAddress || "-",
                    "VLAN": p.vlan || "-",
                    "Cable Type": p.cableType || "-",
                    "Patch Panel": p.patchPanelPort || "-"
                });
            });
        });

        if (allPorts.length === 0) return;
        exportToExcel(allPorts, `GESIT-WIRING-SCHEDULE-${new Date().toISOString().split('T')[0]}`);
    };

    const handleViewProfile = (device: NetworkSwitch) => {
        startTransition(() => {
            setActiveTab('status');
            setSelectedSwitch(device);
        });
        showToast(`Viewing hardware profile: ${device.name}`, 'info');
    };

    return (
        <div className={`animate-in fade-in duration-500 ${
            activeTab === 'topology' 
                ? 'flex flex-col space-y-4 h-[calc(100vh-115px)] overflow-hidden pb-0' 
                : 'space-y-8 pb-20'
        }`}>
            <PageHeader
                title="NetVision Infrastructure"
                description="Sentralisasi manajemen infrastruktur IT & monitoring jaringan real-time"
            >
                <div className="flex items-center gap-2">
                    <div className="flex bg-muted p-1 rounded-lg border border-border/40 mr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleExportSwitches}
                            className="w-8 text-muted-foreground hover:text-foreground"
                            title="Export Nodes"
                        >
                            <FileSpreadsheet size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleExportWiring}
                            className="w-8 text-muted-foreground hover:text-foreground"
                            title="Export Wiring"
                        >
                            <Server size={16} />
                        </Button>
                    </div>
                    {canManage && (
                        <Button
                            onClick={() => { setEditingDevice(null); setIsAddDeviceOpen(true); }}
                            className="font-semibold text-xs"
                        >
                            <Plus size={14} className="mr-2" /> Provision Node
                        </Button>
                    )}
                    {hasUnsavedChanges && activeTab === 'topology' && canManage && (
                        <Button
                            onClick={handleSaveLayout}
                            disabled={isSaving}
                            className="font-semibold text-xs"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                            Sync Geometry
                        </Button>
                    )}
                </div>
            </PageHeader>



            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-card border-b border-border/40 shadow-sm">
                    <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full md:w-auto overflow-x-auto hide-scrollbar">
                        {[{ id: 'topology', label: 'Topology', icon: GitBranch }, { id: 'status', label: 'Nodes', icon: Layout }, { id: 'wiring', label: 'Wiring', icon: Cable }, { id: 'devices', label: 'Hardware', icon: Server }].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => startTransition(() => setActiveTab(tab.id as any))} 
                                className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                    activeTab === tab.id 
                                        ? 'bg-background text-foreground shadow-sm' 
                                        : 'hover:text-foreground'
                                } ${isPending ? 'opacity-50 grayscale' : ''}`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 md:max-w-xs">
                        <Input 
                            placeholder="Filter registry..." 
                            className="w-full pl-9 bg-muted/50 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-ring" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                </div>
                <div className={`p-0 flex-1 relative ${activeTab === 'topology' ? 'h-full overflow-hidden flex flex-col' : 'min-h-[600px]'}`}>
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center h-[650px] gap-4 transition-all duration-300"
                            >
                                <RefreshCcw className="animate-spin text-blue-500" size={24} />
                                <p className="text-xs font-medium text-muted-foreground">Scanning Infrastructure...</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                className="w-full h-full flex flex-col"
                            >
                                {activeTab === 'topology' ? (
                                    <div className="h-full w-full relative overflow-hidden flex-1 flex flex-col">
                                        <TopologyDiagram
                                            switches={switches}
                                            internetPos={internetPos}
                                            onUpdateSwitches={handleUpdateSwitches}
                                            selectedNodeId={selectedSwitch?.id || null}
                                            setSelectedNodeId={(id) => {
                                                const sw = switches.find(s => s.id === id);
                                                setSelectedSwitch(sw || null);
                                            }}
                                            searchTerm={searchTerm}
                                            isLocked={!canManage}
                                            onViewProfile={handleViewProfile}
                                            centeringTrigger={centeringTrigger}
                                            coreNodeId={coreNodeId?.toString()}
                                            onAddNode={handleAddNode}
                                            onDeleteNode={handleDeleteNode}
                                            onConnectNodes={handleConnectNodes}
                                            onWipeAll={() => setWipeConfirmOpen(true)}
                                            onEditNode={(sw) => {
                                                setEditingDevice(sw);
                                                setIsAddDeviceOpen(true);
                                            }}
                                            canManage={canManage}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-6 md:p-8">
                                        {activeTab === 'status' ? (
                                            filteredSwitches.length === 0 ? (
                                                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
                                                    <Search size={32} className="text-muted-foreground/40" />
                                                    <p className="text-sm font-semibold text-foreground">No nodes found</p>
                                                    <p className="text-xs text-muted-foreground">Adjust the registry filter or provision a new node.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {filteredSwitches.map(sw => {
                                                        const activePorts = sw.ports.filter(p => p.status === PortStatus.ACTIVE).length;
                                                        const errorPorts = sw.ports.filter(p => p.status === PortStatus.ERROR).length;
                                                        const totalPorts = sw.totalPorts || sw.ports.length;
                                                        const nodeOnline = !sw.status || sw.status === 'active';
                                                        const isGateway = sw.uplinkId === 'internet' || sw.uplinkId === 'gateway' || sw.uplinkId === 'root';
                                                        return (
                                                            <div key={sw.id} className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                                                                <div className="flex flex-col gap-4 p-5 md:px-6 lg:flex-row lg:items-center lg:justify-between border-b border-border/60 bg-muted/20">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                                            <Server size={18} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <h3 className="text-base font-semibold text-foreground">{sw.name}</h3>
                                                                                {sw.model && <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium border border-border/60">{sw.model}</span>}
                                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${nodeOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                                                                                    <span className={`w-1.5 h-1.5 rounded-full ${nodeOnline ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                                                                    {nodeOnline ? 'Online' : 'Offline'}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground mt-1 font-medium truncate">{sw.location} • {sw.rack} • <span className="text-primary font-mono">{sw.ip}</span></p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border/60" title="Active ports / total ports">
                                                                                <Layers size={13} className="text-muted-foreground" /> {activePorts}/{totalPorts} ports
                                                                            </span>
                                                                            {errorPorts > 0 && (
                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title={`${errorPorts} port(s) in error state`}>
                                                                                    <AlertTriangle size={13} /> {errorPorts} error
                                                                                </span>
                                                                            )}
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border/60">
                                                                                <Globe size={13} className="text-muted-foreground" /> {isGateway ? 'Gateway' : 'Mesh'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="inline-flex items-center gap-1">
                                                                            {canManage && <Button variant="ghost" size="icon" onClick={() => { setEditingDevice(sw); setIsAddDeviceOpen(true); }} className="w-8 h-8 text-muted-foreground hover:text-primary" title="Edit node"><Pencil size={14} /></Button>}
                                                                            {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleteDevice(sw)} className="w-8 h-8 text-muted-foreground hover:text-destructive" title="Purge node"><Trash2 size={14} /></Button>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="p-5 md:p-6">
                                                                    <SwitchVisualizer switchDetails={sw} onPortClick={(port) => { setSelectedPort(port); setSelectedSwitch(sw); }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )
                                        ) : activeTab === 'wiring' ? (
                                            <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm"><WiringSchedule switches={switches} /></div>
                                        ) : (
                                            <div className="bg-card rounded-xl border border-border/60 overflow-x-auto shadow-sm">
                                                <Table className="w-full min-w-[760px]">
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/20 hover:bg-transparent">
                                                            <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Device Identity</TableHead>
                                                            <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Networking</TableHead>
                                                            <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Infrastructure Detail</TableHead>
                                                            <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80 text-center">Load Status</TableHead>
                                                            <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80 text-center">Operations</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody className="divide-y divide-border/40">
                                                        {filteredSwitches.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="px-6 py-16 text-center">
                                                                    <Search size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                                                                    <p className="text-sm font-semibold text-foreground">No devices found</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">Adjust the registry filter or provision a new device.</p>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            filteredSwitches.map(sw => {
                                                                const kind = getDeviceKind(sw);
                                                                const activePorts = sw.ports.filter(p => p.status === PortStatus.ACTIVE).length;
                                                                const errorPorts = sw.ports.filter(p => p.status === PortStatus.ERROR).length;
                                                                const totalPorts = sw.totalPorts || sw.ports.length;
                                                                const usage = totalPorts ? Math.min((activePorts / totalPorts) * 100, 100) : 0;
                                                                const nodeOnline = !sw.status || sw.status === 'active';
                                                                return (
                                                                    <TableRow key={sw.id} className="hover:bg-muted/30 transition-colors group">
                                                                        <TableCell className="px-6 py-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`w-8 h-8 flex items-center justify-center shrink-0 border border-border/60 ${kind === 'ap' ? 'rounded-full bg-sky-500/10 text-sky-500' : kind === 'core' ? 'rounded-xl bg-primary/10 text-primary' : 'rounded-xl bg-muted/50 text-muted-foreground'}`}>
                                                                                    {kind === 'ap' ? <Wifi size={15} /> : kind === 'core' ? <Network size={15} /> : <Server size={15} />}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <p className="font-semibold text-foreground text-sm leading-none">{sw.name}</p>
                                                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${nodeOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                                                                                            <span className={`w-1 h-1 rounded-full ${nodeOnline ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                                                                            {nodeOnline ? 'Online' : 'Offline'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="text-xs text-muted-foreground mt-1.5 leading-none font-medium">{sw.model || 'Generic Device'}</p>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <p className="font-mono text-primary text-xs font-semibold">{sw.ip}</p>
                                                                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                                                                <Globe size={11} className="text-muted-foreground/70" /> Static Access
                                                                            </p>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <p className="text-foreground text-sm font-medium leading-none">{sw.location}</p>
                                                                            <p className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2">
                                                                                <span>Rack {sw.rack}</span>
                                                                                {sw.serialNumber && (
                                                                                    <>
                                                                                        <span className="text-muted-foreground/40">•</span>
                                                                                        <span className="font-mono">SN: {sw.serialNumber}</span>
                                                                                    </>
                                                                                )}
                                                                            </p>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                                    <div className={`h-full rounded-full transition-all ${errorPorts > 0 ? 'bg-amber-500' : usage > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${usage}%` }} />
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-xs font-semibold text-muted-foreground">{activePorts}/{totalPorts}</span>
                                                                                    {errorPorts > 0 && (
                                                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400" title={`${errorPorts} port(s) in error state`}>
                                                                                            <AlertTriangle size={11} /> {errorPorts}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="px-6 py-4">
                                                                            <div className="flex justify-center gap-1">
                                                                                {canManage && <Button variant="ghost" size="icon" onClick={() => { setEditingDevice(sw); setIsAddDeviceOpen(true); }} className="w-8 h-8 text-muted-foreground hover:text-primary" title="Edit device"><Pencil size={14} /></Button>}
                                                                                {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleteDevice(sw)} className="w-8 h-8 text-muted-foreground hover:text-destructive" title="Delete device"><Trash2 size={14} /></Button>}
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <PortDetailModal
                port={selectedPort}
                onClose={() => setSelectedPort(null)}
                switchName={selectedSwitch?.name || ''}
                canManage={canManage}
                onSave={handleSavePort}
                availableSwitches={switches}
            />
            <SwitchFormModal
                isOpen={isAddDeviceOpen}
                onClose={() => setIsAddDeviceOpen(false)}
                onSubmit={handleSaveDevice}
                initialData={editingDevice}
            />
            <DangerConfirmModal
                isOpen={!!deleteDevice}
                onClose={() => setDeleteDevice(null)}
                onConfirm={executeDeleteDevice}
                title="Purge Hardware Node"
                message={`Are you sure you want to permanently erase ${deleteDevice?.name} and its associated circuit maps?`}
                isLoading={isSaving}
            />
            <DeviceProfileDrawer
                device={profileDevice}
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
            <DangerConfirmModal
                isOpen={wipeConfirmOpen}
                onClose={() => setWipeConfirmOpen(false)}
                onConfirm={handleWipeTopology}
                title="Wipe Entire Topology"
                message="This will permanently delete ALL infrastructure nodes and their port connections. You will start with a completely empty canvas. Are you sure?"
            />
        </div>
    );
};

