'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Calendar, ShieldCheck, FileText,
    Receipt, Download, Building2, User, CheckCircle2,
    XCircle, Clock, ShieldAlert, Briefcase, ExternalLink,
    ShoppingCart, CreditCard, Globe, Store, Tag, RefreshCcw,
    FileSpreadsheet, Printer, DollarSign, ArrowDownCircle,
    Check, Sparkles, Layers, Package, ArrowUpRight
} from 'lucide-react';
import { PurchaseRecord } from '../types';
import { sendToGoogleSheet } from '../lib/googleSheets';
import { useToast } from './ToastProvider';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PurchaseRecordDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: PurchaseRecord | any | null;
}

export const PurchaseRecordDetailModal: React.FC<PurchaseRecordDetailModalProps> = ({ isOpen, onClose, record }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const { showToast } = useToast();

    // Defensive parsing for record properties
    const transactionId = record?.transactionId || record?.transaction_id || `TR-${record?.id || '000'}`;
    const purchaseDate = record?.purchaseDate || record?.purchase_date || '-';
    const paymentDate = record?.paymentDate || record?.payment_date || purchaseDate;
    const paymentMethod = record?.paymentMethod || record?.payment_method || 'Transfer';
    const evidenceLink = record?.evidenceLink || record?.evidence_link || '';
    const projectName = record?.projectName || record?.project_name || '-';
    const inputBy = record?.inputBy || record?.input_by || 'System Automation';
    const user = record?.user || record?.user_name || '-';
    const department = record?.department || 'IT';
    const company = record?.company || 'THE GESIT COMPANIES';
    const category = record?.category || 'Hardware';
    const status = record?.status || 'Paid';
    const description = record?.description || 'Purchase Request';
    const vendor = record?.vendor || 'Authorized Vendor';
    const platform = record?.platform || '-';
    const subtotal = Number(record?.subtotal) || Number(record?.total_va) || 0;
    const qty = Number(record?.qty) || 1;
    const remarks = record?.remarks || '';

    // Parse items array safely
    const parsedItems = useMemo(() => {
        if (!record?.items) return [];
        if (Array.isArray(record.items)) return record.items;
        if (typeof record.items === 'string') {
            try {
                const parsed = JSON.parse(record.items);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    }, [record?.items]);

    // Parse docs safely
    const parsedDocs = useMemo(() => {
        if (!record?.docs) return {};
        if (typeof record.docs === 'string') {
            try { return JSON.parse(record.docs); } catch { return {}; }
        }
        return record.docs;
    }, [record?.docs]);

    const formatIDR = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(num);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID').format(num);
    };

    // Parse settlement info if present in remarks
    const settlementData = useMemo(() => {
        if (!remarks) return null;
        const match = remarks.match(/\[Expense Approval Settled:\s*(?:CA Rp\s*([\d.,]+),\s*Aktual Rp\s*([\d.,]+),\s*Kembali Rp\s*([\d.,]+)|Refund Rp\s*([\d.,]+))\]/i);
        const prMatch = remarks.match(/\[(?:PR\s*#?|PR-)(\d+)\]/i);

        if (!match) return null;

        const parseNum = (str: string) => {
            if (!str) return 0;
            const clean = str.replace(/\./g, '').replace(/,/g, '.');
            return parseFloat(clean) || 0;
        };

        if (match[1] && match[2]) {
            return {
                isSettled: true,
                caAmount: parseNum(match[1]),
                actualAmount: parseNum(match[2]),
                refundAmount: parseNum(match[3]),
                prId: prMatch ? prMatch[1] : null
            };
        } else if (match[4]) {
            return {
                isSettled: true,
                caAmount: subtotal + parseNum(match[4]),
                actualAmount: subtotal,
                refundAmount: parseNum(match[4]),
                prId: prMatch ? prMatch[1] : null
            };
        }
        return null;
    }, [remarks, subtotal]);

    // Clean notes without raw tags
    const cleanRemarks = useMemo(() => {
        if (!remarks) return '';
        return remarks
            .replace(/\[Expense Approval Settled:[^\]]+\]/gi, '')
            .replace(/\[(?:PR\s*#?|PR-)\d+\]/gi, '')
            .trim();
    }, [remarks]);

    const docItems = [
        { key: 'prForm', label: 'PR Form', desc: 'Requisition' },
        { key: 'cashAdvance', label: 'Cash Advance', desc: 'CA Voucher' },
        { key: 'checkout', label: 'Checkout', desc: 'Order Proof' },
        { key: 'paymentSlip', label: 'Payment Slip', desc: 'Transfer / VA' },
        { key: 'invoice', label: 'Official Invoice', desc: 'Faktur / Receipt' },
        { key: 'expenseApproval', label: 'Expense Approval', desc: 'Settlement' },
        { key: 'checkByRara', label: 'Audited by Finance', desc: 'Verification' }
    ];

    const verifiedDocsCount = docItems.filter(item => !!parsedDocs?.[item.key as keyof typeof parsedDocs]).length;
    const docProgressPercent = Math.round((verifiedDocsCount / docItems.length) * 100);

    const isPaid = status === 'Paid';

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen || !record) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto no-print">
            <style>
                {`
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 12mm; 
                    }
                    body * { visibility: hidden; }
                    #printable-invoice, #printable-invoice * { visibility: visible; }
                    #printable-invoice { 
                        position: fixed; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        padding: 0;
                        background: white !important;
                        color: black !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .no-print { display: none !important; }
                }
                `}
            </style>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-5xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh] border border-border/60 overflow-hidden font-sans">
                
                {/* Top Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted/60 border border-border/60 text-foreground rounded-xl flex items-center justify-center shrink-0">
                            <Receipt size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-lg font-semibold text-foreground">
                                    Purchase Details
                                </h2>
                                <span className={cn(
                                    "text-xs font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                                    isPaid 
                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 dark:border-emerald-800"
                                        : "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300 dark:border-amber-800"
                                )}>
                                    {isPaid ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                    {status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-muted-foreground">{company}</span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="text-xs font-medium text-muted-foreground">Divisi {department}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-xs font-medium text-muted-foreground mb-0.5">Transaction ID</div>
                            <div className="text-base font-mono font-semibold text-foreground tracking-tight">{transactionId}</div>
                            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                                <Calendar size={11} />
                                {purchaseDate}
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Modal Scrollable Body */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-8 space-y-6">
                    <div id="printable-invoice" className="space-y-6">

                        {/* Top 3 KPI Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card 1: Fiscal Value */}
                            <div className="p-5 rounded-2xl bg-muted/20 dark:bg-zinc-900/40 border border-border/40 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        Total Realisasi Belanja
                                    </span>
                                    <div className="p-1.5 bg-muted/60 border border-border/40 text-foreground rounded-lg">
                                        <DollarSign size={15} />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-foreground font-mono tracking-tight">
                                    {formatIDR(subtotal)}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                    <Package size={12} className="text-primary" />
                                    <span>Total Kuantitas: <strong>{qty} unit</strong> ({parsedItems.length || 1} rincian item)</span>
                                </div>
                            </div>

                            {/* Card 2: Vendor & Payment */}
                            <div className="p-5 rounded-2xl bg-muted/20 dark:bg-zinc-900/40 border border-border/40 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        Vendor & Pembayaran
                                    </span>
                                    <div className="p-1.5 bg-muted/60 border border-border/40 text-foreground rounded-lg">
                                        <CreditCard size={15} />
                                    </div>
                                </div>
                                <div className="text-lg font-semibold text-foreground truncate">
                                    {vendor}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs font-medium px-2 py-0.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-md">
                                        {paymentMethod}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Platform: {platform}
                                    </span>
                                </div>
                            </div>

                            {/* Card 3: Audit Compliance Progress */}
                            <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/10 border border-border/40 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        Kepatuhan Dokumen Audit
                                    </span>
                                    <div className="p-1.5 bg-muted/60 border border-border/40 text-foreground rounded-lg">
                                        <ShieldCheck size={15} />
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">
                                        {verifiedDocsCount} / {docItems.length}
                                    </span>
                                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                        Dokumen Lengkap ({docProgressPercent}%)
                                    </span>
                                </div>
                                <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div 
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${docProgressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Settlement Banner if Settled */}
                        {settlementData && (
                            <div className="bg-emerald-500/5 dark:bg-emerald-950/10 p-5 rounded-2xl border border-emerald-500/20 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="p-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-md">
                                            <ArrowDownCircle size={14} />
                                        </span>
                                        <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                            Penyelesaian Cash Advance (Settled)
                                        </h4>
                                        {settlementData.prId && (
                                            <span className="text-xs font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 rounded-md font-mono">
                                                PR-{String(settlementData.prId).padStart(4, '0')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-semibold bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                                        Voucher Expense Approval Terbit
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                                    <div className="p-3 bg-card rounded-xl border border-border/40">
                                        <span className="text-xs font-medium text-muted-foreground block mb-1">Plafon Awal Cash Advance (CA)</span>
                                        <span className="font-mono font-semibold text-foreground text-sm">
                                            Rp {formatNumber(settlementData.caAmount)}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-card rounded-xl border border-border/40">
                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block mb-1">Realisasi Pengeluaran Riil</span>
                                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                                            Rp {formatNumber(settlementData.actualAmount)}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-card rounded-xl border border-border/40">
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400 block mb-1">Dana Dikembalikan ke Kas</span>
                                        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400 text-sm">
                                            +Rp {formatNumber(Math.abs(settlementData.refundAmount))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main 2-Column Content Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            {/* --- LEFT COLUMN: ITEM DETAILS & PROFILE (7 COLS) --- */}
                            <div className="lg:col-span-7 space-y-6">

                                {/* Requester & Procurement Metadata */}
                                <div className="p-5 rounded-2xl bg-muted/20 dark:bg-zinc-900/30 border border-border/40 space-y-4">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border/60">
                                        <User size={14} className="text-primary" />
                                        Informasi Pemohon & Kategori
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Pemohon / User</span>
                                            <span className="font-semibold text-foreground text-sm">{user}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Kategori Pengadaan</span>
                                            <span className="inline-flex items-center gap-1 font-medium text-xs px-2.5 py-1 bg-muted/40 border border-border/50 text-foreground rounded-md">
                                                <Layers size={11} className="text-indigo-500" />
                                                {category}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Proyek / Alokasi</span>
                                            <span className="text-sm font-medium text-foreground">{projectName}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Petugas Input / Sistem</span>
                                            <span className="text-sm text-muted-foreground">{inputBy}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Item Description / Project Subject */}
                                <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
                                    <span className="text-xs font-semibold text-muted-foreground block">
                                        Judul & Deskripsi Pengadaan
                                    </span>
                                    <p className="text-base font-semibold text-foreground leading-snug">
                                        "{description}"
                                    </p>
                                </div>

                                {/* Itemized Table */}
                                {parsedItems.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <Tag size={14} className="text-primary" />
                                                Rincian Item Pembelian ({parsedItems.length})
                                            </h3>
                                        </div>

                                        <div className="border border-border rounded-2xl overflow-hidden bg-card">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-muted/30 border-b">
                                                    <tr className="text-xs font-semibold text-muted-foreground">
                                                        <th className="px-5 py-3">Nama Barang / Spesifikasi</th>
                                                        <th className="px-4 py-3 text-center">Qty</th>
                                                        <th className="px-4 py-3 text-right">Harga Satuan</th>
                                                        <th className="px-5 py-3 text-right">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {parsedItems.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-muted/40 transition-colors">
                                                            <td className="px-5 py-3.5">
                                                                <p className="font-semibold text-foreground text-xs mb-0.5">{item.description || '-'}</p>
                                                                {item.vendor && (
                                                                    <span className="text-xs text-muted-foreground font-medium">Vendor: {item.vendor}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center">
                                                                <span className="font-medium font-mono px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                                                                    {item.qty || 1}x
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                                                                {formatIDR(Number(item.price) || 0)}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right font-mono font-semibold text-primary">
                                                                {formatIDR((Number(item.price) || 0) * (Number(item.qty) || 1))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-muted/20 border-t">
                                                    <tr>
                                                        <td colSpan={3} className="px-5 py-3 font-medium text-muted-foreground text-xs text-right">
                                                            Total Subtotal
                                                        </td>
                                                        <td className="px-5 py-3 text-right font-mono font-semibold text-foreground text-sm">
                                                            {formatIDR(subtotal)}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- RIGHT COLUMN: COMPLIANCE & NOTES (5 COLS) --- */}
                            <div className="lg:col-span-5 space-y-6">

                                {/* Document Compliance Matrix */}
                                <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-border/60">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-emerald-500" />
                                            Kelengkapan Dokumen Audit
                                        </h3>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {verifiedDocsCount} / {docItems.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {docItems.map((item) => {
                                            const isChecked = !!parsedDocs?.[item.key as keyof typeof parsedDocs];
                                            return (
                                                <div
                                                    key={item.key}
                                                    className={cn(
                                                        "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                                                        isChecked
                                                            ? "bg-emerald-500/10 border-emerald-500/25 text-foreground"
                                                            : "bg-muted/20 border-border/50 text-muted-foreground opacity-60"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                                            isChecked ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {isChecked ? <Check size={12} strokeWidth={3} /> : <X size={10} />}
                                                        </div>
                                                        <span className={cn("font-medium text-sm", isChecked ? "text-foreground" : "")}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        {isChecked ? 'Terverifikasi' : 'Belum Ada'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {evidenceLink && (
                                        <div className="pt-2 border-t border-border/60">
                                            <a
                                                href={evidenceLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full p-2.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-sm font-medium transition-colors border border-primary/20"
                                            >
                                                <ExternalLink size={13} />
                                                Buka Dokumen Bukti Pembelian / Invoice
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Remarks & Operational Notes */}
                                {cleanRemarks && (
                                    <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 space-y-2">
                                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 pb-1 border-b border-amber-500/20">
                                            <ShieldAlert size={14} />
                                            <h4 className="text-sm font-semibold">Catatan Tambahan (Remarks)</h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pt-1">
                                            {cleanRemarks}
                                        </p>
                                    </div>
                                )}

                                {/* System Audit Seal */}
                                <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-center space-y-1">
                                    <div className="text-xs font-semibold text-muted-foreground">Digital Ledger Audit ID</div>
                                    <div className="font-mono text-xs font-medium text-foreground select-all">
                                        GESIT_PR_{(transactionId || '').replace(/-/g, '_')}_VERIFIED
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Database ID: #{record?.id} • Terdaftar di Log Finansial
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-3.5 border-t border-border/40 bg-muted/10 shrink-0 flex flex-row justify-between items-center no-print">
                    <Button variant="outline" onClick={onClose}>
                        Tutup
                    </Button>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                setIsSyncing(true);
                                try {
                                    await sendToGoogleSheet(record);
                                    showToast('Berhasil disinkronkan ke Google Sheet!', 'success');
                                } catch (e: any) {
                                    showToast('Gagal sinkronisasi: ' + (e.message || ''), 'error');
                                } finally {
                                    setIsSyncing(false);
                                }
                            }}
                            disabled={isSyncing}
                            className="gap-2"
                        >
                            {isSyncing ? <RefreshCcw className="animate-spin" size={14} /> : <FileSpreadsheet className="text-emerald-600" size={14} />}
                            {isSyncing ? 'Menyinkronkan...' : 'Sync ke Google Sheet'}
                        </Button>
                        <Button
                            onClick={handlePrint}
                            className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                            <Printer size={14} /> Cetak / Print Record
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
