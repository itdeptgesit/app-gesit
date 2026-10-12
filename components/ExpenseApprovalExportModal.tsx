import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Calculator, AlertTriangle, ArrowDownCircle, RefreshCw, History, Clock, Trash2 } from 'lucide-react';
import { PurchaseRequisition, UserAccount } from '../types';
import { Button } from "@/components/ui/button";
import { exportExpenseApprovalPDF, ExpenseApprovalFormData } from '../lib/financeFormPdfExport';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';

export interface ExpenseApprovalHistoryItem {
    id?: number | string;
    requisitionId: number;
    companyName: string;
    costCenter: string;
    projectName: string;
    cekBgNo: string;
    bankName: string;
    paymentMethod: 'Cash' | 'Transfer';
    transferTo: string;
    paidTo: string;
    requestDate: string;
    cashAdvanceAmount: number;
    actualExpense: number;
    refundAmount: number;
    note: string;
    exportedAt: string;
    exportedBy: string;
}

interface ExpenseApprovalExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    requisition: PurchaseRequisition | null;
    currentUser?: UserAccount | null;
    onSettled?: () => void;
}

const getAbbreviation = (name: string): string => {
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase();
};

const formatNumber = (val: number | string | undefined) => {
    if (val === undefined || val === null || val === '') return '';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('id-ID').format(num);
};

const parseNumber = (val: string) => {
    return parseInt(val.replace(/\D/g, ''), 10) || 0;
};

const DEFAULT_COMPANY = 'GESIT ALUMAS';

