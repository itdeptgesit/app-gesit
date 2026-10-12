import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus, RefreshCcw, Printer, CheckCircle2, XCircle, Clock,
  Search, Trash2, Receipt, DollarSign, MoreVertical, Eye,
  Building2, Landmark, FileText, Loader2, Globe, User, AlertCircle, Paperclip,
  Upload, Download, CloudUpload, X as XIcon, Pencil, ShieldCheck,
  UserCheck, CalendarClock, Calendar, Layers, CreditCard, ExternalLink
} from 'lucide-react';
import { getCurrencyFlag } from '@/services/cslBudgetReportService';
import { sendEmailNotification } from '../utils/cslNotificationUtils';
import { generateExpenseApprovalPdf } from '../utils/cslExpensePdf';
import { fetchLiveExchangeRate } from '../utils/cslExchangeRateUtils';

export interface UnifiedExpenseApproval {
  id: string;
  expense_number: string;
  voucher_number?: string;
  company: string;
  department: string;
  project_name: string;
  request_date: string;
  paid_to: string;
  payee_type: 'Company' | 'Individual';
  payment_method: string;
  payment_location?: string;
  currency: string;
  amount: number;
  exchange_rate: number;
  exchange_rate_source?: 'API' | 'Manual';
  exchange_rate_date?: string;
  reporting_currency: string;
  reporting_amount: number;
  
  // Bank Information
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_code?: string;
  swift_code?: string;
  account_number_foreign?: string;
  account_number_usd?: string;

  // Invoice & Accounting Information
  invoice_number?: string;
  account_code?: string;
  payment_description?: string;
  category?: string;
  note?: string;

  total_amount?: number;
  prepared_by_name: string;
  prepared_by_id?: string;
  approved_by_name?: string;
  approved_by_id?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  invoice_attachment_id?: string;
}

const EMPTY_FORM = {
  company: 'PT Bumi Grafika Jaya',
  department: 'CSL',
  request_date: new Date().toISOString().split('T')[0],
  project_name: '',
  paid_to: '',
  payee_type: 'Company' as 'Company' | 'Individual',
  payment_method: 'Bank Transfer / T.T',
  currency: 'IDR',
  amount: '',
  exchange_rate: '1',
  exchange_rate_source: 'API' as 'API' | 'Manual',
  exchange_rate_date: new Date().toISOString().split('T')[0],
  reporting_currency: 'IDR',
  reporting_amount: '',
  bank_name: '',
  account_number: '',
  account_name: '',
  bank_code: '',
  swift_code: '',
  account_number_foreign: '',
  account_number_usd: '',
  invoice_number: '',
  account_code: '',
  payment_description: '',
  note: '',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_APPROVAL: 'border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium',
  APPROVED:         'border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-medium',
  DISBURSED:        'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  PAID:             'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  REJECTED:         'border-rose-500/25 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-medium',
  DRAFT:            'border-zinc-500/25 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 font-medium',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED:         'Approved',
  DISBURSED:        'Disbursed / Paid',
  PAID:             'Disbursed / Paid',
  REJECTED:         'Rejected',
  DRAFT:            'Draft',
};

