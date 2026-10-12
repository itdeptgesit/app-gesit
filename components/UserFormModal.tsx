'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { UserAccount, UserGroup, Company } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<UserAccount>) => void | Promise<void>;
  initialData?: UserAccount | null;
  availableGroups?: UserGroup[];
  employeeMode?: boolean;
}

type FormState = Partial<UserAccount> & { password?: string };

const steps = [
  { title: 'Personal Info', description: 'Identitas dasar employee' },
  { title: 'Informasi Pekerjaan', description: 'Penempatan dan jabatan' },
  { title: 'Kontrak & PKWT', description: 'Status dan periode kontrak' },
  { title: 'Data Payroll', description: 'Data pembayaran dan pajak' },
];

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';
const labelClass = 'text-xs font-semibold text-slate-600';

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen, onClose, onSubmit, initialData, employeeMode = false,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<{ name: string }[]>([]);
  const [existingEmployeeIds, setExistingEmployeeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false); 

  const generatedEmployeeId = (() => {
    if (!form.joinDate) return '';
    const date = new Date(`${form.joinDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const prefix = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const usedNumbers = existingEmployeeIds
      .filter(id => id.startsWith(prefix))
      .map(id => Number(id.slice(4)))
      .filter(Number.isInteger);
    const nextNumber = Math.max(0, ...usedNumbers) + 1;
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  })();

  const organizationValue = form.company || ''; 
  const jobPositionValue = form.jobTitle || ''; 
  const employeeStatusValue = form.status || 'Active';
  const branchNameValue = form.branch || ''; 
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) => setErrors(prev => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    clearError(String(key));
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setForm(initialData ? { ...initialData } : {
      fullName: '', nickname: '', email: '', dateOfBirth: '', company: '', department: '',
      employeeCode: '', joinDate: '', jobTitle: '', jobLevel: '', employmentType: '', branch: '',
      gradeClass: '', residentialAddress: '', contractType: '', pkwtNumber: '', contractStartDate: '',
      contractEndDate: '', employmentStatus: 'Active', statusEffectiveDate: '', separationDate: '', separationReason: '', payrollStatus: '', taxStatus: '', bankName: '', bankAccountName: '',
      bankAccountNumber: '', bpjsTkNumber: '', bpjsHealthNumber: '', status: 'Active',
    });
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const loadOptions = async () => {
      const [{ data: companyRows }, { data: departmentRows }, { data: employeeRows }] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('departments').select('name').order('name'),
        supabase.from('user_accounts').select('employee_code').not('employee_code', 'is', null),
      ]);
      if (companyRows) setCompanies(companyRows as Company[]);
      if (departmentRows) setDepartments(departmentRows as { name: string }[]);
      if (employeeRows) setExistingEmployeeIds(employeeRows.map((row: { employee_code: string | null }) => row.employee_code).filter((value): value is string => Boolean(value)));
    };
    void loadOptions();
  }, [isOpen]);

  const update = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const validate = (targetStep: number) => {
    const nextErrors: Record<string, string> = {};
    if (targetStep === 1) {
      if (!form.fullName?.trim()) nextErrors.fullName = 'Nama lengkap wajib diisi.';
      if (!form.email?.trim()) nextErrors.email = 'Email resmi wajib diisi.';
    }
    if (targetStep === 2) {
      if (!form.company?.trim()) nextErrors.company = 'Company wajib dipilih.';
      if (!form.department?.trim()) nextErrors.department = 'Department wajib dipilih.';
      if (!form.employmentType?.trim()) nextErrors.employmentType = 'Jenis kepegawaian wajib diisi.';
    }
    const pkwt = `${form.employmentType || ''} ${form.contractType || ''}`.toLowerCase().includes('pkwt');
    if (targetStep === 3 && pkwt) {
      if (!form.contractStartDate) nextErrors.contractStartDate = 'Tanggal mulai PKWT wajib diisi.';
      if (!form.contractEndDate) nextErrors.contractEndDate = 'Tanggal selesai PKWT wajib diisi.';
    }
    setErrors(prev => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => { if (validate(step)) setStep(value => Math.min(4, value + 1)); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate(1) || !validate(2) || !validate(3)) return;
    setSaving(true);
    try {
      let employeeCode = form.employeeCode || '';
      if (!initialData && form.joinDate && !employeeCode) {
        const { data: generatedCode, error: codeError } = await supabase.rpc('next_employee_code', { p_join_date: form.joinDate });
        if (codeError || !generatedCode) throw codeError || new Error('Employee ID tidak berhasil dibuat');
        employeeCode = String(generatedCode);
      }
      const employeePayload: FormState = { ...form, employeeCode: employeeCode || generatedEmployeeId };
      delete employeePayload.password;
      delete employeePayload.nik;
      await onSubmit(employeePayload);
    } finally { setSaving(false); }
  };

  const Field = ({ label, name, type = 'text', required = false, placeholder = '' }: { label: string; name: keyof FormState; type?: string; required?: boolean; placeholder?: string }) => (
      <label className="block">
        <span className={labelClass}>{label}{required && <span className="text-rose-500"> *</span>}</span>
        <input type={type} required={required} aria-invalid={Boolean(errors[String(name)])} className={`${inputClass} ${errors[String(name)] ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`} value={String(form[name] || '')} onChange={e => setField(name, e.target.value)} placeholder={placeholder} />
        {errors[String(name)] && <span className="mt-1 block text-xs font-medium text-rose-600">{errors[String(name)]}</span>}
      </label>
    );

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[92vh] max-w-4xl flex-col overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-none">
        <div className="flex items-start justify-between border-b border-slate-100 px-7 py-5">
          <div><DialogTitle className="text-xl font-bold text-slate-950">{initialData ? 'Edit Data Employee' : 'Tambah Employee'}</DialogTitle><p className="mt-1 text-xs text-slate-500">Registrasi data employee. Pengaturan approval berada di modul terpisah.</p></div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
        </div>
        <div className="border-b border-slate-100 px-7 py-5">
          <div className="flex items-start">
            {steps.map((item, index) => { const number = index + 1; const complete = number < step; const active = number === step; return <React.Fragment key={item.title}>
              <button type="button" disabled={number > step} onClick={() => setStep(number)} className="flex w-28 shrink-0 flex-col items-center gap-2 text-center">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : active ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>{complete ? <Check size={16} /> : number}</span>
                <span className={`text-[11px] font-semibold leading-tight ${complete ? 'text-emerald-600' : active ? 'text-slate-950' : 'text-slate-400'}`}>{item.title}</span>
              </button>
              {number < steps.length && <span className={`mt-[18px] h-0.5 flex-1 ${number < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </React.Fragment>; })}
          </div>
        </div>
        <form id="employee-form" onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-7 py-6">
            <p className="mb-5 text-sm text-slate-500">{steps[step - 1].description}</p>
            {step === 1 && <div className="grid gap-5 sm:grid-cols-2"><div><Field label="Full Name" name="fullName" required placeholder="Nama lengkap sesuai identitas" /></div><div><Field label="Nama Panggilan" name="nickname" placeholder="Nama yang biasa dipakai" /></div><label className="block"><span className={labelClass}>Jenis Kelamin</span><select className={inputClass} value={String(form.gender || '')} onChange={e => setField('gender', e.target.value)}><option value="">Pilih jenis kelamin</option><option value="Perempuan">Perempuan</option><option value="Laki-laki">Laki-laki</option></select></label><Field label="Tempat Lahir" name="birthPlace" /><Field label="Tanggal Lahir" name="dateOfBirth" type="date" /><label className="block"><span className={labelClass}>Status Pernikahan</span><select className={inputClass} value={String(form.maritalStatus || '')} onChange={e => setField('maritalStatus', e.target.value)}><option value="">Pilih status pernikahan</option><option value="Married">Married</option><option value="Single">Single</option></select></label><label className="block"><span className={labelClass}>Religion</span><select className={inputClass} value={String(form.religion || '')} onChange={e => setField('religion', e.target.value)}><option value="">Pilih agama</option><option value="Islam">Islam</option><option value="Protestant Christianity">Protestant Christianity</option><option value="Catholicism">Catholicism</option><option value="Hinduism">Hinduism</option><option value="Buddhism">Buddhism</option><option value="Confucianism">Confucianism</option></select></label><label className="block"><span className={labelClass}>Blood Type</span><select className={inputClass} value={String(form.bloodType || '')} onChange={e => setField('bloodType', e.target.value)}><option value="">Pilih golongan darah</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option></select></label><Field label="Official Email" name="email" type="email" required /><Field label="Nomor HP" name="phone" /><div className="sm:col-span-2"><label className="block"><span className={labelClass}>Alamat Domisili</span><textarea className={`${inputClass} min-h-24 resize-y`} value={String(form.residentialAddress || '')} onChange={e => setField('residentialAddress', e.target.value)} placeholder="Alamat lengkap tempat tinggal saat ini" rows={4} /></label></div></div>}
            {step === 2 && <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className={labelClass}>Employee ID</span><input readOnly className={`${inputClass} bg-slate-50 font-semibold text-slate-500`} value={generatedEmployeeId} placeholder="Otomatis dari Join Date" /></label><label className="block"><span className={labelClass}>Branch Name</span><select className={inputClass} value={String(form.company || '')} onChange={e => setField('company', e.target.value)}><option value="">Pilih branch / company</option>{companies.map(company => <option key={company.id} value={company.name}>{company.name}</option>)}</select></label><label className="block"><span className={labelClass}>Organization *</span><select required className={inputClass} value={String(form.department || '')} onChange={e => setField('department', e.target.value)}><option value="">Pilih organization / department</option>{departments.map(department => <option key={department.name} value={department.name}>{department.name}</option>)}</select></label><Field label="Job Position" name="jobTitle" required /><label className="block"><span className={labelClass}>Job Level</span><select className={inputClass} value={String(form.jobLevel || '')} onChange={e => setField('jobLevel', e.target.value)}><option value="">Pilih job level</option><option value="Vice President">Vice President</option><option value="Deputy/Manager">Deputy/Manager</option><option value="Supervisor">Supervisor</option><option value="Staff">Staff</option><option value="Operator">Operator</option></select></label><label className="block"><span className={labelClass}>Status Employee</span><select className={inputClass} value={String(form.employmentType || '')} onChange={e => setField('employmentType', e.target.value)}><option value="">Pilih status employee</option><option value="Permanent">Permanent</option><option value="Contract">Contract</option><option value="Probation">Probation</option></select></label><Field label="Join Date" name="joinDate" type="date" /><Field label="Grade / Class" name="gradeClass" /><div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Employee ID dibuat otomatis dari Join Date: format <b>YYMM + nomor urut</b>. Contoh Oktober 2026: <b>2610001</b>.</div></div>}
            {step === 3 && <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className={labelClass}>Lifecycle Status</span><select className={inputClass} value={String(form.employmentStatus || 'Active')} onChange={e => setField('employmentStatus', e.target.value)}><option value="Active">Active</option><option value="On Leave">On Leave</option><option value="Resigned">Resigned</option><option value="Terminated">Terminated</option></select></label><Field label="Status Effective Date" name="statusEffectiveDate" type="date" /><Field label="Separation Date" name="separationDate" type="date" /><div className="sm:col-span-2"><Field label="Separation / Leave Reason" name="separationReason" placeholder="Alasan cuti panjang, resign, atau termination" /></div><Field label="Contract Type" name="contractType" placeholder="PKWTT / PKWT" /><Field label="Nomor PKWT" name="pkwtNumber" /><Field label="Contract Start Date" name="contractStartDate" type="date" /><Field label="Contract End Date" name="contractEndDate" type="date" /><div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">Untuk PKWTT, tanggal akhir kontrak boleh dikosongkan. Untuk PKWT, periode kontrak wajib lengkap.</div></div>}
            {step === 4 && <div className="grid gap-5 sm:grid-cols-2"><Field label="Payroll Status" name="payrollStatus" /><Field label="Tax Status" name="taxStatus" /><Field label="Bank Name" name="bankName" /><Field label="Bank Account Name" name="bankAccountName" /><Field label="Bank Account Number" name="bankAccountNumber" /><Field label="BPJS Ketenagakerjaan" name="bpjsTkNumber" /><Field label="BPJS Kesehatan" name="bpjsHealthNumber" /></div>}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-7 py-4"><Button type="button" variant="outline" onClick={step === 1 ? onClose : () => setStep(value => value - 1)}>{step === 1 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}</Button>{step < 4 ? <Button type="button" onClick={next}>Next <ChevronRight size={16} /></Button> : <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>}</div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;
