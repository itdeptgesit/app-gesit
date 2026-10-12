'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Cpu, Server, PhoneCall, Video, Radio, Database, HardDrive, Hash, Layers, Save, Cable, MapPin, ListOrdered, Shield, Link2 } from 'lucide-react';
import { NetworkSwitch, SwitchPort, PortStatus, DeviceType, DeviceStatus } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SwitchFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: NetworkSwitch) => void;
    initialData?: NetworkSwitch | null;
}

export const SwitchFormModal: React.FC<SwitchFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [category, setCategory] = useState<'Network' | 'Security' | 'Telephony'>('Network');
    const [availableSwitches, setAvailableSwitches] = useState<{ id: string, name: string }[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        rack: '',
        model: '',
        ip: '',
        serialNumber: '',
        displayOrder: 1,
        totalPorts: 24,
        vlanDefault: '10',
        storage: '4TB',
        channels: '16',
        extRange: '100-199',
        pairs: '50',
        cableType: 'Cat6' as any,
        uplinkId: 'internet',
        status: 'active' as DeviceStatus,
        notes: ''
    });

    useEffect(() => {
        const fetchSwitches = async () => {
            const { data } = await supabase.from('network_switches').select('id, name');
            if (data) setAvailableSwitches(data.map(d => ({ id: d.id.toString(), name: d.name })));
        };
        if (isOpen) {
            fetchSwitches();
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    location: initialData.location || '',
                    rack: initialData.rack || '',
                    model: initialData.model || '',
                    ip: initialData.ip || '',
                    serialNumber: initialData.serialNumber || '',
                    displayOrder: initialData.displayOrder || 1,
                    totalPorts: initialData.totalPorts || 24,
                    vlanDefault: '10',
                    storage: '4TB',
                    channels: (initialData.totalPorts || 0).toString(),
                    extRange: '100-199',
                    pairs: (initialData.totalPorts || 0).toString(),
                    cableType: initialData.ports?.[0]?.cableType || 'Cat6',
                    uplinkId: initialData.uplinkId || 'internet',
                    status: (initialData.status as DeviceStatus) || DeviceStatus.ACTIVE,
                    notes: initialData.notes || ''
                });

                const modelLower = (initialData.model || '').toLowerCase();
                const nameLower = (initialData.name || '').toLowerCase();
                if (modelLower.includes('nvr') || modelLower.includes('dvr') || nameLower.includes('nvr') || nameLower.includes('dvr')) setCategory('Security');
                else if (modelLower.includes('pabx') || nameLower.includes('pabx') || nameLower.includes('lsa')) setCategory('Telephony');
                else setCategory('Network');
            } else {
                setFormData({
                    name: '', location: '', rack: '', model: '', ip: '', serialNumber: '', displayOrder: 1, totalPorts: 24,
                    vlanDefault: '10', storage: '4TB', channels: '16', extRange: '100-199', pairs: '50',
                    cableType: 'Cat6', uplinkId: 'internet',
                    status: DeviceStatus.ACTIVE,
                    notes: ''
                });
                setCategory('Network');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let targetPorts = Number(formData.totalPorts);
        if (category === 'Security') targetPorts = Number(formData.channels);
        if (category === 'Telephony') targetPorts = Number(formData.pairs);
        if (isNaN(targetPorts) || targetPorts <= 0) targetPorts = 1;

        if (initialData) {
            let currentPorts = [...(initialData.ports || [])];
            if (targetPorts > currentPorts.length) {
                // Add more ports
                const newPorts: SwitchPort[] = Array.from({ length: targetPorts - currentPorts.length }, (_, i) => {
                    const portNum = currentPorts.length + i + 1;
                    return {
                        id: `temp-port-${Date.now()}-${portNum}`,
                        portNumber: portNum,
                        status: PortStatus.IDLE,
                        deviceType: DeviceType.UNKNOWN,
                        patchPanelPort: `PP-${portNum}`,
                        cableType: formData.cableType
                    };
                });
                currentPorts = [...currentPorts, ...newPorts];
            } else if (targetPorts < currentPorts.length) {
                // Prune ports
                currentPorts = currentPorts.slice(0, targetPorts);
            }

            const updatedDevice: NetworkSwitch = {
                ...initialData,
                name: formData.name,
                location: formData.location || 'Unknown Site',
                rack: formData.rack || 'Unracked',
                model: formData.model,
                ip: formData.ip,
                serialNumber: formData.serialNumber,
                displayOrder: Number(formData.displayOrder),
                totalPorts: targetPorts,
                uplinkId: formData.uplinkId,
                status: formData.status,
                notes: formData.notes,
                ports: currentPorts
            };
            onSubmit(updatedDevice);
        } else {
            let defaultType = DeviceType.UNKNOWN;

            if (category === 'Network') {
                const isAP = formData.model.toLowerCase().includes('access point') || formData.name.toLowerCase().includes('ap-');
                defaultType = isAP ? DeviceType.AP : DeviceType.PC;
                if (isAP) targetPorts = 1; // AP usually only has 1 management port
            } else if (category === 'Security') {
                const isNvr = formData.model.toLowerCase().includes('nvr') || formData.name.toLowerCase().includes('nvr');
                defaultType = DeviceType.CCTV;
                if (isNvr) targetPorts = 1;
            } else if (category === 'Telephony') {
                defaultType = DeviceType.ANALOG_PHONE;
            }

            const newPorts: SwitchPort[] = Array.from({ length: targetPorts }, (_, i) => {
                const rawVlan = category === 'Network' ? Number(formData.vlanDefault) : undefined;
                const vlanVal = (rawVlan === undefined || isNaN(rawVlan) || rawVlan === 0) ? undefined : rawVlan;

                return {
                    id: `temp-port-${Date.now()}-${i + 1}`,
                    portNumber: i + 1,
                    status: PortStatus.IDLE,
                    deviceType: defaultType,
                    patchPanelPort: `PP-${i + 1}`,
                    vlan: vlanVal,
                    cableType: formData.cableType
                };
            });

            const newDevice: NetworkSwitch = {
                id: `temp-sw-${Date.now()}`,
                name: formData.name,
                location: formData.location || 'Unknown Site',
                rack: formData.rack || 'Unracked',
                model: formData.model,
                ip: formData.ip || (category === 'Telephony' ? '-' : 'DHCP'),
                serialNumber: formData.serialNumber,
                displayOrder: Number(formData.displayOrder),
                totalPorts: targetPorts,
                uptime: 'Stable',
                ports: newPorts,
                uplinkId: formData.uplinkId,
                status: formData.status,
                notes: formData.notes,
                posX: 1200, // Safe default position
                posY: 400
            };

            onSubmit(newDevice);
        }
    };

    const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-background rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col border border-border/60 my-8 font-sans">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {initialData ? 'Update Node' : 'Provision Node'}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Infrastructure Database Entry</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg text-muted-foreground"><X size={18} /></Button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-6 overflow-y-auto flex-1 max-h-[70vh]">
                        {/* Segment Tab Buttons */}
                        <div className="flex p-1 bg-muted rounded-lg border border-border/40 mb-6 max-w-md mx-auto">
                            {[
                                { id: 'Network', icon: Radio, label: 'Network' },
                                { id: 'Security', icon: Video, label: 'Security' },
                                { id: 'Telephony', icon: PhoneCall, label: 'Telephony' }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    disabled={!!initialData}
                                    onClick={() => setCategory(cat.id as any)}
                                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${category === cat.id ? 'bg-background text-foreground shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <cat.icon size={14} className={category === cat.id ? 'text-foreground' : 'text-muted-foreground'} />
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                                <Shield size={14} className="text-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Hardware Identity</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label className="block mb-1.5 ml-1">Identity Name</Label>
                                    <Input required className={inputClass} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. CORE-SW-01 or AP-Lobby-01" />
                                </div>
                                <div>
                                    <Label className="block mb-1.5 ml-1">Hardware Model</Label>
                                    <Input required className={inputClass} value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. Cisco C9200L or UniFi 6 Pro" />
                                </div>
                                <div>
                                    <Label className="block mb-1.5 ml-1">Management IP</Label>
                                    <Input className={inputClass} value={formData.ip} onChange={e => setFormData({ ...formData, ip: e.target.value })} placeholder="192.168.1.x" />
                                </div>
                                <div>
                                    <Label className="block mb-1.5 ml-1">Serial Number / Asset ID</Label>
                                    <Input className={inputClass} value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} placeholder="SN-XXXXXXX" />
                                </div>
                                <div>
                                    <Label className="block mb-1.5 ml-1">Site Location</Label>
                                    <Input required className={inputClass} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Server Room A" />
                                </div>
                                <div>
                                    <Label className="block mb-1.5 ml-1">Uplink Connection (Parent)</Label>
                                    <select className={inputClass} value={formData.uplinkId} onChange={e => setFormData({ ...formData, uplinkId: e.target.value })}>
                                        <option value="internet">Direct to Internet/Core Hub</option>
                                        {availableSwitches.filter(s => s.id !== initialData?.id).map(sw => (
                                            <option key={sw.id} value={sw.id}>{sw.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                                <Layers size={14} className="text-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Interface Configuration</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {category === 'Network' && (
                                    <>
                                        <div>
                                            <Label className="block mb-1.5 ml-1">Port Density (Total)</Label>
                                            <select className={inputClass} value={formData.totalPorts} onChange={e => setFormData({ ...formData, totalPorts: Number(e.target.value) })}>
                                                <option value={4}>4 Ports</option>
                                                <option value={5}>5 Ports</option>
                                                <option value={8}>8 Ports</option>
                                                <option value={10}>10 Ports</option>
                                                <option value={13}>13 Ports (Mikrotik)</option>
                                                <option value={16}>16 Ports</option>
                                                <option value={24}>24 Ports</option>
                                                <option value={28}>28 Ports</option>
                                                <option value={48}>48 Ports</option>
                                                <option value={52}>52 Ports</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="block mb-1.5 ml-1">Default VLAN</Label>
                                            <Input type="number" className={inputClass} value={formData.vlanDefault} onChange={e => setFormData({ ...formData, vlanDefault: e.target.value })} placeholder="10" />
                                        </div>
                                    </>
                                )}

                                {category === 'Security' && (
                                    <>
                                        <div>
                                            <Label className="block mb-1.5 ml-1">Input Channels</Label>
                                            <select className={inputClass} value={formData.channels} onChange={e => setFormData({ ...formData, channels: e.target.value })}>
                                                <option value="4">4 Channels</option>
                                                <option value="8">8 Channels</option>
                                                <option value="16">16 Channels</option>
                                                <option value="32">32 Channels</option>
                                                <option value="64">64 Channels</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="block mb-1.5 ml-1">Storage Capacity</Label>
                                            <Input className={inputClass} value={formData.storage} onChange={e => setFormData({ ...formData, storage: e.target.value })} placeholder="e.g. 8TB" />
                                        </div>
                                    </>
                                )}

                                {category === 'Telephony' && (
                                    <>
                                        <div>
                                            <Label className="block mb-1.5 ml-1">LSA/Pair Density</Label>
                                            <Input type="number" className={inputClass} value={formData.pairs} onChange={e => setFormData({ ...formData, pairs: e.target.value })} placeholder="50" />
                                        </div>
                                        <div>
                                            <Label className="block mb-1.5 ml-1">Extension Range</Label>
                                            <Input className={inputClass} value={formData.extRange} onChange={e => setFormData({ ...formData, extRange: e.target.value })} placeholder="100-199" />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <Label className="block mb-1.5 ml-1">Backbone Media</Label>
                                    <select className={inputClass} value={formData.cableType} onChange={e => setFormData({ ...formData, cableType: e.target.value })}>
                                        <option value="Cat6">Cat6 (UTP)</option>
                                        <option value="Cat5e">Cat5e (UTP)</option>
                                        <option value="Fiber">Fiber Optic</option>
                                        <option value="Coaxial">Coaxial</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="block mb-1.5 ml-1">Governance Status</Label>
                                    <select required className={inputClass} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as DeviceStatus })}>
                                        <option value={DeviceStatus.ACTIVE}>Active / Online</option>
                                        <option value={DeviceStatus.SPARE}>Spare / Inventory</option>
                                        <option value={DeviceStatus.MAINTENANCE}>Under Maintenance</option>
                                        <option value={DeviceStatus.DECOMMISSIONED}>Decommissioned</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="block mb-1.5 ml-1">Documentation Notes</Label>
                                    <Textarea className={`${inputClass} min-h-[5rem] resize-none pb-2 pt-3`} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Add technical notes, port assignment rules, or maintenance history..." />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="px-6 py-3.5 bg-muted/10 border-t border-border/40 gap-2 flex sm:justify-end shrink-0">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="px-6">
                            <Save size={14} className="mr-2" />
                            {initialData ? 'Save Changes' : 'Save'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