const formatStatusText = (status: string) => {
  if (!status) return '';
  return STATUS_LABEL[status] || status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const formatRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const formatCurrencyAmount = (currency: string, amount: number) => {
  if (currency === 'IDR') {
    return formatRp(amount);
  }
  return `${currency} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
};

const formatDisplayDate = (dStr?: string) => {
  if (!dStr) return '-';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dStr;
  }
};

const formatFullDateTime = (dStr?: string) => {
  if (!dStr) return '-';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  } catch {
    return dStr;
  }
};

/**
 * Format string or number with thousands separator dots (Indonesian standard format).
 * E.g. 300000 -> "300.000", 15000000 -> "15.000.000"
 */
const formatAmountWithDots = (val: string | number, isIdr: boolean = true): string => {
  if (val === '' || val === null || val === undefined) return '';
  const s = String(val);

  if (isIdr) {
    // Only numeric digits for IDR
    const digits = s.replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(Number(digits));
  } else {
    // For foreign currency, allow comma as decimal separator (Indonesian convention)
    if (s.includes(',')) {
      const parts = s.split(',');
      const intDigits = parts[0].replace(/\D/g, '');
      const decDigits = parts.slice(1).join('').replace(/\D/g, '').slice(0, 2);
      const formattedInt = intDigits ? new Intl.NumberFormat('id-ID').format(Number(intDigits)) : '0';
      return parts.length > 1 ? `${formattedInt},${decDigits}` : formattedInt;
    }

    // If user pasted standard float e.g. "4500.50"
    if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length === 2 && parts[1].length <= 2 && parts[0].length > 0) {
        const intDigits = parts[0].replace(/\D/g, '');
        const decDigits = parts[1].replace(/\D/g, '').slice(0, 2);
        const formattedInt = intDigits ? new Intl.NumberFormat('id-ID').format(Number(intDigits)) : '0';
        return `${formattedInt},${decDigits}`;
      }
    }

    const digits = s.replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(Number(digits));
  }
};

const parseFormattedAmount = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).trim();
  if (!s) return 0;

  if (s.includes(',')) {
    const clean = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  const clean = s.replace(/\./g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block tracking-wide uppercase">
    {children}
  </label>
);

// ─── Progress Overlay Component ──────────────────────────────────────────────
interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

interface ProgressOverlayProps {
  open: boolean;
  title: string;
  subtitle?: string;
  progress: number; // 0–100
  steps: ProgressStep[];
  variant?: 'upload' | 'download' | 'export';
}

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ open, title, subtitle, progress, steps, variant = 'upload' }) => {
  if (!open) return null;

  const colors = {
    upload:   { bar: 'from-indigo-500 to-violet-500', glow: 'shadow-indigo-500/40', icon: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    download: { bar: 'from-emerald-500 to-teal-500',  glow: 'shadow-emerald-500/40', icon: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    export:   { bar: 'from-amber-500 to-orange-500',   glow: 'shadow-amber-500/40', icon: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  }[variant];

  const Icon = variant === 'upload' ? CloudUpload : variant === 'download' ? Download : Printer;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] max-w-[calc(100vw-2rem)] bg-card border border-border/60 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
          <span className={`text-xs font-bold font-mono ${colors.icon} tabular-nums`}>{Math.round(progress)}%</span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${colors.bar} shadow-md ${colors.glow} transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {step.status === 'done' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                )}
                {step.status === 'active' && (
                  <Loader2 className={`h-3.5 w-3.5 ${colors.icon} animate-spin`} />
                )}
                {step.status === 'error' && (
                  <XIcon className="h-3.5 w-3.5 text-rose-500" />
                )}
                {step.status === 'pending' && (
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
              <span className={`text-xs transition-colors ${
                step.status === 'active'  ? `font-semibold ${colors.icon}` :
                step.status === 'done'   ? 'text-foreground/70 line-through decoration-1' :
                step.status === 'error'  ? 'text-rose-500 font-medium' :
                'text-muted-foreground/50'
              }`}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Animated dots */}
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${colors.bar} animate-bounce`}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

export const CSLExpenseApproval: React.FC<{ currentUser: UserAccount | null }> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<UnifiedExpenseApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<UnifiedExpenseApproval | null>(null);
  const [editStatus, setEditStatus] = useState<string>('PENDING_APPROVAL');
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState<UnifiedExpenseApproval | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'delete' | 'disburse' | null>(null);
  const [viewingDetail, setViewingDetail] = useState<UnifiedExpenseApproval | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Exchange rate automatic fetching state
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateFetchError, setRateFetchError] = useState<string | null>(null);

  // Progress overlay state
  const [uploadProgress, setUploadProgress]   = useState({ open: false, progress: 0, steps: [] as ProgressStep[], subtitle: '' });
  const [exportProgress, setExportProgress]   = useState({ open: false, progress: 0, steps: [] as ProgressStep[], subtitle: '' });
  const [downloadProgress, setDownloadProgress] = useState({ open: false, progress: 0, steps: [] as ProgressStep[], subtitle: '' });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [designatedApproverEmail, setDesignatedApproverEmail] = useState<string>(
    localStorage.getItem('csl_expense_approver') || 'natalia@gesit.co.id'
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      let matchTab = true;
      if (activeTab === 'Company') matchTab = (e.payee_type || 'Company') === 'Company';
      else if (activeTab === 'Individual') matchTab = e.payee_type === 'Individual';
      else if (activeTab === 'PENDING_APPROVAL') matchTab = e.status === 'PENDING_APPROVAL';
      else if (activeTab === 'APPROVED') matchTab = e.status === 'APPROVED';
      else if (activeTab === 'PAID') matchTab = e.status === 'DISBURSED' || e.status === 'PAID';
      else if (activeTab === 'REJECTED') matchTab = e.status === 'REJECTED';

      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        e.expense_number?.toLowerCase().includes(q) ||
        e.project_name?.toLowerCase().includes(q) ||
        e.payment_description?.toLowerCase().includes(q) ||
        e.paid_to?.toLowerCase().includes(q) ||
        e.prepared_by_name?.toLowerCase().includes(q) ||
        e.invoice_number?.toLowerCase().includes(q);

      return matchTab && matchSearch;
    });
  }, [expenses, searchTerm, activeTab]);

  // Reset ke halaman 1 saat filter/search berubah
  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const pagedExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const roleLower = (currentUser?.role || '').trim().toLowerCase();
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner' || (currentUser?.groups || []).some(g => g.toLowerCase().includes('super_admin') || g.toLowerCase().includes('super admin'));

  const handleOpenEdit = (exp: UnifiedExpenseApproval) => {
    setEditingExpense(exp);
    setEditStatus(exp.status || 'PENDING_APPROVAL');
    setAttachmentFile(null);
    setForm({
      company: exp.company || 'PT Bumi Grafika Jaya',
      department: exp.department || 'CSL',
      request_date: exp.request_date || new Date().toISOString().split('T')[0],
      project_name: exp.project_name || '',
      paid_to: exp.paid_to || '',
      payee_type: (exp.payee_type as 'Company' | 'Individual') || 'Company',
      payment_method: exp.payment_method || 'Bank Transfer / T.T',
      currency: exp.currency || 'IDR',
      amount: exp.amount ? formatAmountWithDots(String(exp.amount), (exp.currency || 'IDR') === 'IDR') : '',
      exchange_rate: String(exp.exchange_rate || 1),
      exchange_rate_source: (exp.exchange_rate_source as 'API' | 'Manual') || 'API',
      exchange_rate_date: exp.exchange_rate_date || exp.request_date || new Date().toISOString().split('T')[0],
      reporting_currency: exp.reporting_currency || 'IDR',
      reporting_amount: exp.reporting_amount ? String(exp.reporting_amount) : '',
      bank_name: exp.bank_name || '',
      account_number: exp.account_number || '',
      account_name: exp.account_name || '',
      bank_code: exp.bank_code || '',
      swift_code: exp.swift_code || '',
      account_number_foreign: exp.account_number_foreign || '',
      account_number_usd: exp.account_number_usd || '',
      invoice_number: exp.invoice_number || '',
      account_code: exp.account_code || '',
      payment_description: exp.payment_description || '',
      note: exp.note || '',
    });
    setIsFormOpen(true);
  };

  const isDesignatedApprover = useMemo(() => {
    if (!currentUser?.email || !designatedApproverEmail) return false;
    return currentUser.email.trim().toLowerCase() === designatedApproverEmail.trim().toLowerCase();
  }, [currentUser, designatedApproverEmail]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data, error }, { data: sysSettings }] = await Promise.all([
        supabase.from('csl_expense_approvals').select('*').order('created_at', { ascending: false }),
        supabase.from('csl_system_settings').select('setting_value').eq('setting_key', 'csl_expense_approver').maybeSingle()
      ]);

      if (error) {
        if (error.code === '42P01') {
          setExpenses([]);
        } else {
          toast.error('Failed to load expense requests: ' + error.message);
        }
        return;
      }
      if (data) {
        const normalized = data.map(item => ({
          ...item,
          payee_type: item.payee_type || 'Company',
          currency: item.currency || 'IDR',
          amount: Number(item.amount || item.total_amount || 0),
          exchange_rate: Number(item.exchange_rate || 1),
          exchange_rate_source: item.exchange_rate_source || 'API',
          reporting_currency: item.reporting_currency || 'IDR',
          reporting_amount: Number(item.reporting_amount || item.total_amount || 0),
        }));
        setExpenses(normalized);
      }
      if (sysSettings?.setting_value) {
        setDesignatedApproverEmail(sysSettings.setting_value);
        localStorage.setItem('csl_expense_approver', sysSettings.setting_value);
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Handler for automatic live exchange rate fetching (with historical date support)
  const handleFetchRate = async (curr: string, ignoreCache = false, targetDate?: string) => {
    const upper = (curr || 'IDR').toUpperCase().trim();
    const cleanDate = targetDate || form.exchange_rate_date || form.request_date || new Date().toISOString().split('T')[0];

    if (upper === 'IDR') {
      setForm(f => ({
        ...f,
        currency: 'IDR',
        exchange_rate: '1',
        exchange_rate_source: 'API',
        exchange_rate_date: cleanDate,
      }));
      setRateFetchError(null);
      return;
    }

    setIsFetchingRate(true);
    setRateFetchError(null);
    try {
      const res = await fetchLiveExchangeRate(upper, ignoreCache, cleanDate);
      setForm(f => ({
        ...f,
        currency: upper,
        exchange_rate: String(res.rate),
        exchange_rate_source: res.source,
        exchange_rate_date: cleanDate,
      }));

      if (res.error) {
        setRateFetchError(res.error);
        toast.warning(res.error);
      } else {
        const formatted = new Intl.NumberFormat('id-ID').format(res.rate);
        toast.success(`Exchange rate (${upper} → IDR): ${formatted} [${res.effectiveDate || cleanDate}]`);
      }
    } catch (err: any) {
      setRateFetchError('Unable to retrieve the exchange rate.');
      toast.error('Failed to fetch exchange rate: ' + err.message);
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handleCurrencyChange = (newCurr: string) => {
    setForm(f => {
      const updatedAmount = f.amount ? formatAmountWithDots(f.amount, newCurr === 'IDR') : '';
      return { ...f, currency: newCurr, amount: updatedAmount };
    });
    handleFetchRate(newCurr, false, form.exchange_rate_date);
  };

  const handleExchangeRateDateChange = (newDate: string) => {
    setForm(prev => ({ ...prev, exchange_rate_date: newDate }));
    if (form.currency !== 'IDR' && newDate) {
      handleFetchRate(form.currency, false, newDate);
    }
  };

  const handleRequestDateChange = (newReqDate: string) => {
    const shouldSync = !form.exchange_rate_date || form.exchange_rate_date === form.request_date;
    setForm(prev => ({
      ...prev,
      request_date: newReqDate,
      exchange_rate_date: shouldSync ? newReqDate : prev.exchange_rate_date,
    }));
    if (shouldSync && form.currency !== 'IDR' && newReqDate) {
      handleFetchRate(form.currency, false, newReqDate);
    }
  };

  const handleManualRateChange = (val: string) => {
    setForm(f => ({
      ...f,
      exchange_rate: val,
      exchange_rate_source: 'Manual',
    }));
  };

  const generateNumber = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `EXP-${now.getFullYear()}${pad(now.getMonth() + 1)}-${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  const generateVoucherNumber = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `KK-${now.getFullYear()}${pad(now.getMonth() + 1)}-${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const isEdit = !!editingExpense;
    const hasFile = !!attachmentFile;
    const uploadSteps: ProgressStep[] = isEdit ? (
      hasFile ? [
        { label: 'Validating updated data', status: 'pending' },
        { label: 'Reading invoice file', status: 'pending' },
        { label: 'Uploading to Google Drive', status: 'pending' },
        { label: 'Saving changes to database', status: 'pending' },
      ] : [
        { label: 'Validating updated data', status: 'pending' },
        { label: 'Saving changes to database', status: 'pending' },
      ]
    ) : (
      hasFile ? [
        { label: 'Validating form data', status: 'pending' },
        { label: 'Reading invoice file', status: 'pending' },
        { label: 'Uploading to Google Drive', status: 'pending' },
        { label: 'Saving expense request', status: 'pending' },
        { label: 'Sending email notification', status: 'pending' },
      ] : [
        { label: 'Validating form data', status: 'pending' },
        { label: 'Saving expense request', status: 'pending' },
        { label: 'Sending email notification', status: 'pending' },
      ]
    );

    const setStep = (index: number, status: ProgressStep['status'], prog: number) => {
      setUploadProgress(prev => ({
        ...prev,
        progress: prog,
        steps: prev.steps.map((s, i) => i === index ? { ...s, status } : i < index ? { ...s, status: 'done' } : s),
      }));
    };

    setUploadProgress({
      open: false,
      progress: 0,
      subtitle: isEdit ? (editingExpense?.expense_number || 'updating record') : (attachmentFile?.name || 'expense request'),
      steps: uploadSteps
    });
    await sleep(150);

    try {
      let attachmentId = null;
      let stepIdx = 0;

      // Step: Validate
      setStep(stepIdx, 'active', 5);
      await sleep(400);
      const numAmount = parseFormattedAmount(form.amount);
      if (isNaN(numAmount) || numAmount <= 0) throw new Error('Please enter a valid amount greater than zero.');
      const numRate = form.currency === 'IDR' ? 1 : Number(form.exchange_rate);
      if (isNaN(numRate) || numRate <= 0) throw new Error('Please enter a valid exchange rate.');
      setStep(stepIdx, 'done', hasFile ? 15 : 40);
      stepIdx++;

      if (hasFile) {
        // Step: Read file
        setStep(stepIdx, 'active', 25);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(attachmentFile!);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });
        setStep(stepIdx, 'done', 40);
        stepIdx++;

        // Step: Upload to Drive
        setStep(stepIdx, 'active', 45);
        // Simulate sub-progress ticks while uploading
        const tickInterval = setInterval(() => {
          setUploadProgress(prev => ({ ...prev, progress: Math.min(prev.progress + 3, 75) }));
        }, 300);

        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
          body: {
            fileName: `[Expense_Inv] ${attachmentFile!.name}`,
            fileMimeType: attachmentFile!.type || 'application/pdf',
            fileBase64: base64,
            requesterEmail: currentUser?.email,
            folderType: 'document'
          }
        });
        clearInterval(tickInterval);

        if (uploadError || !uploadData?.success) throw new Error('Failed to upload invoice attachment to Google Drive.');
        attachmentId = uploadData.fileId;
        setStep(stepIdx, 'done', 80);
        stepIdx++;
      }

      const numReportingAmount = form.currency === 'IDR' ? numAmount : Math.round(numAmount * numRate);

      if (isEdit && editingExpense) {
        // Save Updates to DB
        setStep(stepIdx, 'active', 85);
        const updatePayload: any = {
          company: form.company,
          department: form.department,
          request_date: form.request_date,
          project_name: form.project_name,
          paid_to: form.paid_to,
          payee_type: form.payee_type,
          payment_method: form.payment_method,
          currency: form.currency,
          amount: numAmount,
          exchange_rate: numRate,
          exchange_rate_source: form.currency === 'IDR' ? 'API' : form.exchange_rate_source,
          exchange_rate_date: form.exchange_rate_date,
          total_amount: numReportingAmount,
          reporting_amount: numReportingAmount,
          reporting_currency: 'IDR',
          bank_name: form.bank_name,
          account_number: form.account_number,
          account_name: form.account_name,
          bank_code: form.bank_code || null,
          swift_code: form.swift_code || null,
          account_number_foreign: form.account_number_foreign || null,
          account_number_usd: form.account_number_usd || null,
          invoice_number: form.invoice_number || null,
          account_code: form.account_code || null,
          payment_description: form.payment_description,
          note: form.note || null,
        };

        if (isSuperAdmin && editStatus) {
          updatePayload.status = editStatus;
          
          // If setting to an approval/final state, update the approver info as well
          if (['APPROVED', 'REJECTED', 'DISBURSED', 'PAID'].includes(editStatus)) {
            updatePayload.approved_by_name = currentUser?.fullName || currentUser?.email;
            updatePayload.approved_by_id = currentUser?.id;
          }
        }

        updatePayload.updated_at = new Date().toISOString();

        if (attachmentId) {
          updatePayload.invoice_attachment_id = attachmentId;
        }

        const { error } = await supabase
          .from('csl_expense_approvals')
          .update(updatePayload)
          .eq('id', editingExpense.id);

        if (error) throw error;
        setStep(stepIdx, 'done', 100);

        await sleep(600);
        setUploadProgress(p => ({ ...p, open: false }));
        toast.success('Expense request updated successfully!');
        setIsFormOpen(false);
        setEditingExpense(null);
        setForm(EMPTY_FORM);
        setAttachmentFile(null);
        fetchData();
      } else {
        // Step: Save to DB
        setStep(stepIdx, 'active', hasFile ? 80 : 50);
        const payload = {
          ...form,
          amount: numAmount,
          exchange_rate: numRate,
          exchange_rate_source: form.currency === 'IDR' ? 'API' : form.exchange_rate_source,
          total_amount: numReportingAmount,
          reporting_amount: numReportingAmount,
          reporting_currency: 'IDR',
          expense_number: generateNumber(),
          voucher_number: generateVoucherNumber(),
          prepared_by_name: currentUser?.fullName || currentUser?.email || 'Staff CSL',
          prepared_by_id: currentUser?.id ? String(currentUser.id) : null,
          status: 'PENDING_APPROVAL',
          invoice_attachment_id: attachmentId,
          created_at: new Date().toISOString()
        };
        const { error } = await supabase.from('csl_expense_approvals').insert([payload]);
        if (error) throw error;
        setStep(stepIdx, 'done', hasFile ? 88 : 70);
        stepIdx++;

        // Step: Email notification
        setStep(stepIdx, 'active', hasFile ? 92 : 80);
        const approverEmail = designatedApproverEmail || 'natalia@gesit.co.id';
        if (approverEmail) {
          await sendEmailNotification(
            approverEmail,
            `[CSL] New Expense Request: ${payload.expense_number}`,
            `Hello,\n\nA new Expense Request (${payload.payee_type}) requires your review.\n\nRequest No : ${payload.expense_number}\nProject    : ${payload.project_name}\nPaid to    : ${payload.paid_to}\nAmount     : ${formatCurrencyAmount(payload.currency, payload.amount)}\nReporting  : ${formatRp(payload.reporting_amount)}\nPrepared by: ${payload.prepared_by_name}\n\nPlease log in to CSL System to review.\n\nThank you.`
          );
        }
        setStep(stepIdx, 'done', 100);

        await sleep(700);
        setUploadProgress(p => ({ ...p, open: false }));
        toast.success('Expense request submitted successfully!');
        setIsFormOpen(false);
        setEditingExpense(null);
        setForm(EMPTY_FORM);
        setAttachmentFile(null);
        fetchData();
      }
    } catch (err: any) {
      setUploadProgress(p => ({
        ...p,
        steps: p.steps.map(s => s.status === 'active' ? { ...s, status: 'error' } : s),
      }));
      await sleep(1200);
      setUploadProgress(p => ({ ...p, open: false }));
      toast.error('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (target?: UnifiedExpenseApproval) => {
    const item = target || selected;
    if (!item) return;
    try {
      const { error } = await supabase.from('csl_expense_approvals').update({
        status: 'APPROVED',
        approved_by_name: currentUser?.fullName || currentUser?.email,
        approved_by_id: currentUser?.id,
      }).eq('id', item.id);
      if (error) { toast.error('Failed to approve: ' + error.message); return; }
      toast.success(`Expense request ${item.expense_number} approved successfully.`);
      setSelected(null);
      setConfirmAction(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error approving expense: ' + err.message);
    }
  };

  const handleReject = async (target?: UnifiedExpenseApproval) => {
    const item = target || selected;
    if (!item) return;
    try {
      const { error } = await supabase.from('csl_expense_approvals').update({
        status: 'REJECTED',
        approved_by_name: currentUser?.fullName || currentUser?.email,
        approved_by_id: currentUser?.id,
      }).eq('id', item.id);
      if (error) { toast.error('Failed to reject: ' + error.message); return; }
      toast.success(`Expense request ${item.expense_number} rejected.`);
      setSelected(null);
      setConfirmAction(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error rejecting expense: ' + err.message);
    }
  };

  const handleDisburse = async (target?: UnifiedExpenseApproval) => {
    const item = target || selected;
    if (!item) return;
    try {
      const { error } = await supabase.from('csl_expense_approvals').update({
        status: 'DISBURSED',
      }).eq('id', item.id);
      if (error) { toast.error('Failed to disburse: ' + error.message); return; }
      toast.success(`Expense request ${item.expense_number} marked as disbursed.`);
      setSelected(null);
      setConfirmAction(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error disbursing expense: ' + err.message);
    }
  };

  const handleDelete = async (target?: UnifiedExpenseApproval) => {
    const item = target || selected;
    if (!item) return;
    try {
      const { error } = await supabase.from('csl_expense_approvals').delete().eq('id', item.id);
      if (error) { toast.error('Failed to delete: ' + error.message); return; }
      toast.success(`Expense request ${item.expense_number} deleted successfully.`);
      setSelected(null);
      setConfirmAction(null);
      setSelectedIds(ids => ids.filter(id => id !== item.id));
      fetchData();
    } catch (err: any) {
      toast.error('Error deleting expense: ' + err.message);
    }
  };

  const mapToIndividualVoucher = (item: UnifiedExpenseApproval) => {
    let mappedMethod = item.payment_method || 'TT_TRANSFER';
    if (item.payment_method === 'Bank Transfer / T.T' || item.payment_method === 'T.T / Transfer' || item.payment_method === 'TT_TRANSFER') {
      mappedMethod = 'TT_TRANSFER';
    } else if (item.payment_method === 'Cash' || item.payment_method === 'Tunai' || item.payment_method === 'TUNAI') {
      mappedMethod = 'TUNAI';
    } else if (item.payment_method === 'Giro' || item.payment_method === 'GIRO') {
      mappedMethod = 'GIRO';
    } else if (item.payment_method === 'Cek Tunai' || item.payment_method === 'CEK_TUNAI') {
      mappedMethod = 'CEK_TUNAI';
    }

    return {
      id: item.id,
      invoice_number: item.invoice_number || item.expense_number,
      voucher_number: item.voucher_number || item.expense_number,
      company: item.company,
      paid_to: item.paid_to,
      payment_method: mappedMethod,
      account_code: item.account_code || '',
      payment_description: item.payment_description || item.project_name,
      payment_fee_note: item.note || '',
      foreign_currency: item.currency || 'IDR',
      foreign_amount: Number(item.amount) || Number(item.total_amount) || 0,
      bank_name: item.bank_name,
      account_name: item.account_name,
      bank_code: item.bank_code || '',
      swift_code: item.swift_code || '',
      account_number_foreign: item.account_number_foreign || item.account_number || '',
      account_number_usd: item.account_number_usd || '',
      request_date: item.request_date,
      note: item.note || '',
      prepared_by_name: item.prepared_by_name,
      prepared_by_id: item.prepared_by_id,
      approved_by_name: item.approved_by_name,
      approved_by_id: item.approved_by_id,
      invoice_attachment_id: item.invoice_attachment_id,
      status: item.status,
    };
  };

  const mapToCompanyVoucher = (item: UnifiedExpenseApproval) => ({
    expense_number: item.expense_number,
    company: item.company,
    department: item.department,
    project_name: item.project_name,
    request_date: item.request_date,
    paid_to: item.paid_to,
    note: item.note || '',
    total_amount: Number(item.reporting_amount) || Number(item.total_amount) || Number(item.amount) || 0,
    invoice_number: item.invoice_number || item.expense_number,
    bank_name: item.bank_name,
    account_number: item.account_number,
    account_name: item.account_name,
    prepared_by_name: item.prepared_by_name,
    prepared_by_id: item.prepared_by_id,
    approved_by_name: item.approved_by_name,
    approved_by_id: item.approved_by_id,
    status: item.status,
  });

  const handlePrintPdf = async (item: UnifiedExpenseApproval) => {
    const steps: ProgressStep[] = [
      { label: 'Gathering expense data', status: 'pending' },
      { label: 'Generating PDF layout', status: 'pending' },
      { label: 'Rendering voucher', status: 'pending' },
      { label: 'Opening print dialog', status: 'pending' },
    ];
    setExportProgress({ open: true, progress: 0, subtitle: item.expense_number, steps });

    const setStep = (index: number, status: ProgressStep['status'], prog: number) => {
      setExportProgress(prev => ({
        ...prev,
        progress: prog,
        steps: prev.steps.map((s, i) => i === index ? { ...s, status } : i < index ? { ...s, status: 'done' } : s),
      }));
    };

    try {
      setStep(0, 'active', 10); await sleep(300);
      setStep(0, 'done', 30);
      setStep(1, 'active', 35); await sleep(400);
      setStep(1, 'done', 60);
      setStep(2, 'active', 65); await sleep(350);
      setStep(2, 'done', 85);
      setStep(3, 'active', 90); await sleep(200);

      generateExpenseApprovalPdf([mapToCompanyVoucher(item)]);

      setStep(3, 'done', 100);
      await sleep(600);
    } finally {
      setExportProgress(p => ({ ...p, open: false }));
    }
  };

  const handleDownloadAttachment = async (fileId: string, expenseNumber: string) => {
    const steps: ProgressStep[] = [
      { label: 'Resolving file from Google Drive', status: 'pending' },
      { label: 'Fetching download link', status: 'pending' },
      { label: 'Opening file', status: 'pending' },
    ];
    setDownloadProgress({ open: true, progress: 0, subtitle: `Invoice – ${expenseNumber}`, steps });

    const setStep = (index: number, status: ProgressStep['status'], prog: number) => {
      setDownloadProgress(prev => ({
        ...prev,
        progress: prog,
        steps: prev.steps.map((s, i) => i === index ? { ...s, status } : i < index ? { ...s, status: 'done' } : s),
      }));
    };

    try {
      setStep(0, 'active', 15); await sleep(400);
      setStep(0, 'done', 40);
      setStep(1, 'active', 50); await sleep(300);
      setStep(1, 'done', 75);
      setStep(2, 'active', 85); await sleep(200);

      const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
      window.open(viewUrl, '_blank', 'noopener,noreferrer');

      setStep(2, 'done', 100);
      await sleep(500);
    } catch (err: any) {
      setDownloadProgress(p => ({
        ...p,
        steps: p.steps.map(s => s.status === 'active' ? { ...s, status: 'error' } : s),
      }));
      await sleep(1000);
      toast.error('Failed to open attachment: ' + err.message);
    } finally {
      setDownloadProgress(p => ({ ...p, open: false }));
    }
  };

  // KPI Metrics Calculation
  const totalRequestsCount = expenses.length;
  const totalReportingAmount = expenses.reduce((s, e) => s + (Number(e.reporting_amount) || 0), 0);

  const pendingCount = expenses.filter(e => e.status === 'PENDING_APPROVAL').length;
  const pendingReportingAmount = expenses.filter(e => e.status === 'PENDING_APPROVAL').reduce((s, e) => s + (Number(e.reporting_amount) || 0), 0);

  const approvedCount = expenses.filter(e => e.status === 'APPROVED' || e.status === 'DISBURSED' || e.status === 'PAID').length;
  const approvedReportingAmount = expenses.filter(e => e.status === 'APPROVED' || e.status === 'DISBURSED' || e.status === 'PAID').reduce((s, e) => s + (Number(e.reporting_amount) || 0), 0);

  // Currency Exposure Breakdown (Strictly separated per currency)
  const currencyExposure = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cur = e.currency || 'IDR';
      map[cur] = (map[cur] || 0) + (Number(e.amount) || 0);
    });
    return map;
  }, [expenses]);

  const tabOptions = [
    { key: 'ALL', label: 'All' },
    { key: 'Company', label: 'Company' },
    { key: 'Individual', label: 'Individual' },
    { key: 'PENDING_APPROVAL', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'PAID', label: 'Paid / Disbursed' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">

      {/* ── Page Header ── */}
      <PageHeader
        title="Budget & Expenses"
        description="Unified management of company & individual operational expenses and disbursements"
      >
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const selectedItems = expenses.filter(e => selectedIds.includes(e.id));
                const individualItems = selectedItems.filter(e => e.payee_type === 'Individual');
                const companyItems = selectedItems.filter(e => e.payee_type !== 'Individual');
                const total = selectedItems.length;

                const steps: ProgressStep[] = [
                  { label: `Preparing ${total} voucher${total > 1 ? 's' : ''}`, status: 'pending' },
                  individualItems.length > 0 ? { label: `Generating ${individualItems.length} Individual voucher${individualItems.length > 1 ? 's' : ''}`, status: 'pending' } : null,
                  companyItems.length > 0 ? { label: `Generating ${companyItems.length} Company voucher${companyItems.length > 1 ? 's' : ''}`, status: 'pending' } : null,
                  { label: 'Opening print dialog', status: 'pending' },
                ].filter(Boolean) as ProgressStep[];

                setExportProgress({ open: true, progress: 0, subtitle: `${total} expense request${total > 1 ? 's' : ''}`, steps });

                const advance = (idx: number, prog: number) => {
                  setExportProgress(prev => ({
                    ...prev, progress: prog,
                    steps: prev.steps.map((s, i) => i === idx ? { ...s, status: 'active' } : i < idx ? { ...s, status: 'done' } : s),
                  }));
                };

                advance(0, 15); await sleep(400);
                let stepIdx = 1;

                if (individualItems.length > 0) {
                  advance(stepIdx, 40); await sleep(500);
                  generateExpenseApprovalPdf(individualItems.map(mapToCompanyVoucher));
                  stepIdx++;
                }
                if (companyItems.length > 0) {
                  advance(stepIdx, 70); await sleep(500);
                  generateExpenseApprovalPdf(companyItems.map(mapToCompanyVoucher));
                  stepIdx++;
                }

                advance(stepIdx, 90); await sleep(300);
                setExportProgress(prev => ({
                  ...prev, progress: 100,
                  steps: prev.steps.map(s => ({ ...s, status: 'done' })),
                }));
                await sleep(600);
                setExportProgress(p => ({ ...p, open: false }));
              }}
              className="h-9 text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print {selectedIds.length} request{selectedIds.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reports-budget')}
            className="h-9 text-xs gap-1.5 font-bold"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-500" /> Budget Report
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData} className="h-9 text-xs gap-1.5">
            <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingExpense(null);
              setForm({ ...EMPTY_FORM });
              setAttachmentFile(null);
              setIsFormOpen(true);
            }}
            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md"
          >
            <Plus className="h-3.5 w-3.5" /> Add Expense
          </Button>
        </div>
      </PageHeader>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Requests</span>
            <Receipt size={16} className="text-muted-foreground" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground">{totalRequestsCount}</p>
              <span className="text-xs text-muted-foreground">Requests</span>
            </div>
            <p className="text-xs font-semibold font-mono text-foreground mt-1 truncate">
              {formatRp(totalReportingAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Consolidated total (IDR)</p>
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pending Approval</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-amber-600">{pendingCount}</p>
              <span className="text-xs text-muted-foreground">Requests</span>
            </div>
            <p className="text-xs font-semibold font-mono text-amber-600 mt-1 truncate">
              {formatRp(pendingReportingAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting review</p>
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Approved / Disbursed</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-emerald-600">{approvedCount}</p>
              <span className="text-xs text-muted-foreground">Requests</span>
            </div>
            <p className="text-xs font-semibold font-mono text-emerald-600 mt-1 truncate">
              {formatRp(approvedReportingAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Ready or paid out</p>
          </div>
        </div>

        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Currency Exposure</span>
            <Globe size={16} className="text-indigo-500" />
          </div>
          <div className="mt-1 space-y-0.5 overflow-y-auto max-h-16">
            {Object.keys(currencyExposure).length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              Object.entries(currencyExposure).map(([cur, val]) => (
                <div key={cur} className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-muted-foreground">{cur}:</span>
                  <span className="font-bold text-foreground">{formatCurrencyAmount(cur, val)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar & Tabs ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search project, vendor, payee, invoice..."
              className="pl-9 h-9 text-sm rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto">
            {tabOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  activeTab === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-card">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Expense Requests &amp; Invoices</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Manage operational costs, payee classifications, and payment vouchers</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted/50 border border-border/50 px-2.5 py-1 rounded-md">
            {filteredExpenses.length} Record{filteredExpenses.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading expense requests…</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-20 text-center">
            <Receipt className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No expense requests found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or tab filter.</p>
          </div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="w-10 pl-5">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={selectedIds.length === pagedExpenses.length && pagedExpenses.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? pagedExpenses.map(x => x.id) : [])}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Expense / Date</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Payee Type</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Paid To</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Project / Description</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Currency &amp; Amount</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Prepared By</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Status</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80 text-right pr-5">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedExpenses.map(exp => (
                <TableRow
                  key={exp.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setViewingDetail(exp)}
                >
                  <TableCell className="pl-5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={selectedIds.includes(exp.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, exp.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== exp.id));
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <p className="font-mono text-xs font-semibold text-foreground">{exp.expense_number}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(exp.request_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {exp.invoice_number && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate max-w-[130px]" title={`Invoice: ${exp.invoice_number}`}>
                        #{exp.invoice_number}
                      </p>
                    )}
                    {exp.invoice_attachment_id && (
                      <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Paperclip className="w-2.5 h-2.5" />
                        Invoice Attached
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      exp.payee_type === 'Individual'
                        ? 'border-purple-500/30 text-purple-600 bg-purple-500/10'
                        : 'border-blue-500/30 text-blue-600 bg-blue-500/10'
                    }`}>
                      {exp.payee_type || 'Company'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <p className="text-xs font-medium text-foreground max-w-[160px] truncate" title={exp.paid_to}>
                      {exp.paid_to}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{exp.company}</p>
                  </TableCell>

                  <TableCell>
                    <p className="text-xs font-medium text-foreground max-w-[200px] truncate" title={exp.project_name}>
                      {exp.project_name}
                    </p>
                    {exp.payment_description && exp.payment_description !== exp.project_name && (
                      <p className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                        {exp.payment_description}
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <img 
                        src={getCurrencyFlag(exp.currency)} 
                        alt={exp.currency} 
                        className="w-3.5 h-3.5 object-contain inline shrink-0" 
                      />
                      <span className="font-mono text-xs font-bold text-foreground">
                        {formatCurrencyAmount(exp.currency, exp.amount)}
                      </span>
                    </div>
                    {exp.currency !== 'IDR' && (
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 pl-5">
                        ≈ {formatRp(exp.reporting_amount)}
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    <p className="text-xs font-medium text-foreground">{exp.prepared_by_name}</p>
                    <p className="text-[11px] text-muted-foreground">{exp.department}</p>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-md border ${STATUS_STYLE[exp.status] || ''}`}>
                      {formatStatusText(exp.status)}
                    </Badge>
                    {exp.approved_by_name && (exp.status === 'APPROVED' || exp.status === 'DISBURSED' || exp.status === 'PAID') && (
                      <div className="text-[9px] text-muted-foreground font-medium mt-0.5 truncate max-w-[120px]" title={`Approved by: ${exp.approved_by_name}`}>
                        ✓ {exp.approved_by_name}
                      </div>
                    )}
                    {exp.approved_by_name && exp.status === 'REJECTED' && (
                      <div className="text-[9px] text-rose-500 font-medium mt-0.5 truncate max-w-[120px]" title={`Rejected by: ${exp.approved_by_name}`}>
                        ✕ {exp.approved_by_name}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right pr-5" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" />}>
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setViewingDetail(exp)} className="gap-2 text-xs">
                          <Eye className="h-3.5 w-3.5" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintPdf(exp)} className="gap-2 text-xs">
                          <Printer className="h-3.5 w-3.5" /> Print PDF voucher
                        </DropdownMenuItem>

                        {isDesignatedApprover && exp.status === 'PENDING_APPROVAL' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('approve'); }}
                              className="gap-2 text-xs text-emerald-600 focus:text-emerald-600 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve request
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('reject'); }}
                              className="gap-2 text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject request
                            </DropdownMenuItem>
                          </>
                        )}

                        {isDesignatedApprover && exp.status === 'APPROVED' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('disburse'); }}
                              className="gap-2 text-xs text-blue-600 focus:text-blue-600 cursor-pointer"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Mark as disbursed / paid
                            </DropdownMenuItem>
                          </>
                        )}

                        {isSuperAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(exp)}
                              className="gap-2 text-xs text-amber-600 focus:text-amber-600 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit request
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setSelected(exp); setConfirmAction('delete'); }}
                              className="gap-2 text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete request
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>

            {/* ── Pagination ── */}
            {filteredExpenses.length > 0 && (
              <div className="px-5 py-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 bg-card">
                <p className="text-xs text-muted-foreground">
                  Showing{' '}
                  <span className="font-semibold text-foreground">
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredExpenses.length)}
                  </span>{' '}of{' '}<span className="font-semibold text-foreground">{filteredExpenses.length}</span>{' '}record{filteredExpenses.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L4 6l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`h-7 min-w-[28px] px-1.5 rounded-md border text-xs font-medium transition-colors ${
                        currentPage === p
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-border/60 text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8 6l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CREATE / EDIT EXPENSE REQUEST DIALOG (WITH AUTOMATIC EXCHANGE RATE) ── */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingExpense(null);
          setForm(EMPTY_FORM);
          setAttachmentFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/40 bg-card">
            <div className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                editingExpense ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-600'
              }`}>
                {editingExpense ? <Pencil className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-semibold">
                    {editingExpense ? 'Edit Expense Request' : 'Create Expense Request'}
                  </DialogTitle>
                  {editingExpense && (
                    <Badge variant="outline" className="font-mono text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5">
                      {editingExpense.expense_number}
                    </Badge>
                  )}
                  {editingExpense && isSuperAdmin && (
                    <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600 bg-indigo-500/5">
                      Super Admin Mode
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {editingExpense
                    ? 'Update expense details, amounts, bank info, and approval status'
                    : 'Submit company or individual expense approval requests'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6 max-h-[78vh] overflow-y-auto font-sans">
            {/* Super Admin Status Control Bar when editing */}
            {isSuperAdmin && editingExpense && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Super Admin Status Override</p>
                    <p className="text-[11px] text-muted-foreground">You can change the workflow status of this request directly</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-semibold text-muted-foreground">Status:</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="h-8 px-2.5 text-xs font-bold bg-background border border-amber-500/40 rounded-lg focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="DISBURSED">Disbursed / Paid</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* ── SECTION 1: REQUEST INFORMATION ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                1. Request Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Company *</FieldLabel>
                  <Input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <FieldLabel>Department *</FieldLabel>
                  <Input required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <FieldLabel>Request Date *</FieldLabel>
                  <Input required type="date" value={form.request_date?.split('T')[0] || ''} onChange={e => handleRequestDateChange(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <FieldLabel>Project / Expense Name *</FieldLabel>
                  <Input required value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. Notary Fees & Business Licensing" className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* ── SECTION 2: PAYEE INFORMATION ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                2. Payee Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Paid To (Payee / Vendor) *</FieldLabel>
                  <Input required value={form.paid_to} onChange={e => setForm({ ...form, paid_to: e.target.value })} placeholder="e.g. Monica Kusuma Devi" className="h-9 text-sm" />
                </div>

                <div>
                  <FieldLabel>Payee Type *</FieldLabel>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, payee_type: 'Company' })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                        form.payee_type === 'Company' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-background border-input hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Company
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, payee_type: 'Individual' })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                        form.payee_type === 'Individual' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-background border-input hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Individual
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 3: PAYMENT INFORMATION (AUTOMATIC EXCHANGE RATE) ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
                <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                3. Payment Information
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Payment Method *</FieldLabel>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Bank Transfer / T.T">Bank Transfer / T.T</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <FieldLabel>Payment Currency *</FieldLabel>
                  <select
                    value={form.currency}
                    onChange={e => handleCurrencyChange(e.target.value)}
                    className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  >
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="HKD">HKD - Hong Kong Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                  </select>
                </div>

                <div>
                  <FieldLabel>Amount ({form.currency}) *</FieldLabel>
                  <Input
                    required
                    type="text"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={e => {
                      const formatted = formatAmountWithDots(e.target.value, form.currency === 'IDR');
                      setForm({ ...form, amount: formatted });
                    }}
                    placeholder={form.currency === 'IDR' ? 'e.g. 10.000.000' : 'e.g. 4.500'}
                    className="h-9 text-sm font-mono font-bold"
                  />
                  {form.amount && (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      Nominal: {formatCurrencyAmount(form.currency, parseFormattedAmount(form.amount))}
                    </p>
                  )}
                </div>
              </div>

              {/* Conditional Live Exchange Rate Block for Foreign Currency */}
              {form.currency !== 'IDR' && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Globe size={14} /> Live Currency Exchange Rate &amp; Reporting Amount (IDR)
                    </p>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        form.exchange_rate_source === 'Manual'
                          ? 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                          : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                      }`}>
                        Source: {form.exchange_rate_source === 'Manual' ? 'Manual Override' : 'API Auto'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFetchRate(form.currency, true, form.exchange_rate_date)}
                        disabled={isFetchingRate}
                        className="h-6 px-2 text-[10px] gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10"
                        title="Re-fetch rate for selected date"
                      >
                        <RefreshCcw className={`h-3 w-3 ${isFetchingRate ? 'animate-spin' : ''}`} /> Refresh API Rate
                      </Button>
                    </div>
                  </div>

                  {rateFetchError && (
                    <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} />
                        <span>Unable to retrieve the exchange rate. You can enter it manually below.</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFetchRate(form.currency, true, form.exchange_rate_date)}
                        className="h-6 text-[10px] px-2 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Exchange Rate (IDR / {form.currency}) *</FieldLabel>
                      {isFetchingRate ? (
                        <div className="h-8 px-3 flex items-center bg-background border border-input rounded-md text-xs text-muted-foreground animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5 text-indigo-500" /> Loading rate...
                        </div>
                      ) : (
                        <Input
                          required
                          type="number"
                          step="any"
                          value={form.exchange_rate}
                          onChange={e => handleManualRateChange(e.target.value)}
                          placeholder="e.g. 12450"
                          className="h-8 text-xs bg-background font-mono font-bold text-indigo-600"
                        />
                      )}
                    </div>
                    <div>
                      <FieldLabel>Exchange Rate Date *</FieldLabel>
                      <Input
                        required
                        type="date"
                        value={form.exchange_rate_date?.split('T')[0] || ''}
                        onChange={e => handleExchangeRateDateChange(e.target.value)}
                        className="h-8 text-xs bg-background font-mono"
                      />
                    </div>
                    <div>
                      <FieldLabel>Reporting Amount (IDR)</FieldLabel>
                      <div className="h-8 px-3 flex items-center bg-background border border-input rounded-md text-xs font-mono font-bold text-emerald-600">
                        {isFetchingRate ? (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Calculating...
                          </span>
                        ) : (
                          formatRp(Math.round((parseFormattedAmount(form.amount) || 0) * (Number(form.exchange_rate) || 1)))
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic">
                    {form.exchange_rate_source === 'Manual'
                      ? 'Manual rate override active. Historical transactions are permanently frozen upon submission.'
                      : 'Exchange rate automatically synchronized for the selected date.'}
                  </p>
                </div>
              )}
            </div>

            {/* ── SECTION 4: BANK INFORMATION ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
                <Landmark className="h-3.5 w-3.5 text-indigo-500" />
                4. Bank Information
              </h4>

              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/60">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <FieldLabel>Bank Name *</FieldLabel>
                    <Input required value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. BCA or Standard Chartered" className="h-8 text-xs bg-background" />
                  </div>
                  <div>
                    <FieldLabel>Account Number *</FieldLabel>
                    <Input required value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} placeholder="e.g. 7310603141" className="h-8 text-xs bg-background font-mono" />
                  </div>
                  <div>
                    <FieldLabel>Account Name *</FieldLabel>
                    <Input required value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} placeholder="e.g. Monica Kusuma Devi" className="h-8 text-xs bg-background" />
                  </div>
                </div>

                {form.currency !== 'IDR' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t border-border/40 pt-3 mt-2">
                    <div>
                      <FieldLabel>Bank Code</FieldLabel>
                      <Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} placeholder="003" className="h-8 text-xs bg-background font-mono" />
                    </div>
                    <div>
                      <FieldLabel>SWIFT Code</FieldLabel>
                      <Input value={form.swift_code} onChange={e => setForm({ ...form, swift_code: e.target.value })} placeholder="SCBLHKHH" className="h-8 text-xs bg-background font-mono uppercase" />
                    </div>
                    <div>
                      <FieldLabel>Foreign Account No.</FieldLabel>
                      <Input value={form.account_number_foreign} onChange={e => setForm({ ...form, account_number_foreign: e.target.value })} placeholder="Foreign A/C No." className="h-8 text-xs bg-background font-mono" />
                    </div>
                    <div>
                      <FieldLabel>Currency Account No.</FieldLabel>
                      <Input value={form.account_number_usd} onChange={e => setForm({ ...form, account_number_usd: e.target.value })} placeholder="USD/Currency A/C No." className="h-8 text-xs bg-background font-mono" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 5: INVOICE & ACCOUNTING INFORMATION ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
                <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                5. Invoice &amp; Accounting Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Vendor Invoice No.</FieldLabel>
                  <Input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value.toUpperCase() })} placeholder="e.g. 020/INV/VIII/2026" className="h-9 text-sm font-mono uppercase" />
                </div>
                <div>
                  <FieldLabel>Account Code</FieldLabel>
                  <Input value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })} placeholder="e.g. 500-10-001" className="h-9 text-sm font-mono" />
                </div>
              </div>
              <div>
                <FieldLabel>Payment Description *</FieldLabel>
                <textarea
                  required
                  rows={2}
                  value={form.payment_description}
                  onChange={e => setForm({ ...form, payment_description: e.target.value })}
                  placeholder="Detailed description of payment..."
                  className="w-full p-2.5 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* ── SECTION 6: ADDITIONAL INFORMATION & ATTACHMENT ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                6. Additional Information
              </h4>
              <div>
                <FieldLabel>Additional Note</FieldLabel>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="Additional notes..."
                  className="w-full p-2.5 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <FieldLabel>Invoice Attachment (Optional)</FieldLabel>
                {editingExpense?.invoice_attachment_id && !attachmentFile && (
                  <div className="mb-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="text-muted-foreground">Existing file attached</span>
                      <span className="text-[10px] font-mono text-muted-foreground">({editingExpense.invoice_attachment_id.slice(0, 12)}...)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadAttachment(editingExpense.invoice_attachment_id!, editingExpense.expense_number)}
                      className="h-6 text-[10px] gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10"
                    >
                      <Download className="h-3 w-3" /> View Attachment
                    </Button>
                  </div>
                )}
                <label className={`flex items-center gap-3 px-4 py-3 border border-dashed rounded-lg cursor-pointer transition-all ${
                  attachmentFile
                    ? 'border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10'
                    : 'border-border/60 hover:border-foreground/40 hover:bg-muted/20'
                }`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    attachmentFile ? 'bg-indigo-500/10 text-indigo-500' : 'bg-muted text-muted-foreground'
                  }`}>
                    {attachmentFile ? <Upload className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {attachmentFile ? (
                      <>
                        <p className="text-xs font-semibold text-indigo-600 truncate">{attachmentFile.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {(attachmentFile.size / 1024).toFixed(1)} KB • Click to change file
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-foreground">
                          {editingExpense?.invoice_attachment_id ? 'Click to replace invoice attachment' : 'Click to upload invoice'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">PDF, PNG, JPG, JPEG supported</p>
                      </>
                    )}
                  </div>
                  {attachmentFile && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setAttachmentFile(null); }}
                      className="h-6 w-6 rounded-full hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => setAttachmentFile(e.target.files?.[0] || null)} />
                </label>

                {/* ── INLINE ANIMATED UPLOAD PROGRESS (DI DALAM FORM DI BAWAH INVOICE ATT) ── */}
                {isSubmitting && (
                  <div className="mt-3 p-4 rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-background shadow-sm space-y-3 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm border border-indigo-500/30">
                          <CloudUpload className="h-4 w-4 animate-bounce text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                            <span>{attachmentFile ? 'Mengunggah Lampiran Invoice...' : 'Memproses Pengajuan...'}</span>
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {attachmentFile ? `${attachmentFile.name} (${(attachmentFile.size / 1024).toFixed(1)} KB)` : 'Menyimpan data ke server...'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {Math.round(uploadProgress.progress)}%
                        </span>
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2.5 w-full bg-muted/80 dark:bg-muted/50 rounded-full overflow-hidden p-0.5 border border-indigo-500/20 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-md transition-all duration-300 ease-out relative overflow-hidden"
                          style={{ width: `${Math.max(6, Math.min(100, uploadProgress.progress))}%` }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[move-stripe_1s_linear_infinite]" />
                        </div>
                      </div>
                    </div>

                    {/* Step Indicators */}
                    {uploadProgress.steps.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {uploadProgress.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                              {step.status === 'done' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : step.status === 'active' ? (
                                <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                              ) : step.status === 'error' ? (
                                <XIcon className="h-3.5 w-3.5 text-rose-500" />
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                              )}
                            </div>
                            <span className={`truncate transition-colors ${
                              step.status === 'active' ? 'font-semibold text-indigo-600 dark:text-indigo-400' :
                              step.status === 'done' ? 'text-muted-foreground line-through decoration-muted-foreground/40' :
                              step.status === 'error' ? 'text-rose-500 font-medium' :
                              'text-muted-foreground/60'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 gap-2 flex sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingExpense(null);
                  setForm(EMPTY_FORM);
                  setAttachmentFile(null);
                }}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || isFetchingRate}
                className={`h-9 text-xs gap-1.5 font-semibold text-white ${
                  editingExpense
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-md'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {editingExpense ? 'Saving Changes…' : 'Submitting…'}
                  </>
                ) : (
                  editingExpense ? 'Save Changes' : 'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EXPENSE DETAIL DIALOG (LENGKAP: AUDIT TRAIL, APPROVER, CREATOR & LAMPIRAN) ── */}
      <Dialog open={!!viewingDetail} onOpenChange={(open) => !open && setViewingDetail(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden font-sans border-border/80 dark:border-slate-800 shadow-2xl">
          {/* Modal Header */}
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/20 shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Transaction Detail</span>
                    {viewingDetail?.status && (
                      <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_STYLE[viewingDetail.status] || ''}`}>
                        {formatStatusText(viewingDetail.status)}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-base font-black text-foreground">{viewingDetail?.expense_number}</DialogTitle>
                </div>
              </div>
            </div>
          </DialogHeader>

          {viewingDetail && (
            <div className="p-6 space-y-4 text-xs font-sans max-h-[72vh] overflow-y-auto">
              
              {/* 1. AUDIT TRAIL CARD (SIAPA YG BUAT, KAPAN DIBUAT, SIAPA YG APPROVED, KAPAN DIAPPROVED) */}
              <div className="bg-muted/30 border border-border/60 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  <span>Informasi Pembuat & Persetujuan (Workflow & Audit Trail)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Pembuat */}
                  <div className="p-3 rounded-lg bg-card dark:bg-slate-900/60 border border-border/50 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <User className="h-3 w-3 text-indigo-500" /> Dibuat Oleh (Creator)
                      </span>
                      <span className="text-[9px] font-black text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        REQUESTER
                      </span>
                    </div>
                    <div className="font-bold text-sm text-foreground">
                      {viewingDetail.prepared_by_name || 'Staff'}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Dibuat: <strong className="text-foreground">{formatFullDateTime(viewingDetail.created_at)}</strong></span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Tgl Request: <strong className="text-foreground">{formatDisplayDate(viewingDetail.request_date)}</strong></span>
                    </div>
                  </div>

                  {/* Approver / Rejecter / Status */}
                  <div className="p-3 rounded-lg bg-card dark:bg-slate-900/60 border border-border/50 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      {viewingDetail.status === 'REJECTED' ? (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-rose-500" /> Ditolak Oleh (Rejected By)
                        </span>
                      ) : viewingDetail.status === 'APPROVED' || viewingDetail.status === 'DISBURSED' || viewingDetail.status === 'PAID' ? (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Disetujui Oleh (Approver)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" /> Status Persetujuan
                        </span>
                      )}

                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        viewingDetail.status === 'APPROVED' || viewingDetail.status === 'DISBURSED' || viewingDetail.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : viewingDetail.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {viewingDetail.status === 'PENDING_APPROVAL'
                          ? 'PENDING'
                          : viewingDetail.status === 'REJECTED'
                          ? 'REJECTED'
                          : viewingDetail.status === 'DISBURSED'
                          ? 'DISBURSED'
                          : viewingDetail.status === 'PAID'
                          ? 'PAID'
                          : 'APPROVED'}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      {viewingDetail.status === 'REJECTED' ? (
                        viewingDetail.approved_by_name ? (
                          <>
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            <span>{viewingDetail.approved_by_name}</span>
                          </>
                        ) : (
                          <span className="text-rose-600 font-medium text-xs">Admin / Approver</span>
                        )
                      ) : (viewingDetail.status === 'APPROVED' || viewingDetail.status === 'DISBURSED' || viewingDetail.status === 'PAID') ? (
                        viewingDetail.approved_by_name ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{viewingDetail.approved_by_name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground font-normal text-xs">-</span>
                        )
                      ) : (
                        <span className="text-amber-600 font-medium text-xs flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" /> Menunggu Persetujuan
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {viewingDetail.status === 'REJECTED' ? (
                          <>Waktu Ditolak: <strong className="text-foreground">{formatFullDateTime(viewingDetail.updated_at || viewingDetail.created_at)}</strong></>
                        ) : (viewingDetail.status === 'APPROVED' || viewingDetail.status === 'DISBURSED' || viewingDetail.status === 'PAID') ? (
                          <>Waktu Disetujui: <strong className="text-foreground">{formatFullDateTime(viewingDetail.updated_at || viewingDetail.created_at)}</strong></>
                        ) : (
                          <>Waktu Disetujui: <strong className="text-foreground">Belum Disetujui</strong></>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. FINANCIAL INFORMATION */}
              <div className="bg-card dark:bg-slate-900/60 border border-border/50 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>Rincian Finansial & Pembayaran</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Original Amount</span>
                    <p className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                      <img 
                        src={getCurrencyFlag(viewingDetail.currency)} 
                        alt={viewingDetail.currency} 
                        className="w-4 h-4 object-contain inline shrink-0" 
                      />
                      <span className="font-mono">{formatCurrencyAmount(viewingDetail.currency, viewingDetail.amount)}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Kurs / Exchange Rate</span>
                    <p className="font-mono font-semibold text-foreground mt-0.5">
                      {viewingDetail.currency !== 'IDR' ? `1 ${viewingDetail.currency} = ${formatRp(viewingDetail.exchange_rate)}` : '1.0 (IDR)'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Reporting Amount (IDR)</span>
                    <p className="font-black text-indigo-600 dark:text-indigo-400 text-sm mt-0.5 font-mono">
                      {formatRp(viewingDetail.reporting_amount)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Metode Pembayaran</span>
                    <p className="font-semibold text-foreground mt-0.5">{viewingDetail.payment_method}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Lokasi Pembayaran</span>
                    <p className="font-semibold text-foreground mt-0.5">{viewingDetail.payment_location || 'Local'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">No. Invoice / Voucher</span>
                    <p className="font-mono text-foreground mt-0.5 text-[11px]">
                      {viewingDetail.invoice_number || viewingDetail.voucher_number || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. PAYEE & BANK REKENING */}
              <div className="bg-card dark:bg-slate-900/60 border border-border/50 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span>Penerima & Rekening Tujuan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Penerima (Payee / Vendor)</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-bold text-foreground">{viewingDetail.paid_to}</p>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground border">
                        {viewingDetail.payee_type || 'Company'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Perusahaan & Departemen</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {viewingDetail.company} • {viewingDetail.department}
                    </p>
                  </div>

                  {(viewingDetail.bank_name || viewingDetail.account_number || viewingDetail.account_name) && (
                    <div className="col-span-1 sm:col-span-2 p-2.5 rounded-lg bg-muted/30 dark:bg-slate-900/40 border border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Bank</span>
                        <p className="font-bold text-foreground">{viewingDetail.bank_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">No. Rekening</span>
                        <p className="font-mono font-bold text-foreground">{viewingDetail.account_number || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Atas Nama (A/N)</span>
                        <p className="font-bold text-foreground">{viewingDetail.account_name || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. PROJECT & DESCRIPTION */}
              <div className="bg-card dark:bg-slate-900/60 border border-border/50 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Proyek & Keterangan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Nama Proyek</span>
                    <p className="font-bold text-foreground mt-0.5">{viewingDetail.project_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Kategori / Account Code</span>
                    <p className="font-semibold text-foreground mt-0.5">{viewingDetail.account_code || viewingDetail.category || 'OPERATIONAL'}</p>
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi Pembayaran</span>
                    <p className="font-medium text-foreground mt-1 bg-muted/40 dark:bg-slate-900/40 p-3 rounded-xl border border-border/40 leading-relaxed text-xs">
                      {viewingDetail.payment_description || '-'}
                    </p>
                  </div>

                  {viewingDetail.note && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Catatan Tambahan (Note)</span>
                      <p className="font-medium text-muted-foreground mt-1 bg-muted/20 p-2.5 rounded-lg border border-border/30 text-xs">
                        {viewingDetail.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. LAMPIRAN DOKUMEN / INVOICE */}
              <div className="bg-card dark:bg-slate-900/60 border border-border/50 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                    <Paperclip className="h-4 w-4 text-emerald-600" />
                    <span>Lampiran Dokumen / Invoice</span>
                  </div>
                  {viewingDetail.invoice_attachment_id && (
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                      Tersedia
                    </span>
                  )}
                </div>

                {viewingDetail.invoice_attachment_id ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-foreground">
                          Invoice / Bukti Pembayaran ({viewingDetail.expense_number})
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[240px]">
                          Drive ID: {viewingDetail.invoice_attachment_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDownloadAttachment(viewingDetail.invoice_attachment_id!, viewingDetail.expense_number)}
                        className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Buka / Unduh
                      </Button>
                      <a
                        href={`https://drive.google.com/file/d/${viewingDetail.invoice_attachment_id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 text-xs font-bold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Tab Baru
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Tidak ada file lampiran invoice terlampir untuk transaksi ini.</span>
                  </div>
                )}
              </div>

            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t border-border/40 gap-2 bg-card dark:bg-slate-900/60 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setViewingDetail(null)} className="h-8 text-xs">
              Tutup
            </Button>
            {isSuperAdmin && viewingDetail && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = viewingDetail;
                    setViewingDetail(null);
                    handleOpenEdit(target);
                  }}
                  className="h-8 text-xs gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = viewingDetail;
                    setViewingDetail(null);
                    setSelected(target);
                    setConfirmAction('delete');
                  }}
                  className="h-8 text-xs gap-1.5 text-rose-600 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Request
                </Button>
              </>
            )}
            {viewingDetail && (
              <Button size="sm" onClick={() => handlePrintPdf(viewingDetail)} className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Printer className="h-3.5 w-3.5" /> Print PDF Voucher
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRMATION DIALOG (DELETE, APPROVE, REJECT, DISBURSE) ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setSelected(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'delete' && 'Delete Expense Request'}
              {confirmAction === 'approve' && 'Approve Expense Request'}
              {confirmAction === 'reject' && 'Reject Expense Request'}
              {confirmAction === 'disburse' && 'Mark as Disbursed / Paid'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'delete' && (
                <span>
                  Are you sure you want to delete expense request <strong className="text-foreground font-mono">{selected?.expense_number}</strong>
                  {selected?.project_name ? ` (${selected.project_name})` : ''}? This action cannot be undone.
                </span>
              )}
              {confirmAction === 'approve' && (
                <span>
                  Approve expense request <strong className="text-foreground font-mono">{selected?.expense_number}</strong>?
                </span>
              )}
              {confirmAction === 'reject' && (
                <span>
                  Reject expense request <strong className="text-foreground font-mono">{selected?.expense_number}</strong>?
                </span>
              )}
              {confirmAction === 'disburse' && (
                <span>
                  Mark expense request <strong className="text-foreground font-mono">{selected?.expense_number}</strong> as disbursed / paid?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmAction(null); setSelected(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === 'delete') handleDelete();
                else if (confirmAction === 'approve') handleApprove();
                else if (confirmAction === 'reject') handleReject();
                else if (confirmAction === 'disburse') handleDisburse();
              }}
              className={
                confirmAction === 'delete' || confirmAction === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : confirmAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              {confirmAction === 'delete' && 'Yes, Delete'}
              {confirmAction === 'approve' && 'Yes, Approve'}
              {confirmAction === 'reject' && 'Yes, Reject'}
              {confirmAction === 'disburse' && 'Yes, Mark Disbursed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Progress Overlays ── */}
      <ProgressOverlay
        open={uploadProgress.open}
        title={editingExpense ? "Updating Expense Request" : "Uploading Expense Request"}
        subtitle={uploadProgress.subtitle}
        progress={uploadProgress.progress}
        steps={uploadProgress.steps}
        variant="upload"
      />
      <ProgressOverlay
        open={exportProgress.open}
        title="Exporting PDF Voucher"
        subtitle={exportProgress.subtitle}
        progress={exportProgress.progress}
        steps={exportProgress.steps}
        variant="export"
      />
      <ProgressOverlay
        open={downloadProgress.open}
        title="Opening Invoice Attachment"
        subtitle={downloadProgress.subtitle}
        progress={downloadProgress.progress}
        steps={downloadProgress.steps}
        variant="download"
      />
    </div>
  );
};
