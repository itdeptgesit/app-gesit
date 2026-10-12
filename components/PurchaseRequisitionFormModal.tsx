'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createPortal } from 'react-dom';
import { cn } from "@/lib/utils";
import { X, Calendar, FileText, Plus, Trash2, Shield, Info, DollarSign } from 'lucide-react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { PurchaseRequisition, PurchaseRequisitionItem, ITRecommendationItem, UserAccount } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface PurchaseRequisitionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<PurchaseRequisition>) => void;
    currentUser: UserAccount | null;
    allUsers: UserAccount[];
    initialData?: PurchaseRequisition | null;
    usdRate?: number;
}

const formatNumberString = (value: string | number): string => {
    if (value === undefined || value === null || value === '') return '';
    let strValue = String(value);
    
    // If it's a plain JS number with a dot, convert dot to comma
    if (typeof value === 'number') {
        strValue = strValue.replace('.', ',');
    }
    
    // Keep only digits and commas
    const clean = strValue.replace(/[^0-9,]/g, '');
    if (!clean) return '';
    
    // Split into integer and decimal parts
    const parts = clean.split(',');
    let intPart = parts[0];
    let decPart = parts.length > 1 ? ',' + parts[1] : '';
    
    if (intPart) {
        intPart = new Intl.NumberFormat('id-ID').format(parseInt(intPart, 10));
    }
    
    return intPart + decPart;
};

const isManagementUser = (user: UserAccount): boolean =>
    Array.isArray(user.groups) && user.groups.some(g => ['management', 'it_management', 'csl_admin', 'admin'].includes(String(g).toLowerCase()));

const parseNumberString = (value: string): any => {
    let clean = value.replace(/[^0-9,]/g, '');
    const parts = clean.split(',');
    if (parts.length > 2) {
        clean = parts[0] + ',' + parts.slice(1).join('');
    }
    return clean;
};

const parseToFloat = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    let clean = String(value).replace(/\./g, '');
    clean = clean.replace(/,/g, '.');
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
};

