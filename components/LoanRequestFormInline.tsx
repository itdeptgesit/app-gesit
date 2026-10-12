
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCcw, ChevronRight, Package, Calendar, Clock, Phone, FileText, Search } from 'lucide-react';
import { ITAsset, UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendNotificationToAdmins } from '../utils/NotificationSystemUtils';

interface LoanRequestFormInlineProps {
    currentUser: UserAccount | null;
    availableAssets: ITAsset[];
    onSuccess: () => void;
}

export const LoanRequestFormInline: React.FC<LoanRequestFormInlineProps> = ({
    currentUser, availableAssets, onSuccess
}) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        loanId: '',
        assetId: '',
        borrowerName: currentUser?.fullName || '',
        borrowerDept: currentUser?.department || '',
        borrowerPhone: currentUser?.phone || '',
        loanDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Pending',
        remarks: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [assetSearch, setAssetSearch] = useState('');
    const [isAssetListOpen, setIsAssetListOpen] = useState(false);
    const [departments, setDepartments] = useState<string[]>([]);
    const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setFormData(prev => ({ ...prev, loanId: `LOAN-${Date.now().toString().substring(7)}` }));
        const fetchDepts = async () => {
            const { data } = await supabase.from('departments').select('name').order('name');
            if (data) setDepartments(data.map(d => d.name));
        };
        fetchDepts();
    }, []);

    const filteredAssets = useMemo(() => {
        return availableAssets.filter(asset =>
            (asset.item || '').toLowerCase().includes(assetSearch.toLowerCase()) ||
            (asset.assetId || '').toLowerCase().includes(assetSearch.toLowerCase())
        );
    }, [availableAssets, assetSearch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.assetId) {
            setToast({ text: t('selectAssetError'), type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const payload = {
                loan_id: formData.loanId || `LOAN-${Date.now().toString().substring(7)}`,
                asset_id: formData.assetId || null,
                borrower_name: formData.borrowerName,
                borrower_dept: formData.borrowerDept,
                borrower_phone: formData.borrowerPhone,
                borrower_email: currentUser?.email,
                loan_date: formData.loanDate,
                expected_return_date: formData.expectedReturnDate,
                status: formData.status,
                remarks: formData.remarks,
                it_personnel: 'Pending Approval'
            };
            const { error } = await supabase.from('it_asset_loans').insert([payload]);
            if (error) throw error;

            // Send notification to all admins
            await sendNotificationToAdmins(
                'New Asset Loan Request',
                `A new loan request for "${formData.assetId}" has been submitted by ${formData.borrowerName}.`,
                'Info',
                'asset-loan'
            );

            // Reset form
            setFormData({
                loanId: `LOAN-${Date.now().toString().substring(7)}`,
                assetId: '',
                borrowerName: currentUser?.fullName || '',
                borrowerDept: currentUser?.department || '',
                borrowerPhone: currentUser?.phone || '',
                loanDate: new Date().toISOString().split('T')[0],
                expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'Pending',
                remarks: ''
            });
            setAssetSearch('');
            setToast({ text: t('requestSuccess'), type: 'success' });
            onSuccess();
        } catch (err: any) {
            setToast({ text: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    return (
        <Card className="rounded-xl border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="px-8 py-6 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-zinc-800/20">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl shadow-sm">
                        <Package size={22} />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-semibold">{t('requestNewAsset')}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-0.5">
                            Submit a request to IT for equipment assignment
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="p-8 space-y-8">
                    {toast && (
                        <div className={cn(
                            "p-4 rounded-xl text-sm font-medium animate-in fade-in zoom-in duration-300 border flex items-center gap-3",
                            toast.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40'
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500')} />
                            {toast.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <div className="space-y-2 relative">
                                <Label htmlFor="search" className="text-sm font-medium text-foreground ml-1 flex items-center gap-1.5">
                                    <Search size={12} /> {t('assetInventory')}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="search"
                                        placeholder={t('assetSearchPlaceholder')}
                                        className={cn(
                                            "h-11 rounded-xl bg-muted/40 border-border/60 focus:ring-2 focus:ring-primary/10 transition-all",
                                            formData.assetId ? 'border-primary/50 bg-primary/5' : ''
                                        )}
                                        value={assetSearch}
                                        onChange={e => {
                                            setAssetSearch(e.target.value);
                                            setIsAssetListOpen(true);
                                        }}
                                        onFocus={() => setIsAssetListOpen(true)}
                                        autoComplete="off"
                                    />
                                    {isAssetListOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border/60 rounded-xl shadow-2xl z-[50] max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
                                            {filteredAssets.length === 0 ? (
                                                <div className="p-10 text-center">
                                                    <p className="text-sm text-muted-foreground font-medium">No assets available</p>
                                                </div>
                                            ) : (
                                                <div className="py-2">
                                                    {filteredAssets.map(asset => (
                                                        <button
                                                            key={asset.id}
                                                            type="button"
                                                            className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0 group"
                                                            onClick={() => {
                                                                setFormData({ ...formData, assetId: asset.id.toString() });
                                                                setAssetSearch(asset.item);
                                                                setIsAssetListOpen(false);
                                                            }}
                                                        >
                                                            <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{asset.item}</div>
                                                            <div className="text-xs font-medium text-muted-foreground mt-1">{asset.assetId} • {asset.category}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {isAssetListOpen && (
                                        <div className="fixed inset-0 z-[40]" onClick={() => setIsAssetListOpen(false)} />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground ml-1 flex items-center gap-1.5">
                                        <Calendar size={12} /> {t('issueDate')}
                                    </Label>
                                    <Input
                                        type="date"
                                        required
                                        className="h-11 rounded-xl bg-muted/40 border-border/60"
                                        value={formData.loanDate}
                                        onChange={e => setFormData({ ...formData, loanDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground ml-1 flex items-center gap-1.5">
                                        <Clock size={12} /> {t('expectedReturn')}
                                    </Label>
                                    <Input
                                        type="date"
                                        required
                                        className="h-11 rounded-xl bg-muted/40 border-border/60"
                                        value={formData.expectedReturnDate}
                                        onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-foreground ml-1 flex items-center gap-1.5">
                                    <Phone size={12} /> {t('yourPhone')}
                                </Label>
                                <Input
                                    type="text"
                                    placeholder={t('phonePlaceholder')}
                                    className="h-11 rounded-xl bg-muted/40 border-border/60"
                                    value={formData.borrowerPhone}
                                    onChange={e => setFormData({ ...formData, borrowerPhone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-foreground ml-1 flex items-center gap-1.5">
                                    <FileText size={12} /> {t('purposeRemarks')}
                                </Label>
                                <Textarea
                                    placeholder={t('purposePlaceholder')}
                                    className="rounded-xl bg-muted/40 border-border/60 h-[100px] py-4 resize-none leading-relaxed"
                                    value={formData.remarks}
                                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <Package size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-muted-foreground mb-0.5">{t('borrowerStatus')}</span>
                                <span className="text-sm font-semibold text-foreground">{formData.borrowerName} ({formData.borrowerDept})</span>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            size="lg"
                            className="gap-3"
                        >
                            {isLoading ? (
                                <RefreshCcw className="animate-spin text-white" size={18} />
                            ) : (
                                <>
                                    {t('submitRequest')}
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
};