export const ExpenseApprovalExportModal: React.FC<ExpenseApprovalExportModalProps> = ({
    isOpen,
    onClose,
    requisition,
    currentUser,
    onSettled
}) => {
    const { showToast } = useToast();
    const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updateReportNominal, setUpdateReportNominal] = useState(true);
    const [historyList, setHistoryList] = useState<ExpenseApprovalHistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

    const getDefaultProjectName = () => {
        if (!requisition) return '';
        const items = requisition.requestedItems || [];
        return items.map(item => item.description).filter(Boolean).join(', ') || requisition.itRecommendations?.[0]?.description || '';
    };

    const getDefaultPaidTo = () => {
        return 'Finance & Accounting';
    };

    const getDefaultNote = () => {
        return 'Penyelesaian Cash Advance';
    };

    const [formData, setFormData] = useState<ExpenseApprovalFormData>({
        companyName: '',
        costCenter: '',
        projectName: getDefaultProjectName(),
        cekBgNo: '',
        bankName: '',
        paymentMethod: 'Transfer',
        transferTo: requisition?.bankAccount || '',
        paidTo: getDefaultPaidTo(),
        requestDate: requisition?.requestDate || new Date().toISOString().split('T')[0],
        note: getDefaultNote(),
        actualExpense: requisition?.grandTotal || 0,
        cashAdvanceAmount: requisition?.grandTotal || 0,
    });

    useEffect(() => {
        supabase.from('companies').select('id, name').order('name').then(({ data }) => {
            if (data && data.length > 0) {
                setCompanies(data);
                // Set default company from master if not yet set
                setFormData(prev => ({
                    ...prev,
                    companyName: prev.companyName || requisition?.company || data[0].name || DEFAULT_COMPANY,
                    costCenter: prev.costCenter || getAbbreviation(prev.companyName || requisition?.company || data[0].name || DEFAULT_COMPANY),
                }));
            }
        });
    }, [requisition]);

    // Fetch history from expense_approvals table (primary) + localStorage fallback
    const loadHistory = async () => {
        if (!requisition) return;

        // 1. From Supabase expense_approvals (primary source)
        try {
            const { data } = await supabase
                .from('expense_approvals')
                .select('*')
                .eq('requisition_id', requisition.id)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                const mapped: ExpenseApprovalHistoryItem[] = data.map(row => ({
                    id: row.id,
                    requisitionId: row.requisition_id,
                    companyName: row.company_name || '',
                    costCenter: row.cost_center || '',
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
                setHistoryList(mapped);
                return;
            }
        } catch (err) {
            console.error("Error loading from expense_approvals:", err);
        }

        // 2. Fallback: localStorage (for old data before migration)
        try {
            const cached = localStorage.getItem(`gesit_ea_history_${requisition.id}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    setHistoryList(parsed);
                    return;
                }
            }
        } catch (e) {
            console.warn("Failed reading local history:", e);
        }

        setHistoryList([]);
    };

    useEffect(() => {
        if (isOpen && requisition) {
            loadHistory();
            const defaultComp = requisition.company || DEFAULT_COMPANY;
            setFormData(prev => ({
                ...prev,
                companyName: requisition.company || prev.companyName || DEFAULT_COMPANY,
                costCenter: getAbbreviation(requisition.company || prev.companyName || DEFAULT_COMPANY),
                projectName: getDefaultProjectName(),
                paidTo: getDefaultPaidTo(),
                requestDate: requisition.requestDate || prev.requestDate,
                transferTo: requisition.bankAccount || prev.transferTo,
                note: getDefaultNote(),
                actualExpense: requisition.grandTotal || prev.actualExpense,
                cashAdvanceAmount: requisition.grandTotal || prev.cashAdvanceAmount,
            }));
        }
    }, [isOpen, requisition]);

    if (!isOpen || !requisition) return null;

    const isApproved = requisition.status === 'Approved';
    const refundAmount = formData.cashAdvanceAmount - formData.actualExpense;

    const handleExport = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isApproved) {
            showToast("Expense Approval hanya dapat diproses untuk PR yang sudah disetujui (Approved).", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Generate & download the PDF voucher
            await exportExpenseApprovalPDF(requisition, formData);

            const now = new Date().toISOString();
            const cleanPrId = `PR-${String(requisition.id).padStart(4, '0')}`;
            const userName = currentUser?.fullName || currentUser?.username || 'Finance';


            const cleanId = `EA-${String(requisition.id).padStart(4, '0')}`;


            // 2. Save to Supabase expense_approvals (primary)
            let savedId: number | undefined;
            try {
                const { data: inserted, error: insertErr } = await supabase
                    .from('expense_approvals')
                    .insert([{
                        requisition_id: requisition.id,
                        expense_number: cleanId,
                        company_name: formData.companyName,
                        cost_center: formData.costCenter,
                        project_name: formData.projectName,
                        cek_bg_no: formData.cekBgNo,
                        bank_name: formData.bankName,
                        payment_method: formData.paymentMethod,
                        transfer_to: formData.transferTo,
                        paid_to: formData.paidTo,
                        request_date: formData.requestDate || null,
                        note: formData.note,
                        cash_advance_amount: formData.cashAdvanceAmount,
                        actual_expense: formData.actualExpense,
                        refund_amount: refundAmount,
                        exported_by: userName,
                        exported_at: now,
                    }])
                    .select('id')
                    .single();

                if (insertErr) {
                    console.error("Error inserting to expense_approvals:", insertErr);
                } else {
                    savedId = inserted?.id;
                }
            } catch (saveErr) {
                console.error("Error saving expense approval:", saveErr);
            }

            // 3. Build history item for UI update
            const historyItem: ExpenseApprovalHistoryItem = {
                id: savedId,
                requisitionId: requisition.id,
                companyName: formData.companyName,
                costCenter: formData.costCenter,
                projectName: formData.projectName,
                cekBgNo: formData.cekBgNo,
                bankName: formData.bankName,
                paymentMethod: formData.paymentMethod,
                transferTo: formData.transferTo,
                paidTo: formData.paidTo,
                requestDate: formData.requestDate,
                cashAdvanceAmount: formData.cashAdvanceAmount,
                actualExpense: formData.actualExpense,
                refundAmount: refundAmount,
                note: formData.note,
                exportedAt: now,
                exportedBy: userName
            };

            // Update UI history list immediately
            setHistoryList(prev => [historyItem, ...prev]);

            // 4. Secondary audit log to activity_logs
            try {
                await supabase.from('activity_logs').insert([{
                    activity_name: `Expense Approval: ${cleanPrId}`,
                    category: 'Procurement',
                    requester: requisition.requesterFullname,
                    department: requisition.department,
                    it_personnel: userName,
                    type: 'Minor',
                    status: 'Completed',
                    remarks: `Expense Approval disimpan. EA-ID: ${savedId || '-'}, Aktual: Rp ${formatNumber(formData.actualExpense)}, Kembali: Rp ${formatNumber(Math.max(0, refundAmount))}`,
                    created_at: now
                }]);
            } catch (logErr) {
                console.error("Error logging to activity_logs:", logErr);
            }


            // 3. Update report nominal & ledger if opted
            if (updateReportNominal) {
                const settlementNote = `[Expense Approval Settled: CA Rp ${formatNumber(formData.cashAdvanceAmount)}, Aktual Rp ${formatNumber(formData.actualExpense)}, Kembali Rp ${formatNumber(Math.max(0, refundAmount))}]`;
                const updatedNotes = requisition.notes 
                    ? `${requisition.notes}\n${settlementNote}` 
                    : settlementNote;

                await supabase
                    .from('purchase_requisitions')
                    .update({
                        grand_total: formData.actualExpense,
                        notes: updatedNotes,
                        updated_at: now
                    })
                    .eq('id', requisition.id);

                // Update corresponding purchase_records
                try {
                    let { data: matchedRecords } = await supabase
                        .from('purchase_records')
                        .select('id, subtotal, total_va, remarks, docs, qty')
                        .or(`remarks.ilike.%#${requisition.id}%,description.ilike.%#${requisition.id}%,remarks.ilike.%${cleanPrId}%,remarks.ilike.%PR-${cleanPrId}%`);

                    if (!matchedRecords || matchedRecords.length === 0) {
                        // Fallback matching by date and requester name
                        const reqDate = requisition.requestDate || new Date().toISOString().split('T')[0];
                        const { data: fallbackRecords } = await supabase
                            .from('purchase_records')
                            .select('id, subtotal, total_va, remarks, docs, qty')
                            .eq('purchase_date', reqDate)
                            .ilike('user_name', `%${requisition.requesterFullname || ''}%`);

                        if (fallbackRecords && fallbackRecords.length > 0) {
                            matchedRecords = fallbackRecords;
                        }
                    }

                    if (matchedRecords && matchedRecords.length > 0) {
                        for (const rec of matchedRecords) {
                            const recRemarks = rec.remarks 
                                ? `${rec.remarks} | [Expense Approval Settled: Refund Rp ${formatNumber(Math.max(0, refundAmount))}] [PR-${cleanPrId}]`
                                : `[Expense Approval Settled: Refund Rp ${formatNumber(Math.max(0, refundAmount))}] [PR-${cleanPrId}]`;

                            await supabase
                                .from('purchase_records')
                                .update({
                                    subtotal: formData.actualExpense,
                                    total_va: formData.actualExpense,
                                    price: formData.actualExpense / (rec.qty || 1),
                                    docs: { ...(rec.docs || {}), expenseApproval: true },
                                    remarks: recRemarks
                                })
                                .eq('id', rec.id);
                        }
                    }
                } catch (recErr) {
                    console.error("Error updating linked purchase records:", recErr);
                }

                showToast(`Expense Approval berhasil di-export & nominal laporan disesuaikan menjadi Rp ${formatNumber(formData.actualExpense)}!`, 'success');
                
                if (onSettled) {
                    onSettled();
                }
            } else {
                showToast("Expense Approval PDF berhasil diunduh!", 'success');
            }

            onClose();
        } catch (error: any) {
            console.error("Failed to process Expense Approval:", error);
            showToast("Gagal memproses Expense Approval: " + (error?.message || "Unknown error"), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReDownload = async (historyItem: ExpenseApprovalHistoryItem) => {
        try {
            await exportExpenseApprovalPDF(requisition, {
                companyName: historyItem.companyName,
                costCenter: historyItem.costCenter,
                projectName: historyItem.projectName,
                cekBgNo: historyItem.cekBgNo,
                bankName: historyItem.bankName,
                paymentMethod: historyItem.paymentMethod,
                transferTo: historyItem.transferTo,
                paidTo: historyItem.paidTo,
                requestDate: historyItem.requestDate,
                note: historyItem.note,
                actualExpense: historyItem.actualExpense,
                cashAdvanceAmount: historyItem.cashAdvanceAmount,
            });
            showToast("PDF riwayat Expense Approval berhasil diunduh!", "success");
        } catch (err: any) {
            showToast("Gagal mengunduh PDF riwayat: " + (err.message || ""), "error");
        }
    };

    const handleDeleteHistory = async (item: ExpenseApprovalHistoryItem, idx: number) => {
        if (!confirm(`Hapus record histori "${item.companyName}" (diekspor ${new Date(item.exportedAt).toLocaleString('id-ID')})? Tindakan ini tidak dapat dibatalkan.`)) return;
        try {
            if (item.id) {
                const { error } = await supabase
                    .from('expense_approvals')
                    .delete()
                    .eq('id', item.id);
                if (error) throw error;
            }
            setHistoryList(prev => prev.filter((_, i) => i !== idx));
            showToast('Record histori berhasil dihapus.', 'success');
        } catch (err: any) {
            showToast('Gagal menghapus histori: ' + (err.message || ''), 'error');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background font-sans rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border/60 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                            <Calculator size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Export Expenses Approval</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Penyelesaian Cash Advance & Riwayat</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {historyList.length > 0 && (
                            <div className="flex bg-muted p-0.5 rounded-lg text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('form')}
                                    className={`px-3 py-1 rounded-md transition-all ${activeTab === 'form' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    Formulir
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('history')}
                                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <History size={12} />
                                    Riwayat ({historyList.length})
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Status Warning if not approved */}
                {!isApproved && (
                    <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                        <div className="text-xs">
                            <p className="font-bold text-amber-800 dark:text-amber-300">Syarat Approval Belum Terpenuhi</p>
                            <p className="text-amber-700 dark:text-amber-400 mt-1">
                                Requisition ini berstatus <span className="font-semibold uppercase">"{requisition.status}"</span>.
                                Expense Approval <strong>hanya dapat diproses jika status sudah "Approved"</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'history' ? (
                    /* History Tab */
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <History size={14} className="text-rose-500" />
                                Riwayat Export & Penyelesaian Cash Advance
                            </h3>
                            <span className="text-xs text-muted-foreground font-mono">
                                Total: {historyList.length} transaksi
                            </span>
                        </div>

                        <div className="space-y-3">
                            {historyList.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-border/60 bg-muted/40 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-sm font-semibold text-foreground block">
                                                {item.companyName} ({item.costCenter || 'CA'})
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Clock size={10} />
                                                {new Date(item.exportedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} oleh <strong className="text-foreground">{item.exportedBy}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReDownload(item)}
                                                className="text-xs h-8 gap-1.5 font-semibold"
                                            >
                                                <Download size={12} />
                                                Unduh PDF
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteHistory(item, idx)}
                                                className="text-xs h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 font-semibold"
                                            >
                                                <Trash2 size={12} />
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-background rounded-lg border border-border/40 text-xs">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground font-medium block">Cash Advance</span>
                                            <span className="font-mono font-semibold text-foreground">
                                                Rp {formatNumber(item.cashAdvanceAmount)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground font-medium block">Pengeluaran Riil</span>
                                            <span className="font-mono font-semibold text-foreground">
                                                Rp {formatNumber(item.actualExpense)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground font-medium block">Dana Kembali</span>
                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                Rp {formatNumber(Math.abs(item.refundAmount))}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                        <div><strong>Metode:</strong> {item.paymentMethod} {item.transferTo ? `(${item.bankName || ''} - ${item.transferTo})` : ''}</div>
                                        <div><strong>Penerima:</strong> {item.paidTo || '-'} | <strong>Proyek:</strong> {item.projectName || '-'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button type="button" variant="outline" onClick={() => setActiveTab('form')}>
                                Kembali ke Formulir
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Main Form Matching Cash Advance Layout */
                    <form onSubmit={handleExport} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <p className="text-sm text-muted-foreground">
                            Lengkapi data di bawah ini. Format voucher PDF akan dibuat <strong>sama persis dengan Cash Advance</strong>, lengkap dengan tabel rincian, penghitungan dana kembali, dan kolom otorisasi tanda tangan.
                        </p>

                        {/* Company & Cost Center */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Company</label>
                                <select
                                    className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50 font-medium"
                                    value={formData.companyName}
                                    onChange={e => setFormData({ 
                                        ...formData, 
                                        companyName: e.target.value,
                                        costCenter: getAbbreviation(e.target.value)
                                    })}
                                >
                                    <option value="">-- Pilih Company --</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Cost Center</label>
                                <input
                                    type="text"
                                    className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50 font-bold"
                                    value={formData.costCenter}
                                    onChange={e => setFormData({ ...formData, costCenter: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Project Name & Cek/BG No. */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                                <input
                                    type="text"
                                    className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                    value={formData.projectName}
                                    onChange={e => setFormData({ ...formData, projectName: e.target.value })}
                                    placeholder="Nama proyek"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Cek / BG No.</label>
                                <input
                                    type="text"
                                    className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                    value={formData.cekBgNo}
                                    onChange={e => setFormData({ ...formData, cekBgNo: e.target.value })}
                                    placeholder="Nomor Cek / Giro (Opsional)"
                                />
                            </div>
                        </div>

                        {/* Bank Name & Request Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Bank</label>
                                <input
                                    type="text"
                                    className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                    value={formData.bankName}
                                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                    placeholder="e.g. BCA, Mandiri"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Request Date</label>
                                <input
                                    type="date"
                                    className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                    value={formData.requestDate}
                                    onChange={e => setFormData({ ...formData, requestDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Pay to */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Pay to</label>
                            <input
                                type="text"
                                className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                value={formData.paidTo}
                                onChange={e => setFormData({ ...formData, paidTo: e.target.value })}
                                placeholder="Vendor / Penerima"
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                            <div className="flex items-center gap-6 mt-1">
                                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="Cash"
                                        checked={formData.paymentMethod === 'Cash'}
                                        onChange={() => setFormData({ ...formData, paymentMethod: 'Cash' })}
                                        className="text-rose-600 focus:ring-rose-500"
                                    />
                                    Cash
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="Transfer"
                                        checked={formData.paymentMethod === 'Transfer'}
                                        onChange={() => setFormData({ ...formData, paymentMethod: 'Transfer' })}
                                        className="text-rose-600 focus:ring-rose-500"
                                    />
                                    Transfer
                                </label>
                            </div>
                        </div>

                        {formData.paymentMethod === 'Transfer' && (
                            <div className="space-y-1 animate-in fade-in">
                                <label className="text-xs font-medium text-muted-foreground">Transfer To (No. Rekening / Rekening Tujuan)</label>
                                <input
                                    type="text"
                                    className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50 font-mono"
                                    value={formData.transferTo}
                                    onChange={e => setFormData({ ...formData, transferTo: e.target.value })}
                                    placeholder="Contoh: BCA 123456789 a.n PT ABC"
                                />
                            </div>
                        )}

                        {/* Financial Calculation Section */}
                        <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <Calculator size={14} className="text-rose-500" />
                                Perhitungan Penyelesaian Cash Advance
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Jumlah Cash Advance (CA)</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm p-2 border border-border/60 rounded-lg bg-background font-mono font-semibold"
                                        value={formatNumber(formData.cashAdvanceAmount)}
                                        onChange={e => setFormData({ ...formData, cashAdvanceAmount: parseNumber(e.target.value) })}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-muted-foreground">Dana CA yang dicairkan sebelumnya</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Total Pengeluaran Aktual</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm p-2 border border-border/60 rounded-lg bg-background font-mono font-semibold"
                                        value={formatNumber(formData.actualExpense)}
                                        onChange={e => setFormData({ ...formData, actualExpense: parseNumber(e.target.value) })}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-muted-foreground">Total belanja riil (setelah barang batal/kelebihan dana)</p>
                                </div>
                            </div>

                            {/* Calculation Preview */}
                            {formData.cashAdvanceAmount > 0 && (
                                <div className="mt-3 p-3.5 bg-background rounded-lg border border-border/60 space-y-2.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Dana Cash Advance Diterima</span>
                                        <span className="font-mono font-semibold text-foreground">
                                            Rp {formatNumber(formData.cashAdvanceAmount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Pengeluaran Aktual Terpakai</span>
                                        <span className="font-mono font-semibold text-foreground">
                                            - Rp {formatNumber(formData.actualExpense)}
                                        </span>
                                    </div>
                                    <div className="border-t border-border/60 pt-2.5">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                {refundAmount >= 0 ? (
                                                    <ArrowDownCircle size={16} className="text-emerald-500" />
                                                ) : (
                                                    <AlertTriangle size={16} className="text-rose-500" />
                                                )}
                                                <span className={`font-bold text-sm ${refundAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {refundAmount >= 0 ? 'Dana Dikembalikan (Kembali ke Kas)' : 'Kurang Bayar (Reimbursement)'}
                                                </span>
                                            </div>
                                            <span className={`font-mono font-bold text-xl ${refundAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                Rp {formatNumber(Math.abs(refundAmount))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Automatic Report Nominal Adjustment Checkbox */}
                            {refundAmount > 0 && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={updateReportNominal}
                                            onChange={e => setUpdateReportNominal(e.target.checked)}
                                            className="mt-0.5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <div className="text-xs">
                                            <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                                                Kurangi nominal di Laporan & Ledger Pengeluaran
                                            </span>
                                            <span className="text-emerald-700 dark:text-emerald-400 block mt-0.5">
                                                Nominal pengeluaran di Report PR dan Purchase Records akan otomatis disesuaikan menjadi <strong>Rp {formatNumber(formData.actualExpense)}</strong> (berkurang <strong>Rp {formatNumber(refundAmount)}</strong>).
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Batal
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={!isApproved || isSubmitting} 
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Menyimpan & Export...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Export & Simpan Settlement
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};
