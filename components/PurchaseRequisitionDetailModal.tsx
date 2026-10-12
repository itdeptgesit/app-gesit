import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Download, ShieldCheck, Clock, FileText, CheckCircle2, AlertTriangle, User, HelpCircle, DollarSign, Calculator, History, ArrowDownCircle } from 'lucide-react';
import { PurchaseRequisition, UserAccount } from '../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { exportPurchaseRequisitionPDF } from '../lib/prPdfExport';
import { exportExpenseApprovalPDF } from '../lib/financeFormPdfExport';
import { FinanceFormExportModal } from './FinanceFormExportModal';
import { ExpenseApprovalExportModal } from './ExpenseApprovalExportModal';
import { useToast } from './ToastProvider';
import { supabase } from '../lib/supabaseClient';

interface PurchaseRequisitionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    requisition: PurchaseRequisition | null;
    currentUser: UserAccount | null;
    onApprove?: (req: PurchaseRequisition) => void;
    onReject?: (req: PurchaseRequisition) => void;
    usdRate?: number;
    onUpdate?: () => void;
}

export const PurchaseRequisitionDetailModal: React.FC<PurchaseRequisitionDetailModalProps> = ({
    isOpen,
    onClose,
    requisition,
    currentUser,
    onApprove,
    onReject,
    usdRate = 16300,
    onUpdate
}) => {
    const { showToast } = useToast();
    const [financeModalType, setFinanceModalType] = useState<'cash_advance' | 'payment_requisition' | null>(null);
    const [showExpenseApproval, setShowExpenseApproval] = useState(false);
    const [expenseHistory, setExpenseHistory] = useState<any[]>([]);

    const parseSettlementFromNotes = (notes?: string) => {
        if (!notes) return null;
        const match = notes.match(/\[Expense Approval Settled:\s*CA Rp\s*([\d.,]+),\s*Aktual Rp\s*([\d.,]+),\s*Kembali Rp\s*([\d.,]+)\]/i);
        if (!match) return null;
        const parseNum = (str: string) => {
            const clean = str.replace(/\./g, '').replace(/,/g, '.');
            return parseFloat(clean) || 0;
        };
        return {
            caAmount: parseNum(match[1]),
            actualAmount: parseNum(match[2]),
            refundAmount: parseNum(match[3]),
        };
    };

    const getAbbreviation = (name: string): string => {
        return name.split(/\s+/).map(w => w[0]).join('').toUpperCase();
    };

    const loadExpenseHistory = async () => {
        if (!requisition) return;

        // 1. From Supabase expense_approvals (PRIMARY)
        try {
            const { data } = await supabase
                .from('expense_approvals')
                .select('*')
                .eq('requisition_id', requisition.id)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                const mapped = data.map(row => ({
                    id: row.id,
                    requisitionId: row.requisition_id,
                    companyName: row.company_name || requisition.company || 'GESIT ALUMAS',
                    costCenter: row.cost_center || (requisition.company ? getAbbreviation(requisition.company) : 'GA'),
                    projectName: row.project_name || '',
                    cekBgNo: row.cek_bg_no || '',
                    bankName: row.bank_name || '',
                    paymentMethod: (row.payment_method as 'Cash' | 'Transfer') || 'Transfer',
                    transferTo: row.transfer_to || '',
                    paidTo: row.paid_to || '',
                    requestDate: row.request_date || '',
                    cashAdvanceAmount: Number(row.cash_advance_amount || 0),
                    actualExpense: Number(row.actual_expense || 0),
                    refundAmount: Number(row.refund_amount || 0),
                    note: row.note || '',
                    exportedAt: row.exported_at || row.created_at || '',
                    exportedBy: row.exported_by || '',
                }));
                setExpenseHistory(mapped);
                return;
            }
        } catch (err) {
            console.error("Error loading from expense_approvals:", err);
        }

        const list: any[] = [];

        // 2. From local cache
        try {
            const cached = localStorage.getItem(`gesit_ea_history_${requisition.id}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    list.push(...parsed);
                }
            }
        } catch (e) {
            console.warn("Failed reading local history:", e);
        }

        // 3. From Supabase activity_logs
        try {
            const cleanPrId = `PR-${String(requisition.id).padStart(4, '0')}`;
            const { data } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('category', 'Procurement')
                .or(`activity_name.ilike.%${cleanPrId}%,remarks.ilike.%${cleanPrId}%`)
                .order('id', { ascending: false });

            if (data) {
                for (const log of data) {
                    if (log.activity_name?.includes('Expense Approval') || log.remarks?.includes('Penyelesaian Cash Advance')) {
                        try {
                            if (log.remarks && log.remarks.startsWith('{')) {
                                const parsedObj = JSON.parse(log.remarks);
                                if (!list.some(h => h.exportedAt === parsedObj.exportedAt)) {
                                    list.push({ ...parsedObj, id: log.id });
                                }
                            }
                        } catch {
                            // non-JSON
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error loading activity log history:", err);
        }

        // 4. Fallback: If no activity log or local storage, parse from requisition notes
        if (list.length === 0) {
            const fromNote = parseSettlementFromNotes(requisition.notes);
            if (fromNote) {
                const targetCompany = requisition.company || 'GESIT ALUMAS';
                const reqDesc = (requisition.requestedItems || []).map(i => i.description).filter(Boolean).join(', ');
                const itDesc = (requisition.itRecommendations || []).map(i => i.description).filter(Boolean).join(', ');
                list.push({
                    id: `settled-${requisition.id}`,
                    exportedAt: (requisition as any).updatedAt || requisition.requestDate || new Date().toISOString(),
                    companyName: targetCompany,
                    costCenter: getAbbreviation(targetCompany),
                    projectName: reqDesc || itDesc || requisition.requesterFullname,
                    paidTo: 'Finance & Accounting',
                    cashAdvanceAmount: fromNote.caAmount,
                    actualExpense: fromNote.actualAmount,
                    refundAmount: fromNote.refundAmount,
                    paymentMethod: 'Transfer',
                    transferTo: requisition.bankAccount || '',
                    note: itDesc || reqDesc || requisition.notes?.replace(/\s*\[Expense Approval Settled:[^\]]+\]/g, '').trim() || 'Penyelesaian Cash Advance',
                    exportedBy: requisition.requesterFullname || 'Finance'
                });
            }
        }

        setExpenseHistory(list);
    };

    useEffect(() => {
        if (isOpen && requisition) {
            loadExpenseHistory();
        }
    }, [isOpen, requisition]);

    const settlementData = React.useMemo(() => {
        if (expenseHistory && expenseHistory.length > 0) {
            const latest = expenseHistory[0];
            const ca = Number(latest.cashAdvanceAmount) || 0;
            const actual = Number(latest.actualExpense) || 0;
            const refund = Number(latest.refundAmount) || Math.max(0, ca - actual);
            return {
                isSettled: true,
                caAmount: ca,
                actualAmount: actual,
                refundAmount: refund,
            };
        }
        const fromNote = parseSettlementFromNotes(requisition?.notes);
        if (fromNote) {
            return {
                isSettled: true,
                caAmount: fromNote.caAmount,
                actualAmount: fromNote.actualAmount,
                refundAmount: fromNote.refundAmount,
            };
        }
        return {
            isSettled: false,
            caAmount: 0,
            actualAmount: 0,
            refundAmount: 0,
        };
    }, [expenseHistory, requisition?.notes]);

    const cleanNotes = requisition?.notes?.replace(/\s*\[Expense Approval Settled:[^\]]+\]/g, '').trim() || requisition?.notes;

    if (!isOpen || !requisition) return null;

    const formatCurrency = (num: number, currency: string = 'IDR') => {
        const c = String(currency || 'IDR').toUpperCase();
        if (c.includes('USD') || c === 'DOLLAR') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 2
            }).format(num);
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 2
        }).format(num);
    };

    // Determine if it is current user's turn to approve
    const getActiveApproverId = () => {
        if (requisition.status === 'Pending Supervisor') return requisition.supervisorId;
        if (requisition.status === 'Pending VP') return requisition.vpId;
        if (requisition.status === 'Pending Finance') return requisition.financeId;
        if (requisition.status === 'Pending Accounting') return requisition.accountingId;
        return null;
    };

    const isMyTurn = currentUser && getActiveApproverId() === String(currentUser.id) && requisition.status !== 'Approved' && requisition.status !== 'Rejected';

    const getApprovalTimeline = () => {
        return [
            {
                role: 'Pemohon',
                name: requisition.requesterFullname,
                date: requisition.requestDate,
                status: 'Approved',
                color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
            },
            {
                role: 'Atasan Langsung',
                name: requisition.supervisorName || 'Supervisor',
                date: requisition.supervisorApprovedAt ? new Date(requisition.supervisorApprovedAt).toLocaleDateString('id-ID') : null,
                status: requisition.supervisorApprovedAt ? 'Approved' : (requisition.status === 'Pending Supervisor' ? 'Active' : (requisition.status === 'Rejected' && requisition.rejectedBy === requisition.supervisorId ? 'Rejected' : 'Pending')),
                color: requisition.supervisorApprovedAt ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : (requisition.status === 'Pending Supervisor' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : (requisition.status === 'Rejected' && requisition.rejectedBy === requisition.supervisorId ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-100 dark:bg-zinc-800 border-transparent'))
            },
            {
                role: 'VP HR & Logistic',
                name: requisition.vpName || 'VP',
                date: requisition.vpApprovedAt ? new Date(requisition.vpApprovedAt).toLocaleDateString('id-ID') : null,
                status: requisition.vpApprovedAt ? 'Approved' : (requisition.status === 'Pending VP' ? 'Active' : (requisition.status === 'Rejected' && requisition.rejectedBy === requisition.vpId ? 'Rejected' : 'Pending')),
                color: requisition.vpApprovedAt ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : (requisition.status === 'Pending VP' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : (requisition.status === 'Rejected' && requisition.rejectedBy === requisition.vpId ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-100 dark:bg-zinc-800 border-transparent'))
            }
        ];
    };

    const handleDownload = () => {
        exportPurchaseRequisitionPDF(requisition);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh] border border-border/60 font-sans">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-muted/60 border border-border/60 text-foreground rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Requisition ID: PR-{String(requisition.id).padStart(4, '0')}</h2>
                            <p className="text-xs text-muted-foreground mt-1">Formal Procurement Requisition Terminal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Button variant="outline" size="sm" className="text-xs h-9 flex items-center gap-2">
                                <Download size={14} /> Export Forms
                            </Button>

                            <div className="absolute right-0 top-full mt-1 w-56 bg-popover text-popover-foreground border border-border rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 overflow-hidden">
                                <button
                                    onClick={handleDownload}
                                    className="w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 hover:bg-muted"
                                >
                                    <FileText size={14} className="text-blue-500" />
                                    Purchase Requisition
                                </button>
                                <button
                                    onClick={() => setFinanceModalType('cash_advance')}
                                    className="w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 hover:bg-muted"
                                >
                                    <DollarSign size={14} className="text-amber-500" />
                                    Cash Advance
                                </button>
                                <button
                                    onClick={() => setFinanceModalType('payment_requisition')}
                                    className="w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 hover:bg-muted"
                                >
                                    <FileText size={14} className="text-emerald-500" />
                                    Payment Requisition
                                </button>
                                <button
                                    onClick={() => {
                                        if (requisition.status !== 'Approved') {
                                            showToast("Expense Approval hanya dapat dibuat untuk PR yang sudah berstatus 'Approved'.", "warning");
                                            return;
                                        }
                                        setShowExpenseApproval(true);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center justify-between transition-colors ${requisition.status === 'Approved'
                                        ? 'hover:bg-muted'
                                        : 'text-muted-foreground hover:bg-amber-500/10'
                                        }`}
                                    title={requisition.status !== 'Approved' ? "Hanya dapat dibuat setelah PR berstatus Approved" : "Penyelesaian Cash Advance & Pengembalian Dana"}
                                >
                                    <div className="flex items-center gap-2">
                                        <Calculator size={14} className={requisition.status === 'Approved' ? "text-rose-500" : "text-muted-foreground"} />
                                        <span>Expense Approval</span>
                                    </div>
                                    {requisition.status !== 'Approved' && (
                                        <span className="text-xs font-medium px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-md">
                                            Needs Approval
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button onClick={onClose} className="p-2 ml-1 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">

                    {/* Visual Stage Workflow Bar */}
                    <div className="bg-muted/20 p-6 rounded-2xl border border-border/40">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Approval Chain Timeline</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {getApprovalTimeline().map((step, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between h-24 transition-all duration-300 ${step.color}`}>
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-semibold">{step.role}</span>
                                            {step.status === 'Approved' && <CheckCircle2 size={13} className="text-emerald-500" />}
                                            {step.status === 'Active' && <Clock size={13} className="text-amber-500 animate-pulse" />}
                                            {step.status === 'Rejected' && <AlertTriangle size={13} className="text-rose-500" />}
                                        </div>
                                        <span className="text-xs font-bold block mt-1.5 truncate max-w-[130px]">{step.name}</span>
                                    </div>
                                    <div className="text-xs font-medium text-muted-foreground">
                                        {step.status === 'Approved' && step.date ? `Approved: ${step.date}` : ''}
                                        {step.status === 'Active' && 'WAITING YOUR SIGN'}
                                        {step.status === 'Pending' && 'PENDING'}
                                        {step.status === 'Rejected' && 'REJECTED'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reject Reason Banner if Rejected */}
                    {requisition.status === 'Rejected' && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-xl flex items-start gap-4">
                            <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                            <div>
                                <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">Requisition Rejected</h4>
                                <p className="text-xs text-muted-foreground italic">
                                    "{requisition.rejectReason || 'No rejection reason specified.'}"
                                </p>
                                <span className="text-xs font-medium text-rose-600/80 dark:text-rose-400 block mt-2">
                                    Rejected By {requisition.rejectedBy || 'Approver'} at {requisition.rejectedAt ? new Date(requisition.rejectedAt).toLocaleString() : ''}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Metadata summary (Forms layout mirroring PDF) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-border/40">
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block">Nama Pemohon</span>
                                <span className="text-sm font-medium text-foreground">{requisition.requesterFullname}</span>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block">Departemen</span>
                                <span className="text-sm font-medium text-foreground">{requisition.department}</span>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block">Tanggal Request</span>
                                <span className="text-sm font-medium text-foreground">
                                    {new Date(requisition.requestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block">Paid To</span>
                                <span className="text-sm font-medium text-foreground">{requisition.paidTo || '-'}</span>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block">No. Rekening</span>
                                <span className="text-sm font-medium text-foreground">{requisition.bankAccount || '-'}</span>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-muted-foreground block">Document Status</span>
                                <span className="text-sm font-semibold text-foreground">{requisition.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Requested items table layout */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">1. Permohonan dari Pengguna</h4>
                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/30 border-b text-xs font-semibold text-muted-foreground">
                                        <th className="py-3 px-6 w-16 text-center">No</th>
                                        <th className="py-3 px-6">Jenis Barang / Asset</th>
                                        <th className="py-3 px-6 w-32 text-center">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-700 dark:text-zinc-300 divide-y divide-border">
                                    {(requisition.requestedItems || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3 px-6 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-6 font-bold">{item.description}</td>
                                            <td className="py-3 px-6 text-center font-bold">{item.qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* IT Recommendations table layout */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">2. Rekomendasi oleh IT</h4>
                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/30 border-b text-xs font-semibold text-muted-foreground">
                                        <th className="py-3 px-6 w-16 text-center">No</th>
                                        <th className="py-3 px-6">Rekomendasi Barang / Spesifikasi</th>
                                        <th className="py-3 px-6 w-24 text-center">Jumlah</th>
                                        <th className="py-3 px-6 w-40">Rekomendasi Vendor</th>
                                        <th className="py-3 px-6 w-40 text-right">Harga</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-700 dark:text-zinc-300 divide-y divide-border">
                                    {(requisition.itRecommendations || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3 px-6 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-6 font-bold break-words whitespace-normal max-w-[200px]">{item.description}</td>
                                            <td className="py-3 px-6 text-center font-bold">{item.qty}</td>
                                            <td className="py-3 px-6 font-bold break-words whitespace-normal max-w-[160px]">{item.vendor}</td>
                                            <td className="py-3 px-6 text-right font-mono font-bold whitespace-nowrap">{item.price && item.price > 0 ? formatCurrency(item.price, requisition.currency) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Settlement Status Banner if settled */}
                    {settlementData.isSettled && (
                        <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                            Status: Telah Diselesaikan (Expense Approval)
                                        </h5>
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 rounded-md">
                                            Settled
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300 mt-0.5">
                                        Plafon CA: <span className="font-mono font-semibold">{formatCurrency(settlementData.caAmount, requisition.currency)}</span> &bull;
                                        Realisasi Riil: <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100">{formatCurrency(settlementData.actualAmount, requisition.currency)}</span> &bull;
                                        Dana Kembali: <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">+{formatCurrency(settlementData.refundAmount, requisition.currency)}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2.5 py-1 bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-xs">
                                    ✓ Nominal Laporan Disesuaikan
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Note details */}
                    <div>
                        <span className="text-xs font-medium text-muted-foreground block mb-1">Catatan Tambahan</span>
                        <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-lg border border-border/40 leading-relaxed">
                            {cleanNotes || '-'}
                        </p>
                    </div>

                    {/* Grand Total display */}
                    <div className="bg-muted/20 p-6 rounded-2xl border border-border/40 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-7 space-y-3">
                            <div className="flex items-center justify-between pb-1 border-b border-border/60">
                                <h4 className="text-xs font-semibold text-muted-foreground">
                                    {settlementData.isSettled ? 'Rincian Realisasi & Pengembalian Dana' : 'Rincian Komitmen Biaya'}
                                </h4>
                                {settlementData.isSettled && (
                                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                        Realisasi Selesai
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <div className="text-sm text-muted-foreground flex justify-between max-w-md">
                                    <span>Subtotal Item IT</span>
                                    <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                                        {formatCurrency((requisition.itRecommendations || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0), requisition.currency)}
                                    </span>
                                </div>
                                {requisition.discount && requisition.discount > 0 ? (
                                    <div className="text-sm font-medium text-rose-500 dark:text-rose-400 flex justify-between max-w-md">
                                        <span>Diskon Pembelian</span>
                                        <span className="font-mono font-semibold">
                                            -{formatCurrency(requisition.discount, requisition.currency)}
                                        </span>
                                    </div>
                                ) : null}
                                {requisition.deliveryFee && requisition.deliveryFee > 0 ? (
                                    <div className="text-sm font-medium text-blue-500 dark:text-blue-400 flex justify-between max-w-md">
                                        <span>Ongkos Kirim</span>
                                        <span className="font-mono font-semibold">
                                            +{formatCurrency(requisition.deliveryFee, requisition.currency)}
                                        </span>
                                    </div>
                                ) : null}

                                {settlementData.isSettled && (
                                    <div className="pt-2 mt-2 border-t border-dashed border-slate-200 dark:border-zinc-800 max-w-md space-y-1.5">
                                        <div className="text-sm font-medium text-muted-foreground flex justify-between">
                                            <span>Plafon Dana Cash Advance (CA)</span>
                                            <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                                                {formatCurrency(settlementData.caAmount, requisition.currency)}
                                            </span>
                                        </div>
                                        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex justify-between bg-emerald-500/10 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                                            <span className="flex items-center gap-1">
                                                <ArrowDownCircle size={13} className="text-emerald-500" />
                                                Pengembalian Dana (Expense Approval)
                                            </span>
                                            <span className="font-mono font-black">
                                                -{formatCurrency(settlementData.refundAmount, requisition.currency)}
                                            </span>
                                        </div>
                                        <div className="text-sm font-semibold text-foreground flex justify-between pt-1">
                                            <span>Total Realisasi Pengeluaran Riil</span>
                                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(settlementData.actualAmount, requisition.currency)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {settlementData.isSettled ? (
                            <div className="md:col-span-5 bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-950/25 dark:to-transparent p-5 rounded-xl border border-emerald-500/20 min-h-[90px] relative overflow-hidden">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">
                                        NILAI AKTUAL PENGELUARAN
                                    </span>
                                    <span className="text-xs font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                                        Realisasi Riil
                                    </span>
                                </div>
                                <div className="flex items-end justify-between gap-2">
                                    <div>
                                        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight font-mono block">
                                            {formatCurrency(settlementData.actualAmount || requisition.grandTotal, requisition.currency)}
                                        </span>
                                        <div className="mt-1.5 space-y-0.5 text-[10px]">
                                            <div className="text-slate-500 dark:text-zinc-400">
                                                Plafon CA: <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">{formatCurrency(settlementData.caAmount, requisition.currency)}</span>
                                            </div>
                                            <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                <ArrowDownCircle size={11} />
                                                <span>Kembali ke Kas:</span>
                                                <span className="font-mono">+{formatCurrency(settlementData.refundAmount, requisition.currency)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <span className="text-xs font-semibold bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-mono">
                                            Settled
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="md:col-span-5 bg-muted/20 p-5 rounded-xl border border-border/40 min-h-[90px]">
                                <span className="text-xs font-semibold text-muted-foreground block mb-2">Grand Total Commitment</span>
                                <div className="flex items-end justify-between gap-2">
                                    <div>
                                        <span className="text-2xl font-bold text-foreground tracking-tight font-mono">
                                            {formatCurrency(requisition.grandTotal, requisition.currency)}
                                        </span>
                                        {String(requisition.currency || '').toUpperCase().includes('USD') && requisition.grandTotal > 0 && (
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                <span className="text-xs text-muted-foreground font-medium">≈</span>
                                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(requisition.grandTotal * usdRate)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/10">
                                            <DollarSign size={14} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        {String(requisition.currency || '').toUpperCase().includes('USD') && (
                                            <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono whitespace-nowrap">
                                                $1 = Rp {new Intl.NumberFormat('id-ID').format(usdRate)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Expense Approval Settlement History */}
                    {expenseHistory.length > 0 && (
                        <div className="bg-rose-500/5 dark:bg-rose-950/20 p-6 rounded-2xl border border-rose-500/20 space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-rose-500/20">
                                <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                    <History size={15} className="text-rose-600 dark:text-rose-400" />
                                    Histori Penyelesaian & Expense Approval ({expenseHistory.length})
                                </h4>
                                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full">
                                    Settled / Dana Kembali
                                </span>
                            </div>

                            <div className="space-y-3">
                                {expenseHistory.map((item, idx) => (
                                    <div key={idx} className="p-4 bg-card rounded-xl border border-border/50 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                                                    {item.companyName} — Voucher Expenses Approval
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Clock size={11} />
                                                    {new Date(item.exportedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} oleh <strong className="text-slate-600 dark:text-zinc-300">{item.exportedBy || requisition.requesterFullname || 'Finance'}</strong>
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={async () => {
                                                    try {
                                                        await exportExpenseApprovalPDF(requisition, {
                                                            companyName: item.companyName,
                                                            costCenter: item.costCenter || 'CA',
                                                            projectName: item.projectName || '',
                                                            cekBgNo: item.cekBgNo || '',
                                                            bankName: item.bankName || '',
                                                            paymentMethod: item.paymentMethod || 'Transfer',
                                                            transferTo: item.transferTo || '',
                                                            paidTo: item.paidTo || 'Finance & Accounting',
                                                            requestDate: item.requestDate || '',
                                                            note: item.note || '',
                                                            actualExpense: item.actualExpense || 0,
                                                            cashAdvanceAmount: item.cashAdvanceAmount || 0,
                                                        });
                                                        showToast("PDF Voucher Expense Approval berhasil diunduh ulang!", "success");
                                                    } catch (e: any) {
                                                        showToast("Gagal mengunduh voucher: " + (e.message || ""), "error");
                                                    }
                                                }}
                                                className="text-xs h-8 gap-1.5 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold"
                                            >
                                                <Download size={13} />
                                                Unduh Ulang PDF
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/20 rounded-lg text-sm">
                                            <div>
                                                <span className="text-xs font-medium text-muted-foreground block">Cash Advance</span>
                                                <span className="font-mono font-semibold text-foreground">
                                                    Rp {new Intl.NumberFormat('id-ID').format(item.cashAdvanceAmount || 0)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-muted-foreground block">Pengeluaran Riil</span>
                                                <span className="font-mono font-semibold text-foreground">
                                                    Rp {new Intl.NumberFormat('id-ID').format(item.actualExpense || 0)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block">Dana Dikembalikan</span>
                                                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                                    Rp {new Intl.NumberFormat('id-ID').format(Math.abs(item.refundAmount || 0))}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-slate-500 space-y-0.5">
                                            <div>
                                                Pembayaran dilakukan transfer ke rekening Finance
                                            </div>
                                            {item.cekBgNo && <div><strong>Cek/BG No:</strong> {item.cekBgNo}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-3.5 border-t border-border/40 bg-muted/10 flex justify-between items-center shrink-0">
                    <div>
                        {isMyTurn && (
                            <div className="flex items-center gap-2">
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Awaiting Your Decision</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        {isMyTurn && onReject && (
                            <Button type="button" variant="outline" onClick={() => onReject(requisition)} className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30">
                                Reject Requisition
                            </Button>
                        )}
                        {isMyTurn && onApprove && (
                            <Button type="button" onClick={() => onApprove(requisition)} className="min-w-[150px]">
                                Approve & Sign
                            </Button>
                        )}
                    </div>
                </div>

            </div>

            {financeModalType && (
                <FinanceFormExportModal
                    isOpen={true}
                    onClose={() => setFinanceModalType(null)}
                    requisition={requisition}
                    type={financeModalType}
                />
            )}

            {showExpenseApproval && (
                <ExpenseApprovalExportModal
                    isOpen={true}
                    onClose={() => setShowExpenseApproval(false)}
                    requisition={requisition}
                    currentUser={currentUser}
                    onSettled={() => {
                        setShowExpenseApproval(false);
                        loadExpenseHistory();
                        if (onUpdate) onUpdate();
                        onClose();
                    }}
                />
            )}
        </div>,
        document.body
    );
};
