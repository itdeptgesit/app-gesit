
'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Link, FileText, Folder, Type, Cloud } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { GoogleDrivePickerModal } from './GoogleDrivePickerModal';

interface FileFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    folders: { id: string; name: string }[];
    initialData?: any | null;
}

export const FileFormModal: React.FC<FileFormModalProps> = ({ isOpen, onClose, onSubmit, folders, initialData }) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [drivePickerOpen, setDrivePickerOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        gdriveUrl: '',
        type: 'pdf'
    });

    React.useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                category: initialData.category || '',
                gdriveUrl: initialData.gdriveUrl,
                type: initialData.type || 'pdf'
            });
        } else {
            setFormData({ name: '', category: '', gdriveUrl: '', type: 'pdf' });
        }
    }, [initialData, isOpen]);

    const handleSelectDriveFile = (selectedFiles: any[]) => {
        if (selectedFiles.length === 0) return;
        const file = selectedFiles[0];
        
        // Map Google mimeType to local type
        let mappedType = 'pdf';
        const mime = file.mimeType.toLowerCase();
        if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) {
            mappedType = 'sheet';
        } else if (mime.includes('document') || mime.includes('word')) {
            mappedType = 'doc';
        } else if (mime.includes('image')) {
            mappedType = 'image';
        } else if (mime.includes('folder')) {
            mappedType = 'folder';
        }
        
        setFormData(prev => ({
            ...prev,
            name: prev.name || file.name,
            gdriveUrl: file.webViewLink,
            type: mappedType
        }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                category: formData.category,
                gdrive_url: formData.gdriveUrl,
                type: formData.type,
                updated_at: new Date().toISOString()
            };

            if (initialData) {
                const { error } = await supabase.from('files').update(payload).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const insertPayload = { ...payload, id: Date.now().toString() };
                const { error } = await supabase.from('files').insert([insertPayload]);
                if (error) throw error;
            }

            onSubmit(formData);
            onClose();
            setFormData({ name: '', category: '', gdriveUrl: '', type: 'pdf' });
        } catch (err: any) {
            showToast("Upload failed: " + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary mt-1 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 transition-all font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600";
    const labelClass = "block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh] border border-white/20 dark:border-zinc-800">
                <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 dark:border-zinc-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{initialData ? 'Update Document' : 'Register Document'}</h2>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">Cloud Link Integration</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} id="fileForm" className="p-8 space-y-6">
                    <div>
                        <label className={labelClass}>Document Title</label>
                        <div className="relative">
                            <input
                                type="text" required className={`${inputClass} pl-10`}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Network Policy 2025"
                            />
                            <FileText size={14} className="absolute left-3.5 top-4 text-slate-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Classification</label>
                            <div className="relative">
                                <input
                                    type="text" required className={`${inputClass} pl-10`}
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g. Manual"
                                />
                                <Folder size={14} className="absolute left-3.5 top-4 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Data Modality</label>
                            <div className="relative">
                                <select
                                    className={`${inputClass} pl-10`}
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option value="pdf">PDF Static</option>
                                    <option value="doc">Word Entry</option>
                                    <option value="sheet">Data Sheet</option>
                                    <option value="image">Diagram</option>
                                </select>
                                <Type size={14} className="absolute left-3.5 top-4 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className={labelClass}>Storage URI (Google Drive)</label>
                            <button
                                type="button"
                                onClick={() => setDrivePickerOpen(true)}
                                className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white flex items-center gap-1 uppercase tracking-wider transition-all"
                            >
                                <Cloud size={11} />
                                Choose from Drive
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type="url" required className={`${inputClass} pl-10`}
                                value={formData.gdriveUrl}
                                onChange={e => setFormData({ ...formData, gdriveUrl: e.target.value })}
                                placeholder="https://drive.google.com/..."
                            />
                            <Link size={14} className="absolute left-3.5 top-4 text-slate-400" />
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-2 font-bold uppercase tracking-widest italic ml-1">Must be a shareable public or workspace link</p>
                    </div>
                </form>

                <div className="px-8 py-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 rounded-b-xl flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-zinc-700">Cancel</button>
                    <button type="submit" form="fileForm" disabled={isSubmitting} className="px-8 py-2.5 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 transition-all shadow active:scale-95 disabled:opacity-50">
                        {isSubmitting ? 'Processing...' : (initialData ? 'Update Document' : 'Commit to Library')}
                    </button>
                </div>
            </div>

            {/* Google Drive Picker Modal */}
            <GoogleDrivePickerModal
                isOpen={drivePickerOpen}
                onClose={() => setDrivePickerOpen(false)}
                onSelectFiles={handleSelectDriveFile}
            />
        </div>,
        document.body
    );
};

