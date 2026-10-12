'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Network, Server, Wifi, Video, Printer, Smartphone, Monitor, Square, Phone, PhoneCall, Save, Link2, Cable } from 'lucide-react';
import { SwitchPort, DeviceType, PortStatus, NetworkSwitch } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PortDetailModalProps {
  port: SwitchPort | null;
  onClose: () => void;
  switchName: string;
  onSave?: (updatedPort: SwitchPort) => void;
  availableSwitches?: NetworkSwitch[];
  canManage?: boolean;
}

const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case DeviceType.AP: return <Wifi className="text-zinc-650" />;
    case DeviceType.CCTV: return <Video className="text-purple-500" />;
    case DeviceType.PRINTER: return <Printer className="text-orange-500" />;
    case DeviceType.IP_PHONE: return <Smartphone className="text-green-500" />;
    case DeviceType.ANALOG_PHONE: return <Phone className="text-green-600" />;
    case DeviceType.SERVER: return <Server className="text-indigo-600" />;
    case DeviceType.PC: return <Monitor className="text-slate-600" />;
    case DeviceType.FACEPLATE: return <Square className="text-yellow-600" />;
    case DeviceType.PABX: return <PhoneCall className="text-zinc-750" />;
    default: return <Network className="text-gray-400" />;
  }
};

