
'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, Tag, Type } from 'lucide-react';
import { AssetCategory } from '../types';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AssetCategory>) => void;
  initialData?: AssetCategory | null;
}

const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 transition-all font-medium placeholder:text-slate-400";
const labelClass = "block text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1";

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<AssetCategory>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ name: '', code: '', description: '' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto font-sans">
            <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-300 flex flex-col border border-slate-200 dark:border-zinc-800">
                <div className="flex justify-between items-center px-9 py-7 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                            {initialData ? 'Update Category' : 'New Category'}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Asset Classification Meta</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"><X size={20} /></button>
                </div>

                <form id="categoryForm" onSubmit={handleSubmit} className="p-9 space-y-8">
                    <div>
                        <label className={labelClass}>Category Name <span className="text-rose-500">*</span></label>
                        <div className="relative">
                            <input
                                type="text" required className={`${inputClass} pl-11 !text-base !font-black focus:ring-blue-500/10`}
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Workstation PC"
                                autoFocus
                            />
                            <Layers size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Cluster Code (Short)</label>
                        <div className="relative">
                            <input
                                type="text" className={`${inputClass} pl-11 !font-black !tracking-widest`}
                                value={formData.code || ''}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. WPC"
                                maxLength={5}
                            />
                            <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Brief Definition</label>
                        <div className="relative">
                            <textarea
                                rows={3} className={`${inputClass} pl-11 resize-none min-h-[100px]`}
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Purpose of this category..."
                            />
                            <Type size={18} className="absolute left-4 top-5 text-slate-400" />
                        </div>
                    </div>
                </form>

                <div className="px-9 py-7 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-end gap-4 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">Cancel</button>
                    <button type="submit" form="categoryForm" className="px-10 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-md text-[12px] font-black uppercase tracking-widest hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 transition-all shadow-xl">Save</button>
                </div>
            </div>
        </div>
    );
};
