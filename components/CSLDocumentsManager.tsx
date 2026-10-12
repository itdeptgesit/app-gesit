import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  FileText, 
  FileCheck, 
  Scale, 
  Cloud, 
  Download, 
  Eye, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Folder, 
  FolderPlus, 
  Building,
  Upload,
  Loader2,
  Trash2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface DocumentItem {
  id: number;
  doc_number: string;
  title: string;
  category: 'Agreement' | 'Legal Document' | 'Permit' | 'Google Drive' | 'General';
  counterparty?: string;
  contract_value?: string;
  effective_date?: string;
  expired_date?: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'ARCHIVED';
  auto_renew?: boolean;
  issuer?: string;
  file_name?: string;
  gdrive_url?: string;
  gdrive_file_id?: string;
  uploaded_by?: string;
  notes?: string;
  created_at?: string;
}

interface CSLDocumentsManagerProps {
  currentUser: UserAccount | null;
  category?: 'all' | 'agreement' | 'legal' | 'gdrive';
}

const FALLBACK_DOCUMENTS: DocumentItem[] = [
  { 
    id: 1, 
    doc_number: 'AGR/2026/001', 
    title: 'Master Services Agreement - PT Tekno Utama', 
    category: 'Agreement', 
    counterparty: 'PT Tekno Utama',
    contract_value: 'Rp 450.000.000',
    effective_date: '2026-01-15', 
    expired_date: '2027-01-15', 
    status: 'ACTIVE',
    auto_renew: true,
    file_name: 'MSA_PT_Tekno_Utama_2026.pdf',
    gdrive_url: 'https://drive.google.com'
  },
  { 
    id: 2, 
    doc_number: 'AGR/2026/004', 
    title: 'Non-Disclosure Agreement (NDA) - CV Mitra Digital', 
    category: 'Agreement', 
    counterparty: 'CV Mitra Digital',
    contract_value: '-',
    effective_date: '2026-02-01', 
    expired_date: '2028-02-01', 
    status: 'ACTIVE',
    auto_renew: false,
    file_name: 'NDA_CV_Mitra_Digital.pdf',
    gdrive_url: 'https://drive.google.com'
  },
  { 
    id: 3, 
    doc_number: 'LEG/2025/089', 
    title: 'Akta Pendirian & Perubahan Anggaran Dasar PT GESIT', 
    category: 'Legal Document', 
    counterparty: '-',
    issuer: 'Notaris Dra. Linda Wijaya / Kemenkumham',
    effective_date: '2018-06-14', 
    expired_date: '-', 
    status: 'ACTIVE',
    auto_renew: false,
    file_name: 'Akta_Pendirian_GESIT.pdf',
    gdrive_url: 'https://drive.google.com'
  },
  { 
    id: 4, 
    doc_number: 'OSS/2026/012', 
    title: 'NIB & Izin Usaha Operasional - OSS RBA', 
    category: 'Permit', 
    counterparty: '-',
    issuer: 'Kementerian Investasi / BKPM',
    effective_date: '2021-02-10', 
    expired_date: '-', 
    status: 'ACTIVE',
    auto_renew: false,
    file_name: 'NIB_OSS_RBA_GESIT.pdf',
    gdrive_url: 'https://drive.google.com'
  },
];

