'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  Router, Server, Wifi, Globe, Video, Download, Link2, X, Plus, Minus,
  Maximize2, Minimize2, Info, Lock, Unlock, Grid3X3, HardDrive, Monitor,
  Printer, Phone, LayoutTemplate, Trash2, Search, Pencil, PanelLeft,
  PanelRight, Network, LocateFixed, Layers, ChevronRight
} from 'lucide-react';
import { NetworkSwitch, PortStatus, DeviceType } from '../types';
import * as htmlToImage from 'html-to-image';
import { useToast } from './ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* ============================================================
   Constants & helpers — clean, theme-aware, no dynamic Tailwind
   ============================================================ */

const NODE_W = 188;
const NODE_H = 64;
const LEAF_W = 156;
const LEAF_H = 52;
const GRID = 20;

type Kind = 'core' | 'switch' | 'ap' | 'server' | 'cctv' | 'pc' | 'printer' | 'phone' | 'leaf';

function getKind(model: string, name: string, isInternet: boolean): Kind {
  if (isInternet) return 'core';
  const t = `${model} ${name}`.toLowerCase();
  if (/mikrotik|router|core|gateway|isp|uplink|cloud/.test(t)) return 'core';
  if (/wifi|access point|\bap\b|unifi/.test(t)) return 'ap';
  if (/server|nas|storage/.test(t)) return 'server';
  if (/cctv|camera|nvr|dvr/.test(t)) return 'cctv';
  if (/pc|laptop|computer|station|monitor/.test(t)) return 'pc';
  if (/printer/.test(t)) return 'printer';
  if (/phone|voip|pabx/.test(t)) return 'phone';
  if (/switch/.test(t)) return 'switch';
  return 'leaf';
}

const KIND_META: Record<Kind, { icon: any; dot: string; soft: string; label: string }> = {
  core: { icon: Router, dot: 'bg-emerald-500', soft: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Core' },
  switch: { icon: Network, dot: 'bg-blue-500', soft: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Switch' },
  ap: { icon: Wifi, dot: 'bg-sky-500', soft: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', label: 'AP' },
  server: { icon: Server, dot: 'bg-violet-500', soft: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', label: 'Server' },
  cctv: { icon: Video, dot: 'bg-purple-500', soft: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: 'CCTV' },
  pc: { icon: Monitor, dot: 'bg-slate-500', soft: 'bg-muted text-muted-foreground', label: 'PC' },
  printer: { icon: Printer, dot: 'bg-orange-500', soft: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', label: 'Printer' },
  phone: { icon: Phone, dot: 'bg-teal-500', soft: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', label: 'Phone' },
  leaf: { icon: HardDrive, dot: 'bg-zinc-400', soft: 'bg-muted text-muted-foreground', label: 'Device' },
};

function iconFor(model: string) {
  const t = (model || '').toLowerCase();
  if (t.includes('router') || t.includes('mikrotik') || t.includes('core')) return Router;
  if (t.includes('ap') || t.includes('wifi') || t.includes('unifi')) return Wifi;
  if (t.includes('cctv') || t.includes('camera') || t.includes('nvr')) return Video;
  if (t.includes('server')) return Server;
  if (t.includes('pc') || t.includes('laptop') || t.includes('monitor')) return Monitor;
  if (t.includes('printer')) return Printer;
  if (t.includes('phone') || t.includes('voip')) return Phone;
  if (t.includes('storage') || t.includes('nas')) return HardDrive;
  if (t.includes('isp') || t.includes('internet') || t.includes('cloud') || t.includes('gateway')) return Globe;
  return Server;
}

interface Dims { w: number; h: number; cx: number; cy: number }
function dimsFor(isLeaf: boolean): Dims {
  const w = isLeaf ? LEAF_W : NODE_W;
  const h = isLeaf ? LEAF_H : NODE_H;
  return { w, h, cx: w / 2, cy: h / 2 };
}

/* ============================================================
   Node
   ============================================================ */

interface NodeProps {
  data: NetworkSwitch;
  x: number; y: number; scale: number;
  selected: boolean;
  locked: boolean;
  snap: boolean;
  dimmed: boolean;
  impacted: boolean;
  wiringActive: boolean;
  wiringSource: boolean;
  isInternet: boolean;
  onDragEnd: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onDoubleClick?: (sw: NetworkSwitch) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

const DiagramNode: React.FC<NodeProps> = React.memo(({
  data, x, y, scale, selected, locked, snap, dimmed, impacted, wiringActive, wiringSource, isInternet,
  onDragEnd, onSelect, onDoubleClick, onContextMenu
}) => {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x, y });
  const startMouse = useRef({ x: 0, y: 0 });
  const startNode = useRef({ x: 0, y: 0 });
  const cur = useRef({ x, y });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!dragging) { setPos({ x, y }); cur.current = { x, y }; }
  }, [x, y, dragging]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        let nx = startNode.current.x + (e.clientX - startMouse.current.x) / scale;
        let ny = startNode.current.y + (e.clientY - startMouse.current.y) / scale;
        if (snap) { nx = Math.round(nx / GRID) * GRID; ny = Math.round(ny / GRID) * GRID; }
        cur.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
        raf.current = null;
      });
    };
    const up = () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      setDragging(false);
      onDragEnd(data.id, cur.current.x, cur.current.y);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [dragging, scale, snap, onDragEnd, data.id]);

  const isLeaf = data.id.startsWith('port-device-') || data.isGroup === true;
  const kind = getKind(data.model || '', data.name || '', isInternet);
  const meta = KIND_META[kind];
  const Icon = isInternet ? Globe : meta.icon;
  const d = dimsFor(isLeaf);
  const activePorts = data.ports?.filter(p => p.status === PortStatus.ACTIVE).length ?? 0;
  const errPorts = data.ports?.filter(p => p.status === PortStatus.ERROR).length ?? 0;
  const online = !data.status || data.status === 'active';

  return (
    <div className={cn('absolute z-20', dimmed && 'opacity-25 saturate-50')} style={{ left: pos.x, top: pos.y, width: d.w, height: d.h }}>
      <button
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          onSelect(data.id);
          if (locked && !wiringActive) return;
          if (wiringActive) return;
          setDragging(true);
          startMouse.current = { x: e.clientX, y: e.clientY };
          startNode.current = { x, y };
        }}
        onDoubleClick={() => onDoubleClick?.(data)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, data.id); }}
        className={cn(
          'group relative flex h-full w-full items-center gap-2.5 rounded-xl border bg-card px-2.5 text-left shadow-sm transition-all',
          'hover:shadow-md hover:border-primary/40',
          selected ? 'border-primary ring-2 ring-primary/25 shadow-md' : 'border-border',
          impacted && !selected && 'border-rose-500/60 ring-2 ring-rose-500/15',
          wiringSource && 'border-emerald-500 ring-2 ring-emerald-500/30',
          dragging && 'shadow-lg scale-[1.03] cursor-grabbing'
        )}
        style={{ cursor: wiringActive ? 'crosshair' : dragging ? 'grabbing' : 'grab' }}
        title={`${data.name} • ${data.ip || data.model}`}
      >
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.soft)}>
          <Icon size={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', online ? 'bg-emerald-500' : 'bg-rose-500')} />
            <span className="truncate text-[12px] font-semibold leading-tight text-foreground">{data.name}</span>
          </span>
          <span className="mt-0.5 block truncate font-mono text-[10px] leading-tight text-muted-foreground">
            {data.ip && data.ip !== '-' ? data.ip : data.model || 'Device'}
            {typeof data.uplinkPort === 'number' ? ` • P${data.uplinkPort}` : ''}
          </span>
          <span className="mt-1 flex items-center gap-1">
            <span className="rounded bg-muted px-1 py-px text-[9px] font-semibold text-muted-foreground">
              {activePorts}/{data.totalPorts || data.ports?.length || 1}
            </span>
            {errPorts > 0 && (
              <span className="rounded bg-amber-500/15 px-1 py-px text-[9px] font-semibold text-amber-600">{errPorts} err</span>
            )}
            {isInternet && (
              <span className="rounded bg-emerald-500/15 px-1 py-px text-[9px] font-semibold text-emerald-600">CORE</span>
            )}
          </span>
        </span>
        {/* anchor dots */}
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-border bg-card" />
        <span className={cn('absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-border', isInternet ? 'bg-emerald-500' : 'bg-muted-foreground/60')} />
      </button>
    </div>
  );
});
DiagramNode.displayName = 'DiagramNode';

