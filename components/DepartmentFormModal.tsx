
'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Department {
    id: number;
    name: string;
    head: string;
    memberCount: number;
    description: string;
}

interface DepartmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Department>) => void;
  initialData?: Department | null;
}

const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 transition-all font-medium placeholder:text-slate-400";
const labelClass = "block text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-3 ml-1";

export const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<Department>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ name: '', head: '', description: '', memberCount: 0 });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-300 flex flex-col border border-slate-200 dark:border-zinc-800">
                <div className="flex justify-between items-center px-9 py-7 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                            {initialData ? 'Edit Department' : 'Add New Department'}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Corporate Hierarchy Configuration</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"><X size={20} /></button>
                </div>

                <form id="departmentForm" onSubmit={handleSubmit} className="p-9 space-y-8 overflow-y-auto custom-scrollbar">
                    <div>
                        <label className={labelClass}>Department Name</label>
                        <input
                            type="text" required className={`${inputClass} !font-black focus:ring-primary/10`}
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Information Technology"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Head of Department</label>
                        <input
                            type="text" className={inputClass}
                            value={formData.head || ''}
                            onChange={e => setFormData({ ...formData, head: e.target.value })}
                            placeholder="Full name of HOD"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Member Count</label>
                            <input
                                type="number" className={inputClass}
                                value={formData.memberCount || 0}
                                onChange={e => setFormData({ ...formData, memberCount: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea
                            rows={3} className={`${inputClass} resize-none min-h-[80px]`}
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Role and responsibility overview..."
                        />
                    </div>
                </form>

                <div className="px-9 py-7 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-end gap-4 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">Cancel</button>
                    <button type="submit" form="departmentForm" className="px-10 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-md text-[12px] font-black uppercase tracking-widest hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 transition-all shadow-xl">Save</button>
                </div>
            </div>
        </div>
    );
};
