import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin, Plus, Trash2, Edit3, Download, X, Save, Eye, Move, Image as ImageIcon,
  Cloud, CloudOff, RefreshCw, ZoomIn, ZoomOut, Maximize2, Grid, Search,
  Compass, Briefcase, Users, Crown, Coffee, Server, Building2, Layers, Sun, Hand, MousePointer, Pentagon, PenLine, Eraser
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Button } from "@/components/ui/button";


export interface MarkerCategory {
  id: string;
  name: string;
  badge: string;
  color: string;
  iconName: string;
}

export const CATEGORIES: MarkerCategory[] = [
  { id: 'division', name: 'Division / Department', badge: 'Division', color: '#2563EB', iconName: 'Briefcase' },
  { id: 'meeting', name: 'Meeting Room', badge: 'Meeting', color: '#7C3AED', iconName: 'Users' },
  { id: 'director', name: 'Executive / BOD Room', badge: 'Executive', color: '#D97706', iconName: 'Crown' },
  { id: 'facility', name: 'Facility (Toilet/Pantry)', badge: 'Facility', color: '#DB2777', iconName: 'Coffee' },
  { id: 'utility', name: 'Server / Utility Room', badge: 'Utility', color: '#DC2626', iconName: 'Server' },
  { id: 'general', name: 'Common Area / Other', badge: 'General', color: '#059669', iconName: 'Building2' },
];

export const getCategoryMeta = (catId?: string): MarkerCategory => {
  return CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];
};

const inferCategoryFromLabel = (label: string): string => {
  const l = label.toLowerCase();
  if (l.includes('meeting') || l.includes('rapat') || l.includes('conference')) return 'meeting';
  if (l.includes('director') || l.includes('direktur') || l.includes('bod') || l.includes('ceo') || l.includes('comm')) return 'director';
  if (l.includes('toilet') || l.includes('pantry') || l.includes('restroom') || l.includes('musholla') || l.includes('wc')) return 'facility';
  if (l.includes('server') || l.includes('utility') || l.includes('panel') || l.includes('storage') || l.includes('gudang')) return 'utility';
  if (l.includes('lobby') || l.includes('reception') || l.includes('koridor') || l.includes('taman') || l.includes('terrace')) return 'general';
  return 'division';
};

interface PolyPoint { xPct: number; yPct: number; }

interface DivisionMarker {
  id: string;
  xPct: number;
  yPct: number;
  label: string;
  color: string;
  description: string;
  category?: string;
  polygon?: PolyPoint[];
}

const STORAGE_KEY = 'gesit_office_layout_markers';

const PRESET_COLORS = [
  '#2563EB', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#DB2777', '#0891B2', '#65A30D',
  '#EA580C', '#4F46E5',
];

type LabelRect = { x: number; y: number; w: number; h: number };

const rectsOverlap = (a: LabelRect, b: LabelRect) =>
  !(a.x + a.w + 6 < b.x || b.x + b.w + 6 < a.x ||
    a.y + a.h + 6 < b.y || b.y + b.h + 6 < a.y);

const findLabelPos = (
  px: number, py: number, r: number,
  lw: number, lh: number,
  placed: LabelRect[]
): { lx: number; ly: number; isDefault: boolean } => {
  const mg = 8;
  const pinBottom = py + 4;
  const candidates = [
    { lx: px - lw / 2, ly: py - r * 2 - lh - mg },
    { lx: px + r + mg, ly: py - r - lh / 2 },
    { lx: px - lw - r - mg, ly: py - r - lh / 2 },
    { lx: px - lw / 2, ly: pinBottom + mg },
    { lx: px + r + mg, ly: py - r * 2 - lh - mg },
    { lx: px - lw - r - mg, ly: py - r * 2 - lh - mg },
    { lx: px + r + mg, ly: pinBottom + mg },
    { lx: px - lw - r - mg, ly: pinBottom + mg },
  ];
  for (let i = 0; i < candidates.length; i++) {
    const { lx, ly } = candidates[i];
    const rect: LabelRect = { x: lx - 3, y: ly - 3, w: lw + 6, h: lh + 6 };
    if (!placed.some(p => rectsOverlap(rect, p))) {
      return { lx, ly, isDefault: i === 0 };
    }
  }
  return { ...candidates[0], isDefault: true };
};