/* ============================================================
   Link — single clean bezier, no SMIL, no heavy glow
   ============================================================ */

function linkColor(sw: NetworkSwitch, isCore: boolean): string {
  const active = sw.ports?.filter(p => p.status === PortStatus.ACTIVE).length || 0;
  const total = sw.totalPorts || 1;
  const pct = (active / total) * 100;
  if (pct > 85) return '#f43f5e';
  if (pct > 60) return '#f59e0b';
  if (sw.vlan === 10) return '#06b6d4';
  if (sw.vlan === 20) return '#f59e0b';
  if (sw.vlan === 30) return '#ec4899';
  if ((sw.vlan || 0) > 50) return '#8b5cf6';
  if (isCore) return '#10b981';
  return '#4A7CC7';
}

const TopologyLink: React.FC<{
  sw: NetworkSwitch; parentX: number; parentY: number; parentLeaf: boolean;
  active: boolean; dimmed: boolean; core: boolean;
}> = React.memo(({ sw, parentX, parentY, parentLeaf, active, dimmed, core }) => {
  const cX = sw.posX ?? 0; const cY = sw.posY ?? 0;
  const pD = dimsFor(parentLeaf); const cD = dimsFor(sw.id.startsWith('port-device-'));

  const pPins = [
    { x: parentX + pD.cx, y: parentY, dir: 'top' },
    { x: parentX + pD.cx, y: parentY + pD.h, dir: 'bottom' },
    { x: parentX, y: parentY + pD.cy, dir: 'left' },
    { x: parentX + pD.w, y: parentY + pD.cy, dir: 'right' },
  ];
  const cPins = [
    { x: cX + cD.cx, y: cY, dir: 'top' },
    { x: cX + cD.cx, y: cY + cD.h, dir: 'bottom' },
    { x: cX, y: cY + cD.cy, dir: 'left' },
    { x: cX + cD.w, y: cY + cD.cy, dir: 'right' },
  ];
  let bestP = pPins[1]; let bestC = cPins[0]; let min = Infinity;
  for (const p of pPins) {
    if (core && p.dir === 'top') continue;
    for (const c of cPins) {
      const dist = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      if (dist < min) { min = dist; bestP = p; bestC = c; }
    }
  }
  if (Math.abs(bestP.x - bestC.x) < 1 && Math.abs(bestP.y - bestC.y) < 1) return null;
  const dist = Math.sqrt(min);
  const off = Math.min(Math.max(dist * 0.35, 24), 110);
  const dir = (pt: string, x: number, y: number): [number, number] => {
    if (pt === 'top') return [x, y - off];
    if (pt === 'bottom') return [x, y + off];
    if (pt === 'left') return [x - off, y];
    return [x + off, y];
  };
  const [c1x, c1y] = dir(bestP.dir, bestP.x, bestP.y);
  const [c2x, c2y] = dir(bestC.dir, bestC.x, bestC.y);
  const dPath = `M ${bestP.x} ${bestP.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bestC.x} ${bestC.y}`;
  const color = linkColor(sw, core);

  return (
    <g className={dimmed ? 'opacity-10' : active ? 'opacity-100' : 'opacity-70'}>
      <path d={dPath} stroke="transparent" strokeWidth={16} fill="none" style={{ pointerEvents: 'stroke' }} />
      <path
        d={dPath} fill="none" stroke={color}
        strokeWidth={active ? 2.5 : 1.5}
        strokeLinecap="round"
        strokeDasharray={core ? undefined : active ? undefined : '1 0'}
        className={active ? 'drop-shadow-sm' : undefined}
      />
      {active && sw.uplinkPort != null && (
        <g transform={`translate(${(bestP.x + bestC.x) / 2},${(bestP.y + bestC.y) / 2})`}>
          <rect x={-16} y={-10} width={32} height={18} rx={9} className="fill-card stroke-border" strokeWidth={1} />
          <text y={3.5} textAnchor="middle" fontSize={9} fontWeight={700} className="fill-foreground">P{sw.uplinkPort}</text>
        </g>
      )}
    </g>
  );
});
TopologyLink.displayName = 'TopologyLink';

