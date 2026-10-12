import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download } from 'lucide-react';
import { PurchaseRequisition } from '../types';
import { Button } from "@/components/ui/button";
import { exportFinanceFormPDF, FinanceFormData } from '../lib/financeFormPdfExport';
import { supabase } from '../lib/supabaseClient';

interface FinanceFormExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    requisition: PurchaseRequisition | null;
    type: 'cash_advance' | 'payment_requisition';
}

const getAbbreviation = (name: string): string => {
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase();
};

export const FinanceFormExportModal: React.FC<FinanceFormExportModalProps> = ({
    isOpen,
    onClose,
    requisition,
    type
}) => {
    const DEFAULT_COMPANY = 'GESIT ALUMAS';
    const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
    const [formData, setFormData] = useState<FinanceFormData>({
        companyName: DEFAULT_COMPANY,
        costCenter: getAbbreviation(DEFAULT_COMPANY),
        projectName: requisition?.requestedItems?.[0]?.description || requisition?.itRecommendations?.[0]?.description || '',
        cekBgNo: '',
        bankName: '',
        paymentMethod: 'Transfer',
        transferTo: requisition?.bankAccount || '',
        amount: requisition?.grandTotal || 0,
    });

    useEffect(() => {
        supabase.from('companies').select('id, name').order('name').then(({ data }) => {
            if (data) setCompanies(data);
        });
    }, []);

    if (!isOpen || !requisition) return null;

    const title = type === 'cash_advance' ? 'Export Cash Advance' : 'Export Payment Requisition';

    const handleExport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await exportFinanceFormPDF(requisition, type, formData);
            onClose();
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background font-sans rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border/60 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <FileText size={18} />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleExport} className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Please fill in the additional details for the form before generating the PDF.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Company</label>
                            <select
                                className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50 font-medium"
                                value={formData.companyName}
                                onChange={e => setFormData({...formData, companyName: e.target.value, costCenter: getAbbreviation(e.target.value)})}
                            >
                                {companies.length === 0 && (
                                    <option value="GESIT ALUMAS">GESIT ALUMAS</option>
                                )}
                                {companies.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                            <input 
                                type="text"
                                className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                value={formData.projectName}
                                onChange={e => setFormData({...formData, projectName: e.target.value})}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Bank</label>
                            <input 
                                type="text"
                                className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                value={formData.bankName}
                                onChange={e => setFormData({...formData, bankName: e.target.value})}
                                placeholder="BCA, Mandiri, etc."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Cek / BG No.</label>
                            <input 
                                type="text"
                                className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                value={formData.cekBgNo}
                                onChange={e => setFormData({...formData, cekBgNo: e.target.value})}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Payment Method</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    checked={formData.paymentMethod === 'Cash'}
                                    onChange={() => setFormData({...formData, paymentMethod: 'Cash'})}
                                    className="accent-blue-600"
                                />
                                Cash
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    checked={formData.paymentMethod === 'Transfer'}
                                    onChange={() => setFormData({...formData, paymentMethod: 'Transfer'})}
                                    className="accent-blue-600"
                                />
                                Transfer
                            </label>
                        </div>
                    </div>

                    {formData.paymentMethod === 'Transfer' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Transfer To</label>
                            <input 
                                type="text"
                                className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50"
                                value={formData.transferTo}
                                onChange={e => setFormData({...formData, transferTo: e.target.value})}
                                placeholder="Account Name / Number"
                            />
                        </div>
                    )}

                    <div className="space-y-1 pt-2">
                        <label className="text-xs font-medium text-muted-foreground">Amount (Rp)</label>
                        <input 
                            type="number"
                            className="w-full text-sm p-2 border-border/60 rounded-lg bg-muted/30 dark:bg-zinc-800/50 font-mono"
                            value={formData.amount}
                            onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                        />
                        {type === 'cash_advance' && (
                            <p className="text-xs text-muted-foreground">You can override the amount for Cash Advance if needed.</p>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2">
                            <Download size={16} />
                            Generate PDF
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