const drawGridOverlay = (
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, iw: number, ih: number
) => {
  ctx.save();
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = ox; x <= ox + iw; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, oy);
    ctx.lineTo(x, oy + ih);
    ctx.stroke();
  }
  for (let y = oy; y <= oy + ih; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(ox, y);
    ctx.lineTo(ox + iw, y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawLegend = (
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  markersOnCanvas: DivisionMarker[],
  scale: number = 1
) => {
  // Only show categories that have at least one visible marker
  const usedCatIds = [...new Set(markersOnCanvas.map(m => m.category || 'division'))];
  const usedCats = CATEGORIES.filter(c => usedCatIds.includes(c.id));
  if (usedCats.length === 0) return;

  const pad = 12 * scale;
  const rowH = 18 * scale;
  const dotR = 5 * scale;
  const fontSize = 9.5 * scale;
  const titleFontSize = 10.5 * scale;
  const legendW = 160 * scale;
  const legendH = (titleFontSize + pad + usedCats.length * rowH + pad * 0.5);

  const lx = pad * 1.5;
  const ly = canvasH - legendH - pad * 1.5;

  // Background box
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 6 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.8 * scale;
  const rad = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(lx + rad, ly);
  ctx.lineTo(lx + legendW - rad, ly);
  ctx.arcTo(lx + legendW, ly, lx + legendW, ly + rad, rad);
  ctx.lineTo(lx + legendW, ly + legendH - rad);
  ctx.arcTo(lx + legendW, ly + legendH, lx + legendW - rad, ly + legendH, rad);
  ctx.lineTo(lx + rad, ly + legendH);
  ctx.arcTo(lx, ly + legendH, lx, ly + legendH - rad, rad);
  ctx.lineTo(lx, ly + rad);
  ctx.arcTo(lx, ly, lx + rad, ly, rad);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();

  // Title
  ctx.font = `800 ${titleFontSize}px Inter, -apple-system, sans-serif`;
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('LEGEND', lx + pad, ly + pad * 0.8);

  // Category rows
  usedCats.forEach((cat, i) => {
    const ry = ly + pad * 0.8 + titleFontSize + pad * 0.6 + i * rowH;
    const cx = lx + pad + dotR;
    const cy = ry + rowH / 2 - dotR * 0.2;

    // Colored circle
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = cat.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    // Category name
    ctx.font = `600 ${fontSize}px Inter, -apple-system, sans-serif`;
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat.name, cx + dotR + 6 * scale, cy);
  });

  ctx.restore();
};

const drawMarkersOnCtx = (
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, iw: number, ih: number,
  markersToRender: DivisionMarker[],
  hoverId: string | null,
  selectedId: string | null,
  zoomLevel: number,
  editMode: boolean = false,
  exportScale: number = 1
) => {
  // ── Pass 1: Draw numbered circle markers ──────────────────────────────
  markersToRender.forEach((m, idx) => {
    const px = ox + m.xPct * iw;
    const py = oy + m.yPct * ih;
    const isHovered = hoverId === m.id;
    const isSelected = selectedId === m.id;
    const r = (isHovered || isSelected ? 13 : 11) * exportScale;
    const num = String(idx + 1);

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4 * exportScale;
    ctx.shadowOffsetY = 2 * exportScale;

    // Solid colored circle (matching user's blue or category color)
    // The user's image shows all circles as a dark blue, but we'll use m.color for flexibility.
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = m.color || '#1d4ed8';
    ctx.fill();

    // Subtle white border
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * exportScale;
    ctx.stroke();

    // Number inside circle
    const numFontSize = 9.5 * exportScale;
    ctx.font = `800 ${numFontSize}px Inter, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, px, py + 0.5 * exportScale);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });

  // ── Pass 2: Draw clean text labels (with collision avoidance) ────────
  const placed: { x: number; y: number; w: number; h: number }[] = [];

  markersToRender.forEach((m) => {
    if (!m.label) return;
    const px = ox + m.xPct * iw;
    const py = oy + m.yPct * ih;
    const isHovered = hoverId === m.id;
    const isSelected = selectedId === m.id;
    const r = (isHovered || isSelected ? 13 : 11) * exportScale;

    const fontSize = 9.5 * exportScale;
    ctx.font = `800 ${fontSize}px Inter, -apple-system, sans-serif`;

    // Wrap long labels to 2 lines at ~16 chars
    const maxChars = 16;
    let lines: string[];
    if (m.label.length <= maxChars) {
      lines = [m.label];
    } else {
      const mid = Math.ceil(m.label.length / 2);
      const breakAt = m.label.lastIndexOf(' ', mid);
      lines = breakAt > 0
        ? [m.label.slice(0, breakAt).trim(), m.label.slice(breakAt + 1).trim()]
        : [m.label.slice(0, maxChars).trim(), m.label.slice(maxChars).trim()];
    }

    const lineH = fontSize + 2 * exportScale;
    const totalH = lines.length * lineH;
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));

    // Try 4 candidate positions: below, above, right, left of the circle
    const gap = 4 * exportScale;
    const candidates = [
      { lx: px, ly: py + r + gap },          // below
      { lx: px, ly: py - r - totalH - gap }, // above
      { lx: px + r + gap, ly: py - totalH / 2 }, // right
      { lx: px - r - gap, ly: py - totalH / 2 }, // left
    ];

    const overlaps = (b: { x: number; y: number; w: number; h: number }) =>
      placed.some(p =>
        !(b.x + b.w < p.x || p.x + p.w < b.x || b.y + b.h < p.y || p.y + p.h < b.y)
      );

    let chosen = candidates[0]; // default: below
    for (const c of candidates) {
      const box = { x: c.lx - maxW / 2, y: c.ly, w: maxW, h: totalH };
      if (!overlaps(box)) { chosen = c; break; }
    }

    const { lx, ly } = chosen;
    placed.push({ x: lx - maxW / 2, y: ly, w: maxW, h: totalH });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    lines.forEach((line, li) => {
      const ty = ly + li * lineH;
      // Thin white stroke for legibility over blueprint lines
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5 * exportScale;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, lx, ty);
      ctx.fillStyle = '#1e293b';
      ctx.fillText(line, lx, ty);
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  });
};

const OfficeLayoutManager: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [markers, setMarkers] = useState<DivisionMarker[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, category: m.category || inferCategoryFromLabel(m.label) }));
      }
      return [];
    } catch { return []; }
  });

  const [viewMode, setViewMode] = useState<'2d'>('2d');
  const [editMode, setEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState<'pan' | 'select'>('select');
  const [blueprintDimmed, setBlueprintDimmed] = useState(true); // Default dimmed blueprint (85% opacity) for high contrast
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [floorImageUrl, setFloorImageUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Panning & Dragging State Refs for 60fps Smooth Interaction
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingCanvasRef = useRef(false);
  const isSpacePressedRef = useRef(false);

  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    xPct?: number;
    yPct?: number;
    marker?: DivisionMarker;
  }>({ open: false, mode: 'add' });

  const [form, setForm] = useState({ label: '', description: '', color: PRESET_COLORS[0], category: 'division' });
  const draggingMarkerRef = useRef<{ id: string; moved: boolean } | null>(null);
  const justDraggedMarkerRef = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Polygon Area Drawing State
  const [polygonDrawMode, setPolygonDrawMode] = useState(false);
  const [polygonTargetId, setPolygonTargetId] = useState<string | null>(null);
  const [pendingPolygon, setPendingPolygon] = useState<PolyPoint[]>([]);
  const [polyMousePos, setPolyMousePos] = useState<{ xPct: number; yPct: number } | null>(null);

  // Custom Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    type: 'marker' | 'polygon';
    title: string;
    message: string;
  }>({ open: false, id: null, type: 'marker', title: '', message: '' });

  const syncUpsertToSupabase = async (m: DivisionMarker) => {
    try {
      const payload: any = {
        id: m.id,
        label: m.label,
        description: m.description || '',
        color: m.color,
        category: m.category || 'division',
        x_pct: m.xPct,
        y_pct: m.yPct,
        polygon: m.polygon ? JSON.stringify(m.polygon) : null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('office_layout_markers').upsert(payload);
      if (error) {
        // fallback without optional columns
        delete payload.category;
        delete payload.polygon;
        await supabase.from('office_layout_markers').upsert(payload);
      }
      setIsCloudConnected(true);
    } catch (err) {
      console.warn('Supabase upsert note:', err);
    }
  };

  const syncDeleteFromSupabase = async (id: string) => {
    try {
      await supabase.from('office_layout_markers').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete note:', err);
    }
  };

  useEffect(() => {
    let channel: any;
    const fetchFromSupabase = async () => {
      setIsSyncing(true);
      try {
        const { data, error } = await supabase.from('office_layout_markers').select('*').order('updated_at', { ascending: true });
        if (!error && data) {
          setIsCloudConnected(true);
          const mapped: DivisionMarker[] = data.map((d: any) => ({
            id: d.id,
            label: d.label,
            description: d.description || '',
            color: d.color,
            category: d.category || inferCategoryFromLabel(d.label),
            xPct: Number(d.x_pct),
            yPct: Number(d.y_pct),
            polygon: d.polygon ? (() => { try { return JSON.parse(d.polygon); } catch { return undefined; } })() : undefined,
          }));
          setMarkers(mapped);
        } else if (error && error.code === 'PGRST205') {
          setIsCloudConnected(false);
        }
      } catch (err) {
        console.warn('Supabase fetch error, fallback to local storage:', err);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchFromSupabase();
    try {
      channel = supabase
        .channel('public:office_layout_markers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'office_layout_markers' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRow = payload.new as any;
            const marker: DivisionMarker = {
              id: newRow.id,
              label: newRow.label,
              description: newRow.description || '',
              color: newRow.color,
              category: newRow.category || inferCategoryFromLabel(newRow.label),
              xPct: Number(newRow.x_pct),
              yPct: Number(newRow.y_pct),
              polygon: newRow.polygon ? (() => { try { return JSON.parse(newRow.polygon); } catch { return undefined; } })() : undefined,
            };
            setMarkers(prev => {
              const exists = prev.some(m => m.id === marker.id);
              return exists ? prev.map(m => m.id === marker.id ? marker : m) : [...prev, marker];
            });
          } else if (payload.eventType === 'DELETE') {
            setMarkers(prev => prev.filter(m => m.id !== payload.old.id));
          }
        })
        .subscribe();
    } catch (err) { console.warn('Realtime channel error:', err); }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      // Reuse the loaded blueprint as the floor texture in 3D
      if (img.src && img.src !== window.location.href) {
        setFloorImageUrl(img.src);
      }
    };
    img.onerror = () => {
      // Blueprint asset missing — fall back to built-in PDF reference
      setFloorImageUrl(null);
    };
    img.src = '/layout.png';
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      setCanvasSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(markers)); }, [markers]);

  // Spacebar hold + ESC (cancel polygon) key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressedRef.current && (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        isSpacePressedRef.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }
      if (e.code === 'Escape') {
        if (polygonDrawMode) {
          setPolygonDrawMode(false);
          setPolygonTargetId(null);
          setPendingPolygon([]);
          setPolyMousePos(null);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        if (canvasRef.current) canvasRef.current.style.cursor = editMode ? 'crosshair' : 'default';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editMode, polygonDrawMode]);

  // Computed filtered arrays
  const visibleMarkers = useMemo(() => markers.filter(m => {
    const cat = m.category || inferCategoryFromLabel(m.label);
    return selectedCategory === 'all' || cat === selectedCategory;
  }), [markers, selectedCategory]);

  const filteredMarkers = useMemo(() => visibleMarkers.filter(m => {
    return m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.description.toLowerCase().includes(searchQuery.toLowerCase());
  }), [visibleMarkers, searchQuery]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = canvasSize;
    if (w === 0 || h === 0) return;
    canvas.width = w; canvas.height = h;
    ctx.save();

    // Clean Soft White Workspace Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Apply Pan & Zoom Viewport Matrix
    ctx.translate(w / 2 + panOffset.x, h / 2 + panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-w / 2, -h / 2);

    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const ox = (w - iw) / 2;
    const oy = (h - ih) / 2;

    // Draw Floorplan Image with Soft Dimming Filter if blueprintDimmed is true
    ctx.save();
    if (blueprintDimmed) {
      ctx.globalAlpha = 0.82; // Softens blueprint lines so markers pop out
    }
    ctx.drawImage(img, ox, oy, iw, ih);
    ctx.restore();

    if (showGrid) drawGridOverlay(ctx, ox, oy, iw, ih);

    // ── Draw Polygon Area Fills (below markers) ──────────────────────────
    visibleMarkers.forEach(m => {
      if (!m.polygon || m.polygon.length < 3) return;
      const catMeta = getCategoryMeta(m.category);
      const isSelected = selectedMarkerId === m.id;
      const pts = m.polygon.map(p => ({ x: ox + p.xPct * iw, y: oy + p.yPct * ih }));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = `${catMeta.color}28`;
      ctx.fill();
      ctx.strokeStyle = `${catMeta.color}${isSelected ? 'cc' : '80'}`;
      ctx.lineWidth = isSelected ? 2 : 1.2;
      ctx.setLineDash(isSelected ? [] : [5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Show vertex handles in edit mode
      if (editMode && isSelected) {
        pts.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = catMeta.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    });

    // ── Draw In-Progress Polygon (while drawing) ─────────────────────────
    if (polygonDrawMode && pendingPolygon.length > 0) {
      const targetMarker = markers.find(m => m.id === polygonTargetId);
      const drawColor = targetMarker ? getCategoryMeta(targetMarker.category).color : '#2563EB';
      const pts = pendingPolygon.map(p => ({ x: ox + p.xPct * iw, y: oy + p.yPct * ih }));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      // Rubber band line to cursor
      if (polyMousePos) {
        ctx.lineTo(ox + polyMousePos.xPct * iw, oy + polyMousePos.yPct * ih);
      }
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Filled preview
      if (pts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fillStyle = `${drawColor}22`;
        ctx.fill();
      }

      // Vertex dots
      pts.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, i === 0 ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? drawColor : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    drawMarkersOnCtx(ctx, ox, oy, iw, ih, visibleMarkers, hoveredId, selectedMarkerId, zoomLevel);
    ctx.restore();
    // Draw Legend (in screen space, not world space)
    drawLegend(ctx, w, h, visibleMarkers, 1);
  }, [visibleMarkers, imgLoaded, canvasSize, hoveredId, selectedMarkerId, zoomLevel, panOffset, showGrid, blueprintDimmed, polygonDrawMode, pendingPolygon, polygonTargetId, polyMousePos, editMode]);

  useEffect(() => { draw(); }, [draw]);

  const getTransformedImageCoords = (mx: number, my: number) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return null;
    const { w, h } = canvasSize;
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const ox = (w - iw) / 2;
    const oy = (h - ih) / 2;
    const worldX = (mx - w / 2 - panOffset.x) / zoomLevel + w / 2;
    const worldY = (my - h / 2 - panOffset.y) / zoomLevel + h / 2;
    const xPct = (worldX - ox) / iw;
    const yPct = (worldY - oy) / ih;
    return (xPct >= 0 && xPct <= 1 && yPct >= 0 && yPct <= 1) ? { xPct, yPct } : null;
  };

  const getMarkerAt = (mx: number, my: number): DivisionMarker | null => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return null;
    const { w, h } = canvasSize;
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const ox = (w - iw) / 2;
    const oy = (h - ih) / 2;
    const worldX = (mx - w / 2 - panOffset.x) / zoomLevel + w / 2;
    const worldY = (my - h / 2 - panOffset.y) / zoomLevel + h / 2;
    for (let i = markers.length - 1; i >= 0; i--) {
      const m = markers[i];
      if (selectedCategory !== 'all' && (m.category || 'division') !== selectedCategory) continue;
      const px = ox + m.xPct * iw;
      const py = oy + m.yPct * ih - 11;
      if (Math.sqrt((worldX - px) ** 2 + (worldY - py) ** 2) <= 22) return m;
    }
    return null;
  };

  const focusOnMarker = (m: DivisionMarker) => {
    setSelectedMarkerId(m.id);
    const { w, h } = canvasSize;
    const img = imgRef.current;
    if (!img || w === 0 || h === 0) return;
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const ox = (w - iw) / 2;
    const oy = (h - ih) / 2;
    const targetZoom = 1.8;
    setZoomLevel(targetZoom);
    setPanOffset({ x: (w / 2 - (ox + m.xPct * iw)) * targetZoom, y: (h / 2 - (oy + m.yPct * ih)) * targetZoom });
  };

  const handleZoomIn = () => setZoomLevel(z => Math.min(4.0, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel(z => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); setSelectedMarkerId(null); };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoomLevel(prev => Math.max(0.5, Math.min(4.0, Number((prev * (e.deltaY < 0 ? 1.15 : 0.85)).toFixed(2)))));
  };

  // Global Smooth Mouse Move & Drag Handler
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!mouseDownPosRef.current) return;

      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const distFromStart = Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y);

      // If moved > 3px, treat as drag/pan action
      if (distFromStart > 3) {
        if (draggingMarkerRef.current && editMode) {
          // Dragging Marker Pin in Edit Mode
          const coords = getTransformedImageCoords(
            e.clientX - canvasRef.current!.getBoundingClientRect().left,
            e.clientY - canvasRef.current!.getBoundingClientRect().top
          );
          if (coords) {
            draggingMarkerRef.current.moved = true;
            setMarkers(p => p.map(m => m.id === draggingMarkerRef.current!.id ? { ...m, ...coords } : m));
          }
        } else {
          // Dragging / Panning Canvas Viewport
          isPanningRef.current = true;
          isDraggingCanvasRef.current = true;
          setPanOffset(p => ({ x: p.x + dx, y: p.y + dy }));
          panStartRef.current = { x: e.clientX, y: e.clientY };
          if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingCanvasRef.current) {
        setTimeout(() => { isDraggingCanvasRef.current = false; }, 50);
      }
      if (draggingMarkerRef.current?.moved) {
        const m = markers.find(mark => mark.id === draggingMarkerRef.current!.id);
        if (m) syncUpsertToSupabase(m);
        justDraggedMarkerRef.current = true;
        setTimeout(() => { justDraggedMarkerRef.current = false; }, 100);
      }

      isPanningRef.current = false;
      draggingMarkerRef.current = null;
      mouseDownPosRef.current = null;

      if (canvasRef.current) {
        canvasRef.current.style.cursor = editMode ? 'crosshair' : (activeTool === 'pan' ? 'grab' : 'default');
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [editMode, markers, zoomLevel, panOffset, activeTool]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hit = getMarkerAt(e.clientX - rect.left, e.clientY - rect.top);

    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingCanvasRef.current = false;

    if (hit && editMode && activeTool !== 'pan') {
      draggingMarkerRef.current = { id: hit.id, moved: false };
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingCanvasRef.current || justDraggedMarkerRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // ── Polygon draw mode: single click = add vertex ──────────────────────
    if (polygonDrawMode && polygonTargetId) {
      const coords = getTransformedImageCoords(e.clientX - rect.left, e.clientY - rect.top);
      if (!coords) return;

      // If clicking near first vertex (close polygon)
      if (pendingPolygon.length >= 3) {
        const first = pendingPolygon[0];
        const { w, h } = canvasSize;
        const img = imgRef.current;
        if (img) {
          const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
          const iw = img.naturalWidth * scale;
          const ih = img.naturalHeight * scale;
          const ox = (w - iw) / 2, oy = (h - ih) / 2;
          const firstPx = ox + first.xPct * iw, firstPy = oy + first.yPct * ih;
          const clickPx = ox + coords.xPct * iw, clickPy = oy + coords.yPct * ih;
          if (Math.hypot(clickPx - firstPx, clickPy - firstPy) / zoomLevel < 12) {
            // Close polygon
            const finalPoly = [...pendingPolygon];
            setMarkers(prev => prev.map(m => m.id === polygonTargetId ? { ...m, polygon: finalPoly } : m));
            const updated = markers.find(m => m.id === polygonTargetId);
            if (updated) syncUpsertToSupabase({ ...updated, polygon: finalPoly });
            setPolygonDrawMode(false);
            setPolygonTargetId(null);
            setPendingPolygon([]);
            setPolyMousePos(null);
            return;
          }
        }
      }
      setPendingPolygon(p => [...p, coords]);
      return;
    }

    const hit = getMarkerAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      setSelectedMarkerId(hit.id);
      if (editMode && activeTool !== 'pan') {
        setForm({
          label: hit.label,
          description: hit.description,
          color: hit.color,
          category: hit.category || inferCategoryFromLabel(hit.label)
        });
        setDialog({ open: true, mode: 'edit', marker: hit });
      }
    } else if (editMode && activeTool !== 'pan') {
      const coords = getTransformedImageCoords(e.clientX - rect.left, e.clientY - rect.top);
      if (coords) {
        const defaultCat = selectedCategory === 'all' ? 'division' : selectedCategory;
        const catMeta = getCategoryMeta(defaultCat);
        setForm({ label: '', description: '', color: catMeta.color, category: defaultCat });
        setDialog({ open: true, mode: 'add', ...coords });
      }
    }
  };

  const handleCanvasDblClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Double-click closes the polygon
    if (polygonDrawMode && polygonTargetId && pendingPolygon.length >= 3) {
      const finalPoly = [...pendingPolygon];
      setMarkers(prev => prev.map(m => m.id === polygonTargetId ? { ...m, polygon: finalPoly } : m));
      const updated = markers.find(m => m.id === polygonTargetId);
      if (updated) syncUpsertToSupabase({ ...updated, polygon: finalPoly });
      setPolygonDrawMode(false);
      setPolygonTargetId(null);
      setPendingPolygon([]);
      setPolyMousePos(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current || draggingMarkerRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Update rubber-band line in polygon draw mode
    if (polygonDrawMode) {
      const coords = getTransformedImageCoords(e.clientX - rect.left, e.clientY - rect.top);
      if (coords) setPolyMousePos(coords);
      canvas.style.cursor = 'crosshair';
      return;
    }

    const hit = getMarkerAt(e.clientX - rect.left, e.clientY - rect.top);
    setHoveredId(hit?.id || null);

    if (isSpacePressedRef.current || activeTool === 'pan') {
      canvas.style.cursor = 'grab';
    } else if (hit) {
      canvas.style.cursor = editMode ? 'grab' : 'pointer';
    } else {
      canvas.style.cursor = editMode ? 'crosshair' : 'grab';
    }
  };

  const saveMarker = () => {
    if (!form.label.trim()) return;
    let m: DivisionMarker;
    if (dialog.mode === 'add') {
      m = {
        id: `m_${Date.now()}`,
        label: form.label.trim(),
        description: form.description.trim(),
        color: form.color,
        category: form.category,
        xPct: dialog.xPct!,
        yPct: dialog.yPct!
      };
      setMarkers(prev => [...prev, m]);
    } else {
      m = {
        ...dialog.marker!,
        label: form.label.trim(),
        description: form.description.trim(),
        color: form.color,
        category: form.category
      };
      setMarkers(prev => prev.map(item => item.id === m.id ? m : item));
    }
    syncUpsertToSupabase(m);
    setDialog({ open: false, mode: 'add' });
  };

  const deleteMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
    syncDeleteFromSupabase(id);
    if (selectedMarkerId === id) setSelectedMarkerId(null);
    setDialog({ open: false, mode: 'add' });
  };

  const exportCanvas = (fmt: 'png' | 'jpeg') => {
    const img = imgRef.current;
    if (!img) return;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
    const ctx = tmp.getContext('2d')!;
    if (fmt === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tmp.width, tmp.height); }
    
    // Draw background image
    ctx.drawImage(img, 0, 0, tmp.width, tmp.height);

    // Apply scale so markers aren't microscopic on high-res images
    // We assume a standard screen width of 1200px for marker sizing
    const VIRTUAL_W = 1200;
    const exportScale = img.naturalWidth / VIRTUAL_W;
    
    // Draw Polygons for Export
    visibleMarkers.forEach(m => {
      if (!m.polygon || m.polygon.length < 3) return;
      const catMeta = getCategoryMeta(m.category);
      const pts = m.polygon.map(p => ({ x: p.xPct * img.naturalWidth, y: p.yPct * img.naturalHeight }));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = `${catMeta.color}28`;
      ctx.fill();
      ctx.strokeStyle = `${catMeta.color}80`;
      ctx.lineWidth = 1.2 * exportScale;
      ctx.setLineDash([5 * exportScale, 4 * exportScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw Markers for Export
    drawMarkersOnCtx(ctx, 0, 0, img.naturalWidth, img.naturalHeight, visibleMarkers, null, null, 1, false, exportScale);

    // Draw Legend for Export
    drawLegend(ctx, img.naturalWidth, img.naturalHeight, visibleMarkers, exportScale);
    
    const a = document.createElement('a'); 
    a.href = tmp.toDataURL(`image/${fmt}`, 0.95); 
    a.download = `office-layout-hd.${fmt}`; 
    a.click();
  };

  const exportJSON = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(markers, null, 2)], { type: 'application/json' }));
    a.download = 'office-layout-backup.json';
    a.click();
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string; if (!text) return;
        const parsed = JSON.parse(text);
        const rawArray = Array.isArray(parsed) ? parsed : (parsed.markers || []);
        if (!Array.isArray(rawArray)) { alert('File JSON tidak valid.'); return; }
        const normalized: DivisionMarker[] = rawArray.map((item: any, idx: number) => {
          const label = String(item.label || item.name || 'Divisi');
          return {
            id: String(item.id || `m_${Date.now()}_${idx}`),
            label,
            description: String(item.description || ''),
            color: String(item.color || PRESET_COLORS[0]),
            category: String(item.category || inferCategoryFromLabel(label)),
            xPct: Number(item.xPct ?? item.x_pct ?? 0.5),
            yPct: Number(item.yPct ?? item.y_pct ?? 0.5),
          };
        });
        setMarkers(normalized);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        normalized.forEach(syncUpsertToSupabase);
        alert(`Berhasil memuat ${normalized.length} lokasi/divisi dari file JSON.`);
      } catch (err) { alert('Format file JSON tidak dapat dibaca.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', minHeight: 600,
      background: '#f8fafc', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
    }}>
      {/* Top Header Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: '#ffffff',
        borderBottom: '1px solid #e2e8f0', gap: 16, flexWrap: 'wrap', zIndex: 10,
      }}>
        {/* Title & Cloud Sync Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}>
            <MapPin size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Office Layout
              </h1>
              {isSyncing ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600, border: '1px solid #bfdbfe' }}>
                  <RefreshCw size={11} className="animate-spin" /> Syncing...
                </span>
              ) : isCloudConnected ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 600, border: '1px solid #a7f3d0' }} title="Terhubung ke Supabase DB">
                  <Cloud size={12} /> Cloud Synced
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: '#fefce8', color: '#ca8a04', fontSize: 11, fontWeight: 600, border: '1px solid #fef08a' }} title="Mode Local Cache">
                  <CloudOff size={12} /> Local Cache
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Interactive Floorplan, High-Contrast UI & Drag Pan Mechanics
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setEditMode(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: editMode ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#f1f5f9',
              color: editMode ? '#ffffff' : '#334155',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: editMode ? '0 4px 14px rgba(37, 99, 235, 0.3)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {editMode ? <><Move size={15} /> Edit Mode ON</> : <><Eye size={15} /> View Mode</>}
          </button>

          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
            <button
              onClick={() => setViewMode('2d')}
                            style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: viewMode === '2d' ? '#ffffff' : 'transparent',
                color: viewMode === '2d' ? '#2563eb' : '#334155',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
                boxShadow: viewMode === '2d' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <ImageIcon size={13} /> 2D
            </button>
            <button
              onClick={() => setViewMode('2d')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: 'transparent',
                color: '#334155',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
                boxShadow: 'none',
              }}
            >
              2D only
            </button>
          </div>

          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
            <button
              onClick={() => exportCanvas('png')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', color: '#334155',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
              title="Export HD PNG"
            >
              <Download size={13} /> PNG
            </button>
            <button
              onClick={() => exportCanvas('jpeg')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', color: '#334155',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
              title="Export HD JPG"
            >
              <ImageIcon size={13} /> JPG
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

          <button
            onClick={exportJSON}
            title="Backup data ke file JSON"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid #cbd5e1', background: '#ffffff',
              color: '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Save size={14} /> Backup
          </button>

          <label
            title="Load data dari file JSON"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid #cbd5e1', background: '#ffffff',
              color: '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Load JSON
            <input type="file" accept=".json" onChange={importJSON} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Left Sidebar */}
        <div style={{
          width: 295, flexShrink: 0,
          background: '#ffffff', borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', zIndex: 5,
        }}>
          {/* Category Filter Pills & Search */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Layers size={13} /> Filter Kategori
              </span>
              <span style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>
                {filteredMarkers.length} / {markers.length} Area
              </span>
            </div>

            {/* Category Pills Horizontal Bar */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, marginBottom: 10, scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '4px 10px', borderRadius: 16, border: 'none',
                  background: selectedCategory === 'all' ? '#0f172a' : '#f1f5f9',
                  color: selectedCategory === 'all' ? '#ffffff' : '#475569',
                  fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                Semua ({markers.length})
              </button>

              {CATEGORIES.map(cat => {
                const count = markers.filter(m => (m.category || inferCategoryFromLabel(m.label)) === cat.id).length;
                const isSel = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 16,
                      border: isSel ? `1px solid ${cat.color}` : '1px solid transparent',
                      background: isSel ? `${cat.color}20` : '#f1f5f9',
                      color: isSel ? cat.color : '#475569',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer',
                      whiteSpace: 'nowrap', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
                    {cat.badge} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Cari lokasi / divisi / ruangan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px 7px 32px',
                  borderRadius: 8, border: '1px solid #e2e8f0',
                  fontSize: 12, outline: 'none', background: '#f8fafc', color: '#0f172a',
                }}
              />
              {searchQuery && (
                <X size={14} onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: 9, color: '#94a3b8', cursor: 'pointer' }} />
              )}
            </div>
          </div>

          {/* Marker Cards List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredMarkers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Compass size={32} opacity={0.4} />
                <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>
                  {searchQuery ? 'Tidak ada lokasi cocok.' : 'Belum ada lokasi terpetakan.'}
                </p>
              </div>
            ) : (
              filteredMarkers.map(m => {
                const isSelected = selectedMarkerId === m.id;
                const catMeta = getCategoryMeta(m.category || inferCategoryFromLabel(m.label));
                return (
                  <div
                    key={m.id}
                    onClick={() => focusOnMarker(m)}
                    style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: isSelected ? `1.5px solid ${m.color}` : '1px solid #f1f5f9',
                      background: isSelected ? `${m.color}0d` : '#ffffff',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      boxShadow: isSelected ? `0 4px 12px ${m.color}20` : 'none',
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: m.color, flexShrink: 0, marginTop: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ffffff', fontSize: 11, fontWeight: 800,
                      boxShadow: `0 2px 8px ${m.color}66`
                    }}>
                      {visibleMarkers.findIndex(vm => vm.id === m.id) + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: `${catMeta.color}15`, color: catMeta.color,
                          border: `1px solid ${catMeta.color}30`
                        }}>
                          {catMeta.badge}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.label}
                        </div>
                      </div>
                      {m.description && (
                        <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.description}
                        </div>
                      )}
                    </div>

                    {editMode && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                          title={m.polygon && m.polygon.length >= 3 ? 'Edit / Hapus Area' : 'Gambar Area Ruangan'}
                          onClick={() => {
                            if (m.polygon && m.polygon.length >= 3) {
                              setDeleteConfirm({
                                open: true, id: m.id, type: 'polygon',
                                title: 'Hapus Area Ruangan',
                                message: `Hapus area yang sudah digambar untuk "${m.label}"?`
                              });
                            } else {
                              setPolygonTargetId(m.id);
                              setPendingPolygon([]);
                              setPolyMousePos(null);
                              setPolygonDrawMode(true);
                              setSelectedMarkerId(m.id);
                              focusOnMarker(m);
                            }
                          }}
                          style={{
                            border: 'none',
                            background: polygonTargetId === m.id ? `${m.color}20` : 'transparent',
                            color: m.polygon && m.polygon.length >= 3 ? '#10b981' : '#64748b',
                            cursor: 'pointer', padding: 2
                          }}
                        >
                          {m.polygon && m.polygon.length >= 3 ? <Eraser size={13} /> : <PenLine size={13} />}
                        </button>
                        <button
                          onClick={() => {
                            setForm({
                              label: m.label,
                              description: m.description,
                              color: m.color,
                              category: m.category || inferCategoryFromLabel(m.label)
                            });
                            setDialog({ open: true, mode: 'edit', marker: m });
                          }}
                          style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 2 }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm({
                              open: true, id: m.id, type: 'marker',
                              title: 'Hapus Lokasi',
                              message: `Yakin ingin menghapus lokasi "${m.label}" beserta seluruh datanya?`
                            });
                          }}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Floorplan Canvas Container */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDblClick}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
          />

          {/* Polygon Draw Mode Banner */}
          {polygonDrawMode && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: '#ffffff', padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `3px solid ${getCategoryMeta(markers.find(m => m.id === polygonTargetId)?.category).color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: getCategoryMeta(markers.find(m => m.id === polygonTargetId)?.category).color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <PenLine size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    🖊 Gambar Area: <span style={{ color: getCategoryMeta(markers.find(m => m.id === polygonTargetId)?.category).color }}>
                      {markers.find(m => m.id === polygonTargetId)?.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    Klik titik batas ruangan • Double-click atau klik titik pertama (●) untuk tutup area • ESC untuk batal
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {pendingPolygon.length >= 3 && (
                  <button
                    onClick={() => {
                      const finalPoly = [...pendingPolygon];
                      setMarkers(prev => prev.map(m => m.id === polygonTargetId ? { ...m, polygon: finalPoly } : m));
                      const updated = markers.find(m => m.id === polygonTargetId);
                      if (updated) syncUpsertToSupabase({ ...updated, polygon: finalPoly });
                      setPolygonDrawMode(false); setPolygonTargetId(null); setPendingPolygon([]); setPolyMousePos(null);
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none',
                      background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer'
                    }}
                  >
                    ✓ Tutup Area ({pendingPolygon.length} titik)
                  </button>
                )}
                <button
                  onClick={() => { setPolygonDrawMode(false); setPolygonTargetId(null); setPendingPolygon([]); setPolyMousePos(null); }}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Floating Canvas Controls (Zoom, Dimmer Toggle, Pan Tool, Grid, Fit View) */}
          <div style={{
            position: 'absolute', bottom: 20, right: 20,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(14px)',
            padding: '6px 10px', borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.15)',
            zIndex: 10,
          }}>
            {/* Tool Mode Selector (Select vs Pan) */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 2 }}>
              <button
                onClick={() => setActiveTool('select')}
                style={{
                  background: activeTool === 'select' ? '#2563eb' : 'transparent',
                  border: 'none', color: '#ffffff', cursor: 'pointer',
                  padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600,
                }}
                title="Select Tool"
              >
                <MousePointer size={14} /> Select
              </button>
              <button
                onClick={() => setActiveTool('pan')}
                style={{
                  background: activeTool === 'pan' ? '#2563eb' : 'transparent',
                  border: 'none', color: '#ffffff', cursor: 'pointer',
                  padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600,
                }}
                title="Hand Pan Tool (Tahan Spacebar)"
              >
                <Hand size={14} /> Pan
              </button>
            </div>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

            {/* Blueprint Dimmer / Contrast Toggle */}
            <button
              onClick={() => setBlueprintDimmed(v => !v)}
              style={{
                background: blueprintDimmed ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                border: 'none', color: blueprintDimmed ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6,
              }}
              title={blueprintDimmed ? "Mode Denah Soft (Kontras Tinggi UI) - Klik untuk Kontras Asli" : "Mode Denah Asli - Klik untuk Mode Soft (Rekomendasi)"}
            >
              <Sun size={15} />
            </button>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: zoomLevel <= 0.5 ? 'not-allowed' : 'pointer', opacity: zoomLevel <= 0.5 ? 0.4 : 1, display: 'flex', padding: 4 }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            <span
              onClick={handleResetZoom}
              style={{ color: '#ffffff', fontWeight: 700, fontSize: 12, minWidth: 42, textAlign: 'center', cursor: 'pointer' }}
              title="Klik untuk Reset Zoom (100%)"
            >
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4.0}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: zoomLevel >= 4.0 ? 'not-allowed' : 'pointer', opacity: zoomLevel >= 4.0 ? 0.4 : 1, display: 'flex', padding: 4 }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

            <button
              onClick={handleResetZoom}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', display: 'flex', padding: 4 }}
              title="Fit View / Reset"
            >
              <Maximize2 size={15} />
            </button>

            <button
              onClick={() => setShowGrid(v => !v)}
              style={{
                background: showGrid ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
                border: 'none', color: showGrid ? '#60a5fa' : '#f8fafc',
                cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6,
              }}
              title="Toggle Grid Architectural"
            >
              <Grid size={15} />
            </button>
          </div>

          {/* Mode Indicator Overlay */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '6px 14px', borderRadius: 20,
            fontSize: 11, fontWeight: 700, color: '#334155',
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: editMode ? '#2563eb' : '#059669' }} />
            {editMode
              ? 'Edit Mode: Klik / Geser Pin untuk Mengubah | Klik Kiri & Geser untuk Drag Canvas'
              : 'View Mode: Scroll / Touchpad Pinch Zoom | Klik Kiri & Geser (atau Tahan Spacebar) untuk Pan'}
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {dialog.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 460,
            background: '#ffffff', borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
                <MapPin size={18} color="#38bdf8" />
                {dialog.mode === 'add' ? 'Tambah Lokasi / Divisi Baru' : 'Edit Informasi Lokasi'}
              </div>
              <X size={18} onClick={() => setDialog({ open: false, mode: 'add' })} style={{ cursor: 'pointer', opacity: 0.8 }} />
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Category Selector Tiles */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  KATEGORI LOKASI / RUANGAN
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {CATEGORIES.map(cat => {
                    const isSelected = form.category === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          setForm(f => ({ ...f, category: cat.id, color: cat.color }));
                        }}
                        style={{
                          padding: '8px 10px', borderRadius: 10,
                          border: isSelected ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                          background: isSelected ? `${cat.color}10` : '#f8fafc',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? cat.color : '#334155' }}>
                          {cat.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  NAMA RUANG / DIVISI *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Meeting Room A, Toilet Pria, IT Department, Ruang Direktur"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  autoFocus
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                    fontWeight: 600, color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  WARNA PIN MARKER
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: c, cursor: 'pointer',
                        boxShadow: form.color === c ? `0 0 0 3px #ffffff, 0 0 0 5px ${c}` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  DESKRIPSI / CATATAN
                </label>
                <textarea
                  placeholder="Keterangan tambahan lokasi, kapasitas, atau penanggung jawab..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                    resize: 'none', color: '#0f172a',
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '12px 20px', background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {dialog.mode === 'edit' && dialog.marker ? (
                <Button
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => deleteMarker(dialog.marker!.id)}
                >
                  <Trash2 size={14} /> Hapus
                </Button>
              ) : <div />}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="outline"
                  onClick={() => setDialog({ open: false, mode: 'add' })}
                >
                  Batal
                </Button>
                <Button
                  onClick={saveMarker}
                >
                  Simpan Lokasi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0', margin: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', background: '#fef2f2', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{deleteConfirm.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                  {deleteConfirm.message}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(p => ({ ...p, open: false }))}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm.type === 'marker') {
                    deleteMarker(deleteConfirm.id!);
                  } else {
                    const m = markers.find(mark => mark.id === deleteConfirm.id);
                    if (m) {
                      const updated = { ...m, polygon: undefined };
                      setMarkers(prev => prev.map(item => item.id === m.id ? updated : item));
                      syncUpsertToSupabase(updated);
                    }
                    setDeleteConfirm(p => ({ ...p, open: false }));
                  }
                }}
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { OfficeLayoutManager };
export default OfficeLayoutManager;