/* ============================================================
   Main
   ============================================================ */

export interface TopologyDiagramProps {
  switches: NetworkSwitch[];
  internetPos: { x: number; y: number };
  onUpdateSwitches: (sws: NetworkSwitch[], internet?: { x: number; y: number }) => void;
  canManage?: boolean;
  searchTerm?: string;
  isLocked?: boolean;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  onViewProfile?: (device: NetworkSwitch) => void;
  centeringTrigger?: number;
  coreNodeId?: string | number;
  onAddNode?: (type: any, x: number, y: number) => void;
  onDeleteNode?: (id: string) => void;
  onEditNode?: (device: any) => void;
  onConnectNodes?: (childId: string, parentId: string) => void;
  onWipeAll?: () => void;
}

export const TopologyDiagram: React.FC<TopologyDiagramProps> = ({
  switches, internetPos, onUpdateSwitches,
  searchTerm = '', isLocked = false,
  selectedNodeId, setSelectedNodeId,
  onViewProfile, centeringTrigger = 0, coreNodeId,
  onAddNode, onDeleteNode, onEditNode, onConnectNodes, onWipeAll,
  canManage = true,
}) => {
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(0.9);
  const [offset, setOffset] = useState({ x: 80, y: 80 });
  const [panning, setPanning] = useState(false);
  const [uiLocked, setUiLocked] = useState(isLocked);
  const [snap, setSnap] = useState(true);
  const [detailed, setDetailed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [wiring, setWiring] = useState(false);
  const [wireFrom, setWireFrom] = useState<string | null>(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [floorImg, setFloorImg] = useState<string | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const s = localStorage.getItem('netvision_floorplan');
    if (s) setFloorImg(s);
  }, []);
  useEffect(() => { setUiLocked(isLocked); }, [isLocked]);
  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);
  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  /* zoom / pan — wheel hijack hanya di canvas */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest('[data-scrollable="true"]')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const f = e.deltaY > 0 ? 0.92 : 1.08;
        setScale(s => Math.min(Math.max(s * f, 0.25), 2.5));
      } else {
        setOffset(o => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const centerView = useCallback(() => {
    const vp = canvasRef.current?.parentElement;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    if (!r.width || !r.height) return;
    let minX = internetPos.x, minY = internetPos.y, maxX = internetPos.x + NODE_W, maxY = internetPos.y + NODE_H;
    switches.forEach(sw => {
      const d = dimsFor(sw.id.startsWith('port-device-'));
      minX = Math.min(minX, sw.posX ?? 0); minY = Math.min(minY, sw.posY ?? 0);
      maxX = Math.max(maxX, (sw.posX ?? 0) + d.w); maxY = Math.max(maxY, (sw.posY ?? 0) + d.h);
    });
    const pad = 80;
    const bw = Math.max(maxX - minX, 200); const bh = Math.max(maxY - minY, 200);
    const ns = Math.min(Math.max(Math.min((r.width - pad * 2) / bw, (r.height - pad * 2) / bh), 0.4), 1.1);
    const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
    setScale(ns);
    setOffset({ x: r.width / 2 - cx * ns, y: r.height / 2 - cy * ns });
  }, [switches, internetPos]);

  useEffect(() => { if (centeringTrigger > 0) centerView(); }, [centeringTrigger, centerView]);
  useEffect(() => { const t = setTimeout(centerView, 400); return () => clearTimeout(t); }, [centerView]);

  const byId = useMemo(() => new Map(switches.map(s => [String(s.id), s])), [switches]);
  const coreIdStr = coreNodeId != null ? String(coreNodeId) : null;

  const pathIds = useMemo(() => {
    if (!selectedNodeId || selectedNodeId === 'internet') return new Set<string>();
    const path = new Set<string>();
    let cur: string | undefined = String(selectedNodeId);
    let guard = 0;
    while (cur && cur !== 'internet' && guard++ < 200) {
      if (path.has(cur)) break;
      path.add(cur);
      const n = byId.get(cur);
      cur = n?.uplinkId ? String(n.uplinkId) : undefined;
      if (cur && coreIdStr && cur === coreIdStr) { path.add(cur); break; }
    }
    if (cur === 'internet') path.add('internet');
    if (coreIdStr && path.has(coreIdStr)) path.add('internet');
    return path;
  }, [selectedNodeId, byId, coreIdStr]);

  const impactedIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const out = new Set<string>();
    const q = [String(selectedNodeId)];
    const seen = new Set(q);
    while (q.length) {
      const c = q.shift()!;
      switches.forEach(sw => {
        if (String(sw.uplinkId) === c && !seen.has(String(sw.id))) {
          seen.add(String(sw.id)); out.add(String(sw.id)); q.push(String(sw.id));
        }
      });
    }
    return out;
  }, [selectedNodeId, switches]);

  const matchSearch = useCallback((sw: NetworkSwitch) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return sw.name.toLowerCase().includes(s) || (sw.ip || '').toLowerCase().includes(s) || (sw.model || '').toLowerCase().includes(s);
  }, [searchTerm]);

  /* grouping sederhana */
  const { displayNodes, displayLinks } = useMemo(() => {
    if (detailed) return { displayNodes: switches, displayLinks: switches };
    const groups = new Map<string, NetworkSwitch[]>();
    const solo: NetworkSwitch[] = [];
    switches.forEach(sw => {
      const leaf = sw.id.startsWith('port-device-') || ['CCTV', 'PC', 'Printer', 'IP Phone', 'Access Point'].includes(sw.model);
      const key = sw.uplinkId ? `${sw.uplinkId}::${sw.model}` : '';
      if (leaf && key && !expanded.has(key)) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(sw);
      } else solo.push(sw);
    });
    const grouped: NetworkSwitch[] = [...solo];
    const links: NetworkSwitch[] = [...solo];
    groups.forEach((nodes, key) => {
      if (nodes.length < 3) { grouped.push(...nodes); links.push(...nodes); return; }
      const [parentId, model] = key.split('::');
      const ax = nodes.reduce((a, n) => a + (n.posX || 0), 0) / nodes.length;
      const ay = nodes.reduce((a, n) => a + (n.posY || 0), 0) / nodes.length;
      grouped.push({
        id: `group-${key}`, name: `${nodes.length}× ${model}`, model,
        location: nodes[0]?.location || '', rack: '', ip: `${nodes.length} devices`,
        totalPorts: nodes.length, uptime: '', ports: [], posX: ax, posY: ay,
        uplinkId: parentId, isGroup: true, groupKey: key,
      } as NetworkSwitch);
      links.push({
        id: `group-${key}`, name: '', model, location: '', rack: '', ip: '',
        totalPorts: 0, uptime: '', ports: [], posX: ax, posY: ay, uplinkId: parentId,
      } as NetworkSwitch);
    });
    return { displayNodes: grouped, displayLinks: links };
  }, [switches, detailed, expanded]);

  const paletteTemplates = useMemo(() => ([
    { type: DeviceType.UPLINK, icon: Globe, label: 'ISP / Cloud' },
    { type: DeviceType.ROUTER, icon: Router, label: 'Router' },
    { type: DeviceType.ROUTER, icon: Server, label: 'Switch' },
    { type: DeviceType.AP, icon: Wifi, label: 'Access Point' },
    { type: DeviceType.CCTV, icon: Video, label: 'CCTV' },
    { type: DeviceType.PC, icon: Monitor, label: 'PC / Laptop' },
    { type: DeviceType.SERVER, icon: Server, label: 'Server' },
    { type: DeviceType.PRINTER, icon: Printer, label: 'Printer' },
  ]), []);

  const existingNodes = useMemo(() => switches
    .filter(sw => !sw.id.startsWith('port-device-') && sw.id !== 'internet' && (!coreIdStr || String(sw.id) !== coreIdStr))
    .filter(sw => !paletteSearch || sw.name.toLowerCase().includes(paletteSearch.toLowerCase()) || (sw.model || '').toLowerCase().includes(paletteSearch.toLowerCase())),
    [switches, paletteSearch, coreIdStr]);

  const coreNode: NetworkSwitch = useMemo(() => {
    const found = coreIdStr ? byId.get(coreIdStr) : undefined;
    return found || { id: 'internet', name: 'ISP Core Hub', model: 'Gateway', ip: 'Public IP', totalPorts: 1, uptime: 'Online', location: 'External', rack: 'Core', ports: [{ id: 'internet-p1', portNumber: 1, status: PortStatus.ACTIVE, deviceType: DeviceType.UPLINK }] } as NetworkSwitch;
  }, [byId, coreIdStr]);

  const selectedNode: NetworkSwitch | undefined = useMemo(() => {
    if (!selectedNodeId) return undefined;
    if (String(selectedNodeId) === 'internet' || (coreIdStr && String(selectedNodeId) === coreIdStr)) return coreNode;
    return byId.get(String(selectedNodeId));
  }, [selectedNodeId, byId, coreNode, coreIdStr]);

  /* interactions */
  const handleSelect = (id: string | null) => {
    if (wiring && id) {
      if (!wireFrom && String(id) === 'internet') { showToast('Internet tidak bisa jadi sumber. Pilih device dulu.', 'warning'); return; }
      if (!wireFrom) { setWireFrom(id); showToast('Sumber dipilih. Klik node target sebagai parent.', 'info'); }
      else if (wireFrom === id) { setWireFrom(null); }
      else { onConnectNodes?.(wireFrom, id); setWireFrom(null); setWiring(false); }
      return;
    }
    setSelectedNodeId(id);
    setInspectorOpen(true);
  };

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    if (id === 'internet' || (coreIdStr && id === coreIdStr)) onUpdateSwitches(switches, { x, y });
    else onUpdateSwitches(switches.map(s => String(s.id) === String(id) ? { ...s, posX: x, posY: y } : s));
  }, [switches, onUpdateSwitches, coreIdStr]);

  const handleAutoLayout = useCallback(() => {
    const LEVEL_H = 190; const GAP_X = 220;
    const children: Record<string, string[]> = { internet: [] };
    switches.forEach(s => {
      const p = !s.uplinkId || s.uplinkId === 'gateway' || (coreIdStr && String(s.uplinkId) === coreIdStr) ? 'internet' : String(s.uplinkId);
      if (!children[p]) children[p] = [];
      children[p].push(String(s.id));
    });
    const levels: Record<number, string[]> = {};
    const q = [{ id: 'internet', lv: 0 }];
    const seen = new Set(['internet']);
    while (q.length) {
      const { id, lv } = q.shift()!;
      if (id !== 'internet') { (levels[lv] ||= []).push(id); }
      (children[id] || []).forEach(c => { if (!seen.has(c)) { seen.add(c); q.push({ id: c, lv: lv + 1 }); } });
    }
    switches.forEach(s => { if (!seen.has(String(s.id))) (levels[1] ||= []).push(String(s.id)); });
    const next = switches.map(s => ({ ...s }));
    Object.entries(levels).forEach(([lvStr, ids]) => {
      const lv = Number(lvStr);
      const tw = (ids.length - 1) * GAP_X;
      const sx = internetPos.x + NODE_W / 2 - tw / 2 - NODE_W / 2;
      ids.forEach((nid, i) => {
        const ix = next.findIndex(n => String(n.id) === nid);
        if (ix >= 0) { next[ix].posX = sx + i * GAP_X; next[ix].posY = internetPos.y + lv * LEVEL_H; }
      });
    });
    onUpdateSwitches(next);
    showToast('Auto-layout diterapkan. Jangan lupa Sync.', 'success');
  }, [switches, internetPos, onUpdateSwitches, coreIdStr, showToast]);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    try {
      const dark = document.documentElement.classList.contains('dark');
      const url = await htmlToImage.toPng(canvasRef.current, {
        backgroundColor: dark ? '#0F0F0F' : '#F5F5F5',
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      a.download = `topology-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = url; a.click();
    } catch { showToast('Export gagal.', 'error'); }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch((e: any) => showToast('Fullscreen gagal: ' + e.message, 'error'));
    else document.exitFullscreen();
  };

  const onDropNode = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current?.parentElement) return;
    const rect = canvasRef.current.parentElement.getBoundingClientRect();
    let fx = (e.clientX - rect.left - offset.x) / scale - NODE_W / 2;
    let fy = (e.clientY - rect.top - offset.y) / scale - NODE_H / 2;
    if (snap) { fx = Math.round(fx / GRID) * GRID; fy = Math.round(fy / GRID) * GRID; }
    const nid = e.dataTransfer.getData('nodeId');
    if (nid) {
      onUpdateSwitches(switches.map(s => String(s.id) === nid ? { ...s, posX: fx, posY: fy } : s));
      return;
    }
    const type = e.dataTransfer.getData('deviceType') as DeviceType;
    if (type) onAddNode?.(type, fx, fy);
  };

  /* panning */
  useEffect(() => {
    if (!panning) return;
    const move = (e: MouseEvent) => {
      setOffset(o => ({ x: o.x + e.clientX - lastMouse.current.x, y: o.y + e.clientY - lastMouse.current.y }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => setPanning(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [panning]);

  useEffect(() => {
    if (!wiring || !wireFrom) return;
    const move = (e: MouseEvent) => {
      const vp = canvasRef.current?.parentElement;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      setMouseWorld({ x: (e.clientX - r.left - offset.x) / scale, y: (e.clientY - r.top - offset.y) / scale });
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [wiring, wireFrom, offset, scale]);

  const stats = useMemo(() => {
    const phys = switches.filter(s => !s.id.startsWith('port-device-'));
    const online = phys.filter(s => !s.status || s.status === 'active').length;
    const links = switches.filter(s => s.uplinkId).length;
    return { nodes: phys.length, online, links };
  }, [switches]);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex h-full w-full select-none overflow-hidden rounded-xl border border-border bg-background', wiring && 'cursor-crosshair')}
      onMouseDown={(e) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) { e.preventDefault(); setPanning(true); lastMouse.current = { x: e.clientX, y: e.clientY }; }
        else if (e.target === e.currentTarget) { setSelectedNodeId(null); if (wiring) { setWiring(false); setWireFrom(null); } }
      }}
    >
      {/* ===== Left library ===== */}
      <aside className={cn('z-40 flex w-60 shrink-0 flex-col border-r border-border bg-card transition-all', !libraryOpen && 'w-0 overflow-hidden border-r-0')}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Library</p>
          <Badge variant="secondary" className="text-[10px]">{existingNodes.length}</Badge>
        </div>
        <div className="border-b border-border p-3" data-scrollable="true">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={paletteSearch} onChange={e => setPaletteSearch(e.target.value)} placeholder="Cari node..." className="h-8 pl-8 text-xs" />
          </div>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-3" data-scrollable="true">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tambah baru</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {paletteTemplates.map((t, i) => (
              <div
                key={i} draggable
                onDragStart={e => { e.dataTransfer.setData('deviceType', t.type); }}
                className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-border bg-muted/40 p-2.5 transition hover:border-primary/50 hover:bg-accent active:cursor-grabbing"
              >
                <t.icon size={16} className="text-primary" />
                <span className="w-full truncate text-center text-[10px] font-semibold">{t.label}</span>
              </div>
            ))}
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Node aktif</p>
          <div className="space-y-1.5">
            {existingNodes.map(n => {
              const Icon = iconFor(n.model);
              return (
                <div
                  key={n.id} draggable
                  onDragStart={e => e.dataTransfer.setData('nodeId', String(n.id))}
                  onClick={() => handleSelect(String(n.id))}
                  className={cn('flex cursor-grab items-center gap-2 rounded-lg border p-2 transition hover:bg-accent', String(selectedNodeId) === String(n.id) ? 'border-primary bg-accent' : 'border-transparent')}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold leading-tight">{n.name}</span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">{n.ip}</span>
                  </span>
                </div>
              );
            })}
            {existingNodes.length === 0 && <p className="py-6 text-center text-[11px] text-muted-foreground">Tidak ada node.</p>}
          </div>
        </div>
      </aside>

      {/* ===== Center canvas ===== */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* toolbar */}
        <div className="z-30 flex flex-wrap items-center gap-2 border-b border-border bg-card/80 px-3 py-2 backdrop-blur">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLibraryOpen(v => !v)} title="Library"><PanelLeft size={15} /></Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center rounded-lg border border-border">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(s - 0.1, 0.25))}><Minus size={14} /></Button>
            <span className="w-11 text-center font-mono text-[11px] font-bold">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(s + 0.1, 2.5))}><Plus size={14} /></Button>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={centerView}><LocateFixed size={13} className="mr-1" /> Center</Button>
          <Button variant={wiring ? 'default' : 'ghost'} size="sm" className="h-7 text-[11px]" onClick={() => { setWiring(v => !v); setWireFrom(null); }}><Link2 size={13} className="mr-1" /> {wiring ? 'Wiring…' : 'Wiring'}</Button>
          <div className="h-5 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setUiLocked(v => !v)} title="Kunci drag">{uiLocked ? <Lock size={14} /> : <Unlock size={14} />}</Button>
          <Button variant={snap ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setSnap(v => !v)} title="Snap grid"><Grid3X3 size={14} /></Button>
          <Button variant={detailed ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[11px]" onClick={() => { setDetailed(v => !v); setExpanded(new Set()); }} title="Mode detail"><Layers size={13} className="mr-1" /> {detailed ? 'Detail' : 'Ringkas'}</Button>
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 hidden text-[11px] text-muted-foreground md:block">{stats.nodes} nodes • {stats.links} links • {stats.online} online</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAutoLayout} title="Auto layout"><LayoutTemplate size={14} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="Export PNG"><Download size={14} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} title="Fullscreen">{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setLegendOpen(v => !v); }} title="Legenda"><PanelRight size={14} /></Button>
          </div>
        </div>

        {wiring && (
          <div className="z-30 flex items-center justify-center gap-2 border-b border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Link2 size={13} />
            {wireFrom ? `Sumber: ${byId.get(String(wireFrom))?.name || wireFrom} — klik node target (parent).` : 'Mode wiring: klik node sumber (child), lalu klik target (parent).'}
            <button onClick={() => { setWiring(false); setWireFrom(null); }} className="ml-2 rounded px-1.5 py-0.5 hover:bg-emerald-500/20"><X size={12} /></button>
          </div>
        )}

        {/* viewport */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{ cursor: panning ? 'grabbing' : wiring ? 'crosshair' : 'default' }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={onDropNode}
          onMouseDown={(e) => {
            if (e.button === 1 || (e.button === 0 && e.altKey)) { e.preventDefault(); setPanning(true); lastMouse.current = { x: e.clientX, y: e.clientY }; }
          }}
        >
          {/* grid background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.22) 1px, transparent 1px)',
              backgroundSize: `${GRID * scale}px ${GRID * scale}px`,
              backgroundPosition: `${offset.x}px ${offset.y}px`,
            }}
          />
          <div
            ref={canvasRef}
            className="absolute left-0 top-0"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', width: 10, height: 10 }}
          >
            <div className="relative" style={{ width: 4000, height: 3000 }}>
              {floorImg && (
                <img src={floorImg} alt="" className="pointer-events-none absolute rounded-xl border border-dashed border-border opacity-40" style={{ left: 700, top: 500, width: 1800, height: 1100, objectFit: 'contain' }} draggable={false} />
              )}

              <svg className="absolute left-0 top-0 z-10" width={4000} height={3000} style={{ pointerEvents: 'none' }}>
                {displayLinks.map((sw: any) => {
                  if (String(sw.id) === 'internet' || (coreIdStr && String(sw.id) === coreIdStr)) return null;
                  if (sw.posX == null || sw.posY == null || !sw.uplinkId) return null;
                  const isCoreLink = !sw.uplinkId || sw.uplinkId === 'gateway' || sw.uplinkId === 'root' || sw.uplinkId === 'internet' || (coreIdStr && String(sw.uplinkId) === coreIdStr);
                  let px = internetPos.x, py = internetPos.y, pLeaf = false;
                  if (!isCoreLink) {
                    const p = byId.get(String(sw.uplinkId));
                    if (!p || p.posX == null) return null;
                    px = p.posX; py = p.posY; pLeaf = String(p.id).startsWith('port-device-');
                  }
                  const active = pathIds.has(String(sw.id));
                  return (
                    <TopologyLink
                      key={`link-${sw.id}`} sw={sw}
                      parentX={px} parentY={py} parentLeaf={pLeaf}
                      active={active} dimmed={!!searchTerm && !matchSearch(sw)}
                      core={isCoreLink}
                    />
                  );
                })}
                {wiring && wireFrom && (() => {
                  const s = byId.get(String(wireFrom));
                  const sx = (s?.posX ?? internetPos.x) + NODE_W / 2;
                  const sy = (s?.posY ?? internetPos.y) + NODE_H / 2;
                  return <line x1={sx} y1={sy} x2={mouseWorld.x} y2={mouseWorld.y} stroke="#10b981" strokeWidth={2} strokeDasharray="6 4" />;
                })()}
              </svg>

              <DiagramNode
                data={coreNode}
                x={internetPos.x} y={internetPos.y} scale={scale}
                selected={String(selectedNodeId) === 'internet' || (coreIdStr != null && String(selectedNodeId) === coreIdStr)}
                locked={uiLocked} snap={snap}
                dimmed={!!searchTerm && !(coreNode.name.toLowerCase().includes(searchTerm.toLowerCase()))}
                impacted={false} wiringActive={wiring} wiringSource={wireFrom === 'internet' || (coreIdStr != null && wireFrom === coreIdStr)}
                isInternet
                onDragEnd={handleDragEnd} onSelect={handleSelect} onDoubleClick={onViewProfile}
                onContextMenu={(e, id) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, id }); }}
              />

              {displayNodes.map((sw: any) => {
                if (String(sw.id) === 'internet' || (coreIdStr && String(sw.id) === coreIdStr)) return null;
                const isGroup = String(sw.id).startsWith('group-');
                return (
                  <DiagramNode
                    key={sw.id} data={sw}
                    x={sw.posX ?? 0} y={sw.posY ?? 0} scale={scale}
                    selected={String(selectedNodeId) === String(sw.id)}
                    locked={uiLocked} snap={snap}
                    dimmed={!!searchTerm && !matchSearch(sw)}
                    impacted={impactedIds.has(String(sw.id))}
                    wiringActive={wiring} wiringSource={wireFrom === String(sw.id)}
                    isInternet={false}
                    onDragEnd={handleDragEnd}
                    onSelect={(id) => {
                      if (isGroup) {
                        const gk = sw.groupKey;
                        setExpanded(prev => {
                          const n = new Set(prev);
                          if (n.has(gk)) n.delete(gk); else n.add(gk);
                          return n;
                        });
                      } else handleSelect(id);
                    }}
                    onDoubleClick={onViewProfile}
                    onContextMenu={(e, id) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, id }); }}
                  />
                );
              })}
            </div>
          </div>

          {/* legend */}
          {legendOpen && (
            <div className="absolute bottom-3 left-3 z-30 w-52 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur" data-scrollable="true">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Legenda</p>
                <button onClick={() => setLegendOpen(false)} className="rounded p-0.5 text-muted-foreground hover:bg-muted"><X size={12} /></button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px]"><span className="h-2 w-2 rounded-full bg-emerald-500" /> ISP / Core <span className="ml-auto font-mono text-[10px] text-muted-foreground">1G+</span></div>
                <div className="flex items-center gap-2 text-[11px]"><span className="h-2 w-2 rounded-full bg-[#4A7CC7]" /> Trunk normal</div>
                <div className="flex items-center gap-2 text-[11px]"><span className="h-2 w-2 rounded-full bg-amber-500" /> Beban &gt;60%</div>
                <div className="flex items-center gap-2 text-[11px]"><span className="h-2 w-2 rounded-full bg-rose-500" /> Overload &gt;85%</div>
              </div>
              <div className="mt-2 border-t border-border pt-2">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">VLAN</p>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold">
                  <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-cyan-600">10 MGMT</span>
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600">20 OPS</span>
                  <span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-pink-600">30 CAM</span>
                  <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-600">60 IOT</span>
                </div>
              </div>
            </div>
          )}

          {switches.length === 0 && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Network size={22} /></div>
                <h3 className="text-base font-bold">Belum ada node</h3>
                <p className="mt-1 text-xs text-muted-foreground">Drag template dari Library atau provision node baru untuk mulai memetakan topologi.</p>
                <Button className="mt-4" size="sm" onClick={handleAutoLayout}>Muat ulang tampilan</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Right inspector ===== */}
      {selectedNode && inspectorOpen && (
        <aside className="z-40 flex w-72 shrink-0 flex-col border-l border-border bg-card" data-scrollable="true">
          <div className="flex items-start justify-between gap-2 border-b border-border p-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', KIND_META[getKind(selectedNode.model || '', selectedNode.name || '', String(selectedNode.id) === 'internet')].soft)}>
                {React.createElement(KIND_META[getKind(selectedNode.model || '', selectedNode.name || '', String(selectedNode.id) === 'internet')].icon, { size: 17 })}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold leading-tight">{selectedNode.name}</h3>
                <p className="truncate font-mono text-[11px] text-muted-foreground">{selectedNode.ip || selectedNode.model}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedNodeId(null)}><X size={14} /></Button>
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4" data-scrollable="true">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge variant={(!selectedNode.status || selectedNode.status === 'active') ? 'default' : 'destructive'} className="text-[10px]">
                {(!selectedNode.status || selectedNode.status === 'active') ? 'Online' : 'Offline'}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">{selectedNode.model}</Badge>
              {selectedNode.vlan && <Badge variant="outline" className="text-[10px]">VLAN {selectedNode.vlan}</Badge>}
            </div>
            <dl className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-[11px]">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Lokasi</dt><dd className="truncate font-semibold">{selectedNode.location || '-'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Rack</dt><dd className="font-semibold">{selectedNode.rack || '-'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Uplink</dt><dd className="max-w-[140px] truncate text-right font-semibold text-amber-600">{!selectedNode.uplinkId || selectedNode.uplinkId === 'internet' ? 'Core Hub' : byId.get(String(selectedNode.uplinkId))?.name || selectedNode.uplinkId}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Load</dt><dd className="font-mono font-semibold">{(selectedNode.ports || []).filter(p => p.status === PortStatus.ACTIVE).length}/{selectedNode.totalPorts || selectedNode.ports?.length || 0}</dd></div>
              {selectedNode.ports?.[0]?.macAddress && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">MAC</dt><dd className="font-mono text-[10px]">{selectedNode.ports[0].macAddress}</dd></div>}
              {selectedNode.ports?.[0]?.linkSpeed && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Link</dt><dd className="font-semibold text-emerald-600">{selectedNode.ports[0].linkSpeed}</dd></div>}
            </dl>

            {impactedIds.size > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                ⚠ {impactedIds.size} node downstream terdampak jika node ini mati.
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => onViewProfile?.(selectedNode)}><Info size={13} className="mr-1" /> Profil</Button>
              {canManage && <Button variant="default" size="sm" className="h-8 text-[11px]" onClick={() => onEditNode?.(selectedNode)}><Pencil size={13} className="mr-1" /> Edit</Button>}
            </div>
            {canManage && String(selectedNode.id) !== 'internet' && (!coreIdStr || String(selectedNode.id) !== coreIdStr) && (
              <>
                <Button variant="outline" size="sm" className="mt-2 h-8 w-full text-[11px] text-emerald-600" onClick={() => { onConnectNodes?.(String(selectedNode.id), 'internet'); showToast(`${selectedNode.name} jadi Core HUB`, 'success'); }}>
                  <Globe size={13} className="mr-1" /> Jadikan Core HUB
                </Button>
                <Button variant="ghost" size="sm" className="mt-1 h-8 w-full text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-600" onClick={() => onDeleteNode?.(String(selectedNode.id))}>
                  <Trash2 size={13} className="mr-1" /> Hapus node
                </Button>
              </>
            )}
            <button onClick={() => setInspectorOpen(false)} className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
              Sembunyikan panel <ChevronRight size={12} />
            </button>
          </div>
        </aside>
      )}
      {selectedNode && !inspectorOpen && (
        <button onClick={() => setInspectorOpen(true)} className="absolute right-3 top-14 z-30 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold shadow-md hover:bg-accent">
          Detail: {selectedNode.name}
        </button>
      )}

      {/* context menu */}
      {menu && (
        <div
          className="fixed z-[9999] w-48 rounded-xl border border-border bg-popover p-1.5 shadow-xl"
          style={{ top: menu.y, left: menu.x }}
          onClick={e => e.stopPropagation()}
        >
          <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Node</p>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold hover:bg-accent"
            onClick={() => { const sw = byId.get(String(menu.id)) || (String(menu.id) === 'internet' ? coreNode : undefined); if (sw) onViewProfile?.(sw); setMenu(null); }}
          ><Info size={13} className="text-muted-foreground" /> Profil</button>
          {canManage && (
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold hover:bg-accent"
              onClick={() => { const sw = byId.get(String(menu.id)); if (sw) onEditNode?.(sw); setMenu(null); }}
            ><Pencil size={13} className="text-amber-600" /> Edit</button>
          )}
          {canManage && String(menu.id) !== 'internet' && (!coreIdStr || String(menu.id) !== coreIdStr) && (
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10"
              onClick={() => { onDeleteNode?.(String(menu.id)); setMenu(null); }}
            ><Trash2 size={13} /> Hapus</button>
          )}
        </div>
      )}

      {/* wipe */}
      {canManage && onWipeAll && (
        <button onClick={onWipeAll} title="Hapus semua" className="absolute bottom-3 right-3 z-30 rounded-lg border border-border bg-card/90 p-2 text-muted-foreground shadow backdrop-blur hover:bg-rose-500/10 hover:text-rose-600">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};
