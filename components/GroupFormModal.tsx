
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { UserGroup } from '../types';
import { APP_MENU_STRUCTURE } from '../constants';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserGroup) => void;
  initialData?: UserGroup | null;
}

export const GroupFormModal: React.FC<GroupFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<UserGroup>({
      id: '',
      name: '',
      description: '',
      allowedMenus: []
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ id: '', name: '', description: '', allowedMenus: ['dashboard'] });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple ID generation if empty
    const submission = {
        ...formData,
        id: formData.id || formData.name.replace(/\s+/g, '-').toUpperCase()
    };
    onSubmit(submission);
    onClose();
  };

  const toggleMenu = (menuId: string) => {
      setFormData(prev => {
          const current = prev.allowedMenus;
          if (current.includes(menuId)) {
              return { ...prev, allowedMenus: current.filter(id => id !== menuId) };
          } else {
              return { ...prev, allowedMenus: [...current, menuId] };
          }
      });
  };

  const parentMenus = APP_MENU_STRUCTURE.filter(m => !m.parentId);
  
  const labelClass = "block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 ml-1";
  const inputClass = "w-full border border-slate-200 dark:border-zinc-700 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 transition-all font-medium placeholder:text-slate-400";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] border border-slate-200 dark:border-zinc-800">
                <div className="flex justify-between items-center px-9 py-7 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                            {initialData ? 'Edit Access Group' : 'New Access Group'}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">Access Control & Visibility Policies</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-9 custom-scrollbar">
                    <form id="groupForm" onSubmit={handleSubmit} className="space-y-9">
                        <div className="grid grid-cols-1 gap-8">
                            <div>
                                <label className={labelClass}>Group Name <span className="text-rose-500">*</span></label>
                                <input
                                    type="text" required className={`${inputClass} !font-black !text-base focus:ring-blue-500/10`}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. IT Administrator Support"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Operational Description</label>
                                <textarea
                                    rows={2} className={`${inputClass} resize-none`}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Detailed purpose of this access group..."
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-800/30 p-8 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-7">
                            <h3 className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.2em] mb-4 border-b border-slate-200 dark:border-zinc-700 pb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                                Menu Access Permissions Cluster
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                                {parentMenus.map(parent => {
                                    const children = APP_MENU_STRUCTURE.filter(m => m.parentId === parent.id);
                                    const isParentChecked = formData.allowedMenus.includes(parent.id);

                                    return (
                                        <div key={parent.id} className={`border rounded-md p-4 transition-all ${isParentChecked ? 'border-primary/20 bg-primary/5 ring-1 ring-primary/10' : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-850'}`}>
                                            <label className="flex items-center gap-3 cursor-pointer mb-3 group">
                                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isParentChecked ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-zinc-50 dark:text-zinc-900 shadow-md shadow-zinc-900/10' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 group-hover:border-primary'}`}>
                                                    {isParentChecked && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                <input type="checkbox" className="hidden"
                                                    checked={isParentChecked}
                                                    onChange={() => toggleMenu(parent.id)}
                                                />
                                                <span className="font-black text-slate-800 dark:text-zinc-200 text-xs uppercase tracking-tight">{parent.label}</span>
                                            </label>

                                            {children.length > 0 && (
                                                <div className="ml-8 space-y-2.5 border-l-2 border-slate-100 dark:border-zinc-800 pl-4 py-1">
                                                    {children.map(child => {
                                                        const isChildChecked = formData.allowedMenus.includes(child.id);
                                                        return (
                                                            <label key={child.id} className="flex items-center gap-3 cursor-pointer group/child">
                                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isChildChecked ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-zinc-50 dark:text-zinc-900 shadow-sm shadow-zinc-900/5' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 group-hover/child:border-primary'}`}>
                                                                    {isChildChecked && <Check size={10} strokeWidth={4} />}
                                                                </div>
                                                                <input type="checkbox" className="hidden"
                                                                    checked={isChildChecked}
                                                                    onChange={() => toggleMenu(child.id)}
                                                                />
                                                                <span className={`text-[11px] font-bold ${isChildChecked ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-500 dark:text-zinc-400'} group-hover/child:text-slate-800`}>{child.label}</span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-9 py-7 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-end gap-4 shrink-0">
                    <button type="button" onClick={onClose} className="px-8 py-3 text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">Cancel</button>
                    <button type="submit" form="groupForm" className="px-10 py-3 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-md text-[12px] font-black uppercase tracking-widest hover:bg-zinc-900/90 dark:hover:bg-zinc-50/90 transition-all shadow-xl">Save</button>
                </div>
            </div>
        </div>,
        document.body
    );
};
