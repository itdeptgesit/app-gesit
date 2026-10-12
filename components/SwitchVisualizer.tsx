'use client';

import React from 'react';
import { NetworkSwitch, SwitchPort, PortStatus, DeviceType } from '../types';
import { Video, Wifi, Monitor, Server, Router, Square, PhoneCall, Disc, Box, Radio, Zap, Cable } from 'lucide-react';

interface SwitchVisualizerProps {
    switchDetails: NetworkSwitch;
    onPortClick: (port: SwitchPort) => void;
}

export const SwitchVisualizer: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    const model = (switchDetails.model || '').toLowerCase();
    const name = (switchDetails.name || '').toLowerCase();

    const isMikrotik = model.includes('rb1100') || model.includes('mikrotik') || name.includes('mikrotik') || name.includes('gateway');
    const isSecurity = model.includes('nvr') || model.includes('dvr') || name.includes('nvr') || name.includes('dvr');
    const isPabx = model.includes('pabx') || name.includes('pabx');
    const isLSA = model.includes('lsa') || name.includes('lsa');
    const isFaceplate = model.includes('faceplate') || name.includes('faceplate');
    const isAP = model.includes('access point') || name.includes('ap-') || model.includes('unifi') || model.includes('eap');
    const isCore = name.includes('core') || name.includes('dist');

    if (isAP) {
        return <AccessPointChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
    }

    if (isSecurity) {
        return <SecurityChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
    }

    if (isPabx) {
        return <PabxChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
    }

    if (isLSA) {
        return <LsaChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
    }

    if (isFaceplate) {
        return <FaceplatePanel switchDetails={switchDetails} onPortClick={onPortClick} />;
    }

    if (isMikrotik) {
        return <MikrotikChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
    }

    if (isCore) {
        return <CoreChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
    }

    return <StandardChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
};

const AccessPointChassis: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full border-4 border-white shadow-inner flex items-center justify-center relative">
                <Wifi size={32} className="text-blue-500" />
                <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_8px_#10b981]"></div>
            </div>
            <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{switchDetails.model}</span>
                <h4 className="text-base font-bold text-slate-800">{switchDetails.name}</h4>
                <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                        <Radio size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500">2.4 / 5 GHz Active</span>
                    </div>
                </div>
            </div>
            <div className="ml-auto flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                {(switchDetails.ports || []).map(port => (
                    <RJ45Port key={port.id} port={port} onClick={() => onPortClick(port)} />
                ))}
            </div>
        </div>
    );
};

