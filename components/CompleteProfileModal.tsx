import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent } from './ui/dialog';
import { Loader2, Briefcase, Building2, UserCircle2, Sparkles } from 'lucide-react';

interface CompleteProfileModalProps {
  user: UserAccount | null;
  onUpdateSuccess: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ user, onUpdateSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    department: '',
    company: ''
  });

  const [departmentList, setDepartmentList] = useState<{ name: string }[]>([]);
  const [companyList, setCompanyList] = useState<{ id: number, name: string }[]>([]);

  useEffect(() => {
    if (user && (user.department === 'Other' || !user.department || user.company === 'GESIT' || !user.company)) {
      setIsOpen(true);
      setFormData({
        department: user.department === 'Other' ? '' : (user.department || ''),
        company: user.company === 'GESIT' ? '' : (user.company || '')
      });
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      const fetchMasterData = async () => {
        const { data: depts } = await supabase.from('departments').select('name').order('name');
        if (depts) setDepartmentList(depts);

        const { data: comps } = await supabase.from('companies').select('id, name').order('name');
        if (comps) setCompanyList(comps);
      };
      fetchMasterData();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.department || !formData.company) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_accounts')
        .update({
          department: formData.department,
          company: formData.company
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsOpen(false);
      onUpdateSuccess();
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormComplete = formData.department && formData.company;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && formData.department && formData.company) {
        setIsOpen(false);
      }
    }}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">

        {/* Gold top accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #C9A84C, #e8c97a, #C9A84C)' }} />

        {/* Navy hero header */}
        <div className="relative px-7 pt-7 pb-6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0B1A35 0%, #0D2145 100%)' }}>

          {/* Decorative circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
            style={{ background: '#C9A84C' }} />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-5"
            style={{ background: '#C9A84C' }} />

          {/* Icon + Title */}
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1.5px solid rgba(201,168,76,0.3)' }}>
              <UserCircle2 size={22} style={{ color: '#C9A84C' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={11} style={{ color: '#C9A84C' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(201,168,76,0.8)' }}>Satu Langkah Lagi</span>
              </div>
              <h2 className="text-xl font-black text-white leading-tight tracking-tight">
                Lengkapi Profil Anda
              </h2>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Pilih departemen & perusahaan Anda untuk mulai menggunakan CSL System.
              </p>
            </div>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="px-7 py-6 bg-white dark:bg-zinc-900 space-y-5">

          {/* Department */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
              <Briefcase size={12} style={{ color: '#C9A84C' }} />
              Departemen
            </label>
            <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
              <SelectTrigger
                className="h-12 rounded-xl text-sm font-medium border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 focus:ring-0 transition-all"
                style={{
                  borderColor: formData.department ? '#C9A84C' : undefined,
                  boxShadow: formData.department ? '0 0 0 3px rgba(201,168,76,0.1)' : undefined
                }}
              >
                <SelectValue placeholder="Pilih departemen..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                {departmentList.map(d => (
                  <SelectItem key={d.name} value={d.name} className="text-sm">{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
              <Building2 size={12} style={{ color: '#C9A84C' }} />
              Perusahaan
            </label>
            <Select value={formData.company} onValueChange={(v) => setFormData({ ...formData, company: v })}>
              <SelectTrigger
                className="h-12 rounded-xl text-sm font-medium border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 focus:ring-0 transition-all"
                style={{
                  borderColor: formData.company ? '#C9A84C' : undefined,
                  boxShadow: formData.company ? '0 0 0 3px rgba(201,168,76,0.1)' : undefined
                }}
              >
                <SelectValue placeholder="Pilih perusahaan..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                {companyList.map(c => (
                  <SelectItem key={c.id} value={c.name} className="text-sm">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(Number(!!formData.department) + Number(!!formData.company)) * 50}%`,
                  background: 'linear-gradient(90deg, #C9A84C, #e8c97a)'
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {Number(!!formData.department) + Number(!!formData.company)}/2
            </span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSaving || !isFormComplete}
            className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 mt-1"
            style={{
              background: isFormComplete ? '#0B1A35' : '#94a3b8',
              cursor: isFormComplete ? 'pointer' : 'not-allowed',
              opacity: isSaving ? 0.8 : 1,
              transform: 'scale(1)',
            }}
            onMouseEnter={e => { if (isFormComplete) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {isSaving
              ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
              : <><Sparkles size={15} /> Simpan & Lanjutkan</>
            }
          </button>

          <p className="text-center text-[11px] text-slate-400">
            Data ini diperlukan untuk menggunakan fitur CSL System.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
