import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Clock, MapPin, Calendar, Sun, Moon, Coffee, AlertTriangle,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronDown, Download,
  Plus, Search, Filter, RefreshCw, Eye, Trash2, Edit3,
  Timer, Briefcase, Users, FileText, BarChart3, Settings,
  Navigation, Shield, X, Loader2, User, Building2, Sunrise, Sunset,
  LayoutDashboard, Wallet, Stethoscope, Gift, Receipt, Info, Check,
  ArrowUpDown, ExternalLink, RotateCcw, Map as MapIcon, MapPinOff, Locate, List, EyeOff, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as XLSX from 'xlsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from './StatCard';
import { UserAvatar } from './UserAvatar';
import HRModuleHeader from './hr/HRModuleHeader';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AttendanceSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  break_duration_minutes: number;
  is_active: boolean;
}

interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at?: string;
}

interface UserAccount {
  id: string;
  full_name: string;
  email?: string;
  username?: string;
  department?: string;
  company?: string;
  job_title?: string;
  groups?: string[];
  avatar_url?: string;
  status?: string;
  role?: string;
  supervisor_id?: string | null;
  manager_id?: string | null;
  vp_id?: string | null;
  attendance_supervisor_id?: string | null;
  attendance_hr_id?: string | null;
  attendance_manager_id?: string | null;
  attendance_vp_id?: string | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_in_location_id: string | null;
  clock_out_location_id: string | null;
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday' | 'half_day';
  total_work_minutes: number | null;
  total_overtime_minutes: number | null;
  notes: string | null;
  photo_url?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  user_name?: string;
  department?: string;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  attachments: string[];
  status: 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected' | 'cancelled';
  approval_status?: 'pending' | 'pending_level_2' | 'pending_level_3' | 'approved' | 'rejected';
  current_approval_level?: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  user_name?: string;
  department?: string;
  line1_approved_by?: string | null;
  line1_approved_at?: string | null;
  line2_approved_by?: string | null;
  line2_approved_at?: string | null;
  senior_approved_by?: string | null;
  senior_approved_at?: string | null;
  office_approved_by?: string | null;
  office_approved_at?: string | null;
}

interface OvertimeRequest {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  reason: string;
  project_or_task: string | null;
  status: 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected' | 'cancelled';
  approval_status?: 'pending' | 'pending_level_2' | 'pending_level_3' | 'approved' | 'rejected';
  current_approval_level?: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  user_name?: string;
  department?: string;
  line1_approved_by?: string | null;
  line1_approved_at?: string | null;
  line2_approved_by?: string | null;
  line2_approved_at?: string | null;
  senior_approved_by?: string | null;
  senior_approved_at?: string | null;
  office_approved_by?: string | null;
  office_approved_at?: string | null;
}

interface AttendanceSettings {
  id: string;
  default_schedule_id: string | null;
  work_days: number[];
  auto_approve_overtime: boolean;
  max_clock_in_distance_meters: number;
}

interface ReimbursementRequest {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  date: string | null;
  description: string;
  status: 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected' | 'paid';
  approval_status?: 'pending' | 'pending_level_2' | 'pending_level_3' | 'approved' | 'rejected';
  current_approval_level?: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  line1_approved_by?: string | null;
  line1_approved_at?: string | null;
  line2_approved_by?: string | null;
  line2_approved_at?: string | null;
  senior_approved_by?: string | null;
  senior_approved_at?: string | null;
  office_approved_by?: string | null;
  office_approved_at?: string | null;
}

