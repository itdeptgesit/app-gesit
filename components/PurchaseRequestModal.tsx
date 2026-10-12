'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, ShoppingBag, ShieldCheck, Info } from 'lucide-react';
import { PurchasePlan, UserAccount } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PurchaseRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<PurchasePlan>) => void;
    currentUserName?: string;
    currentUser?: UserAccount | null;
}

export const PurchaseRequestModal: React.FC<PurchaseRequestModalProps> = ({ isOpen, onClose, onSubmit, currentUserName, currentUser }) => {
    const [formData, setFormData] = useState<Partial<PurchasePlan>>({
        requester: currentUser?.username || currentUserName || 'Staff',
        requestDate: new Date().toISOString().split('T')[0],
        status: 'Approved',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
    });

    useEffect(() => {
        if (isOpen && currentUser) {
            // Smart Routing Logic: Determine starting status based on hierarchy
            let initialStatus = 'Approved'; // Default jika tidak ada hierarki
            if (currentUser.supervisorId) {
                initialStatus = 'Pending Supervisor';
            } else if (currentUser.managerId) {
                initialStatus = 'Pending Manager';
            }

            setFormData(prev => ({
                ...prev,
                requester: currentUser.username,
                status: initialStatus as any
            }));
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const handleChange = (field: keyof PurchasePlan, value: string | number) => {
        let newData = { ...formData, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
            const qty = field === 'quantity' ? Number(value) : (formData.quantity || 0);
            const price = field === 'unitPrice' ? Number(value) : (formData.unitPrice || 0);
            newData.totalPrice = qty * price;
        }
        setFormData(newData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:border-blue-500 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 transition-all font-medium placeholder:text-slate-400 shadow-none";
    const labelClass = "block text-sm font-medium text-foreground mb-1.5";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh] border border-border/60 font-sans">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-muted/60 border border-border/60 text-foreground rounded-lg">
                            <ShoppingBag size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Procurement Request</h2>
                            <p className="text-xs text-muted-foreground mt-1">Authorization Terminal</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="purchaseForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-muted/30 border border-border/50 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={18} className="text-primary" />
                                <div>
                                    <p className="text-xs font-semibold text-primary">Routing Status</p>
                                    <p className="text-sm font-semibold text-foreground">{formData.status}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-muted-foreground">Requester Account</p>
                                <p className="text-sm font-semibold text-foreground">{formData.requester}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Item Identity</label>
                                <Input className={inputClass} value={formData.item || ''} onChange={(e) => handleChange('item', e.target.value)} placeholder="e.g. Dell PowerEdge R750 Server" required />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Technical Requirements</label>
                                <Textarea rows={3} className={`${inputClass} resize-none min-h-[5rem]`} value={formData.specs || ''} onChange={(e) => handleChange('specs', e.target.value)} placeholder="Hardware configuration, CPU, RAM, Storage, Model number..." required />
                            </div>

                            <div>
                                <label className={labelClass}>Market Vendor</label>
                                <Input className={inputClass} value={formData.vendor || ''} onChange={(e) => handleChange('vendor', e.target.value)} placeholder="Preferred supplier" />
                            </div>

                            <div>
                                <label className={labelClass}>Timeline</label>
                                <div className="relative">
                                    <Input type="date" className={`${inputClass} pr-10`} value={formData.requestDate || ''} readOnly />
                                    <Calendar size={14} className="absolute right-3 top-4 text-slate-400" />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Unit Count</label>
                                <Input type="number" min="1" className={inputClass} value={formData.quantity || 1} onChange={(e) => handleChange('quantity', e.target.value)} required />
                            </div>

                            <div>
                                <label className={labelClass}>Estimated Unit Value (IDR)</label>
                                <Input type="number" min="0" className={inputClass} value={formData.unitPrice || ''} onChange={(e) => handleChange('unitPrice', e.target.value)} required placeholder="0" />
                            </div>

                            <div className="md:col-span-2 bg-muted/40 dark:bg-zinc-800/40 border border-border/60 rounded-xl p-6 flex justify-between items-center">
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground block mb-1">Total Commitment</span>
                                    <span className="text-2xl font-bold text-primary tracking-tight">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(formData.totalPrice || 0)}
                                    </span>
                                </div>
                                <div className="w-12 h-12 bg-muted/60 border border-border/60 rounded-full flex items-center justify-center">
                                    <ShoppingBag size={20} className="text-muted-foreground" />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Strategic Justification</label>
                                <Textarea rows={3} className={`${inputClass} resize-none italic min-h-[5rem]`} value={formData.justification || ''} onChange={(e) => handleChange('justification', e.target.value)} placeholder="Why is this investment necessary for operations?..." required />
                            </div>
                        </div>

                        <div className="bg-muted/20 border border-border/40 rounded-lg p-5 flex items-start gap-4">
                            <Info size={16} className="text-muted-foreground mt-1 shrink-0" />
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Requests are routed strictly based on organizational hierarchy. Supervisors and Managers authorize the procurement node directly.
                            </p>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-3.5 border-t border-border/40 gap-2 flex justify-end shrink-0 bg-muted/10">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="purchaseForm" className="min-w-[150px]">
                        Submit Request
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

