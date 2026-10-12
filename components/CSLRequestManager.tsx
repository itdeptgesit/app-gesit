import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCcw, Clock, CheckCircle2, AlertTriangle, BarChart2, Star, MessageSquare, Send, Plus, Paperclip, Upload, Link, X, FolderOpen, ExternalLink, Shield, Trash2, FileText, Activity, Pencil, Loader2, TrendingUp, Users, Calendar, Info, Settings2, ChevronRight, Ticket, Filter, SlidersHorizontal, UserCircle2, Building, ArrowUpRight, MoreVertical, Eye, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { getSlaStatus, SLAStatus } from '../utils/cslSlaUtils';
import { notifyRequestUpdate, notifyUserMentioned } from '../utils/cslNotificationUtils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { CSLCreateRequest } from './CSLCreateRequest';

// ── Types ────────────────────────────────────────────────────────────────────
interface CSLCategory {
  id: number;
  code: string;
  name: string;
  sla_days: number;
  description?: string;
}

interface CSLRequest {
  id: number;
  request_number: string;
  category_id: number;
  category_name?: string;
  requester_name: string;
  requester_email: string;
  requester_id?: string;
  department: string;
  company: string;
  assigned_pic_name?: string;
  assigned_pic_id?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: string;
  description: string;
  progress: number;
  required_date?: string;
  sla_target_days: number;
  sla_due_date: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;

  // Phase 2 Fields
  csl_response?: string;
  csl_response_at?: string;
  feedback_overall_rating?: number;
  feedback_response_time_rating?: number;
  feedback_service_quality_rating?: number;
  feedback_comment?: string;
  feedback_submitted_at?: string;
}

interface CSLRequestManagerProps {
  currentUser: UserAccount | null;
  view?: 'all' | 'mine' | 'categories';
}