type ViewTab = 'dashboard' | 'pengajuan' | 'locations' | 'reimbursement';
type DashboardSubTab = 'overview' | 'riwayat';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { id: 'annual', label: 'Cuti Tahunan', icon: '🏖️', badge: 'bg-blue-600/10 text-blue-600 border-blue-600/20', selected: 'border-blue-600 bg-blue-600/10 text-blue-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'sick', label: 'Sakit', icon: '🤒', badge: 'bg-red-600/10 text-red-600 border-red-600/20', selected: 'border-red-600 bg-red-600/10 text-red-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'personal', label: 'Izin Pribadi', icon: '📋', badge: 'bg-amber-600/10 text-amber-600 border-amber-600/20', selected: 'border-amber-600 bg-amber-600/10 text-amber-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'maternity', label: 'Cuti Melahirkan', icon: '👶', badge: 'bg-pink-600/10 text-pink-600 border-pink-600/20', selected: 'border-pink-600 bg-pink-600/10 text-pink-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'paternity', label: 'Cuti Ayah', icon: '👨‍🍼', badge: 'bg-violet-600/10 text-violet-600 border-violet-600/20', selected: 'border-violet-600 bg-violet-600/10 text-violet-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'unpaid', label: 'Cuti Tanpa Gaji', icon: '💰', badge: 'bg-slate-600/10 text-slate-600 border-slate-600/20', selected: 'border-slate-600 bg-slate-600/10 text-slate-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'other', label: 'Lainnya', icon: '📝', badge: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20', selected: 'border-emerald-600 bg-emerald-600/10 text-emerald-600 font-bold', textDefault: 'text-slate-600 font-medium' },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  present: { label: 'Hadir', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  late: { label: 'Terlambat', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  absent: { label: 'Tidak Hadir', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  leave: { label: 'Cuti/Izin', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  holiday: { label: 'Hari Libur', badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-500' },
  half_day: { label: 'Setengah Hari', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20', dot: 'bg-cyan-500' },
  pending: { label: 'Menunggu Supervisor', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  pending_line_1: { label: 'Menunggu Supervisor', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  pending_line_2: { label: 'Menunggu HR', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  pending_senior: { label: 'Menunggu Manager', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  pending_office: { label: 'Menunggu VP', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500' },
  approved: { label: 'Disetujui', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  rejected: { label: 'Ditolak', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  cancelled: { label: 'Dibatalkan', badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-500' },
  paid: { label: 'Dibayar', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
};

const GPS_DOT: Record<string, string> = {
  inside: 'bg-emerald-500 shadow-[0_0_6px_#10b981]',
  outside: 'bg-red-500 shadow-[0_0_6px_#ef4444]',
  checking: 'bg-slate-400 shadow-[0_0_6px_#94a3b8]',
  unknown: 'bg-slate-400 shadow-[0_0_6px_#94a3b8]',
};

const GPS_BG: Record<string, string> = {
  inside: 'bg-emerald-500/10 border border-emerald-500/20',
  outside: 'bg-red-500/10 border border-red-500/20',
  checking: 'bg-slate-400/10 border border-slate-400/20',
  unknown: 'bg-slate-400/10 border border-slate-400/20',
};

const isPendingApprovalStatus = (st: string) => ['pending', 'pending_line_1', 'pending_line_2', 'pending_senior', 'pending_office'].includes(st);

// Menyusun langkah log approval dari kolom history per level (dengan fallback approved_by)
const buildApprovalSteps = (req: any): { label: string; by: string | null | undefined; at: string | null | undefined }[] => {
  const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
  if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
  if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
  if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
  if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
  if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
  return steps;
};

const REIMBURSEMENT_TYPES = [
  { id: 'medical_glasses', label: 'Kacamata / Lensa', icon: <Stethoscope size={16} />, color: 'text-rose-600 bg-rose-500/10 border-rose-500/20', selectedBorder: 'border-rose-500', selectedBg: 'bg-rose-500/10' },
  { id: 'medical_doctor', label: 'Konsultasi Dokter', icon: <Gift size={16} />, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', selectedBorder: 'border-blue-500', selectedBg: 'bg-blue-500/10' },
  { id: 'medical_medicine', label: 'Obat / Resep', icon: <Receipt size={16} />, color: 'text-violet-600 bg-violet-500/10 border-violet-500/20', selectedBorder: 'border-violet-500', selectedBg: 'bg-violet-500/10' },
  { id: 'medical_dental', label: 'Perawatan Gigi', icon: <Receipt size={16} />, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', selectedBorder: 'border-amber-500', selectedBg: 'bg-amber-500/10' },
  { id: 'medical_other', label: 'Medis Lainnya', icon: <Receipt size={16} />, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', selectedBorder: 'border-emerald-500', selectedBg: 'bg-emerald-500/10' },
];

const getReimbType = (cat: string) =>
  REIMBURSEMENT_TYPES.find(t => t.id === cat) ||
  REIMBURSEMENT_TYPES.find(t => t.id === cat.replace(/^medical_/, '')) || {
    id: cat,
    label: cat.replace(/^medical_/, '').replace(/\b\w/g, c => c.toUpperCase()),
    icon: <Receipt size={16} />,
    color: 'text-slate-600 bg-slate-500/10 border-slate-500/20',
    selectedBorder: 'border-slate-500',
    selectedBg: 'bg-slate-500/10',
  };

// ─── Utility Functions ───────────────────────────────────────────────────────

const formatTime = (iso: string | null): string => {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatMinutes = (mins: number | null): string => {
  if (!mins) return '-';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
};

const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getGeoLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

// ─── Status Badge Helper ─────────────────────────────────────────────────────

const renderStatusBadge = (status: string, size: 'sm' | 'md' = 'sm') => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-wide whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        config.badge
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </Badge>
  );
};

// ─── Clock In/Out Panel ──────────────────────────────────────────────────────

const ClockPanel: React.FC<{
  userId: string;
  todayRecord: AttendanceRecord | null;
  schedule: AttendanceSchedule | null;
  locations: OfficeLocation[];
  onClockAction: () => void;
}> = ({ userId, todayRecord, schedule, locations, onClockAction }) => {
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'checking' | 'inside' | 'outside' | 'unknown'>('checking');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestLocation, setNearestLocation] = useState<{ name: string; distance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkLocation = async () => {
      try {
        setLocationStatus('checking');
        const pos = await getGeoLocation();
        setCurrentLocation(pos);

        if (locations.length > 0) {
          let minDist = Infinity;
          let nearest: OfficeLocation | null = null;
          for (const loc of locations) {
            if (!loc.is_active) continue;
            const dist = getDistanceMeters(pos.lat, pos.lng, loc.latitude, loc.longitude);
            if (dist < minDist) { minDist = dist; nearest = loc; }
          }
          if (nearest) {
            setNearestLocation({ name: nearest.name, distance: Math.round(minDist) });
            setLocationStatus(minDist <= nearest.radius_meters ? 'inside' : 'outside');
          } else {
            setLocationStatus('unknown');
          }
        } else {
          setLocationStatus('unknown');
        }
      } catch {
        setLocationStatus('unknown');
      }
    };
    checkLocation();
    const timer = setInterval(checkLocation, 30000);
    return () => clearInterval(timer);
  }, [locations]);

  const isClockedIn = !!todayRecord?.clock_in;
  const isClockedOut = !!todayRecord?.clock_out;
  const scheduleStart = schedule?.start_time || '08:00';
  const [sh, sm] = scheduleStart.split(':').map(Number);
  const scheduleMinutes = sh * 60 + sm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isLate = nowMinutes > scheduleMinutes + (schedule?.grace_period_minutes || 15);

  const handleClock = async (type: 'in' | 'out') => {
    setLoading(true);
    setError(null);
    try {
      const pos = currentLocation || await getGeoLocation();
      const today = now.toISOString().split('T')[0];

      if (type === 'in') {
        if (locations.length > 0 && locationStatus === 'outside') {
          // Allow but mark as outside
        }
        const { error: upsertError } = await supabase.from('attendance_records').upsert({
          user_id: userId,
          date: today,
          clock_in: now.toISOString(),
          clock_in_lat: pos.lat,
          clock_in_lng: pos.lng,
          status: isLate ? 'late' : 'present',
        }, { onConflict: 'user_id,date' });
        if (upsertError) throw upsertError;
      } else {
        const { error: updateError } = await supabase.from('attendance_records').update({
          clock_out: now.toISOString(),
          clock_out_lat: pos.lat,
          clock_out_lng: pos.lng,
        }).eq('user_id', userId).eq('date', today);
        if (updateError) throw updateError;
      }
      onClockAction();
    } catch (err: any) {
      setError(err.message || 'Gagal melakukan absensi');
    } finally {
      setLoading(false);
    }
  };

  const clockTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const gpsColor = locationStatus === 'inside' ? 'text-emerald-400' : locationStatus === 'outside' ? 'text-red-400' : 'text-slate-400';
  const gpsDotColor = locationStatus === 'inside' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : locationStatus === 'outside' ? 'bg-red-400 shadow-[0_0_6px_#ef4444]' : 'bg-slate-400';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Navy Gradient Header with Clock */}
      <div className="relative bg-gradient-to-br from-[#103065] to-[#173E77] px-6 pt-7 pb-20 text-center text-white">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">Jam Absensi</div>
        <div className="text-[52px] font-light leading-none tracking-tight tabular-nums">
          {clockTime}
        </div>
        <div className="mt-2 text-[13px] text-white/60">{dateStr}</div>
        {/* Schedule badge */}
        {schedule && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/70">
            <Clock size={11} /> {schedule.start_time} — {schedule.end_time} · Grace {schedule.grace_period_minutes}m
          </div>
        )}
      </div>

      {/* Floating clock button + status card */}
      <div className="relative -mt-14 px-5">
        {/* GPS pill */}
        <div className={cn('mx-auto mb-4 flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-medium', GPS_BG[locationStatus], locationStatus === 'inside' ? 'text-emerald-600' : locationStatus === 'outside' ? 'text-red-600' : 'text-slate-500')}>
          <span className={cn('h-2 w-2 rounded-full', gpsDotColor)} />
          {locationStatus === 'checking' && 'Memeriksa lokasi...'}
          {locationStatus === 'inside' && `Di dalam area${nearestLocation ? ` — ${nearestLocation.name}` : ''}`}
          {locationStatus === 'outside' && `Di luar area${nearestLocation ? ` — ${nearestLocation.name} (${nearestLocation.distance}m)` : ''}`}
          {locationStatus === 'unknown' && 'Lokasi tidak diketahui'}
        </div>

        {/* Clock action button */}
        <div className="flex justify-center">
          {!isClockedIn ? (
            <button
              onClick={() => handleClock('in')}
              disabled={loading}
              className="group relative flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#BC9C33] to-[#a88929] text-white shadow-lg shadow-amber-600/30 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={36} className="animate-spin" />
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Sunrise size={32} strokeWidth={1.5} />
                </>
              )}
            </button>
          ) : !isClockedOut ? (
            <button
              onClick={() => handleClock('out')}
              disabled={loading}
              className="group relative flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#103065] to-[#173E77] text-white shadow-lg shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={36} className="animate-spin" />
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Sunset size={32} strokeWidth={1.5} />
                </>
              )}
            </button>
          ) : (
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-white bg-emerald-50">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
          )}
        </div>

        {/* Label under button */}
        <div className="mt-3 text-center">
          <div className="text-[15px] font-semibold text-slate-800">
            {isClockedIn && !isClockedOut ? 'Clock Out' : isClockedIn && isClockedOut ? 'Absensi Selesai' : 'Clock In'}
          </div>
          {todayRecord && (
            <div className="mt-1 text-[12px] text-slate-400">
              {isClockedIn && !isClockedOut ? `Mulai pukul ${formatTime(todayRecord.clock_in)}` : isClockedIn && isClockedOut ? 'Selamat beristirahat' : 'Siap untuk memulai hari'}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-center text-[13px] text-red-600">
            {error}
          </div>
        )}

        {/* Today Summary Cards */}
        {todayRecord && (
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { label: 'Clock In', value: formatTime(todayRecord.clock_in), icon: <Sunrise size={13} className="text-emerald-500" /> },
              { label: 'Clock Out', value: formatTime(todayRecord.clock_out), icon: <Sunset size={13} className="text-blue-500" /> },
              { label: 'Durasi', value: formatMinutes(todayRecord.total_work_minutes), icon: <Timer size={13} className="text-amber-500" /> },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <div className="mb-1.5 flex justify-center">{item.icon}</div>
                <div className="text-[15px] font-bold tabular-nums text-slate-800">{item.value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Approval Section ────────────────────────────────────────────────────────

// ─── Office Locations Manager ────────────────────────────────────────────────

const MapPicker: React.FC<{
  lat: string;
  lng: string;
  radius: string;
  onPick: (lat: number, lng: number) => void;
}> = ({ lat, lng, radius, onPick }) => {
  const center: [number, number] = [Number(lat) || -6.22, Number(lng) || 106.84];
  const ClickHandler = () => {
    useMapEvents({
      click: (event) => onPick(event.latlng.lat, event.latlng.lng)
    });
    return null;
  };
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 dark:border-zinc-800">
      <MapContainer center={center} zoom={16} style={{ height: 260, width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler />
        <Marker position={center} />
        <Circle
          center={center}
          radius={Number(radius) || 50}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.18 }}
        />
      </MapContainer>
      <div className="bg-muted/40 dark:bg-zinc-900/60 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/40">
        <span>Klik peta untuk menentukan titik koordinat kantor. Lingkaran menunjukkan radius geofence.</span>
        <span className="font-mono font-semibold text-primary">{Number(radius) || 50}m</span>
      </div>
    </div>
  );
};

const OfficeLocationsManager: React.FC<{
  locations: OfficeLocation[];
  setLocations: React.Dispatch<React.SetStateAction<OfficeLocation[]>>;
  onRefresh?: () => void;
  loading?: boolean;
}> = ({ locations, setLocations, onRefresh, loading }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [radiusFilter, setRadiusFilter] = useState<'all' | '50' | '100' | 'more'>('all');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OfficeLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('-6.225018');
  const [longitude, setLongitude] = useState('106.833600');
  const [radius, setRadius] = useState('50');
  const [isActive, setIsActive] = useState(true);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setAddress('');
    setLatitude('-6.225018');
    setLongitude('106.833600');
    setRadius('50');
    setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (loc: OfficeLocation) => {
    setEditing(loc);
    setName(loc.name);
    setAddress(loc.address);
    setLatitude(String(loc.latitude));
    setLongitude(String(loc.longitude));
    setRadius(String(loc.radius_meters));
    setIsActive(loc.is_active);
    setShowForm(true);
  };

  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung pendeteksi geolokasi');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success('Koordinat GPS saat ini berhasil diterapkan');
      },
      (err) => {
        toast.error('Gagal mengambil koordinat: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        const { data, error } = await supabase.from('office_locations').select('*').order('name');
        if (!error && data) setLocations(data);
      }
      toast.success('Data titik kantor berhasil diperbarui');
    } catch (err: any) {
      toast.error('Gagal memuat ulang: ' + (err.message || 'Error'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const lat = parseFloat(latitude.replace(',', '.'));
      const lng = parseFloat(longitude.replace(',', '.'));
      const radiusM = parseInt(radius, 10);
      if (!name.trim() || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radiusM) || radiusM <= 0) {
        toast.error('Isi semua data dengan benar (radius harus angka > 0)');
        setSaving(false);
        return;
      }
      const payload = {
        name: name.trim(),
        address: address.trim() || name.trim(),
        latitude: lat,
        longitude: lng,
        radius_meters: radiusM,
        is_active: isActive,
      };
      if (editing) {
        const { data: before, error: beforeError } = await supabase
          .from('office_locations')
          .select('id, radius_meters')
          .eq('id', editing.id)
          .maybeSingle();
        if (beforeError) throw beforeError;
        if (!before) throw new Error('Lokasi tidak ditemukan atau tidak bisa dibaca.');

        const { error } = await supabase
          .from('office_locations')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;

        const { data: saved, error: verifyError } = await supabase
          .from('office_locations')
          .select('id, name, address, latitude, longitude, radius_meters, is_active')
          .eq('id', editing.id)
          .maybeSingle();
        if (verifyError) throw verifyError;
        if (!saved) throw new Error('Update ditolak RLS: data tidak terlihat setelah disimpan.');

        setLocations(prev => prev.map(l => (l.id === editing.id ? { ...l, ...saved } as OfficeLocation : l)));
        toast.success(`Lokasi "${saved.name}" berhasil diperbarui`);
      } else {
        const { data, error } = await supabase.from('office_locations').insert([payload]).select().single();
        if (error) throw error;
        if (data) {
          setLocations(prev => [...prev, data as OfficeLocation]);
          toast.success(`Lokasi "${data.name}" berhasil ditambahkan`);
        }
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast.error('Gagal simpan lokasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('office_locations').delete().eq('id', deleteId);
      if (error) throw error;
      setLocations(prev => prev.filter(l => l.id !== deleteId));
      toast.success('Lokasi kantor berhasil dihapus');
      setDeleteId(null);
    } catch (err: any) {
      toast.error('Gagal hapus lokasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteLoc = locations.find(l => l.id === deleteId) || null;

  // Stats calculation
  const stats = useMemo(() => {
    const total = locations.length;
    const activeCount = locations.filter(l => l.is_active).length;
    const inactiveCount = locations.filter(l => !l.is_active).length;
    const avgRadius = total > 0 ? Math.round(locations.reduce((acc, l) => acc + (Number(l.radius_meters) || 0), 0) / total) : 0;
    return { total, activeCount, inactiveCount, avgRadius };
  }, [locations]);

  // Filtering
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (loc.name || '').toLowerCase().includes(q);
        const matchAddr = (loc.address || '').toLowerCase().includes(q);
        if (!matchName && !matchAddr) return false;
      }
      if (statusFilter === 'active' && !loc.is_active) return false;
      if (statusFilter === 'inactive' && loc.is_active) return false;
      if (radiusFilter === '50' && loc.radius_meters > 50) return false;
      if (radiusFilter === '100' && (loc.radius_meters <= 50 || loc.radius_meters > 100)) return false;
      if (radiusFilter === 'more' && loc.radius_meters <= 100) return false;
      return true;
    });
  }, [locations, searchQuery, statusFilter, radiusFilter]);

  const defaultMapCenter: [number, number] = useMemo(() => {
    const first = locations.find(l => l.is_active && !Number.isNaN(Number(l.latitude)));
    if (first) return [Number(first.latitude), Number(first.longitude)];
    return [-6.225018, 106.833600];
  }, [locations]);

  const hasFilter = searchQuery.trim() !== '' || statusFilter !== 'all' || radiusFilter !== 'all';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Standard PageHeader */}
      <PageHeader
        title="Office Radius"
        description="Kelola titik koordinat kantor, geofence radius, dan validasi lokasi presensi mobile karyawan."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
          >
            <RefreshCw size={14} className={cn((refreshing || loading) && 'animate-spin text-primary dark:text-blue-400')} />
            <span>Muat Ulang</span>
          </Button>
          <Button
            size="sm"
            onClick={openAdd}
            className="gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 shadow-2xs text-xs font-semibold"
          >
            <Plus size={14} />
            <span>Tambah Lokasi</span>
          </Button>
        </div>
      </PageHeader>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-fit mb-6">
        <TabsList>
          <TabsTrigger value="list">
            <Building2 size={14} className="mr-1.5" />
            <span>Daftar Lokasi</span>
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px] font-bold">
              {locations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapIcon size={14} className="mr-1.5" />
            <span>Peta Sebaran GPS</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* StatCards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Titik Kantor"
          value={stats.total}
          subValue="Lokasi terdaftar"
          icon={Building2}
          color="slate"
        />
        <StatCard
          label="Lokasi Aktif"
          value={stats.activeCount}
          subValue="Siap presensi mobile"
          icon={CheckCircle2}
          color="emerald"
          status="on-track"
        />
        <StatCard
          label="Rata-rata Radius"
          value={`${stats.avgRadius}m`}
          subValue="Toleransi geofence"
          icon={Navigation}
          color="blue"
        />
        <StatCard
          label="Lokasi Nonaktif"
          value={stats.inactiveCount}
          subValue={stats.inactiveCount > 0 ? "Presensi dinonaktifkan" : "Semua kantor aktif"}
          icon={AlertTriangle}
          color={stats.inactiveCount > 0 ? "amber" : "slate"}
          status={stats.inactiveCount > 0 ? "at-risk" : undefined}
        />
      </div>

      {/* Filter Toolbar Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Filter size={16} className="text-primary" />
              Filter &amp; Pencarian Lokasi
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Menampilkan {filteredLocations.length} dari total {locations.length} titik kantor
            </p>
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRadiusFilter('all');
              }}
              className="h-8 px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <RotateCcw size={13} className="mr-1" /> Reset Filter
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cari Lokasi / Alamat</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama kantor atau alamat..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status Kantor</Label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all">Semua Status ({locations.length})</option>
                <option value="active">Aktif Saja ({stats.activeCount})</option>
                <option value="inactive">Nonaktif Saja ({stats.inactiveCount})</option>
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Jangkauan Radius</Label>
              <select
                value={radiusFilter}
                onChange={e => setRadiusFilter(e.target.value as any)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all">Semua Radius</option>
                <option value="50">&le; 50 meter</option>
                <option value="100">51 - 100 meter</option>
                <option value="more">&gt; 100 meter</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content: List View */}
      {activeTab === 'list' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                Daftar Titik Koordinat Kantor
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                {filteredLocations.length} titik kantor terdaftar &bull; Siap validasi absensi mobile
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { id: 'all', label: 'Semua', count: locations.length },
                { id: 'active', label: 'Aktif', count: stats.activeCount },
                { id: 'inactive', label: 'Nonaktif', count: stats.inactiveCount },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    statusFilter === f.id
                      ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                      : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                  )}
                >
                  {f.label}
                  <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLocations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <MapPinOff size={36} className="opacity-30" />
                <p className="text-sm font-semibold text-foreground">Tidak ada lokasi kantor yang sesuai</p>
                <p className="text-xs text-muted-foreground">Coba ubah kata kunci pencarian atau reset filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[340px]">Lokasi Kantor &amp; Alamat</TableHead>
                      <TableHead>Koordinat GPS</TableHead>
                      <TableHead>Radius Geofence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map(loc => (
                      <TableRow key={loc.id} className="hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors">
                        <TableCell className="py-3.5">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                              loc.is_active
                                ? 'bg-primary/10 text-primary dark:bg-blue-500/15 dark:text-blue-400'
                                : 'bg-muted text-muted-foreground'
                            )}>
                              <MapPin size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground leading-snug">{loc.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[320px] mt-0.5" title={loc.address}>
                                {loc.address}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs text-foreground/80 tabular-nums">
                            {Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary dark:text-blue-400 hover:underline mt-0.5"
                          >
                            <span>Buka Google Maps</span>
                            <ExternalLink size={10} />
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="font-mono text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5">
                              {loc.radius_meters}m
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Area presensi mobile</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[11px] font-semibold gap-1.5 px-2 py-0.5',
                              loc.is_active
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-border/60 bg-muted/40 text-muted-foreground'
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', loc.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50')} />
                            {loc.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(loc)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Lokasi"
                            >
                              <Edit3 size={14} className="mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(loc.id)}
                              className="h-8 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Hapus Lokasi"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content: Map View */}
      {activeTab === 'map' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapIcon size={16} className="text-primary" />
                Peta Distribusi Geofence Kantor
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                Menampilkan {filteredLocations.length} titik koordinat dan perimeter radius presensi karyawan
              </p>
            </div>
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary dark:text-blue-400 font-mono text-xs">
              {filteredLocations.length} Titik
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 500, width: '100%' }}>
              <MapContainer center={defaultMapCenter} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredLocations.map(loc => (
                  <React.Fragment key={loc.id}>
                    <Marker position={[Number(loc.latitude), Number(loc.longitude)]}>
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <div className="font-bold text-xs text-slate-900">{loc.name}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{loc.address}</div>
                          <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-blue-600">Radius: {loc.radius_meters}m</span>
                            <span className={loc.is_active ? 'text-emerald-600 font-bold' : 'text-slate-400 font-bold'}>
                              {loc.is_active ? '● Aktif' : '○ Nonaktif'}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={[Number(loc.latitude), Number(loc.longitude)]}
                      radius={Number(loc.radius_meters) || 50}
                      pathOptions={{
                        color: loc.is_active ? '#10b981' : '#94a3b8',
                        fillColor: loc.is_active ? '#10b981' : '#94a3b8',
                        fillOpacity: 0.16
                      }}
                    />
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/40 px-6 py-4 bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <MapPin size={18} className="text-primary dark:text-blue-400" />
              {editing ? 'Edit Lokasi Kantor' : 'Tambah Lokasi Kantor'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Atur titik koordinat &amp; radius geofence untuk validasi absen karyawan dari aplikasi mobile.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 max-h-[75vh]">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Titik di Peta</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetCurrentPosition}
                className="h-7 px-2 text-[11px] gap-1 font-semibold border-border/60 hover:bg-muted"
              >
                <Locate size={12} className="text-primary" />
                <span>Ambil GPS Sekarang</span>
              </Button>
            </div>

            <MapPicker
              lat={latitude}
              lng={longitude}
              radius={radius}
              onPick={(lat, lng) => {
                setLatitude(lat.toFixed(6));
                setLongitude(lng.toFixed(6));
              }}
            />

            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nama Lokasi / Kantor</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Kantor Pusat (Trinity Tower) / Gudang Pulogadung"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Alamat Lengkap</Label>
              <Textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Jl. H. R. Rasuna Said Kav. C22, Kuningan, Jakarta Selatan"
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Latitude</Label>
                <Input
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  placeholder="-6.225018"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Longitude</Label>
                <Input
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  placeholder="106.833600"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Radius Geofence (Meter)</Label>
                <div className="flex items-center gap-1">
                  {[25, 50, 100, 200].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadius(String(preset))}
                      className={cn(
                        'px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors',
                        radius === String(preset)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>
              <Input
                type="number"
                value={radius}
                onChange={e => setRadius(e.target.value)}
                placeholder="50"
                min={10}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status Lokasi</Label>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-xs font-semibold transition-all',
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-border'
                )}
              >
                <span>{isActive ? 'Aktif (Karyawan dapat absen di lokasi ini)' : 'Nonaktif (Presensi di lokasi ini ditutup)'}</span>
                <span className={cn(
                  'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                  isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}>
                  <span className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                    isActive ? 'left-[18px]' : 'left-0.5'
                  )} />
                </span>
              </button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                Karyawan dianggap berada di area kantor jika jarak GPS perangkatnya &le; radius dari titik koordinat ini. Digunakan langsung oleh PWA Absensi Mobile.
              </span>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-4 bg-muted/20">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={saving} className="h-8 text-xs font-semibold">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 text-xs font-semibold"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {editing ? 'Simpan Perubahan' : 'Simpan Lokasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 size={18} /> Hapus Lokasi Kantor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {deleteLoc && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-foreground">{deleteLoc.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground font-mono mt-0.5">
                    {Number(deleteLoc.latitude).toFixed(6)}, {Number(deleteLoc.longitude).toFixed(6)} &bull; {deleteLoc.radius_meters}m
                  </div>
                </div>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Yakin ingin menghapus titik lokasi ini? Karyawan tidak akan dapat melakukan presensi dari lokasi ini setelah dihapus.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} disabled={saving} className="h-8 text-xs font-semibold">
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving} className="h-8 gap-1.5 text-xs font-semibold">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const CompanyCalendarManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
  const [rows, setRows] = useState<any[]>([]);
  const [officialRows, setOfficialRows] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('collective_leave');
  const [deduct, setDeduct] = useState(true);
  const [editingHoliday, setEditingHoliday] = useState<any | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Table filter states
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'national' | 'collective_leave' | 'company' | 'working_day'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('company_holidays').select('*').order('holiday_date');
      setRows(data || []);
      const year = selectedYear;
      const response = await fetch(`https://tanggalmerah.upset.dev/api/holidays?year=${encodeURIComponent(year)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error(`holiday API ${response.status}`);
      const payload = await response.json();
      const sourceRows = Array.isArray(payload) ? payload : payload?.data || payload?.holidays || [];
      const normalized = sourceRows.map((row: any) => ({
        holiday_date: String(row.date || row.tanggal || row.holiday_date || '').slice(0, 10),
        name: row.name || row.nama || row.holiday || row.description || 'Hari Libur',
        holiday_type: /cuti bersama/i.test(String(row.name || row.nama || row.holiday || row.description || '')) || String(row.type || '').toLowerCase() === 'leave' ? 'collective_leave' : 'national',
        source: 'api',
        is_active: true,
      })).filter((row: any) => /^\d{4}-\d{2}-\d{2}$/.test(row.holiday_date) && row.holiday_date.startsWith(String(year)));
      if (!normalized.length) throw new Error('holiday API returned no valid rows');
      setOfficialRows(normalized);
    } catch (error) {
      console.warn('Official holiday API unavailable, using SKB fallback:', error);
      const skb: Record<number, any[]> = {
        2025: [
          ['01-01', 'Tahun Baru 2025 Masehi', 'national'],
          ['01-27', 'Isra Mikraj Nabi Muhammad SAW', 'national'],
          ['01-28', 'Cuti Bersama Tahun Baru Imlek', 'collective_leave'],
          ['01-29', 'Tahun Baru Imlek 2576 Kongzili', 'national'],
          ['03-28', 'Cuti Bersama Hari Suci Nyepi', 'collective_leave'],
          ['03-29', 'Hari Suci Nyepi', 'national'],
          ['03-31', 'Idulfitri 1446 Hijriah', 'national'],
          ['04-01', 'Idulfitri 1446 Hijriah', 'national'],
          ['04-02', 'Cuti Bersama Idulfitri', 'collective_leave'],
          ['04-03', 'Cuti Bersama Idulfitri', 'collective_leave'],
          ['04-04', 'Cuti Bersama Idulfitri', 'collective_leave'],
          ['04-07', 'Cuti Bersama Idulfitri', 'collective_leave'],
          ['04-18', 'Wafat Yesus Kristus', 'national'],
          ['04-20', 'Kebangkitan Yesus Kristus (Paskah)', 'national'],
          ['05-01', 'Hari Buruh Internasional', 'national'],
          ['05-12', 'Hari Raya Waisak 2569 BE', 'national'],
          ['05-13', 'Cuti Bersama Hari Raya Waisak', 'collective_leave'],
          ['05-29', 'Kenaikan Yesus Kristus', 'national'],
          ['05-30', 'Cuti Bersama Kenaikan Yesus Kristus', 'collective_leave'],
          ['06-01', 'Hari Lahir Pancasila', 'national'],
          ['06-06', 'Iduladha 1446 Hijriah', 'national'],
          ['06-09', 'Cuti Bersama Iduladha', 'collective_leave'],
          ['06-27', '1 Muharam 1447 Hijriah', 'national'],
          ['08-17', 'Proklamasi Kemerdekaan RI', 'national'],
          ['09-05', 'Maulid Nabi Muhammad SAW', 'national'],
          ['12-25', 'Kelahiran Yesus Kristus (Natal)', 'national'],
          ['12-26', 'Cuti Bersama Natal', 'collective_leave']
        ],
        2026: [
          ['01-01', 'Tahun Baru 2026', 'national'], ['01-16', 'Isra Mikraj Nabi Muhammad SAW', 'national'], ['02-16', 'Cuti Bersama Tahun Baru Imlek', 'collective_leave'], ['02-17', 'Tahun Baru Imlek 2577', 'national'], ['03-18', 'Cuti Bersama Nyepi', 'collective_leave'], ['03-19', 'Hari Suci Nyepi', 'national'], ['03-20', 'Cuti Bersama Idulfitri', 'collective_leave'], ['03-21', 'Idulfitri 1447 H', 'national'], ['03-22', 'Idulfitri 1447 H', 'national'], ['03-23', 'Cuti Bersama Idulfitri', 'collective_leave'], ['03-24', 'Cuti Bersama Idulfitri', 'collective_leave'], ['04-03', 'Wafat Yesus Kristus', 'national'], ['04-05', 'Paskah', 'national'], ['05-01', 'Hari Buruh Internasional', 'national'], ['05-14', 'Kenaikan Yesus Kristus', 'national'], ['05-15', 'Cuti Bersama Kenaikan Yesus Kristus', 'collective_leave'], ['05-27', 'Iduladha 1447 H', 'national'], ['05-28', 'Cuti Bersama Iduladha', 'collective_leave'], ['05-31', 'Waisak 2570 BE', 'national'], ['06-01', 'Hari Lahir Pancasila', 'national'], ['06-16', '1 Muharam 1448 H', 'national'], ['08-17', 'Proklamasi Kemerdekaan RI', 'national'], ['08-25', 'Maulid Nabi Muhammad SAW', 'national'], ['12-24', 'Cuti Bersama Natal', 'collective_leave'], ['12-25', 'Kelahiran Yesus Kristus', 'national']
        ],
        2027: [
          ['01-01', 'Tahun Baru 2027', 'national'], ['02-05', 'Cuti Bersama Imlek', 'collective_leave'], ['02-06', 'Tahun Baru Imlek', 'national'], ['03-09', 'Cuti Bersama Idulfitri', 'collective_leave'], ['03-10', 'Idulfitri 1448 H', 'national'], ['03-11', 'Idulfitri 1448 H', 'national'], ['03-12', 'Cuti Bersama Idulfitri', 'collective_leave'], ['03-15', 'Cuti Bersama Idulfitri', 'collective_leave'], ['03-25', 'Cuti Bersama Wafat Yesus Kristus', 'collective_leave'], ['03-26', 'Wafat Yesus Kristus', 'national'], ['05-01', 'Hari Buruh Internasional', 'national'], ['05-06', 'Kenaikan Yesus Kristus', 'national'], ['05-17', 'Iduladha 1448 H', 'national'], ['05-18', 'Cuti Bersama Iduladha', 'collective_leave'], ['05-19', 'Cuti Bersama Waisak', 'collective_leave'], ['05-20', 'Waisak 2571 BE', 'national'], ['06-01', 'Hari Lahir Pancasila', 'national'], ['08-17', 'Proklamasi Kemerdekaan RI', 'national'], ['12-24', 'Cuti Bersama Natal', 'collective_leave'], ['12-25', 'Kelahiran Yesus Kristus', 'national']
        ]
      };
      setOfficialRows(Object.entries(skb).flatMap(([yr, items]) => items.map(([d, n, ht]) => ({ holiday_date: `${yr}-${d}`, name: n, holiday_type: ht, source: 'skb', is_active: true, isOfficial: true }))));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedYear]);

  // Merged rows: official SKB rows overridden by company_holidays custom rows
  const mergedRows = useMemo(() => {
    const map = new Map<string, any>();
    officialRows.forEach(r => map.set(r.holiday_date, { ...r, isOfficial: true }));
    rows.forEach(r => {
      const existing = map.get(r.holiday_date);
      map.set(r.holiday_date, {
        ...r,
        isOfficial: Boolean(existing?.isOfficial),
        originalOfficialName: existing?.name
      });
    });
    return Array.from(map.values()).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [rows, officialRows]);

  // Current month's holidays
  const monthRows = useMemo(() => {
    return mergedRows.filter((row) => {
      const d = new Date(`${row.holiday_date}T00:00:00`);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [mergedRows, selectedYear, selectedMonth]);

  // Stats calculation
  const stats = useMemo(() => {
    const currentYearRows = mergedRows.filter(r => r.holiday_date.startsWith(String(selectedYear)));
    const total = currentYearRows.filter(r => r.is_active !== false).length;
    const nationalCount = currentYearRows.filter(r => r.holiday_type === 'national' && r.is_active !== false).length;
    const collectiveCount = currentYearRows.filter(r => r.holiday_type === 'collective_leave' && r.is_active !== false).length;
    const totalCollective = currentYearRows.filter(r => r.holiday_type === 'collective_leave').length;
    const inactiveCollectiveCount = currentYearRows.filter(r => r.holiday_type === 'collective_leave' && r.is_active === false).length;
    const monthActiveCount = monthRows.filter(r => r.is_active !== false).length;
    return { total, nationalCount, collectiveCount, totalCollective, inactiveCollectiveCount, monthActiveCount };
  }, [mergedRows, monthRows, selectedYear]);

  // Filtered table rows with search, category, and status filter
  const filteredTableRows = useMemo(() => {
    return mergedRows.filter(r => {
      if (!r.holiday_date.startsWith(String(selectedYear))) return false;
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase().trim();
        if (!r.name.toLowerCase().includes(q) && !r.holiday_date.includes(q)) return false;
      }
      if (typeFilter !== 'all' && r.holiday_type !== typeFilter) return false;
      if (statusFilter === 'active' && r.is_active === false) return false;
      if (statusFilter === 'inactive' && r.is_active !== false) return false;
      return true;
    });
  }, [mergedRows, selectedYear, searchTableQuery, typeFilter, statusFilter]);

  const save = async () => {
    if (!date || !name.trim()) {
      toast.error('Pilih tanggal dan isi nama hari libur');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        holiday_date: date,
        name: name.trim(),
        holiday_type: type,
        deduct_annual_leave: (type === 'collective_leave' || type === 'company') && deduct,
        source: editingHoliday?.source || 'company_policy',
        is_active: true,
        updated_at: new Date().toISOString()
      };
      let res;
      if (editingHoliday?.id) {
        res = await supabase.from('company_holidays').update(payload).eq('id', editingHoliday.id);
      } else {
        res = await supabase.from('company_holidays').upsert(payload, { onConflict: 'holiday_date,name' });
      }
      if (res.error) throw res.error;
      toast.success(editingHoliday ? 'Perubahan hari libur berhasil disimpan' : 'Hari libur berhasil ditambahkan');
      setDate('');
      setName('');
      setType('collective_leave');
      setDeduct(true);
      setEditingHoliday(null);
      await load();
    } catch (err: any) {
      toast.error('Gagal menyimpan hari libur: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: any) => {
    try {
      const nextActive = row.is_active === false;
      const payload = {
        holiday_date: row.holiday_date,
        name: row.name,
        holiday_type: row.holiday_type,
        deduct_annual_leave: Boolean(row.deduct_annual_leave),
        source: row.source || 'company_policy',
        is_active: nextActive,
        updated_at: new Date().toISOString()
      };
      if (row.id) {
        const { error } = await supabase.from('company_holidays').update({ is_active: nextActive, updated_at: new Date().toISOString() }).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_holidays').upsert(payload, { onConflict: 'holiday_date,name' });
        if (error) throw error;
      }
      toast.success(
        nextActive
          ? `Hari libur "${row.name}" diaktifkan kembali untuk perusahaan`
          : `Hari libur "${row.name}" dinonaktifkan / dikecualikan dari kalender kerja`
      );
      if (editingHoliday?.holiday_date === row.holiday_date) {
        setEditingHoliday({ ...editingHoliday, is_active: nextActive });
      }
      await load();
    } catch (err: any) {
      toast.error('Gagal memperbarui status: ' + (err.message || 'Error'));
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      const isOfficial = deleteTarget.isOfficial || officialRows.some(o => o.holiday_date === deleteTarget.holiday_date);
      if (isOfficial) {
        // Mark as excluded/inactive in company_holidays so it won't count as a working holiday
        const payload = {
          holiday_date: deleteTarget.holiday_date,
          name: deleteTarget.name,
          holiday_type: deleteTarget.holiday_type,
          deduct_annual_leave: Boolean(deleteTarget.deduct_annual_leave),
          source: deleteTarget.source || 'company_policy',
          is_active: false,
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('company_holidays').upsert(payload, { onConflict: 'holiday_date,name' });
        if (error) throw error;
        toast.success(`Cuti bersama / hari libur "${deleteTarget.name}" berhasil dihapus dari kalender kerja perusahaan`);
      } else {
        // Purely custom company holiday
        if (deleteTarget.id) {
          const { error } = await supabase.from('company_holidays').delete().eq('id', deleteTarget.id);
          if (error) throw error;
        }
        toast.success(`Hari libur "${deleteTarget.name}" berhasil dihapus`);
      }
      setDeleteTarget(null);
      if (editingHoliday?.holiday_date === deleteTarget.holiday_date) {
        setEditingHoliday(null);
        setDate('');
        setName('');
      }
      await load();
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + (err.message || 'Error'));
    }
  };

  // Calendar cells
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);

  const selectCalendarDate = (day: number) => {
    const selectedDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const mergedRow = mergedRows.find((r) => r.holiday_date === selectedDate);
    setDate(selectedDate);
    if (mergedRow) {
      setEditingHoliday(mergedRow);
      setName(mergedRow.name);
      setType(mergedRow.holiday_type);
      setDeduct(Boolean(mergedRow.deduct_annual_leave));
    } else {
      setEditingHoliday(null);
      setName('');
      setType('collective_leave');
      setDeduct(true);
    }
  };

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    setDate(todayStr);
    const existing = mergedRows.find(r => r.holiday_date === todayStr);
    if (existing) {
      setEditingHoliday(existing);
      setName(existing.name);
      setType(existing.holiday_type);
      setDeduct(Boolean(existing.deduct_annual_leave));
    }
  };

  const getHolidayTypeInfo = (hType: string) => {
    switch (hType) {
      case 'national':
        return {
          label: 'Libur Nasional',
          badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25',
          dotClass: 'bg-rose-500'
        };
      case 'collective_leave':
        return {
          label: 'Cuti Bersama',
          badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
          dotClass: 'bg-amber-500'
        };
      case 'company':
        return {
          label: 'Libur Perusahaan',
          badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25',
          dotClass: 'bg-blue-500'
        };
      case 'working_day':
        return {
          label: 'Kerja Pengganti',
          badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
          dotClass: 'bg-emerald-500'
        };
      default:
        return {
          label: hType || 'Hari Libur',
          badgeClass: 'bg-muted text-muted-foreground border border-border/50',
          dotClass: 'bg-muted-foreground'
        };
    }
  };

  const today = new Date();

  return (
    <TooltipProvider delay={100}>
      <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Standard PageHeader */}
      <PageHeader
        title="Kalender Perusahaan"
        description="Kelola jadwal hari libur nasional resmi SKB, cuti bersama, dan kalender operasional kerja perusahaan."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin text-primary dark:text-blue-400')} />
            <span>Sinkronisasi SKB</span>
          </Button>
        </div>
      </PageHeader>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-fit mb-6">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar size={14} className="mr-1.5" />
            <span>Tampilan Kalender</span>
          </TabsTrigger>
          <TabsTrigger value="list">
            <List size={14} className="mr-1.5" />
            <span>Daftar Hari Libur</span>
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px] font-bold">
              {stats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* StatCards Grid (Interactive: Click to Filter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => { setActiveTab('list'); setTypeFilter('all'); setStatusFilter('all'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Klik untuk melihat semua hari libur di daftar"
        >
          <StatCard
            label={`Total Libur (${selectedYear})`}
            value={stats.total}
            subValue="Hari libur aktif"
            icon={Calendar}
            color="slate"
          />
        </div>
        <div
          onClick={() => { setActiveTab('list'); setTypeFilter('national'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Klik untuk filter Libur Nasional"
        >
          <StatCard
            label="Libur Nasional"
            value={stats.nationalCount}
            subValue="SKB Pemerintah"
            icon={CheckCircle2}
            color="emerald"
            status="on-track"
          />
        </div>
        <div
          onClick={() => { setActiveTab('list'); setTypeFilter('collective_leave'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Klik untuk memeriksa Cuti Bersama"
        >
          <StatCard
            label="Cuti Bersama"
            value={stats.collectiveCount}
            subValue={stats.inactiveCollectiveCount > 0 ? `${stats.inactiveCollectiveCount} cuti bersama dikecualikan` : `${stats.totalCollective} dari SKB`}
            icon={Clock}
            color="amber"
          />
        </div>
        <div
          onClick={() => { setActiveTab('calendar'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Kembali ke kalender bulan ini"
        >
          <StatCard
            label={`Libur ${MONTH_NAMES[selectedMonth]}`}
            value={stats.monthActiveCount}
            subValue="Hari libur aktif bulan ini"
            icon={Sunrise}
            color="blue"
          />
        </div>
      </div>

      {/* Tab Content: Calendar View */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid Card */}
          <Card className="lg:col-span-8 border-border/60 shadow-sm overflow-hidden flex flex-col">
            {/* Calendar Controls Header */}
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevMonth}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft size={16} />
                </Button>
                <div className="text-sm font-bold text-foreground min-w-[150px] text-center sm:text-left">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="h-8 rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="h-8 rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="h-8 px-2.5 text-xs font-semibold border-border/60"
                >
                  Hari Ini
                </Button>
              </div>
            </CardHeader>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-muted/10 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Libur Nasional
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Cuti Bersama
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Libur Kantor
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Kerja Pengganti
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-400/50" /> Dikecualikan / Tidak Libur
              </span>
            </div>

            {/* Grid */}
            <CardContent className="p-3 sm:p-4 flex-1">
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Day of Week Headers */}
                {DAY_NAMES.map((d, idx) => (
                  <div
                    key={d}
                    className={cn(
                      'py-2 text-[11px] font-bold uppercase tracking-wider',
                      idx === 0 ? 'text-rose-500 dark:text-rose-400' : idx === 6 ? 'text-slate-400 dark:text-zinc-500' : 'text-muted-foreground'
                    )}
                  >
                    {d}
                  </div>
                ))}

                {/* Day Cells */}
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="min-h-20 sm:min-h-24 rounded-lg bg-muted/10 border border-transparent" />;
                  }
                  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const cellDate = new Date(selectedYear, selectedMonth, day);
                  const dayOfWeek = cellDate.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isToday = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() && day === today.getDate();
                  const isSelected = date === dateStr;
                  const dayHolidays = monthRows.filter(r => r.holiday_date === dateStr && r.is_active !== false);
                  const inactiveHolidays = monthRows.filter(r => r.holiday_date === dateStr && r.is_active === false);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => selectCalendarDate(day)}
                      className={cn(
                        'min-h-20 sm:min-h-24 rounded-lg border p-1 sm:p-1.5 text-left transition-all cursor-pointer flex flex-col justify-between group',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/40 bg-primary/5 dark:bg-primary/10'
                          : dayHolidays.length > 0
                          ? 'border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-500/[0.07] hover:border-rose-500/50'
                          : inactiveHolidays.length > 0
                          ? 'border-dashed border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
                          : isSunday
                          ? 'border-border/40 bg-rose-500/[0.02] dark:bg-rose-500/[0.03] hover:border-border hover:bg-muted/40'
                          : isSaturday
                          ? 'border-border/40 bg-muted/20 hover:border-border hover:bg-muted/40'
                          : 'border-border/40 bg-card hover:border-border hover:bg-muted/30 dark:bg-zinc-900/60'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-xs font-bold inline-flex items-center justify-center h-5 w-5 rounded-full',
                            isToday
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : isSunday || dayHolidays.length > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : isSaturday
                              ? 'text-muted-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {day}
                        </span>
                        {dayHolidays.length > 0 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        ) : inactiveHolidays.length > 0 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400/60 shrink-0" title="Dikecualikan / Tidak Libur" />
                        ) : null}
                      </div>

                      <div className="mt-1 space-y-1 overflow-hidden">
                        {dayHolidays.map((h, hIdx) => {
                          const info = getHolidayTypeInfo(h.holiday_type);
                          return (
                            <div
                              key={hIdx}
                              className={cn(
                                'text-[10px] leading-tight font-semibold px-1 py-0.5 rounded truncate',
                                info.badgeClass
                              )}
                              title={h.name}
                            >
                              {h.name}
                            </div>
                          );
                        })}
                        {inactiveHolidays.map((h, hIdx) => (
                          <div
                            key={`inactive-${hIdx}`}
                            className="text-[9px] leading-tight font-medium px-1 py-0.5 rounded truncate bg-muted/50 text-muted-foreground line-through border border-border/40"
                            title={`Dikecualikan di perusahaan: ${h.name}`}
                          >
                            {h.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Form & Month Holiday List Card */}
          <div className="lg:col-span-4 space-y-6">
            {/* Event Form Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  {editingHoliday ? (editingHoliday.is_active === false ? 'Status Libur Dikecualikan' : 'Edit Hari Libur') : 'Tambah Hari Libur'}
                </CardTitle>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  Sesuaikan hari libur khusus atau cuti bersama perusahaan
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5">
                {editingHoliday?.is_active === false && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                    <div className="min-w-0">
                      <div className="font-bold">Hari Libur Ini Dikecualikan</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Tercatat di SKB resmi tapi dinonaktifkan untuk perusahaan (karyawan masuk kerja normal).
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tanggal
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nama Hari Libur
                  </Label>
                  <Input
                    placeholder="Contoh: Libur Operasional Akhir Tahun"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Jenis Libur
                  </Label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="collective_leave">Cuti Bersama</option>
                    <option value="national">Libur Nasional</option>
                    <option value="company">Libur Perusahaan</option>
                    <option value="working_day">Hari Kerja Pengganti</option>
                  </select>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deduct}
                      onChange={e => setDeduct(e.target.checked)}
                      disabled={type !== 'collective_leave' && type !== 'company'}
                      className="rounded border-border/60 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Potong kuota cuti tahunan karyawan</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-end gap-2">
                  {editingHoliday && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingHoliday(null);
                        setDate('');
                        setName('');
                        setType('collective_leave');
                        setDeduct(true);
                      }}
                      className="h-8 text-xs font-semibold"
                    >
                      Batal
                    </Button>
                  )}

                  {editingHoliday && (
                    editingHoliday.is_active === false ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => toggle(editingHoliday)}
                        className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                      >
                        <Check size={13} />
                        <span>Aktifkan Kembali</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggle(editingHoliday)}
                        className="h-8 gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        title="Nonaktifkan / Kecualikan dari Kalender"
                      >
                        <EyeOff size={13} />
                        <span>Nonaktifkan Libur</span>
                      </Button>
                    )
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={save}
                    disabled={saving}
                    className="h-8 gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 text-xs font-semibold"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    <span>{editingHoliday ? 'Simpan Perubahan' : 'Tambah Libur'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selected Month Holidays List Preview */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Hari Libur {MONTH_NAMES[selectedMonth]}</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {monthRows.filter(r => r.is_active !== false).length} Aktif / {monthRows.length} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {monthRows.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada hari libur di bulan {MONTH_NAMES[selectedMonth]}
                  </div>
                ) : (
                  <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
                    {monthRows.map((item, idx) => {
                      const info = getHolidayTypeInfo(item.holiday_type);
                      const dObj = new Date(`${item.holiday_date}T00:00:00`);
                      const isInactive = item.is_active === false;
                      return (
                        <div key={idx} className={cn('p-3 flex items-start justify-between gap-2 transition-colors', isInactive ? 'bg-muted/10 opacity-70' : 'hover:bg-muted/30')}>
                          <div className="min-w-0">
                            <div className={cn('text-xs font-semibold truncate', isInactive ? 'line-through text-muted-foreground' : 'text-foreground')}>
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {dObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className={cn('text-[10px] font-semibold px-1.5 py-px rounded', info.badgeClass)}>
                                {info.label}
                              </span>
                              {isInactive && (
                                <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                                  Dikecualikan
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setDate(item.holiday_date);
                                      setName(item.name);
                                      setType(item.holiday_type);
                                      setDeduct(Boolean(item.deduct_annual_leave));
                                      setEditingHoliday(item);
                                    }}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Edit Hari Libur"
                                    aria-label="Edit Hari Libur"
                                  />
                                }
                              >
                                <Edit3 size={12} />
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit Hari Libur</TooltipContent>
                            </Tooltip>
                            {isInactive ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => toggle(item)}
                                      className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 bg-emerald-500/10 border border-emerald-500/30"
                                      title="Aktifkan Kembali"
                                      aria-label="Aktifkan Kembali"
                                    />
                                  }
                                >
                                  <Check size={12} />
                                </TooltipTrigger>
                                <TooltipContent side="top">Aktifkan Kembali</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => toggle(item)}
                                      className="h-7 w-7 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10"
                                      title="Nonaktifkan / Kecualikan dari Kalender"
                                      aria-label="Nonaktifkan / Kecualikan dari Kalender"
                                    />
                                  }
                                >
                                  <EyeOff size={12} />
                                </TooltipTrigger>
                                <TooltipContent side="top">Nonaktifkan / Kecualikan</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content: List View */}
      {activeTab === 'list' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col gap-3 pb-4 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <List size={16} className="text-primary" />
                  Daftar Lengkap Hari Libur &amp; Cuti Bersama ({selectedYear})
                </CardTitle>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  Menampilkan {filteredTableRows.length} dari total {stats.total} hari libur aktif ({stats.inactiveCollectiveCount > 0 ? `${stats.inactiveCollectiveCount} cuti bersama dikecualikan` : 'semua cuti bersama aktif'})
                </p>
              </div>

              {/* Year quick switcher */}
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground">Tahun:</Label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="h-8 rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter toolbar inside list header: Search + Category + Status */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-border/40">
              <div className="relative md:col-span-6">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTableQuery}
                  onChange={e => setSearchTableQuery(e.target.value)}
                  placeholder="Cari nama hari libur atau tanggal (YYYY-MM-DD)..."
                  className="pl-9 h-8 text-xs"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as any)}
                  className="h-8 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="all">Semua Kategori Libur</option>
                  <option value="collective_leave">Cuti Bersama Saja</option>
                  <option value="national">Libur Nasional Saja</option>
                  <option value="company">Libur Perusahaan Saja</option>
                  <option value="working_day">Hari Kerja Pengganti</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="h-8 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="all">Semua Status (Aktif &amp; Nonaktif)</option>
                  <option value="active">Hanya Aktif Berlaku</option>
                  <option value="inactive">Hanya Dikecualikan / Nonaktif</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredTableRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <Calendar size={36} className="opacity-30" />
                <p className="text-sm font-semibold text-foreground">Tidak ada hari libur yang sesuai</p>
                <p className="text-xs text-muted-foreground">Coba ubah kata kunci pencarian atau reset filter kategori / status</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[180px]">Tanggal &amp; Hari</TableHead>
                      <TableHead>Nama Hari Libur</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Potong Cuti</TableHead>
                      <TableHead>Sumber Referensi</TableHead>
                      <TableHead>Status Perusahaan</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTableRows.map((row, idx) => {
                      const info = getHolidayTypeInfo(row.holiday_type);
                      const dObj = new Date(`${row.holiday_date}T00:00:00`);
                      const dayName = dObj.toLocaleDateString('id-ID', { weekday: 'long' });
                      const formattedDate = dObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                      const isInactive = row.is_active === false;

                      return (
                        <TableRow key={row.id || `${row.holiday_date}-${idx}`} className={cn('transition-colors', isInactive ? 'bg-muted/10 opacity-70 hover:bg-muted/20' : 'hover:bg-muted/30 dark:hover:bg-zinc-800/40')}>
                          <TableCell className="py-3">
                            <div className={cn('font-mono text-xs font-semibold', isInactive ? 'line-through text-muted-foreground' : 'text-foreground')}>{formattedDate}</div>
                            <div className="text-[11px] text-muted-foreground">{dayName}</div>
                          </TableCell>
                          <TableCell>
                            <span className={cn('text-xs font-bold', isInactive ? 'line-through text-muted-foreground' : 'text-foreground')}>
                              {row.name}
                            </span>
                            {isInactive && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Dikecualikan di perusahaan (Karyawan masuk kerja normal)
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded inline-block', info.badgeClass)}>
                              {info.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {row.deduct_annual_leave ? (
                              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                Ya
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border/60 bg-muted/40 text-muted-foreground text-[10px]">
                                Tidak
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-medium">
                              {row.source === 'company_policy' ? 'Kebijakan Perusahaan' : 'SKB Resmi Pemerintah'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] font-semibold gap-1.5 px-2 py-0.5',
                                !isInactive
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', !isInactive ? 'bg-emerald-500' : 'bg-amber-500')} />
                              {!isInactive ? 'Aktif Berlaku' : 'Dikecualikan / Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit Button with Tooltip */}
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => {
                                        setDate(row.holiday_date);
                                        setName(row.name);
                                        setType(row.holiday_type);
                                        setDeduct(Boolean(row.deduct_annual_leave));
                                        setEditingHoliday(row);
                                        setActiveTab('calendar');
                                      }}
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                      title="Edit Hari Libur"
                                      aria-label="Edit Hari Libur"
                                    />
                                  }
                                >
                                  <Edit3 size={14} />
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit Hari Libur</TooltipContent>
                              </Tooltip>

                              {/* Nonaktifkan / Aktifkan Button with Tooltip */}
                              {!isInactive ? (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => toggle(row)}
                                        className="h-8 w-8 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10"
                                        title="Nonaktifkan / Kecualikan dari Kalender"
                                        aria-label="Nonaktifkan / Kecualikan dari Kalender"
                                      />
                                    }
                                  >
                                    <EyeOff size={14} />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Nonaktifkan / Kecualikan</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => toggle(row)}
                                        className="h-8 w-8 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
                                        title="Aktifkan Kembali Libur Ini"
                                        aria-label="Aktifkan Kembali Libur Ini"
                                      />
                                    }
                                  >
                                    <Check size={14} />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Aktifkan Kembali</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete / Exclude Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/40 px-6 py-4 bg-muted/20">
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <div className={cn(
                'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border',
                deleteTarget?.holiday_type === 'collective_leave'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              )}>
                {deleteTarget?.holiday_type === 'collective_leave' ? (
                  <Clock size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
              </div>
              <span>
                {deleteTarget?.holiday_type === 'collective_leave' ? 'Kecualikan Cuti Bersama' : 'Hapus Hari Libur'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs normal-case tracking-normal text-muted-foreground mt-0.5">
              {deleteTarget?.holiday_type === 'collective_leave'
                ? 'Konfirmasi pengecualian status cuti bersama pada kalender kerja.'
                : 'Konfirmasi penghapusan hari libur dari kalender perusahaan.'}
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div className="p-6 space-y-4">
            {deleteTarget && (() => {
              const dObj = new Date(`${deleteTarget.holiday_date}T00:00:00`);
              const fullDate = dObj.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
              return (
                <div className="rounded-xl border border-border/60 bg-muted/30 dark:bg-zinc-800/50 p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {deleteTarget.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {fullDate}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] font-semibold px-2 py-0.5',
                      deleteTarget.holiday_type === 'collective_leave'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {deleteTarget.holiday_type === 'collective_leave' ? 'Cuti Bersama' : 'Libur Nasional'}
                  </Badge>
                </div>
              );
            })()}

            <div className={cn(
              'rounded-xl border p-3.5 flex items-start gap-3 text-xs leading-relaxed',
              deleteTarget?.holiday_type === 'collective_leave'
                ? 'border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 text-muted-foreground'
                : 'border-rose-500/25 bg-rose-500/5 dark:bg-rose-500/10 text-muted-foreground'
            )}>
              <Info size={16} className={cn(
                'shrink-0 mt-0.5',
                deleteTarget?.holiday_type === 'collective_leave'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              )} />
              <div className="space-y-1">
                <div className="font-semibold text-foreground text-xs">
                  {deleteTarget?.holiday_type === 'collective_leave'
                    ? 'Karyawan tetap masuk kerja seperti biasa'
                    : 'Hari libur akan dihapus dari kalender perusahaan'}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {deleteTarget?.holiday_type === 'collective_leave'
                    ? 'Tanggal ini akan dinonaktifkan dari kalender libur. Jam kerja operasional dan absensi karyawan berlaku normal seperti biasa.'
                    : 'Jadwal operasional perusahaan pada tanggal ini akan kembali normal sebagai hari kerja.'}
                </p>
                <p className="text-[10px] text-muted-foreground/80 pt-0.5">
                  💡 HR dapat memeriksa kembali dan mengaktifkannya sewaktu-waktu melalui tab <strong>Daftar Hari Libur</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-3.5 bg-muted/15 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="h-8 px-3.5 text-xs font-semibold border-border/60 hover:bg-muted"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={executeDelete}
              className={cn(
                'h-8 px-3.5 gap-1.5 text-xs font-semibold text-white shadow-xs',
                deleteTarget?.holiday_type === 'collective_leave'
                  ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              )}
            >
              <Trash2 size={13} />
              <span>
                {deleteTarget?.holiday_type === 'collective_leave'
                  ? 'Ya, Kecualikan Libur'
                  : 'Ya, Hapus Libur'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </TooltipProvider>
  );
};


const AttendanceManager: React.FC<{ currentUser?: any; section?: string }> = ({ currentUser, section: sectionProp }) => {
  const location = useLocation();
  const section = sectionProp || (() => {
    const pathname = location.pathname.replace(/\/$/, '');
    if (pathname === '/attendance' || pathname === '') return 'dashboard';
    if (pathname === '/calendar' || pathname === '/attendance-calendar') return 'calendar';
    return pathname.replace('/attendance-', '') || 'dashboard';
  })();
  const userId = currentUser?.id || currentUser?.authId || '';
  const nearestOfficeLabel = (lat: number | null, lng: number | null) => {
    if (lat == null || lng == null) return 'Tidak tercatat';
    const toRad = (value: number) => value * Math.PI / 180;
    const distances = locations.map(office => {
      const dLat = toRad(office.latitude - lat);
      const dLng = toRad(office.longitude - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(office.latitude)) * Math.sin(dLng / 2) ** 2;
      return { office, meters: Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) };
    }).sort((a, b) => a.meters - b.meters)[0];
    return distances ? `${distances.office.name} · ${distances.meters}m dari titik kantor` : 'Kantor tidak ditemukan';
  };
  const mapsLink = (lat: number | null, lng: number | null) => lat != null && lng != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

  // State
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [schedule, setSchedule] = useState<AttendanceSchedule | null>(null);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // HR: All employees + department filter
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [deptFilter, setDeptFilter] = useState('all');

  // History filters
  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Report filters
  const [reportStart, setReportStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [reportEnd, setReportEnd] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [reportDept, setReportDept] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [reportRecords, setReportRecords] = useState<AttendanceRecord[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSort, setReportSort] = useState<'name' | 'present' | 'late' | 'absent' | 'hours'>('name');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [viewAttendancePhoto, setViewAttendancePhoto] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<'summary' | 'logs'>('summary');
  const [reportLogStatus, setReportLogStatus] = useState<string>('all');
  const [requestTab, setRequestTab] = useState<'leave' | 'overtime' | 'reimbursement' | 'attendance_correction'>('leave');
  const [attendanceCorrections, setAttendanceCorrections] = useState<any[]>([]);

  // Buka tab yang memang punya data agar queue tidak terlihat kosong saat
  // leave/overtime belum memiliki pengajuan, tetapi Request Absen sudah ada.

  // Leave/Overtime filter
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected'>('all');

  // Request detail yang sedang dibuka (klik baris tabel)
  const [viewRequest, setViewRequest] = useState<{ kind: 'cuti' | 'lembur' | 'reimbursement'; req: any } | null>(null);

  // Reimbursement filter
  const [reimbFilter, setReimbFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('all');
  const [reimbCategory, setReimbCategory] = useState<string>('all');

  // Request scope filters (dept & company, like report absen)
  const [requestDept, setRequestDept] = useState('all');
  const [requestCompany, setRequestCompany] = useState('all');

  // ── Multi-Level Approval Handlers ─────────────────────────────────────

  // Sinkronisasi status ke model app-absen (PWA):
  //   app-absen membaca approval_status + current_approval_level,
  //   bukan kolom `status` ber-nilai pending_line_2/pending_senior/dll.
  // Mapping status app-gesit → approval_status app-absen:
  //   pending_line_2 → pending_level_2 (level 2)
  //   pending_senior  → pending_level_3 (level 3)
  //   pending_office  → pending_level_3 (level 3, tahap tertinggi di app-absen)
  //   approved        → approved
  //   rejected        → rejected
  const getSyncApproval = (resultStatus: string, fallbackLevel: number = 1): Record<string, any> => {
    switch (resultStatus) {
      case 'pending_line_2':
        return { approval_status: 'pending_level_2', current_approval_level: 2 };
      case 'pending_senior':
        return { approval_status: 'pending_level_3', current_approval_level: 3 };
      case 'pending_office':
        return { approval_status: 'pending_level_3', current_approval_level: 3 };
      case 'approved':
        return { approval_status: 'approved', current_approval_level: 3 };
      case 'rejected':
        return { approval_status: 'rejected', current_approval_level: fallbackLevel };
      default:
        return { approval_status: 'pending', current_approval_level: fallbackLevel };
    }
  };

  // Update approval dengan fallback: bila kolom history per-level (line1_* dll)
  // belum ada di DB, update hanya kolom dasar (status + approved_by/at).
  const applyApprovalUpdate = async (
    table: 'leave_requests' | 'overtime_requests' | 'reimbursements',
    id: number | string,
    updateData: Record<string, any>
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.from(table).update(updateData).eq('id', id);
    if (!error) return { error: null };
    if (/could not find|does not exist|42703|PGRST204/i.test(error.message || '')) {
      const { error: fallbackError } = await supabase.from(table)
        .update({
          status: updateData.status,
          approved_by: updateData.approved_by || null,
          approved_at: updateData.approved_at || new Date().toISOString(),
        })
        .eq('id', id);
      return { error: fallbackError || null };
    }
    return { error };
  };

  const handleApproveLeave = async (req: LeaveRequest) => {
    if (isRequester(req.user_id)) {
      toast.error('Anda tidak dapat menyetujui pengajuan sendiri.');
      return;
    }
    if (!canApproveRequest(req.user_id, req.status)) {
      toast.error('Anda bukan approver yang ditunjuk untuk pengajuan ini.');
      return;
    }
    const nextStatus = getNextStatus(req.status, allUsers.find(u => String(u.id) === String(req.user_id)));
    if (!nextStatus) return;

    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const approverTime = new Date().toISOString();
    const updateData: Record<string, any> = { status: nextStatus, approved_by: approverName, approved_at: approverTime };

    if (nextStatus === 'pending_line_2') {
      updateData.line1_approved_by = approverName;
      updateData.line1_approved_at = approverTime;
    } else if (nextStatus === 'pending_senior') {
      updateData.line2_approved_by = approverName;
      updateData.line2_approved_at = approverTime;
    } else if (nextStatus === 'pending_office') {
      updateData.senior_approved_by = approverName;
      updateData.senior_approved_at = approverTime;
    } else if (nextStatus === 'approved') {
      updateData.office_approved_by = approverName;
      updateData.office_approved_at = approverTime;
    }

    Object.assign(updateData, getSyncApproval(nextStatus));

    try {
      if (nextStatus === 'approved') {
        const { error } = await supabase.rpc('approve_leave_request_with_balance', { p_request_id: req.id });
        if (error) throw error;
      } else {
        const { error } = await applyApprovalUpdate('leave_requests', req.id, updateData);
        if (error) throw error;
      }
      const label = nextStatus === 'approved' ? 'disetujui final' : nextStatus === 'pending_line_2' ? 'diteruskan ke HR' : nextStatus === 'pending_senior' ? 'diteruskan ke Manager' : 'diteruskan ke VP';
      toast.success(`Pengajuan cuti ${label}.`);
      fetchAll();
    } catch (err: any) {
      toast.error(`Gagal menyetujui cuti: ${err.message}`);
    }
  };

  const handleApproveOvertime = async (req: OvertimeRequest) => {
    if (isRequester(req.user_id)) {
      toast.error('Anda tidak dapat menyetujui pengajuan sendiri.');
      return;
    }
    if (!canApproveRequest(req.user_id, req.status)) {
      toast.error('Anda bukan approver yang ditunjuk untuk pengajuan ini.');
      return;
    }
    const nextStatus = getNextStatus(req.status, allUsers.find(u => String(u.id) === String(req.user_id)));
    if (!nextStatus) return;

    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const approverTime = new Date().toISOString();
    const updateData: Record<string, any> = { status: nextStatus, approved_by: approverName, approved_at: approverTime };

    if (nextStatus === 'pending_line_2') {
      updateData.line1_approved_by = approverName;
      updateData.line1_approved_at = approverTime;
    } else if (nextStatus === 'pending_senior') {
      updateData.line2_approved_by = approverName;
      updateData.line2_approved_at = approverTime;
    } else if (nextStatus === 'pending_office') {
      updateData.senior_approved_by = approverName;
      updateData.senior_approved_at = approverTime;
    } else if (nextStatus === 'approved') {
      updateData.office_approved_by = approverName;
      updateData.office_approved_at = approverTime;
    }

    Object.assign(updateData, getSyncApproval(nextStatus));

    try {
      const { error } = await applyApprovalUpdate('overtime_requests', req.id, updateData);
      if (error) throw error;
      const label = nextStatus === 'approved' ? 'disetujui final' : nextStatus === 'pending_line_2' ? 'diteruskan ke HR' : nextStatus === 'pending_senior' ? 'diteruskan ke Manager' : 'diteruskan ke VP';
      toast.success(`Pengajuan lembur ${label}.`);
      fetchAll();
    } catch (err: any) {
      toast.error(`Gagal menyetujui lembur: ${err.message}`);
    }
  };

  const handleApproveReimbursement = async (req: ReimbursementRequest) => {
    if (isRequester(req.user_id)) {
      toast.error('Anda tidak dapat menyetujui pengajuan sendiri.');
      return;
    }
    if (!canApproveRequest(req.user_id, req.status)) {
      toast.error('Anda bukan approver yang ditunjuk untuk pengajuan ini.');
      return;
    }
    const nextStatus = getNextStatus(req.status, allUsers.find(u => String(u.id) === String(req.user_id)));
    if (!nextStatus) return;

    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const approverTime = new Date().toISOString();
    const updateData: Record<string, any> = { status: nextStatus, approved_by: approverName, approved_at: approverTime };

    if (nextStatus === 'pending_line_2') {
      updateData.line1_approved_by = approverName;
      updateData.line1_approved_at = approverTime;
    } else if (nextStatus === 'pending_senior') {
      updateData.line2_approved_by = approverName;
      updateData.line2_approved_at = approverTime;
    } else if (nextStatus === 'pending_office') {
      updateData.senior_approved_by = approverName;
      updateData.senior_approved_at = approverTime;
    } else if (nextStatus === 'approved') {
      updateData.office_approved_by = approverName;
      updateData.office_approved_at = approverTime;
    }

    Object.assign(updateData, getSyncApproval(nextStatus));

    try {
      const { error } = await applyApprovalUpdate('reimbursements', req.id, updateData);
      if (error) throw error;
      const label = nextStatus === 'approved' ? 'disetujui final' : nextStatus === 'pending_line_2' ? 'diteruskan ke HR' : nextStatus === 'pending_senior' ? 'diteruskan ke Manager' : 'diteruskan ke VP';
      toast.success(`Pengajuan reimbursement ${label}.`);
      fetchAll();
    } catch (err: any) {
      toast.error(`Gagal menyetujui reimbursement: ${err.message}`);
    }
  };

  const handleRejectRequest = async (table: 'leave_requests' | 'overtime_requests' | 'reimbursements', id: number | string) => {
    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    try {
      const { error } = await supabase.from(table).update({
        status: 'rejected',
        rejection_reason: `Ditolak oleh ${approverName}`,
        approved_by: approverName,
        approved_at: new Date().toISOString(),
        approval_status: 'rejected',
        current_approval_level: 1,
      }).eq('id', id);
      if (error) throw error;
      toast.success('Pengajuan ditolak.');
      fetchAll();
    } catch (err: any) {
      toast.error(`Gagal menolak pengajuan: ${err.message}`);
    }
  };

  const handleMarkPaid = async (id: number | string) => {
    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    try {
      const { error } = await supabase.from('reimbursements').update({
        status: 'paid',
        approved_by: approverName,
        approved_at: new Date().toISOString(),
        approval_status: 'approved',
        current_approval_level: 3,
      }).eq('id', id);
      if (error) throw error;
      toast.success('Reimbursement ditandai sudah dibayar.');
      fetchAll();
    } catch (err: any) {
      toast.error(`Gagal update status: ${err.message}`);
    }
  };

  const isManager = (String(currentUser?.role || '').toLowerCase() === 'admin'
    || String(currentUser?.role || '').toLowerCase() === 'super admin'
    || String(currentUser?.role || '').toLowerCase() === 'super_admin'
    || currentUser?.groups?.some((g: string) =>
      ['it_management', 'csl_admin', 'hr', 'hrd', 'attendance-request', 'attendance_request'].includes(String(g).toLowerCase().trim())
    ));

  // ── Approval Hierarchy Helpers ────────────────────────────────────────
  // GESIT Attendance Flexible Approval (kolom utama attendance_*, fallback kolom lama):
  //   attendance_supervisor_id / supervisor_id → Level 1 (Direct Supervisor)
  //   attendance_hr_id         / manager_id    → Level 2 (HR)
  //   attendance_manager_id    / vp_id         → Level 3 (Manager/Deputy)
  //   attendance_vp_id         / vp_id         → Level 4 (VP)

  const isApprover = useMemo(() => {
    if (isManager) return true;
    const myId = String(currentUser?.id || '');
    if (!myId) return false;
    return allUsers.some(u =>
      String(u.attendance_supervisor_id || '') === myId ||
      String(u.attendance_hr_id || '') === myId ||
      String(u.attendance_manager_id || '') === myId ||
      String(u.attendance_vp_id || '') === myId ||
      String(u.supervisor_id || '') === myId ||
      String(u.manager_id || '') === myId ||
      String(u.vp_id || '') === myId
    );
  }, [isManager, currentUser, allUsers]);

  // Flexible approval: level yang slot approvernya kosong dilewati otomatis.
  // Level: L1 Supervisor → L2 HR → L3 Manager → L4 VP (kolom attendance_*).
  const getNextStatus = (currentStatus: string, requester?: UserAccount): string | null => {
    const hasApprover = (u: UserAccount | undefined, key: 'supervisor' | 'hr' | 'manager' | 'vp'): boolean => {
      if (!u) return false;
      switch (key) {
        case 'supervisor': return !!(u.attendance_supervisor_id);
        case 'hr': return !!(u.attendance_hr_id);
        case 'manager': return !!(u.attendance_manager_id);
        case 'vp': return !!(u.attendance_vp_id);
        default: return false;
      }
    };
    switch (currentStatus) {
      case 'pending':
      case 'pending_line_1':
        return hasApprover(requester, 'hr') ? 'pending_line_2'
          : hasApprover(requester, 'manager') ? 'pending_senior'
          : hasApprover(requester, 'vp') ? 'pending_office'
          : 'approved';
      case 'pending_line_2':
        return hasApprover(requester, 'manager') ? 'pending_senior'
          : hasApprover(requester, 'vp') ? 'pending_office'
          : 'approved';
      case 'pending_senior':
        return hasApprover(requester, 'vp') ? 'pending_office' : 'approved';
      case 'pending_office':
        return 'approved';
      default: return null;
    }
  };

  const isRequester = useCallback((reqUserId: string): boolean => {
    return String(currentUser?.id) === String(reqUserId);
  }, [currentUser]);

  // Check if current user is the designated approver for a request at its current status
  // Flexible: uses attendance_supervisor_id → attendance_hr_id → attendance_manager_id → attendance_vp_id
  // chain, dengan fallback ke supervisor_id → manager_id → vp_id.
  // Jika slot approver untuk level tersebut KOSONG, hanya Admin/Super Admin yang boleh
  // menyelesaikannya (jalur penyelamat untuk request yang sudah terlanjur nyangkut).
  const canApproveRequest = useCallback((reqUserId: string, status: string): boolean => {
    const currentId = String(currentUser?.id);
    const requester = allUsers.find(u => String(u.id) === String(reqUserId));
    if (!requester) return false;

    // Hanya status yang masih berjalan (pending*) yang bisa di-approve.
    // Status 'approved'/'rejected'/'paid'/dll → tidak muncul tombol Setujui/Tolak.
    if (!['pending', 'pending_line_1', 'pending_line_2', 'pending_senior', 'pending_office'].includes(status)) {
      return false;
    }

    let approverId = '';
    if (status === 'pending' || status === 'pending_line_1') {
      approverId = requester.attendance_supervisor_id || requester.supervisor_id || '';
    } else if (status === 'pending_line_2') {
      approverId = requester.attendance_hr_id || requester.manager_id || '';
    } else if (status === 'pending_senior') {
      approverId = requester.attendance_manager_id || requester.vp_id || '';
    } else if (status === 'pending_office') {
      approverId = requester.attendance_vp_id || requester.vp_id || '';
    }

    if (approverId) return currentId === String(approverId);

    const role = String(currentUser?.role || '').toLowerCase();
    return role === 'admin' || role === 'super admin' || role === 'super_admin';
  }, [currentUser, allUsers]);

  // Check if current user can reject at any pending level
  const canRejectRequest = useCallback((reqUserId: string, status: string): boolean => {
    return canApproveRequest(reqUserId, status);
  }, [canApproveRequest]);

  // Get approver display name from hierarchy
  const getApproverName = useCallback((reqUserId: string, status: string): string => {
    const requester = allUsers.find(u => String(u.id) === String(reqUserId));
    if (!requester) return '—';
    const nameOf = (id?: string | null) => {
      const u = allUsers.find(x => String(x.id) === String(id));
      return u?.full_name || u?.username || '—';
    };
    switch (status) {
      case 'pending':
      case 'pending_line_1': return nameOf(requester.attendance_supervisor_id || requester.supervisor_id);
      case 'pending_line_2': return nameOf(requester.attendance_hr_id || requester.manager_id);
      case 'pending_senior': return nameOf(requester.attendance_manager_id || requester.vp_id);
      case 'pending_office': return nameOf(requester.attendance_vp_id || requester.vp_id);
      default: return '—';
    }
  }, [allUsers]);

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [todayRes, historyRes, leaveRes, otRes, reimbRes, schedRes, locRes, settingsRes, usersRes, correctionRes] = await Promise.allSettled([
        supabase.from('attendance_records').select('*').eq('user_id', userId).eq('date', today).maybeSingle(),
        isManager
          ? supabase.from('attendance_records').select('*').order('date', { ascending: false }).limit(2000)
          : supabase.from('attendance_records')
              .select('*')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(90),
        (isApprover || currentUser?.groups?.some((g: string) => ['hr', 'hrd', 'attendance-request', 'attendance_request'].includes(String(g).toLowerCase().trim())))
          ? supabase.from('leave_requests').select('*').order('created_at', { ascending: false }).limit(1000)
          : supabase.from('leave_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        (isApprover || currentUser?.groups?.some((g: string) => ['hr', 'hrd', 'attendance-request', 'attendance_request'].includes(String(g).toLowerCase().trim())))
          ? supabase.from('overtime_requests').select('*').order('created_at', { ascending: false }).limit(1000)
          : supabase.from('overtime_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        (isApprover || currentUser?.groups?.some((g: string) => ['hr', 'hrd', 'attendance-request', 'attendance_request'].includes(String(g).toLowerCase().trim())))
          ? supabase.from('reimbursements').select('*').order('created_at', { ascending: false }).limit(1000)
          : supabase.from('reimbursements').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('attendance_schedules').select('*').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('office_locations').select('*').order('name'),
        supabase.from('attendance_settings').select('*').limit(1).maybeSingle(),
        supabase.from('user_accounts').select('id, full_name, username, department, company, job_title, groups, avatar_url, status, role, supervisor_id, manager_id, vp_id, attendance_supervisor_id, attendance_hr_id, attendance_manager_id, attendance_vp_id'),
        // RLS menentukan apakah user melihat semua request (approver) atau hanya miliknya.
        // Jangan pakai guard frontend di sini; guard lama membuat request HR tampil kosong.
        supabase.from('attendance_correction_requests').select('*').order('requested_at', { ascending: false }).limit(1000),
      ]);

      if (todayRes.status === 'fulfilled' && todayRes.value?.data) setTodayRecord(todayRes.value.data);
      if (historyRes.status === 'fulfilled' && historyRes.value?.data) setHistoryRecords(historyRes.value.data);
      if (leaveRes.status === 'fulfilled' && leaveRes.value?.data) setLeaveRequests(leaveRes.value.data);
      if (otRes.status === 'fulfilled' && otRes.value?.data) setOvertimeRequests(otRes.value.data);
      if (reimbRes.status === 'fulfilled' && reimbRes.value?.data) setReimbursements(reimbRes.value.data as any);
      if (schedRes.status === 'fulfilled' && schedRes.value?.data) setSchedule(schedRes.value.data);
      if (locRes.status === 'fulfilled' && locRes.value?.data) setLocations(locRes.value.data);
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) setSettings(settingsRes.value.data);
      if (usersRes.status === 'fulfilled' && usersRes.value?.data) setAllUsers(usersRes.value.data);
      if (correctionRes.status === 'fulfilled') {
        if (correctionRes.value?.error) console.error('[Attendance] Request Absen query failed:', correctionRes.value.error);
        if (correctionRes.value?.data) setAttendanceCorrections(correctionRes.value.data);
      } else {
        console.error('[Attendance] Request Absen query rejected:', correctionRes.reason);
      }
    } catch (err) {
      console.warn('Attendance fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, refreshKey, isManager, isApprover, currentUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Monthly Stats ──────────────────────────────────────────────────────

  const monthlyStats = useMemo(() => {
    const [y, m] = historyMonth.split('-').map(Number);
    const monthRecords = historyRecords.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const leave = monthRecords.filter(r => r.status === 'leave').length;
    const totalWork = monthRecords.reduce((sum, r) => sum + (r.total_work_minutes || 0), 0);
    const totalOT = monthRecords.reduce((sum, r) => sum + (r.total_overtime_minutes || 0), 0);
    return { present, late, absent, leave, totalWork, totalOT, total: monthRecords.length };
  }, [historyRecords, historyMonth]);

  // ── Dashboard View ─────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="flex flex-col gap-5">
      <ClockPanel
        userId={userId}
        todayRecord={todayRecord}
        schedule={schedule}
        locations={locations}
        onClockAction={() => setRefreshKey(k => k + 1)}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { label: 'Hadir', value: monthlyStats.present, icon: <CheckCircle2 size={16} />, bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
          { label: 'Terlambat', value: monthlyStats.late, icon: <AlertTriangle size={16} />, bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
          { label: 'Cuti', value: leaveRequests.filter(l => l.status === 'approved').length, icon: <Calendar size={16} />, bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
          { label: 'Lembur', value: overtimeRequests.filter(o => o.status === 'approved').length, icon: <Timer size={16} />, bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
        ].map((stat, i) => (
          <div key={i} className={cn('rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md', stat.border)}>
            <div className="flex items-center gap-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', stat.bg, stat.text)}>
                {stat.icon}
              </div>
              <div>
                <div className={cn('text-xl font-extrabold tabular-nums tracking-[-0.02em]', stat.text)}>{stat.value}</div>
                <div className="text-[11px] font-medium text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <span className="text-[13px] font-bold tracking-[-0.01em] text-slate-800">Aktivitas Terakhir</span>
          <span className="text-[11px] font-medium text-slate-400">7 hari terakhir</span>
        </div>
        <div className="p-2">
          {historyRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
              <Clock size={28} className="opacity-20" />
              <p className="text-[13px] font-medium">Belum ada data</p>
            </div>
          ) : (
            historyRecords.slice(0, 7).map((r, i) => {
              const sc = r.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-600/20' : r.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-600/20' : 'bg-red-50 text-red-700 border-red-600/20';
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-full border', sc)}>
                      <span className="text-[11px] font-bold">{new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric' })}</span>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-700">
                        {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-[11px] tabular-nums text-slate-400">
                        {formatTime(r.clock_in)} — {r.clock_out ? formatTime(r.clock_out) : '—'}
                      </div>
                    </div>
                  </div>
                  {renderStatusBadge(r.status)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // ── HR Reports View (all employees) ────────────────────────────────────

  const deptOptions = useMemo(() => {
    const depts = Array.from(new Set(allUsers.map(u => u.department).filter(Boolean) as string[]));
    return depts.sort();
  }, [allUsers]);

  const canViewAll = isManager;

  const fetchAllRecords = useCallback(async () => {
    if (!isManager) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = `${today.slice(0, 7)}-01`;
      const [recordsRes, employeesRes] = await Promise.allSettled([
        supabase.from('attendance_records')
          .select('*')
          .gte('date', monthStart)
          .lte('date', today)
          .order('date', { ascending: false })
          .limit(2000),
        supabase.from('user_accounts')
          .select('id, full_name, username, department, company, job_title, groups, avatar_url, status, role, supervisor_id, manager_id, vp_id, attendance_supervisor_id, attendance_hr_id, attendance_manager_id, attendance_vp_id'),
      ]);
      if (recordsRes.status === 'fulfilled' && recordsRes.value?.data) setAllRecords(recordsRes.value.data);
      if (employeesRes.status === 'fulfilled' && employeesRes.value?.data) setAllUsers(employeesRes.value.data);
    } catch (err) {
      console.warn('HR fetch error:', err);
    }
  }, [isManager]);

  useEffect(() => { if (canViewAll) fetchAllRecords(); }, [canViewAll, fetchAllRecords, refreshKey]);

  const fetchReportRecords = useCallback(async () => {
    if (!userId || !reportStart || !reportEnd) return;
    setReportLoading(true);
    try {
      let query = supabase
        .from('attendance_records')
        .select('id,user_id,date,status,clock_in,clock_out,total_work_minutes,total_overtime_minutes,clock_in_lat,clock_in_lng,clock_out_lat,clock_out_lng,photo_url,notes')
        .gte('date', reportStart)
        .lte('date', reportEnd)
        .order('date', { ascending: false });
      if (!isManager) query = query.eq('user_id', userId);
      const { data, error } = await query.limit(5000);
      if (error) throw error;
      setReportRecords((data || []) as AttendanceRecord[]);
    } catch (err) {
      console.warn('Report fetch error:', err);
    } finally {
      setReportLoading(false);
    }
  }, [isManager, userId, reportStart, reportEnd]);

  useEffect(() => {
    if (reportStart && reportEnd) fetchReportRecords();
  }, [fetchReportRecords, reportStart, reportEnd, refreshKey]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserAccount>();
    allUsers.forEach(u => map.set(String(u.id), u));
    return map;
  }, [allUsers]);

  const reportUsers = useMemo(() => {
    if (!isManager) return allUsers.filter(u => u.id === userId);
    const filtered = reportDept === 'all'
      ? allUsers
      : allUsers.filter(u => u.department === reportDept);
    const active = filtered.filter(u => u.status !== 'Inactive');
    const needle = reportSearch.trim().toLowerCase();
    return needle ? active.filter(u => `${u.full_name || ''} ${u.username || ''} ${u.department || ''} ${u.job_title || ''}`.toLowerCase().includes(needle)) : active;
  }, [allUsers, reportDept, reportSearch, isManager, userId]);

  const reportSummary = useMemo(() => {
    const userIds = new Set(reportUsers.map(u => String(u.id)));
    const recs = reportRecords.filter(r => userIds.has(String(r.user_id)));
    const present = recs.filter(r => r.status === 'present').length;
    const late = recs.filter(r => r.status === 'late').length;
    const absent = recs.filter(r => r.status === 'absent').length;
    const leave = recs.filter(r => r.status === 'leave').length;
    const missing = reportUsers.reduce((sum, u) => {
      const dates = new Set(recs.filter(r => String(r.user_id) === String(u.id)).map(r => r.date));
      return sum + Array.from({ length: Math.max(0, Math.floor((new Date(reportEnd).getTime() - new Date(reportStart).getTime()) / 86400000) + 1) }, (_, i) => {
        const d = new Date(`${reportStart}T00:00:00`); d.setDate(d.getDate() + i); return d;
      }).filter(d => d.getDay() !== 0 && d.getDay() !== 6 && !dates.has(d.toISOString().slice(0, 10))).length;
    }, 0);
    const totalWork = recs.reduce((sum, r) => sum + (r.total_work_minutes || 0), 0);
    const totalOT = recs.reduce((sum, r) => sum + (r.total_overtime_minutes || 0), 0);
    return { present, late, absent, leave, missing, totalWork, totalOT, total: recs.length };
  }, [reportRecords, reportUsers, reportStart, reportEnd]);

  const reportRows = useMemo(() => {
    const rows = reportUsers.map(u => {
      const recs = reportRecords.filter(r => String(r.user_id) === String(u.id));
      const present = recs.filter(r => r.status === 'present').length;
      const late = recs.filter(r => r.status === 'late').length;
      const absent = recs.filter(r => r.status === 'absent').length;
      const leave = recs.filter(r => r.status === 'leave').length;
      const holiday = recs.filter(r => r.status === 'holiday').length;
      const dates = new Set(recs.map(r => r.date));
      const missing = Array.from({ length: Math.max(0, Math.floor((new Date(reportEnd).getTime() - new Date(reportStart).getTime()) / 86400000) + 1) }, (_, i) => { const d = new Date(`${reportStart}T00:00:00`); d.setDate(d.getDate() + i); return d; }).filter(d => d.getDay() !== 0 && d.getDay() !== 6 && !dates.has(d.toISOString().slice(0, 10))).length;
      const totalWork = recs.reduce((sum, r) => sum + (r.total_work_minutes || 0), 0);
      const totalOT = recs.reduce((sum, r) => sum + (r.total_overtime_minutes || 0), 0);
      return { user: u, present, late, absent, missing, leave, holiday, totalWork, totalOT, onTime: recs.length };
    });
    const sorted = [...rows];
    switch (reportSort) {
      case 'present': sorted.sort((a, b) => b.present - a.present); break;
      case 'late': sorted.sort((a, b) => b.late - a.late); break;
      case 'absent': sorted.sort((a, b) => b.absent - a.absent); break;
      case 'hours': sorted.sort((a, b) => b.totalWork - a.totalWork); break;
      default: sorted.sort((a, b) => (a.user.full_name || a.user.username || '').localeCompare(b.user.full_name || b.user.username || '')); break;
    }
    return sorted;
  }, [reportRecords, reportUsers, reportSort]);

  const exportReportExcel = () => {
    if (reportRows.length === 0) {
      toast.error('Belum ada data untuk diekspor');
      return;
    }
    const rows = reportRows.map(row => {
      const userTotalDays = row.present + row.late + row.absent + row.missing + row.leave + row.holiday;
      const rate = userTotalDays > 0 ? Math.round(((row.present + row.late) / userTotalDays) * 100) : 0;
      return {
        'Nama Karyawan': row.user.full_name || row.user.username || 'Tanpa Nama',
        'Departemen': row.user.department || '-',
        'Jabatan': row.user.job_title || '-',
        'Tingkat Kehadiran (%)': `${rate}%`,
        'Hadir (Tepat Waktu)': row.present,
        'Terlambat': row.late,
        'Lupa Absen / Tanpa Log': row.missing,
        'Absen': row.absent,
        'Cuti / Izin': row.leave,
        'Hari Libur': row.holiday,
        'Total Hari Kerja': userTotalDays,
        'Jam Kerja Efektif': formatMinutes(row.totalWork),
        'Lembur': formatMinutes(row.totalOT),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 26 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 16 },
      { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
      { wch: 16 }, { wch: 18 }, { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kehadiran');
    XLSX.writeFile(workbook, `laporan-kehadiran-${reportStart}-sd-${reportEnd}.xlsx`);
    toast.success('Laporan kehadiran berhasil diekspor ke Excel');
  };

  const applyDatePreset = (preset: 'today' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toYMD(now);
      setReportStart(todayStr);
      setReportEnd(todayStr);
    } else if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setReportStart(toYMD(d));
      setReportEnd(toYMD(now));
    } else if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setReportStart(toYMD(start));
      setReportEnd(toYMD(now));
    } else if (preset === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setReportStart(toYMD(start));
      setReportEnd(toYMD(end));
    }
  };

  const activeDatePreset = useMemo((): 'today' | 'last7' | 'thisMonth' | 'lastMonth' | null => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayStr = toYMD(now);

    const thisMonthStart = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    if (reportStart === thisMonthStart && reportEnd === todayStr) return 'thisMonth';

    const lastMonthStart = toYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = toYMD(new Date(now.getFullYear(), now.getMonth(), 0));
    if (reportStart === lastMonthStart && reportEnd === lastMonthEnd) return 'lastMonth';

    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    if (reportStart === toYMD(d7) && reportEnd === todayStr) return 'last7';

    if (reportStart === todayStr && reportEnd === todayStr) return 'today';

    return null;
  }, [reportStart, reportEnd]);

  const reportOverallRate = useMemo(() => {
    const totalSlots = reportSummary.present + reportSummary.late + reportSummary.missing + reportSummary.leave;
    if (totalSlots === 0) return 0;
    return Math.round(((reportSummary.present + reportSummary.late) / totalSlots) * 100);
  }, [reportSummary]);

  const filteredDailyRecords = useMemo(() => {
    let list = reportRecords;
    if (reportDept !== 'all') {
      const deptUserIds = new Set(allUsers.filter(u => u.department === reportDept).map(u => String(u.id)));
      list = list.filter(r => deptUserIds.has(String(r.user_id)));
    }
    if (reportSearch.trim()) {
      const needle = reportSearch.trim().toLowerCase();
      list = list.filter(r => {
        const u = userMap.get(String(r.user_id));
        const str = `${u?.full_name || ''} ${u?.username || ''} ${u?.department || ''} ${r.notes || ''}`.toLowerCase();
        return str.includes(needle);
      });
    }
    if (reportLogStatus !== 'all') {
      list = list.filter(r => r.status === reportLogStatus);
    }
    return list;
  }, [reportRecords, reportDept, reportSearch, reportLogStatus, allUsers, userMap]);

  const renderReport = () => (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Laporan Kehadiran"
        description="Analisis performa kehadiran, jam kerja efektif, dan audit log harian karyawan."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReportRecords()}
            disabled={reportLoading}
            className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
          >
            <RefreshCw size={14} className={cn(reportLoading && 'animate-spin text-primary dark:text-blue-400')} />
            <span>Muat Ulang</span>
          </Button>
          <Button
            size="sm"
            onClick={exportReportExcel}
            className="gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 shadow-2xs text-xs font-semibold"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </Button>
        </div>
      </PageHeader>

      {/* Standardized Tab Switcher */}
      <Tabs value={reportTab} onValueChange={(val) => setReportTab(val as any)} className="w-fit mb-6">
        <TabsList>
          <TabsTrigger value="summary">
            <Users size={14} className="mr-2" /> Rekapitulasi Karyawan
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock size={14} className="mr-2" /> Log Harian Lengkap
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Standard StatCards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Total Karyawan"
          value={reportUsers.length}
          icon={Users}
          subValue={reportDept === 'all' ? 'Semua Dept' : reportDept}
          color="slate"
        />
        <StatCard
          label="Hadir Tepat"
          value={reportSummary.present}
          icon={CheckCircle2}
          subValue={`${reportOverallRate}% rate kehadiran`}
          color="emerald"
          status="on-track"
        />
        <StatCard
          label="Terlambat"
          value={reportSummary.late}
          icon={Clock}
          subValue={reportSummary.late > 0 ? "Lewat batas masuk" : "Nihil terlambat"}
          color="amber"
          status={reportSummary.late > 0 ? "at-risk" : undefined}
        />
        <StatCard
          label="Tanpa Log"
          value={reportSummary.missing}
          icon={XCircle}
          subValue="Belum ada presensi"
          color="rose"
          status={reportSummary.missing > 0 ? "at-risk" : undefined}
        />
        <StatCard
          label="Cuti & Izin"
          value={reportSummary.leave}
          icon={Calendar}
          subValue="Pengajuan disetujui"
          color="purple"
        />
        <StatCard
          label="Jam Kerja"
          value={formatMinutes(reportSummary.totalWork)}
          icon={Timer}
          subValue={`Lembur: ${formatMinutes(reportSummary.totalOT)}`}
          color="blue"
        />
      </div>

      {/* FILTER & PERIODE TOOLBAR (Standard Card) */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Filter size={16} className="text-primary" />
              Filter & Periode Kehadiran
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Periode: {reportStart} s/d {reportEnd} &bull; Menampilkan {reportTab === 'summary' ? `${reportRows.length} Karyawan` : `${filteredDailyRecords.length} Log Presensi`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 dark:bg-zinc-900/60 p-0.5">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'last7', label: '7 Hari Terakhir' },
                { id: 'thisMonth', label: 'Bulan Ini' },
                { id: 'lastMonth', label: 'Bulan Lalu' },
              ].map(p => {
                const isActive = activeDatePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDatePreset(p.id as any)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                      isActive
                        ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-zinc-800/80'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {(reportSearch || reportDept !== 'all' || reportSort !== 'name') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReportSearch('');
                  setReportDept('all');
                  setReportSort('name');
                }}
                className="h-8 px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <RotateCcw size={13} className="mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            {/* Dari Tanggal */}
            <div className="lg:col-span-2">
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dari Tanggal</Label>
              <Input
                type="date"
                value={reportStart}
                onChange={e => setReportStart(e.target.value)}
                className="h-9 text-xs font-medium border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 focus-visible:ring-primary dark:[color-scheme:dark]"
              />
            </div>

            {/* S/D Tanggal */}
            <div className="lg:col-span-2">
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sampai Tanggal</Label>
              <Input
                type="date"
                value={reportEnd}
                onChange={e => setReportEnd(e.target.value)}
                min={reportStart}
                className="h-9 text-xs font-medium border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 focus-visible:ring-primary dark:[color-scheme:dark]"
              />
            </div>

            {/* Cari Karyawan */}
            <div className="lg:col-span-4">
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cari Karyawan / Log</Label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  placeholder="Cari nama, jabatan, departemen..."
                  className="h-9 pl-8 pr-7 text-xs border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                />
                {reportSearch && (
                  <button
                    type="button"
                    onClick={() => setReportSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Departemen */}
            <div className="lg:col-span-2">
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Departemen</Label>
              <select
                value={reportDept}
                onChange={e => setReportDept(e.target.value)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Semua Departemen</option>
                {[...new Set(allUsers.map(u => u.department).filter(Boolean) as string[])].sort().map(dep => (
                  <option key={dep} value={dep} className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">{dep}</option>
                ))}
              </select>
            </div>

            {/* Urutkan */}
            <div className="lg:col-span-2">
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Urutkan</Label>
              <select
                value={reportSort}
                onChange={e => setReportSort(e.target.value as any)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="name" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Nama (A-Z)</option>
                <option value="present" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Hadir Terbanyak</option>
                <option value="late" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Terlambat Terbanyak</option>
                <option value="absent" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Absen Terbanyak</option>
                <option value="hours" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Jam Kerja Terbanyak</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VIEW 1: REKAPITULASI KARYAWAN (Standardized Card Data Table) */}
      {reportTab === 'summary' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Rekapitulasi Kehadiran Karyawan
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                Periode: {reportStart} s/d {reportEnd} &bull; {reportDept === 'all' ? 'Semua Departemen' : reportDept}
              </p>
            </div>
            {reportLoading && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <RefreshCw size={13} className="animate-spin text-primary dark:text-blue-400" /> Memuat data...
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {reportRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                  <FileText size={40} className="text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">Tidak ada data karyawan yang cocok</p>
                  <p className="text-xs text-muted-foreground">Silakan sesuaikan tanggal atau kata kunci pencarian</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[260px]">Karyawan</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead className="text-center">Kehadiran</TableHead>
                      <TableHead className="text-center">Hadir</TableHead>
                      <TableHead className="text-center">Terlambat</TableHead>
                      <TableHead className="text-center">Tanpa Log</TableHead>
                      <TableHead className="text-center">Cuti / Izin</TableHead>
                      <TableHead className="text-center">Total Hari</TableHead>
                      <TableHead className="text-center">Jam Kerja</TableHead>
                      <TableHead className="text-center">Lembur</TableHead>
                      <TableHead className="text-right">Detail Log</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportRows.map(row => {
                      const isExpanded = expandedUserId === String(row.user.id);
                      const dayLogs = reportRecords
                        .filter(r => String(r.user_id) === String(row.user.id))
                        .sort((a, b) => (a.date < b.date ? 1 : -1));
                      const userTotalDays = row.present + row.late + row.absent + row.missing + row.leave + row.holiday;
                      const userRate = userTotalDays > 0 ? Math.round(((row.present + row.late) / userTotalDays) * 100) : 0;

                      return (
                        <React.Fragment key={row.user.id}>
                          <TableRow className={cn('hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors', isExpanded && 'bg-muted/30 dark:bg-zinc-800/50')}>
                            {/* Karyawan */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  name={row.user.full_name || row.user.username || 'User'}
                                  url={row.user.avatar_url}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-foreground truncate">
                                    {row.user.full_name || row.user.username || 'Tanpa Nama'}
                                  </div>
                                  {row.user.job_title && (
                                    <div className="text-[11px] text-muted-foreground truncate">{row.user.job_title}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Departemen */}
                            <TableCell className="text-xs text-muted-foreground font-medium">
                              {row.user.department || '-'}
                            </TableCell>

                            {/* Tingkat Kehadiran Bar */}
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-bold tabular-nums text-foreground">{userRate}%</span>
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      userRate >= 80 ? 'bg-emerald-500' : userRate >= 50 ? 'bg-amber-500' : userRate > 0 ? 'bg-rose-500' : 'bg-muted-foreground/30'
                                    )}
                                    style={{ width: `${userRate}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            {/* Hadir */}
                            <TableCell className="text-center">
                              {row.present > 0 ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 tabular-nums text-xs font-bold">
                                  {row.present}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Terlambat */}
                            <TableCell className="text-center">
                              {row.late > 0 ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 tabular-nums text-xs font-bold">
                                  {row.late}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Tanpa Log */}
                            <TableCell className="text-center">
                              {row.missing > 0 ? (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 tabular-nums text-xs font-bold">
                                  {row.missing}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Cuti / Izin */}
                            <TableCell className="text-center">
                              {row.leave > 0 ? (
                                <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 tabular-nums text-xs font-bold">
                                  {row.leave}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Total Hari */}
                            <TableCell className="text-center tabular-nums text-xs font-semibold text-muted-foreground">
                              {userTotalDays}
                            </TableCell>

                            {/* Jam Kerja */}
                            <TableCell className="text-center tabular-nums text-xs font-bold text-foreground">
                              {formatMinutes(row.totalWork)}
                            </TableCell>

                            {/* Lembur */}
                            <TableCell className="text-center tabular-nums text-xs">
                              {row.totalOT > 0 ? (
                                <span className="font-bold text-blue-500">{formatMinutes(row.totalOT)}</span>
                              ) : (
                                <span className="text-muted-foreground/40">-</span>
                              )}
                            </TableCell>

                            {/* Detail Button */}
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedUserId(isExpanded ? null : String(row.user.id))}
                                className={cn(
                                  'h-7 gap-1 px-2.5 text-xs font-semibold rounded-lg transition-colors',
                                  isExpanded
                                    ? 'bg-primary dark:bg-blue-600 text-primary-foreground hover:bg-primary/90'
                                    : 'bg-muted/40 text-foreground hover:bg-muted'
                                )}
                              >
                                <span>{dayLogs.length} Log</span>
                                <ChevronDown size={13} className={cn('transition-transform duration-200', isExpanded && 'rotate-180')} />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Drawer: Log Harian Karyawan */}
                          {isExpanded && (
                            <TableRow className="border-b border-border/30 bg-muted/20 dark:bg-zinc-950/40">
                              <TableCell colSpan={11} className="p-3 sm:p-4">
                                <div className="overflow-hidden rounded-xl border border-border/50 dark:border-zinc-800 bg-card/60 dark:bg-zinc-950/70 shadow-2xs">
                                  {/* Banner */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/40 dark:bg-zinc-900/60 px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <UserAvatar
                                        name={row.user.full_name || row.user.username || 'User'}
                                        url={row.user.avatar_url}
                                        size="xs"
                                      />
                                      <span className="text-xs font-bold text-foreground">
                                        Riwayat Absensi: {row.user.full_name || row.user.username}
                                      </span>
                                      <Badge variant="secondary" className="text-[10px] font-semibold">
                                        {dayLogs.length} Hari Tercatat
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span>Total Efektif: <strong className="font-bold text-foreground">{formatMinutes(row.totalWork)}</strong></span>
                                      {row.totalOT > 0 && <span>Lembur: <strong className="font-bold text-blue-500">{formatMinutes(row.totalOT)}</strong></span>}
                                    </div>
                                  </div>

                                  {/* Sub-table */}
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent bg-muted/20 dark:bg-zinc-900/40">
                                          <TableHead className="text-[10px] uppercase font-semibold">Tanggal</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Bukti Foto</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Clock In</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Clock Out</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Lokasi Masuk</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Lokasi Pulang</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Durasi</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Lembur</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {dayLogs.length === 0 ? (
                                          <TableRow>
                                            <TableCell colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                                              Belum ada riwayat absensi untuk karyawan ini pada periode yang dipilih
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          dayLogs.map((r, i) => (
                                            <TableRow key={i} className="hover:bg-muted/30 dark:hover:bg-zinc-900/30">
                                              <TableCell className="text-xs font-semibold text-foreground">
                                                {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                              </TableCell>
                                              <TableCell>
                                                {r.photo_url ? (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setViewAttendancePhoto(r.photo_url || null); }}
                                                    className="group relative block h-10 w-14 overflow-hidden rounded-lg border border-border/60 bg-muted shadow-2xs hover:border-primary transition-all"
                                                  >
                                                    <img src={r.photo_url} alt="Bukti absensi" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110" />
                                                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[8px] font-bold text-white">Lihat</span>
                                                  </button>
                                                ) : (
                                                  <span className="text-[11px] text-muted-foreground/60 italic">Tidak ada foto</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-xs font-medium text-foreground">
                                                {r.clock_in ? (
                                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Sunrise size={11} /> {formatTime(r.clock_in)}
                                                  </span>
                                                ) : '-'}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-xs font-medium text-foreground">
                                                {r.clock_out ? (
                                                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                                    <Sunset size={11} /> {formatTime(r.clock_out)}
                                                  </span>
                                                ) : (
                                                  <span className="text-muted-foreground/60 text-[11px]">Belum pul</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs text-muted-foreground">
                                                <div className="font-medium text-foreground">{nearestOfficeLabel(r.clock_in_lat, r.clock_in_lng)}</div>
                                                {mapsLink(r.clock_in_lat, r.clock_in_lng) && (
                                                  <a
                                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-500 hover:underline"
                                                    href={mapsLink(r.clock_in_lat, r.clock_in_lng)!}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                  >
                                                    <MapPin size={10} /> Titik GPS
                                                  </a>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs text-muted-foreground">
                                                <div className="font-medium text-foreground">{nearestOfficeLabel(r.clock_out_lat, r.clock_out_lng)}</div>
                                                {mapsLink(r.clock_out_lat, r.clock_out_lng) && (
                                                  <a
                                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-500 hover:underline"
                                                    href={mapsLink(r.clock_out_lat, r.clock_out_lng)!}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                  >
                                                    <MapPin size={10} /> Titik GPS
                                                  </a>
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-xs font-semibold text-foreground">
                                                {formatMinutes(r.total_work_minutes)}
                                              </TableCell>
                                              <TableCell className={cn('tabular-nums text-xs', r.total_overtime_minutes ? 'font-bold text-blue-500' : 'text-muted-foreground/50')}>
                                                {formatMinutes(r.total_overtime_minutes)}
                                              </TableCell>
                                              <TableCell>{renderStatusBadge(r.status)}</TableCell>
                                            </TableRow>
                                          ))
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* VIEW 2: LOG HARIAN LENGKAP (Standardized Card Data Table) */}
      {reportTab === 'logs' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Seluruh Log Harian Terverifikasi
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                Kronologis presensi dari {reportStart} s/d {reportEnd}
              </p>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'present', label: 'Hadir' },
                { id: 'late', label: 'Terlambat' },
                { id: 'leave', label: 'Cuti / Izin' },
                { id: 'absent', label: 'Absen' },
              ].map(st => {
                const isActive = reportLogStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setReportLogStatus(st.id)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                      isActive
                        ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                        : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                    )}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {filteredDailyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                  <FileText size={40} className="text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">Tidak ada log absensi ditemukan</p>
                  <p className="text-xs text-muted-foreground">Silakan ubah rentang tanggal atau filter status absensi</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[140px]">Tanggal</TableHead>
                      <TableHead>Karyawan</TableHead>
                      <TableHead className="text-center">Clock In</TableHead>
                      <TableHead className="text-center">Clock Out</TableHead>
                      <TableHead className="text-center">Durasi</TableHead>
                      <TableHead className="text-center">Lembur</TableHead>
                      <TableHead>Lokasi Presensi</TableHead>
                      <TableHead className="text-center">Bukti Foto</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyRecords.map((r, idx) => {
                      const u = userMap.get(String(r.user_id));
                      return (
                        <TableRow key={r.id || idx} className="hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors">
                          <TableCell className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                name={u?.full_name || u?.username || 'User'}
                                url={u?.avatar_url}
                                size="sm"
                              />
                              <div>
                                <div className="text-xs font-semibold text-foreground">{u?.full_name || u?.username || 'Tanpa Nama'}</div>
                                <div className="text-[10px] text-muted-foreground">{u?.department || '-'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-medium text-foreground">
                            {r.clock_in ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Sunrise size={11} /> {formatTime(r.clock_in)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-medium text-foreground">
                            {r.clock_out ? (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                <Sunset size={11} /> {formatTime(r.clock_out)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-[11px]">Belum pul</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-semibold text-foreground">
                            {formatMinutes(r.total_work_minutes)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs">
                            {r.total_overtime_minutes ? (
                              <span className="font-bold text-blue-500">{formatMinutes(r.total_overtime_minutes)}</span>
                            ) : (
                              <span className="text-muted-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                            <div className="font-medium text-foreground truncate">{nearestOfficeLabel(r.clock_in_lat, r.clock_in_lng)}</div>
                            {mapsLink(r.clock_in_lat, r.clock_in_lng) && (
                              <a
                                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-500 hover:underline"
                                href={mapsLink(r.clock_in_lat, r.clock_in_lng)!}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MapPin size={10} /> Titik GPS
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.photo_url ? (
                              <button
                                type="button"
                                onClick={() => setViewAttendancePhoto(r.photo_url || null)}
                                className="group relative inline-block h-9 w-12 overflow-hidden rounded-md border border-border/50 bg-muted shadow-2xs hover:border-primary transition-all"
                              >
                                <img src={r.photo_url} alt="Bukti" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110" />
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[7px] font-bold text-white">Lihat</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {renderStatusBadge(r.status)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const activeUsers = useMemo(() => {
    const filtered = deptFilter === 'all'
      ? allUsers
      : allUsers.filter(u => u.department === deptFilter);
    return filtered.filter(u => u.status !== 'Inactive');
  }, [allUsers, deptFilter]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = allRecords.filter(r => r.date === today);
    const userIds = new Set(activeUsers.map(u => String(u.id)));
    const ts = todayRecords.filter(r => userIds.has(String(r.user_id)));
    const present = ts.filter(r => r.status === 'present').length;
    const late = ts.filter(r => r.status === 'late').length;
    const leave = ts.filter(r => r.status === 'leave').length;
    const absent = ts.filter(r => r.status === 'absent').length;
    const notYet = activeUsers.length - ts.length;
    return { present, late, leave, absent, notYet, total: activeUsers.length };
  }, [allRecords, activeUsers]);

  const managerStats = useMemo(() => {
    const [y, m] = historyMonth.split('-').map(Number);
    const monthRecords = allRecords.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const leave = monthRecords.filter(r => r.status === 'leave').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const totalWork = monthRecords.reduce((sum, r) => sum + (r.total_work_minutes || 0), 0);
    const totalOT = monthRecords.reduce((sum, r) => sum + (r.total_overtime_minutes || 0), 0);
    return { present, late, leave, absent, totalWork, totalOT, total: monthRecords.length };
  }, [allRecords, historyMonth]);

  // ── Request scope filters (dept & company) ──────────────────────────

  const requestDeptOptions = useMemo(() =>
    Array.from(new Set(allUsers.map(u => u.department).filter(Boolean) as string[])).sort(),
    [allUsers]);

  const requestCompanyOptions = useMemo(() =>
    Array.from(new Set(allUsers.map(u => u.company).filter(Boolean) as string[])).sort(),
    [allUsers]);

  const matchesRequestScope = useCallback((reqUserId: string) => {
    const u = userMap.get(String(reqUserId));
    if (requestDept !== 'all' && u?.department !== requestDept) return false;
    if (requestCompany !== 'all' && u?.company !== requestCompany) return false;
    return true;
  }, [requestDept, requestCompany, userMap]);

  const scopedLeave = useMemo(() => leaveRequests.filter(l => matchesRequestScope(l.user_id)), [leaveRequests, matchesRequestScope]);
  const scopedOvertime = useMemo(() => overtimeRequests.filter(o => matchesRequestScope(o.user_id)), [overtimeRequests, matchesRequestScope]);
  const scopedReimb = useMemo(() => reimbursements.filter(r => matchesRequestScope(r.user_id)), [reimbursements, matchesRequestScope]);

  const getRequestEmployeeName = useCallback((reqUserId: string) => {
    const u = userMap.get(String(reqUserId));
    return u?.full_name || u?.username || reqUserId;
  }, [userMap]);

  const exportCSV = () => {
    const rows = allRecords.slice(0, 2000).map(r => {
      const u = userMap.get(r.user_id);
      return {
        Tanggal: r.date,
        Nama: u?.full_name || 'Unknown',
        Departemen: u?.department || '',
        'Clock In': formatTime(r.clock_in),
        'Clock Out': r.clock_out ? formatTime(r.clock_out) : '-',
        Durasi: formatMinutes(r.total_work_minutes),
        Lembur: formatMinutes(r.total_overtime_minutes),
        Status: STATUS_CONFIG[r.status]?.label || r.status,
      };
    });
    if (rows.length === 0) {
      alert('Belum ada data untuk diexport');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`.replace(/"/g, '""')).join(',')),
    ].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-absensi-${historyMonth}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const renderHRDashboard = () => (
    <div className="flex flex-col gap-4 p-3 sm:p-5">
          {/* Header: Dept filter + export */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white"><Users size={18} /></div><div><p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Human Resources</p><h3 className="text-xl font-medium tracking-[-0.04em] text-slate-950">Good morning, HR Team</h3></div></div>
                    <p className="mt-0.5 text-[12px] text-slate-500">
            {new Date(historyMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} · {activeUsers.length} karyawan aktif
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="h-9 flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all" className="text-slate-900">Semua Departemen</option>
            {deptOptions.map(dep => (
              <option key={dep} value={dep} className="text-slate-900">{dep}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onPress={exportCSV} className="gap-1.5 h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* HR overview KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Employees', value: activeUsers.length, note: 'Active workforce', icon: <Users size={18} />, tone: 'bg-slate-100 text-slate-900' },
          { label: 'Attendance Today', value: todayStats.present + todayStats.late, note: `${todayStats.present} on time · ${todayStats.late} late`, icon: <CheckCircle2 size={18} />, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'On Leave', value: todayStats.leave, note: 'Approved leave today', icon: <Calendar size={18} />, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Pending Requests', value: leaveRequests.filter(r => String(r.status).toLowerCase() === 'pending').length + overtimeRequests.filter(r => String(r.status).toLowerCase() === 'pending').length, note: 'Need HR review', icon: <Clock size={18} />, tone: 'bg-orange-50 text-orange-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>{item.icon}</span><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">HR</span></div>
            <div className="mt-5 text-3xl font-medium tracking-[-0.05em] text-slate-950">{item.value}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{item.label}</div><div className="mt-1 text-xs text-slate-400">{item.note}</div>
          </div>
        ))}
      </div>

      {/* Today's Stat Cards */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Karyawan', value: todayStats.total, icon: <Users size={14} />, bg: 'bg-slate-100', text: 'text-slate-700' },
          { label: 'Hadir', value: todayStats.present, icon: <CheckCircle2 size={14} />, bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
          { label: 'Terlambat', value: todayStats.late, icon: <AlertTriangle size={14} />, bg: 'bg-amber-500/10', text: 'text-amber-600' },
          { label: 'Cuti/Izin', value: todayStats.leave, icon: <Calendar size={14} />, bg: 'bg-violet-500/10', text: 'text-violet-600' },
          { label: 'Belum Absen', value: todayStats.notYet, icon: <Clock size={14} />, bg: 'bg-orange-500/10', text: 'text-orange-600' },
          { label: 'Tidak Hadir', value: todayStats.absent, icon: <XCircle size={14} />, bg: 'bg-red-500/10', text: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-1.5">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', s.bg, s.text)}>{s.icon}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">{s.label}</span>
            </div>
            <div className="mt-2 text-[22px] font-extrabold tabular-nums tracking-[-0.02em] text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Summary: 4 stat bulan ini */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          { label: 'Hadir Bulan Ini', value: managerStats.present, gradient: 'from-emerald-500 to-emerald-400', icon: <CheckCircle2 size={14} /> },
          { label: 'Terlambat', value: managerStats.late, gradient: 'from-amber-500 to-amber-400', icon: <AlertTriangle size={14} /> },
          { label: 'Cuti/Izin', value: managerStats.leave, gradient: 'from-violet-500 to-violet-400', icon: <Calendar size={14} /> },
          { label: 'Total Jam Kerja', value: formatMinutes(managerStats.totalWork), gradient: 'from-[#103065] to-[#173E77]', icon: <Timer size={14} /> },
        ].map((s, i) => (
          <div key={i} className={cn('rounded-xl p-3.5 text-white shadow-sm transition-all hover:shadow-md bg-gradient-to-br', s.gradient)}>
            <div className="flex items-center gap-1.5 text-white/70">
              {s.icon}
              <span className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="mt-1.5 text-[22px] font-extrabold tabular-nums tracking-[-0.02em]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Visual overview */}
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Distribusi Kehadiran</h3><p className="mt-0.5 text-[11px] text-slate-400">Status karyawan hari ini</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Live</span></div>
            <div className="mt-5 flex h-32 items-end gap-2 sm:gap-4">
              {[{ label: 'Hadir', value: todayStats.present, color: 'bg-emerald-500' }, { label: 'Terlambat', value: todayStats.late, color: 'bg-amber-400' }, { label: 'Cuti/Izin', value: todayStats.leave, color: 'bg-violet-500' }, { label: 'Belum Absen', value: todayStats.notYet, color: 'bg-slate-300' }, { label: 'Tidak Hadir', value: todayStats.absent, color: 'bg-rose-500' }].map(item => { const max = Math.max(todayStats.total, 1); return <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-xs font-bold tabular-nums text-slate-700">{item.value}</span><div className="flex h-24 w-full items-end rounded-lg bg-slate-50"><div className={cn('w-full rounded-lg transition-all', item.color)} style={{ height: `${Math.max(item.value / max * 100, item.value ? 8 : 2)}%` }} /></div><span className="w-full truncate text-center text-[9px] font-semibold text-slate-400">{item.label}</span></div> })}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="p-4 sm:p-5"><h3 className="text-sm font-bold text-slate-900">Ringkasan Bulanan</h3><p className="mt-0.5 text-[11px] text-slate-400">Performa bulan berjalan</p><div className="mt-5 space-y-4">{[{ label: 'Hadir', value: managerStats.present, color: 'bg-emerald-500' }, { label: 'Terlambat', value: managerStats.late, color: 'bg-amber-400' }, { label: 'Cuti/Izin', value: managerStats.leave, color: 'bg-violet-500' }].map(item => { const total = Math.max(managerStats.present + managerStats.late + managerStats.leave, 1); return <div key={item.label}><div className="mb-1.5 flex justify-between text-[11px]"><span className="font-medium text-slate-500">{item.label}</span><span className="font-bold tabular-nums text-slate-700">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', item.color)} style={{ width: `${Math.min(item.value / total * 100, 100)}%` }} /></div></div> })}</div></CardContent></Card>
      </div>

      {/* Today Table: all employees */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[13px] font-bold tracking-[-0.01em] text-slate-900">Kehadiran Hari Ini</span>
            <div className="text-[11px] text-slate-400">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-slate-500">Live</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Karyawan</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Departemen</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Clock In</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Clock Out</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Durasi</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-slate-400">Tidak ada karyawan aktif</TableCell></TableRow>
              ) : (
                activeUsers.map(u => {
                  const today = new Date().toISOString().split('T')[0];
                  const rec = allRecords.find(r => String(r.user_id) === String(u.id) && r.date === today);
                  const isPresent = rec && (rec.status === 'present' || rec.status === 'late');
                  return (
                    <TableRow key={u.id} className={cn('border-b border-slate-100 transition-colors', isPresent ? 'hover:bg-emerald-50/30' : 'hover:bg-slate-50/50')}>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                            isPresent ? 'bg-gradient-to-br from-[#103065] to-[#173E77]' : 'bg-slate-300'
                          )}>
                            {(u.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-slate-800">{u.full_name || u.username || 'Tanpa Nama'}</div>
                            {u.job_title && <div className="text-[10px] text-slate-400">{u.job_title}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-slate-500">{u.department || '-'}</TableCell>
                      <TableCell className="tabular-nums text-[12px] text-slate-600">{rec ? formatTime(rec.clock_in) : <span className="text-slate-300">—</span>}</TableCell>
                      <TableCell className="tabular-nums text-[12px] text-slate-600">{rec?.clock_out ? formatTime(rec.clock_out) : <span className="text-slate-300">—</span>}</TableCell>
                      <TableCell className="tabular-nums text-[12px] font-semibold text-slate-600">{rec ? formatMinutes(rec.total_work_minutes) : <span className="text-slate-300">—</span>}</TableCell>
                      <TableCell>
                        {rec ? renderStatusBadge(rec.status) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[11px]">Belum Absen</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  // ── Leave Requests View ────────────────────────────────────────────────

  const renderLeave = () => {
    const s = scopedLeave;
    const filtered = requestFilter === 'all' ? s
      : requestFilter === 'pending' ? s.filter(l => isPendingApprovalStatus(l.status))
      : s.filter(l => l.status === requestFilter);
    const pendingCount = s.filter(l => isPendingApprovalStatus(l.status)).length;

    const renderApprovalHistory = (req: LeaveRequest) => {
      const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
      if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
      if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
      if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
      if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
      if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
      if (steps.length === 0) return null;
      return (
        <div className="mt-1 space-y-0.5">
          {steps.map((st, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground/80">{st.label}:</span> {st.by}
            </div>
          ))}
        </div>
      );
    };

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {/* Toolbar Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              Daftar Pengajuan Cuti &amp; Izin
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              {filtered.length} pengajuan cuti &bull; Menunggu persetujuan: {pendingCount}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'all', label: 'Semua', count: s.length },
              { id: 'pending', label: 'Menunggu', count: pendingCount },
              { id: 'approved', label: 'Disetujui', count: s.filter(l => l.status === 'approved').length },
              { id: 'rejected', label: 'Ditolak', count: s.filter(l => l.status === 'rejected').length },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setRequestFilter(f.id as any)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                  requestFilter === f.id
                    ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                    : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                )}
              >
                {f.label}
                <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <FileText size={36} className="opacity-30" />
              <p className="text-sm font-semibold text-foreground">Belum ada pengajuan cuti</p>
              <p className="text-xs text-muted-foreground">Tidak ada permohonan yang sesuai filter saat ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isApprover && <TableHead className="w-[240px]">Karyawan</TableHead>}
                    <TableHead>Jenis Cuti</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead className="min-w-[200px]">Alasan</TableHead>
                    <TableHead>Diajukan</TableHead>
                    <TableHead>Status</TableHead>
                    {isApprover && <TableHead className="text-right pr-4">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => {
                    const typeInfo = LEAVE_TYPES.find(t => t.id === req.leave_type);
                    const days = Math.ceil((new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / 86400000) + 1;
                    const showApprove = isApprover && canApproveRequest(req.user_id, req.status);
                    const showReject = isApprover && canRejectRequest(req.user_id, req.status);
                    const empName = getRequestEmployeeName(req.user_id);
                    const empAvatar = userMap.get(String(req.user_id))?.avatar_url;
                    const empDept = userMap.get(String(req.user_id))?.department || '—';

                    return (
                      <TableRow
                        key={req.id}
                        onClick={() => setViewRequest({ kind: (req as any).amount != null ? 'reimbursement' : (req as any).leave_type != null ? 'cuti' : 'lembur', req })}
                        className="cursor-pointer hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {isApprover && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={empName} url={empAvatar} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">{empName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{empDept}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm', typeInfo?.badge || 'bg-muted')}>
                              {typeInfo?.icon || '📝'}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{typeInfo?.label || req.leave_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-foreground/80 whitespace-nowrap">
                          {new Date(req.start_date).toLocaleDateString('id-ID')}
                          <span className="mx-1 text-muted-foreground">—</span>
                          {new Date(req.end_date).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border/60 bg-muted/40 text-foreground text-xs font-semibold">
                            {days} hari
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground" title={req.reason}>
                          {req.reason}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                          {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(req.status)}
                          {req.status === 'rejected' && req.rejection_reason && (
                            <div className="text-[10px] text-rose-500 mt-0.5 max-w-[160px] truncate">{req.rejection_reason}</div>
                          )}
                          {renderApprovalHistory(req)}
                        </TableCell>
                        {isApprover && (
                          <TableCell className="text-right pr-4">
                            {showApprove || showReject ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {showApprove && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleApproveLeave(req); }}
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    title="Setujui Cuti"
                                  >
                                    <Check size={12} className="mr-1" /> Setujui
                                  </Button>
                                )}
                                {showReject && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); handleRejectRequest('leave_requests', req.id); }}
                                    className="h-7 px-2.5 text-xs font-semibold"
                                    title="Tolak Cuti"
                                  >
                                    <X size={12} className="mr-1" /> Tolak
                                  </Button>
                                )}
                              </div>
                            ) : req.status === 'rejected' ? (
                              <span className="text-xs text-rose-500 font-semibold">Ditolak</span>
                            ) : req.status === 'approved' ? (
                              <span className="text-xs text-emerald-500 font-semibold">Selesai</span>
                            ) : isRequester(req.user_id) ? (
                              <span className="text-xs text-amber-500 font-medium">Menunggu {getApproverName(req.user_id, req.status)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                {req.approved_by ? `oleh ${req.approved_by}` : '—'}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Overtime Requests View ─────────────────────────────────────────────

  const renderOvertime = () => {
    const s = scopedOvertime;
    const filtered = requestFilter === 'all' ? s
      : requestFilter === 'pending' ? s.filter(o => isPendingApprovalStatus(o.status))
      : s.filter(o => o.status === requestFilter);
    const pendingCount = s.filter(o => isPendingApprovalStatus(o.status)).length;

    const renderApprovalHistory = (req: OvertimeRequest) => {
      const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
      if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
      if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
      if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
      if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
      if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
      if (steps.length === 0) return null;
      return (
        <div className="mt-1 space-y-0.5">
          {steps.map((st, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground/80">{st.label}:</span> {st.by}
            </div>
          ))}
        </div>
      );
    };

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {/* Toolbar Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Timer size={16} className="text-primary" />
              Daftar Pengajuan Lembur
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              {filtered.length} pengajuan lembur &bull; Menunggu persetujuan: {pendingCount}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'all', label: 'Semua', count: s.length },
              { id: 'pending', label: 'Menunggu', count: pendingCount },
              { id: 'approved', label: 'Disetujui', count: s.filter(o => o.status === 'approved').length },
              { id: 'rejected', label: 'Ditolak', count: s.filter(o => o.status === 'rejected').length },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setRequestFilter(f.id as any)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                  requestFilter === f.id
                    ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                    : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                )}
              >
                {f.label}
                <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Timer size={36} className="opacity-30" />
              <p className="text-sm font-semibold text-foreground">Belum ada pengajuan lembur</p>
              <p className="text-xs text-muted-foreground">Tidak ada permohonan yang sesuai filter saat ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isApprover && <TableHead className="w-[240px]">Karyawan</TableHead>}
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead className="min-w-[200px]">Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    {isApprover && <TableHead className="text-right pr-4">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => {
                    const showApprove = isApprover && canApproveRequest(req.user_id, req.status);
                    const showReject = isApprover && canRejectRequest(req.user_id, req.status);
                    const empName = getRequestEmployeeName(req.user_id);
                    const empAvatar = userMap.get(String(req.user_id))?.avatar_url;
                    const empDept = userMap.get(String(req.user_id))?.department || '—';

                    return (
                      <TableRow
                        key={req.id}
                        onClick={() => setViewRequest({ kind: (req as any).amount != null ? 'reimbursement' : (req as any).leave_type != null ? 'cuti' : 'lembur', req })}
                        className="cursor-pointer hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {isApprover && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={empName} url={empAvatar} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">{empName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{empDept}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {new Date(req.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-foreground/80 whitespace-nowrap">
                          {req.start_time} — {req.end_time}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            {formatMinutes(req.duration_minutes)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.project_or_task ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              <Briefcase size={11} /> {req.project_or_task}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground" title={req.reason}>
                          {req.reason}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(req.status)}
                          {req.status === 'rejected' && req.rejection_reason && (
                            <div className="text-[10px] text-rose-500 mt-0.5 max-w-[160px] truncate">{req.rejection_reason}</div>
                          )}
                          {renderApprovalHistory(req)}
                        </TableCell>
                        {isApprover && (
                          <TableCell className="text-right pr-4">
                            {showApprove || showReject ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {showApprove && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleApproveOvertime(req); }}
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    title="Setujui Lembur"
                                  >
                                    <Check size={12} className="mr-1" /> Setujui
                                  </Button>
                                )}
                                {showReject && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); handleRejectRequest('overtime_requests', req.id); }}
                                    className="h-7 px-2.5 text-xs font-semibold"
                                    title="Tolak Lembur"
                                  >
                                    <X size={12} className="mr-1" /> Tolak
                                  </Button>
                                )}
                              </div>
                            ) : req.status === 'rejected' ? (
                              <span className="text-xs text-rose-500 font-semibold">Ditolak</span>
                            ) : req.status === 'approved' ? (
                              <span className="text-xs text-emerald-500 font-semibold">Selesai</span>
                            ) : isRequester(req.user_id) ? (
                              <span className="text-xs text-amber-500 font-medium">Menunggu {getApproverName(req.user_id, req.status)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                {req.approved_by ? `oleh ${req.approved_by}` : '—'}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Reimbursement Render ──────────────────────────────────────────────

  const renderReimbursement = () => {
    const s = scopedReimb;
    const filtered = s.filter(r => {
      if (reimbCategory !== 'all' && r.category !== reimbCategory) return false;
      if (reimbFilter === 'all') return true;
      if (reimbFilter === 'pending') return isPendingApprovalStatus(r.status);
      return r.status === reimbFilter;
    });
    const catCount = (c: string) => (c === 'all' ? s.length : s.filter(r => r.category === c).length);
    const pendingCount = s.filter(r => isPendingApprovalStatus(r.status)).length;

    const renderApprovalHistory = (req: ReimbursementRequest) => {
      const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
      if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
      if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
      if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
      if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
      if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
      if (steps.length === 0) return null;
      return (
        <div className="mt-1 space-y-0.5">
          {steps.map((st, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground/80">{st.label}:</span> {st.by}
            </div>
          ))}
        </div>
      );
    };

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <CardHeader className="flex flex-col gap-3 pb-4 border-b border-border/40 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                Daftar Pengajuan Reimbursement
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                {filtered.length} pengajuan klaim &bull; Menunggu persetujuan: {pendingCount}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { id: 'all', label: 'Semua', count: s.length },
                { id: 'pending', label: 'Menunggu', count: pendingCount },
                { id: 'approved', label: 'Disetujui', count: s.filter(r => r.status === 'approved').length },
                { id: 'rejected', label: 'Ditolak', count: s.filter(r => r.status === 'rejected').length },
                { id: 'paid', label: 'Dibayar', count: s.filter(r => r.status === 'paid').length },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setReimbFilter(f.id as any)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    reimbFilter === f.id
                      ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                      : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                  )}
                >
                  {f.label}
                  <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
            {[{ id: 'all', label: 'Semua Kategori', icon: null }, ...REIMBURSEMENT_TYPES].map(c => (
              <button
                key={c.id}
                onClick={() => setReimbCategory(c.id)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                  reimbCategory === c.id
                    ? 'bg-primary/10 text-primary border border-primary/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {c.label}
                <span className="text-[10px] opacity-70">({catCount(c.id)})</span>
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Wallet size={36} className="opacity-30" />
              <p className="text-sm font-semibold text-foreground">Belum ada pengajuan reimbursement</p>
              <p className="text-xs text-muted-foreground">Tidak ada klaim yang sesuai filter saat ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isApprover && <TableHead className="w-[240px]">Karyawan</TableHead>}
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="min-w-[200px]">Deskripsi</TableHead>
                    <TableHead>Jumlah (Rp)</TableHead>
                    <TableHead>Status</TableHead>
                    {isApprover && <TableHead className="text-right pr-4">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(req => {
                    const typeInfo = getReimbType(req.category);
                    const showApprove = isApprover && canApproveRequest(req.user_id, req.status);
                    const showReject = isApprover && canRejectRequest(req.user_id, req.status);
                    const empName = getRequestEmployeeName(req.user_id);
                    const empAvatar = userMap.get(String(req.user_id))?.avatar_url;
                    const empDept = userMap.get(String(req.user_id))?.department || '—';

                    return (
                      <TableRow
                        key={req.id}
                        onClick={() => setViewRequest({ kind: (req as any).amount != null ? 'reimbursement' : (req as any).leave_type != null ? 'cuti' : 'lembur', req })}
                        className="cursor-pointer hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {isApprover && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={empName} url={empAvatar} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">{empName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{empDept}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60', typeInfo?.color)}>
                              {typeInfo?.icon}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{typeInfo?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-foreground/80 whitespace-nowrap">
                          {req.date ? new Date(req.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground" title={req.description}>
                          {req.description}
                        </TableCell>
                        <TableCell className="text-xs font-bold tabular-nums text-foreground whitespace-nowrap">
                          Rp {Number(req.amount).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(req.status)}
                          {req.status === 'rejected' && req.rejection_reason && (
                            <div className="text-[10px] text-rose-500 mt-0.5 max-w-[160px] truncate">{req.rejection_reason}</div>
                          )}
                          {renderApprovalHistory(req)}
                        </TableCell>
                        {isApprover && (
                          <TableCell className="text-right pr-4">
                            {showApprove || showReject ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {showApprove && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleApproveReimbursement(req); }}
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    title="Setujui Reimbursement"
                                  >
                                    <Check size={12} className="mr-1" /> Setujui
                                  </Button>
                                )}
                                {showReject && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); handleRejectRequest('reimbursements', req.id); }}
                                    className="h-7 px-2.5 text-xs font-semibold"
                                    title="Tolak Reimbursement"
                                  >
                                    <X size={12} className="mr-1" /> Tolak
                                  </Button>
                                )}
                              </div>
                            ) : req.status === 'approved' && isApprover ? (
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleMarkPaid(req.id); }}
                                className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                title="Tandai Sudah Dibayar"
                              >
                                <Check size={12} className="mr-1" /> Bayar
                              </Button>
                            ) : req.status === 'rejected' ? (
                              <span className="text-xs text-rose-500 font-semibold">Ditolak</span>
                            ) : req.status === 'paid' ? (
                              <span className="text-xs text-blue-500 font-semibold">Selesai</span>
                            ) : isRequester(req.user_id) ? (
                              <span className="text-xs text-amber-500 font-medium">Menunggu {getApproverName(req.user_id, req.status)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                {req.approved_by ? `oleh ${req.approved_by}` : '—'}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleAttendanceCorrectionDecision = async (request: any, status: 'approved' | 'rejected') => {
    const { data, error } = await supabase.rpc('review_attendance_correction_request', {
      p_request_id: request.id,
      p_status: status,
      p_reviewer_note: null,
    });
    if (error) { toast.error(error.message); return; }
    if (data) setAttendanceCorrections(rows => rows.map(row => row.id === data.id ? data : row));
    toast.success(status === 'approved' ? 'Request absen disetujui dan data attendance dibuat.' : 'Request absen ditolak.');
  };

  const renderAttendanceCorrections = () => {
    const scopedCorrections = attendanceCorrections.filter(row => matchesRequestScope(row.user_id));
    const pending = scopedCorrections.filter(row => row.status === 'pending');

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Request Absen
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Pengajuan lupa absen atau koreksi presensi karyawan
            </p>
          </div>
          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
            {pending.length} Menunggu
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {scopedCorrections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <Clock size={36} className="opacity-30" />
                <p className="text-sm font-semibold text-foreground">Belum ada request absen</p>
                <p className="text-xs text-muted-foreground">Tidak ada permohonan koreksi absensi saat ini</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[240px]">Karyawan</TableHead>
                    <TableHead>Tanggal Absen</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                    <TableHead className="min-w-[200px]">Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedCorrections.map(row => {
                    const employee = allUsers.find(u => String(u.id) === String(row.user_id));
                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={employee?.full_name || employee?.username || String(row.user_id)}
                              url={employee?.avatar_url}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate">{employee?.full_name || employee?.username || row.user_id}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{employee?.department || '—'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                          {row.attendance_date}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {row.clock_in_time ? new Date(row.clock_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {row.clock_out_time ? new Date(row.clock_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={row.reason}>
                          {row.reason}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(row.status)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {row.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleAttendanceCorrectionDecision(row, 'approved')}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                <Check size={12} className="mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAttendanceCorrectionDecision(row, 'rejected')}
                                className="h-7 px-2.5 text-xs font-semibold"
                              >
                                <X size={12} className="mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold uppercase text-muted-foreground">{row.status}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Request (combined: Leave, OT, Reimb) ───────────────────────────

  const renderRequest = () => {
    const scopedCorrections = attendanceCorrections.filter(row => matchesRequestScope(row.user_id));
    const tabs = [
      { id: 'attendance_correction' as const, label: 'Request Absen', icon: <Clock size={14} />, count: attendanceCorrections.filter(r => r.status === 'pending' && matchesRequestScope(r.user_id)).length },
      { id: 'leave' as const, label: 'Cuti / Izin', icon: <Calendar size={14} />, count: scopedLeave.filter(l => isPendingApprovalStatus(l.status)).length },
      { id: 'overtime' as const, label: 'Lembur', icon: <Timer size={14} />, count: scopedOvertime.filter(o => isPendingApprovalStatus(o.status)).length },
      { id: 'reimbursement' as const, label: 'Reimbursement', icon: <Wallet size={14} />, count: scopedReimb.filter(r => isPendingApprovalStatus(r.status)).length },
    ];

    const scopeLabel =
      (requestCompany !== 'all' ? requestCompany : 'Semua Perusahaan') +
      ' · ' +
      (requestDept !== 'all' ? requestDept : 'Semua Departemen');

    const totalScope = scopedCorrections.length + scopedLeave.length + scopedOvertime.length + scopedReimb.length;

    const summary = (() => {
      if (requestTab === 'attendance_correction') {
        return [
          { label: 'Total Request', value: attendanceCorrections.length, sub: 'lupa absen' },
          { label: 'Menunggu', value: attendanceCorrections.filter(x => x.status === 'pending').length, sub: 'perlu approval' },
          { label: 'Disetujui', value: attendanceCorrections.filter(x => x.status === 'approved').length, sub: 'request approved' },
          { label: 'Ditolak', value: attendanceCorrections.filter(x => x.status === 'rejected').length, sub: 'request rejected' },
        ];
      }
      if (requestTab === 'leave') {
        const s = scopedLeave;
        return [
          { label: 'Total Pengajuan', value: s.length, sub: 'cuti / izin' },
          { label: 'Menunggu', value: s.filter(x => isPendingApprovalStatus(x.status)).length, sub: 'perlu persetujuan' },
          { label: 'Disetujui', value: s.filter(x => x.status === 'approved').length, sub: 'cuti disetujui' },
          { label: 'Ditolak', value: s.filter(x => x.status === 'rejected').length, sub: 'pengajuan ditolak' },
        ];
      }
      if (requestTab === 'overtime') {
        const s = scopedOvertime;
        return [
          { label: 'Total Pengajuan', value: s.length, sub: 'lembur' },
          { label: 'Menunggu', value: s.filter(x => isPendingApprovalStatus(x.status)).length, sub: 'perlu persetujuan' },
          { label: 'Disetujui', value: s.filter(x => x.status === 'approved').length, sub: 'lembur disetujui' },
          { label: 'Ditolak', value: s.filter(x => x.status === 'rejected').length, sub: 'pengajuan ditolak' },
        ];
      }
      const s = scopedReimb;
      const pending = s.filter(x => isPendingApprovalStatus(x.status));
      const approved = s.filter(x => x.status === 'approved' || x.status === 'paid');
      const fmt = (rs: ReimbursementRequest[]) => 'Rp ' + rs.reduce((a, b) => a + Number(b.amount), 0).toLocaleString('id-ID');
      return [
        { label: 'Total Pengajuan', value: s.length, sub: 'reimbursement' },
        { label: 'Menunggu', value: pending.length, sub: fmt(pending) },
        { label: 'Disetujui', value: approved.length, sub: fmt(approved) },
        { label: 'Ditolak', value: s.filter(x => x.status === 'rejected').length, sub: 'pengajuan ditolak' },
      ];
    })();

    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        {/* Page Header */}
        <PageHeader
          title="Pengajuan & Approval"
          description="Kelola antrean persetujuan request absen, cuti & izin, lembur, dan reimbursement karyawan."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAll()}
              disabled={loading}
              className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
            >
              <RefreshCw size={14} className={cn(loading && 'animate-spin text-primary dark:text-blue-400')} />
              <span>Muat Ulang</span>
            </Button>
          </div>
        </PageHeader>

        {/* Tab Navigation */}
        <Tabs
          value={requestTab}
          onValueChange={(val) => {
            setRequestTab(val as any);
            setRequestFilter('all');
          }}
          className="w-fit mb-6"
        >
          <TabsList>
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.icon} <span className="ml-1.5">{t.label}</span>
                {t.count > 0 && (
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {t.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* StatCards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={summary[0].label}
            value={summary[0].value}
            subValue={summary[0].sub}
            icon={requestTab === 'attendance_correction' ? Clock : requestTab === 'leave' ? Calendar : requestTab === 'overtime' ? Timer : Wallet}
            color="slate"
          />
          <StatCard
            label={summary[1].label}
            value={summary[1].value}
            subValue={summary[1].sub}
            icon={AlertTriangle}
            color="amber"
            status={Number(summary[1].value) > 0 ? "at-risk" : undefined}
          />
          <StatCard
            label={summary[2].label}
            value={summary[2].value}
            subValue={summary[2].sub}
            icon={CheckCircle2}
            color="emerald"
            status="on-track"
          />
          <StatCard
            label={summary[3].label}
            value={summary[3].value}
            subValue={summary[3].sub}
            icon={XCircle}
            color="rose"
          />
        </div>

        {/* Scope / Filter Toolbar Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter size={16} className="text-primary" />
                Filter Perusahaan &amp; Departemen
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                {scopeLabel} &bull; {totalScope} total pengajuan
              </p>
            </div>
            {(requestCompany !== 'all' || requestDept !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRequestCompany('all'); setRequestDept('all'); }}
                className="h-8 px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <RotateCcw size={13} className="mr-1" /> Reset Filter
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perusahaan</Label>
                <select
                  value={requestCompany}
                  onChange={e => setRequestCompany(e.target.value)}
                  className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Perusahaan</option>
                  {requestCompanyOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Departemen</Label>
                <select
                  value={requestDept}
                  onChange={e => setRequestDept(e.target.value)}
                  className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Departemen</option>
                  {requestDeptOptions.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {requestTab === 'attendance_correction' && renderAttendanceCorrections()}
        {requestTab === 'leave' && renderLeave()}
        {requestTab === 'overtime' && renderOvertime()}
        {requestTab === 'reimbursement' && renderReimbursement()}
      </div>
    );
  };

  const renderCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const recordByDate = new Map(historyRecords.map((record) => [record.date, record]));
    const leaveDates = new Set<string>();
    leaveRequests.filter((request) => request.status === 'approved').forEach((request) => {
      const start = new Date(`${request.start_date}T00:00:00`);
      const end = new Date(`${request.end_date}T00:00:00`);
      for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        leaveDates.add(cursor.toISOString().slice(0, 10));
      }
    });
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
      if (index < firstDay) return null;
      const day = index - firstDay + 1;
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, date, record: recordByDate.get(date), isLeave: leaveDates.has(date) };
    });
    return <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-bold text-slate-900">Kalender Kehadiran</h2><p className="text-xs text-slate-500">{now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p></div><div className="flex gap-3 text-[11px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Hadir</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />Cuti</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />Absen</span></div></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs"><div className="col-span-7 grid grid-cols-7 text-[11px] font-bold text-slate-400">{['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((label) => <span key={label} className="py-2">{label}</span>)}</div>{cells.map((cell, index) => <div key={cell?.date || `empty-${index}`} className="min-h-16 rounded-lg border border-slate-100 p-1 text-left">{cell && <><span className="text-xs font-bold text-slate-700">{cell.day}</span><div className={`mt-2 rounded px-1 py-0.5 text-center text-[10px] font-bold ${cell.record ? (cell.record.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700') : cell.isLeave ? 'bg-blue-100 text-blue-700' : new Date(cell.date).getDay() === 0 || new Date(cell.date).getDay() === 6 ? 'bg-slate-50 text-slate-400' : 'bg-rose-100 text-rose-700'}`}>{cell.record ? (cell.record.status === 'late' ? 'Terlambat' : 'Hadir') : cell.isLeave ? 'Cuti' : new Date(cell.date).getDay() === 0 || new Date(cell.date).getDay() === 6 ? 'Libur' : 'Absen'}</div></>}</div>)}</div>
    </div>;
  };

  const HEADER_CONFIG: Record<string, { title: string; subtitle: string; icon: React.ReactNode; tone?: string }> = {
    dashboard: { title: 'Dashboard Absensi', subtitle: 'Overview kehadiran hari ini', icon: <LayoutDashboard size={18} /> },
    report: { title: 'Report Hadir', subtitle: 'Analitik performa kehadiran & jam kerja', icon: <BarChart3 size={18} />, tone: 'bg-blue-600' },
        request: { title: 'Pengajuan & Approval', subtitle: 'Kelola cuti, lembur, dan reimbursement', icon: <FileText size={18} />, tone: 'bg-violet-600' },
    locations: { title: 'Radius', subtitle: 'Titik koordinat geofence', icon: <MapPin size={18} /> },
    calendar: { title: 'Kalender Kehadiran', subtitle: 'Rekap status hadir, cuti, dan hari libur', icon: <Calendar size={18} />, tone: 'bg-emerald-600' },
  };

  const headerCfg = HEADER_CONFIG[section] || HEADER_CONFIG.dashboard;

  // ── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full min-h-full pb-8">
      <style>{`
        @keyframes gpPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
        .gps-pulse-ring {
          animation: gpPulse 2s ease-out infinite;
        }
      `}</style>

      {section === 'dashboard' && <div className="border-b border-border/40 bg-card/60 dark:bg-zinc-900/40 px-4 py-3 sm:px-6 sm:py-4 mb-4 rounded-xl border">
        <div className="flex items-center gap-3"><div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white', headerCfg.tone || 'bg-slate-800')}>{headerCfg.icon}</div><div><h1 className="text-sm sm:text-base font-semibold text-foreground">{headerCfg.title}</h1><p className="text-[11px] sm:text-xs text-muted-foreground">{headerCfg.subtitle}</p></div></div>
      </div>}

      {/* Content */}
      <div className="w-full">
        {section === 'dashboard' && (isManager ? renderHRDashboard() : renderDashboard())}
        {section === 'report' && renderReport()}
        {section === 'calendar' && <CompanyCalendarManager />}
        {section === 'request' && renderRequest()}
        {section === 'locations' && (
          <OfficeLocationsManager
            locations={locations}
            setLocations={setLocations}
            onRefresh={fetchAll}
            loading={loading}
          />
        )}
      </div>

      {/* Detail Request Modal */}
      {viewAttendancePhoto && (
        <Dialog open onOpenChange={(open) => { if (!open) setViewAttendancePhoto(null); }}>
          <DialogContent className="max-w-3xl overflow-hidden rounded-2xl border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 p-2 text-foreground">
            <img src={viewAttendancePhoto} alt="Bukti foto absensi" className="max-h-[78vh] w-full rounded-xl object-contain bg-black/40" />
            <div className="flex items-center justify-between px-2 pb-1 text-[11px] text-muted-foreground">
              <span>Foto bukti absensi dengan watermark GPS</span>
              <a href={viewAttendancePhoto} target="_blank" rel="noreferrer" className="font-bold text-primary dark:text-blue-400 hover:underline">Buka Cloudinary</a>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {viewRequest && (
        <Dialog open onOpenChange={(open) => { if (!open) setViewRequest(null); }}>
          <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden font-sans border border-slate-200 shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 shrink-0">
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  {viewRequest.kind === 'cuti' ? 'Detail Cuti' : viewRequest.kind === 'lembur' ? 'Detail Lembur' : 'Detail Reimbursement'}
                </DialogTitle>
                <p className="text-[11px] text-slate-400">
                  {getRequestEmployeeName(viewRequest.req.user_id)} · {userMap.get(String(viewRequest.req.user_id))?.department || ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {renderStatusBadge(viewRequest.req.status)}
                <button
                  onClick={() => setViewRequest(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* Common: submitted at */}
              <div className="text-[11px] text-slate-400">
                Diajukan {new Date(viewRequest.req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              {/* Fields per kind */}
              {viewRequest.kind === 'cuti' && (() => {
                const r = viewRequest.req;
                const typeInfo = LEAVE_TYPES.find(t => t.id === r.leave_type);
                const days = Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000) + 1;
                return (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <p className="font-semibold text-slate-500">Jenis Cuti</p>
                        <p className="text-slate-800 font-medium">{typeInfo?.icon} {typeInfo?.label || r.leave_type}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Durasi</p>
                        <p className="text-slate-800 font-medium">{days} hari</p>
                      </div>
                    </div>
                    <div className="text-[12px]">
                      <p className="font-semibold text-slate-500">Periode</p>
                      <p className="text-slate-800 font-medium">
                        {new Date(r.start_date).toLocaleDateString('id-ID')} — {new Date(r.end_date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    {r.reason && (
                      <div className="text-[12px]">
                        <p className="font-semibold text-slate-500">Alasan</p>
                        <p className="text-slate-700">{r.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {viewRequest.kind === 'lembur' && (() => {
                const r = viewRequest.req;
                return (
                  <div className="space-y-2.5 text-[12px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="font-semibold text-slate-500">Tanggal</p>
                        <p className="text-slate-800 font-medium">{new Date(r.date).toLocaleDateString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Durasi</p>
                        <p className="text-slate-800 font-medium">{formatMinutes(r.duration_minutes)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-500">Jam</p>
                      <p className="text-slate-800 font-medium">{r.start_time} — {r.end_time}</p>
                    </div>
                    {r.project_or_task && (
                      <div>
                        <p className="font-semibold text-slate-500">Project / Task</p>
                        <p className="text-slate-800 font-medium">{r.project_or_task}</p>
                      </div>
                    )}
                    {r.reason && (
                      <div>
                        <p className="font-semibold text-slate-500">Alasan</p>
                        <p className="text-slate-700">{r.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {viewRequest.kind === 'reimbursement' && (() => {
                const r = viewRequest.req;
                const typeInfo = getReimbType(r.category);
                return (
                  <div className="space-y-2.5 text-[12px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="font-semibold text-slate-500">Kategori</p>
                        <p className="text-slate-800 font-medium">{typeInfo.icon} {typeInfo.label}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Nominal</p>
                        <p className="text-slate-800 font-bold">Rp {Number(r.amount).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-500">Tanggal</p>
                      <p className="text-slate-800 font-medium">{new Date(r.date).toLocaleDateString('id-ID')}</p>
                    </div>
                    {r.description && (
                      <div>
                        <p className="font-semibold text-slate-500">Deskripsi</p>
                        <p className="text-slate-700">{r.description}</p>
                      </div>
                    )}
                    {r.rejection_reason && (
                      <div className="rounded-lg bg-red-50 border border-red-100 p-2.5">
                        <p className="font-semibold text-red-600 text-[11px]">Alasan Penolakan</p>
                        <p className="text-red-700 text-[12px]">{r.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* Approval Log */}
              <div>
                <p className="text-[13px] font-bold text-slate-800 mb-3">Riwayat Persetujuan</p>
                {(() => {
                  const r = viewRequest.req;
                  const hierarchy = [
                    { level: 1, label: 'Supervisor (SPV)', approved_by: r.line1_approved_by, approved_at: r.line1_approved_at },
                    { level: 2, label: 'HR', approved_by: r.line2_approved_by, approved_at: r.line2_approved_at },
                    { level: 3, label: 'Manager', approved_by: r.senior_approved_by, approved_at: r.senior_approved_at },
                    { level: 4, label: 'VP', approved_by: r.office_approved_by, approved_at: r.office_approved_at },
                  ];
                  const isRejected = r.status === 'rejected';
                  const isApproved = r.status === 'approved';
                  const isFinalApproved = isApproved;
                  const hasLevelData = hierarchy.some(h => !!h.approved_by);

                  // Fallback: bila kolom per-level kosong (migrasi history belum jalan)
                  // tapi status final sudah diketahui, tampilkan hasil akhir saja.
                  if (!hasLevelData && (isApproved || isRejected)) {
                    return (
                      <div className={`rounded-xl border p-3.5 flex items-start gap-3 ${isRejected ? 'border-red-100 bg-red-50/60' : 'border-emerald-100 bg-emerald-50/60'}`}>
                        {isRejected
                          ? <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                          : <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />}
                        <div>
                          <p className={`text-[13px] font-bold ${isRejected ? 'text-red-700' : 'text-emerald-700'}`}>
                            {isRejected ? 'Pengajuan Ditolak' : 'Pengajuan Disetujui'}
                          </p>
                          {r.approved_by && (
                            <p className="text-[12px] text-slate-600 mt-0.5">
                              oleh {r.approved_by}
                              {r.approved_at && (
                                <span className="text-slate-400"> · {new Date(r.approved_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </p>
                          )}
                          {isRejected && r.rejection_reason && (
                            <p className="text-[12px] text-red-600 mt-1.5">{r.rejection_reason}</p>
                          )}
                          {isApproved && (
                            <p className="text-[11px] text-slate-400 mt-1.5">
                              Data per-level belum tersimpan (kolom history approval belum ada saat persetujuan). Untuk pengajuan baru, riwayat per-level akan terekam otomatis.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="relative space-y-0">
                      {hierarchy.map((h, i) => {
                        const isLevelApproved = !!h.approved_by;
                        const isCurrent = !isLevelApproved && !isRejected && !isFinalApproved && hierarchy.slice(0, i).every(x => !!x.approved_by);
                        const isSkipped = !isLevelApproved && !isRejected && isFinalApproved;
                        return (
                          <div key={i} className="relative flex items-start gap-3">
                            {/* Vertical connector line */}
                            {i < hierarchy.length - 1 && (
                              <div className="absolute left-[9px] top-[22px] w-[2px] h-[calc(100%-10px)] bg-slate-200" />
                            )}
                            {/* Circle */}
                            <div className={`relative z-10 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-2 ${
                              isLevelApproved ? 'border-emerald-500 bg-emerald-50' :
                              isCurrent ? 'border-amber-400 bg-amber-50' :
                              isSkipped ? 'border-slate-200 bg-slate-50' :
                              'border-slate-200 bg-slate-50'
                            }`}>
                              {isLevelApproved ? (
                                <CheckCircle2 size={12} className="text-emerald-600" />
                              ) : isCurrent ? (
                                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-slate-200" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="pb-4 pt-0.5">
                              <p className={`text-[13px] font-semibold ${isLevelApproved ? 'text-slate-800' : isCurrent ? 'text-amber-600' : isSkipped ? 'text-slate-300' : 'text-slate-400'}`}>
                                {h.label}
                              </p>
                              {isLevelApproved ? (
                                <p className="text-[12px] text-slate-500">
                                  {h.approved_by}
                                  {h.approved_at && (
                                    <span className="text-slate-400"> · {new Date(h.approved_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  )}
                                </p>
                              ) : isCurrent ? (
                                <p className="text-[12px] text-amber-500">Menunggu persetujuan</p>
                              ) : isRejected ? (
                                <p className="text-[12px] text-slate-400">Ditolak</p>
                              ) : isSkipped ? (
                                <p className="text-[12px] text-slate-300">Disetujui di tahap sebelumnya</p>
                              ) : (
                                <p className="text-[12px] text-slate-300">Belum mencapai tahap ini</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export { AttendanceManager };
export default AttendanceManager;
