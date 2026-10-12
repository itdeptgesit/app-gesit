
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Tag, Shield, Building2, User, MapPin, Hash, Briefcase, Info, RefreshCw, Camera as CameraIcon, Zap } from 'lucide-react';
import { ITAsset, AssetCategory } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import { useToast } from './ToastProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";

const formatRupiah = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '';
    const numberString = val.toString().replace(/[^0-9]/g, '');
    if (!numberString) return '';
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface AssetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (asset: Partial<ITAsset>) => void;
    initialData?: ITAsset | null;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Partial<ITAsset>>({});
    const [specs, setSpecs] = useState({ storage: '', ram: '', vga: '', processor: '' });
    const [companyList, setCompanyList] = useState<{ id: number, name: string, code: string }[]>([]);
    const [categoryList, setCategoryList] = useState<AssetCategory[]>([]);
    const [departmentList, setDepartmentList] = useState<{ id: number, name: string }[]>([]);

    // Ref untuk menyimpan suffix unik agar tidak berubah-ubah saat ganti company/cat dalam satu sesi edit
    const idSuffixRef = useRef<string>('');

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `asset-images/${fileName}`;

            // Upload ke bucket 'assets' Supabase Storage
            const { data, error } = await supabase.storage
                .from('assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                throw error;
            }

            // Dapatkan public URL
            const { data: publicUrlData } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
                setFormData(prev => ({ ...prev, image_url: publicUrlData.publicUrl }));
                showToast('Image uploaded successfully', 'success');
            }
        } catch (err) {
            // Fallback ke Base64 data URL jika storage error
            console.warn('Supabase storage upload failed, falling back to base64...', err);
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setFormData(prev => ({ ...prev, image_url: event.target?.result as string }));
                    showToast('Image attached successfully (Local)', 'success');
                }
            };
            reader.readAsDataURL(file);
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const { data: companies } = await supabase.from('companies').select('id, name, code').order('name');
            if (companies) setCompanyList(companies);

            const { data: categories } = await supabase.from('asset_categories').select('*').order('name');
            if (categories) setCategoryList(categories);

            const { data: depts } = await supabase.from('departments').select('id, name').order('name');
            if (depts) setDepartmentList(depts);
        };
        if (isOpen) fetchData();
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setSpecs({
                storage: initialData.specs?.storage || '',
                ram: initialData.specs?.ram || '',
                vga: initialData.specs?.vga || '',
                processor: initialData.specs?.processor || ''
            });
            // Ambil suffix dari ID yang sudah ada (misal GSI-LPT-001 -> suffix 001)
            const parts = initialData.assetId.split('-');
            idSuffixRef.current = parts[parts.length - 1];
        } else if (isOpen) {
            setFormData({
                item: '',
                status: 'Active',
                condition: 'New',
                purchaseDate: new Date().toISOString().split('T')[0],
                warrantyExp: '',
                price: 0,
                location: '',
                user: '',
                assetId: 'Generating...',
                specs: { storage: '', ram: '', vga: '', processor: '' }
            });
            setSpecs({ storage: '', ram: '', vga: '', processor: '' });
            idSuffixRef.current = ''; // Reset suffix utk asset baru agar generate baru
        }
    }, [initialData, isOpen]);

    // Generate Asset ID
    useEffect(() => {
        const generateId = async () => {
            if (!formData.company || !formData.category || !isOpen) return;

            // Jika sedang edit, dan company serta category belum berubah, pakai ID asli
            if (initialData && formData.company === initialData.company && formData.category === initialData.category) {
                setFormData(prev => {
                    if (prev.assetId !== initialData.assetId) {
                        return { ...prev, assetId: initialData.assetId };
                    }
                    return prev;
                });
                return;
            }

            const company = companyList.find(c => c.name === formData.company);
            const category = categoryList.find(c => c.name === formData.category);

            if (company && category) {
                const prefix = `${company.code}-${category.code}`;

                try {
                    // Cek di DB suffix tertinggi utk asset dengan company & category yang sama
                    const { data } = await supabase
                        .from('it_assets')
                        .select('asset_id')
                        .eq('company', company.name)
                        .eq('category', category.name);

                    let nextSuffix = '001';
                    if (data && data.length > 0) {
                        let maxSuffix = 0;
                        data.forEach(item => {
                            const lastId = item.asset_id;
                            if (lastId) {
                                const lastSuffix = parseInt(lastId.split('-').pop() || '0');
                                if (!isNaN(lastSuffix) && lastSuffix > maxSuffix) {
                                    maxSuffix = lastSuffix;
                                }
                            }
                        });
                        nextSuffix = (maxSuffix + 1).toString().padStart(3, '0');
                    }

                    setFormData(prev => {
                        const newAssetId = `${prefix}-${nextSuffix}`;
                        if (prev.assetId !== newAssetId) {
                            return { ...prev, assetId: newAssetId };
                        }
                        return prev;
                    });
                } catch (e) {
                    console.error('Error generating ID:', e);
                }
            }
        };

        generateId();
    }, [formData.company, formData.category, companyList, categoryList, isOpen, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...formData, specs };
        onSubmit(finalData);
        onClose();
    };

    const inputClass = "w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1 bg-background text-foreground transition-colors";
    const labelClass = "block text-sm font-medium text-foreground mb-1 ml-1";

    const needsSpecs = formData.category === 'Laptop' || formData.category === 'PC' || formData.category === 'Server' || formData.category === 'Workstation';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
            <DialogContent showCloseButton={false} className="sm:max-w-2xl p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl flex flex-col max-h-[92vh]">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div>
                        <DialogTitle className="text-lg font-semibold text-foreground leading-none">
                            {initialData ? 'Modify Asset Profile' : 'Register New Hardware'}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">Hardware Inventory & Sourcing Protocols</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="assetForm" onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2 p-7 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-slate-200 dark:border-zinc-800">
                                <label className={labelClass}>Asset Identification Name</label>
                                <Input
                                    className={`${inputClass} !bg-white dark:!bg-zinc-900 !text-xl !font-semibold !py-3.5 focus:ring-primary/10 !border-primary/20`}
                                    value={formData.item || ''}
                                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                                    required
                                    placeholder="e.g. MacBook Pro 14 M3"
                                />
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className={labelClass}>System Registry ID</label>
                                    <div className="relative">
                                        <Input className={`${inputClass} font-mono font-medium text-foreground pl-10`} value={formData.assetId || ''} readOnly />
                                        <Hash size={14} className="absolute left-4 top-4 text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Operating Entity</label>
                                    <div className="relative">
                                        <select className={inputClass} value={formData.company || ''} onChange={(e) => setFormData({ ...formData, company: e.target.value })} required>
                                            <option value="">- Select Company -</option>
                                            {companyList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <Building2 size={14} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className={labelClass}>Brand / Manufacturer</label>
                                    <div className="relative">
                                        <Input className={`${inputClass} pl-10`} value={formData.brand || ''} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} required placeholder="Apple, Dell, HP, etc." />
                                        <Tag size={14} className="absolute left-4 top-4 text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Asset Classification</label>
                                    <div className="relative">
                                        <select className={inputClass} value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                                            <option value="">- Select Category -</option>
                                            {categoryList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <Briefcase size={14} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                            <div>
                                <label className={labelClass}>Lifecycle Status</label>
                                <select className={inputClass} value={formData.status || 'Active'} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}>
                                    <option value="Active">Active</option>
                                    <option value="Idle">Idle</option>
                                    <option value="Used">Used</option>
                                    <option value="Broken">Broken</option>
                                    <option value="Disposed">Disposed</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Physical Condition</label>
                                <select className={inputClass} value={formData.condition || 'New'} onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}>
                                    <option value="New">New</option>
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Serial Number</label>
                                <div className="relative">
                                    <Input className={`${inputClass} pl-10`} value={formData.serialNumber || ''} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} placeholder="Factory S/N or Service Tag" />
                                    <Shield size={14} className="absolute left-4 top-4 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="p-7 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-slate-200 dark:border-zinc-800">
                            <p className="text-sm font-semibold text-foreground mb-6 flex items-center gap-3">
                                <Shield size={14} strokeWidth={3} /> PROCUREMENT & LIFECYCLE
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div>
                                    <label className={labelClass}>Vendor / Supplier</label>
                                    <Input className={inputClass} value={formData.vendor || ''} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder="Store or vendor name" />
                                </div>
                                <div>
                                    <label className={labelClass}>Purchase Price (IDR)</label>
                                    <Input 
                                        type="text" 
                                        className={inputClass} 
                                        value={formatRupiah(formData.price || '')} 
                                        onChange={(e) => {
                                            const rawVal = e.target.value.replace(/[^0-9]/g, '');
                                            setFormData({ ...formData, price: rawVal ? parseInt(rawVal, 10) : 0 });
                                        }} 
                                        placeholder="0" 
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Warranty Expiration</label>
                                    <Input type="date" className={inputClass} value={formData.warrantyExp || ''} onChange={(e) => setFormData({ ...formData, warrantyExp: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-50 dark:border-zinc-800">
                            <div>
                                <label className={labelClass}>Site Location</label>
                                <Input className={inputClass} value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required placeholder="Floor, Room, or Data Center Rack" />
                            </div>
                            <div>
                                <label className={labelClass}>Department</label>
                                <div className="relative">
                                    <select className={inputClass} value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                                        <option value="">- Select Department -</option>
                                        {departmentList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                    <Building2 size={14} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Current Custodian</label>
                                <Input className={inputClass} value={formData.user || ''} onChange={(e) => setFormData({ ...formData, user: e.target.value })} placeholder="Name of employee assigned" />
                            </div>
                        </div>

                        {needsSpecs && (
                            <div className="p-7 bg-slate-50 dark:bg-zinc-800/30 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-inner">
                                <p className="text-sm font-semibold text-foreground mb-6 flex items-center gap-3">
                                    <Zap size={14} strokeWidth={3} /> Hardware Architecture Specs
                                </p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div><label className={labelClass}>Processor</label><Input className={inputClass} value={specs.processor} onChange={(e) => setSpecs({ ...specs, processor: e.target.value })} placeholder="i7-12700H" /></div>
                                    <div><label className={labelClass}>Memory (RAM)</label><Input className={inputClass} value={specs.ram} onChange={(e) => setSpecs({ ...specs, ram: e.target.value })} placeholder="32GB DDR5" /></div>
                                    <div><label className={labelClass}>Storage</label><Input className={inputClass} value={specs.storage} onChange={(e) => setSpecs({ ...specs, storage: e.target.value })} placeholder="1TB NVMe" /></div>
                                    <div><label className={labelClass}>Graphic (VGA)</label><Input className={inputClass} value={specs.vga} onChange={(e) => setSpecs({ ...specs, vga: e.target.value })} placeholder="RTX 3060" /></div>
                                </div>
                            </div>
                        )}

                        <div className="p-7 bg-slate-50 dark:bg-zinc-800/30 rounded-lg border border-slate-200 dark:border-zinc-800">
                            <p className="flex items-center gap-3 text-sm font-semibold text-foreground">
                                <CameraIcon size={14} strokeWidth={3} /> Asset Photo / Illustration
                            </p>
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                {/* Image Preview Zone */}
                                <div className="md:col-span-1 h-36 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden relative group border-dashed">
                                    {formData.image_url ? (
                                        <>
                                            <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain p-2" />
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))} 
                                                className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md flex items-center justify-center w-6 h-6"
                                            >
                                                <X size={12} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-zinc-500">
                                            <CameraIcon size={24} />
                                            <span className="text-xs text-muted-foreground">No Image Selected</span>
                                        </div>
                                    )}
                                </div>
                                {/* Upload / URL Input Zone */}
                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <label className={labelClass}>Upload Local File</label>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={handleImageUpload} 
                                        />
                                        <div className="flex gap-3 mt-1">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={() => fileInputRef.current?.click()} 
                                                disabled={isUploading}
                                                className="h-10 w-full"
                                            >
                                                {isUploading ? 'Uploading...' : 'Browse Image File'}
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Or Paste Image URL</label>
                                        <Input 
                                            className={`${inputClass} !mt-1`} 
                                            value={formData.image_url || ''} 
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} 
                                            placeholder="https://example.com/image.jpg" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50 dark:border-zinc-800">
                            <label className={labelClass}>Administrative Remarks / Notes</label>
                            <Textarea
                                rows={3} className={`${inputClass} resize-none min-h-[120px]`}
                                value={formData.remarks || ''}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                placeholder="Condition, warranty info, or historical deployment notes..."
                            />
                        </div>
                    </form>
                </div>

                <div className="px-6 py-3.5 border-t border-border/40 gap-2 flex sm:justify-end items-center bg-muted/10 shrink-0">
                    <Button type="button" variant="ghost" onClick={onClose} className="h-10 px-6 text-muted-foreground">
                        {t('cancel')}
                    </Button>
                    <Button type="submit" form="assetForm" className="h-10 px-8">
                        {t('save')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
