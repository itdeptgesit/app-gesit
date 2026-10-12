// Credential Form Modal Component

import React, { useState, useEffect } from 'react';
import { X, Key, Globe, User, Lock, Eye, EyeOff, Tag, StickyNote, Loader2 } from 'lucide-react';
import { Credential } from '../types';
import { useToast } from './ToastProvider';
import { Button } from "@/components/ui/button";

interface CredentialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Credential>) => void;
    initialData?: Credential | null;
}

export const CredentialFormModal: React.FC<CredentialFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Partial<Credential>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const categories = [
        'Provider Inet', 'Subscription', 'Account', 'WiFi', 
        'Web&Domain', 'CCTV', 'PABX', 'Database', 'Sircon71', 
        'Sircon72', 'Sircon73', 'Gesit 26', 'Gesit 27', 'AAMS'
    ];

    // DEFINSI KOLOM DINAMIS PER KATEGORI
    const getDynamicFields = (category: string) => {
        switch(category) {
            case 'Web&Domain':
                return [
                    { key: 'vendor', label: 'Vendor', placeholder: 'e.g. JagoanHosting' },
                    { key: 'type', label: 'Type', placeholder: 'e.g. cPanel, Domain' },
                    { key: 'entity', label: 'Entities', placeholder: 'e.g. GA, AI' },
                    { key: 'serviceUrl', label: 'Link', placeholder: 'https://...' },
                ];
            case 'Provider Inet':
                return [
                    { key: 'entity', label: 'Company / Entity', placeholder: 'e.g. Gesit 26, Sircon 71' },
                    { key: 'speed', label: 'Plan / Speed', placeholder: 'e.g. 100 Mbps Dedicated' },
                    { key: 'accountNumber', label: 'ID Pelanggan', placeholder: 'Nomor Pelanggan' },
                    { key: 'address', label: 'Static IP / Address', placeholder: '103.xxx.xxx.xxx' },
                    { key: 'billingDate', label: 'Billing Date', placeholder: 'Setiap Tgl ...' },
                ];
            case 'Gesit 27':
            case 'Gesit 26':
            case 'WiFi':
            case 'CCTV':
            case 'PABX':
                return [
                    { key: 'brand', label: 'Brand', placeholder: 'e.g. Mikrotik, UniFi, Brother' },
                    { key: 'deviceType', label: 'Device Type', placeholder: 'e.g. Router, Printer, CCTV' },
                    { key: 'unitType', label: 'Unit Type', placeholder: 'e.g. RB450GX4, Pro 200' },
                    { key: 'location', label: 'Location', placeholder: 'e.g. SERVER ROOM, HRL' },
                    { key: 'jumlahPort', label: 'Jumlah Port', placeholder: 'e.g. 5, 28' },
                    { key: 'address', label: 'Address / IP', placeholder: 'e.g. 192.168.1.1' },
                ];
            case 'Subscription':
            case 'Account':
                return [
                    { key: 'provider', label: 'Provider', placeholder: 'e.g. Google Workspace, Zoom' },
                    { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
                ];
            default:
                return [
                   { key: 'address', label: 'Access / IP', placeholder: 'e.g. 192.168.1.1' },
                ];
        }
    };

    const updateMetadata = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...(prev.metadata || {}),
                [key]: value
            }
        }));
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                title: '',
                username: '',
                password: '',
                category: categories[0],
                notes: '',
                metadata: {}
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Submit Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full border border-input rounded-md px-3 py-2 text-sm mt-1 bg-background text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
    const labelClass = "block text-sm font-medium text-foreground mb-1.5";

    const dynamicFields = getDynamicFields(formData.category || '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
<div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] border border-border/60 font-sans overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground leading-none">
                            {initialData ? 'Edit Protocol' : 'Register Secret'}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">GESIT Vault Registry</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-destructive"><X size={20} /></Button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Technical Identity (Name/Title)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required 
                                        className={`${inputClass} pl-10 !font-bold`} 
                                        value={formData.title || ''} 
                                        onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                        placeholder="e.g. gesit.co.id, MikroTik Core..." 
                                    />
                                    <Key size={16} className="absolute left-3.5 top-4 text-muted-foreground" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Registry Category</label>
                                <select 
                                    className={`${inputClass} pl-4`} 
                                    value={formData.category || categories[0]} 
                                    onChange={e => {
                                        setFormData({ ...formData, category: e.target.value, metadata: {} });
                                    }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* DYNAMIC METADATA FIELDS SECTION */}
                        {dynamicFields.length > 0 && (
                            <div className="p-4 bg-muted/20 rounded-xl border border-border/40 space-y-4">
                                <p className="text-sm font-semibold text-foreground mb-2 px-1">Specific Metadata Specifications</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {dynamicFields.map(field => (
                                        <div key={field.key}>
                                            <label className={labelClass}>{field.label}</label>
                                            <input 
                                                type={field.type || 'text'} 
                                                className={inputClass}
                                                value={formData.metadata?.[field.key] || ''}
                                                onChange={e => updateMetadata(field.key, e.target.value)}
                                                placeholder={field.placeholder}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Assigned User</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required 
                                        className={`${inputClass} pl-10`} 
                                        value={formData.username || ''} 
                                        onChange={e => setFormData({ ...formData, username: e.target.value })} 
                                        placeholder="Username / IP / UID"
                                    />
                                    <User size={16} className="absolute left-3.5 top-4 text-muted-foreground" />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Secured Secret / Pass</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        className={`${inputClass} pl-10 pr-10`} 
                                        value={formData.password || ''} 
                                        onChange={e => setFormData({ ...formData, password: e.target.value })} 
                                        placeholder="············"
                                    />
                                    <Lock size={16} className="absolute left-3.5 top-4 text-muted-foreground" />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-3 top-4 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Detailed Protocol Notes</label>
                            <div className="relative">
                                <textarea 
                                    className={`${inputClass} pl-10 min-h-[80px] py-3`} 
                                    value={formData.notes || ''} 
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                                    placeholder="Add any additional context or remarks..."
                                />
                                <StickyNote size={16} className="absolute left-3.5 top-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-5 border-t border-border/40">
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={onClose} 
                            className="text-xs font-medium"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="gap-2 text-xs font-medium"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                            {initialData ? 'Update Secret' : 'Store Secret'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

