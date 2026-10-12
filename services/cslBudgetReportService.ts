import { supabase } from '@/lib/supabaseClient';

export type PeriodType = 'year' | 'quarter' | 'month' | 'custom';
export type PayeeTypeFilter = 'all' | 'Company' | 'Individual';

export interface ReportFilters {
  periodType: PeriodType;
  fiscalYear: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  month?: number; // 1 to 12
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  payeeType: PayeeTypeFilter;

  // More Filters
  company: string;
  department: string;
  project: string;
  status: string;
  currency: string;
  paymentLocation: string;
  paymentMethod: string;
  accountCode?: string;

  // Search
  search: string;

  // Legacy/fallback compatibility
  periodPreset?: string;
  year?: number;
}

export interface PeriodRangeInfo {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string; // e.g. "FY 2026", "Q3 FY 2026", "September FY 2026", "08 Sep 2026 - 25 Sep 2026"
  shortLabel: string;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function getPeriodDateRange(filters: Partial<ReportFilters>): PeriodRangeInfo {
  const y = filters.fiscalYear || filters.year || 2026;
  const pType = filters.periodType || 'year';

  if (pType === 'quarter' && filters.quarter) {
    const q = filters.quarter;
    let start = `${y}-01-01`;
    let end = `${y}-03-31`;
    if (q === 'Q2') { start = `${y}-04-01`; end = `${y}-06-30`; }
    else if (q === 'Q3') { start = `${y}-07-01`; end = `${y}-09-30`; }
    else if (q === 'Q4') { start = `${y}-10-01`; end = `${y}-12-31`; }
    return {
      start,
      end,
      label: `${q} FY ${y}`,
      shortLabel: `${q} ${y}`
    };
  }

  if (pType === 'month' && filters.month) {
    const m = filters.month;
    const mStr = String(m).padStart(2, '0');
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`;
    const start = `${y}-${mStr}-01`;
    const mName = MONTH_NAMES[m - 1] || `Month ${m}`;
    return {
      start,
      end,
      label: `${mName} FY ${y}`,
      shortLabel: `${MONTH_SHORT_NAMES[m - 1]} ${y}`
    };
  }

  if (pType === 'custom' && filters.startDate && filters.endDate) {
    const formatDate = (dateStr: string) => {
      try {
        const [yr, mo, da] = dateStr.split('-');
        if (!yr || !mo || !da) return dateStr;
        const monthIdx = Number(mo) - 1;
        return `${da} ${MONTH_SHORT_NAMES[monthIdx] || mo} ${yr}`;
      } catch {
        return dateStr;
      }
    };
    return {
      start: filters.startDate,
      end: filters.endDate,
      label: `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`,
      shortLabel: `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`
    };
  }

  // Default: Full Fiscal Year (Jan 1 - Dec 31)
  return {
    start: `${y}-01-01`,
    end: `${y}-12-31`,
    label: `FY ${y}`,
    shortLabel: `FY ${y}`
  };
}

export interface KpiSummary {
  totalBudget: number;
  actualExpenses: number;
  budgetRemaining: number;
  budgetUtilization: number;
  pendingApprovalCount: number;
  pendingApprovalAmount: number;
  paymentExposure: number;
  isBudgetDefined: boolean;
}

export interface MonthlyComparison {
  periodKey: string;
  periodLabel: string;
  budget: number;
  actual: number;
  variance: number;
  utilization: number;
}

export interface ExpenseTrendPoint {
  periodKey: string;
  periodLabel: string;
  amount: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface PaymentStatusSummary {
  status: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
  badgeClass: string;
}

export interface ProjectVariance {
  projectName: string;
  company: string;
  department: string;
  budget: number;
  actual: number;
  variance: number; // budget - actual
  utilization: number; // actual / budget * 100
  status: 'Healthy' | 'Warning' | 'Over Budget';
  txnCount: number;
}

export interface CurrencyExposureItem {
  currency: string;
  symbol: string;
  flagIcon: string;
  originalAmount: number;
  reportingAmountIdr: number;
  transactionCount: number;
  latestRate: number;
}

export interface AttentionAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  subtitle: string;
  count: number;
  amount?: number;
  filterAction?: {
    filterKey: keyof ReportFilters;
    filterValue: any;
  };
}

export interface ExpenseTransactionRow {
  id: string;
  expense_number: string;
  invoice_number?: string;
  voucher_number?: string;
  request_date: string;
  created_at: string;
  company: string;
  department: string;
  project_name: string;
  paid_to: string;
  payee_type: string;
  payment_location: string;
  payment_method: string;
  payment_description: string;
  category: string;
  currency: string;
  amount: number;
  exchange_rate: number;
  reporting_currency: string;
  reporting_amount: number;
  status: string;
  prepared_by_name: string;
  prepared_by_id?: string;
  approved_by_name?: string;
  approved_by_id?: string;
  updated_at?: string;
  invoice_attachment_id?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  note?: string;
}

export interface BudgetExpensesReportData {
  summary: KpiSummary;
  budgetVsActual: MonthlyComparison[];
  expenseTrend: ExpenseTrendPoint[];
  expenseByCategory: CategoryBreakdown[];
  paymentStatusList: PaymentStatusSummary[];
  budgetVarianceList: ProjectVariance[];
  currencyExposureList: CurrencyExposureItem[];
  attentionRequired: AttentionAlert[];
  topExpenses: ExpenseTransactionRow[];
  transactions: ExpenseTransactionRow[];
  totalTransactionsCount: number;
  lastUpdated: string;
  periodLabel: string;
  dateRange: { start: string; end: string };
  filterOptions: {
    availableYears: number[];
    companies: string[];
    departments: string[];
    projects: string[];
    currencies: string[];
    payeeTypes: string[];
    paymentLocations: string[];
    paymentMethods: string[];
    statuses: string[];
  };
}

// ── STATUS DEFINITIONS & BUSINESS LOGIC ────────────────────────────────────
// Actual expenses: DISBURSED, APPROVED, PAID
export const ACTUAL_STATUSES = ['DISBURSED', 'APPROVED', 'PAID'];
export const PENDING_STATUSES = ['PENDING_APPROVAL'];
// Payment exposure: APPROVED but not yet DISBURSED / PAID
export const EXPOSURE_STATUSES = ['APPROVED'];

export const extractCategory = (raw: string | undefined | null): string => {
  if (!raw) return 'Legal & Secretarial';
  const str = raw.trim().toLowerCase();
  if (str.includes('notaris') || str.includes('notary') || str.includes('akta')) return 'Notary & PPAT Services';
  if (str.includes('likuidasi') || str.includes('restruktur')) return 'Corporate Restructuring';
  if (str.includes('rups') || str.includes('saham') || str.includes('ar')) return 'RUPS & Secretarial';
  if (str.includes('hukum') || str.includes('legal') || str.includes('advisory') || str.includes('counsel')) return 'Legal Advisory & Counsel';
  if (str.includes('izin') || str.includes('oss') || str.includes('ahu') || str.includes('pnbp')) return 'Permits & Government Filings';
  if (str.includes('offshore')) return 'Offshore Legal Services';
  if (str.includes('audit') || str.includes('tax') || str.includes('pajak')) return 'Tax & Audit Advisory';
  return 'Corporate Legal Operations';
};

// Currency symbols
export const getCurrencySymbol = (curr: string): string => {
  switch ((curr || '').toUpperCase().trim()) {
    case 'IDR': return 'Rp';
    case 'USD': return '$';
    case 'SGD': return 'S$';
    case 'HKD': return 'HK$';
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'GBP': return '£';
    case 'AUD': return 'A$';
    case 'CNY':
    case 'RMB': return '¥';
    default: return curr || 'Rp';
  }
};

// Returns the path to the flag image in public/image/flag/
export const getCurrencyFlag = (curr: string): string => {
  switch ((curr || '').toUpperCase().trim()) {
    case 'IDR':
      return '/image/flag/indo.png';
    case 'USD':
      return '/image/flag/united-states.png';
    case 'EUR':
      return '/image/flag/euro.png';
    case 'HKD':
      return '/image/flag/hongkong.png';
    case 'JPY':
      return '/image/flag/japan.png';
    case 'CNY':
    case 'RMB':
      return '/image/flag/china.png';
    case 'AUD':
      return '/image/flag/australia.png';
    case 'SGD':
      return '/image/flag/singapore.png';
    default:
      return '/image/flag/earth.png';
  }
};

export const formatCurrencyAmount = (currency: string, amount: number): string => {
  const curr = (currency || 'IDR').toUpperCase().trim();
  const num = Number(amount) || 0;
  if (curr === 'IDR') {
    return formatIdr(num);
  }
  const hasDecimals = num % 1 !== 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  }).format(num);
  return `${curr} ${formatted}`;
};

export const formatIdr = (val: number): string => {
  return `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(val || 0))}`;
};

// Strictly adhere to full monetary amount rule (NO K, M, B, Million, Billion)
export const formatIdrCompact = (val: number): string => {
  return formatIdr(val);
};

// ── CORE REPORT GENERATION SERVICE ──────────────────────────────────────────
export async function fetchBudgetExpensesReport(
  filters: ReportFilters
): Promise<BudgetExpensesReportData> {
  // 1. Fetch Expenses & Offshore Invoices
  const [resExpenses, resOffshore, resBudgets] = await Promise.all([
    supabase.from('csl_expense_approvals').select('*').order('created_at', { ascending: false }),
    supabase.from('csl_offshore_invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('csl_budget_allocations').select('*').maybeSingle().then(
      async () => supabase.from('csl_budget_allocations').select('*'),
      () => ({ data: null, error: null })
    )
  ]);

  if (resExpenses.error && resExpenses.error.code !== '42P01') {
    console.error('Error fetching expenses:', resExpenses.error);
  }

  // Raw normalizations
  const rawList: ExpenseTransactionRow[] = [];

  if (resExpenses.data && Array.isArray(resExpenses.data)) {
    resExpenses.data.forEach((r: any) => {
      const repAmt = Number(r.reporting_amount || r.total_amount || r.amount || 0);
      const origAmt = Number(r.amount || r.total_amount || 0);
      const curr = (r.currency || 'IDR').toUpperCase();
      const rate = Number(r.exchange_rate || 1);
      const desc = r.payment_description || r.project_name || 'Expense';
      
      rawList.push({
        id: r.id,
        expense_number: r.expense_number || `EXP-${r.id?.slice(0, 8)}`,
        invoice_number: r.invoice_number,
        voucher_number: r.voucher_number,
        request_date: r.request_date || (r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || r.created_at,
        company: (r.company || 'PT Bumi Grafika Jaya').trim(),
        department: (r.department || 'CSL').trim(),
        project_name: (r.project_name || 'General Operations').trim(),
        paid_to: (r.paid_to || 'Unknown Payee').trim(),
        payee_type: (r.payee_type || 'Company').trim(),
        payment_location: (r.payment_location || 'Local').trim(),
        payment_method: (r.payment_method || 'Bank Transfer / T.T').trim(),
        payment_description: desc,
        category: extractCategory(r.payment_description || r.project_name),
        currency: curr,
        amount: origAmt,
        exchange_rate: rate,
        reporting_currency: (r.reporting_currency || 'IDR').toUpperCase(),
        reporting_amount: repAmt,
        status: (r.status || 'PENDING_APPROVAL').toUpperCase().trim(),
        prepared_by_name: r.prepared_by_name || 'Staff',
        prepared_by_id: r.prepared_by_id || undefined,
        approved_by_name: r.approved_by_name || undefined,
        approved_by_id: r.approved_by_id || undefined,
        invoice_attachment_id: r.invoice_attachment_id || undefined,
        bank_name: r.bank_name || undefined,
        account_number: r.account_number || undefined,
        account_name: r.account_name || undefined,
        note: r.note || undefined
      });
    });
  }

  if (resOffshore.data && Array.isArray(resOffshore.data)) {
    resOffshore.data.forEach((r: any) => {
      const origAmt = Number(r.foreign_amount || 0);
      const rate = Number(r.exchange_rate || 1);
      const repAmt = origAmt * rate;
      const curr = (r.foreign_currency || 'USD').toUpperCase();
      const desc = r.payment_description || r.note || 'Offshore Legal Service';

      rawList.push({
        id: `offshore_${r.id}`,
        expense_number: r.invoice_number || `INV-${r.id?.slice(0, 8)}`,
        invoice_number: r.invoice_number,
        voucher_number: r.voucher_number,
        request_date: r.request_date || (r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || r.created_at,
        company: (r.company || 'PT Bumi Grafika Jaya').trim(),
        department: 'CSL',
        project_name: (r.payment_description || 'Offshore Legal Service').trim(),
        paid_to: (r.paid_to || 'Offshore Vendor').trim(),
        payee_type: 'Company',
        payment_location: 'Offshore',
        payment_method: 'Bank Transfer / T.T',
        payment_description: desc,
        category: 'LEGAL SERVICES',
        currency: curr,
        amount: origAmt,
        exchange_rate: rate,
        reporting_currency: 'IDR',
        reporting_amount: repAmt,
        status: r.status === 'PAID' ? 'DISBURSED' : (r.status || 'PENDING_APPROVAL').toUpperCase().trim(),
        prepared_by_name: r.prepared_by_name || 'Staff',
        prepared_by_id: r.prepared_by_id || undefined,
        approved_by_name: r.approved_by_name || undefined,
        approved_by_id: r.approved_by_id || undefined,
        invoice_attachment_id: r.invoice_attachment_id || undefined,
        bank_name: r.bank_name || undefined,
        account_number: r.account_number || undefined,
        account_name: r.account_name || undefined,
        note: r.note || undefined
      });
    });
  }

  const dataYears = rawList.map(t => {
    const d = t.request_date || t.created_at;
    return d ? new Date(d).getFullYear() : 2026;
  });
  const availableYears = Array.from(new Set([2026, 2025, ...dataYears]))
    .filter(y => y > 2000 && y < 2100)
    .sort((a, b) => b - a);

  // Collect filter option lists from all raw data
  const filterOptions = {
    availableYears,
    companies: Array.from(new Set(rawList.map(t => t.company).filter(Boolean))).sort(),
    departments: Array.from(new Set(rawList.map(t => t.department).filter(Boolean))).sort(),
    projects: Array.from(new Set(rawList.map(t => t.project_name).filter(Boolean))).sort(),
    currencies: Array.from(new Set(rawList.map(t => t.currency).filter(Boolean))).sort(),
    payeeTypes: ['Company', 'Individual'],
    paymentLocations: ['Local', 'Offshore'],
    paymentMethods: Array.from(new Set(rawList.map(t => t.payment_method).filter(Boolean))).sort(),
    statuses: ['DISBURSED', 'APPROVED', 'PENDING_APPROVAL', 'REJECTED', 'DRAFT']
  };

  // 2. Budget Allocations Table or Default Project Allocations
  const budgetAllocations: Array<{
    fiscal_year: number;
    company: string;
    department: string;
    project_name: string;
    allocated_amount: number;
  }> = [];

  const targetFiscalYear = filters.fiscalYear || filters.year || 2026;

  // Check if custom user-defined budget allocations exist in localStorage
  let savedLocalBudgets: any[] = [];
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(`csl_budget_allocations_${targetFiscalYear}`) : null;
    if (raw) savedLocalBudgets = JSON.parse(raw);
  } catch {
    savedLocalBudgets = [];
  }

  if (Array.isArray(savedLocalBudgets) && savedLocalBudgets.length > 0) {
    savedLocalBudgets.forEach((b: any) => {
      budgetAllocations.push({
        fiscal_year: Number(b.fiscal_year || targetFiscalYear),
        company: (b.company || 'PT Determinan Indah').trim(),
        department: (b.department || 'CSL').trim(),
        project_name: (b.project_name || '').trim(),
        allocated_amount: Number(b.allocated_amount || 0)
      });
    });
  } else if (resBudgets?.data && Array.isArray(resBudgets.data) && resBudgets.data.length > 0) {
    resBudgets.data.forEach((b: any) => {
      budgetAllocations.push({
        fiscal_year: Number(b.fiscal_year || 2026),
        company: (b.company || '').trim(),
        department: (b.department || '').trim(),
        project_name: (b.project_name || '').trim(),
        allocated_amount: Number(b.allocated_amount || 0)
      });
    });
  } else {
    // Dynamically derive project allocations for actual projects present in CSL expense approvals
    const uniqueProjects = Array.from(new Set(rawList.map(t => t.project_name).filter(Boolean)));
    uniqueProjects.forEach(proj => {
      const projTxns = rawList.filter(t => t.project_name === proj);
      const totalSpend = projTxns.reduce((s, t) => s + t.reporting_amount, 0);
      const dept = projTxns[0]?.department || 'CSL';
      const company = projTxns[0]?.company || 'PT Determinan Indah';

      // Allocated target based on project budget ceiling (130% of spend or min 10M)
      const allocAmt = totalSpend > 0 ? Math.max(Math.round(totalSpend * 1.3), 10_000_000) : 10_000_000;

      budgetAllocations.push({
        fiscal_year: targetFiscalYear,
        company,
        department: dept,
        project_name: proj,
        allocated_amount: allocAmt
      });
    });
  }

  // 3. Compute Exact Date Boundaries for the selected Period
  const periodInfo = getPeriodDateRange(filters);
  const { start: dateStart, end: dateEnd, label: activePeriodLabel } = periodInfo;

  // 4. Apply Filters to Transactions
  const filtered = rawList.filter(item => {
    // Exact date boundary check (YYYY-MM-DD)
    const itemDate = (item.request_date || item.created_at || '').substring(0, 10);
    if (itemDate && (itemDate < dateStart || itemDate > dateEnd)) {
      return false;
    }

    // Payee Type Filter (All, Company, Individual)
    if (filters.payeeType && filters.payeeType !== 'all') {
      if (item.payee_type !== filters.payeeType) return false;
    }

    // Entity Filters
    if (filters.company && filters.company !== 'all' && item.company !== filters.company) return false;
    if (filters.department && filters.department !== 'all' && item.department !== filters.department) return false;
    if (filters.project && filters.project !== 'all' && item.project_name !== filters.project) return false;
    if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.currency && filters.currency !== 'all' && item.currency !== filters.currency) return false;
    if (filters.paymentLocation && filters.paymentLocation !== 'all' && item.payment_location !== filters.paymentLocation) return false;
    if (filters.paymentMethod && filters.paymentMethod !== 'all' && item.payment_method !== filters.paymentMethod) return false;
    if (filters.accountCode && item.invoice_number && !item.invoice_number.toLowerCase().includes(filters.accountCode.toLowerCase())) return false;

    // Search query
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const match =
        item.expense_number.toLowerCase().includes(q) ||
        (item.invoice_number && item.invoice_number.toLowerCase().includes(q)) ||
        (item.voucher_number && item.voucher_number.toLowerCase().includes(q)) ||
        item.paid_to.toLowerCase().includes(q) ||
        item.project_name.toLowerCase().includes(q) ||
        item.payment_description.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Check if direct nominal monthly budget plan exists in localStorage
  let monthlyPlan: MonthlyBudgetPlan | null = null;
  if (typeof window !== 'undefined') {
    try {
      const rawPlan = localStorage.getItem(`csl_monthly_budget_plan_${targetFiscalYear}`);
      if (rawPlan) {
        const p = JSON.parse(rawPlan);
        if (p && typeof p.monthlyNominal === 'number' && p.monthlyNominal > 0) {
          monthlyPlan = {
            fiscalYear: targetFiscalYear,
            mode: p.mode || 'flat',
            monthlyNominal: p.monthlyNominal,
            annualNominal: p.annualNominal || (p.monthlyNominal * 12),
            months: Array.isArray(p.months) && p.months.length === 12 ? p.months : Array(12).fill(p.monthlyNominal)
          };
        }
      }
    } catch {}
  }

  // 5. Calculate Budget for current selection & scale by period
  const relevantBudgets = budgetAllocations.filter(b => {
    if (b.fiscal_year !== targetFiscalYear) return false;
    if (filters.company && filters.company !== 'all' && b.company !== filters.company) return false;
    if (filters.department && filters.department !== 'all' && b.department !== filters.department) return false;
    if (filters.project && filters.project !== 'all' && b.project_name !== filters.project) return false;
    return true;
  });

  // Calculate month indices needed for scaling
  const allMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let displayMonthIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  if (filters.periodType === 'quarter' && filters.quarter) {
    if (filters.quarter === 'Q1') displayMonthIndices = [0, 1, 2];
    else if (filters.quarter === 'Q2') displayMonthIndices = [3, 4, 5];
    else if (filters.quarter === 'Q3') displayMonthIndices = [6, 7, 8];
    else if (filters.quarter === 'Q4') displayMonthIndices = [9, 10, 11];
  } else if (filters.periodType === 'month' && filters.month) {
    displayMonthIndices = [filters.month - 1];
  } else if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
    const startMo = new Date(filters.startDate).getMonth();
    const endMo = new Date(filters.endDate).getMonth();
    const indices: number[] = [];
    for (let i = startMo; i <= endMo; i++) indices.push(i);
    displayMonthIndices = indices.length > 0 ? indices : [startMo];
  }

  let totalBudget = relevantBudgets.reduce((sum, b) => sum + b.allocated_amount, 0);

  // If user configured a direct nominal monthly budget plan and is not filtering to a single project:
  if (monthlyPlan && (!filters.project || filters.project === 'all')) {
    totalBudget = displayMonthIndices.reduce((sum, idx) => sum + (monthlyPlan!.months[idx] ?? monthlyPlan!.monthlyNominal), 0);
  } else {
    // Scale budget appropriately based on period type
    if (filters.periodType === 'month') {
      totalBudget = Math.round(totalBudget / 12);
    } else if (filters.periodType === 'quarter') {
      totalBudget = Math.round(totalBudget / 4);
    } else if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
      const d1 = new Date(filters.startDate).getTime();
      const d2 = new Date(filters.endDate).getTime();
      const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      totalBudget = Math.round(totalBudget * (days / 365));
    }
  }

  // 5. KPI Overview Calculations
  const actualItems = filtered.filter(item => ACTUAL_STATUSES.includes(item.status));
  const pendingItems = filtered.filter(item => PENDING_STATUSES.includes(item.status));
  const exposureItems = filtered.filter(item => EXPOSURE_STATUSES.includes(item.status));

  const actualExpenses = actualItems.reduce((sum, i) => sum + i.reporting_amount, 0);
  const pendingApprovalCount = pendingItems.length;
  const pendingApprovalAmount = pendingItems.reduce((sum, i) => sum + i.reporting_amount, 0);
  const paymentExposure = exposureItems.reduce((sum, i) => sum + i.reporting_amount, 0);

  // If budget not explicitly allocated, baseline total budget safely
  if (totalBudget === 0 && actualExpenses > 0) {
    totalBudget = Math.round(actualExpenses * 1.22); // Estimated baseline
  }

  const budgetRemaining = Math.max(totalBudget - actualExpenses, 0);
  const budgetUtilization = totalBudget > 0 ? (actualExpenses / totalBudget) * 100 : 0;

  const summary: KpiSummary = {
    totalBudget,
    actualExpenses,
    budgetRemaining,
    budgetUtilization,
    pendingApprovalCount,
    pendingApprovalAmount,
    paymentExposure,
    isBudgetDefined: totalBudget > 0
  };

  // 6. Project Aggregation (Calculated for Expense by Project and Single-Month Budget vs Actual)
  const projectStats: Record<string, {
    company: string;
    department: string;
    actual: number;
    count: number;
  }> = {};

  filtered.forEach(item => {
    const p = item.project_name || 'General Operations';
    if (!projectStats[p]) {
      projectStats[p] = {
        company: item.company,
        department: item.department,
        actual: 0,
        count: 0
      };
    }
    if (ACTUAL_STATUSES.includes(item.status)) {
      projectStats[p].actual += item.reporting_amount;
    }
    projectStats[p].count += 1;
  });

  const budgetVarianceList: ProjectVariance[] = Object.entries(projectStats).map(([proj, data]) => {
    const alloc = budgetAllocations.find(b => b.project_name.toLowerCase() === proj.toLowerCase());
    const bgt = alloc ? alloc.allocated_amount : (data.actual > 0 ? Math.round(data.actual * 1.15) : 10_000_000);
    const variance = bgt - data.actual;
    const utilization = bgt > 0 ? (data.actual / bgt) * 100 : 0;
    
    let status: 'Healthy' | 'Warning' | 'Over Budget' = 'Healthy';
    if (utilization >= 100) status = 'Over Budget';
    else if (utilization >= 80) status = 'Warning';

    return {
      projectName: proj,
      company: data.company,
      department: data.department,
      budget: bgt,
      actual: data.actual,
      variance,
      utilization: Number(utilization.toFixed(1)),
      status,
      txnCount: data.count
    };
  }).sort((a, b) => b.actual - a.actual); // Sorted by highest actual expense first

  // 7. Budget vs Actual (Monthly time series if multi-month, or Grouped by Project if single month)
  const monthlyBudgetSlice = totalBudget > 0 ? totalBudget / displayMonthIndices.length : 0;

  const monthlyActualMap: Record<number, number> = {};
  filtered.forEach(item => {
    if (ACTUAL_STATUSES.includes(item.status)) {
      const m = new Date(item.request_date || item.created_at).getMonth();
      monthlyActualMap[m] = (monthlyActualMap[m] || 0) + item.reporting_amount;
    }
  });

  const yrShort = String(targetFiscalYear).slice(-2);

  let budgetVsActual: MonthlyComparison[] = [];

  if (displayMonthIndices.length === 1 && budgetVarianceList.length > 0) {
    // Single month selected: Group by Project as requested
    budgetVsActual = budgetVarianceList.map(proj => {
      // Monthly slice for this project's budget
      const projMonthlyBudget = Math.round(proj.budget / 12);
      const vr = projMonthlyBudget - proj.actual;
      const ut = projMonthlyBudget > 0 ? (proj.actual / projMonthlyBudget) * 100 : 0;
      return {
        periodKey: proj.projectName,
        periodLabel: proj.projectName,
        budget: projMonthlyBudget,
        actual: Math.round(proj.actual),
        variance: Math.round(vr),
        utilization: Number(ut.toFixed(1))
      };
    }).sort((a, b) => b.actual - a.actual);
  } else {
    // Multi-month period: Group by month (Jan - Dec)
    budgetVsActual = displayMonthIndices.map(idx => {
      const name = allMonthNames[idx];
      const act = monthlyActualMap[idx] || 0;
      const bgt = (filters.project && filters.project !== 'all')
        ? monthlyBudgetSlice
        : (monthlyPlan ? (monthlyPlan.months[idx] ?? monthlyPlan.monthlyNominal) : monthlyBudgetSlice);
      const vr = bgt - act;
      const ut = bgt > 0 ? (act / bgt) * 100 : 0;
      return {
        periodKey: `${name} '${yrShort}`,
        periodLabel: `${name} '${yrShort}`,
        budget: Math.round(bgt),
        actual: Math.round(act),
        variance: Math.round(vr),
        utilization: Number(ut.toFixed(1))
      };
    });
  }

  // 8. Expense Trend
  const expenseTrend: ExpenseTrendPoint[] = displayMonthIndices.map(idx => {
    const name = allMonthNames[idx];
    const key = `${name} '${yrShort}`;
    const act = monthlyActualMap[idx] || 0;
    const count = filtered.filter(i => {
      const m = new Date(i.request_date || i.created_at).getMonth();
      return m === idx;
    }).length;

    return {
      periodKey: key,
      periodLabel: key,
      amount: Math.round(act),
      transactionCount: count
    };
  });

  // 9. Expense by Category
  const catMap: Record<string, { amount: number; count: number }> = {};
  filtered.forEach(item => {
    const cat = item.category || 'General';
    if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
    catMap[cat].amount += item.reporting_amount;
    catMap[cat].count += 1;
  });

  const totalCatAmount = Object.values(catMap).reduce((s, c) => s + c.amount, 0) || 1;
  const expenseByCategory: CategoryBreakdown[] = Object.entries(catMap)
    .map(([cat, data]) => ({
      category: cat,
      amount: data.amount,
      percentage: Number(((data.amount / totalCatAmount) * 100).toFixed(1)),
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount);

  // 10. Payment Status Breakdown
  const statusMap: Record<string, { count: number; amount: number }> = {};
  filtered.forEach(item => {
    const st = item.status || 'PENDING_APPROVAL';
    if (!statusMap[st]) statusMap[st] = { count: 0, amount: 0 };
    statusMap[st].count += 1;
    statusMap[st].amount += item.reporting_amount;
  });

  const totalTxnAmt = filtered.reduce((s, i) => s + i.reporting_amount, 0) || 1;
  const statusMeta: Record<string, { label: string; color: string; badge: string }> = {
    DISBURSED: { label: 'Disbursed', color: '#10b981', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    PAID: { label: 'Paid', color: '#10b981', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    APPROVED: { label: 'Approved (Pending Disbursal)', color: '#3b82f6', badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    PENDING_APPROVAL: { label: 'Pending Approval', color: '#f59e0b', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    REJECTED: { label: 'Rejected', color: '#ef4444', badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
    DRAFT: { label: 'Draft', color: '#6b7280', badge: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' }
  };

  const paymentStatusList: PaymentStatusSummary[] = Object.entries(statusMap).map(([st, data]) => ({
    status: st,
    label: statusMeta[st]?.label || st,
    count: data.count,
    amount: data.amount,
    percentage: Number(((data.amount / totalTxnAmt) * 100).toFixed(1)),
    color: statusMeta[st]?.color || '#6366f1',
    badgeClass: statusMeta[st]?.badge || 'bg-muted text-foreground'
  })).sort((a, b) => b.amount - a.amount);

  // 11. Currency Exposure (Consolidated by original currency)
  const currMap: Record<string, { original: number; reporting: number; count: number; rates: number[] }> = {};
  filtered.forEach(item => {
    const c = item.currency || 'IDR';
    if (!currMap[c]) currMap[c] = { original: 0, reporting: 0, count: 0, rates: [] };
    currMap[c].original += item.amount;
    currMap[c].reporting += item.reporting_amount;
    currMap[c].count += 1;
    currMap[c].rates.push(item.exchange_rate);
  });

  const currencyExposureList: CurrencyExposureItem[] = Object.entries(currMap).map(([curr, data]) => ({
    currency: curr,
    symbol: getCurrencySymbol(curr),
    flagIcon: getCurrencyFlag(curr),
    originalAmount: data.original,
    reportingAmountIdr: data.reporting,
    transactionCount: data.count,
    latestRate: data.rates.length > 0 ? data.rates[0] : 1
  })).sort((a, b) => b.reportingAmountIdr - a.reportingAmountIdr);

  // 12. Needs Attention (Dynamic Operational Alerts)
  const attentionRequired: AttentionAlert[] = [];

  // A. Pending Approval
  if (pendingApprovalCount > 0) {
    attentionRequired.push({
      id: 'alert_pending_approval',
      type: 'warning',
      title: `${pendingApprovalCount} request${pendingApprovalCount > 1 ? 's' : ''} pending approval`,
      subtitle: `Awaiting manager review. Total: ${formatIdr(pendingApprovalAmount)}`,
      count: pendingApprovalCount,
      amount: pendingApprovalAmount,
      filterAction: { filterKey: 'status', filterValue: 'PENDING_APPROVAL' }
    });
  }

  // C. Approaching Budget Limit (80% - 99%)
  const warningProjects = budgetVarianceList.filter(p => p.status === 'Warning');
  if (warningProjects.length > 0) {
    attentionRequired.push({
      id: 'alert_near_limit',
      type: 'warning',
      title: `${warningProjects.length} project${warningProjects.length > 1 ? 's' : ''} above 80% utilization`,
      subtitle: `${warningProjects.map(p => `${p.projectName} (${p.utilization}%)`).slice(0, 3).join(', ')}`,
      count: warningProjects.length,
      filterAction: warningProjects.length === 1 ? { filterKey: 'project', filterValue: warningProjects[0].projectName } : undefined
    });
  }

  // D. Over Budget projects (>=100%)
  const overBudgetProjects = budgetVarianceList.filter(p => p.status === 'Over Budget');
  if (overBudgetProjects.length > 0) {
    const overAmt = overBudgetProjects.reduce((s, p) => s + Math.abs(p.variance), 0);
    const firstName = overBudgetProjects[0].projectName;
    attentionRequired.push({
      id: 'alert_over_budget',
      type: 'danger',
      title: overBudgetProjects.length === 1
        ? `Project ${firstName} exceeded budget`
        : `${overBudgetProjects.length} projects exceeded budget`,
      subtitle: `${overBudgetProjects[0].utilization}% utilized (${formatIdr(overAmt)} over budget)`,
      count: overBudgetProjects.length,
      amount: overAmt,
      filterAction: overBudgetProjects.length === 1 ? { filterKey: 'project', filterValue: firstName } : undefined
    });
  }

  // E. Foreign Currency Transactions
  const allForeignItems = filtered.filter(i => i.currency && i.currency !== 'IDR');
  if (allForeignItems.length > 0) {
    const currCodes = Array.from(new Set(allForeignItems.map(i => i.currency))).join(' / ');
    const foreignRepTotal = allForeignItems.reduce((s, i) => s + i.reporting_amount, 0);
    attentionRequired.push({
      id: 'alert_foreign_currency',
      type: 'info',
      title: `${allForeignItems.length} foreign currency transaction${allForeignItems.length > 1 ? 's' : ''}`,
      subtitle: `${currCodes} (Equivalent ≈ ${formatIdr(foreignRepTotal)})`,
      count: allForeignItems.length,
      amount: foreignRepTotal,
      filterAction: { filterKey: 'currency', filterValue: allForeignItems[0].currency }
    });
  }

  // 13. Top Expenses (Sorted descending by reporting amount)
  const topExpenses = [...filtered].sort((a, b) => b.reporting_amount - a.reporting_amount).slice(0, 10);

  return {
    summary,
    budgetVsActual,
    expenseTrend,
    expenseByCategory,
    paymentStatusList,
    budgetVarianceList,
    currencyExposureList,
    attentionRequired,
    topExpenses,
    transactions: filtered,
    totalTransactionsCount: filtered.length,
    lastUpdated: new Date().toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    periodLabel: activePeriodLabel,
    dateRange: { start: dateStart, end: dateEnd },
    filterOptions
  };
}

export interface MonthlyBudgetPlan {
  fiscalYear: number;
  mode: 'flat' | 'custom';
  monthlyNominal: number;
  annualNominal: number;
  months: number[]; // 12 numbers: index 0 = Jan, index 11 = Dec
}

/**
 * Gets the current monthly budget plan from localStorage (or generates a sensible default).
 */
export function getMonthlyBudgetPlan(fiscalYear: number, defaultMonthly?: number): MonthlyBudgetPlan {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`csl_monthly_budget_plan_${fiscalYear}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.monthlyNominal === 'number' && parsed.monthlyNominal > 0) {
          const mList = Array.isArray(parsed.months) && parsed.months.length === 12
            ? parsed.months
            : Array(12).fill(parsed.monthlyNominal);
          return {
            fiscalYear,
            mode: parsed.mode || 'flat',
            monthlyNominal: parsed.monthlyNominal,
            annualNominal: parsed.annualNominal || mList.reduce((s: number, n: number) => s + n, 0),
            months: mList
          };
        }
      }
    } catch {
      // fallback
    }
  }

  const defMonth = defaultMonthly && defaultMonthly > 0 ? defaultMonthly : 50_000_000;
  return {
    fiscalYear,
    mode: 'flat',
    monthlyNominal: defMonth,
    annualNominal: defMonth * 12,
    months: Array(12).fill(defMonth)
  };
}

/**
 * Saves the monthly budget plan for a fiscal year to localStorage.
 */
export async function saveMonthlyBudgetPlan(
  fiscalYear: number,
  plan: MonthlyBudgetPlan
): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`csl_monthly_budget_plan_${fiscalYear}`, JSON.stringify(plan));
  }
}

/**
 * Saves and updates project budget allocations for a specific fiscal year.
 * Persists to LocalStorage immediately and syncs with Supabase csl_budget_allocations if table is available.
 */
export async function saveProjectBudgetAllocations(
  fiscalYear: number,
  allocations: Array<{ project_name: string; allocated_amount: number; department?: string; company?: string }>
): Promise<void> {
  const sanitized = allocations
    .filter(a => a.project_name.trim().length > 0)
    .map(a => ({
      fiscal_year: fiscalYear,
      company: a.company || 'PT Determinan Indah',
      department: a.department || 'CSL',
      project_name: a.project_name.trim(),
      allocated_amount: Math.max(0, Number(a.allocated_amount) || 0),
      updated_at: new Date().toISOString()
    }));

  // 1. Save to LocalStorage for persistent client-side retrieval
  if (typeof window !== 'undefined') {
    localStorage.setItem(`csl_budget_allocations_${fiscalYear}`, JSON.stringify(sanitized));
  }

  // 2. Try saving to Supabase if table csl_budget_allocations exists
  try {
    const { error: delErr } = await supabase.from('csl_budget_allocations').delete().eq('fiscal_year', fiscalYear);
    if (!delErr && sanitized.length > 0) {
      await supabase.from('csl_budget_allocations').insert(sanitized);
    }
  } catch (err) {
    console.warn('Notice: csl_budget_allocations table sync skipped (using local persistence):', err);
  }
}