const getStatusColor = (status: PortStatus) => {
  switch (status) {
    case PortStatus.ACTIVE: return 'bg-green-100 text-green-700 border-green-200';
    case PortStatus.IDLE: return 'bg-red-50 text-red-600 border-red-200';
    case PortStatus.ERROR: return 'bg-orange-100 text-orange-700 border-orange-200';
    case PortStatus.DISABLED: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export const PortDetailModal: React.FC<PortDetailModalProps> = ({ port, onClose, switchName, onSave, availableSwitches = [], canManage = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<SwitchPort>>({});

  useEffect(() => {
    if (port) {
      setEditData(port);
      setIsEditing(false);
    }
  }, [port]);

  if (!port) return null;

  const handleSave = () => {
    if (onSave && port) {
      onSave({ ...port, ...editData } as SwitchPort);
      setIsEditing(false);
    }
  };

  const isLSA = switchName.includes('LSA');
  const isVoicePanel = switchName.includes('Faceplate') || switchName.includes('Voice Panel');
  const isTelephony = isLSA || isVoicePanel;

  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
  const labelClass = "text-sm font-medium text-foreground block mb-1.5";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md font-sans">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border/60">
        <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {isTelephony ? `${port.patchPanelPort || 'Port ' + port.portNumber}` : `Port ${port.portNumber}`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{switchName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg text-muted-foreground"><X size={16} /></Button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 max-h-[70vh]">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center">
              {getDeviceIcon(editData.deviceType as DeviceType || port.deviceType)}
            </div>
            <div className="flex-1">
              <label className={labelClass}>Connection Target</label>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Input value={editData.deviceConnected || ''} onChange={e => setEditData({ ...editData, deviceConnected: e.target.value })} className={inputClass} placeholder="e.g. Finance PC-01" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value as PortStatus })} className={inputClass}><option value={PortStatus.ACTIVE}>Active</option><option value={PortStatus.IDLE}>Idle</option><option value={PortStatus.ERROR}>Error</option><option value={PortStatus.DISABLED}>Disabled</option></select>
                    <select value={editData.deviceType} onChange={e => setEditData({ ...editData, deviceType: e.target.value as DeviceType })} className={inputClass}>{Object.values(DeviceType).map(dt => <option key={dt} value={dt}>{dt}</option>)}</select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5"><h4 className="text-lg font-semibold text-foreground leading-none">{port.deviceConnected || "Unassigned"}</h4><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border w-fit ${getStatusColor(port.status)}`}><span className={`w-1.5 h-1.5 rounded-full ${port.status === PortStatus.ACTIVE ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-slate-400'}`}></span>{port.status}</span></div>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg border border-border/40">
                <label className={labelClass}>IP Address</label>
                {isEditing ? (
                  <Input type="text" className={inputClass} value={editData.ipAddress || ''} onChange={e => setEditData({ ...editData, ipAddress: e.target.value })} placeholder="e.g. 192.168.1.50" />
                ) : (
                  <p className="font-mono font-semibold text-foreground text-sm">{port.ipAddress || '-'}</p>
                )}
              </div>
              <div className="bg-muted/30 p-4 rounded-lg border border-border/40">
                <label className={labelClass}>MAC Address</label>
                {isEditing ? (
                  <Input type="text" className={inputClass} value={editData.macAddress || ''} onChange={e => setEditData({ ...editData, macAddress: e.target.value })} placeholder="e.g. 00:0A:95:9D:68:16" />
                ) : (
                  <p className="font-mono font-semibold text-muted-foreground text-xs">{port.macAddress || '-'}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg border border-border/40"><label className={labelClass}>VLAN / Logic ID</label>{isEditing ? (<Input type="number" className={inputClass} value={editData.vlan || ''} onChange={e => setEditData({ ...editData, vlan: Number(e.target.value) })} />) : (<p className="font-semibold text-foreground text-lg">{port.vlan || '-'}</p>)}</div>
              <div className="bg-muted/30 p-4 rounded-lg border border-border/40">
                <label className={labelClass}>Link Speed</label>
                {isEditing ? (
                  <select className={inputClass} value={editData.linkSpeed || '1 Gbps'} onChange={e => setEditData({ ...editData, linkSpeed: e.target.value as any })}>
                    <option value="10 Mbps">10 Mbps</option>
                    <option value="100 Mbps">100 Mbps</option>
                    <option value="1 Gbps">1 Gbps</option>
                    <option value="2.5 Gbps">2.5 Gbps</option>
                    <option value="10 Gbps">10 Gbps</option>
                  </select>
                ) : (
                  <p className="font-semibold text-foreground text-sm italic">{port.linkSpeed || '1 Gbps'}</p>
                )}
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border/40"><label className={labelClass}>Media Infrastructure</label>{isEditing ? (<select className={inputClass} value={editData.cableType || 'Cat6'} onChange={e => setEditData({ ...editData, cableType: e.target.value as any })}><option value="Cat6">Cat6 (UTP)</option><option value="Cat5e">Cat5e (UTP)</option><option value="Coaxial">Coaxial (Analog)</option><option value="Fiber">Fiber Optic</option></select>) : (<div className="flex flex-col"><span className="font-semibold text-foreground flex items-center gap-2"><Cable size={14} className="text-muted-foreground" />{port.cableType || 'UTP/Cat6'}</span><span className="text-xs text-muted-foreground mt-1 font-medium">{port.cableLength || 'Std Length'}</span></div>)}</div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border/40"><label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Link2 size={12} /> Switch Interconnection</label>{isEditing ? (<select className={inputClass} value={editData.uplinkDeviceId || ''} onChange={e => setEditData({ ...editData, uplinkDeviceId: e.target.value })}><option value="">No Uplink (End Device)</option>{availableSwitches.filter(s => s.name !== switchName).map(sw => (<option key={sw.id} value={sw.id}>Link to: {sw.name}</option>))}</select>) : (<div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${port.uplinkDeviceId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><Server size={18} /></div><div><p className="text-sm font-semibold text-foreground">{port.uplinkDeviceId ? availableSwitches.find(s => s.id === port.uplinkDeviceId)?.name : 'Standalone Port'}</p><p className="text-xs text-muted-foreground">{port.uplinkDeviceId ? 'Fiber/Copper Trunking' : 'Connected to standard end-device'}</p></div></div>)}</div>
            <div className="pt-4 border-t border-border/40"><label className={labelClass}>Physical Documentation</label><div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Patch Panel Port</span><span className="font-mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">{port.patchPanelPort}</span></div></div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-border/40 gap-2 flex sm:justify-end bg-muted/10 shrink-0">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canManage && (
            isEditing ? (
              <Button onClick={handleSave} className="px-6"><Save size={16} /> Save Circuit</Button>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="px-6">Edit Wiring Config</Button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
