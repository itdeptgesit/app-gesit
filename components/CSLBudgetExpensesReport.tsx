import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  fetchBudgetExpensesReport, 
  BudgetExpensesReportData, 
  ReportFilters,
  PeriodType,
  PayeeTypeFilter,
  getPeriodDateRange,
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  formatIdr,
  formatCurrencyAmount,
  getCurrencyFlag,
  ExpenseTransactionRow,
  saveProjectBudgetAllocations,
  getMonthlyBudgetPlan,
  saveMonthlyBudgetPlan
} from '@/services/cslBudgetReportService';
import { exportBudgetReportToExcel, exportBudgetReportToPdf } from '@/utils/cslBudgetReportExport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Download, 
  RefreshCw, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  BarChart3, 
  DollarSign, 
  Globe2, 
  Layers, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Eye,
  X,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Check,
  RotateCcw,
  SlidersHorizontal,
  User,
  Building,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  Paperclip,
  ExternalLink,
  UserCheck,
  CreditCard,
  CalendarClock,
  Receipt,
  Monitor,
  Laptop,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface CSLBudgetExpensesReportProps {
  currentUser: UserAccount | null;
}

const formatDisplayDate = (dStr?: string) => {
  if (!dStr) return '';
  try {
    const [y, m, d] = dStr.split('-');
    if (!y || !m || !d) return dStr;
    return `${d} ${MONTH_SHORT_NAMES[Number(m) - 1] || m} ${y}`;
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

const parseParamsToFilters = (params: URLSearchParams): ReportFilters => {
  const pType = (params.get('periodType') || 'year') as PeriodType;
  const fYear = params.get('fiscalYear') ? Number(params.get('fiscalYear')) : 2026;
  const q = params.get('quarter') as 'Q1' | 'Q2' | 'Q3' | 'Q4' | undefined;
  const m = params.get('month') ? Number(params.get('month')) : undefined;
  const from = params.get('from') || undefined;
  const to = params.get('to') || undefined;

  let payeeParam: PayeeTypeFilter = 'all';
  const p = params.get('payeeType')?.toLowerCase();
  if (p === 'company' || p === 'individual' || p === 'all') {
    payeeParam = p as PayeeTypeFilter;
  }

  return {
    periodType: ['year', 'quarter', 'month', 'custom'].includes(pType) ? pType : 'year',
    fiscalYear: !isNaN(fYear) && fYear > 2000 ? fYear : 2026,
    quarter: q && ['Q1', 'Q2', 'Q3', 'Q4'].includes(q) ? q : undefined,
    month: m && m >= 1 && m <= 12 ? m : undefined,
    startDate: from,
    endDate: to,
    payeeType: payeeParam,
    company: params.get('company') || 'all',
    department: params.get('department') || 'all',
    project: params.get('project') || 'all',
    status: params.get('status') || 'all',
    currency: params.get('currency') || 'all',
    paymentLocation: params.get('paymentLocation') || 'all',
    paymentMethod: params.get('paymentMethod') || 'all',
    accountCode: params.get('accountCode') || '',
    search: params.get('search') || ''
  };
};

const DEFAULT_FILTERS: ReportFilters = {
  periodType: 'year',
  fiscalYear: 2026,
  payeeType: 'all',
  company: 'all',
  department: 'all',
  project: 'all',
  status: 'all',
  currency: 'all',
  paymentLocation: 'all',
  paymentMethod: 'all',
  accountCode: '',
  search: ''
};

export const CSLBudgetExpensesReport: React.FC<CSLBudgetExpensesReportProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ReportFilters>(() => parseParamsToFilters(searchParams));

  // Mobile viewport warning popup state
  const [showMobileWarning, setShowMobileWarning] = useState<boolean>(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const dismissed = sessionStorage.getItem('csl_budget_report_mobile_dismissed');
    if (isMobile && !dismissed) {
      setShowMobileWarning(true);
    }
  }, []);

  const handleDismissMobileWarning = () => {
    sessionStorage.setItem('csl_budget_report_mobile_dismissed', 'true');
    setShowMobileWarning(false);
  };

  // Interactive UI popovers
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isPayeeOpen, setIsPayeeOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);

  // Year being viewed inside the Period popover (allows exploring other FYs before committing)
  const [tempFiscalYear, setTempFiscalYear] = useState<number>(filters.fiscalYear || 2026);

  // Custom date range inside Period popover
  const [isCustomExpanded, setIsCustomExpanded] = useState<boolean>(filters.periodType === 'custom');
  const [customFrom, setCustomFrom] = useState<string>(filters.startDate || '');
  const [customTo, setCustomTo] = useState<string>(filters.endDate || '');
  const [customError, setCustomError] = useState<string | null>(null);

  const periodRef = useRef<HTMLDivElement>(null);
  const payeeRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<BudgetExpensesReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Transactions table pagination & modal
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedTxn, setSelectedTxn] = useState<ExpenseTransactionRow | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'budgetVsActual' | 'trend'>('budgetVsActual');

  const roleLower = (currentUser?.role || '').trim().toLowerCase();
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'owner' || roleLower === 'admin' || (currentUser?.groups || []).some(g => g.toLowerCase().includes('admin'));

  // Project & Nominal Budget Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSavingBudgets, setIsSavingBudgets] = useState(false);
  const [budgetModalTab, setBudgetModalTab] = useState<'nominal' | 'projects'>('nominal');

  // Nominal Budget State
  const [monthlyNominalStr, setMonthlyNominalStr] = useState('50.000.000');
  const [annualNominalStr, setAnnualNominalStr] = useState('600.000.000');
  const [isCustomMonthly, setIsCustomMonthly] = useState(false);
  const [customMonthsStr, setCustomMonthsStr] = useState<string[]>(Array(12).fill('50.000.000'));

  // Project Budget List State
  const [budgetEditList, setBudgetEditList] = useState<Array<{
    project_name: string;
    department: string;
    allocated_amount: string;
    monthly_amount: string;
    actual: number;
  }>>([]);

  const formatAmountWithDots = (val: string | number): string => {
    if (!val && val !== 0) return '';
    const clean = String(val).replace(/[^0-9]/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('id-ID').format(Number(clean));
  };

  const parseFormattedAmount = (val: string): number => {
    if (!val) return 0;
    const clean = String(val).replace(/\./g, '').replace(/,/g, '.').trim();
    return Number(clean) || 0;
  };

  const handleOpenBudgetModal = (initialTab: 'nominal' | 'projects' = 'nominal') => {
    const year = filters.fiscalYear || 2026;
    const plan = getMonthlyBudgetPlan(year, reportData?.summary.totalBudget);

    setMonthlyNominalStr(formatAmountWithDots(plan.monthlyNominal));
    setAnnualNominalStr(formatAmountWithDots(plan.annualNominal));
    setIsCustomMonthly(plan.mode === 'custom');
    setCustomMonthsStr(plan.months.map(m => formatAmountWithDots(m)));

    if (reportData) {
      const items = reportData.budgetVarianceList.map(proj => {
        const annualVal = proj.budget || 0;
        const monthlyVal = Math.round(annualVal / 12);
        return {
          project_name: proj.projectName,
          department: proj.department || 'CSL',
          allocated_amount: annualVal ? formatAmountWithDots(annualVal) : '0',
          monthly_amount: monthlyVal ? formatAmountWithDots(monthlyVal) : '0',
          actual: proj.actual || 0,
        };
      });
      setBudgetEditList(items);
    }
    setBudgetModalTab(initialTab);
    setIsBudgetModalOpen(true);
  };

  const handleFlatMonthlyChange = (val: string) => {
    const formatted = formatAmountWithDots(val);
    const numMonthly = parseFormattedAmount(formatted);
    const numAnnual = numMonthly * 12;
    setMonthlyNominalStr(formatted);
    setAnnualNominalStr(numAnnual > 0 ? formatAmountWithDots(numAnnual) : '');
    setCustomMonthsStr(Array(12).fill(formatted));
  };

  const handleFlatAnnualChange = (val: string) => {
    const formatted = formatAmountWithDots(val);
    const numAnnual = parseFormattedAmount(formatted);
    const numMonthly = Math.round(numAnnual / 12);
    setAnnualNominalStr(formatted);
    setMonthlyNominalStr(numMonthly > 0 ? formatAmountWithDots(numMonthly) : '');
    setCustomMonthsStr(Array(12).fill(numMonthly > 0 ? formatAmountWithDots(numMonthly) : ''));
  };

  const handleCustomMonthChange = (monthIdx: number, val: string) => {
    const formatted = formatAmountWithDots(val);
    const updated = [...customMonthsStr];
    updated[monthIdx] = formatted;
    setCustomMonthsStr(updated);

    const sumAnnual = updated.reduce((acc, str) => acc + parseFormattedAmount(str), 0);
    const avgMonthly = Math.round(sumAnnual / 12);
    setAnnualNominalStr(formatAmountWithDots(sumAnnual));
    setMonthlyNominalStr(formatAmountWithDots(avgMonthly));
  };

  const handleApplyPreset = (nominalMonthly: number) => {
    const formatted = formatAmountWithDots(nominalMonthly);
    handleFlatMonthlyChange(formatted);
  };

  const handleSaveMonthlyBudget = async () => {
    setIsSavingBudgets(true);
    try {
      const year = filters.fiscalYear || 2026;
      const numMonthly = parseFormattedAmount(monthlyNominalStr);
      let months: number[] = [];
      let annual = 0;

      if (isCustomMonthly) {
        months = customMonthsStr.map(s => parseFormattedAmount(s));
        annual = months.reduce((s, n) => s + n, 0);
      } else {
        annual = numMonthly * 12;
        months = Array(12).fill(numMonthly);
      }

      await saveMonthlyBudgetPlan(year, {
        fiscalYear: year,
        mode: isCustomMonthly ? 'custom' : 'flat',
        monthlyNominal: numMonthly,
        annualNominal: annual,
        months
      });

      toast.success(`Nominal budget FY ${year} berhasil disimpan!`);
      setIsBudgetModalOpen(false);
      loadReport();
    } catch (err: any) {
      toast.error('Gagal menyimpan budget: ' + err.message);
    } finally {
      setIsSavingBudgets(false);
    }
  };

  const handleMonthlyChange = (index: number, val: string) => {
    const formattedMonthly = formatAmountWithDots(val);
    const numMonthly = parseFormattedAmount(formattedMonthly);
    const numAnnual = numMonthly * 12;
    const formattedAnnual = numAnnual > 0 ? formatAmountWithDots(numAnnual) : '';

    setBudgetEditList(prev => prev.map((p, i) => i === index ? {
      ...p,
      monthly_amount: formattedMonthly,
      allocated_amount: formattedAnnual
    } : p));
  };

  const handleAnnualChange = (index: number, val: string) => {
    const formattedAnnual = formatAmountWithDots(val);
    const numAnnual = parseFormattedAmount(formattedAnnual);
    const numMonthly = Math.round(numAnnual / 12);
    const formattedMonthly = numMonthly > 0 ? formatAmountWithDots(numMonthly) : '';

    setBudgetEditList(prev => prev.map((p, i) => i === index ? {
      ...p,
      allocated_amount: formattedAnnual,
      monthly_amount: formattedMonthly
    } : p));
  };

  const handleAddBudgetRow = () => {
    setBudgetEditList(prev => [
      ...prev,
      { project_name: '', department: 'CSL', allocated_amount: '', monthly_amount: '', actual: 0 }
    ]);
  };

  const handleRemoveBudgetRow = (index: number) => {
    setBudgetEditList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveBudgets = async () => {
    setIsSavingBudgets(true);
    try {
      const year = filters.fiscalYear || 2026;
      const formatted = budgetEditList
        .filter(item => item.project_name.trim().length > 0)
        .map(item => ({
          project_name: item.project_name.trim(),
          department: item.department || 'CSL',
          allocated_amount: parseFormattedAmount(item.allocated_amount) || 0,
        }));
      await saveProjectBudgetAllocations(year, formatted);
      toast.success(`Project budgets for FY ${year} saved successfully!`);
      setIsBudgetModalOpen(false);
      loadReport();
    } catch (err: any) {
      toast.error('Failed to save budgets: ' + err.message);
    } finally {
      setIsSavingBudgets(false);
    }
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setIsPeriodOpen(false);
      }
      if (payeeRef.current && !payeeRef.current.contains(e.target as Node)) {
        setIsPayeeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update URL search parameters when filters change
  const updateFiltersAndUrl = (newFilters: ReportFilters) => {
    startTransition(() => {
      setFilters(newFilters);
      setPage(1);

      const params = new URLSearchParams();
      if (newFilters.periodType !== 'year') params.set('periodType', newFilters.periodType);
      if (newFilters.fiscalYear !== 2026) params.set('fiscalYear', String(newFilters.fiscalYear));
      if (newFilters.periodType === 'quarter' && newFilters.quarter) params.set('quarter', newFilters.quarter);
      if (newFilters.periodType === 'month' && newFilters.month) params.set('month', String(newFilters.month));
      if (newFilters.periodType === 'custom') {
        if (newFilters.startDate) params.set('from', newFilters.startDate);
        if (newFilters.endDate) params.set('to', newFilters.endDate);
      }
      if (newFilters.payeeType !== 'all') params.set('payeeType', newFilters.payeeType.toLowerCase());
      if (newFilters.company !== 'all') params.set('company', newFilters.company);
      if (newFilters.department !== 'all') params.set('department', newFilters.department);
      if (newFilters.project !== 'all') params.set('project', newFilters.project);
      if (newFilters.status !== 'all') params.set('status', newFilters.status);
      if (newFilters.currency !== 'all') params.set('currency', newFilters.currency);
      if (newFilters.paymentLocation !== 'all') params.set('paymentLocation', newFilters.paymentLocation);
      if (newFilters.paymentMethod !== 'all') params.set('paymentMethod', newFilters.paymentMethod);
      if (newFilters.accountCode) params.set('accountCode', newFilters.accountCode);
      if (newFilters.search) params.set('search', newFilters.search);
      setSearchParams(params, { replace: true });
    });
  };

  // Load Data
  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBudgetExpensesReport(filters);
      setReportData(data);
    } catch (err: any) {
      console.error('Failed to load budget report:', err);
      setError(err.message || 'Unable to load report data.');
      toast.error('Failed to load report data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [
    filters.periodType,
    filters.fiscalYear,
    filters.quarter,
    filters.month,
    filters.startDate,
    filters.endDate,
    filters.payeeType,
    filters.company,
    filters.department,
    filters.project,
    filters.status,
    filters.currency,
    filters.paymentLocation,
    filters.paymentMethod,
    filters.accountCode
  ]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadReport();
    }, 300);
    return () => clearTimeout(handler);
  }, [filters.search]);

  // Handle individual filter change
  const handleFilterChange = (key: keyof ReportFilters, val: any) => {
    updateFiltersAndUrl({ ...filters, [key]: val });
  };

  // Reset to default (Period: FY 2026, Payee: All, Advanced filters cleared)
  const handleResetFilters = () => {
    updateFiltersAndUrl(DEFAULT_FILTERS);
    setTempFiscalYear(2026);
    setIsCustomExpanded(false);
    setCustomFrom('');
    setCustomTo('');
    setCustomError(null);
    toast.success('Filters reset to default (FY 2026, All Payees)');
  };

  // Active period display label
  const periodInfo = useMemo(() => getPeriodDateRange(filters), [
    filters.periodType,
    filters.fiscalYear,
    filters.quarter,
    filters.month,
    filters.startDate,
    filters.endDate
  ]);
  const activePeriodLabel = periodInfo.label;

  // Check if period differs from default FY 2026
  const isPeriodCustomized = filters.periodType !== 'year' || filters.fiscalYear !== 2026;

  // Count active filters inside More Filters
  const activeMoreFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.company !== 'all') c++;
    if (filters.department !== 'all') c++;
    if (filters.project !== 'all') c++;
    if (filters.status !== 'all') c++;
    if (filters.currency !== 'all') c++;
    if (filters.paymentLocation !== 'all') c++;
    if (filters.paymentMethod !== 'all') c++;
    if (filters.accountCode) c++;
    return c;
  }, [filters]);

  const hasAnyActiveFilter = isPeriodCustomized || filters.payeeType !== 'all' || activeMoreFiltersCount > 0 || Boolean(filters.search);

  // Apply custom date range
  const handleApplyCustomRange = () => {
    if (!customFrom || !customTo) {
      setCustomError('Both Start and End dates are required.');
      return;
    }
    if (customFrom > customTo) {
      setCustomError('Start date must be earlier than or equal to End date.');
      return;
    }
    setCustomError(null);
    updateFiltersAndUrl({
      ...filters,
      periodType: 'custom',
      startDate: customFrom,
      endDate: customTo,
      fiscalYear: Number(customFrom.split('-')[0]) || tempFiscalYear,
      quarter: undefined,
      month: undefined
    });
    setIsPeriodOpen(false);
  };

  // Export handlers
  const handleExportExcel = () => {
    if (!reportData) return;
    try {
      exportBudgetReportToExcel(reportData, filters);
      toast.success('Excel report exported successfully!');
    } catch (e: any) {
      toast.error('Failed to export Excel: ' + e.message);
    }
  };

  const handleExportPdf = () => {
    if (!reportData) return;
    try {
      exportBudgetReportToPdf(reportData, filters);
      toast.success('PDF report exported successfully!');
    } catch (e: any) {
      toast.error('Failed to export PDF: ' + e.message);
    }
  };

  // Paginated transactions
  const pagedTransactions = useMemo(() => {
    if (!reportData?.transactions) return [];
    const start = (page - 1) * pageSize;
    return reportData.transactions.slice(start, start + pageSize);
  }, [reportData?.transactions, page, pageSize]);

  const totalPages = Math.ceil((reportData?.transactions.length || 0) / pageSize) || 1;

  // Render Skeleton
  if (loading && !reportData) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-14 bg-muted/60 rounded-2xl w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-2xl border border-border/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-80 bg-muted/40 rounded-2xl border border-border/40" />
          <div className="h-80 bg-muted/40 rounded-2xl border border-border/40" />
        </div>
        <div className="h-96 bg-muted/40 rounded-2xl border border-border/40" />
      </div>
    );
  }

  // Render Error
  if (error && !reportData) {
    return (
      <div className="p-12 text-center rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-4">
        <AlertCircle size={40} className="mx-auto text-rose-500" />
        <h3 className="text-lg font-bold text-foreground">Unable to load report data</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
        <Button onClick={loadReport} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white">
          <RefreshCw size={14} className="mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const { summary } = reportData!;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 font-sans">
      {/* ── SECTION 1: HEADER (MATCHING BUDGET EXPENSES STYLE) ── */}
      <PageHeader
        title="Budget & Expenses Report"
        description="Financial overview, monthly spend monitoring, and project budget utilization"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40 hidden md:inline-block">
            Last updated: <strong className="text-foreground font-mono">{reportData?.lastUpdated}</strong>
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/budget-expense')}
            className="h-9 text-xs gap-1.5 font-bold"
          >
            <Receipt className="h-3.5 w-3.5 text-indigo-500" /> Expense List
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadReport}
            disabled={loading}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
          </Button>
          <Button
            size="sm"
            onClick={handleExportPdf}
            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs"
          >
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </PageHeader>

      {/* ── SECTION 2: COMPACT FILTER BAR ────────────────────────────── */}
      <div className="bg-card border border-border/40 rounded-xl p-3.5 shadow-sm space-y-3">
        {/* Main Toolbar Row: Compact & Global */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Left: Primary Filters (Period & Payee) + Search */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
            
            {/* 1. Unified Period Filter */}
            <div className="relative" ref={periodRef}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPeriodOpen(prev => !prev);
                  setIsPayeeOpen(false);
                }}
                className={`h-9 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
                  isPeriodCustomized 
                    ? 'border-indigo-500/70 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30' 
                    : 'border-border/70 hover:border-indigo-500/50 text-foreground bg-background'
                }`}
              >
                <Calendar size={13} className={isPeriodCustomized ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500'} />
                <span>Period: <strong className="font-extrabold">{activePeriodLabel}</strong></span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${isPeriodOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Period Dropdown Popover */}
              {isPeriodOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-84 sm:w-96 bg-popover/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-4">
                  
                  {/* Fiscal Year Row */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fiscal Year</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">Jan – Dec</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(reportData?.filterOptions.availableYears || [2026, 2025]).map(yr => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setTempFiscalYear(yr)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            tempFiscalYear === yr
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-muted/70 hover:bg-muted text-foreground border border-border/40'
                          }`}
                        >
                          FY {yr}
                        </button>
                      ))}

                      {/* Select Full Year button */}
                      <button
                        type="button"
                        onClick={() => {
                          updateFiltersAndUrl({
                            ...filters,
                            periodType: 'year',
                            fiscalYear: tempFiscalYear,
                            quarter: undefined,
                            month: undefined,
                            startDate: undefined,
                            endDate: undefined
                          });
                          setIsPeriodOpen(false);
                        }}
                        className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          filters.periodType === 'year' && filters.fiscalYear === tempFiscalYear
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-muted/70 hover:bg-muted text-foreground border border-border/40'
                        }`}
                      >
                        {filters.periodType === 'year' && filters.fiscalYear === tempFiscalYear && <Check size={12} />}
                        Full Year
                      </button>
                    </div>
                  </div>

                  {/* Quarters (Q1 - Q4) */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Quarter (FY {tempFiscalYear})
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'Q1' as const, label: 'Q1', desc: 'Jan – Mar' },
                        { id: 'Q2' as const, label: 'Q2', desc: 'Apr – Jun' },
                        { id: 'Q3' as const, label: 'Q3', desc: 'Jul – Sep' },
                        { id: 'Q4' as const, label: 'Q4', desc: 'Oct – Dec' }
                      ].map(q => {
                        const isSelected = filters.periodType === 'quarter' && filters.fiscalYear === tempFiscalYear && filters.quarter === q.id;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              updateFiltersAndUrl({
                                ...filters,
                                periodType: 'quarter',
                                fiscalYear: tempFiscalYear,
                                quarter: q.id,
                                month: undefined,
                                startDate: undefined,
                                endDate: undefined
                              });
                              setIsPeriodOpen(false);
                            }}
                            className={`p-2 rounded-xl text-center border transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-background hover:bg-muted border-border/60 text-foreground'
                            }`}
                          >
                            <div className="text-xs font-extrabold">{q.label}</div>
                            <div className={`text-[9px] ${isSelected ? 'text-indigo-100' : 'text-muted-foreground'}`}>{q.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Months (12 Months) */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Month (FY {tempFiscalYear})
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                      {MONTH_SHORT_NAMES.map((name, idx) => {
                        const mNum = idx + 1;
                        const isSelected = filters.periodType === 'month' && filters.fiscalYear === tempFiscalYear && filters.month === mNum;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              updateFiltersAndUrl({
                                ...filters,
                                periodType: 'month',
                                fiscalYear: tempFiscalYear,
                                month: mNum,
                                quarter: undefined,
                                startDate: undefined,
                                endDate: undefined
                              });
                              setIsPeriodOpen(false);
                            }}
                            className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-background hover:bg-muted border-border/50 text-foreground'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div className="pt-2 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => setIsCustomExpanded(prev => !prev)}
                      className="w-full flex items-center justify-between text-xs font-bold text-foreground hover:text-indigo-600 py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-indigo-500" />
                        Custom Date Range
                      </span>
                      <ChevronDown size={12} className={`transition-transform ${isCustomExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isCustomExpanded && (
                      <div className="mt-2 space-y-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-black uppercase text-muted-foreground block mb-0.5">From</label>
                            <input
                              type="date"
                              value={customFrom}
                              onChange={e => { setCustomFrom(e.target.value); setCustomError(null); }}
                              className="w-full bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {customFrom && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5 truncate">
                                {formatDisplayDate(customFrom)}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-muted-foreground block mb-0.5">To</label>
                            <input
                              type="date"
                              value={customTo}
                              onChange={e => { setCustomTo(e.target.value); setCustomError(null); }}
                              className="w-full bg-background border border-border/80 rounded-lg px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {customTo && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5 truncate">
                                {formatDisplayDate(customTo)}
                              </span>
                            )}
                          </div>
                        </div>

                        {customError && (
                          <p className="text-[10px] font-bold text-rose-500 leading-tight">{customError}</p>
                        )}

                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsCustomExpanded(false);
                              setCustomError(null);
                            }}
                            className="h-7 px-2.5 text-xs font-semibold text-muted-foreground"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleApplyCustomRange}
                            className="h-7 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* 2. Primary Payee Type Filter */}
            <div className="relative" ref={payeeRef}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPayeeOpen(prev => !prev);
                  setIsPeriodOpen(false);
                }}
                className={`h-9 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
                  filters.payeeType !== 'all'
                    ? 'border-indigo-500/70 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-border/70 hover:border-indigo-500/50 text-foreground bg-background'
                }`}
              >
                <Building2 size={13} className={filters.payeeType !== 'all' ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500'} />
                <span>Payee: <strong className="font-extrabold">{filters.payeeType === 'all' ? 'All' : filters.payeeType}</strong></span>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${isPayeeOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Payee Dropdown Popover */}
              {isPayeeOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-popover/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateFiltersAndUrl({ ...filters, payeeType: 'all' });
                      setIsPayeeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      filters.payeeType === 'all' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>All Payees</span>
                    {filters.payeeType === 'all' && <Check size={14} className="text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateFiltersAndUrl({ ...filters, payeeType: 'Company' });
                      setIsPayeeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      filters.payeeType === 'Company' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Building size={12} /> Company
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Corporate & vendor payees</div>
                    </div>
                    {filters.payeeType === 'Company' && <Check size={14} className="text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateFiltersAndUrl({ ...filters, payeeType: 'Individual' });
                      setIsPayeeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      filters.payeeType === 'Individual' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <User size={12} /> Individual
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Individual & person payees</div>
                    </div>
                    {filters.payeeType === 'Individual' && <Check size={14} className="text-indigo-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search descriptions, payees, projects..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="w-full bg-background border border-border/70 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9"
              />
            </div>
          </div>

          {/* Right: More Filters & Reset */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMoreFiltersOpen(true)}
              className={`rounded-xl text-xs font-bold h-9 px-3.5 border transition-all shadow-xs ${
                activeMoreFiltersCount > 0
                  ? 'border-indigo-500/70 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-border/70 hover:bg-muted text-foreground'
              }`}
            >
              <SlidersHorizontal size={13} className="mr-1.5 text-indigo-500" />
              <span>More Filters</span>
              {activeMoreFiltersCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                  {activeMoreFiltersCount}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5 font-bold rounded-xl"
              title="Reset all filters to default"
            >
              <RotateCcw size={13} className="mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Active Filter Indicators (Chips) */}
        {hasAnyActiveFilter && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-border/50 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Active scope:</span>

            {/* Period Chip (if not default FY 2026) */}
            {isPeriodCustomized && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                <span>Period: <strong>{activePeriodLabel}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    updateFiltersAndUrl({
                      ...filters,
                      periodType: 'year',
                      fiscalYear: 2026,
                      quarter: undefined,
                      month: undefined,
                      startDate: undefined,
                      endDate: undefined
                    });
                    setTempFiscalYear(2026);
                  }}
                  className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5 transition-colors"
                  title="Reset Period to FY 2026"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Payee Chip (if not All) */}
            {filters.payeeType !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                <span>Payee: <strong>{filters.payeeType}</strong></span>
                <button
                  type="button"
                  onClick={() => updateFiltersAndUrl({ ...filters, payeeType: 'all' })}
                  className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5 transition-colors"
                  title="Reset Payee to All"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Advanced More Filters Chips */}
            {filters.company !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Company: <strong>{filters.company}</strong></span>
                <button type="button" onClick={() => handleFilterChange('company', 'all')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.department !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Dept: <strong>{filters.department}</strong></span>
                <button type="button" onClick={() => handleFilterChange('department', 'all')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.project !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Project: <strong>{filters.project}</strong></span>
                <button type="button" onClick={() => handleFilterChange('project', 'all')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Status: <strong>{filters.status}</strong></span>
                <button type="button" onClick={() => handleFilterChange('status', 'all')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.currency !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <img src={getCurrencyFlag(filters.currency)} alt={filters.currency} className="w-3.5 h-3.5 object-contain inline shrink-0" />
                <span>Currency: <strong>{filters.currency}</strong></span>
                <button type="button" onClick={() => handleFilterChange('currency', 'all')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.paymentLocation !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Location: <strong>{filters.paymentLocation}</strong></span>
                <button type="button" onClick={() => handleFilterChange('paymentLocation', 'all')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.paymentMethod !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Method: <strong>{filters.paymentMethod}</strong></span>
                <button type="button" onClick={() => handleFilterChange('paymentMethod', 'all')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.accountCode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Account: <strong>{filters.accountCode}</strong></span>
                <button type="button" onClick={() => handleFilterChange('accountCode', '')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/80 text-foreground border border-border/70">
                <span>Search: "<strong>{filters.search}</strong>"</span>
                <button type="button" onClick={() => handleFilterChange('search', '')} className="hover:bg-background rounded-full p-0.5">
                  <X size={11} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline ml-auto pl-2"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* ── MORE FILTERS MODAL DIALOG ──────────────────────────────────────── */}
      {isMoreFiltersOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-indigo-600" />
                <h3 className="text-base font-black text-foreground">More Filters</h3>
                {activeMoreFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                    {activeMoreFiltersCount} Active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMoreFiltersOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1.5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Company</label>
                <select
                  value={filters.company}
                  onChange={e => handleFilterChange('company', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Companies</option>
                  {reportData?.filterOptions.companies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Department</label>
                <select
                  value={filters.department}
                  onChange={e => handleFilterChange('department', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Departments</option>
                  {reportData?.filterOptions.departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Project</label>
                <select
                  value={filters.project}
                  onChange={e => handleFilterChange('project', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                >
                  <option value="all">All Projects</option>
                  {reportData?.filterOptions.projects.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={e => handleFilterChange('status', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="DISBURSED">Disbursed / Paid</option>
                  <option value="APPROVED">Approved (Exposure)</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Currency</label>
                <select
                  value={filters.currency}
                  onChange={e => handleFilterChange('currency', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Currencies</option>
                  {reportData?.filterOptions.currencies.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>

              {/* Payment Location */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Payment Location</label>
                <select
                  value={filters.paymentLocation}
                  onChange={e => handleFilterChange('paymentLocation', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Locations</option>
                  <option value="Local">Local</option>
                  <option value="Offshore">Offshore</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={e => handleFilterChange('paymentMethod', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Payment Methods</option>
                  {reportData?.filterOptions.paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Account Code */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Account Code</label>
                <input
                  type="text"
                  placeholder="e.g. 51001"
                  value={filters.accountCode || ''}
                  onChange={e => handleFilterChange('accountCode', e.target.value)}
                  className="w-full bg-background border border-border/70 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateFiltersAndUrl({
                    ...filters,
                    company: 'all',
                    department: 'all',
                    project: 'all',
                    status: 'all',
                    currency: 'all',
                    paymentLocation: 'all',
                    paymentMethod: 'all',
                    accountCode: ''
                  });
                }}
                className="text-xs text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                Clear Advanced Filters
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsMoreFiltersOpen(false)}
                className="px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: FINANCIAL OVERVIEW (EXACTLY 4 KPI CARDS MATCHING EXPENSE APPROVAL) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Total Budget */}
        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Budget</span>
            <Wallet size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground truncate">{formatIdr(summary.totalBudget)}</p>
            </div>
            <p className="text-xs font-semibold font-mono text-muted-foreground mt-1 truncate">
              Approved budget
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">FY {filters.fiscalYear || 2026} allocation</p>
          </div>
        </div>

        {/* CARD 2: Actual Expenses */}
        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Actual Expenses</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">{formatIdr(summary.actualExpenses)}</p>
            </div>
            <p className="text-xs font-semibold font-mono text-emerald-600/80 mt-1 truncate">
              Verified / approved spend
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Consolidated total (IDR)</p>
          </div>
        </div>

        {/* CARD 3: Budget Remaining */}
        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Budget Remaining</span>
            <Sparkles size={16} className="text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground truncate">{formatIdr(summary.budgetRemaining)}</p>
            </div>
            <p className="text-xs font-semibold font-mono text-muted-foreground mt-1 truncate">
              {summary.totalBudget > 0 
                ? `${Math.max(100 - summary.budgetUtilization, 0).toFixed(1)}% remaining`
                : 'Available balance'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Unspent allocation</p>
          </div>
        </div>

        {/* CARD 4: Budget Utilization */}
        <div className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Budget Utilization</span>
            <BarChart3 size={16} className={
              summary.budgetUtilization >= 100 
                ? 'text-rose-500' 
                : summary.budgetUtilization >= 80 
                ? 'text-amber-500' 
                : 'text-indigo-500'
            } />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold font-mono ${
                summary.budgetUtilization >= 100 ? 'text-rose-600' : summary.budgetUtilization >= 80 ? 'text-amber-600' : 'text-foreground'
              }`}>
                {summary.totalBudget > 0 ? `${summary.budgetUtilization.toFixed(1)}%` : '0.0%'}
              </p>
            </div>
            <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.budgetUtilization >= 100 ? 'bg-rose-500' : summary.budgetUtilization >= 80 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(Math.max(summary.budgetUtilization || 0, 0), 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {summary.budgetUtilization >= 100 ? 'Budget exceeded' : summary.budgetUtilization >= 80 ? 'Approaching threshold' : 'Optimal range'}
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: BUDGET VS ACTUAL (FULL WIDTH) ────────────────────── */}
      <div className="bg-card border border-border/40 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Budget vs Actual</h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {filters.periodType === 'month' ? 'Project allocation vs actual spend' : 'Monthly allocation vs actual spend'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 dark:bg-slate-600 inline-block" /> Budget
              </span>
              <span className="flex items-center gap-1.5 text-foreground dark:text-slate-200">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-500 inline-block" /> Actual
              </span>
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenBudgetModal('nominal')}
                  className="h-7 text-[10px] font-bold px-2.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                >
                  <Pencil size={11} className="mr-1" /> Edit Budget
                </Button>
              )}
            </div>
          </div>

          {reportData?.budgetVsActual.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No budget comparison records for this period.
            </div>
          ) : (
            <div className="w-full" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reportData?.budgetVsActual}
                  margin={{ top: 8, right: 12, left: 12, bottom: 4 }}
                  barCategoryGap="20%"
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.15} />
                  <XAxis
                    dataKey="periodLabel"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#334155', opacity: 0.5 }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => {
                      if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
                      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
                      if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
                      return String(val);
                    }}
                    width={52}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#f8fafc',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      padding: '10px 14px',
                    }}
                    formatter={(value: number, name: string) => [
                      formatIdr(value),
                      name === 'budget' ? 'Budget' : 'Actual'
                    ]}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar
                    dataKey="budget"
                    name="budget"
                    fill="#475569"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="actual"
                    name="actual"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    {reportData?.budgetVsActual.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.actual > entry.budget && entry.budget > 0 ? '#f43f5e' : '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>

      {/* ── SECTIONS 5 & 6: EXPENSE BY PROJECT & NEEDS ATTENTION ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 5: Expense by Project */}
        <div className="bg-card border border-border/40 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Expense by Project</h3>
                <p className="text-[10px] text-muted-foreground font-medium">Ranked by highest actual spend (click to filter)</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {reportData?.budgetVarianceList.length || 0} Projects
            </span>
          </div>

          <div className="space-y-3 pt-1 max-h-[440px] overflow-y-auto pr-1 flex-1">
            {reportData?.budgetVarianceList.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No project expense data found.
              </div>
            ) : (
              reportData?.budgetVarianceList.map(proj => {
                const isOver = proj.utilization >= 100;
                const isWarn = proj.utilization >= 80 && proj.utilization < 100;

                return (
                  <div
                    key={proj.projectName}
                    onClick={() => handleFilterChange('project', proj.projectName)}
                    className="p-3.5 rounded-xl border border-border/40 bg-muted/15 dark:bg-slate-900/40 hover:bg-muted/30 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[180px]" title={proj.projectName}>
                          {proj.projectName}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                          isOver
                            ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : isWarn
                            ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        }`}>
                          {isOver ? 'OVER BUDGET' : isWarn ? 'WARNING' : 'HEALTHY'}
                        </span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-black text-foreground">{formatIdr(proj.actual)}</span>
                        <span className="text-[10px] text-muted-foreground dark:text-slate-400 ml-1.5 font-sans">
                          ({proj.utilization.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full bg-muted/60 dark:bg-slate-800 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(proj.utilization, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground dark:text-slate-400 font-medium">
                      <span>Budget: <strong className="text-foreground dark:text-slate-200 font-mono">{formatIdr(proj.budget)}</strong></span>
                      <span>Remaining: <strong className={`font-mono ${proj.variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatIdr(proj.variance)}
                      </strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 6: Needs Attention */}
        <div className="bg-card border border-border/40 rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Needs Attention</h3>
              {reportData?.attentionRequired && reportData.attentionRequired.length > 0 && (
                <span className="text-[10px] font-black bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  {reportData.attentionRequired.length} Items
                </span>
              )}
            </div>
            {reportData?.attentionRequired && reportData.attentionRequired.length > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Click to filter</span>
            )}
          </div>

          <div className="flex-1">
            {reportData?.attentionRequired && reportData.attentionRequired.length > 0 ? (
              <div className="space-y-3">
                {reportData.attentionRequired.map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (alert.filterAction) {
                        handleFilterChange(alert.filterAction.filterKey, alert.filterAction.filterValue);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs ${
                      alert.type === 'danger'
                        ? 'border-rose-500/40 dark:border-rose-900/60 bg-rose-500/10 dark:bg-rose-950/25 hover:bg-rose-500/15'
                        : alert.type === 'warning'
                        ? 'border-amber-500/40 dark:border-amber-900/60 bg-amber-500/10 dark:bg-amber-950/25 hover:bg-amber-500/15'
                        : 'border-blue-500/40 dark:border-blue-900/60 bg-blue-500/10 dark:bg-blue-950/25 hover:bg-blue-500/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          alert.type === 'danger' ? 'bg-rose-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <h4 className="text-xs font-bold text-foreground leading-tight">{alert.title}</h4>
                      </div>
                      {alert.amount !== undefined && alert.amount > 0 && (
                        <span className="font-mono text-xs font-black text-foreground shrink-0">
                          {formatIdr(alert.amount)}
                        </span>
                      )}
                    </div>
                    {alert.subtitle && (
                      <p className="text-[11px] text-muted-foreground dark:text-slate-400 mt-1.5 pl-4">
                        {alert.subtitle}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 p-3.5 rounded-xl">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>No critical issues detected. All budget utilization and payment queues are within healthy thresholds.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 7: EXPENSE TRANSACTIONS TABLE ─────────────────────────── */}
      <div className="bg-card border border-border/40 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-600" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Expense Transactions</h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Showing {pagedTransactions.length} of {reportData?.totalTransactionsCount} transactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-medium">Page Size:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-background border border-border/60 rounded-lg px-2 py-1 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20 border-b border-border/40">
              <TableRow>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ID / Expense No</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payee / Vendor</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payee Type</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Department</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Project / Description</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">Original Amount</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">Reporting Amount (IDR)</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-xs">
                    No transactions match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                pagedTransactions.map(txn => (
                  <TableRow key={txn.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-indigo-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{txn.expense_number}</span>
                        {txn.invoice_attachment_id && (
                          <span title="Lampiran tersedia" className="inline-flex items-center text-emerald-600 bg-emerald-500/10 p-0.5 rounded">
                            <Paperclip size={11} />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {txn.request_date}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground max-w-[170px] truncate" title={txn.paid_to}>
                      <div>
                        <span>{txn.paid_to}</span>
                        <div className="text-[10px] font-normal text-muted-foreground truncate">
                          Oleh: {txn.prepared_by_name || 'Staff'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        txn.payee_type === 'Individual'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      }`}>
                        {txn.payee_type || 'Company'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {txn.department}
                    </TableCell>
                    <TableCell className="text-xs text-foreground max-w-[200px] truncate" title={txn.payment_description || txn.project_name}>
                      {txn.payment_description || txn.project_name}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-foreground font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <img 
                          src={getCurrencyFlag(txn.currency)} 
                          alt={txn.currency} 
                          className="w-3.5 h-3.5 object-contain inline shrink-0" 
                        />
                        <span>{formatCurrencyAmount(txn.currency, txn.amount)}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-black text-foreground text-right font-mono whitespace-nowrap">
                      {formatIdr(txn.reporting_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-block ${
                          txn.status === 'DISBURSED' || txn.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : txn.status === 'APPROVED'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : txn.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}>
                          {txn.status}
                        </span>
                        {txn.approved_by_name && (txn.status === 'APPROVED' || txn.status === 'DISBURSED' || txn.status === 'PAID') && (
                          <div className="text-[9px] text-muted-foreground font-medium mt-0.5 truncate max-w-[100px] mx-auto" title={`Approved by: ${txn.approved_by_name}`}>
                            ✓ {txn.approved_by_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTxn(txn)}
                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-indigo-600 cursor-pointer"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye size={13} />
                        </Button>
                        {txn.invoice_attachment_id && (
                          <a
                            href={`https://drive.google.com/file/d/${txn.invoice_attachment_id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 w-7 p-0 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            title="Buka Lampiran Invoice"
                          >
                            <Paperclip size={13} />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-8 rounded-xl text-xs font-bold"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="h-8 rounded-xl text-xs font-bold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL (LENGKAP: AUDIT TRAIL, APPROVER, CREATOR & LAMPIRAN) ── */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/70 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Transaction Detail</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                      selectedTxn.status === 'DISBURSED' || selectedTxn.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : selectedTxn.status === 'APPROVED'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        : selectedTxn.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    }`}>
                      {selectedTxn.status}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-foreground">{selectedTxn.expense_number}</h3>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTxn(null)}
                className="rounded-full w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* 1. AUDIT TRAIL CARD (SIAPA YG BUAT, KAPAN DIBUAT, SIAPA YG APPROVED, KAPAN DIAPPROVED) */}
              <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  <span>Informasi Pembuat & Persetujuan (Workflow & Audit Trail)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Pembuat */}
                  <div className="p-3 rounded-lg bg-card border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <User className="h-3 w-3 text-indigo-500" /> Dibuat Oleh (Creator)
                      </span>
                      <span className="text-[9px] font-black text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        REQUESTER
                      </span>
                    </div>
                    <div className="font-bold text-sm text-foreground">
                      {selectedTxn.prepared_by_name || 'Staff'}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Dibuat: <strong className="text-foreground">{formatFullDateTime(selectedTxn.created_at)}</strong></span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Tgl Request: <strong className="text-foreground">{formatDisplayDate(selectedTxn.request_date)}</strong></span>
                    </div>
                  </div>

                  {/* Approver */}
                  <div className="p-3 rounded-lg bg-card border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Disetujui Oleh (Approver)
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        selectedTxn.status === 'APPROVED' || selectedTxn.status === 'DISBURSED' || selectedTxn.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : selectedTxn.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {selectedTxn.status === 'PENDING_APPROVAL' ? 'PENDING' : 'APPROVED'}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      {selectedTxn.approved_by_name ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{selectedTxn.approved_by_name}</span>
                        </>
                      ) : selectedTxn.status === 'PENDING_APPROVAL' ? (
                        <span className="text-amber-600 font-medium text-xs flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" /> Menunggu Persetujuan
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal text-xs">-</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Waktu Disetujui: <strong className="text-foreground">
                        {(selectedTxn.status === 'APPROVED' || selectedTxn.status === 'DISBURSED' || selectedTxn.status === 'PAID')
                          ? formatFullDateTime(selectedTxn.updated_at || selectedTxn.created_at)
                          : (selectedTxn.status === 'PENDING_APPROVAL' ? 'Belum Disetujui' : '-')}
                      </strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. FINANCIAL INFORMATION */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>Rincian Finansial & Pembayaran</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Original Amount</span>
                    <p className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                      <img 
                        src={getCurrencyFlag(selectedTxn.currency)} 
                        alt={selectedTxn.currency} 
                        className="w-4 h-4 object-contain inline shrink-0" 
                      />
                      <span className="font-mono">{formatCurrencyAmount(selectedTxn.currency, selectedTxn.amount)}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Kurs / Exchange Rate</span>
                    <p className="font-mono font-semibold text-foreground mt-0.5">
                      {selectedTxn.currency !== 'IDR' ? `1 ${selectedTxn.currency} = ${formatIdr(selectedTxn.exchange_rate)}` : '1.0 (IDR)'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Reporting Amount (IDR)</span>
                    <p className="font-black text-indigo-600 text-sm mt-0.5 font-mono">
                      {formatIdr(selectedTxn.reporting_amount)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Metode Pembayaran</span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTxn.payment_method}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Lokasi Pembayaran</span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTxn.payment_location || 'Local'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">No. Invoice / Voucher</span>
                    <p className="font-mono text-foreground mt-0.5 text-[11px]">
                      {selectedTxn.invoice_number || selectedTxn.voucher_number || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. PAYEE & BANK REKENING */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span>Penerima & Rekening Tujuan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Penerima (Payee / Vendor)</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-bold text-foreground">{selectedTxn.paid_to}</p>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground border">
                        {selectedTxn.payee_type || 'Company'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Perusahaan & Departemen</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {selectedTxn.company} • {selectedTxn.department}
                    </p>
                  </div>

                  {(selectedTxn.bank_name || selectedTxn.account_number || selectedTxn.account_name) && (
                    <div className="col-span-1 sm:col-span-2 p-2.5 rounded-lg bg-muted/30 border border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Bank</span>
                        <p className="font-bold text-foreground">{selectedTxn.bank_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">No. Rekening</span>
                        <p className="font-mono font-bold text-foreground">{selectedTxn.account_number || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Atas Nama (A/N)</span>
                        <p className="font-bold text-foreground">{selectedTxn.account_name || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. PROJECT & DESCRIPTION */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Proyek & Keterangan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Nama Proyek</span>
                    <p className="font-bold text-foreground mt-0.5">{selectedTxn.project_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Kategori Biaya</span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedTxn.category}</p>
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi Pembayaran</span>
                    <p className="font-medium text-foreground mt-1 bg-muted/40 p-3 rounded-xl border border-border/40 leading-relaxed text-xs">
                      {selectedTxn.payment_description}
                    </p>
                  </div>

                  {selectedTxn.note && (
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Catatan Tambahan (Note)</span>
                      <p className="font-medium text-muted-foreground mt-1 bg-muted/20 p-2.5 rounded-lg border border-border/30 text-xs">
                        {selectedTxn.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. LAMPIRAN DOKUMEN / INVOICE */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground">
                    <Paperclip className="h-4 w-4 text-emerald-600" />
                    <span>Lampiran Dokumen / Invoice</span>
                  </div>
                  {selectedTxn.invoice_attachment_id && (
                    <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                      Tersedia
                    </span>
                  )}
                </div>

                {selectedTxn.invoice_attachment_id ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-foreground">
                          Invoice / Bukti Pembayaran ({selectedTxn.expense_number})
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[240px]">
                          Drive ID: {selectedTxn.invoice_attachment_id}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://drive.google.com/file/d/${selectedTxn.invoice_attachment_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Buka Lampiran</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Tidak ada file lampiran invoice terlampir untuk transaksi ini.</span>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/50 bg-muted/20 shrink-0">
              <div>
                {selectedTxn.invoice_attachment_id && (
                  <a
                    href={`https://drive.google.com/file/d/${selectedTxn.invoice_attachment_id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Lihat Lampiran di Tab Baru</span>
                  </a>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTxn(null)}
                className="rounded-xl font-bold text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ── MANAGE BUDGETS DIALOG (NOMINAL & PROJECTS) ─────────────────────── */}
      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden font-sans border-border/80 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/40 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Atur Anggaran / Budget (FY {filters.fiscalYear || 2026})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Atur nominal budget bulanan atau rincian per project untuk laporan CSL
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex items-center gap-2 pt-3 border-t border-border/40 mt-3">
              <button
                type="button"
                onClick={() => setBudgetModalTab('nominal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  budgetModalTab === 'nominal'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <DollarSign size={13} /> Nominal Budget Bulanan
              </button>
              <button
                type="button"
                onClick={() => setBudgetModalTab('projects')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  budgetModalTab === 'projects'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Layers size={13} /> Alokasi per Project
              </button>
            </div>
          </DialogHeader>

          <div className="px-6 py-4 max-h-[68vh] overflow-y-auto space-y-4">
            {budgetModalTab === 'nominal' ? (
              <div className="space-y-4">
                {/* Information Callout */}
                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground flex items-center gap-1.5 mb-0.5">
                    <Sparkles size={13} className="text-indigo-600" /> Pengaturan Nominal Budget vs Actual
                  </p>
                  Nominal budget ini langsung menjadi baseline bulanan pada grafik <span className="font-bold text-foreground">Budget vs Actual</span> dan menghitung KPI sisa anggaran serta utilisasi.
                </div>

                {/* Sub-mode selector */}
                <div className="flex items-center justify-between p-1 rounded-xl bg-muted/50 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsCustomMonthly(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      !isCustomMonthly
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sama Rata per Bulan (Flat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomMonthly(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      isCustomMonthly
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Atur per Bulan (Jan s/d Des)
                  </button>
                </div>

                {!isCustomMonthly ? (
                  <div className="space-y-4 pt-1">
                    {/* Main Monthly Input */}
                    <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3">
                      <div>
                        <label className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block mb-1">
                          Nominal Budget per Bulan
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground">
                            Rp
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={monthlyNominalStr}
                            onChange={e => handleFlatMonthlyChange(e.target.value)}
                            placeholder="e.g. 50.000.000"
                            className="pl-11 h-12 text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 bg-background"
                          />
                        </div>
                      </div>

                      {/* Presets Chips */}
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">
                          Pilihan Cepat (Presets):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[10_000_000, 20_000_000, 25_000_000, 50_000_000, 75_000_000, 100_000_000, 150_000_000, 200_000_000].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleApplyPreset(amt)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border/60 bg-background hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {formatIdr(amt)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Linked Annual Input */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                      <label className="text-xs font-bold text-foreground block">
                        Total Budget 1 Tahun (x12 Bulan)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground">
                          Rp
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={annualNominalStr}
                          onChange={e => handleFlatAnnualChange(e.target.value)}
                          placeholder="e.g. 600.000.000"
                          className="pl-11 h-10 text-sm font-mono font-bold text-foreground bg-background"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Ketik di nominal tahunan otomatis membagi 12 untuk bulanan, begitu pula sebaliknya.
                      </p>
                    </div>

                    {/* Breakdown Projection Cards */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Per Bulan</span>
                        <p className="text-xs font-black font-mono text-indigo-600 mt-0.5">
                          {formatIdr(parseFormattedAmount(monthlyNominalStr))}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Per Kuartal (3 Bln)</span>
                        <p className="text-xs font-black font-mono text-foreground mt-0.5">
                          {formatIdr(parseFormattedAmount(monthlyNominalStr) * 3)}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Total 1 Tahun</span>
                        <p className="text-xs font-black font-mono text-emerald-600 mt-0.5">
                          {formatIdr(parseFormattedAmount(annualNominalStr))}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Custom 12-Month Grid */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">
                        Rincian Nominal Setiap Bulan (FY {filters.fiscalYear || 2026})
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const val = monthlyNominalStr || '50.000.000';
                          setCustomMonthsStr(Array(12).fill(val));
                          const num = parseFormattedAmount(val);
                          setAnnualNominalStr(formatAmountWithDots(num * 12));
                        }}
                        className="h-7 text-[11px] font-bold text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer"
                      >
                        Terapkan Rp {monthlyNominalStr || '0'} ke Semua Bulan
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        'Januari', 'Februari', 'Maret', 'April',
                        'Mei', 'Juni', 'Juli', 'Agustus',
                        'September', 'Oktober', 'November', 'Desember'
                      ].map((mName, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                            {mName}
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-muted-foreground">
                              Rp
                            </span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={customMonthsStr[idx] || ''}
                              onChange={e => handleCustomMonthChange(idx, e.target.value)}
                              placeholder="0"
                              className="pl-8 h-8 text-xs font-mono font-bold text-foreground bg-background"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Footer for Custom */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Budget Setahun:</span>
                        <span className="font-black font-mono text-sm text-foreground">
                          Rp {annualNominalStr || '0'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Rata-rata per Bulan:</span>
                        <span className="font-black font-mono text-sm text-indigo-600">
                          Rp {monthlyNominalStr || '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: Project Breakdown */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Total Budget Bulanan (Projects)
                    </span>
                    <p className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {formatIdr(budgetEditList.reduce((sum, item) => sum + (parseFormattedAmount(item.monthly_amount) || 0), 0))} <span className="text-[10px] font-normal text-muted-foreground">/ bln</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Total Budget Tahunan (FY {filters.fiscalYear || 2026})
                    </span>
                    <p className="text-sm font-black font-mono text-foreground mt-0.5">
                      {formatIdr(budgetEditList.reduce((sum, item) => sum + (parseFormattedAmount(item.allocated_amount) || 0), 0))} <span className="text-[10px] font-normal text-muted-foreground">/ thn</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Alokasi Anggaran per Project</p>
                    <p className="text-[10px] text-muted-foreground">Ketik di kolom bulanan atau tahunan, sistem otomatis mengalikan/membagi</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBudgetRow}
                    className="h-7 text-xs gap-1 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer"
                  >
                    <Plus size={12} /> Add Project
                  </Button>
                </div>

                {budgetEditList.length === 0 ? (
                  <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
                    Belum ada alokasi budget project. Klik &quot;Add Project&quot; di atas untuk menambahkan.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {budgetEditList.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                            Project Name
                          </label>
                          <Input
                            value={item.project_name}
                            onChange={e => {
                              const val = e.target.value;
                              setBudgetEditList(prev => prev.map((p, i) => i === index ? { ...p, project_name: val } : p));
                            }}
                            placeholder="e.g. Legal Restructuring"
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="w-full sm:w-24 shrink-0">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                            Dept
                          </label>
                          <Input
                            value={item.department}
                            onChange={e => {
                              const val = e.target.value;
                              setBudgetEditList(prev => prev.map((p, i) => i === index ? { ...p, department: val } : p));
                            }}
                            placeholder="CSL"
                            className="h-8 text-xs bg-background font-medium"
                          />
                        </div>

                        <div className="w-full sm:w-36 shrink-0">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                            Budget / Bulan
                          </label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={item.monthly_amount}
                            onChange={e => handleMonthlyChange(index, e.target.value)}
                            placeholder="e.g. 5.000.000"
                            className="h-8 text-xs font-mono font-bold text-indigo-600 bg-background"
                          />
                        </div>

                        <div className="w-full sm:w-36 shrink-0">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Setahun (x12)
                            </label>
                            {item.actual > 0 && (
                              <span className="text-[9px] text-muted-foreground font-mono truncate" title={`Actual spend: ${formatIdr(item.actual)}`}>
                                Act: {formatIdr(item.actual)}
                              </span>
                            )}
                          </div>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={item.allocated_amount}
                            onChange={e => handleAnnualChange(index, e.target.value)}
                            placeholder="e.g. 60.000.000"
                            className="h-8 text-xs font-mono font-medium text-foreground bg-background"
                          />
                        </div>

                        <div className="sm:pt-5 shrink-0 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBudgetRow(index)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border/40 gap-2 bg-card">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBudgetModalOpen(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={budgetModalTab === 'nominal' ? handleSaveMonthlyBudget : handleSaveBudgets}
              disabled={isSavingBudgets}
              className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-sm"
            >
              {isSavingBudgets ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan…
                </>
              ) : (
                'Simpan Budget'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MOBILE VIEW RECOMMENDATION POPUP (ENGLISH) ────────────────────── */}
      {showMobileWarning && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-sans text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Monitor className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                Desktop View Recommended
              </h3>
              <p className="text-xs text-muted-foreground dark:text-slate-400 leading-relaxed">
                For the optimal experience, financial monitoring charts and detailed transaction matrices are best viewed on a desktop or larger display.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-slate-900/70 border border-border/60 dark:border-slate-800/80 text-[11px] text-muted-foreground dark:text-slate-400 text-left space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground dark:text-slate-200">
                <Laptop className="h-3.5 w-3.5 text-indigo-500" />
                <span>Why view on Desktop or wider screen?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Full-width monthly Budget vs Actual comparisons</li>
                <li>Complete audit trail details and transaction tables</li>
                <li>Easier management of project budgets and allocations</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleDismissMobileWarning}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs cursor-pointer"
              >
                Got It, Continue Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
