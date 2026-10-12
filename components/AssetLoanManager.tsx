
import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Plus, Pencil, RefreshCcw, Trash2, Package, CheckCircle2, History,
    Download, FileSpreadsheet, ChevronLeft, ChevronRight, Clock, AlertCircle,
    XCircle, RotateCcw, User, Building2, Calendar, Phone, ArrowUpRight, X, ShieldCheck, FileText, MoreHorizontal
} from 'lucide-react';
import { ITAssetLoan, UserAccount, ITAsset } from '../types';
import { supabase } from '../lib/supabaseClient';
import { sendNotificationToAdmins } from '../utils/NotificationSystemUtils';
import { useLanguage } from '../translations';
import { StatCard } from './StatCard';
import { DangerConfirmModal } from './DangerConfirmModal';
import { LoanFormModal } from './LoanFormModal';
import { exportToExcel } from '../lib/excelExport';
import { exportHandoverBAST } from '../lib/handoverPdfExport';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoanRequestFormInline } from './LoanRequestFormInline';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AssetLoanManagerProps {
    currentUser: UserAccount | null;
}

export const AssetLoanManager: React.FC<AssetLoanManagerProps> = ({ currentUser }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [loans, setLoans] = useState<ITAssetLoan[]>([]);
    const [assets, setAssets] = useState<ITAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState<ITAssetLoan | null>(null);
    const [deleteLoan, setDeleteLoan] = useState<ITAssetLoan | null>(null);
    const [selectedLoan, setSelectedLoan] = useState<ITAssetLoan | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ loan: ITAssetLoan; type: 'approve' | 'reject' } | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [historyTab, setHistoryTab] = useState<string>('All');
    const [historyPage, setHistoryPage] = useState(1);
    const HISTORY_PER_PAGE = 5;

    const roleLower = (currentUser?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
    const isStaff = roleLower === 'staff';
    const canManage = isAdmin || isSuperAdmin || isStaff;

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchLoans = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('it_asset_loans')
                .select(`
          *,
          it_assets (
            item_name,
            asset_id,
            category,
            brand,
            serial_number
          )
        `)
                .order('id', { ascending: false });

            // If not admin/staff, only show own requests
            if (!canManage && currentUser) {
                query = query.eq('borrower_name', currentUser.fullName);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                setLoans(data.map((item: any) => ({
                    id: item.id,
                    loanId: item.loan_id,
                    assetId: item.asset_id,
                    assetName: item.it_assets?.item_name || 'Requested Asset',
                    assetTag: item.it_assets?.asset_id || 'PENDING',
                    borrowerName: item.borrower_name,
                    borrowerDept: item.borrower_dept,
                    borrowerPhone: item.borrower_phone,
                    borrowerEmail: item.borrower_email,
                    loanDate: item.loan_date,
                    expectedReturnDate: item.expected_return_date,
                    actualReturnDate: item.actual_return_date,
                    status: item.status,
                    remarks: item.remarks,
                    itPersonnel: item.it_personnel,
                    assetCategory: item.it_assets?.category || '-',
                    assetBrand: item.it_assets?.brand || '-',
                    assetSerial: item.it_assets?.serial_number || '-'
                })));
            }
        } catch (error) {
            console.error('Error fetching loans:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAssets = async () => {
        const { data } = await supabase
            .from('it_assets')
            .select('*')
            .eq('status', 'Idle')
            .in('category', ['IT Asset', 'Laptop', 'Other', 'Storage', 'Peripherals', 'Printer', 'Monitor']);
        if (data) {
            setAssets(data.map((item: any) => ({
                id: item.id,
                assetId: item.asset_id,
                item: item.item_name,
                category: item.category,
                status: item.status,
                location: item.location,
                company: item.company
            } as ITAsset)));
        }
    };

    useEffect(() => {
        fetchLoans();
        fetchAssets();
    }, []);

    const filteredLoans = useMemo(() => loans.filter(loan => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            loan.borrowerName.toLowerCase().includes(searchLower) ||
            loan.assetName.toLowerCase().includes(searchLower) ||
            loan.loanId.toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === 'All' ? true : loan.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [loans, searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
    const paginatedLoans = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLoans.slice(start, start + itemsPerPage);
    }, [filteredLoans, currentPage]);

    const getStatusDisplay = (status: string, compact: boolean = false) => {
        const baseClass = cn(
            "flex items-center gap-1.5 font-medium text-xs transition-colors rounded-full border",
            compact ? "px-2 py-0.5" : "px-3 py-1"
        );

        switch (status) {
            case 'Pending':
                return (
                    <div className={cn(baseClass, "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50")}>
                        <Clock size={compact ? 10 : 12} /> {compact ? t('statusPending') : 'Pending Approval'}
                    </div>
                );
            case 'Active':
                return (
                    <div className={cn(baseClass, "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50")}>
                        <ArrowUpRight size={compact ? 10 : 12} /> {compact ? t('statusActive') : 'On Loan'}
                    </div>
                );
            case 'Returned':
                return (
                    <div className={cn(baseClass, "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50")}>
                        <CheckCircle2 size={compact ? 10 : 12} /> {compact ? t('statusReturned') : 'Returned'}
                    </div>
                );
            case 'Overdue':
                return (
                    <div className={cn(baseClass, "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50")}>
                        <AlertCircle size={compact ? 10 : 12} /> {compact ? t('statusOverdue') : 'Overdue'}
                    </div>
                );
            case 'Rejected':
                return (
                    <div className={cn(baseClass, "bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400")}>
                        <XCircle size={compact ? 10 : 12} /> {compact ? t('statusRejected') : (canManage ? 'Rejected' : 'Request Rejected')}
                    </div>
                );
            default:
                return <Badge variant="outline" className="text-xs">{status}</Badge>;
        }
    };

    const handleExportExcel = () => {
        if (filteredLoans.length === 0) return;

        const dataToExport = filteredLoans.map(l => ({
            "Loan ID": l.loanId,
            "Asset Name": l.assetName,
            "Asset Tag": l.assetTag,
            "Borrower": l.borrowerName,
            "Department": l.borrowerDept,
            "Phone": l.borrowerPhone || "-",
            "Loan Date": l.loanDate || "-",
            "Expected Return": l.expectedReturnDate || "-",
            "Actual Return": l.actualReturnDate || "-",
            "Status": l.status,
            "IT Personnel": l.itPersonnel,
            "Remarks": l.remarks || ""
        }));

        exportToExcel(dataToExport, `GESIT-LOANS-${new Date().toISOString().split('T')[0]}`);
    };

    const handleReturnAsset = async (loan: ITAssetLoan) => {
        try {
            const now = new Date().toISOString();
            const { error: loanError } = await supabase
                .from('it_asset_loans')
                .update({
                    status: 'Returned',
                    actual_return_date: now
                })
                .eq('id', loan.id);

            if (loanError) throw loanError;

            if (loan.assetId) {
                const { error: assetError } = await supabase
                    .from('it_assets')
                    .update({
                        status: 'Idle',
                        user_assigned: null,
                    })
                    .eq('id', loan.assetId);

                if (assetError) throw assetError;
            }

            await fetchLoans();
            await fetchAssets();
        } catch (err) {
            console.error('Error returning asset:', err);
        }
    };

    const handleApproveRequest = async (loan: ITAssetLoan) => {
        try {
            // Directly approve: set status to Active and assign IT personnel
            const { error: loanError } = await supabase
                .from('it_asset_loans')
                .update({
                    status: 'Active',
                    it_personnel: currentUser?.fullName || 'IT Support'
                })
                .eq('id', loan.id);

            if (loanError) throw loanError;

            // If the loan has an asset linked, mark it as Used
            if (loan.assetId) {
                const { error: assetError } = await supabase
                    .from('it_assets')
                    .update({
                        status: 'Used',
                        user_assigned: loan.borrowerName,
                        department: loan.borrowerDept
                    })
                    .eq('id', loan.assetId);

                if (assetError) throw assetError;
            }

            await fetchLoans();
            await fetchAssets();
        } catch (err) {
            console.error('Error approving loan:', err);
        }
    };

    const handleRejectRequest = async (loan: ITAssetLoan) => {
        try {
            const { error } = await supabase
                .from('it_asset_loans')
                .update({ status: 'Rejected', it_personnel: currentUser?.fullName || 'IT Support' })
                .eq('id', loan.id);
            if (error) throw error;
            await fetchLoans();
        } catch (err) {
            console.error('Error rejecting loan:', err);
        }
    };

    return (
        <div className="w-full min-h-screen bg-transparent py-4 sm:py-6 px-0 sm:px-4 space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="no-print space-y-6">
                <PageHeader
                    title={t('assetLoan')}
                    description={canManage ? t('assetLoanDescriptionAdmin') : t('assetLoanDescriptionUser')}
                >
                    <div className="flex items-center gap-2">
                        {canManage && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportExcel}
                                className="h-9 px-3 shrink-0"
                                title="Export Excel"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 sm:mr-2" />
                                <span className="hidden sm:inline">Export Excel</span>
                            </Button>
                        )}
                        {canManage && (
                            <Button 
                                size="sm"
                                onClick={() => { setEditingLoan(null); setIsModalOpen(true); }} 
                                className="h-9 px-3 shrink-0 flex items-center gap-1.5"
                            >
                                <Plus size={14} /> New Record
                            </Button>
                        )}
                    </div>
                </PageHeader>

                {canManage && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label={t('pendingRequests')}
                            value={loans.filter(l => l.status === 'Pending').length}
                            subValue={t('needsApproval')}
                            icon={Clock}
                            color="amber"
                        />
                        <StatCard label={t('activeLoans')} value={loans.filter(l => l.status === 'Active').length} subValue={t('currentlyBorrowed')} icon={ArrowUpRight} color="blue" />
                        <StatCard label={t('overdueLabel')} value={loans.filter(l => l.status === 'Overdue').length} subValue={t('pastDueDate')} icon={AlertCircle} color="rose" />
                        <StatCard label={t('returnedTotal')} value={loans.filter(l => l.status === 'Returned').length} subValue={t('lifetimeCompletions')} icon={CheckCircle2} color="emerald" />
                    </div>
                )}

                {/* Filters Section */}
                <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-all">
                    <div className="relative flex-1 w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={t('searchAssetsPlaceholder')}
                            className="w-full pl-11 bg-muted/20 border-muted-foreground/10 focus-visible:ring-1 focus-visible:ring-primary h-10 text-xs rounded-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                        <select 
                            className="flex-1 md:w-[150px] h-10 px-3 bg-background border border-muted-foreground/10 focus-visible:ring-1 rounded-xl text-sm text-muted-foreground focus:outline-none" 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="All">{t('allStatus')}</option>
                            <option value="Pending">{t('statusPending')}</option>
                            <option value="Active">{t('statusActive')}</option>
                            <option value="Returned">{t('statusReturned')}</option>
                            <option value="Overdue">{t('statusOverdue')}</option>
                        </select>
                        <Button 
                            variant="outline"
                            size="icon"
                            onClick={fetchLoans} 
                            className="h-10 w-10 text-muted-foreground hover:text-primary border-muted-foreground/10 shrink-0 rounded-xl"
                            title="Refresh"
                        >
                            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </div>

                <div className={cn(
                    canManage ? "bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col" : "",
                    canManage && "md:max-h-[calc(100vh-340px)] md:min-h-[400px]"
                )}>
                    {canManage ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/20 text-foreground/80 font-medium text-xs border-b border-border/60">
                                            <th className="px-6 py-3">{t('itemDetails')}</th>
                                            <th className="px-6 py-3">{t('borrower')}</th>
                                            <th className="px-6 py-3 text-center">{t('dates')}</th>
                                            <th className="px-6 py-3 text-center">{t('status')}</th>
                                            <th className="px-6 py-3 text-center">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="px-6 py-20 text-center"><RefreshCcw className="animate-spin text-blue-500 mx-auto" size={24} /></td></tr>
                                        ) : paginatedLoans.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-20 text-center text-sm text-muted-foreground">{t('noRecordsFound')}</td></tr>
                                        ) : paginatedLoans.map((loan) => (
                                            <tr key={loan.id} className="group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground text-sm">{loan.assetName}</span>
                                                        <span className="text-xs font-medium text-primary mt-1 font-mono">{loan.loanId} • {loan.assetTag}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                                                            <User size={12} className="text-muted-foreground" /> {loan.borrowerName}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                            <Building2 size={10} /> {loan.borrowerDept}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                                            <Calendar size={12} className="text-muted-foreground" /> {new Date(loan.loanDate).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                                            <Clock size={12} className="text-slate-400" /> Due: {new Date(loan.expectedReturnDate).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {getStatusDisplay(loan.status)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-0">
                                                        {/* Primary action buttons - compact icon-only */}
                                                        {loan.status === 'Pending' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setConfirmAction({ loan, type: 'approve' })}
                                                                    title="Approve"
                                                                    className="w-8"
                                                                >
                                                                    <CheckCircle2 size={16} />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setConfirmAction({ loan, type: 'reject' })}
                                                                    title="Reject"
                                                                    className="w-8"
                                                                >
                                                                    <XCircle size={16} />
                                                                </Button>
                                                            </>
                                                        )}

                                                        {loan.status === 'Active' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleReturnAsset(loan)}
                                                                title="Mark Returned"
                                                                className="w-8"
                                                            >
                                                                <RotateCcw size={16} />
                                                            </Button>
                                                        )}

                                                        {/* Secondary actions - dropdown */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger render={
                                                                <Button variant="ghost" className="w-8">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            } />
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => { setSelectedLoan(loan); }}><FileText className="mr-2 h-4 w-4" /><span>View Receipt</span></DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => { exportHandoverBAST(loan); }} className="text-blue-600 dark:text-blue-400 font-bold focus:text-blue-700 dark:focus:text-blue-300">
                                                                    <FileText className="mr-2 h-4 w-4 text-blue-500" />
                                                                    <span>Cetak BAST (PDF)</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => { setEditingLoan(loan); setIsModalOpen(true); }}><Pencil className="mr-2 h-4 w-4" /><span>Edit Record</span></DropdownMenuItem>
                                                                 {(isAdmin || isSuperAdmin) && (
                                                                     <>
                                                                         <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={() => { setDeleteLoan(loan); }} className="text-rose-500 focus:text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-950/20"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/40">
                                {isLoading ? (
                                    <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                                        <RefreshCcw className="animate-spin text-blue-500" size={24} />
                                        <p className="text-sm text-muted-foreground">{t('loading')}...</p>
                                    </div>
                                ) : paginatedLoans.length === 0 ? (
                                    <div className="p-12 text-center text-sm text-muted-foreground">{t('noRecordsFound')}</div>
                                ) : paginatedLoans.map((loan) => (
                                    <div 
                                        key={loan.id} 
                                        onClick={() => setSelectedLoan(loan)}
                                        className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {loan.assetCategory} {loan.assetBrand && loan.assetBrand !== '-' ? `· ${loan.assetBrand}` : ''}
                                            </span>
                                            <div>
                                                {getStatusDisplay(loan.status)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border flex items-center justify-center overflow-hidden shrink-0 border-dashed">
                                                <Package size={18} className="text-slate-400 opacity-50" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="font-semibold text-sm text-foreground block truncate">{loan.assetName}</span>
                                                <span className="text-xs font-medium text-primary mt-1 block font-mono">{loan.loanId} · {loan.assetTag}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-zinc-800/20 text-[11px]">
                                            <div>
                                                <span className="text-xs block font-medium text-muted-foreground leading-none">{t('borrower')}</span>
                                                <span className="font-medium text-foreground block truncate mt-0.5">{loan.borrowerName}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs block font-medium text-muted-foreground leading-none">{t('department')}</span>
                                                <span className="font-medium text-foreground block truncate mt-0.5">{loan.borrowerDept}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-zinc-800/20">
                                            <div className="flex flex-col text-xs text-muted-foreground leading-tight">
                                                <span>Loan: {new Date(loan.loanDate).toLocaleDateString()}</span>
                                                <span className="text-rose-500/80 dark:text-rose-400/80 mt-0.5">Due: {new Date(loan.expectedReturnDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                {loan.status === 'Pending' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setConfirmAction({ loan, type: 'approve' })}
                                                            title="Approve"
                                                            className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20"
                                                        >
                                                            <CheckCircle2 size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setConfirmAction({ loan, type: 'reject' })}
                                                            title="Reject"
                                                            className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/20"
                                                        >
                                                            <XCircle size={16} />
                                                        </Button>
                                                    </>
                                                )}

                                                {loan.status === 'Active' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleReturnAsset(loan)}
                                                        title="Mark Returned"
                                                        className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedLoan(loan)}
                                                    className="w-8 h-8 text-slate-500 hover:text-indigo-600"
                                                    title="View Receipt"
                                                >
                                                    <FileText size={16} />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => exportHandoverBAST(loan)}
                                                    className="w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                                                    title="Cetak BAST (PDF)"
                                                >
                                                    <FileText size={16} className="text-blue-600" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setEditingLoan(loan); setIsModalOpen(true); }}
                                                    className="w-8 h-8 text-slate-500 hover:text-amber-600"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </Button>

                                                 {(isAdmin || isSuperAdmin) && (
                                                     <Button
                                                         variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteLoan(loan)}
                                                        className="w-8 h-8 text-slate-500 hover:text-rose-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-220px)] lg:overflow-hidden">
                            {/* LEFT COLUMN: THE FORM */}
                            <div className="lg:col-span-8 lg:overflow-y-auto custom-scrollbar lg:pr-2">
                                <Card className="border-0 shadow-none bg-transparent">
                                    <LoanRequestFormInline
                                        currentUser={currentUser}
                                        availableAssets={assets}
                                        onSuccess={fetchLoans}
                                    />
                                </Card>
                            </div>

                            {/* RIGHT COLUMN: COMPACT HISTORY */}
                            <div className="lg:col-span-4 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-zinc-800 pt-6 lg:pt-0 lg:pl-5">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {t('myRequestsHistory')}
                                    </h3>
                                    <span className="text-xs font-medium text-muted-foreground">{filteredLoans.length} records</span>
                                </div>

                                {/* Status Filter Tabs — Standardized underlined style */}
                                <Tabs value={historyTab} onValueChange={(val) => { setHistoryTab(val); setHistoryPage(1); }} className="shrink-0 mb-3">
                                    <TabsList>
                                        {(['All', 'Pending', 'Active', 'Returned'] as const).map((tab) => {
                                            const count = tab === 'All'
                                                ? filteredLoans.length
                                                : filteredLoans.filter(l => l.status === tab).length;
                                            return (
                                                <TabsTrigger
                                                    key={tab}
                                                    value={tab}
                                                >
                                                    {tab}
                                                    {count > 0 && (
                                                        <span className="ml-1 opacity-50">{count}</span>
                                                    )}
                                                </TabsTrigger>
                                            );
                                        })}
                                    </TabsList>
                                </Tabs>

                                {/* Scrollable filtered list */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                    {isLoading ? (
                                        <div className="py-20 text-center flex flex-col items-center gap-3">
                                            <RefreshCcw className="animate-spin text-primary/40" size={24} />
<p className="text-sm text-muted-foreground">{t('loading')}...</p>
                                        </div>
                                    ) : (() => {
                                        const displayLoans = historyTab === 'All'
                                            ? filteredLoans
                                            : filteredLoans.filter(l => l.status === historyTab);
                                        const totalHistoryPages = Math.ceil(displayLoans.length / HISTORY_PER_PAGE);
                                        const safePage = Math.min(historyPage, Math.max(1, totalHistoryPages));
                                        const pagedLoans = displayLoans.slice((safePage - 1) * HISTORY_PER_PAGE, safePage * HISTORY_PER_PAGE);

                                        if (displayLoans.length === 0) {
                                            return (
                                                <div className="py-16 text-center flex flex-col items-center gap-3">
                                                    <Package size={28} className="text-slate-200 dark:text-slate-800" />
                                                    <p className="text-sm text-muted-foreground">
                                                        {historyTab === 'All' ? t('noHistoryFound') : `No ${historyTab} requests`}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                {pagedLoans.map((loan) => {
                                                    const statusDot =
                                                        loan.status === 'Active' ? 'bg-blue-400' :
                                                            loan.status === 'Pending' ? 'bg-amber-400' :
                                                                loan.status === 'Returned' ? 'bg-emerald-500' :
                                                                    loan.status === 'Overdue' ? 'bg-rose-500' :
                                                                        'bg-slate-300';
                                                    return (
                                                        <button
                                                            key={loan.id}
                                                            onClick={() => setSelectedLoan(loan)}
                                                            className={cn(
                                                                "w-full text-left group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors",
                                                                selectedLoan?.id === loan.id && "bg-slate-50 dark:bg-zinc-800/60"
                                                            )}
                                                        >
                                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot)} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="text-xs font-medium text-foreground truncate">
                                                                        {loan.assetName}
                                                                    </p>
                                                                    <div className="shrink-0 scale-[0.78] origin-right">
                                                                        {getStatusDisplay(loan.status, true)}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-0.5">
                                                                    <span className="text-xs text-muted-foreground font-mono">
                                                                        {loan.loanId}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <Calendar size={8} />
                                                                        {format(new Date(loan.loanDate), 'dd MMM yy')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}

                                                {/* Pagination */}
                                                {totalHistoryPages > 1 && (
                                                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100 dark:border-zinc-800">
                                                        <span className="text-[10px] text-slate-400">
                                                            {safePage} / {totalHistoryPages}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                                                disabled={safePage === 1}
                                                                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                                                            >
                                                                 <ChevronLeft size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                                                disabled={safePage === totalHistoryPages}
                                                                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                                                            >
                                                                <ChevronRight size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="px-6 py-4 bg-slate-50/30 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs font-medium text-muted-foreground text-center sm:text-left">Page {currentPage} of {totalPages || 1} ({filteredLoans.length} loans)</p>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline"
                                size="icon"
                                disabled={currentPage === 1} 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                className="w-8 h-8 text-muted-foreground hover:text-primary transition-colors rounded-lg"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button 
                                variant="outline"
                                size="icon"
                                disabled={currentPage === totalPages || totalPages === 0} 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                className="w-8 h-8 text-muted-foreground hover:text-primary transition-colors rounded-lg"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                </div>

                <LoanFormModal
                    isOpen={isModalOpen}
                    currentUser={currentUser}
                    onClose={() => { setIsModalOpen(false); setEditingLoan(null); }}
                    onSubmit={async (formData) => {
                        try {
                            const payload = {
                                loan_id: formData.loanId || `LOAN-${Date.now().toString().substring(7)}`,
                                asset_id: formData.assetId || null,
                                borrower_name: formData.borrowerName,
                                borrower_dept: formData.borrowerDept,
                                borrower_phone: formData.borrowerPhone,
                                loan_date: formData.loanDate,
                                expected_return_date: formData.expectedReturnDate,
                                status: formData.status,
                                remarks: formData.remarks,
                                it_personnel: currentUser?.fullName || 'IT Support'
                            };

                            if (editingLoan) {
                                await supabase.from('it_asset_loans').update(payload).eq('id', editingLoan.id);
                                // Update asset as well even if editing
                                if (formData.assetId) {
                                    await supabase.from('it_assets').update({
                                        status: formData.status === 'Active' ? 'Used' : 'Idle',
                                        user_assigned: formData.status === 'Active' ? formData.borrowerName : null,
                                        department: formData.borrowerDept
                                    }).eq('id', formData.assetId);
                                }
                            } else {
                                // If user is requesting, status is Pending
                                // If admin is creating, status is Active (usually)
                                if (formData.assetId && formData.status === 'Active') {
                                    await supabase.from('it_assets').update({
                                        status: 'Used',
                                        user_assigned: formData.borrowerName,
                                        department: formData.borrowerDept
                                    }).eq('id', formData.assetId);
                                }
                                await supabase.from('it_asset_loans').insert([payload]);
                                
                                // Notify admins if this was a new request (usually Pending status)
                                if (payload.status === 'Pending') {
                                    await sendNotificationToAdmins(
                                        'New Asset Loan Request',
                                        `A new loan request from ${payload.borrower_name} is waiting for approval.`,
                                        'Info',
                                        'asset-loan'
                                    );
                                }
                            }

                            setIsModalOpen(false);
                            setEditingLoan(null);
                            await fetchLoans();
                            await fetchAssets();
                        } catch (err) {
                            console.error('Error saving loan:', err);
                        }
                    }}
                    initialData={editingLoan}
                    availableAssets={assets}
                />

                <DangerConfirmModal
                    isOpen={!!deleteLoan}
                    onClose={() => setDeleteLoan(null)}
                    onConfirm={async () => {
                        if (!deleteLoan) return;
                        await supabase.from('it_asset_loans').delete().eq('id', deleteLoan.id);
                        setDeleteLoan(null);
                        await fetchLoans();
                    }}
                    title="Delete Record"
                    message={`Remove loan record for "${deleteLoan?.assetName}"?`}
                />

                {/* Approve / Reject Confirmation Modal */}
                {
                    confirmAction && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150">
                            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-150">
                                <div className="p-6">
                                    {/* Title row */}
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${confirmAction.type === 'approve' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'}`}>
                                            {confirmAction.type === 'approve' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {confirmAction.type === 'approve' ? 'Approve this request?' : 'Reject this request?'}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 ml-9 mb-5">
                                        {confirmAction.type === 'approve'
                                            ? 'Status will change to Active and the asset will be marked as in use.'
                                            : 'This request will be permanently rejected.'}
                                    </p>

                                    {/* Info rows */}
                                    <div className="border border-slate-100 dark:border-zinc-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 mb-5 text-xs">
                                        <div className="flex justify-between items-center px-3 py-2">
                                            <span className="text-slate-400 font-medium">Asset</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200 text-right ml-4 truncate max-w-[180px]">{confirmAction.loan.assetName}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-3 py-2">
                                            <span className="text-slate-400 font-medium">Borrower</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{confirmAction.loan.borrowerName}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-3 py-2">
                                            <span className="text-slate-400 font-medium">Department</span>
                                            <span className="font-medium text-slate-600 dark:text-zinc-400">{confirmAction.loan.borrowerDept}</span>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setConfirmAction(null)}
                                            disabled={isConfirming}
                                            className="flex-1 h-9 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setIsConfirming(true);
                                                try {
                                                    if (confirmAction.type === 'approve') {
                                                        await handleApproveRequest(confirmAction.loan);
                                                    } else {
                                                        await handleRejectRequest(confirmAction.loan);
                                                    }
                                                    setConfirmAction(null);
                                                } finally {
                                                    setIsConfirming(false);
                                                }
                                            }}
                                            disabled={isConfirming}
                                            className={`flex-1 h-9 rounded-lg text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 ${confirmAction.type === 'approve'
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                        >
                                            {isConfirming ? (
                                                <RefreshCcw size={12} className="animate-spin" />
                                            ) : (
                                                confirmAction.type === 'approve' ? 'Approve' : 'Reject'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* LOAN RECEIPT / INVOICE MODAL */}
            {
                selectedLoan && (
                    <div id="loan-print-area" className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print-container custom-scrollbar" onClick={() => setSelectedLoan(null)}>
                        <div className="bg-slate-100 dark:bg-zinc-950 w-full max-w-2xl rounded-xl sm:rounded-xl shadow-2xl border border-white/20 relative animate-in zoom-in-95 duration-300 receipt-sheet my-auto" onClick={e => e.stopPropagation()}>
                            <div className="mx-2 sm:mx-6 my-4 sm:my-10 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 relative overflow-hidden">
                                <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-2 bg-blue-600 rounded-lg"><Package size={20} className="text-white" /></div>
                                            <span className="font-black text-slate-900 dark:text-white tracking-tighter text-lg">GESIT CORE</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('loanReceiptTitle')}</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Transaction Registry: <span className="text-blue-600">{selectedLoan.loanId}</span></p>
                                    </div>
                                    <button onClick={() => setSelectedLoan(null)} className="p-2 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors no-print"><X size={20} /></button>
                                </div>
                                <div className="p-6 sm:p-10 space-y-8 sm:space-y-10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
                                        <div className="space-y-8">
                                            <section>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 border-l-2 border-blue-600 pl-3">{t('itemDetails')}</h4>
                                                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight break-words">{selectedLoan.assetName}</p>
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded text-[9px] font-black text-slate-500 font-mono tracking-widest uppercase">{selectedLoan.assetTag || 'NO-TAG'}</span>
                                            </section>
                                            <section>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 border-l-2 border-blue-600 pl-3">{t('dates')}</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('loanDate')}</p>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{format(new Date(selectedLoan.loanDate), 'MMM dd, yyyy')}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('expectedReturn')}</p>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{format(new Date(selectedLoan.expectedReturnDate), 'MMM dd, yyyy')}</p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                        <div className="space-y-8">
                                            <section>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 border-l-2 border-blue-600 pl-3">{t('borrower')}</h4>
                                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600"><User size={20} /></div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{selectedLoan.borrowerName}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedLoan.borrowerDept}</p>
                                                    </div>
                                                </div>
                                            </section>
                                            <section>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 border-l-2 border-blue-600 pl-3">{t('status')}</h4>
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-sm gap-3">
                                                    {getStatusDisplay(selectedLoan.status)}
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/40 animate-pulse w-fit">
                                                        <ShieldCheck size={12} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">VERIFIED</span>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                    <div className="pt-8 border-t border-slate-50 dark:border-zinc-800">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-20">
                                            <div className="text-center">
                                                <div className="px-5">
                                                    <div className="h-[1px] bg-slate-200 dark:bg-zinc-800 w-full mb-3"></div>
                                                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tighter">{selectedLoan.borrowerName}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('borrower')}</p>
                                                </div>
                                            </div>
                                            <div className="text-center relative">
                                                <div className="px-5">
                                                    <div className="h-[1px] bg-slate-200 dark:bg-zinc-800 w-full mb-3"></div>
                                                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase leading-tight tracking-tighter">{(selectedLoan.itPersonnel || 'ADMIN SYSTEM').toUpperCase()}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('authorizedBy')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 text-center">
                                        <p className="text-[9px] font-medium text-slate-400 max-w-sm mx-auto leading-relaxed italic">{t('receiptNote')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-10 pb-10 flex flex-wrap items-center justify-center gap-4 no-print">
                                <Button onClick={() => window.print()} variant="outline" className="flex-1 min-w-[140px] max-w-[200px] h-14 flex items-center justify-center gap-3 rounded-xl">
                                    <div className="p-2 bg-muted rounded-lg"><Download size={14} /></div>
                                    {t('printReceipt')}
                                </Button>
                                <Button onClick={() => exportHandoverBAST(selectedLoan)} className="flex-1 min-w-[140px] max-w-[200px] h-14 flex items-center justify-center gap-3 rounded-xl">
                                    <div className="p-2 bg-primary/20 rounded-lg"><FileText size={14} /></div>
                                    Cetak BAST
                                </Button>
                                <Button onClick={() => setSelectedLoan(null)} variant="ghost" className="flex-1 min-w-[140px] max-w-[200px] h-14 rounded-xl font-semibold">
                                    {t('closeReceipt')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