export const PurchaseRequisitionFormModal: React.FC<PurchaseRequisitionFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    currentUser,
    allUsers,
    initialData,
    usdRate = 16300
}) => {
    // Local form states
    const [department, setDepartment] = useState('');
    const [paidTo, setPaidTo] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [notes, setNotes] = useState('');
    const [category, setCategory] = useState('');
    const [company, setCompany] = useState('');
    const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
    const [discount, setDiscount] = useState<number | string>(0);
    const [deliveryFee, setDeliveryFee] = useState<number | string>(0);
    
    // Requested items list
    const [reqItems, setReqItems] = useState<PurchaseRequisitionItem[]>([
        { no: 1, description: '', qty: 1 }
    ]);
    
    // IT Recommendation items list
    const [recItems, setRecItems] = useState<ITRecommendationItem[]>([
        { no: 1, description: '', qty: 1, vendor: '', price: 0 }
    ]);

    // Approver selections
    const [supervisorId, setSupervisorId] = useState('');
    const [vpId, setVpId] = useState('');
    const [financeId, setFinanceId] = useState('');
    const [accountingId, setAccountingId] = useState('');

    // Fetch companies and departments from Supabase
    useEffect(() => {
        supabase.from('companies').select('id, name').order('name').then(({ data }) => {
            if (data && data.length > 0) {
                setCompanies(data);
                setCompany(prev => prev || data[0].name);
            }
        });
        supabase.from('departments').select('id, name').order('name').then(({ data }) => {
            if (data && data.length > 0) {
                setDepartments(data);
            }
        });
    }, []);

    // Reset form to baseline default values
    const resetToDefaults = () => {
        if (!currentUser) return;
        setDepartment(currentUser.department || 'IT');
        setCompany(companies[0]?.name || '');
        setPaidTo('');
        setBankAccount('');
        setNotes('');
        setCategory('');
        setDiscount(0);
        setDeliveryFee(0);
        setReqItems([{ no: 1, description: '', qty: 1 }]);
        setRecItems([{ no: 1, description: '', qty: 1, vendor: '', price: 0 }]);

        // Pre-select Supervisor
        if (currentUser.supervisorId) {
            setSupervisorId(currentUser.supervisorId);
        } else if (currentUser.managerId) {
            setSupervisorId(currentUser.managerId);
        } else {
            const defaultSpv = allUsers.find(u => isManagementUser(u) || u.role === 'Admin');
            setSupervisorId(defaultSpv ? String(defaultSpv.id) : '');
        }

        // Pre-select VP based on hierarchy or Department
        const deptLower = (currentUser.department || '').toLowerCase().trim();
        const isOperations = deptLower.includes('it') || deptLower.includes('gnr') || deptLower.includes('trading') || deptLower.includes('prop') || deptLower.includes('rheem') || deptLower.includes('aams') || deptLower.includes('foundation');
        
        if (currentUser.vpId) {
            setVpId(currentUser.vpId);
        } else if (isOperations) {
            const vpLogisticUser = allUsers.find(u => (u.department || '').toLowerCase().includes('it') && (isManagementUser(u) || u.role === 'Admin'));
            setVpId(vpLogisticUser ? String(vpLogisticUser.id) : '');
        } else {
            const vpHrUser = allUsers.find(u => (u.department || '').toLowerCase().includes('hrl') && (isManagementUser(u) || u.role === 'Admin' || u.jobTitle === 'Manager'));
            setVpId(vpHrUser ? String(vpHrUser.id) : '');
        }

        // Pre-select Finance
        const financeUser = allUsers.find(u => (u.department || '').toLowerCase().includes('finance') || (u.jobTitle || '').toLowerCase().includes('finance'));
        setFinanceId(financeUser ? String(financeUser.id) : '');

        // Pre-select Accounting
        const accountingUser = allUsers.find(u => (u.department || '').toLowerCase().includes('accounting') || (u.jobTitle || '').toLowerCase().includes('accounting'));
        setAccountingId(accountingUser ? String(accountingUser.id) : (financeUser ? String(financeUser.id) : ''));
    };

    // Load draft or initialData (edit mode) from localStorage on open
    useEffect(() => {
        if (isOpen && currentUser) {
            if (initialData) {
                // EDIT MODE: prefill all fields from existing record
                setDepartment(initialData.department || '');
                setCompany(initialData.company || companies[0]?.name || '');
                setPaidTo(initialData.paidTo || '');
                setBankAccount(initialData.bankAccount || '');
                setNotes(initialData.notes || '');
                setCategory(initialData.category || '');
                setCurrency((initialData.currency as 'IDR' | 'USD') || 'IDR');
                setDiscount(initialData.discount || 0);
                setDeliveryFee(initialData.deliveryFee || 0);
                setReqItems(initialData.requestedItems?.length ? initialData.requestedItems : [{ no: 1, description: '', qty: 1 }]);
                setRecItems(initialData.itRecommendations?.length ? initialData.itRecommendations : [{ no: 1, description: '', qty: 1, vendor: '', price: 0 }]);
                setSupervisorId(initialData.supervisorId || '');
                setVpId(initialData.vpId || '');
                setFinanceId(initialData.financeId || '');
                setAccountingId(initialData.accountingId || '');
            } else {
                // NEW MODE: load draft or reset
                try {
                    const savedDraft = localStorage.getItem('gesit_pr_requisition_draft');
                    if (savedDraft) {
                        const draft = JSON.parse(savedDraft);
                        if (draft.department !== undefined) setDepartment(draft.department);
                        if (draft.company !== undefined) setCompany(draft.company);
                        if (draft.paidTo !== undefined) setPaidTo(draft.paidTo);
                        if (draft.bankAccount !== undefined) setBankAccount(draft.bankAccount);
                        if (draft.notes !== undefined) setNotes(draft.notes);
                        if (draft.category !== undefined) setCategory(draft.category);
                        if (draft.currency !== undefined) setCurrency(draft.currency);
                        if (draft.reqItems !== undefined) setReqItems(draft.reqItems);
                        if (draft.recItems !== undefined) setRecItems(draft.recItems);
                        if (draft.supervisorId !== undefined) setSupervisorId(draft.supervisorId);
                        if (draft.vpId !== undefined) setVpId(draft.vpId);
                        if (draft.financeId !== undefined) setFinanceId(draft.financeId);
                        if (draft.accountingId !== undefined) setAccountingId(draft.accountingId);
                        if (draft.discount !== undefined) setDiscount(draft.discount);
                        if (draft.deliveryFee !== undefined) setDeliveryFee(draft.deliveryFee);
                    } else {
                        resetToDefaults();
                    }
                } catch (e) {
                    console.error("Failed to load PR requisition draft:", e);
                    resetToDefaults();
                }
            }
        }
    }, [isOpen, currentUser, allUsers, initialData]);

    // Save draft to localStorage on state changes
    useEffect(() => {
        if (isOpen && !initialData) {
            try {
                const draft = {
                    department,
                    company,
                    paidTo,
                    bankAccount,
                    notes,
                    category,
                    currency,
                    reqItems,
                    recItems,
                    supervisorId,
                    vpId,
                    financeId,
                    accountingId,
                    discount,
                    deliveryFee
                };
                localStorage.setItem('gesit_pr_requisition_draft', JSON.stringify(draft));
            } catch (e) {
                console.error("Failed to save PR draft:", e);
            }
        }
    }, [
        isOpen, initialData, department, company, paidTo, bankAccount, notes, category, currency,
        reqItems, recItems, supervisorId, vpId, financeId, accountingId, discount, deliveryFee
    ]);



    // Requested Items Helpers
    const handleAddReqItem = () => {
        setReqItems(prev => [...prev, { no: prev.length + 1, description: '', qty: 1 }]);
    };

    const handleRemoveReqItem = (idx: number) => {
        if (reqItems.length === 1) return;
        const newItems = reqItems.filter((_, i) => i !== idx).map((item, i) => ({ ...item, no: i + 1 }));
        setReqItems(newItems);
    };

    const handleReqItemChange = (idx: number, field: keyof PurchaseRequisitionItem, value: any) => {
        const newItems = [...reqItems];
        newItems[idx] = { ...newItems[idx], [field]: value };
        setReqItems(newItems);
    };

    // IT Recommendation Helpers
    const handleAddRecItem = () => {
        setRecItems(prev => [...prev, { no: prev.length + 1, description: '', qty: 1, vendor: '', price: 0 }]);
    };

    const handleRemoveRecItem = (idx: number) => {
        if (recItems.length === 1) return;
        const newItems = recItems.filter((_, i) => i !== idx).map((item, i) => ({ ...item, no: i + 1 }));
        setRecItems(newItems);
    };

    const handleRecItemChange = (idx: number, field: keyof ITRecommendationItem, value: any) => {
        const newItems = [...recItems];
        newItems[idx] = { ...newItems[idx], [field]: value };
        setRecItems(newItems);
    };

    // Calculate Grand Total
    const subTotal = recItems.reduce((sum, item) => sum + (parseToFloat(item.price) || 0) * (Number(item.qty) || 0), 0);
    const grandTotal = Math.max(0, subTotal - (parseToFloat(discount) || 0) + (parseToFloat(deliveryFee) || 0));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filter out empty rows
        const filteredReqItems = reqItems.filter(item => item.description.trim() !== '');
        const filteredRecItems = recItems.filter(item => item.description.trim() !== '');

        if (!category) {
            alert('Please select a category first.');
            return;
        }

        if (filteredReqItems.length === 0) {
            alert('Please add at least one requested item.');
            return;
        }

        const payload: Partial<PurchaseRequisition> = {
            requesterUsername: currentUser?.username || 'Staff',
            requesterFullname: currentUser?.fullName || 'IT Staff',
            department: department,
            company: company || companies[0]?.name || '',
            requestDate: initialData?.requestDate || new Date().toISOString().split('T')[0],
            paidTo: paidTo,
            bankAccount: bankAccount,
            requestedItems: filteredReqItems,
            itRecommendations: filteredRecItems.map(item => ({
                ...item,
                price: parseToFloat(item.price)
            })),
            notes: notes,
            grandTotal: grandTotal,
            discount: parseToFloat(discount) || 0,
            deliveryFee: parseToFloat(deliveryFee) || 0,
            currency: currency,
            status: initialData?.status || 'Pending Supervisor',
            category: category,
            supervisorId: supervisorId || null,
            supervisorName: allUsers.find(u => String(u.id) === supervisorId)?.fullName || null,
            vpId: vpId || null,
            vpName: allUsers.find(u => String(u.id) === vpId)?.fullName || null,
            financeId: financeId || null,
            financeName: allUsers.find(u => String(u.id) === financeId)?.fullName || null,
            accountingId: accountingId || null,
            accountingName: allUsers.find(u => String(u.id) === accountingId)?.fullName || null
        };

        try {
            localStorage.removeItem('gesit_pr_requisition_draft');
        } catch (e) {
            console.error(e);
        }

        onSubmit(payload);
    };

    const labelClass = "block text-sm font-medium text-foreground mb-1.5";
    const inputClass = "w-full bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus-visible:ring-1 focus-visible:ring-primary/20 text-xs";

    return (
      <ModalWrapper isOpen={isOpen} onClose={onClose} className="border border-border/60">
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-muted/60 border border-border/60 text-foreground rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {initialData ? 'Edit Purchase Requisition' : 'Formulir PR Material Support IT'}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                {initialData ? `Editing PR-${String(initialData.id).padStart(4, '0')}` : 'Create Purchase Requisition Document'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="prFormSubmit" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Requester Metadata Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                            <div>
                                <label className={labelClass}>Nama Pemohon</label>
                                <Input className={cn(inputClass, "bg-slate-100/70 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 cursor-not-allowed")} value={currentUser?.fullName || ''} disabled />
                            </div>
                            <div>
                                <label className={labelClass}>Departemen</label>
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="w-full bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 h-9 text-xs font-medium">
                                        <SelectValue placeholder="Pilih departemen..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[220px]">
                                        {departments.length > 0
                                            ? departments.map(d => <SelectItem key={d.id} value={d.name} className="text-xs">{d.name}</SelectItem>)
                                            : <SelectItem value={department || 'IT'} className="text-xs">{department || 'IT'}</SelectItem>
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClass}>Tanggal Request</label>
                                <Input className={cn(inputClass, "bg-slate-100/70 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 cursor-not-allowed")} value={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} disabled />
                            </div>
                        </div>

                        {/* Company, Category, Currency Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                            <div>
                                <label className={labelClass}>Company</label>
                                <Select value={company} onValueChange={setCompany}>
                                    <SelectTrigger className="w-full bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 h-9 text-xs font-medium">
                                        <SelectValue placeholder="-- Pilih Company --" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[220px]">
                                        {companies.map(c => <SelectItem key={c.id} value={c.name} className="text-xs">{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClass}>Category</label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="w-full bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 h-9 text-xs">
                                        <SelectValue placeholder="Pilih kategori..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Hardware" className="text-xs">🖥️ Hardware</SelectItem>
                                        <SelectItem value="Accessories" className="text-xs">🖱️ Accessories</SelectItem>
                                        <SelectItem value="Cloud & Hosting" className="text-xs">☁️ Cloud & Hosting</SelectItem>
                                        <SelectItem value="Subscription" className="text-xs">📦 Subscription</SelectItem>
                                        <SelectItem value="Maintenance & Support" className="text-xs">🔧 Maintenance & Support</SelectItem>
                                        <SelectItem value="IT Services" className="text-xs">💼 IT Services</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelClass}>Currency</label>
                                <Select value={currency} onValueChange={(v) => setCurrency(v as 'IDR' | 'USD')}>
                                    <SelectTrigger className="w-full bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 h-9 text-xs font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IDR" className="font-bold text-xs">🇮🇩 IDR — Rupiah</SelectItem>
                                        <SelectItem value="USD" className="font-bold text-xs">🇺🇸 USD — Dollar</SelectItem>
                                    </SelectContent>
                                </Select>
                                {currency === 'USD' && (
                                    <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary">
                                        <span>$1</span><span className="text-muted-foreground">=</span>
                                        <span>Rp {new Intl.NumberFormat('id-ID').format(usdRate)}</span>
                                        <span className="text-xs text-muted-foreground font-medium">today</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Target Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-5 rounded-xl border border-border/40">
                            <div>
                                <label className={labelClass}>Paid To (Penerima Dana)</label>
                                <Input className={inputClass} placeholder="e.g. Bendry (Tokopedia)" value={paidTo} onChange={e => setPaidTo(e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelClass}>No. Rekening / Bank</label>
                                <Input className={inputClass} placeholder="e.g. 3080 277 368 – BCA" value={bankAccount} onChange={e => setBankAccount(e.target.value)} required />
                            </div>
                        </div>

                        {/* TABLE 1: Permohonan dari Pengguna */}
                        <div className="rounded-xl border border-slate-200 dark:border-zinc-700/80 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">1</div>
                                    <h3 className="text-sm font-semibold text-foreground">Permohonan dari Pengguna</h3>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddReqItem} className="h-7 gap-1">
                                    <Plus size={11} /> Add Row
                                </Button>
                            </div>
                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-muted/10 border-b border-border/60">
                                <div className="col-span-1 text-xs font-medium text-muted-foreground text-center">No</div>
                                <div className="col-span-10 text-xs font-medium text-muted-foreground">Deskripsi Barang / Asset</div>
                                <div className="col-span-1 text-xs font-medium text-muted-foreground text-center">Qty</div>
                            </div>
                            <div className="divide-y divide-border bg-card">
                                {reqItems.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-3 items-center px-4 py-2.5 group animate-in fade-in slide-in-from-top-1 duration-150 hover:bg-muted/40 transition-colors">
                                        <div className="col-span-1 text-center text-xs font-semibold text-muted-foreground font-mono">{idx + 1}</div>
                                        <div className="col-span-9">
                                            <Input
                                                className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-border focus-visible:ring-0 focus-visible:border-primary text-xs font-medium text-foreground placeholder:text-muted-foreground rounded-none px-0 h-7"
                                                placeholder="Tuliskan deskripsi barang atau asset yang dibutuhkan..."
                                                value={item.description}
                                                onChange={e => handleReqItemChange(idx, 'description', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input
                                                type="number" min="1"
                                                className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-border focus-visible:ring-0 focus-visible:border-primary text-xs font-bold text-center font-mono text-foreground placeholder:text-muted-foreground rounded-none px-0 h-7"
                                                value={item.qty}
                                                onChange={e => handleReqItemChange(idx, 'qty', parseInt(e.target.value, 10) || 1)}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            <button type="button" onClick={() => handleRemoveReqItem(idx)} disabled={reqItems.length === 1}
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors disabled:pointer-events-none p-1 rounded">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TABLE 2: Rekomendasi oleh IT */}
                        <div className="rounded-xl border border-slate-200 dark:border-zinc-700/80 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold">2</div>
                                    <h3 className="text-sm font-semibold text-foreground">Rekomendasi IT — Untuk Purchase</h3>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddRecItem} className="h-7 gap-1">
                                    <Plus size={11} /> Add Row
                                </Button>
                            </div>
                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/10 border-b border-border/60">
                                <div className="col-span-1 text-xs font-medium text-muted-foreground text-center">No</div>
                                <div className="col-span-4 text-xs font-medium text-muted-foreground">Spesifikasi / Barang</div>
                                <div className="col-span-1 text-xs font-medium text-muted-foreground text-center">Qty</div>
                                <div className="col-span-2 text-xs font-medium text-muted-foreground">Vendor</div>
                                <div className="col-span-2 text-xs font-medium text-muted-foreground text-right">Harga Satuan</div>
                                <div className="col-span-1 text-xs font-medium text-muted-foreground text-right">Total</div>
                                <div className="col-span-1"></div>
                            </div>
                            <div className="divide-y divide-border bg-card">
                                {recItems.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 group animate-in fade-in slide-in-from-top-1 duration-150 hover:bg-muted/40 transition-colors">
                                        <div className="col-span-1 text-center text-xs font-semibold text-muted-foreground font-mono">{idx + 1}</div>
                                        
                                        <div className="col-span-4">
                                            <Input
                                                className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-border focus-visible:ring-0 focus-visible:border-primary text-xs font-medium text-foreground placeholder:text-muted-foreground rounded-none px-0 h-7"
                                                placeholder="Spesifikasi barang..."
                                                value={item.description}
                                                onChange={e => handleRecItemChange(idx, 'description', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input
                                                type="number" min="1"
                                                className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-border focus-visible:ring-0 focus-visible:border-primary text-xs font-bold text-center font-mono text-foreground placeholder:text-muted-foreground rounded-none px-0 h-7"
                                                value={item.qty}
                                                onChange={e => handleRecItemChange(idx, 'qty', parseInt(e.target.value, 10) || 1)}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Input
                                                className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-border focus-visible:ring-0 focus-visible:border-primary text-xs font-medium text-foreground placeholder:text-muted-foreground rounded-none px-0 h-7"
                                                placeholder="Nama vendor"
                                                value={item.vendor}
                                                onChange={e => handleRecItemChange(idx, 'vendor', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Input
                                                type="text"
                                                className="w-full bg-transparent border-0 border-b border-transparent group-hover:border-border focus-visible:ring-0 focus-visible:border-primary text-xs font-mono text-right text-foreground placeholder:text-muted-foreground rounded-none px-0 h-7"
                                                placeholder="0"
                                                value={formatNumberString(item.price)}
                                                onChange={e => handleRecItemChange(idx, 'price', parseNumberString(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-1 text-right text-xs font-mono font-semibold text-muted-foreground">
                                            {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format((parseToFloat(item.price) || 0) * (item.qty || 1))}
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            <button type="button" onClick={() => handleRemoveRecItem(idx)} disabled={recItems.length === 1}
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors disabled:pointer-events-none p-1 rounded">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Catatan / Notes */}
                        <div>
                            <label className={labelClass}>Catatan Tambahan</label>
                            <Textarea
                                rows={3}
                                className="w-full bg-slate-50/50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 focus-visible:ring-1 focus-visible:ring-primary/20 text-xs resize-none"
                                placeholder="Tulis catatan, e.g. Kabel Cat5 & Cat6 Dahua 305m : untuk Line Telepon & Data (F&A)..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Summary, Discount, and Delivery Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-muted/20 p-6 rounded-2xl border border-border/40">
                            {/* Input section on the left: col-span-7 */}
                            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Penyesuaian Biaya (Opsional)</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-foreground block mb-1.5">Diskon Pembelian</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{currency === 'USD' ? '$' : 'Rp'}</span>
                                                <Input 
                                                    type="text" 
                                                    className={cn(inputClass, "pl-9 font-mono text-xs")} 
                                                    placeholder="Masukkan jumlah diskon" 
                                                    value={formatNumberString(discount)} 
                                                    onChange={e => setDiscount(parseNumberString(e.target.value))} 
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1 block">Akan dikurangi langsung dari total rekomendasi IT.</span>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-sm font-medium text-foreground">Ongkos Kirim</label>
                                                {(!parseToFloat(deliveryFee) || parseToFloat(deliveryFee) === 0) && (
                                                    <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                                        Gratis Ongkir!
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{currency === 'USD' ? '$' : 'Rp'}</span>
                                                <Input 
                                                    type="text" 
                                                    className={cn(inputClass, "pl-9 font-mono text-xs")} 
                                                    placeholder="Masukkan ongkos kirim" 
                                                    value={formatNumberString(deliveryFee)} 
                                                    onChange={e => setDeliveryFee(parseNumberString(e.target.value))} 
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1 block">Beri nilai 0 atau kosong jika Gratis Ongkir.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Grand Total Summary on the right: col-span-5 */}
                            <div className="lg:col-span-5 bg-muted/20 p-5 rounded-xl border border-border/40 flex flex-col justify-between min-h-[140px]">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground pb-1 border-b border-border/40">Ringkasan Pembayaran</h4>
                                    
                                    <div className="space-y-1.5 pt-1">
                                        <div className="text-sm text-muted-foreground flex justify-between">
                                            <span>Subtotal Item IT</span>
                                            <span className="font-mono font-semibold text-foreground">
                                                {currency === 'USD'
                                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(subTotal)
                                                    : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(subTotal)}
                                            </span>
                                        </div>
                                        {parseToFloat(discount) > 0 && (
                                            <div className="text-sm font-medium text-rose-500 dark:text-rose-400 flex justify-between animate-in fade-in slide-in-from-top-1 duration-150">
                                                <span>Diskon Pembelian</span>
                                                <span className="font-mono font-semibold">
                                                    -{currency === 'USD'
                                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(parseToFloat(discount))
                                                        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(parseToFloat(discount))}
                                                </span>
                                            </div>
                                        )}
                                        {parseToFloat(deliveryFee) > 0 && (
                                            <div className="text-sm font-medium text-blue-500 dark:text-blue-400 flex justify-between animate-in fade-in slide-in-from-top-1 duration-150">
                                                <span>Ongkos Kirim</span>
                                                <span className="font-mono font-semibold">
                                                    +{currency === 'USD'
                                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(parseToFloat(deliveryFee))
                                                        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(parseToFloat(deliveryFee))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 mt-3 border-t border-border/40">
                                    <span className="text-xs font-semibold text-muted-foreground block mb-2">Grand Total Commitment</span>
                                    <div className="flex items-end justify-between gap-2">
                                        <div>
                                            <span className="text-2xl font-bold text-foreground tracking-tight font-mono">
                                                {currency === 'USD'
                                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(grandTotal)
                                                    : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(grandTotal)}
                                            </span>
                                            {currency === 'USD' && grandTotal > 0 && (
                                                <div className="mt-1.5 flex items-center gap-1.5">
                                                    <span className="text-xs text-muted-foreground font-medium">≈</span>
                                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(grandTotal * usdRate)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center border border-border/40">
                                                <DollarSign size={14} className="text-primary" />
                                            </div>
                                            {currency === 'USD' && (
                                                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono whitespace-nowrap">
                                                    $1 = Rp {new Intl.NumberFormat('id-ID').format(usdRate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Workflow Approvers Routing Options */}
                        <div className="border-t border-border/60 pt-6">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Shield size={14} className="text-primary" /> Approval Routing Tree
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-5 rounded-xl border border-border/40">
                                
                                {/* 1. Atasan Langsung */}
                                <div>
                                    <label className={labelClass}>Atasan Langsung</label>
                                    <Select value={supervisorId} onValueChange={setSupervisorId}>
                                        <SelectTrigger className="w-full h-9">
                                            <SelectValue placeholder="Select Supervisor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allUsers.filter(u => u.role !== 'User' || isManagementUser(u) || String(u.id) === supervisorId).map(u => (
                                                <SelectItem key={u.id} value={String(u.id)} className="text-sm">
                                                    {u.fullName} ({u.jobTitle || 'SPV'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 2. VP HR / Logistic */}
                                <div>
                                    <label className={labelClass}>VP HR & Logistic</label>
                                    <Select value={vpId} onValueChange={setVpId}>
                                        <SelectTrigger className="w-full h-9">
                                            <SelectValue placeholder="Select VP" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allUsers.filter(u => isManagementUser(u) || u.role === 'Admin' || String(u.id) === vpId).map(u => (
                                                <SelectItem key={u.id} value={String(u.id)} className="text-sm">
                                                    {u.fullName} (VP / {u.department || 'MGMT'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 3. Finance (Hidden from UI but included in payload) */}
                                <div className="hidden">
                                    <label className={labelClass}>Finance</label>
                                    <Select value={financeId} onValueChange={setFinanceId}>
                                        <SelectTrigger className="w-full h-9">
                                            <SelectValue placeholder="Select Finance" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allUsers.map(u => (
                                                <SelectItem key={u.id} value={String(u.id)} className="text-sm">
                                                    {u.fullName} ({u.department || 'Finance'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 4. Accounting (Hidden from UI but included in payload) */}
                                <div className="hidden">
                                    <label className={labelClass}>Accounting</label>
                                    <Select value={accountingId} onValueChange={setAccountingId}>
                                        <SelectTrigger className="w-full h-9">
                                            <SelectValue placeholder="Select Accounting" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allUsers.map(u => (
                                                <SelectItem key={u.id} value={String(u.id)} className="text-sm">
                                                    {u.fullName} ({u.department || 'Accounting'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>
                        </div>

                        {/* Notice Box */}
                        <div className="bg-muted/20 p-5 rounded-lg border border-border/40 flex items-start gap-4">
                            <Info size={16} className="text-muted-foreground mt-1 shrink-0" />
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Submitting this request initiates the multi-stage electronic approval flow. The workflow runs sequentially: Atasan Langsung → VP HR/Logistic → Finance → Accounting. You can track status and download the formal signed PDF at any time.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-3.5 border-t border-border/40 bg-muted/10 flex justify-between items-center shrink-0">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20" 
                        onClick={() => {
                            if (window.confirm("Are you sure you want to clear this draft and reset the form?")) {
                                try {
                                    localStorage.removeItem('gesit_pr_requisition_draft');
                                } catch(e){}
                                resetToDefaults();
                            }
                        }}
                    >
                        Reset Form
                    </Button>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" form="prFormSubmit" className="min-w-[150px]">
                            Submit Request
                        </Button>
                    </div>
                </div>
            </ModalWrapper>
);
};