const CoreChassis: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    const ports = [...(switchDetails.ports || [])].sort((a, b) => a.portNumber - b.portNumber);
    const portCount = ports.length;

    // Granular width calculation: 
    // If <= 12 ports: (ports * 45px) + 300px (info+console)
    // If > 12 ports: (columns * 40px) + 350px
    const columns = Math.ceil(portCount / 2);
    const minWidth = portCount <= 12
        ? Math.max(700, (portCount * 45) + 300)
        : Math.max(1000, (columns * 40) + 400);

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div
                style={{ minWidth: `${minWidth}px` }}
                className="bg-[#020617] rounded-xl p-6 shadow-2xl border border-slate-800 relative flex items-center h-44 overflow-hidden"
            >
                {/* Chassis Texture Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-xl opacity-20"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.1),_transparent)] pointer-events-none rounded-xl"></div>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.01)_2px,rgba(255,255,255,0.01)_3px)] pointer-events-none"></div>

                {/* Left Panel: Info */}
                <div className="flex flex-col gap-1 px-6 border-r border-slate-800/80 w-52 shrink-0 z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">System Healthy</span>
                    </div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.25em]">{switchDetails.model}</span>
                    <span className="text-[14px] font-bold text-white tracking-tight drop-shadow-md leading-tight">{switchDetails.name}</span>
                    <div className="flex gap-2 mt-3 items-center">
                        <div className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[7px] font-bold uppercase tracking-wider">L3 Managed</div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]"></div>
                    </div>
                </div>

                {/* Center Panel: Ports */}
                <div className="flex-1 flex gap-3 items-center justify-center px-8 z-10 overflow-visible">
                    {portCount <= 12 ? (
                        <div className="flex gap-4 items-end">
                            {ports.map(port => (
                                <RJ45Port key={port.id} port={port} onClick={() => onPortClick(port)} />
                            ))}
                        </div>
                    ) : (
                        (() => {
                            const topRow = ports.filter(p => (p.portNumber % 2 !== 0));
                            const bottomRow = ports.filter(p => (p.portNumber % 2 === 0));

                            return (
                                <div className="flex gap-2 items-center">
                                    {Array.from({ length: columns }).map((_, colIndex) => {
                                        const tPort = topRow[colIndex];
                                        const bPort = bottomRow[colIndex];
                                        const isGroupEdge = (colIndex + 1) % 8 === 0 && colIndex !== columns - 1;
                                        return (
                                            <React.Fragment key={colIndex}>
                                                <div className="flex flex-col gap-3">
                                                    {tPort && <RJ45Port port={tPort} onClick={() => onPortClick(tPort)} isTop />}
                                                    {bPort && <RJ45Port port={bPort} onClick={() => onPortClick(bPort)} />}
                                                </div>
                                                {isGroupEdge && <div className="w-10 border-r border-slate-800/60 h-28 self-center mx-3 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]"></div>}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            );
                        })()
                    )}
                </div>

                {/* Right Panel: Uplinks/Misc */}
                <div className="flex gap-6 px-8 border-l border-slate-800/80 shrink-0 z-10 h-full items-center">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Console</span>
                        <div className="w-12 h-12 bg-black rounded-lg border border-slate-800 p-0.5 shadow-[inset_0_2px_10px_rgba(0,0,0,1)]">
                            <div className="w-full h-full border border-slate-800/50 rounded flex items-center justify-center text-slate-700">
                                <Monitor size={20} strokeWidth={1.5} />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RJ45Port: React.FC<{ port: SwitchPort; onClick: () => void; isTop?: boolean }> = ({ port, onClick, isTop }) => {
    const isActive = port.status === PortStatus.ACTIVE;
    const isError = port.status === PortStatus.ERROR;

    return (
        <div className="flex flex-col items-center gap-1 group">
            {isTop && <span className="text-[8px] font-black text-slate-600 mb-0.5">{port.portNumber}</span>}
            <div
                onClick={onClick}
                className={`relative w-8 h-8 rounded-[3px] cursor-pointer transition-all duration-300 transform hover:scale-110 active:scale-95
                    ${isActive
                        ? 'bg-slate-900 border-t-2 border-slate-700 shadow-[0_-1px_3px_rgba(255,255,255,0.05),inset_0_2px_4px_rgba(0,0,0,0.8)]'
                        : 'bg-[#0f172a] border-t-2 border-slate-800/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
                    }`}
            >
                {/* Port Opening Visualization */}
                <div className="absolute inset-1 rounded-[1px] bg-black/60 shadow-inner flex flex-col items-center justify-between p-1 overflow-hidden">
                    {/* Golden Pins - Subtle detail */}
                    <div className="flex gap-[1px] opacity-20">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="w-[1px] h-2 bg-amber-400"></div>
                        ))}
                    </div>
                    {/* Port Bottom "Lip" */}
                    <div className="w-full h-1 bg-slate-800/40 rounded-[0.5px]"></div>
                </div>

                {/* Status LED - Top Corner */}
                <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-black/50 z-20 
                    ${isActive
                        ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee,0_0_4px_#22d3ee] animate-activity'
                        : isError
                            ? 'bg-red-500 animate-pulse shadow-[0_0_8px_red]'
                            : 'bg-slate-800 opacity-60'}`}
                ></div>

                {/* Reflection effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-white/10 opacity-30"></div>
            </div>
            {!isTop && <span className="text-[8px] font-black text-slate-600 mt-0.5">{port.portNumber}</span>}
        </div>
    );
};

const SecurityChassis: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    const model = (switchDetails.model || '').toLowerCase();
    const name = (switchDetails.name || '').toLowerCase();
    const isDvr = model.includes('dvr') || name.includes('dvr');
    const isNvr = !isDvr && (model.includes('nvr') || name.includes('nvr'));

    const displayPorts = isNvr ? (switchDetails.ports || []).slice(0, 1) : (switchDetails.ports || []);
    const portCount = displayPorts.length;
    const minWidth = isNvr ? 700 : Math.max(700, (portCount * 50) + 300);

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div
                style={{ minWidth: `${minWidth}px` }}
                className={`transition-all duration-500 ${isDvr ? 'bg-[#1e293b] border-slate-700' : 'bg-[#020617] border-slate-800'} rounded-xl p-6 shadow-2xl border relative flex items-center h-32 overflow-hidden`}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-xl opacity-10"></div>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.01)_2px,rgba(255,255,255,0.01)_3px)] pointer-events-none"></div>

                <div className={`flex flex-col gap-1 px-6 border-r ${isDvr ? 'border-slate-700' : 'border-slate-800'} w-52 shrink-0 z-10`}>
                    <span className={`text-[8px] font-black ${isDvr ? 'text-blue-400' : 'text-purple-400'} uppercase tracking-[0.3em]`}>
                        {isDvr ? 'DVR ANALOG SYSTEM' : 'NVR IP SYSTEM'}
                    </span>
                    <span className="text-[14px] font-bold text-white tracking-tight drop-shadow-md">{switchDetails.name}</span>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 ${isDvr ? 'bg-blue-600 shadow-[0_0_10px_#3b82f6]' : 'bg-red-600 shadow-[0_0_10px_red]'} rounded-full animate-pulse`}></div>
                        <span className={`text-[8px] font-black ${isDvr ? 'text-blue-400' : 'text-red-400'} uppercase tracking-tighter`}>REC • LIVE FEED ACTIVE</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center px-10 z-10">
                    {isNvr ? (
                        <div className="flex items-center gap-8">
                            <RJ45Port port={displayPorts[0] || { id: '0', portNumber: 1, status: PortStatus.ACTIVE } as any} onClick={() => onPortClick(displayPorts[0])} />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Main Uplink Protocol</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Gigabit Ethernet / 802.3at PoE+ Ready</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {displayPorts.map(port => (
                                <div
                                    key={port.id}
                                    onClick={() => onPortClick(port)}
                                    className={`flex items-center justify-center cursor-pointer transition-all hover:scale-110
                                        ${port.status === PortStatus.ACTIVE ? 'text-blue-400 brightness-125' : 'text-slate-700'}`}
                                >
                                    <div className="flex flex-col items-center gap-1.5">
                                        <BncPort status={port.status} />
                                        <span className="text-[7px] font-black text-slate-500 uppercase">{port.portNumber}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`px-6 ${isDvr ? 'text-slate-700' : 'text-slate-800'} shrink-0 opacity-40 z-10 animate-spin-slow`}>
                    <Disc size={48} />
                </div>
            </div>
        </div>
    );
};

const BncPort: React.FC<{ status: PortStatus }> = ({ status }) => (
    <div className="relative flex items-center justify-center">
        <div className={`w-10 h-10 rounded-full border-2 ${status === PortStatus.ACTIVE ? 'border-blue-500 bg-slate-900 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]' : 'border-slate-800 bg-slate-950'} flex items-center justify-center`}>
            {/* Center Pin */}
            <div className={`w-4 h-4 rounded-full border ${status === PortStatus.ACTIVE ? 'border-blue-400 bg-blue-500/20 shadow-[0_0_8px_#3b82f6]' : 'border-slate-900 bg-black'}`}></div>
            {/* Outer Ring Slots */}
            <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none"></div>
        </div>
    </div>
);

const PabxChassis: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    const ports = switchDetails.ports || [];
    const portCount = ports.length;
    const minWidth = Math.max(700, (portCount * 45) + 300);

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div
                style={{ minWidth: `${minWidth}px` }}
                className="bg-slate-200 rounded-xl p-6 shadow-xl border border-slate-300 relative flex items-center h-32 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
                <div className="flex flex-col gap-1 px-6 border-r border-slate-300 w-52 shrink-0 z-10">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">PABX ANALOG EXCHANGE</span>
                    <span className="text-[14px] font-bold text-slate-800 tracking-tight leading-tight">{switchDetails.name}</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-2.5 px-10 z-10 items-center">
                    {ports.map(port => (
                        <div key={port.id} onClick={() => onPortClick(port)} className={`w-8 h-12 rounded-sm border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 shadow-sm ${port.status === PortStatus.ACTIVE ? 'bg-white border-emerald-500 text-emerald-600 shadow-emerald-200' : 'bg-slate-100 border-slate-300 text-slate-400'}`}>
                            <span className="text-[8px] font-black mb-1">{port.portNumber}</span>
                            <PhoneCall size={14} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const LsaChassis: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    const ports = switchDetails.ports || [];
    const portCount = ports.length;
    const minWidth = Math.max(700, (portCount * 35) + 300);

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div
                style={{ minWidth: `${minWidth}px` }}
                className="bg-white rounded-xl p-6 shadow-xl border border-slate-200 relative flex flex-col justify-center h-40 overflow-hidden"
            >
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-6 px-4 text-center">LSA DISCONNECTION MODULE ENTRY</div>
                <div className="flex gap-2 items-center justify-center bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
                    {ports.map(port => (
                        <div key={port.id} onClick={() => onPortClick(port)} className="flex flex-col items-center gap-2 group cursor-pointer shrink-0 transition-all hover:scale-105">
                            <div className={`w-5 h-16 rounded-[1px] border-x-2 border-slate-200 shadow-sm transition-all ${port.status === PortStatus.ACTIVE ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-slate-300 opacity-80'}`}></div>
                            <span className="text-[9px] font-black text-slate-500 tracking-widest">{port.portNumber}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const FaceplatePanel: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="grid grid-cols-6 md:grid-cols-12 gap-6 p-10 bg-white rounded-xl border border-slate-100 shadow-xl">
                {(switchDetails.ports || []).map(port => (
                    <div key={port.id} className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                            <RJ45Port port={port} onClick={() => onPortClick(port)} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{port.patchPanelPort || `FP-${port.portNumber}`}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MikrotikChassis: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    const ports = [...(switchDetails.ports || [])].sort((a, b) => a.portNumber - b.portNumber);
    const portCount = ports.length;

    // Dynamic width calculation: 200px (info) + (portCount * 45px) + 80px (branding)
    const minWidth = Math.max(700, 200 + (portCount * 45) + 200);

    return (
        <div className="w-full overflow-x-auto pb-6 custom-scrollbar">
            <div
                style={{ minWidth: `${minWidth}px` }}
                className="bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] rounded-xl p-0 shadow-[0_20px_50px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-400 relative overflow-hidden flex items-stretch h-40"
            >
                {/* Brushed Metal Texture Effect */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.5)_2px,rgba(0,0,0,0.5)_3px)]"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30"></div>

                {/* Left Panel: Vents & Status */}
                <div className="w-24 border-r border-slate-400/50 flex flex-col items-center justify-center gap-4 relative">
                    <div className="flex flex-col gap-1.5 opacity-40">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="w-8 h-1 bg-slate-600 rounded-full shadow-inner"></div>
                        ))}
                    </div>
                </div>

                {/* Center Panel: Port Bay */}
                <div className="flex-1 flex flex-col justify-center px-8 relative">
                    <div className="absolute top-2 left-6">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">Gigabit Ethernet Ports / Passive PoE</span>
                    </div>
                    <div className="flex gap-4 items-end bg-black/5 p-5 rounded-xl border border-white/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-sm self-start">
                        {ports.map(port => (
                            <RJ45Port key={port.id} port={port} onClick={() => onPortClick(port)} />
                        ))}
                    </div>
                </div>

                {/* Right Panel: Logo & Model */}
                <div className="w-64 flex flex-col items-center justify-center gap-1 border-l border-white/30 bg-white/5 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <div className="font-black text-[#1e293b] text-5xl tracking-tighter drop-shadow-sm uppercase flex items-baseline">
                            Mikro<span className="text-blue-600/80">Tik</span>
                        </div>
                        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-slate-400/50 to-transparent mt-1"></div>
                    </div>
                    <div className="mt-2 text-center">
                        <div className="px-3 py-1 bg-slate-800/90 rounded-md shadow-lg border border-slate-700">
                            <span className="font-black text-white text-[10px] uppercase tracking-[0.3em]">{switchDetails.model}</span>
                        </div>
                        <div className="flex justify-center gap-3 mt-4">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                                <span className="text-[6px] font-bold text-slate-600 uppercase">Pwr</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                                <span className="text-[6px] font-bold text-slate-600 uppercase">Usr</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chassis Screw Details */}
                <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-500/30 border border-slate-600/20 shadow-inner"></div>
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-500/30 border border-slate-600/20 shadow-inner"></div>
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-500/30 border border-slate-600/20 shadow-inner"></div>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-500/30 border border-slate-600/20 shadow-inner"></div>
            </div>
        </div>
    );
};

const StandardChassis: React.FC<SwitchVisualizerProps> = ({ switchDetails, onPortClick }) => {
    return <CoreChassis switchDetails={switchDetails} onPortClick={onPortClick} />;
};