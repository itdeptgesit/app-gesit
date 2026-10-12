import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, ChevronDown, Upload,
  CheckCircle2, Info, X, Paperclip
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { notifyRequestUpdate } from '../utils/cslNotificationUtils';

interface CSLCategory {
  id: number;
  code: string;
  name: string;
  sla_days: number;
}

interface CSLCreateRequestProps {
  currentUser: UserAccount | null;
  onClose?: () => void;
  onSuccess?: () => void;
}


const MOCK_CATEGORIES: CSLCategory[] = [
  { id: 1, code: 'AGR',       name: 'Agreement',          sla_days: 5 },
  { id: 2, code: 'LREV',      name: 'Legal Review',       sla_days: 5 },
  { id: 3, code: 'CORPSECR',  name: 'Corporate Secretary',sla_days: 5 },
  { id: 4, code: 'OSS',       name: 'OSS',                sla_days: 14 },
  { id: 5, code: 'LIC',       name: 'Licensing',          sla_days: 10 },
  { id: 6, code: 'NOTARY',    name: 'Notary',             sla_days: 7 },
  { id: 7, code: 'LEGALOP',   name: 'Legal Opinion',      sla_days: 5 },
  { id: 8, code: 'DOCREQ',    name: 'Document Request',   sla_days: 2 },
  { id: 9, code: 'COMPLIANCE',name: 'Compliance',         sla_days: 5 },
  { id: 10,code: 'OTHER',     name: 'Other',              sla_days: 5 },
];

function generateRequestNumber(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `REQ-${ym}-${seq}`;
}

