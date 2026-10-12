import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCcw, Search, Calendar, Clock, CheckCircle2, AlertTriangle, Plus, Activity, Save, Check, Paperclip, ExternalLink, Send, MessageSquare, Trash2, FolderOpen } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';


// ── Types ────────────────────────────────────────────────────────────────────
interface CSLRoutine {
  id: number | string;
  title: string;
  description?: string;
  category: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'ANNUALLY';
  due_day: number;
  assigned_pic_name?: string;
  is_active: boolean;
  attachment_url?: string;
  attachment_name?: string;
  created_at?: string;
}

interface CSLRoutineInstance {
  id: number | string;
  routine_id: number | string;
  routine_title?: string;
  routine_category?: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  completion_notes?: string;
  completed_at?: string;
  // Dokumen acuan dari Admin
  admin_attachment_url?: string;
  admin_attachment_name?: string;
  // Hasil kerjaan Staff
  work_file_url?: string;
  work_file_name?: string;
}

interface RoutineComment {
  id: string;
  message: string;
  sender_name: string;
  sender_role: 'admin' | 'staff';
  created_at: string;
}

interface CSLRoutineManagerProps {
  currentUser: UserAccount | null;
  view?: 'activity' | 'timeline' | 'monitoring';
}

const FREQUENCY_BADGES: Record<string, string> = {
  ONCE: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  DAILY: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  WEEKLY: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  MONTHLY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  QUARTERLY: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  SEMI_ANNUALLY: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  ANNUALLY: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_ROUTINES: CSLRoutine[] = [
  { id: 1, title: 'Monthly Tax Report Filing', category: 'Tax', frequency: 'MONTHLY', due_day: 15, assigned_pic_name: 'Budi S.', is_active: true, description: 'Prepare and submit monthly corporate tax returns' },
  { id: 2, title: 'Quarterly Compliance Review', category: 'Compliance', frequency: 'QUARTERLY', due_day: 10, assigned_pic_name: 'Rina A.', is_active: true, description: 'Review quarterly regulatory updates and compliance matrix' },
  { id: 3, title: 'Annual OSS License Renewal', category: 'Licensing', frequency: 'ANNUALLY', due_day: 200, assigned_pic_name: 'Legal Team', is_active: true, description: 'Verify operational business permits on OSS RBA system' },
];

const MOCK_INSTANCES: CSLRoutineInstance[] = [
  { id: 101, routine_id: 1, routine_title: 'Monthly Tax Report Filing', routine_category: 'Tax', period_start: '2026-08-01', period_end: '2026-08-31', due_date: '2026-08-15', status: 'IN_PROGRESS' },
  { id: 102, routine_id: 1, routine_title: 'Monthly Tax Report Filing', routine_category: 'Tax', period_start: '2026-07-01', period_end: '2026-07-31', due_date: '2026-07-15', status: 'COMPLETED', completed_at: '2026-07-14T10:00:00Z' },
  { id: 103, routine_id: 2, routine_title: 'Quarterly Compliance Review', routine_category: 'Compliance', period_start: '2026-07-01', period_end: '2026-09-30', due_date: '2026-10-10', status: 'PENDING' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const CSLRoutineManager: React.FC<CSLRoutineManagerProps> = ({ currentUser, view = 'monitoring' }) => {
  const [routines, setRoutines] = useState<CSLRoutine[]>([]);
  const [instances, setInstances] = useState<CSLRoutineInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [selectedInstance, setSelectedInstance] = useState<CSLRoutineInstance | null>(null);

  // New Routine Form Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Tax',
    frequency: 'MONTHLY' as CSLRoutine['frequency'],
    due_day: 15,
    assigned_pic_name: '',
    description: '',
  });

  // File lampiran dari Admin saat membuat routine
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminFilePreview, setAdminFilePreview] = useState<{ url: string; name: string } | null>(null);

  // State untuk daftar Staff CSL (untuk pilihan dropdown Assigned PIC)
  const [staffUsers, setStaffUsers] = useState<{ id: string; full_name: string; role: string }[]>([]);

  // State untuk Staff mengirim hasil kerjaan
  const [staffWorkFile, setStaffWorkFile] = useState<File | null>(null);
  const [staffWorkNotes, setStaffWorkNotes] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Chat/Diskusi
  const [chatMessages, setChatMessages] = useState<RoutineComment[]>([]);
  const [newChatMsg, setNewChatMsg] = useState('');

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const isCslTeam = useMemo(() => {
    const role = currentUser?.role?.toLowerCase() || '';
    return role.includes('admin') || role.includes('staff') ||
      (currentUser?.groups || []).some(g => ['admin', 'csl_admin', 'csl_staff'].includes(g.toLowerCase()));
  }, [currentUser]);

  const isAdmin = useMemo(() => {
    const role = currentUser?.role?.toLowerCase() || '';
    return role.includes('admin') || role.includes('owner') || (currentUser?.groups || []).some(g => g.toLowerCase().includes('admin'));
  }, [currentUser]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch staff accounts for Assigned PIC selection (strictly Staff role)
      const { data: usersData } = await supabase
        .from('user_accounts')
        .select('id, full_name, role')
        .order('full_name');
      if (usersData && usersData.length > 0) {
        const onlyStaff = usersData.filter(u => (u.role || '').toLowerCase() === 'staff');
        setStaffUsers(onlyStaff);
      }

      let routinesQuery = supabase.from('csl_routines').select('*').order('created_at', { ascending: false });
      let instancesQuery = supabase.from('csl_routine_instances').select(`*, csl_routines (title, category, assigned_pic_name, attachment_url, attachment_name)`).order('due_date', { ascending: true });
      let requestsQuery = supabase.from('csl_requests').select('*').order('created_at', { ascending: false });

      if (!isAdmin) {
          // If not admin, restrict routines based on name
          // Since routines only use assigned_pic_name, we do a text match
          if (currentUser?.fullName) {
              routinesQuery = routinesQuery.ilike('assigned_pic_name', `%${currentUser.fullName}%`);
          }
          // Restrict requests based on ID
          requestsQuery = requestsQuery.eq('assigned_pic_id', currentUser?.id);
      }

      if (view === 'activity') {
        const [routinesRes, requestsRes] = await Promise.all([
          routinesQuery,
          requestsQuery
        ]);
        
        let combinedRoutines: any[] = [];
        if (routinesRes.data) {
            combinedRoutines = [...routinesRes.data];
        }
        if (requestsRes.data) {
            const completedRequestsOnly = requestsRes.data.filter(req => ['COMPLETED', 'CLOSED'].includes(req.status));
            const mappedRequests = completedRequestsOnly.map(req => ({
                id: `req-${req.id}`,
                title: req.description || `[Request] ${req.request_number}`,
                description: req.description,
                category: req.category_name || 'Request',
                frequency: 'ONCE',
                due_day: req.sla_due_date ? new Date(req.sla_due_date).getDate() : 0,
                assigned_pic_name: req.assigned_pic_name || 'Unassigned',
                is_active: false
            }));
            combinedRoutines = [...combinedRoutines, ...mappedRequests];
        }
        
        // Urutkan: yang paling baru di atas
        combinedRoutines.sort((a, b) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        });

        setRoutines(combinedRoutines);
        setUseMock(false);
      } else {
        const [instancesRes, requestsRes] = await Promise.all([
          instancesQuery,
          requestsQuery
        ]);
        
        let combinedInstances: any[] = [];
        if (instancesRes.data) {
            let filteredInstances = instancesRes.data;
            if (!isAdmin && currentUser?.fullName) {
                // instances don't have assigned_pic, they inherit from routines
                filteredInstances = filteredInstances.filter(i => {
                    const picName = i.csl_routines?.assigned_pic_name || '';
                    return picName.toLowerCase().includes(currentUser.fullName.toLowerCase());
                });
            }
            combinedInstances = filteredInstances.map((item: any) => ({
                ...item,
                routine_title: item.csl_routines?.title,
                routine_category: item.csl_routines?.category,
                admin_attachment_url: item.admin_attachment_url || item.csl_routines?.attachment_url,
                admin_attachment_name: item.admin_attachment_name || item.csl_routines?.attachment_name,
            }));
        }
        
        if (requestsRes.data) {
            const mappedRequests = requestsRes.data.map(req => {
                let status = 'PENDING';
                if (['IN_REVIEW', 'PROCESSING', 'REVIEW_USER', 'RESPONDED'].includes(req.status)) status = 'IN_PROGRESS';
                else if (['COMPLETED', 'CLOSED'].includes(req.status)) status = 'COMPLETED';
                else if (['CANCELLED', 'REJECTED'].includes(req.status)) status = 'CANCELLED';
                
                // Check if overdue
                if (status !== 'COMPLETED' && status !== 'CANCELLED' && req.sla_due_date) {
                    if (new Date(req.sla_due_date) < new Date()) {
                        status = 'OVERDUE';
                    }
                }
                
                return {
                    id: `req-inst-${req.id}`,
                    routine_id: `req-${req.id}`,
                    routine_title: req.description || `[Request] ${req.request_number}`,
                    routine_category: req.category_name || 'Request',
                    period_start: req.created_at ? req.created_at.split('T')[0] : '',
                    period_end: req.sla_due_date ? req.sla_due_date.split('T')[0] : '',
                    due_date: req.sla_due_date ? req.sla_due_date.split('T')[0] : '',
                    status: status,
                    completed_at: req.completed_at
                };
            });
            combinedInstances = [...combinedInstances, ...mappedRequests];
        }
        
        setInstances(combinedInstances.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
        setUseMock(false);
      }
    } catch {
      // Keep state defaults
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view, isAdmin]);

  // ── Handle Add New Routine ────────────────────────────────────────────────
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);

    // Upload file lampiran Admin (Base64 / GDrive)
    let attachUrl = '';
    let attachName = '';
    if (adminFile) {
      attachName = adminFile.name;
      try {
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(adminFile);
        });

        let mimeType = adminFile.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          if (adminFile.name.endsWith('.pptx')) mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          else if (adminFile.name.endsWith('.ppt')) mimeType = 'application/vnd.ms-powerpoint';
          else if (adminFile.name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (adminFile.name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (adminFile.name.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else mimeType = 'application/octet-stream';
        }

        // Try GDrive Function first (using standard payload format)
        try {
          const { data: uploadData } = await supabase.functions.invoke('upload-to-gdrive', {
            body: {
              fileName: `[Routine-Ref] ${adminFile.name}`,
              fileMimeType: mimeType,
              fileBase64: base64Content.split(',')[1],
              folderType: 'routine'
            }
          });
          if (uploadData?.gdriveUrl || uploadData?.webViewLink) {
            attachUrl = uploadData.gdriveUrl || uploadData.webViewLink;
          } else {
            attachUrl = base64Content;
          }
        } catch {
          // Fallback to Data URL for database persistence
          attachUrl = base64Content;
        }
      } catch {
        attachUrl = URL.createObjectURL(adminFile);
      }
    }

    const newRoutine: CSLRoutine = {
      id: Date.now(),
      title: formData.title.trim(),
      category: formData.category,
      frequency: formData.frequency,
      due_day: Number(formData.due_day),
      assigned_pic_name: formData.assigned_pic_name.trim() || 'Legal Team',
      description: formData.description.trim(),
      is_active: true,
      attachment_url: attachUrl,
      attachment_name: attachName,
    };

    setRoutines(prev => [newRoutine, ...prev]);

    // Buat instance sekaligus dengan attachment dari Admin
    const newInstance: CSLRoutineInstance = {
      id: Date.now() + 1,
      routine_id: newRoutine.id,
      routine_title: newRoutine.title,
      routine_category: newRoutine.category,
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'IN_PROGRESS',
      admin_attachment_url: attachUrl,
      admin_attachment_name: attachName,
    };
    setInstances(prev => [newInstance, ...prev]);

    try {
      const { data: createdRoutine } = await supabase.from('csl_routines').insert([{
        title: newRoutine.title,
        category: newRoutine.category,
        frequency: newRoutine.frequency,
        due_day: newRoutine.due_day,
        assigned_pic_name: newRoutine.assigned_pic_name,
        description: newRoutine.description,
        is_active: true,
        attachment_url: attachUrl,
        attachment_name: attachName,
      }]).select().single();

      if (createdRoutine?.id) {
        await supabase.from('csl_routine_instances').insert([{
          routine_id: createdRoutine.id,
          period_start: newInstance.period_start,
          period_end: newInstance.period_end,
          due_date: newInstance.due_date,
          status: 'IN_PROGRESS',
        }]);
      }
    } catch (err) {
      console.warn('Persisted to local state', err);
    } finally {
      setIsSubmitting(false);
      setIsAddOpen(false);
      setAdminFile(null);
      setAdminFilePreview(null);
      showFeedback(`Routine "${newRoutine.title}" berhasil dibuat & notifikasi dikirim ke Staff!`);
      setFormData({ title: '', category: 'Tax', frequency: 'MONTHLY', due_day: 15, assigned_pic_name: '', description: '' });
    }
  };

  // Delete Confirmation Modal State
  const [routineToDelete, setRoutineToDelete] = useState<{ id: string | number; title: string } | null>(null);

  const confirmDeleteRoutine = async () => {
    if (!routineToDelete) return;
    const { id: routineId, title: routineTitle } = routineToDelete;

    setRoutines(prev => prev.filter(r => String(r.id) !== String(routineId)));
    setInstances(prev => prev.filter(i => String(i.routine_id) !== String(routineId) && String(i.id) !== String(routineId)));

    try {
      if (typeof routineId === 'number' || !String(routineId).startsWith('req-')) {
        await supabase.from('csl_routines').delete().eq('id', routineId);
      }
      showFeedback(`Routine "${routineTitle}" telah berhasil dihapus.`);
    } catch (err) {
      console.warn('Routine removed from state', err);
      showFeedback(`Routine "${routineTitle}" dihapus dari tampilan.`);
    } finally {
      setRoutineToDelete(null);
    }
  };

  // ── Fetch Chat Messages for selected task ──────────────────────────────────
  const fetchComments = async (instanceId: string | number, routineId?: string | number) => {
    const toMsg = (c: any): RoutineComment => ({
      id: c.id,
      message: c.message,
      sender_name: c.sender_name,
      sender_role: c.sender_role,
      created_at: c.created_at,
    });

    try {
      // Primary query by instance_id
      const { data, error } = await supabase
        .from('csl_routine_comments')
        .select('*')
        .eq('instance_id', String(instanceId))
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setChatMessages(data.map(toMsg));
        return;
      }

      // If synthetic id (act-xxx) or empty result, also try by routine_id
      if (routineId) {
        const { data: data2 } = await supabase
          .from('csl_routine_comments')
          .select('*')
          .eq('instance_id', String(routineId))
          .order('created_at', { ascending: true });
        if (data2 && data2.length > 0) {
          setChatMessages(data2.map(toMsg));
          return;
        }
      }

      setChatMessages([]);
    } catch {
      setChatMessages([]);
    }
  };

  useEffect(() => {
    if (selectedInstance) {
      // Pass routine_id as fallback so synthetic 'act-xxx' IDs can still find comments
      fetchComments(selectedInstance.id, selectedInstance.routine_id);
      setStaffWorkFile(null);
      setStaffWorkNotes('');
    }
  }, [selectedInstance]);

  const handleSendChat = async () => {
    if (!newChatMsg.trim() || !selectedInstance) return;
    const senderName = currentUser?.fullName || (isAdmin ? 'Admin' : 'Staff CSL');
    const senderRole = isAdmin ? 'admin' : 'staff';
    const msgText = newChatMsg.trim();

    const newComment: RoutineComment = {
      id: String(Date.now()),
      message: msgText,
      sender_name: senderName,
      sender_role: senderRole,
      created_at: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, newComment]);
    setNewChatMsg('');

    try {
      const payload: any = {
        instance_id: String(selectedInstance.id),
        sender_name: senderName,
        sender_role: senderRole,
        message: msgText,
      };
      if (currentUser?.id) {
        payload.sender_id = currentUser.id;
      }
      await supabase.from('csl_routine_comments').insert([payload]);
    } catch (err) {
      console.warn('Chat saved to local state', err);
    }
  };

  const handleCompleteWork = async () => {
    if (!selectedInstance) return;
    setIsSubmittingWork(true);

    let workUrl = selectedInstance.work_file_url || '';
    let workName = selectedInstance.work_file_name || '';

    if (staffWorkFile) {
      try {
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(staffWorkFile);
        });
        try {
          const { data: uploadData } = await supabase.functions.invoke('upload-to-gdrive', {
            body: {
              fileName: `[Routine-Output] ${staffWorkFile.name}`,
              fileMimeType: staffWorkFile.type || 'application/octet-stream',
              fileBase64: base64Content,
              folderType: 'routine'
            }
          });
          if (uploadData?.gdriveUrl || uploadData?.webViewLink) {
            workUrl = uploadData.gdriveUrl || uploadData.webViewLink;
            workName = staffWorkFile.name;
          } else {
            workUrl = `data:${staffWorkFile.type || 'application/octet-stream'};base64,${base64Content}`;
            workName = staffWorkFile.name;
          }
        } catch {
          workUrl = `data:${staffWorkFile.type || 'application/octet-stream'};base64,${base64Content}`;
          workName = staffWorkFile.name;
        }
      } catch {
        workUrl = URL.createObjectURL(staffWorkFile);
        workName = staffWorkFile.name;
      }
    }

    const updatedNotes = staffWorkNotes.trim() || selectedInstance.completion_notes || 'Tugas telah diselesaikan dan dikirimkan oleh Staff.';
    const nowIso = new Date().toISOString();

    setInstances(prev => prev.map(i =>
      i.id === selectedInstance.id
        ? {
            ...i,
            status: 'COMPLETED',
            completed_at: nowIso,
            completion_notes: updatedNotes,
            work_file_url: workUrl,
            work_file_name: workName,
          }
        : i
    ));

    try {
      if (typeof selectedInstance.id === 'number' || !String(selectedInstance.id).startsWith('req-')) {
        await supabase.from('csl_routine_instances').update({
          status: 'COMPLETED',
          completed_at: nowIso,
          completion_notes: updatedNotes,
          completion_file_url: workUrl,
          completion_file_name: workName,
        }).eq('id', selectedInstance.id);
      }
    } catch (err) {
      console.warn('Updated instance state locally', err);
    } finally {
      setIsSubmittingWork(false);
      setSelectedInstance(null);
      showFeedback(`Tugas "${selectedInstance.routine_title}" telah berhasil dikirim & diselesaikan!`);
    }
  };

  // Feedback Toast Component
  const feedbackBanner = feedbackMessage && (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
      <Check className="h-4 w-4 text-emerald-400" />
      <span>{feedbackMessage}</span>
    </div>
  );

  // ── Render Activity (Master Definitions) ────────────────────────────────────
  if (view === 'activity') {
    const filteredRoutines = routines.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Routine Activities" description="Manage recurring legal activity schedules and compliance definitions">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button onClick={() => setIsAddOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md">
                <Plus className="h-4 w-4 mr-1.5" /> New Routine Schedule
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold h-9 rounded-xl">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </PageHeader>

        <div className="flex items-center gap-3 bg-card rounded-2xl border border-border/60 p-4 shadow-sm">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input placeholder="Search routine activities by title or category..." className="pl-10 text-sm bg-muted/30 border-border/20 rounded-xl h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Title</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Frequency</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Target Day</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Assigned PIC</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Tanggal Dibuat</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-1">
                        <FolderOpen size={24} />
                      </div>
                      <p className="text-sm font-bold text-foreground">Tidak Ada Data Routine Activity</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm ? `Tidak ditemukan data yang sesuai dengan kata kunci "${searchTerm}".` : 'Belum ada data jadwal kegiatan rutin yang terdaftar. Klik "+ New Routine Schedule" untuk menambahkan.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoutines.map(r => {
                // Find real instance from DB first; fallback to synthetic if none
                const realInst = instances.find(i =>
                  String(i.routine_id) === String(r.id) || i.routine_title === r.title
                );
                const inst: CSLRoutineInstance = realInst || {
                  id: `act-${r.id}`,
                  routine_id: r.id,
                  routine_title: r.title,
                  routine_category: r.category,
                  period_start: new Date().toISOString().split('T')[0],
                  period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                  due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                  status: 'IN_PROGRESS',
                  admin_attachment_url: r.attachment_url,
                  admin_attachment_name: r.attachment_name,
                };
                // Merge attachment from routine if instance doesn't have it
                if (realInst && !realInst.admin_attachment_url && r.attachment_url) {
                  (inst as any).admin_attachment_url = r.attachment_url;
                  (inst as any).admin_attachment_name = r.attachment_name;
                }
                return (
                  <TableRow key={r.id} onClick={() => setSelectedInstance(inst)} className="hover:bg-muted/40 cursor-pointer transition-colors">
                    <TableCell className="font-bold text-sm text-foreground">{r.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-semibold">{r.category}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${FREQUENCY_BADGES[r.frequency]}`}>
                        {r.frequency}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold">Day {r.due_day}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">{r.assigned_pic_name || 'Team Pool'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {r.created_at ? (
                        <div>
                          <div>{new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          <div className="text-xs text-muted-foreground/60">{new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {r.is_active ?
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">Active</span> :
                        <span className="text-xs text-slate-400">Inactive</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isAdmin && !String(r.id).startsWith('req-') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={e => { e.stopPropagation(); setSelectedInstance(inst); }}
                            className="h-8 text-xs font-bold border-indigo-200 hover:bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:hover:bg-indigo-950/40 rounded-xl"
                          >
                            <Activity size={13} className="mr-1" /> Kerjakan
                          </Button>
                        )}

                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={e => {
                              e.stopPropagation();
                              setRoutineToDelete({ id: r.id, title: r.title });
                            }}
                            title="Hapus Routine"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Routine Modal */}
        {renderAddModal()}
        {/* Task Detail Modal */}
        {renderTaskDetailModal()}
        {/* Delete Confirmation Modal */}
        {renderDeleteModal()}
      </div>
    );
  }

  // ── Render Monitoring & Timeline (Instances) ────────────────────────────────
  const filteredInstances = instances.filter(i => {
      const matchSearch = (i.routine_title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
      return matchSearch && matchStatus;
  });
  
  const pageTitle = view === 'timeline' ? 'Routine Timeline' : 'Routine Monitoring';
  const pageDesc = view === 'timeline' ? 'Calendar & schedule view of upcoming routine deadlines' : 'Track current-period recurring routine tasks';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      {feedbackBanner}
      <PageHeader title={pageTitle} description={pageDesc}>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={() => setIsAddOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md">
              <Plus className="h-4 w-4 mr-1.5" /> New Routine
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold h-9 rounded-xl">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground mb-1">Total Active</div>
          <div className="text-3xl font-black text-indigo-600">{instances.filter(i => !['COMPLETED', 'CANCELLED'].includes(i.status)).length}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm">
          <div className="text-xs font-medium text-red-600 mb-1">Overdue</div>
          <div className="text-3xl font-black text-red-600">{instances.filter(i => i.status === 'OVERDUE').length}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm">
          <div className="text-xs font-medium text-amber-600 mb-1">In Progress</div>
          <div className="text-3xl font-black text-amber-600">{instances.filter(i => i.status === 'IN_PROGRESS').length}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm">
          <div className="text-xs font-medium text-emerald-600 mb-1">Completed</div>
          <div className="text-3xl font-black text-emerald-600">{instances.filter(i => i.status === 'COMPLETED').length}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3 bg-card rounded-2xl border border-border/60 p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input placeholder="Search routine tasks..." className="pl-10 text-sm bg-muted/30 border-border/20 rounded-xl h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
                statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border/30 text-muted-foreground hover:bg-muted/30'
              }`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {view === 'timeline' ? (
        <div className="bg-card rounded-2xl border border-border/60 p-10 flex flex-col items-center justify-center text-muted-foreground min-h-[300px] shadow-sm">
          <Calendar size={48} className="opacity-20 mb-4 text-indigo-600" />
          <p className="text-sm font-bold text-foreground">Timeline Visualization (Calendar)</p>
          <p className="text-xs mt-1 opacity-70">Showing schedule matrix for current month routines.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Task / Routine</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Period</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Due Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-1">
                        <FolderOpen size={24} />
                      </div>
                      <p className="text-sm font-bold text-foreground">Tidak Ada Task / Penugasan</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'Tidak ditemukan task yang sesuai dengan kriteria pencarian / filter Anda.'
                          : 'Belum ada daftar task berjalan pada periode ini.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInstances.map(inst => (
                <TableRow key={inst.id} onClick={() => setSelectedInstance(inst)} className="cursor-pointer hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-sm text-foreground">{inst.routine_title}</div>
                    <div className="text-xs font-medium text-indigo-600 mt-0.5">{inst.routine_category}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {inst.period_start} - {inst.period_end}
                  </TableCell>
                  <TableCell className="font-bold text-xs font-mono">
                    {inst.due_date}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGES[inst.status] || STATUS_BADGES.PENDING}`}>
                      {(inst.status || 'PENDING').replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={e => { e.stopPropagation(); setSelectedInstance(inst); }}
                        className="h-8 text-xs font-bold border-indigo-200 hover:bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:hover:bg-indigo-950/40 rounded-xl"
                      >
                        <Activity size={13} className="mr-1" /> {isAdmin ? 'Detail Task' : 'Kerjakan'}
                      </Button>

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={e => {
                            e.stopPropagation();
                            setRoutineToDelete({ id: inst.routine_id || inst.id, title: inst.routine_title || 'Task' });
                          }}
                          title="Hapus Task"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Add Routine Modal */}
      {renderAddModal()}
      {/* Task Detail Modal */}
      {renderTaskDetailModal()}
      {/* Delete Confirmation Modal */}
      {renderDeleteModal()}
    </div>
  );

  // ── Task Detail Modal ─────────────────────────────────────────────────────
  function renderTaskDetailModal() {
    return (
      <Dialog open={!!selectedInstance} onOpenChange={(open) => !open && setSelectedInstance(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
          {selectedInstance && (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <Activity size={18} />
                    <span className="text-sm font-semibold">Detail Task / Routine Activity</span>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGES[selectedInstance.status] || STATUS_BADGES.PENDING}`}>
                    {(selectedInstance.status || 'PENDING').replace(/_/g, ' ')}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-foreground leading-snug">
                  {selectedInstance.routine_title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Kategori: <span className="font-bold text-indigo-600">{selectedInstance.routine_category}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Information cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 border border-border/20 p-3.5 rounded-2xl">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Periode</p>
                    <p className="text-xs font-extrabold text-foreground font-mono">{selectedInstance.period_start} s/d {selectedInstance.period_end}</p>
                  </div>
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/30 p-3.5 rounded-2xl">
                    <p className="text-xs font-medium text-indigo-600 mb-1">Tenggat Waktu (Due Date)</p>
                    <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono">{selectedInstance.due_date}</p>
                  </div>
                </div>

                {/* Dokumen Acuan dari Admin — hanya tampil jika ada attachment */}
                {selectedInstance.admin_attachment_url && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                          <Paperclip size={16} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-indigo-600 mb-0.5">Dokumen Acuan dari Admin</p>
                          <p className="text-xs font-bold text-foreground truncate max-w-[280px]">
                            {selectedInstance.admin_attachment_name || 'Dokumen Acuan'}
                          </p>
                        </div>
                      </div>
                      <a
                        href={selectedInstance.admin_attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 shrink-0"
                      >
                        Buka File <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Hasil Pengerjaan Staff (Jika Sudah Selesai) */}
                {selectedInstance.status === 'COMPLETED' && (
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={16} />
                      <span className="text-xs font-medium">Pekerjaan Telah Selesai</span>
                    </div>
                    {selectedInstance.completed_at && (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                        Diselesaikan pada: {new Date(selectedInstance.completed_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                    )}
                    {selectedInstance.completion_notes && (
                      <div className="bg-white/80 dark:bg-zinc-900/50 p-3 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 text-xs font-medium text-foreground">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">Catatan Staff:</span>
                        {selectedInstance.completion_notes}
                      </div>
                    )}
                    {(selectedInstance.work_file_url || selectedInstance.work_file_name) && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate max-w-[280px]">
                          📄 File Hasil: {selectedInstance.work_file_name || 'Dokumen_Hasil_Kerja'}
                        </span>
                        {selectedInstance.work_file_url && (
                          <a
                            href={selectedInstance.work_file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 shrink-0"
                          >
                            Buka di Google Drive <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Form Pengerjaan & Upload File oleh Staff (Jika Belum Selesai, hanya Staff) */}
                {!isAdmin && selectedInstance.status !== 'COMPLETED' && (
                  <div className="bg-muted/30 border border-border/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <Save size={15} className="text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Form Hasil Pengerjaan Staff</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
                        Upload File Hasil Kerjaan (Output)
                      </label>
                      <Input
                        type="file"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) setStaffWorkFile(file);
                        }}
                        className="h-10 text-xs bg-white dark:bg-muted/40 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer"
                      />
                      {staffWorkFile && (
                        <p className="text-[11px] text-emerald-600 font-bold mt-1">
                          File siap dikirim: {staffWorkFile.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
                        Deskripsi / Catatan Pengerjaan Staff
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Tuliskan ringkasan hasil pekerjaan atau penjelasan tambahan..."
                        value={staffWorkNotes}
                        onChange={e => setStaffWorkNotes(e.target.value)}
                        className="w-full p-3 text-xs bg-white dark:bg-muted/40 border border-border/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Ruang Chat / Diskusi Admin <-> Staff */}
                <div className="border-t border-border/30 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <MessageSquare size={16} />
                      <span className="text-xs font-extrabold uppercase tracking-wider">Diskusi & Chat (Admin ↔ Staff CSL)</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{chatMessages.length} Pesan</span>
                  </div>

                  {/* Bubble List */}
                  <div className="bg-muted/20 border border-border/20 rounded-2xl p-3 h-44 overflow-y-auto space-y-2.5">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Belum ada instruksi atau chat. Tulis pesan di bawah untuk memulai diskusi.
                      </div>
                    ) : (
                      chatMessages.map(msg => {
                        const isMe = (isAdmin && msg.sender_role === 'admin') || (!isAdmin && msg.sender_role === 'staff');
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-semibold text-muted-foreground">{msg.sender_name}</span>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                msg.sender_role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {msg.sender_role}
                              </span>
                            </div>
                            <div className={`p-2.5 rounded-2xl max-w-[85%] text-xs font-medium ${
                              isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-muted border border-border/40 text-foreground rounded-tl-none shadow-sm'
                            }`}>
                              {msg.message}
                            </div>
                            <span className="text-xs text-muted-foreground mt-0.5 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Chat */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ketik pesan / pertanyakan ke Admin/Staff..."
                      value={newChatMsg}
                      onChange={e => setNewChatMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSendChat())}
                      className="h-10 text-xs bg-muted/30 border-border/30 rounded-xl flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleSendChat}
                      disabled={!newChatMsg.trim()}
                      className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                    >
                      <Send size={14} />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 pb-6 pt-4 border-t border-border/30 flex gap-2 sm:justify-end shrink-0">
                <Button variant="outline" size="sm" onClick={() => setSelectedInstance(null)} className="text-xs font-bold rounded-xl h-9">
                  Tutup
                </Button>
                {!isAdmin && selectedInstance.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    disabled={isSubmittingWork}
                    onClick={handleCompleteWork}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 px-5 shadow-md"
                  >
                    <CheckCircle2 size={14} className="mr-1.5" />
                    {isSubmittingWork ? 'Mengirim Pekerjaan...' : 'Kirim & Selesaikan Tugas'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // ── Add Routine Modal ─────────────────────────────────────────────────────
  function renderAddModal() {
    return (
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Calendar size={18} />
              <span className="text-sm font-semibold">Routine Schedule</span>
            </div>
            <DialogTitle className="text-xl font-black">Add New Routine Activity</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Create a recurring legal activity, tax filing, or compliance schedule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Routine Activity Title *</label>
              <Input
                required
                placeholder="e.g. Monthly Tax Report Filing"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-10 text-sm bg-muted/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Category *</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold"
                >
                  <option value="Tax">Tax</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Licensing">Licensing / OSS</option>
                  <option value="Corporate Secretary">Corporate Secretary</option>
                  <option value="Notary">Notary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Frequency *</label>
                <select
                  value={formData.frequency}
                  onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                  className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="SEMI_ANNUALLY">Semi-Annually</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Target Due Day of Month</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  required
                  placeholder="15"
                  value={formData.due_day}
                  onChange={e => setFormData({ ...formData, due_day: Number(e.target.value) })}
                  className="h-10 text-sm bg-muted/30 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Assigned PIC (Staff CSL) *</label>
                <select
                  required
                  value={formData.assigned_pic_name}
                  onChange={e => setFormData({ ...formData, assigned_pic_name: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold"
                >
                  <option value="">-- Pilih Staff CSL --</option>
                  {staffUsers.length > 0 ? (
                    staffUsers.map(u => (
                      <option key={u.id} value={u.full_name}>
                        {u.full_name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Desi Rahmuni">Desi Rahmuni</option>
                      <option value="Sylvia">Sylvia</option>
                      <option value="Budi S.">Budi S.</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Description</label>
              <textarea
                rows={3}
                placeholder="Scope of routine activity, requirements, and notes..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 text-xs bg-muted/30 border border-border/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
              />
            </div>

            {/* Lampiran Dokumen Acuan (Admin) */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/30 rounded-2xl p-4 space-y-2">
              <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block flex items-center gap-1.5">
                <Paperclip size={13} /> Lampiran Dokumen Acuan untuk Staff (Opsional)
              </label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAdminFile(file);
                    setAdminFilePreview({ url: URL.createObjectURL(file), name: file.name });
                  }
                }}
                className="h-10 text-xs bg-white dark:bg-muted/30 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"
              />
              {adminFilePreview && (
                <div className="flex items-center gap-2 mt-1">
                  <Paperclip size={12} className="text-indigo-500 shrink-0" />
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold truncate">{adminFilePreview.name}</span>
                  <button type="button" onClick={() => { setAdminFile(null); setAdminFilePreview(null); }} className="text-[10px] text-red-500 hover:underline ml-auto shrink-0">Hapus</button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">File ini akan terlihat oleh Staff saat membuka task detail.</p>
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs font-bold rounded-xl h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                <Save size={14} className="mr-1.5" /> {isSubmitting ? 'Saving...' : 'Save Routine'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Delete Confirmation Modal ──────────────────────────────────────────────
  function renderDeleteModal() {
    return (
      <Dialog open={!!routineToDelete} onOpenChange={(open) => !open && setRoutineToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] p-6 bg-card rounded-2xl border border-border/60 shadow-2xl font-sans">
          <div className="flex flex-col space-y-2 text-left pt-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 leading-tight">
              Hapus Routine / Task Permanen?
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-normal">
              Tindakan ini tidak dapat dibatalkan. Tugas <span className="font-semibold text-slate-800 dark:text-zinc-200">"{routineToDelete?.title}"</span> beserta seluruh data percakapan dan dokumen yang terkait akan dihapus secara permanen dari sistem.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRoutineToDelete(null)}
              className="text-xs font-semibold h-9 px-4 rounded-lg border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmDeleteRoutine}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9 px-5 rounded-lg shadow-sm transition-colors"
            >
              Ya, Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
};