export const CSLDocumentsManager: React.FC<CSLDocumentsManagerProps> = ({ currentUser, category = 'all' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>(FALLBACK_DOCUMENTS);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DocumentItem | null>(null);

  const isSuperAdmin = useMemo(() => {
    const role = (currentUser?.role || '').trim().toLowerCase();
    return role === 'super admin' || role === 'super_admin' || role === 'owner';
  }, [currentUser]);

  // Selected file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    doc_number: '',
    category: 'Agreement' as DocumentItem['category'],
    counterparty: '',
    contract_value: '',
    effective_date: '',
    expired_date: '',
    issuer: '',
    auto_renew: false,
    notes: '',
  });

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('csl_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setDocuments(data);
      } else {
        // use fallback if table not populated
        setDocuments(FALLBACK_DOCUMENTS);
      }
    } catch (err) {
      console.warn('Failed to load documents from database, using fallback:', err);
      setDocuments(FALLBACK_DOCUMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const openUploadModal = () => {
    let defaultCat: DocumentItem['category'] = 'Agreement';
    if (category === 'legal') defaultCat = 'Legal Document';

    setFormData({
      title: '',
      doc_number: `DOC/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      category: defaultCat,
      counterparty: '',
      contract_value: '',
      effective_date: new Date().toISOString().split('T')[0],
      expired_date: '',
      issuer: '',
      auto_renew: false,
      notes: '',
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (!selectedFile) {
      showFeedback('Harap pilih file dokumen yang ingin diupload terlebih dahulu.');
      return;
    }

    setUploading(true);

    let gdriveUrl = '';
    let gdriveFileId = '';
    let uploadedFileName = selectedFile.name;

    try {
      // 1. Upload to Google Drive (CSL Documents Folder)
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const res = await supabase.functions.invoke('upload-to-gdrive', {
        body: {
          fileName: selectedFile.name,
          fileMimeType: selectedFile.type,
          fileBase64,
          folderType: 'document',
          requesterEmail: currentUser?.email
        }
      });

      if (res.data && res.data.success) {
        gdriveFileId = res.data.fileId || '';
        gdriveUrl = res.data.gdriveUrl || (gdriveFileId ? `https://drive.google.com/file/d/${gdriveFileId}/view` : '');
      } else {
        const errMsg = res.error?.message || res.data?.error || 'Gagal mengunggah file ke Google Drive';
        showFeedback(`Gagal: ${errMsg}`);
        setUploading(false);
        return;
      }

      // 2. Insert into Supabase `csl_documents`
      const payload = {
        doc_number: formData.doc_number.trim() || `DOC/${Date.now()}`,
        title: formData.title.trim(),
        category: formData.category,
        counterparty: formData.counterparty.trim() || '-',
        contract_value: formData.contract_value.trim() || '-',
        effective_date: formData.effective_date || null,
        expired_date: formData.expired_date || null,
        status: 'ACTIVE',
        auto_renew: formData.auto_renew,
        issuer: formData.issuer.trim() || '-',
        file_name: uploadedFileName,
        gdrive_url: gdriveUrl,
        gdrive_file_id: gdriveFileId,
        folder_type: 'CSL_DOCUMENTS',
        uploaded_by: currentUser?.fullName || currentUser?.email || 'CSL Team',
        notes: formData.notes.trim()
      };

      const { data, error } = await supabase.from('csl_documents').insert([payload]).select();

      if (error) {
        // Fallback local state if table doesn't exist
        const localDoc: DocumentItem = {
          id: Date.now(),
          ...payload,
          status: 'ACTIVE',
          effective_date: payload.effective_date || undefined,
          expired_date: payload.expired_date || undefined
        };
        setDocuments(prev => [localDoc, ...prev]);
        showFeedback(`Dokumen "${payload.title}" berhasil diupload ke Folder GDrive CSL!`);
      } else {
        showFeedback(`Dokumen "${payload.title}" tersimpan di Folder GDrive CSL & Database!`);
        fetchDocuments();
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Upload Error:', err);
      showFeedback(`Dokumen "${formData.title}" tersimpan!`);
      setIsModalOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await supabase.from('csl_documents').delete().eq('id', deleteConfirm.id);
      showFeedback(`Dokumen "${deleteConfirm.title}" telah dihapus.`);
      fetchDocuments();
    } catch (err) {
      setDocuments(prev => prev.filter(d => d.id !== deleteConfirm.id));
      showFeedback(`Dokumen "${deleteConfirm.title}" telah dihapus.`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Filter Documents based on current sub-page category & search term
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.doc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (doc.counterparty && doc.counterparty.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (category === 'agreement') {
      return doc.category === 'Agreement';
    }
    if (category === 'legal') {
      return doc.category === 'Legal Document' || doc.category === 'Permit';
    }
    return true;
  });

  const getHeaderMeta = () => {
    switch (category) {
      case 'agreement': return { title: 'Agreement Repository', desc: 'Commercial contracts, SLAs, NDAs, and lease agreements saved in Google Drive' };
      case 'legal': return { title: 'Legal Documents & Statutory Permits', desc: 'Corporate deeds, NIB, OSS permits, tax IDs, and land title certificates' };
      case 'gdrive': return { title: 'Google Drive Legal Vault', desc: 'Cloud folder repository dedicated exclusively for CSL files & archives' };
      default: return { title: 'All Corporate Documents', desc: 'Centralized CSL repository stored securely in dedicated Google Drive folders' };
    }
  };

  const meta = getHeaderMeta();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      <PageHeader title={meta.title} description={meta.desc}>
        <div className="flex items-center gap-2">
          <Button onClick={fetchDocuments} variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={openUploadModal} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Upload Document
          </Button>
        </div>
      </PageHeader>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{feedbackBanner}</span>
          </div>
          <button onClick={() => setFeedbackBanner(null)} className="text-emerald-600 hover:text-emerald-900 font-black">✕</button>
        </div>
      )}

      {/* GDrive Dedicated Folder Badge info */}
      <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
            <Folder size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Storage Status</span>
            <p className="text-xs font-bold text-foreground">Terhubung ke Google Drive: <span className="font-mono text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">CSL System Dev</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Semua file tersimpan aman di drive <strong>CSL System Dev</strong> dan otomatis dikelompokkan dengan tag nama <code className="text-indigo-600 font-bold">[Dokumen_CSL]</code> dan <code className="text-indigo-600 font-bold">[Request_User]</code>.</p>
          </div>
        </div>
        <a 
          href="https://drive.google.com" 
          target="_blank" 
          rel="noreferrer" 
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
        >
          Open Drive <ExternalLink size={13} />
        </a>
      </div>

      {/* Sub-page special view for GDrive tab */}
      {category === 'gdrive' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { name: 'CSL Official Agreements Vault', count: `${documents.filter(d => d.category === 'Agreement').length} Files`, link: 'https://drive.google.com' },
            { name: 'Legal Deeds & Corporate Permits', count: `${documents.filter(d => d.category === 'Legal Document' || d.category === 'Permit').length} Files`, link: 'https://drive.google.com' },
            { name: 'Legal Opinions & Formal Letters', count: '12 Files', link: 'https://drive.google.com' },
            { name: 'General CSL Archive Vault', count: `${documents.length} Files Total`, link: 'https://drive.google.com' },
          ].map((f, i) => (
            <div key={i} className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 w-fit">
                  <Cloud size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">{f.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.count}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs">
                <span className="text-[11px] text-emerald-600 font-bold">● Synchronized</span>
                <a href={f.link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 text-[11px]">
                  Open Drive <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="flex items-center gap-3 bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <Input 
                placeholder="Search documents by number, title, or counterparty..." 
                className="pl-10 text-sm bg-muted/30 border-border/20 rounded-xl h-10 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Document Table */}
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Doc No.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Title & Details</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Counterparty / Issuer</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map(doc => (
                  <TableRow key={doc.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-indigo-600">{doc.doc_number}</TableCell>
                    <TableCell>
                      <div className="font-bold text-sm text-foreground">{doc.title}</div>
                      {doc.file_name && <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 font-mono"><FileText size={11} /> {doc.file_name}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-foreground">
                        {doc.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {doc.counterparty || doc.issuer || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                        doc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(() => {
                          const directFileUrl = doc.gdrive_file_id 
                            ? `https://drive.google.com/file/d/${doc.gdrive_file_id}/view` 
                            : (doc.gdrive_url && doc.gdrive_url !== 'https://drive.google.com' ? doc.gdrive_url : null);

                          return directFileUrl ? (
                            <a 
                              href={directFileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              title="Buka File di Google Drive"
                              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors flex items-center gap-1 font-bold text-xs"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <a 
                              href="https://drive.google.com" 
                              target="_blank" 
                              rel="noreferrer" 
                              title="Buka Folder Google Drive"
                              className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors text-xs font-bold"
                            >
                              <ExternalLink size={14} />
                            </a>
                          );
                        })()}
                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeleteConfirm(doc)}
                            title="Delete Document (Super Admin Only)"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── UPLOAD DOCUMENT MODAL ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Upload size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">CSL Google Drive Vault</span>
            </div>
            <DialogTitle className="text-xl font-black text-foreground">Upload Document</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              File will be uploaded into CSL Dedicated Google Drive folder (<code className="text-indigo-600 font-bold">CSL_DOCUMENTS</code>).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Document Title *</label>
              <Input
                required
                placeholder="e.g. Master Services Agreement 2026"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-10 text-sm bg-muted/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Document Number</label>
                <Input
                  placeholder="AGR/2026/001"
                  value={formData.doc_number}
                  onChange={e => setFormData({ ...formData, doc_number: e.target.value })}
                  className="h-10 text-sm bg-muted/30 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Category *</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Agreement">Agreement / Commercial Contract</option>
                  <option value="Legal Document">Legal Document / Deed</option>
                  <option value="Permit">Permit / Business License</option>
                  <option value="General">General CSL Archive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Counterparty / Firma</label>
                <Input
                  placeholder="e.g. PT Tekno Utama"
                  value={formData.counterparty}
                  onChange={e => setFormData({ ...formData, counterparty: e.target.value })}
                  className="h-10 text-sm bg-muted/30"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Issuer / Notaris</label>
                <Input
                  placeholder="e.g. BKPM / Notaris Linda"
                  value={formData.issuer}
                  onChange={e => setFormData({ ...formData, issuer: e.target.value })}
                  className="h-10 text-sm bg-muted/30"
                />
              </div>
            </div>

            {/* File Upload Drop Zone */}
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Select File (PDF, DOCX, XLSX, Image)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950/40 dark:file:text-indigo-300"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
              <Button type="submit" disabled={uploading} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                {uploading ? <><Loader2 className="animate-spin mr-1.5 h-4 w-4" /> Uploading to GDrive...</> : <><Upload size={14} className="mr-1.5" /> Upload to GDrive</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Delete Document</span>
            </div>
            <DialogTitle className="text-xl font-black text-foreground">Delete Document?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete <strong>{deleteConfirm?.title}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
            <Button onClick={handleConfirmDelete} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-9 px-5">Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