export const CSLCreateRequest: React.FC<CSLCreateRequestProps> = ({ currentUser, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedNumber, setSubmittedNumber] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [masterDepartments, setMasterDepartments] = useState<string[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoadingMaster(true);
      try {
        const { data: deptRes } = await supabase.from('departments').select('name').order('name');
        
        if (deptRes) {
          setMasterDepartments(deptRes.map(d => d.name));
        }
      } catch (err) {
        console.error("Error fetching master data:", err);
      } finally {
        setIsLoadingMaster(false);
      }
    };
    fetchMasterData();
  }, []);

  const [form, setForm] = useState({
    department: currentUser?.department || '',
    otherDepartment: '',
    description: '',
    tujuan: '',
    required_date: '',
  });

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...Array.from(files).filter(f => !existing.has(f.name))];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.tujuan.trim() || !form.required_date) return;
    setIsSubmitting(true);

    const requestNumber = generateRequestNumber();
    let slaDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    let slaTargetDays = 5;

    if (form.required_date) {
      const reqDate = new Date(form.required_date);
      // Set to end of day of the required date for SLA calculation
      reqDate.setHours(23, 59, 59, 999);
      slaDueDate = reqDate.toISOString();
      
      const diffTime = reqDate.getTime() - Date.now();
      slaTargetDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const payload = {
      request_number: requestNumber,
      requester_id: String(currentUser?.id || ''),
      requester_email: currentUser?.email || '',
      requester_name: currentUser?.fullName || '',
      department: form.department === 'Other' ? form.otherDepartment : form.department,
      company: currentUser?.company || 'PT GESIT',
      priority: 'Medium',
      status: 'SUBMITTED',
      description: form.description,
      tujuan: form.tujuan,
      progress: 0,
      required_date: form.required_date || null,
      sla_target_days: slaTargetDays,
      sla_due_date: slaDueDate,
    };

    const { data: insertData, error } = await supabase.from('csl_requests').insert([payload]).select('id').single();
    if (error) {
      console.error('DB insert error:', error.message);
      alert(`Gagal mengirim: ${error.message}`);
      setIsSubmitting(false);
      return;
    }

    // Insert initial activity log
    if (insertData?.id) {
      await supabase.from('csl_request_logs').insert([{
        request_id: insertData.id,
        status: 'SUBMITTED',
        actor_name: currentUser?.fullName || currentUser?.email || 'Pemohon',
        actor_id: currentUser?.id ? String(currentUser.id) : null,
        note: 'Permintaan diajukan oleh pemohon',
        has_files: attachedFiles.length > 0,
      }]);

      // Notify CSL Staff about new request submission
      await notifyRequestUpdate({
        id: insertData.id,
        request_number: requestNumber,
        requester_id: currentUser?.id ? String(currentUser.id) : null,
        requester_email: currentUser?.email || '',
        requester_name: currentUser?.fullName || currentUser?.email || 'Pemohon',
        department: form.department === 'Other' ? form.otherDepartment : form.department,
        company: currentUser?.company || 'PT GESIT',
        category_name: (form.department === 'Other' ? form.otherDepartment : form.department) || 'Permintaan Legal',
        status: 'SUBMITTED'
      }, 'SUBMITTED');
    }

    // Upload files to Google Drive if any
    if (attachedFiles.length > 0 && insertData?.id) {
      for (let i = 0; i < attachedFiles.length; i++) {
        const file = attachedFiles[i];
        try {
          const progressVal = Math.round(15 + ((i + 0.3) / attachedFiles.length) * 75);
          setUploadProgress(progressVal);
          setUploadStatusText(`Mengunggah berkas ${i + 1}/${attachedFiles.length}: ${file.name}`);

          // Convert file to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
          });
          
          reader.readAsDataURL(file);
          const base64Data = await base64Promise;

          // Call upload-to-gdrive Edge Function
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-gdrive', {
            body: {
              fileName: `[Lampiran] ${file.name}`,
              fileMimeType: file.type || 'application/octet-stream',
              fileBase64: base64Data,
              requesterEmail: currentUser?.email,
              folderType: 'request'
            }
          });

          if (uploadError) {
             console.error('Failed to upload to GDrive:', uploadError);
          } else if (uploadData?.success && uploadData.gdriveUrl) {
             // Insert into csl_request_documents — pakai kolom yang sama dengan CSLRequestManager
             await supabase.from('csl_request_documents').insert([{
                 request_id: insertData.id,
                 doc_name: file.name,
                 doc_type: 'Lampiran Pemohon',
                 gdrive_url: uploadData.gdriveUrl,
                 gdrive_file_id: uploadData.fileId || null,
                 uploaded_by_id: currentUser?.id ? String(currentUser.id) : null,
                 uploaded_by_name: currentUser?.fullName || currentUser?.email || 'Pemohon',
                 is_visible_to_requester: true,
             }]);
          }

          const finishStepProgress = Math.round(15 + ((i + 1) / attachedFiles.length) * 75);
          setUploadProgress(finishStepProgress);
        } catch (e) {
          console.error('Error processing file:', file.name, e);
        }
      }
    }

    setUploadProgress(100);
    setUploadStatusText('Selesai!');
    setSubmittedNumber(requestNumber);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in duration-500 font-sans">
        <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-lg">
          <CheckCircle2 size={42} className="text-[#C9A84C]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Permintaan Terkirim!</p>
          <h2 className="text-3xl font-black text-foreground font-mono">{submittedNumber}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-sm leading-relaxed">
            Permintaan kamu telah diterima. Tim CSL akan segera menghubungi kamu melalui email.
          </p>
        </div>
        <div className="flex gap-3 mt-8">
          <Button variant="outline" className="rounded-lg font-bold text-sm h-10 px-5" onClick={() => {
            if (onSuccess) onSuccess();
            if (onClose) onClose();
          }}>
            Tutup & Lihat Data
          </Button>
          <Button className="rounded-lg font-bold text-sm h-10 px-5 bg-slate-800 dark:bg-slate-200 dark:text-slate-900 hover:opacity-90" onClick={() => {
            setSubmitted(false);
            setForm({ ...form, description: '', tujuan: '', required_date: '', otherDepartment: '' });
            setAttachedFiles([]);
          }}>
            Buat Permintaan Lain
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-300 pb-2">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1 — Identitas */}
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40 bg-muted/20">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 bg-muted text-foreground border border-border/40">1</div>
            <h2 className="text-sm font-semibold text-foreground">Identitas Pemohon</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama Pemohon</label>
              <Input readOnly value={currentUser?.fullName || '—'} className="h-9 bg-muted/40 cursor-default" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <Input readOnly value={currentUser?.email || '—'} className="h-9 bg-muted/40 text-muted-foreground cursor-default truncate" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Divisi <span className="text-destructive">*</span></label>
              <div className="relative">
                <select
                  required
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground appearance-none"
                >
                  <option value="">— Pilih Divisi —</option>
                  {isLoadingMaster ? (
                    <option disabled>Loading...</option>
                  ) : (
                    <>
                      {masterDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      <option value="Other">Lainnya (Ketik sendiri)</option>
                    </>
                  )}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            
            {form.department === 'Other' && (
              <div className="space-y-1.5 animate-in fade-in duration-300">
                <label className="text-xs font-medium text-foreground">Nama Divisi <span className="text-destructive">*</span></label>
                <Input
                  type="text"
                  required
                  placeholder="Ketik nama divisi"
                  value={form.otherDepartment}
                  onChange={e => setForm(f => ({ ...f, otherDepartment: e.target.value }))}
                  className="h-9"
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2 — Detail */}
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40 bg-muted/20">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 bg-muted text-foreground border border-border/40">2</div>
            <h2 className="text-sm font-semibold text-foreground">Detail Permintaan</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Deskripsi Permintaan Data / Draft <span className="text-destructive">*</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Contoh: Surat Kuasa, CTC ID, Legalitas Dokumen PT xxx, Perubahan Anggaran Dasar, Perjanjian Kerjasama, dll.
              </p>
              <div className="relative">
                <Textarea
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder="Jelaskan dokumen atau draft yang dibutuhkan secara spesifik"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="text-sm resize-none pb-6"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/60 pointer-events-none">
                  {form.description.length} / 1000
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Tujuan Permintaan Data / Draft <span className="text-destructive">*</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Contoh: Untuk keperluan pengajuan izin usaha ke BKPM, untuk presentasi ke investor, dll.
              </p>
              <div className="relative">
                <Textarea
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder="Jelaskan untuk kebutuhan apa dokumen ini diperlukan"
                  value={form.tujuan}
                  onChange={e => setForm(f => ({ ...f, tujuan: e.target.value }))}
                  className="text-sm resize-none pb-6"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/60 pointer-events-none">
                  {form.tujuan.length} / 1000
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Permintaan Dibutuhkan Pada Tanggal <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={form.required_date?.split('T')[0] || ''}
                onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))}
                className="h-9 w-full sm:w-60"
              />
              <p className="text-[11px] text-muted-foreground">Tanggal paling lambat dokumen harus sudah siap diterima</p>
            </div>
          </div>
        </div>

        {/* SECTION 3 — Lampiran */}
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40 bg-muted/20">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 bg-muted text-foreground border border-border/40">3</div>
            <h2 className="text-sm font-semibold text-foreground">Lampiran Dokumen</h2>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">
                Upload List Permintaan{' '}
                <span className="font-normal text-muted-foreground">(Opsional)</span>
              </label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Screenshot WhatsApp, email, template dokumen, draft terkait, dll.
              </p>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
              className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'
              }`}
            >
              <Upload size={20} className="text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Klik untuk pilih file</p>
              <p className="text-[11px] text-muted-foreground">atau seret dan lepas file di sini</p>
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden" onChange={e => addFiles(e.target.files)} />
            </div>
            <p className="text-[10px] text-muted-foreground">JPG, PNG, PDF, DOCX, XLSX — maks. 10MB per file</p>
            {attachedFiles.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {attachedFiles.map(file => (
                  <div key={file.name} className="flex items-center justify-between bg-muted/40 border border-border/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip size={13} className="text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setAttachedFiles(prev => prev.filter(f => f.name !== file.name)); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-2.5 bg-muted/40 border border-border/50 rounded-xl px-4 py-3">
          <Info size={15} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pantau terus sistem CSL ini dan cek juga email Anda secara berkala untuk mengetahui perkembangan request.
          </p>
        </div>

        {/* Upload Progress Bar */}
        {isSubmitting && attachedFiles.length > 0 && (
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground flex items-center gap-1.5 truncate">
                <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                {uploadStatusText || 'Mengunggah lampiran...'}
              </span>
              <span className="font-mono text-xs font-semibold text-foreground shrink-0">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onClose?.()} disabled={isSubmitting} className="flex-1 h-9 rounded-md text-xs font-medium">
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 h-9 rounded-md text-xs font-medium">
            {isSubmitting
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Mengirim...</>
              : <><Send className="mr-1.5 h-3.5 w-3.5" /> Kirim Permintaan</>}
          </Button>
        </div>
      </form>
    </div>
  );
};
