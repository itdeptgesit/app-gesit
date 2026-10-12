
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCcw, ChevronRight } from 'lucide-react';
import { ITAssetLoan, ITAsset, UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LoanFormModalProps {
    isOpen: boolean;
    currentUser: UserAccount | null;
    onClose: () => void;
    onSubmit: (formData: any) => Promise<void>;
    initialData?: ITAssetLoan | null;
    availableAssets: ITAsset[];
}

export const LoanFormModal: React.FC<LoanFormModalProps> = ({
    isOpen, currentUser, onClose, onSubmit, initialData, availableAssets
}) => {
    const isStaff = currentUser?.role === 'Staff' || currentUser?.role === 'Admin';
    const initialStatus = isStaff ? 'Active' : 'Pending';

    const [formData, setFormData] = useState({
        loanId: '',
        assetId: '',
        borrowerName: currentUser?.fullName || '',
        borrowerDept: currentUser?.department || '',
        borrowerPhone: currentUser?.phone || '',
        loanDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: initialStatus,
        remarks: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [assetSearch, setAssetSearch] = useState('');
    const [isAssetListOpen, setIsAssetListOpen] = useState(false);
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        const fetchDepts = async () => {
            const { data } = await supabase.from('departments').select('name').order('name');
            if (data) setDepartments(data.map(d => d.name));
        };
        if (isOpen) fetchDepts();
    }, [isOpen]);

    const filteredAssets = useMemo(() => {
        return availableAssets.filter(asset =>
            (asset.item || '').toLowerCase().includes(assetSearch.toLowerCase()) ||
            (asset.assetId || '').toLowerCase().includes(assetSearch.toLowerCase())
        );
    }, [availableAssets, assetSearch]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                loanId: initialData.loanId,
                assetId: initialData.assetId?.toString() || '',
                borrowerName: initialData.borrowerName,
                borrowerDept: initialData.borrowerDept,
                borrowerPhone: initialData.borrowerPhone || '',
                loanDate: initialData.loanDate.split('T')[0],
                expectedReturnDate: initialData.expectedReturnDate.split('T')[0],
                status: initialData.status,
                remarks: initialData.remarks || ''
            });
            const asset = availableAssets.find(a => a.id.toString() === initialData.assetId?.toString());
            if (asset) setAssetSearch(asset.item);
            else if (initialData.assetName) setAssetSearch(initialData.assetName);
        } else if (isOpen) {
            setFormData({
                loanId: `LOAN-${Date.now().toString().substring(7)}`,
                assetId: '',
                borrowerName: currentUser?.fullName || '',
                borrowerDept: currentUser?.department || '',
                borrowerPhone: currentUser?.phone || '',
                loanDate: new Date().toISOString().split('T')[0],
                expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: initialStatus,
                remarks: ''
            });
            setAssetSearch('');
        }
    }, [initialData, isOpen, availableAssets, currentUser, initialStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const labelClass = "block text-sm font-medium text-foreground mb-1 ml-1";
    const inputClass = "w-full border border-border/60 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary bg-background text-foreground transition-all font-medium placeholder:text-muted-foreground";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
            <DialogContent showCloseButton={false} className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl bg-background border border-border/60 shadow-2xl flex flex-col max-h-[92vh] font-sans">
                <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {initialData ? (isStaff && initialData.status === 'Pending' ? 'Approve Loan Request' : 'Edit Loan Record') : (isStaff ? 'New IT Asset Loan' : 'Request Asset Loan')}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                {initialData?.status === 'Pending' ? 'Incoming Loan Request' : `Reference: ${formData.loanId}`}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X size={18} />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="loanForm" onSubmit={handleSubmit} className="space-y-9">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-9">
                            <div className="space-y-9">
                                <div className="relative">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className={labelClass}>Asset Inventory</label>
                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10 flex items-center gap-1.5">
                                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                            {availableAssets.length} Ready
                                        </span>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <div className="relative group/search">
                                            <input
                                                type="text"
                                                required={isStaff}
                                                placeholder={isStaff ? "Search by name or serial..." : "Search for asset..."}
                                                className={`${inputClass} !h-12 pl-11 !font-black !text-base focus:ring-blue-500/10 ${formData.assetId ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}
                                                value={assetSearch}
                                                onChange={e => {
                                                    setAssetSearch(e.target.value);
                                                    setIsAssetListOpen(true);
                                                }}
                                                onFocus={() => setIsAssetListOpen(true)}
                                                autoComplete="off"
                                            />
                                            <RefreshCcw size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />

                                            {isAssetListOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-3 bg-background border border-border/60 rounded-xl shadow-2xl z-[110] max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
                                                    {filteredAssets.length === 0 ? (
                                                        <div className="p-10 text-center">
                                                            <div className="text-sm text-muted-foreground font-medium">No matching assets</div>
                                                        </div>
                                                    ) : (
                                                        <div className="py-2">
                                                            {filteredAssets.map(asset => (
                                                                <button
                                                                    key={asset.id}
                                                                    type="button"
                                                                    className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors group/item border-b border-border/40 last:border-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFormData({ ...formData, assetId: asset.id.toString() });
                                                                        setAssetSearch(asset.item);
                                                                        setIsAssetListOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="font-semibold text-foreground text-sm">{asset.item}</div>
                                                                    <div className="text-xs font-medium text-muted-foreground mt-1">{asset.assetId} • {asset.category}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {isAssetListOpen && (
                                            <div className="fixed inset-0 z-[105]" onClick={() => setIsAssetListOpen(false)} />
                                        )}
                                    </div>
                                </div>

                                <div className="bg-muted/40 p-7 rounded-lg border border-border/60 space-y-6">
                                    <label className={labelClass}>Recipient Identity</label>
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            required
                                            disabled={!isStaff}
                                            placeholder="Borrower Full Name"
                                            className={`${inputClass} !bg-white dark:!bg-zinc-900 ${!isStaff ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={formData.borrowerName}
                                            onChange={e => setFormData({ ...formData, borrowerName: e.target.value })}
                                        />
                                        <div className="relative">
                                            <select
                                                required
                                                disabled={!isStaff}
                                                className={`${inputClass} !bg-white dark:!bg-zinc-900 appearance-none cursor-pointer pr-11 ${!isStaff ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                value={formData.borrowerDept}
                                                onChange={e => setFormData({ ...formData, borrowerDept: e.target.value })}
                                            >
                                                <option value="" disabled>Select Department</option>
                                                {currentUser?.department && !departments.includes(currentUser.department) && (
                                                    <option value={currentUser.department}>{currentUser.department}</option>
                                                )}
                                                {departments.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                            <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Contact Extension / Phone"
                                            className={`${inputClass} !bg-white dark:!bg-zinc-900`}
                                            value={formData.borrowerPhone}
                                            onChange={e => setFormData({ ...formData, borrowerPhone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-9">
                                <div className="bg-muted/40 p-7 rounded-lg border border-border/60 space-y-6">
                                    <label className={labelClass}>Handover Schedule</label>
                                    <div className="space-y-5">
                                        <div>
                                            <div className="text-sm font-medium text-foreground ml-1 mb-2">Loan Start Date</div>
                                            <input
                                                type="date"
                                                required
                                                className={`${inputClass} !bg-white dark:!bg-zinc-900`}
                                                value={formData.loanDate}
                                                onChange={e => setFormData({ ...formData, loanDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-foreground ml-1 mb-2">Expected Return Date</div>
                                            <input
                                                type="date"
                                                required
                                                className={`${inputClass} !bg-white dark:!bg-zinc-900`}
                                                value={formData.expectedReturnDate}
                                                onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className={labelClass}>Authorization Status</label>
                                    <div className="relative">
                                        <select
                                            disabled={!isStaff}
                                            className={`${inputClass} appearance-none cursor-pointer pr-11 ${!isStaff ? 'bg-slate-100 dark:bg-zinc-800 opacity-70 cursor-not-allowed' : ''}`}
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            {!isStaff && <option value="Pending">Request Pending</option>}
                                            <option value="Active">Active (Loaned)</option>
                                            <option value="Pending">Pending Approval</option>
                                            <option value="Returned">Returned</option>
                                            <option value="Overdue">Overdue</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                        <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Contractual Remarks & Conditions</label>
                            <textarea
                                placeholder="Mandatory conditions or loan remarks..."
                                className={`${inputClass} min-h-[120px] py-4 resize-none leading-relaxed overflow-hidden`}
                                value={formData.remarks}
                                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>
                    </form>
                </div>

                <DialogFooter className="px-6 py-3.5 border-t border-border/40 gap-2 bg-muted/10 sm:justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="loanForm"
                        disabled={isLoading}
                        className="gap-3"
                    >
                        {isLoading ? (
                            <RefreshCcw className="animate-spin" size={16} strokeWidth={3} />
                        ) : (
                            <span>{initialData ? (isStaff && initialData.status === 'Pending' ? 'Approve Loan' : 'Save Changes') : (isStaff ? 'Create Loan' : 'Submit Request')}</span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