// ── SLA & Status Styling (Modern Informative Badge Style) ───────────────
const SLA_BADGE: Record<SLAStatus, { label: string; className: string }> = {
  ON_TRACK: { label: 'On Track', className: 'border-emerald-500/20 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10' },
  DUE_SOON: { label: 'Due Soon', className: 'border-amber-500/20 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium' },
  DUE_TODAY: { label: 'Due Today', className: 'border-orange-500/30 text-orange-700 dark:text-orange-300 bg-orange-500/15 font-semibold' },
  OVERDUE: { label: 'Overdue', className: 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold' },
  COMPLETED_ON_TIME: { label: 'Completed ✓', className: 'border-emerald-500/20 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10' },
  COMPLETED_LATE: { label: 'Completed Late', className: 'border-zinc-500/20 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10' },
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/60',
  SUBMITTED: 'border-sky-500/25 text-sky-700 dark:text-sky-300 bg-sky-500/10 font-medium',
  ACKNOWLEDGED: 'border-indigo-500/25 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 font-medium',
  IN_REVIEW: 'border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-medium',
  REVIEW_USER: 'border-purple-500/25 text-purple-700 dark:text-purple-300 bg-purple-500/10 font-medium',
  PROCESSING: 'border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium',
  COMPLETED: 'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-semibold',
  RESPONDED: 'border-teal-500/25 text-teal-700 dark:text-teal-300 bg-teal-500/10 font-medium',
  CLOSED: 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 font-medium',
  REJECTED: 'border-rose-500/25 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-medium',
  CANCELLED: 'border-zinc-400 dark:border-zinc-600 text-muted-foreground bg-muted/40 line-through font-medium',
};

const PRIORITY_BADGE: Record<string, string> = {
  Low: 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/60',
  Medium: 'border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10',
  High: 'border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium',
  Critical: 'border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/15 font-semibold',
};

const formatStatusText = (status: string) => {
  if (!status) return '';
  return status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

// ── MOCK DATA (used when DB is offline) ──────────────────────────────────────
const MOCK_REQUESTS: CSLRequest[] = [
  {
    id: 1,
    request_number: 'CSL-202608-0001',
    category_id: 1,
    category_name: 'Agreement',
    requester_name: 'Budi Santoso',
    requester_email: 'budi@gesit.co.id',
    department: 'Finance',
    company: 'PT GESIT',
    assigned_pic_name: 'Legal Officer',
    priority: 'High',
    status: 'IN_REVIEW',
    description: 'Review distribution agreement with PT Mitra Sejati.',
    progress: 40,
    sla_target_days: 5,
    sla_due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    request_number: 'CSL-202608-0002',
    category_id: 2,
    category_name: 'Legal Review',
    requester_name: 'Dewi Lestari',
    requester_email: 'dewi@gesit.co.id',
    department: 'HR & GA',
    company: 'PT GESIT',
    assigned_pic_name: 'Senior Counsel',
    priority: 'Medium',
    status: 'PROCESSING',
    description: 'Draft employment contract template for management level.',
    progress: 70,
    sla_target_days: 5,
    sla_due_date: new Date(Date.now() + 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    request_number: 'CSL-202608-0003',
    category_id: 8,
    category_name: 'Document Request',
    requester_name: 'Agus Purnomo',
    requester_email: 'agus@gesit.co.id',
    department: 'Operations',
    company: 'PT GESIT',
    priority: 'Low',
    status: 'SUBMITTED',
    description: 'Permintaan salinan Akta Perubahan Direksi tahun 2024.',
    progress: 0,
    sla_target_days: 2,
    sla_due_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_CATEGORIES: CSLCategory[] = [
  { id: 1, code: 'AGR', name: 'Agreement', sla_days: 5, description: 'Penyusunan & review perjanjian kerjasama bisnis' },
  { id: 2, code: 'LREV', name: 'Legal Review', sla_days: 5, description: 'Kajian hukum dokumen operasional & regulasi' },
  { id: 3, code: 'CORPSECR', name: 'Corporate Secretary', sla_days: 5, description: 'Rapat Direksi/Komisaris, RUPS, perizinan korporasi' },
  { id: 4, code: 'OSS', name: 'OSS & Perizinan', sla_days: 14, description: 'Pengurusan NIB, izin usaha melalui sistem OSS' },
  { id: 5, code: 'LIC', name: 'Licensing', sla_days: 10, description: 'Perpanjangan izin operasional, sertifikasi & lisensi' },
  { id: 6, code: 'NOTARY', name: 'Notaris & Akta', sla_days: 7, description: 'Pengurusan akta notaris, pendaftaran Kemenkumham' },
  { id: 7, code: 'LEGALOP', name: 'Legal Opinion', sla_days: 5, description: 'Pendapat hukum formal untuk transaksi strategis' },
  { id: 8, code: 'DOCREQ', name: 'Permintaan Dokumen', sla_days: 2, description: 'Salinan akta, legalitas perusahaan, SK Kemenkumham' },
  { id: 9, code: 'COMPLIANCE', name: 'Kepatuhan Hukum', sla_days: 5, description: 'Monitoring kepatuhan regulasi industri terkini' },
  { id: 10, code: 'OTHER', name: 'Lainnya', sla_days: 5, description: 'Konsultasi hukum & kebutuhan administrasi legal lainnya' },
];

// ── Categories View ───────────────────────────────────────────────────────────
const CategoriesView: React.FC<{ categories: CSLCategory[] }> = ({ categories }) => (
  <div className="space-y-6">
    <PageHeader title="Request Categories" description="SLA configuration by request type" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map(cat => (
        <div key={cat.id} className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm hover:bg-muted/40 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-mono text-xs text-muted-foreground font-semibold px-2 py-0.5 rounded-md bg-muted border">
                {cat.code}
              </span>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {cat.sla_days}d SLA
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug">{cat.name}</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{cat.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const CSLRequestManager: React.FC<CSLRequestManagerProps> = ({ currentUser, view = 'all' }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CSLRequest[]>([]);
  const [categories, setCategories] = useState<CSLCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [useMock, setUseMock] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cslStaffUsers, setCslStaffUsers] = useState<{ id: string; fullName: string; email: string; role: string }[]>([]);

  // Phase 2 State
  const [selectedRequest, setSelectedRequest] = useState<CSLRequest | null>(null);
  const [requestLogs, setRequestLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseForm, setResponseForm] = useState({ status: '', response: '', gdriveLink: '' });
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [isDraggingResponse, setIsDraggingResponse] = useState(false);
  const responseFileRef = useRef<HTMLInputElement>(null);
  const [feedbackForm, setFeedbackForm] = useState({ overall: 5, responseTime: 5, quality: 5, comment: '' });

  // New Comment State
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [mentionState, setMentionState] = useState<{ active: boolean, query: string, index: number }>({ active: false, query: '', index: 0 });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Document Upload State (GDrive)
  const [requestDocuments, setRequestDocuments] = useState<any[]>([]);
  const [docForm, setDocForm] = useState({ doc_name: '', doc_type: '', gdrive_url: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [docUploadProgress, setDocUploadProgress] = useState(0);
  const [docUploadStatus, setDocUploadStatus] = useState('');
  const [showDocForm, setShowDocForm] = useState(false);

  const roleLower = (currentUser?.role || '').trim().toLowerCase();

  const isSuperAdmin = useMemo(() => {
    return roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner';
  }, [roleLower]);

  const isAdmin = useMemo(() => {
    return isSuperAdmin || (currentUser?.groups || []).some(g => ['admin', 'csl_admin', 'csl_management'].includes(g.toLowerCase()));
  }, [isSuperAdmin, currentUser]);

  const isStaff = useMemo(() => {
    return (currentUser?.groups || []).some(g => ['csl_staff', 'req_review'].includes(g.toLowerCase()));
  }, [currentUser]);

  const isCslTeam = useMemo(() => {
    return isSuperAdmin || isAdmin || isStaff;
  }, [isSuperAdmin, isAdmin, isStaff]);

  const canDelete = isSuperAdmin || isAdmin;
  const canEdit = isSuperAdmin || isAdmin;
  const canApprove = isSuperAdmin || isAdmin;

  // Edit & Delete State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CSLRequest>>({});
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);

  const handleDeleteRequest = async (id: number) => {
    setRequestToDelete(id);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('csl_requests').delete().eq('id', requestToDelete);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== requestToDelete));
      setSelectedRequest(null);
      toast.success('Request berhasil dihapus permanen.');
    } catch (err: any) {
      toast.error('Gagal menghapus request: ' + err.message);
    } finally {
      setRequestToDelete(null);
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.id) return;
    setIsSubmitting(true);
    try {
      const selectedStaff = cslStaffUsers.find(s => s.id === editForm.assigned_pic_id);

      const payload: any = {
        status: editForm.status,
        updated_at: new Date().toISOString()
      };

      if (editForm.assigned_pic_id !== undefined) {
        payload.assigned_pic_id = editForm.assigned_pic_id || null;
        payload.assigned_pic_name = selectedStaff ? selectedStaff.fullName : (editForm.assigned_pic_name || null);
      }

      const { error } = await supabase.from('csl_requests').update(payload).eq('id', editForm.id);
      if (error) throw error;

      const targetReq = requests.find(r => r.id === editForm.id);
      if (targetReq) {
        const isPicChanged = payload.assigned_pic_id && payload.assigned_pic_id !== targetReq.assigned_pic_id;
        const updatedReq = { ...targetReq, ...payload };

        await notifyRequestUpdate(updatedReq, 'STATUS_CHANGED', `Status/PIC diperbarui oleh Admin`);

        if (isPicChanged) {
          await notifyRequestUpdate(updatedReq, 'ASSIGNED');
        }
      }

      await fetchData();
      setIsEditDialogOpen(false);
      setEditForm({});
      toast.success('Perubahan status & penugasan PIC berhasil disimpan.');
    } catch (err: any) {
      toast.error('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch ONLY CSL Staff users using supabaseAdmin to bypass RLS
      const clientToUse = supabaseAdmin || supabase;
      const { data: staffData } = await clientToUse
        .from('user_accounts')
        .select('id, full_name, email, role, groups')
        .order('full_name');

      if (staffData && staffData.length > 0) {
        // Filter strictly for CSL Staff (role 'Staff' or group csl_staff / req_review)
        const staffOnly = staffData.filter(u => {
          const r = (u.role || '').trim().toLowerCase();
          const grp = Array.isArray(u.groups) ? u.groups.map((g: string) => String(g).toLowerCase()) : [];
          return r === 'staff' || grp.includes('csl_staff') || grp.includes('req_review');
        });

        setCslStaffUsers(staffOnly.map(u => ({
          id: String(u.id),
          fullName: u.full_name || u.email,
          email: u.email,
          role: u.role
        })));
      } else {
        // Fallback ONLY CSL staff list
        setCslStaffUsers([
          { id: '1faedcf6-881e-4beb-aeba-bb9b1fea7318', fullName: 'Desi Rahmuni', email: 'desi@gesit.co.id', role: 'staff' },
          { id: 'f162b12f-a7a6-4ad5-98d3-0f4a03a7c362', fullName: 'Sylvia', email: 'sylvia@gesit.co.id', role: 'staff' },
        ]);
      }

      // Fetch categories
      const { data: catData, error: catErr } = await supabase
        .from('csl_request_categories').select('*').order('name');
      if (!catErr && catData?.length) {
        setCategories(catData);
      } else {
        setCategories(MOCK_CATEGORIES);
        setUseMock(true);
      }

      // Fetch requests strictly based on role-based scoping:
      // - Admin / Super Admin / Staff: See ALL requests
      // - User: See ONLY requests created by them
      let query = supabase.from('csl_requests').select('*').order('created_at', { ascending: false });

      if (isAdmin || isStaff) {
        // CSL Team sees full system requests
      } else {
        query = query.eq('requester_email', currentUser?.email || '');
      }

      const { data: reqData, error: reqErr } = await query;
      if (!reqErr && reqData) {
        setRequests(reqData);
        setUseMock(false);
      } else {
        // Use mock data filtered strictly by role
        let filtered = MOCK_REQUESTS;
        if (isAdmin || isStaff) {
          filtered = MOCK_REQUESTS;
        } else {
          filtered = MOCK_REQUESTS.filter(r => r.requester_email === currentUser?.email);
        }
        setRequests(filtered);
        setUseMock(true);
      }
    } catch {
      let fallback = MOCK_REQUESTS;
      if (!isAdmin && !isStaff) {
        fallback = MOCK_REQUESTS.filter(r => r.requester_email === currentUser?.email);
      }
      setRequests(fallback);
      setCategories(MOCK_CATEGORIES);
      setUseMock(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view, currentUser?.email]);

  // SLA metrics
  const slaStats = useMemo(() => {
    const active = requests.filter(r => !['COMPLETED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(r.status));
    const done = requests.filter(r => ['COMPLETED', 'CLOSED'].includes(r.status));
    return {
      onTrack: active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'ON_TRACK').length,
      dueSoon: active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'DUE_SOON').length,
      dueToday: active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'DUE_TODAY').length,
      overdue: active.filter(r => getSlaStatus(r.sla_due_date, r.status) === 'OVERDUE').length,
      onTime: done.filter(r => getSlaStatus(r.sla_due_date, r.status, r.completed_at) === 'COMPLETED_ON_TIME').length,
      total: requests.length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter !== 'ALL') list = list.filter(r => r.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r =>
        r.request_number.toLowerCase().includes(q) ||
        r.requester_name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.category_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, statusFilter, searchTerm]);

  const handleRowClick = async (req: CSLRequest) => {
    setSelectedRequest(req);
    setResponseForm({ status: req.status, response: req.csl_response || '', gdriveLink: '' });
    setResponseFiles([]);
    setRequestLogs([]);
    setFeedbackForm({
      overall: req.feedback_overall_rating || 5,
      responseTime: req.feedback_response_time_rating || 5,
      quality: req.feedback_service_quality_rating || 5,
      comment: req.feedback_comment || ''
    });
    // Fetch activity logs
    const { data: logs, error: logsErr } = await supabase
      .from('csl_request_logs')
      .select('*')
      .eq('request_id', req.id)
      .order('created_at', { ascending: true });
    if (logsErr) {
      console.error('❌ Failed to fetch logs:', logsErr.message);
    } else {
      console.log(`✅ Fetched ${logs?.length || 0} logs for request ${req.id}`);
      if (logs) setRequestLogs(logs);
    }

    // Fetch request documents
    const { data: docs } = await supabase
      .from('csl_request_documents')
      .select('*')
      .eq('request_id', req.id)
      .order('created_at', { ascending: false });
    if (docs) setRequestDocuments(docs);
  };

  const submitResponse = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);

    const payload: any = {
      status: responseForm.status,
      updated_at: new Date().toISOString(),
    };

    // Automatically set the responding staff as PIC ONLY if it hasn't been assigned yet
    if (!selectedRequest.assigned_pic_id) {
      payload.assigned_pic_id = String(currentUser?.id || '');
      payload.assigned_pic_name = currentUser?.fullName || currentUser?.email || '';
    }

    if (['COMPLETED', 'REJECTED', 'RESPONDED', 'REVIEW_USER'].includes(responseForm.status) && responseForm.response) {
      payload.csl_response = responseForm.response;
      payload.csl_response_at = new Date().toISOString();
      if (responseForm.status === 'COMPLETED') {
        payload.completed_at = new Date().toISOString();
      }
    }

    // Build response files metadata
    const existingFiles: any[] = (() => {
      try { return JSON.parse((selectedRequest as any).csl_response_files || '[]'); } catch { return []; }
    })();
    const newFileMeta: any[] = [...existingFiles];

    // Add GDrive link
    if (responseForm.gdriveLink.trim()) {
      newFileMeta.push({ type: 'gdrive', url: responseForm.gdriveLink.trim(), name: 'Google Drive Link', added_at: new Date().toISOString() });
    }

    // Upload files to Google Drive
    if (responseFiles.length > 0 && !useMock) {
      for (const file of responseFiles) {
        try {
          // Convert to Base64
          const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = e => reject(e);
          });

          const base64 = await toBase64(file);

          // Call edge function
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
            body: {
              fileName: `[Lampiran] ${file.name}`,
              fileMimeType: file.type,
              fileBase64: base64,
              requesterEmail: selectedRequest.requester_email,
              folderType: 'request'
            }
          });

          if (uploadError || !uploadData?.success) {
            console.warn('Google Drive upload failed:', file.name, uploadError?.message || uploadData?.error);
            // Fallback to supabase storage if you want, but for now just fail silently as before
          } else {
            newFileMeta.push({
              type: 'gdrive',
              url: uploadData.gdriveUrl,
              name: file.name,
              added_at: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error uploading file:', err);
        }
      }
    }

    if (newFileMeta.length > existingFiles.length) {
      payload.csl_response_files = JSON.stringify(newFileMeta);
    }

    try {
      if (!useMock) {
        const { error } = await supabase.from('csl_requests').update(payload).eq('id', selectedRequest.id);
        if (error) {
          alert(`Gagal menyimpan update: ${error.message}`);
          setIsSubmitting(false);
          return;
        }
        const attachments = newFileMeta.map((f: any) => ({ name: f.name, url: f.url }));
        await notifyRequestUpdate({ ...selectedRequest, ...payload }, 'STATUS_CHANGED', payload.csl_response, attachments);
        const statusLabel: Record<string, string> = {
          ACKNOWLEDGED: 'Permintaan diakui dan sedang dikaji',
          IN_REVIEW: 'Permintaan sedang dalam review',
          PROCESSING: 'Permintaan sedang diproses',
          REVIEW_USER: 'Review dibutuhkan dari pemohon',
          COMPLETED: 'Permintaan telah diselesaikan',
          RESPONDED: 'Tim CSL telah memberikan respons',
          REJECTED: 'Permintaan ditolak',
          CLOSED: 'Permintaan ditutup',
        };
        const autoNote = responseForm.response?.trim() || statusLabel[responseForm.status] || `Status diubah ke ${responseForm.status}`;
        const { error: logErr } = await supabase.from('csl_request_logs').insert([{
          request_id: selectedRequest.id,
          status: responseForm.status,
          actor_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
          actor_id: currentUser?.id ? String(currentUser.id) : null,
          note: autoNote,
          has_files: newFileMeta.length > existingFiles.length,
        }]);
        if (logErr) {
          console.warn('Log insert warning:', logErr.message);
          // Non-fatal: status update sudah berhasil
        }
      }
      await fetchData();
      setSelectedRequest(null);
      setResponseFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!selectedRequest || !newComment.trim()) return;
    setIsSubmittingComment(true);

    try {
      const hasSpecificMention = cslStaffUsers.some(u => newComment.includes(`@${u.fullName}`));
      const isInternal = isInternalComment || (isCslTeam && (newComment.includes('@admin') || hasSpecificMention));
      if (!useMock) {
        const { error: insertErr } = await supabase.from('csl_request_logs').insert([{
          request_id: selectedRequest.id,
          status: selectedRequest.status,
          actor_name: currentUser?.fullName || currentUser?.email || 'User',
          actor_id: currentUser?.id ? String(currentUser.id) : null,
          note: newComment.trim(),
          has_files: false,
          is_internal: isInternal,
        }]);
        if (insertErr) {
          toast.error(`Gagal mengirim komentar: ${insertErr.message}`);
          setIsSubmittingComment(false);
          return;
        }

        // Notify requester or CSL staff about new comment
        if (!isInternal) {
          if (currentUser?.email !== selectedRequest.requester_email) {
            await notifyRequestUpdate(selectedRequest, 'STATUS_CHANGED', `Pesan baru dari ${currentUser?.fullName || 'CSL Team'}:\n\n"${newComment.trim()}"`);
          } else {
            await notifyRequestUpdate(selectedRequest, 'USER_RESPONDED', `Pemohon mengirim pesan baru:\n\n"${newComment.trim()}"`);
          }
        } else {
          // If it's an internal note, notify specifically mentioned users
          const mentionedUsers = cslStaffUsers.filter(u => newComment.includes(`@${u.fullName}`));
          for (const u of mentionedUsers) {
            if (u.email !== currentUser?.email) {
              await notifyUserMentioned(
                selectedRequest,
                currentUser?.fullName || 'CSL Staff',
                u.id,
                u.email,
                u.fullName,
                newComment.trim()
              );
            }
          }
        }

        // Refresh logs after insert
        const { data: logs } = await supabase
          .from('csl_request_logs')
          .select('*')
          .eq('request_id', selectedRequest.id)
          .order('created_at', { ascending: true });
        if (logs) setRequestLogs(logs);
      } else {
        // In mock mode, show comment locally
        setRequestLogs(prev => [...prev, {
          id: Date.now(),
          request_id: selectedRequest.id,
          status: selectedRequest.status,
          actor_name: currentUser?.fullName || 'User',
          actor_id: currentUser?.id ? String(currentUser.id) : null,
          note: newComment.trim(),
          has_files: false,
          is_internal: isInternal,
          created_at: new Date().toISOString(),
        }]);
      }
      setNewComment('');
      setIsInternalComment(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      toast.error(`Error tidak terduga: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const submitDocument = async () => {
    if (!selectedRequest || !docForm.doc_name.trim()) return;
    if (!docForm.gdrive_url.trim() && !docFile) return;

    setIsSubmittingDoc(true);
    setDocUploadProgress(15);
    setDocUploadStatus('Menyiapkan berkas...');

    try {
      if (!useMock) {
        let finalGdriveUrl = docForm.gdrive_url.trim();
        let fileId = null;

        if (docFile) {
          setDocUploadProgress(30);
          setDocUploadStatus(`Membaca ${docFile.name}...`);

          // Convert to Base64
          const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });

          const base64 = await toBase64(docFile);

          setDocUploadProgress(55);
          setDocUploadStatus('Mengunggah ke Google Drive...');

          // Call edge function
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
            body: {
              fileName: docFile.name,
              fileMimeType: docFile.type,
              fileBase64: base64,
              requesterEmail: selectedRequest.requester_email,
              folderType: 'request'
            }
          });

          if (uploadError || !uploadData?.success) {
            throw new Error(uploadError?.message || uploadData?.error || 'Gagal upload ke Google Drive');
          }

          setDocUploadProgress(85);
          setDocUploadStatus('Menyimpan informasi dokumen...');
          finalGdriveUrl = uploadData.gdriveUrl;
          fileId = uploadData.fileId;
        }

        const { error } = await supabase.from('csl_request_documents').insert([{
          request_id: selectedRequest.id,
          doc_name: docForm.doc_name.trim(),
          doc_type: docForm.doc_type || 'Lainnya',
          gdrive_url: finalGdriveUrl,
          gdrive_file_id: fileId,
          uploaded_by_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
          uploaded_by_id: currentUser?.id ? String(currentUser.id) : null,
          is_visible_to_requester: true,
        }]);

        if (error) {
          alert(`Gagal menyimpan dokumen: ${error.message}`);
          setIsSubmittingDoc(false);
          return;
        }

        setDocUploadProgress(100);
        setDocUploadStatus('Selesai!');

        // Notify requester or CSL staff about new document
        const attachment = { name: docForm.doc_name.trim(), url: finalGdriveUrl };
        if (currentUser?.email !== selectedRequest.requester_email) {
          await notifyRequestUpdate(selectedRequest, 'STATUS_CHANGED', `Dokumen baru telah dilampirkan: ${docForm.doc_name.trim()}`, [attachment]);
        } else {
          await notifyRequestUpdate(selectedRequest, 'USER_RESPONDED', `Pemohon melampirkan dokumen baru: ${docForm.doc_name.trim()}`, [attachment]);
        }

        // Refresh documents
        const { data: docs } = await supabase
          .from('csl_request_documents')
          .select('*')
          .eq('request_id', selectedRequest.id)
          .order('created_at', { ascending: false });
        if (docs) setRequestDocuments(docs);

        // Add log entry for document upload
        await supabase.from('csl_request_logs').insert([{
          request_id: selectedRequest.id,
          status: selectedRequest.status, // Keep current status
          actor_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
          actor_id: currentUser?.id ? String(currentUser.id) : null,
          note: `Dokumen ditambahkan: ${docForm.doc_name.trim()}`,
          has_files: true,
        }]);

        // Refresh logs
        const { data: logs } = await supabase
          .from('csl_request_logs')
          .select('*')
          .eq('request_id', selectedRequest.id)
          .order('created_at', { ascending: true });
        if (logs) setRequestLogs(logs);
      } else {
        setDocUploadProgress(100);
        setDocUploadStatus('Selesai (Mock)!');
        setRequestDocuments(prev => [{
          id: Date.now(),
          request_id: selectedRequest.id,
          doc_name: docForm.doc_name.trim(),
          doc_type: docForm.doc_type || 'Lainnya',
          doc_url: docForm.gdrive_url || '#',
          gdrive_url: docForm.gdrive_url || '#',
          uploaded_by_name: currentUser?.fullName || 'Staff CSL',
          created_at: new Date().toISOString(),
        }, ...prev]);
      }

      setDocForm({ doc_name: '', doc_type: '', gdrive_url: '' });
      setDocFile(null);
      setShowDocForm(false);
      toast.success('Dokumen berhasil dilampirkan.');
    } catch (err: any) {
      alert(`Error tidak terduga: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingDoc(false);
      setTimeout(() => {
        setDocUploadProgress(0);
        setDocUploadStatus('');
      }, 800);
    }
  };

  const submitFeedback = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);

    const payload = {
      feedback_overall_rating: feedbackForm.overall,
      feedback_response_time_rating: feedbackForm.responseTime,
      feedback_service_quality_rating: feedbackForm.quality,
      feedback_comment: feedbackForm.comment,
      feedback_submitted_at: new Date().toISOString()
    };

    try {
      if (!useMock) {
        await supabase.from('csl_requests').update(payload).eq('id', selectedRequest.id);
      }
      await fetchData();
      setSelectedRequest(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'categories') return <CategoriesView categories={categories} />;

  const pageTitle = 'Request / Ticketing';
  const pageDesc = isAdmin
    ? 'Overview of all CSL requests across departments & staff'
    : isStaff
      ? 'Requests assigned to you and unassigned requests awaiting action'
      : 'Track your submitted requests and their SLA status';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <PageHeader title={pageTitle} description={pageDesc}>
        <div className="flex items-center gap-2">
          {useMock && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 uppercase tracking-wider">
              Demo Data
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9">
            <Plus className="h-4 w-4 mr-1.5" /> Create Request
          </Button>
        </div>
      </PageHeader>

      {/* SLA Stat Cards (Exact Shadcn Card style from Directory) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'On Track',
            value: slaStats.onTrack,
            icon: CheckCircle2,
            sub: 'Active, within SLA',
          },
          {
            label: 'Due Soon',
            value: slaStats.dueSoon + slaStats.dueToday,
            icon: Clock,
            sub: 'Approaching deadline',
          },
          {
            label: 'Overdue',
            value: slaStats.overdue,
            icon: AlertTriangle,
            sub: 'Past SLA deadline',
          },
          {
            label: 'Total Requests',
            value: slaStats.total,
            icon: BarChart2,
            sub: `${slaStats.onTime} completed on time`,
          },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <Icon size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold mt-2 text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar (Exact Shadcn Style as Directory) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Side: Search + Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search by number, requester, description..." 
              className="pl-9 h-9 text-sm rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Shadcn Tabs style for status */}
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto hide-scrollbar">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'SUBMITTED', label: 'Submitted' },
              { id: 'IN_REVIEW', label: 'In Review' },
              { id: 'PROCESSING', label: 'Processing' },
              { id: 'REVIEW_USER', label: 'Review User' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'OVERDUE', label: 'Overdue' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setStatusFilter(cat.id)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  statusFilter === cat.id 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Rendering: Table */}
      {isLoading ? (
        <div className="bg-card rounded-2xl border border-border/60 p-12 text-center text-muted-foreground flex items-center justify-center gap-2 font-medium text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/60 p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Ticket size={32} className="opacity-30" />
          <p className="font-semibold text-sm text-foreground">No requests found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search query or filter criteria.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-card">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Daftar Permintaan CSL</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Kelola dan pantau seluruh tiket permintaan Legal &amp; Corporate Secretary</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted/50 border border-border/50 px-2.5 py-1 rounded-md">
                {filtered.length} Request
              </span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                <TableHead className="py-3 pl-6 font-semibold text-xs text-foreground/80 w-12 text-center">#</TableHead>
                <TableHead className="py-3 font-semibold text-xs text-foreground/80 min-w-[300px]">Permintaan</TableHead>
                {view !== 'mine' && (
                  <TableHead className="py-3 font-semibold text-xs text-foreground/80 min-w-[160px]">Pemohon</TableHead>
                )}
                <TableHead className="py-3 font-semibold text-xs text-foreground/80 min-w-[130px]">PIC Assigned</TableHead>
                <TableHead className="py-3 font-semibold text-xs text-foreground/80 min-w-[100px]">Status</TableHead>
                <TableHead className="py-3 font-semibold text-xs text-foreground/80 min-w-[140px]">Progress</TableHead>
                <TableHead className="py-3 pr-6 text-right font-semibold text-xs text-foreground/80 w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req, idx) => {
                const displaySlaDueDate = req.required_date || req.sla_due_date;
                const slaStatus = getSlaStatus(displaySlaDueDate, req.status, req.completed_at);
                const slaBadge = SLA_BADGE[slaStatus];
                const dueDate = new Date(displaySlaDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                const requestDate = new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const catName = categories.find(c => c.id === req.category_id)?.name || req.category_name || 'Permintaan';
                const getInitials = (name: string) => name.replace(/(Adv\.|S\.H\.|M\.H\.|Dra\.|PT)/gi, '').trim().substring(0, 2).toUpperCase();
                const progressValue = req.progress || (req.status === 'COMPLETED' ? 100 : req.status === 'PROCESSING' ? 60 : req.status === 'IN_REVIEW' ? 40 : 15);

                return (
                  <TableRow
                    key={req.id}
                    onClick={() => handleRowClick(req)}
                    className="border-border/30 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* # Index */}
                    <TableCell className="py-3.5 pl-6 text-center text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>

                    {/* Deskripsi & Meta */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 group-hover:border-foreground/30 transition-colors">
                          <FileText size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors" title={req.description}>
                            {req.description}
                          </p>
                          <p className="text-[11px] text-foreground/75 truncate mt-0.5">
                            {requestDate} · <span className="font-mono">{req.request_number}</span> · {catName}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Pemohon */}
                    {view !== 'mine' && (
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                            {getInitials(req.requester_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-foreground truncate max-w-[130px]">{req.requester_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[130px]">{req.requester_email || req.department}</p>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* PIC Assigned */}
                    <TableCell className="py-3.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {req.assigned_pic_name || <span className="text-muted-foreground italic">Belum di-assign</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {req.assigned_pic_name ? 'Legal Officer' : '-'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_BADGE[req.status] || ''}`}>
                        {formatStatusText(req.status)}
                      </span>
                    </TableCell>

                    {/* Progress */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1">
                        <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden border border-border/40">
                          <div
                            className="bg-foreground h-full rounded-full transition-all"
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground w-24">
                          <span className="font-mono">{progressValue}%</span>
                          <span>Due {dueDate}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Aksi */}
                    <TableCell className="py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      {canEdit || canDelete ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Menu Aksi"
                              />
                            }
                          >
                            <MoreVertical size={14} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(req);
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <Eye size={13} className="mr-2" />
                              <span>Lihat Detail</span>
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditForm({
                                    id: req.id,
                                    category_id: req.category_id,
                                    priority: req.priority,
                                    status: req.status,
                                    department: req.department,
                                    assigned_pic_id: req.assigned_pic_id || '',
                                    assigned_pic_name: req.assigned_pic_name || '',
                                    description: req.description,
                                  });
                                  setIsEditDialogOpen(true);
                                }}
                                className="cursor-pointer text-xs"
                              >
                                <Pencil size={13} className="mr-2" />
                                <span>Edit Request</span>
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRequest(req.id);
                                  }}
                                  className="cursor-pointer text-xs text-destructive focus:text-destructive"
                                >
                                  <Trash2 size={13} className="mr-2 text-destructive" />
                                  <span>Hapus Request</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(req);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Table Footer */}
          <div className="px-6 py-3.5 bg-muted/20 border-t border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of <span className="font-semibold text-foreground">{requests.length}</span> requests
            </p>
            {useMock && <Badge variant="outline" className="text-xs font-medium text-muted-foreground border-border bg-muted/40">Demo Data</Badge>}
          </div>
        </div>
      )}

      {/* Detail Dialog (Shadcn Monochromatic / Neutral Professional UI) */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border bg-background shadow-2xl">
          {selectedRequest && (() => {
            const displaySlaDueDate = selectedRequest.required_date || selectedRequest.sla_due_date;
            const sla = getSlaStatus(displaySlaDueDate, selectedRequest.status, selectedRequest.completed_at);
            const slaBadge = SLA_BADGE[sla];

            const oldAttachments: string[] = (() => {
              try { return JSON.parse((selectedRequest as any).attachments || '[]'); } catch { return []; }
            })();
            const responseFilesList: any[] = (() => {
              try { return JSON.parse((selectedRequest as any).csl_response_files || '[]'); } catch { return []; }
            })();
            const hasDocuments = oldAttachments.length > 0 || requestDocuments.length > 0 || responseFilesList.length > 0;
            const totalDocCount = oldAttachments.length + requestDocuments.length + responseFilesList.length;

            const fallbackEvents: { date: string; status: string; actor: string; note?: string; hasFiles?: boolean; isInternal?: boolean }[] =
              requestLogs.length === 0
                ? [{ date: selectedRequest.created_at, status: 'SUBMITTED', actor: selectedRequest.requester_name, note: 'Permintaan diajukan oleh pemohon' }]
                : [];
            const allEvents = [
              ...fallbackEvents,
              ...requestLogs.map((l: any) => ({
                date: l.created_at,
                status: l.status,
                actor: l.actor_name,
                note: l.note,
                hasFiles: l.has_files,
                isInternal: l.is_internal,
              }))
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .filter(evt => isCslTeam || !evt.isInternal);

            const renderDocIcon = (name: string) => {
              const ext = (name.split('.').pop() || '').toLowerCase();
              if (['pdf'].includes(ext)) return <FileText size={15} className="text-red-500 shrink-0" />;
              if (['doc', 'docx'].includes(ext)) return <FileText size={15} className="text-blue-500 shrink-0" />;
              if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileText size={15} className="text-emerald-500 shrink-0" />;
              if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return <Paperclip size={15} className="text-amber-500 shrink-0" />;
              return <Paperclip size={15} className="text-muted-foreground shrink-0" />;
            };

            return (
              <div className="w-full flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-border bg-card/40 shrink-0">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <DialogTitle className="text-xl font-bold font-mono tracking-tight text-foreground">
                        {selectedRequest.request_number}
                      </DialogTitle>
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[selectedRequest.status] || ''}`}>
                        {formatStatusText(selectedRequest.status)}
                      </span>
                      <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${slaBadge.className}`}>
                        {slaBadge.label}
                      </span>
                      {selectedRequest.priority && ['High', 'Critical'].includes(selectedRequest.priority) && (
                        <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[selectedRequest.priority] || ''}`}>
                          Prioritas {selectedRequest.priority}
                        </span>
                      )}
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Diajukan oleh <span className="font-semibold text-foreground">{selectedRequest.requester_name}</span> · {selectedRequest.department} ({selectedRequest.company}) · {new Date(selectedRequest.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </DialogDescription>
                  </div>
                </DialogHeader>

                {/* Tabs Navigation */}
                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="px-6 border-b border-border bg-muted/20 shrink-0">
                    <TabsList className="bg-transparent h-11 p-0 gap-6 border-b-0">
                      <TabsTrigger
                        value="overview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:text-foreground transition-all"
                      >
                        Detail Permintaan
                      </TabsTrigger>
                      <TabsTrigger
                        value="activity"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:text-foreground transition-all flex items-center gap-1.5"
                      >
                        Log &amp; Diskusi
                        {allEvents.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted border border-border text-foreground font-mono">
                            {allEvents.length}
                          </span>
                        )}
                      </TabsTrigger>
                      {isCslTeam && !['COMPLETED', 'CLOSED'].includes(selectedRequest.status) && (
                        <TabsTrigger
                          value="action"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:text-foreground transition-all flex items-center gap-1.5"
                        >
                          Tindakan CSL
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  {/* TAB 1: OVERVIEW */}
                  <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 space-y-4 m-0 data-[state=inactive]:hidden">
                    {/* Status Lifecycle Stepper */}
                    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">Tahapan Pengerjaan Permintaan</span>
                        </div>
                        <span className="text-xs font-mono font-medium text-foreground bg-muted px-2.5 py-0.5 rounded border border-border/50">
                          Progress: {selectedRequest.progress || (selectedRequest.status === 'COMPLETED' ? 100 : selectedRequest.status === 'PROCESSING' ? 60 : selectedRequest.status === 'IN_REVIEW' ? 40 : 15)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                        {[
                          { step: 1, label: 'Diajukan', desc: 'Permintaan Masuk', isDone: true, isActive: selectedRequest.status === 'SUBMITTED' },
                          { step: 2, label: 'Peninjauan', desc: 'Review & Penugasan', isDone: ['ACKNOWLEDGED', 'IN_REVIEW', 'PROCESSING', 'REVIEW_USER', 'COMPLETED', 'CLOSED'].includes(selectedRequest.status), isActive: ['ACKNOWLEDGED', 'IN_REVIEW'].includes(selectedRequest.status) },
                          { step: 3, label: 'Pengerjaan', desc: 'Draft & Tindakan CSL', isDone: ['PROCESSING', 'REVIEW_USER', 'COMPLETED', 'CLOSED'].includes(selectedRequest.status), isActive: ['PROCESSING', 'REVIEW_USER'].includes(selectedRequest.status) },
                          { step: 4, label: 'Selesai', desc: 'Hasil Final Tuntas', isDone: ['COMPLETED', 'CLOSED'].includes(selectedRequest.status), isActive: ['COMPLETED', 'CLOSED'].includes(selectedRequest.status) },
                        ].map((s) => (
                          <div key={s.step} className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40">
                            <div className={`h-1.5 rounded-full transition-all ${s.isDone ? 'bg-primary' : 'bg-muted border border-border/50'}`} />
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${s.isActive ? 'bg-primary text-primary-foreground' : s.isDone ? 'bg-muted text-foreground border border-border' : 'bg-muted/40 text-muted-foreground'}`}>
                                {s.isDone && !s.isActive ? '✓' : s.step}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-medium truncate ${s.isActive ? 'text-foreground font-semibold' : s.isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {s.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Pemohon */}
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[11px] font-medium">Pemohon</span>
                          <UserCircle2 size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground truncate">{selectedRequest.requester_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{selectedRequest.requester_email}</p>
                        </div>
                        <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded truncate border border-border/40">
                          {selectedRequest.department} · {selectedRequest.company}
                        </div>
                      </div>

                      {/* PIC Legal Assigned */}
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[11px] font-medium">PIC Legal Assigned</span>
                          <Shield size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground truncate">
                            {selectedRequest.assigned_pic_name || <span className="text-muted-foreground italic font-normal">Belum Ditugaskan</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {selectedRequest.assigned_pic_name ? 'Legal Officer / Counsel' : 'Menunggu penugasan CSL'}
                          </p>
                        </div>
                        <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded truncate border border-border/40">
                          Kategori: {selectedRequest.category_name || categories.find(c => c.id === selectedRequest.category_id)?.name || 'Permintaan'}
                        </div>
                      </div>

                      {/* Target SLA & Due */}
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[11px] font-medium">Target SLA &amp; Due</span>
                          <Clock size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            Due: {new Date(displaySlaDueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedRequest.required_date
                              ? `Target pemohon (${slaBadge.label})`
                              : `${selectedRequest.sla_target_days || 5} hari kerja`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${slaBadge.className}`}>
                            {slaBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* Info Kategori & Tanggal */}
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[11px] font-medium">Kategori Permintaan</span>
                          <FileText size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground truncate">
                            {selectedRequest.category_name || categories.find(c => c.id === selectedRequest.category_id)?.name || 'Permintaan Legal'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Prioritas: <span className="font-medium text-foreground">{selectedRequest.priority || 'Normal'}</span>
                          </p>
                        </div>
                        <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded truncate border border-border/40">
                          Dibuat: {new Date(selectedRequest.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Required Date Banner */}
                    {selectedRequest.required_date && (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-muted/20 text-xs">
                        <Clock size={15} className="text-foreground shrink-0" />
                        <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-muted-foreground">Target Kebutuhan Pemohon: </span>
                            <span className="font-semibold text-foreground">
                              {new Date(selectedRequest.required_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            SLA Sistem: {selectedRequest.sla_target_days || 5} hari kerja
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Deskripsi Permintaan */}
                    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">Rincian Deskripsi Permintaan</span>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/40">
                          {selectedRequest.category_name || categories.find(c => c.id === selectedRequest.category_id)?.name || 'Legal Request'}
                        </span>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="border-l-2 border-primary/40 pl-3.5 py-0.5">
                          <p className="text-xs md:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {selectedRequest.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tujuan Permintaan */}
                    {(selectedRequest as any).tujuan && (
                      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                          <Target size={14} className="text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">Tujuan Permintaan</span>
                        </div>
                        <div className="p-4 bg-background">
                          <div className="border-l-2 border-primary/40 pl-3.5 py-0.5">
                            <p className="text-xs md:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                              {(selectedRequest as any).tujuan}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dokumen Lampiran */}
                    {(() => {
                      const isVisibleToUser = ['REVIEW_USER', 'COMPLETED', 'CLOSED'].includes(selectedRequest.status);
                      if (isCslTeam && !hasDocuments && !showDocForm) return null;
                      if (!isCslTeam && (!hasDocuments || !isVisibleToUser)) return null;

                      return (
                        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                          <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <FolderOpen size={14} className="text-muted-foreground" />
                              <span className="text-xs font-semibold text-foreground">Dokumen Lampiran &amp; Berkas ({totalDocCount})</span>
                            </div>
                            {isCslTeam && !['COMPLETED', 'CLOSED'].includes(selectedRequest.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDocForm(!showDocForm)}
                                className="h-7 text-xs px-2.5 text-foreground hover:bg-muted font-medium"
                              >
                                {showDocForm ? 'Batal' : '+ Tambah Dokumen'}
                              </Button>
                            )}
                          </div>

                          <div className="p-4 space-y-2">
                            {/* Old Attachments */}
                            {oldAttachments.map((url, i) => {
                              const name = decodeURIComponent(url.split('/').pop()?.split('_').slice(1).join('_') || `File ${i + 1}`);
                              return (
                                <a
                                  key={`old-${i}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {renderDocIcon(name)}
                                    <span className="text-xs font-medium text-foreground truncate group-hover:underline">{name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">Lampiran</span>
                                    <ArrowUpRight size={13} className="text-muted-foreground group-hover:text-foreground" />
                                  </div>
                                </a>
                              );
                            })}

                            {/* GDrive & Request Documents */}
                            {requestDocuments.map((doc, i) => (
                              <div key={`gdrive-${i}`} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors group">
                                <a href={doc.doc_url || (doc as any).gdrive_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {renderDocIcon(doc.doc_name)}
                                  <span className="text-xs font-medium text-foreground truncate group-hover:underline">{doc.doc_name}</span>
                                </a>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {doc.doc_type && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                                      {doc.doc_type}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                    {doc.uploaded_by_name?.split(' ')[0] || 'Pemohon'}
                                  </span>
                                  <ArrowUpRight size={13} className="text-muted-foreground group-hover:text-foreground" />
                                </div>
                              </div>
                            ))}

                            {/* Response Files */}
                            {responseFilesList.map((f, i) => (
                              <div key={`resp-${i}`} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors group">
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {renderDocIcon(f.name || 'file')}
                                  <span className="text-xs font-medium text-foreground truncate group-hover:underline">{f.name || 'Lampiran Tim CSL'}</span>
                                </a>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-border bg-card text-foreground">Respon CSL</span>
                                  <ArrowUpRight size={13} className="text-muted-foreground group-hover:text-foreground" />
                                </div>
                              </div>
                            ))}

                            {!hasDocuments && <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada dokumen lampiran.</p>}
                          </div>

                          {/* Add Document Form */}
                          {showDocForm && (
                            <div className="p-4 border-t border-border bg-muted/10 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-foreground">Nama Dokumen *</label>
                                  <Input
                                    placeholder="Cth: Surat Kuasa Final"
                                    value={docForm.doc_name}
                                    onChange={e => setDocForm({ ...docForm, doc_name: e.target.value })}
                                    className="h-8 text-xs bg-background"
                                    disabled={isSubmittingDoc}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-foreground">Jenis Dokumen</label>
                                  <Input
                                    placeholder="Cth: Akta, Draft, Form"
                                    value={docForm.doc_type}
                                    onChange={e => setDocForm({ ...docForm, doc_type: e.target.value })}
                                    className="h-8 text-xs bg-background"
                                    disabled={isSubmittingDoc}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2 pt-1">
                                <label className="text-[11px] font-semibold text-foreground block">Upload File Fisik atau Tautan</label>
                                <input
                                  type="file"
                                  ref={docFileRef}
                                  className="hidden"
                                  disabled={isSubmittingDoc}
                                  onChange={e => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      const selected = e.target.files[0];
                                      setDocFile(selected);
                                      if (!docForm.doc_name.trim()) {
                                        setDocForm(prev => ({ ...prev, doc_name: selected.name, gdrive_url: '' }));
                                      } else {
                                        setDocForm(prev => ({ ...prev, gdrive_url: '' }));
                                      }
                                    }
                                  }}
                                />
                                <div
                                  onClick={() => !isSubmittingDoc && docFileRef.current?.click()}
                                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 hover:border-foreground/40 bg-background hover:bg-muted/20 px-4 py-3 cursor-pointer transition-colors text-center ${isSubmittingDoc ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                  <Upload size={14} className="text-muted-foreground" />
                                  <span className="text-xs font-medium text-foreground">
                                    {docFile ? `${docFile.name} (${(docFile.size / 1024).toFixed(0)} KB)` : 'Klik untuk pilih file dari komputer...'}
                                  </span>
                                </div>

                                {/* Upload Progress Bar */}
                                {isSubmittingDoc && (
                                  <div className="space-y-1.5 p-3 rounded-lg bg-background border border-border/80 shadow-xs">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-medium text-foreground flex items-center gap-1.5">
                                        <Loader2 size={13} className="animate-spin text-primary" />
                                        {docUploadStatus || 'Mengunggah file...'}
                                      </span>
                                      <span className="font-mono text-xs font-semibold text-foreground">{docUploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
                                      <div
                                        className="bg-primary h-full transition-all duration-300 rounded-full"
                                        style={{ width: `${docUploadProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-3 my-1">
                                  <div className="flex-1 h-px bg-border"></div>
                                  <span className="text-[10px] font-semibold text-muted-foreground">ATAU</span>
                                  <div className="flex-1 h-px bg-border"></div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-semibold text-foreground">Link Google Drive</label>
                                  <Input
                                    type="url"
                                    placeholder="https://drive.google.com/..."
                                    value={docForm.gdrive_url}
                                    disabled={isSubmittingDoc}
                                    onChange={e => {
                                      setDocForm({ ...docForm, gdrive_url: e.target.value });
                                      if (e.target.value) setDocFile(null);
                                    }}
                                    className="h-8 text-xs bg-background"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowDocForm(false)}
                                  disabled={isSubmittingDoc}
                                  className="h-8 text-xs"
                                >
                                  Batal
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={submitDocument}
                                  disabled={isSubmittingDoc || !docForm.doc_name.trim() || (!docForm.gdrive_url.trim() && !docFile)}
                                  className="h-8 text-xs"
                                >
                                  {isSubmittingDoc ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin mr-1.5" />
                                      Mengunggah...
                                    </>
                                  ) : (
                                    'Simpan Dokumen'
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Balasan CSL Display */}
                    {selectedRequest.csl_response && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={14} className="text-foreground" />
                          <span className="text-xs font-semibold text-foreground">Balasan Resmi Tim CSL</span>
                          {selectedRequest.csl_response_at && (
                            <span className="text-[11px] text-muted-foreground ml-auto">
                              {new Date(selectedRequest.csl_response_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{selectedRequest.csl_response}</p>
                      </div>
                    )}

                    {/* Feedback Display */}
                    {selectedRequest.feedback_submitted_at && (
                      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Star size={14} className="text-foreground fill-foreground" />
                          <span className="text-xs font-semibold text-foreground">Feedback Pemohon</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Overall', val: selectedRequest.feedback_overall_rating },
                            { label: 'Kecepatan', val: selectedRequest.feedback_response_time_rating },
                            { label: 'Kualitas', val: selectedRequest.feedback_service_quality_rating },
                          ].map(f => (
                            <div key={f.label} className="text-center p-2.5 bg-muted/30 rounded-md border border-border">
                              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{f.label}</p>
                              <p className="font-bold text-foreground text-sm">{f.val} / 5</p>
                            </div>
                          ))}
                        </div>
                        {selectedRequest.feedback_comment && (
                          <p className="text-xs italic text-muted-foreground border-t border-border pt-2.5">
                            "{selectedRequest.feedback_comment}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Feedback Form (Requester) */}
                    {!isCslTeam && ['COMPLETED', 'CLOSED'].includes(selectedRequest.status) && !selectedRequest.feedback_submitted_at && (
                      <div className="rounded-lg border border-border bg-card overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                          <span className="text-xs font-semibold text-foreground">Beri Feedback Layanan</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-muted-foreground">Bagaimana pengalaman Anda terhadap pelayanan tim CSL untuk tiket ini?</p>
                          {[
                            { key: 'overall', label: 'Overall' },
                            { key: 'responseTime', label: 'Kecepatan Respon' },
                            { key: 'quality', label: 'Kualitas Layanan' }
                          ].map(field => (
                            <div key={field.key} className="flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{field.label}</span>
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map(rating => (
                                  <button key={rating} type="button" onClick={() => setFeedbackForm({ ...feedbackForm, [field.key]: rating })} className="p-1 hover:scale-110 transition-transform">
                                    <Star size={16} className={rating <= (feedbackForm as any)[field.key] ? "fill-foreground text-foreground" : "text-muted-foreground/30"} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <Textarea rows={2} className="w-full text-xs" placeholder="Komentar tambahan untuk perbaikan (opsional)..." value={feedbackForm.comment} onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} />
                          <Button onClick={submitFeedback} disabled={isSubmitting} className="w-full h-8 text-xs font-semibold">
                            Kirim Feedback
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: LOG PROSES & DISKUSI (CHAT INTERFACE) */}
                  <TabsContent value="activity" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden bg-muted/15">
                    {/* Chat Messages Stream */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
                      {allEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground space-y-2">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <MessageSquare size={18} className="text-muted-foreground" />
                          </div>
                          <p className="text-xs font-semibold text-foreground">Belum Ada Percakapan</p>
                          <p className="text-[11px] text-muted-foreground max-w-xs">
                            Mulai diskusi atau tanyakan perkembangan permintaan ini pada kolom pesan di bawah.
                          </p>
                        </div>
                      ) : (
                        allEvents.map((evt, i) => {
                          const isSystemNote = evt.note && (
                            evt.note.includes('Permintaan diajukan') ||
                            evt.note.includes('Dokumen ditambahkan:') ||
                            evt.note.includes('Status/PIC diperbarui') ||
                            evt.note.includes('Status diubah')
                          );

                          // System Event Pill (Centered)
                          if (isSystemNote) {
                            return (
                              <div key={i} className="flex items-center justify-center my-2.5">
                                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-background border border-border/70 text-[11px] text-muted-foreground shadow-2xs">
                                  <Activity size={11} className="text-muted-foreground shrink-0" />
                                  <span>{evt.note}</span>
                                  <span className="text-[10px] text-muted-foreground/60 ml-1">
                                    {new Date(evt.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          const isMe = (currentUser?.fullName && evt.actor?.toLowerCase() === currentUser.fullName.toLowerCase()) ||
                            (currentUser?.email && evt.actor?.toLowerCase() === currentUser.email.toLowerCase());

                          // Chat Message: Right Aligned (Sent by Current User)
                          if (isMe) {
                            return (
                              <div key={i} className="flex flex-col items-end gap-1 pl-12">
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pr-1">
                                  <span className="font-semibold text-foreground">Anda</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(evt.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div
                                  className={`relative max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                                    evt.isInternal
                                      ? 'bg-amber-500/10 border border-amber-500/30 text-foreground'
                                      : 'bg-primary text-primary-foreground'
                                  }`}
                                >
                                  {evt.isInternal && (
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1 pb-1 border-b border-amber-500/20">
                                      <Shield size={10} />
                                      <span>Catatan Internal CSL</span>
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap">{evt.note}</p>
                                </div>
                              </div>
                            );
                          }

                          // Chat Message: Left Aligned (Other Participants / Staff)
                          return (
                            <div key={i} className="flex items-start gap-2.5 pr-12">
                              {/* Avatar */}
                              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs font-semibold text-foreground shrink-0 shadow-2xs mt-0.5">
                                {evt.actor ? evt.actor.replace(/(Adv\.|S\.H\.|PT)/gi, '').trim().substring(0, 2).toUpperCase() : 'U'}
                              </div>
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 pl-1">
                                  <span className="text-xs font-bold text-foreground truncate">{evt.actor}</span>
                                  {evt.isInternal ? (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                      Internal CSL
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded border border-border bg-muted/40 text-muted-foreground">
                                      {evt.actor === selectedRequest.requester_name ? 'Pemohon' : 'Tim CSL'}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    {new Date(evt.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div
                                  className={`rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs shadow-xs leading-relaxed border ${
                                    evt.isInternal
                                      ? 'bg-amber-500/5 border-amber-500/25 text-foreground'
                                      : 'bg-card border-border text-foreground'
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap">{evt.note}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    {!['CLOSED', 'COMPLETED', 'REJECTED'].includes(selectedRequest.status) && (
                      <div className="p-3.5 border-t border-border bg-card shrink-0 space-y-2">
                        {isCslTeam && (
                          <div className="flex items-center justify-between px-1 text-[11px]">
                            <label className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isInternalComment}
                                onChange={e => setIsInternalComment(e.target.checked)}
                                className="rounded border-border h-3.5 w-3.5 accent-primary"
                              />
                              <span>Kirim sebagai <strong className="font-semibold text-foreground">Catatan Internal</strong> (hanya tim CSL)</span>
                            </label>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">Ketik @ untuk mention staff</span>
                          </div>
                        )}

                        <div className="flex items-end gap-2 relative">
                          {/* Mention Popup */}
                          {mentionState.active && (
                            <div className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground px-3 py-1 border-b border-border bg-muted/20">Tag Tim CSL</p>
                              {cslStaffUsers
                                .filter(u => u.fullName.toLowerCase().includes(mentionState.query.toLowerCase()))
                                .map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors flex items-center justify-between"
                                    onClick={() => {
                                      const before = newComment.slice(0, mentionState.index);
                                      const after = newComment.slice(mentionState.index + mentionState.query.length + 1);
                                      setNewComment(`${before}@${u.fullName} ${after}`);
                                      setMentionState({ active: false, query: '', index: 0 });
                                    }}
                                  >
                                    <span className="truncate">{u.fullName}</span>
                                    <span className="text-[9px] text-muted-foreground font-mono ml-2 uppercase">{u.role}</span>
                                  </button>
                                ))}
                            </div>
                          )}

                          <Textarea
                            rows={1}
                            placeholder={isInternalComment ? "Tulis catatan internal untuk tim CSL..." : "Ketik pesan atau balasan diskusi... (Enter untuk kirim)"}
                            value={newComment}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewComment(val);
                              e.target.style.height = 'auto';
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

                              const cursorPos = e.target.selectionStart;
                              const textBeforeCursor = val.slice(0, cursorPos);
                              const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_ ]*)$/);

                              if (match && isCslTeam) {
                                const atIndex = match[0].startsWith(' ') ? match.index! + 1 : match.index!;
                                setMentionState({ active: true, query: match[1], index: atIndex });
                              } else {
                                setMentionState({ active: false, query: '', index: 0 });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (mentionState.active && (e.key === 'Enter' || e.key === 'Tab')) {
                                e.preventDefault();
                                const matches = cslStaffUsers.filter(u => u.fullName.toLowerCase().includes(mentionState.query.toLowerCase()));
                                if (matches.length > 0) {
                                  const u = matches[0];
                                  const before = newComment.slice(0, mentionState.index);
                                  const after = newComment.slice(mentionState.index + mentionState.query.length + 1);
                                  setNewComment(`${before}@${u.fullName} ${after}`);
                                  setMentionState({ active: false, query: '', index: 0 });
                                }
                              } else if (mentionState.active && e.key === 'Escape') {
                                setMentionState({ active: false, query: '', index: 0 });
                              } else if (e.key === 'Enter' && !e.shiftKey && !mentionState.active) {
                                e.preventDefault();
                                submitComment();
                              }
                            }}
                            style={{ minHeight: '40px', maxHeight: '120px' }}
                            className="flex-1 text-xs bg-background rounded-xl resize-none py-2.5 px-3.5 border-border shadow-xs focus-visible:ring-1"
                          />
                          <Button
                            size="icon"
                            disabled={isSubmittingComment || !newComment.trim()}
                            onClick={submitComment}
                            className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-xs"
                            title="Kirim Pesan"
                          >
                            {isSubmittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={15} />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: TINDAKAN CSL (UPDATE STATUS) */}
                  {isCslTeam && !['COMPLETED', 'CLOSED'].includes(selectedRequest.status) && (
                    <TabsContent value="action" className="flex-1 overflow-y-auto p-6 space-y-4 m-0 data-[state=inactive]:hidden">
                      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Update Status &amp; Tindak Lanjut</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Pilih status pemrosesan permintaan dan lampirkan dokumen hasil jika ada.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Status Baru</label>
                          <select
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                            value={responseForm.status}
                            onChange={e => setResponseForm({ ...responseForm, status: e.target.value })}
                          >
                            <option value="">— Pilih Status Pemrosesan —</option>
                            <option value="ACKNOWLEDGED">Acknowledged</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="REVIEW_USER">Review User</option>
                            <option value="COMPLETED">Completed ✓</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>

                        {['COMPLETED', 'REJECTED', 'REVIEW_USER', 'RESPONDED'].includes(responseForm.status) && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Catatan / Balasan untuk Pemohon</label>
                            <Textarea
                              rows={3}
                              className="text-xs"
                              placeholder="Tuliskan catatan, rekomendasi, atau kesimpulan untuk pemohon..."
                              value={responseForm.response}
                              onChange={e => setResponseForm({ ...responseForm, response: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-border">
                          <label className="text-xs font-semibold text-foreground block">Lampirkan File Fisik (Opsional)</label>
                          <div
                            onClick={() => responseFileRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); setIsDraggingResponse(true); }}
                            onDragLeave={() => setIsDraggingResponse(false)}
                            onDrop={e => {
                              e.preventDefault(); setIsDraggingResponse(false);
                              const files = Array.from(e.dataTransfer.files);
                              setResponseFiles(prev => {
                                const names = new Set(prev.map(f => f.name));
                                return [...prev, ...files.filter(f => !names.has(f.name))];
                              });
                            }}
                            className={`rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                              isDraggingResponse ? 'border-foreground bg-muted/40' : 'border-border/60 hover:border-foreground/40 bg-background hover:bg-muted/20'
                            }`}
                          >
                            <Paperclip size={16} className="text-muted-foreground" />
                            <p className="text-xs font-semibold text-foreground">Klik atau seret file ke sini</p>
                            <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, JPG, PNG — maks. 10MB</p>
                            <input ref={responseFileRef} type="file" multiple
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={e => {
                                const files = Array.from(e.target.files || []);
                                setResponseFiles(prev => {
                                  const names = new Set(prev.map(f => f.name));
                                  return [...prev, ...files.filter(f => !names.has(f.name))];
                                });
                              }}
                            />
                          </div>

                          {responseFiles.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {responseFiles.map(file => (
                                <div key={file.name} className="flex items-center justify-between bg-muted/30 border border-border rounded-md px-3 py-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Paperclip size={12} className="text-muted-foreground shrink-0" />
                                    <span className="text-xs font-medium text-foreground truncate">{file.name}</span>
                                  </div>
                                  <button type="button" onClick={() => setResponseFiles(prev => prev.filter(f => f.name !== file.name))}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Existing Response Files Preview */}
                          {responseFilesList.length > 0 && (
                            <div className="pt-2">
                              <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">File Respon Sebelumnya</p>
                              <div className="space-y-1.5">
                                {responseFilesList.map((item: any, i: number) => (
                                  <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/20 border border-border hover:bg-muted/40 transition-colors group">
                                    <Paperclip size={12} className="text-muted-foreground shrink-0" />
                                    <span className="text-xs font-medium truncate group-hover:underline">{item.name}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button onClick={submitResponse} disabled={isSubmitting || !responseForm.status} className="w-full h-10 font-semibold text-xs mt-2">
                          <Send size={14} className="mr-2" /> Simpan Update Status
                        </Button>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border bg-card shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-semibold text-foreground">Buat Permintaan Baru</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajukan permintaan ke tim Legal &amp; Corporate Secretary
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 overflow-y-auto flex-1">
            <CSLCreateRequest
              currentUser={currentUser}
              onClose={() => setIsCreateOpen(false)}
              onSuccess={() => {
                fetchData();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog for Admin */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-xl border bg-card shadow-xl">
          <DialogHeader className="px-6 py-4 border-b bg-muted/20">
            <DialogTitle className="text-base font-semibold">Edit Status &amp; Penugasan PIC</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Khusus Admin: Koreksi status secara paksa &amp; alihkan penugasan ke Staff CSL.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Status Request</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                value={editForm.status || ''}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              >
                {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tugaskan ke Staff (PIC)</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                value={editForm.assigned_pic_id || ''}
                onChange={e => {
                  const staff = cslStaffUsers.find(s => s.id === e.target.value);
                  setEditForm({
                    ...editForm,
                    assigned_pic_id: e.target.value,
                    assigned_pic_name: staff ? staff.fullName : ''
                  });
                }}
              >
                <option value="">-- Belum Ditugaskan (Unassigned) --</option>
                {cslStaffUsers.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="px-6 py-3.5 border-t bg-muted/10 gap-2 flex sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)} className="text-xs h-9">
              Batal
            </Button>
            <Button size="sm" onClick={handleEditSave} disabled={isSubmitting} className="text-xs h-9">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={requestToDelete !== null} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Request Permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Request beserta seluruh data dokumen dan percakapan yang terkait akan dihapus secara permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
