import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VCardQRScanner } from './VCardQRScanner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { exportToExcel } from '../lib/excelExport';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  Scale, 
  Store, 
  Landmark, 
  User, 
  ExternalLink, 
  Save, 
  UserPlus, 
  ShieldCheck, 
  LayoutGrid,
  List,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  ContactRound,
  QrCode
} from 'lucide-react';

interface CSLDirectoryManagerProps {
  currentUser: UserAccount | null;
  category?: 'all' | 'lawyer' | 'vendor' | 'government' | 'other';
}

export interface ContactItem {
  id: number | string;
  name: string;
  category: 'Lawyer' | 'Vendor' | 'Government' | 'Other';
  organization: string;
  phone: string;
  email: string;
  city: string;
  notes?: string;
  licenseNo?: string;
}

const MOCK_CONTACTS: ContactItem[] = [
  { id: 1, name: 'Adv. Herman Suryadi, S.H., M.H.', category: 'Lawyer', organization: 'Herman & Partners Law Firm', phone: '+62 811-2345-6789', email: 'herman@hplaw.co.id', city: 'Jakarta Selatan', notes: 'Corporate Litigation, M&A & Contract Drafting', licenseNo: 'PERADI / 98124/2012' },
  { id: 2, name: 'Kantor Notaris Dra. Linda Wijaya, S.H.', category: 'Lawyer', organization: 'Notaris & PPAT Linda Wijaya', phone: '+62 21-555-0192', email: 'notaris.linda@gmail.com', city: 'Jakarta Pusat', notes: 'Deed preparation, RUPS minutes & company incorporation', licenseNo: 'SK Kemenkumham / 2015' },
  { id: 3, name: 'Direktorat Jenderal AHU', category: 'Government', organization: 'Kementerian Hukum & HAM RI', phone: '+62 21-5255-880', email: 'ahu@kemenkumham.go.id', city: 'Jakarta Selatan', notes: 'Company legal entity approvals and statutory filings' },
  { id: 4, name: 'Layanan BKPM / OSS', category: 'Government', organization: 'Kementerian Investasi / BKPM', phone: '163', email: 'kontak@oss.go.id', city: 'Jakarta Selatan', notes: 'NIB, Business License & OSS RBA Support' },
  { id: 5, name: 'PT Solusi Terpadu Legal', category: 'Vendor', organization: 'PT Solusi Terpadu', phone: '+62 21-3890-112', email: 'info@solusilegal.co.id', city: 'Jakarta Barat', notes: 'Legal translation & document legalization services' },
  { id: 6, name: 'BPN Jakarta Pusat', category: 'Government', organization: 'Badan Pertanahan Nasional', phone: '+62 21-3844-098', email: 'kantah.jakpus@atrbpn.go.id', city: 'Jakarta Pusat', notes: 'HGB and Land title verification' },
];

export const CSLDirectoryManager: React.FC<CSLDirectoryManagerProps> = ({ currentUser, category = 'all' }) => {
  const [activeCategory, setActiveCategory] = useState<'all'|'lawyer'|'vendor'|'government'|'other'>(category);
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>(MOCK_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Modals & Feedback state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ContactItem | null>(null);
  
  const isSuperAdmin = useMemo(() => {
    const role = (currentUser?.role || '').trim().toLowerCase();
    return role === 'super admin' || role === 'super_admin' || role === 'owner';
  }, [currentUser]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  
  // Pagination state
  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // Copy-to-clipboard state: stores the id+field that was just copied
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // vCard import ref
  const vcfInputRef = useRef<HTMLInputElement>(null);
  // QR scanner state
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: 'Lawyer' | 'Vendor' | 'Government' | 'Other';
    organization: string;
    phone: string;
    email: string;
    city: string;
    notes: string;
  }>({
    name: '',
    category: (category === 'all' ? 'Lawyer' : category.charAt(0).toUpperCase() + category.slice(1)) as any,
    organization: '',
    phone: '',
    email: '',
    city: '',
    notes: '',
  });

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('csl_contacts').select('*').order('name');
      if (!error && data && data.length > 0) {
        const formatted: ContactItem[] = data.map(item => ({
          id: item.id,
          name: item.name || '',
          category: item.category || 'Other',
          organization: item.organization || '-',
          phone: item.phone || '',
          email: item.email || '-',
          city: item.city || 'Jakarta',
          notes: item.notes || '',
          licenseNo: item.license_no || item.licenseNo
        }));
        setContacts(formatted);
      } else if (data && data.length === 0) {
        setContacts([]);
      }
    } catch (err) {
      console.warn('Using local fallback for contacts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchContacts(); 
  }, []);

  // Reset to page 1 when category changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
  }, [activeCategory]);

  // ── vCard Parser ──
  const parseVCard = (text: string) => {
    const getField = (tag: string): string => {
      // Handles both simple and parameterized tags e.g. TEL;TYPE=CELL:
      const regex = new RegExp(`^${tag}(?:;[^:]*)?:(.*)`, 'mi');
      const match = text.match(regex);
      return match ? match[1].trim().replace(/\\n/g, ' ').replace(/;/g, ', ') : '';
    };

    // ADR field format: ;;street;city;state;postcode;country
    const extractCity = (): string => {
      const adr = getField('ADR');
      if (!adr) return '';
      const parts = adr.split(',').map(s => s.trim()).filter(Boolean);
      // city is typically the 3rd component (index 2 after splitting on ;)
      const rawAdr = text.match(/^ADR(?:;[^:]*)?:(.*)$/mi)?.[1] || '';
      const adrParts = rawAdr.split(';');
      return adrParts[3]?.trim() || adrParts[2]?.trim() || parts[0] || '';
    };

    const defaultCat: 'Lawyer' | 'Vendor' | 'Government' | 'Other' =
      category === 'vendor' ? 'Vendor'
      : category === 'government' ? 'Government'
      : category === 'other' ? 'Other'
      : 'Other';

    return {
      name: getField('FN') || getField('N').replace(';', ' ').trim(),
      organization: getField('ORG').replace(/;/g, ' ').trim(),
      phone: getField('TEL'),
      email: getField('EMAIL'),
      city: extractCity() || 'Jakarta',
      notes: getField('NOTE'),
      category: defaultCat,
    };
  };

  const handleVCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.vcf') && file.type !== 'text/vcard') {
      showFeedback('File tidak valid. Harap upload file berformat .vcf (vCard).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      populateFormFromVCard(text);
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  // Shared handler for both file import and QR scan result
  const populateFormFromVCard = (rawText: string) => {
    const parsed = parseVCard(rawText);
    setEditingContact(null);
    setFormData({
      name: parsed.name,
      category: parsed.category,
      organization: parsed.organization,
      phone: parsed.phone,
      email: parsed.email,
      city: parsed.city,
      notes: parsed.notes,
    });
    setIsModalOpen(true);
    showFeedback(`vCard berhasil dibaca: ${parsed.name || 'Kontak Baru'}. Silakan review dan simpan.`);
  };

  const handleQRResult = (text: string) => {
    // QR code may contain the vCard directly or a URL that serves a vCard
    if (text.toUpperCase().includes('BEGIN:VCARD')) {
      populateFormFromVCard(text);
    } else {
      // Treat as a URL or unknown text – still try to open modal with name as the URL
      showFeedback('QR berhasil dibaca. Konten bukan vCard standar, silakan isi manual.');
      openAddModal();
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    let defaultCat: 'Lawyer' | 'Vendor' | 'Government' | 'Other' = 'Lawyer';
    if (category === 'vendor') defaultCat = 'Vendor';
    if (category === 'government') defaultCat = 'Government';
    if (category === 'other') defaultCat = 'Other';

    setFormData({
      name: '',
      category: defaultCat,
      organization: '',
      phone: '',
      email: '',
      city: 'Jakarta',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: ContactItem) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      category: contact.category,
      organization: contact.organization === '-' ? '' : contact.organization,
      phone: contact.phone,
      email: contact.email === '-' ? '' : contact.email,
      city: contact.city,
      notes: contact.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setIsSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      organization: formData.organization.trim() || '-',
      phone: formData.phone.trim(),
      email: formData.email.trim() || '-',
      city: formData.city.trim() || 'Jakarta',
      notes: formData.notes.trim(),
    };

    try {
      if (editingContact) {
        // UPDATE
        const { error } = await supabase
          .from('csl_contacts')
          .update(payload)
          .eq('id', editingContact.id);

        if (error) throw error;
        showFeedback(`Kontak "${payload.name}" berhasil diperbarui!`);
      } else {
        // CREATE
        const { data, error } = await supabase
          .from('csl_contacts')
          .insert([payload])
          .select();

        if (error) throw error;
        showFeedback(`Kontak baru "${payload.name}" berhasil ditambahkan!`);
      }
      setIsModalOpen(false);
      fetchContacts();
    } catch (err) {
      console.error('Failed to save contact:', err);
      // Fallback local update
      if (editingContact) {
        setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, ...payload } : c));
      } else {
        setContacts(prev => [{ id: Date.now(), ...payload }, ...prev]);
      }
      showFeedback(`Kontak "${payload.name}" tersimpan!`);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const target = deleteConfirm;

    try {
      await supabase.from('csl_contacts').delete().eq('id', target.id);
      showFeedback(`Kontak "${target.name}" telah dihapus.`);
      fetchContacts();
    } catch (err) {
      console.error('Delete failed:', err);
      setContacts(prev => prev.filter(c => c.id !== target.id));
      showFeedback(`Kontak "${target.name}" telah dihapus.`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredContacts.length === 0) {
      showFeedback('Tidak ada data kontak untuk diexport.');
      return;
    }

    const exportData = filteredContacts.map((c, index) => ({
      'No': index + 1,
      'Nama Lengkap / Gelar': c.name,
      'Kategori': c.category,
      'Firma / Instansi': c.organization,
      'No. Telepon': c.phone,
      'Email': c.email,
      'Kota': c.city,
      'Catatan / Spesialisasi': c.notes || '-'
    }));

    const categorySuffix = activeCategory === 'all' ? 'All' : activeCategory.toUpperCase();
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Phone_Directory_CSL_${categorySuffix}_${dateStr}`;

    exportToExcel(exportData, fileName, 'Phone Directory');
    showFeedback(`Berhasil mengekspor ${exportData.length} kontak ke file Excel (.xlsx)!`);
  };

  const filteredContacts = contacts.filter(c => {
    const matchesCategory = 
      activeCategory === 'all' ? true :
      c.category.toLowerCase() === activeCategory.toLowerCase();
    
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.organization.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q) ||
      c.licenseNo?.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  // Reset to page 1 whenever search/filter changes
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Helper: go to page 1 on search change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const getPageMeta = () => {
    switch (activeCategory) {
      case 'lawyer': return { title: 'Lawyers & Notaries Directory', desc: 'Retainer legal counsel, litigation attorneys, PPAT, and notary offices', icon: Scale };
      case 'vendor': return { title: 'Legal Vendors & Sworn Translators', desc: 'Certified legal translation agencies, document legalization, and IP attorneys', icon: Store };
      case 'government': return { title: 'Government Agencies & Ministries', desc: 'Kemenkumham, OSS BKPM, BPN, Tax Office, and provincial authority contacts', icon: Landmark };
      case 'other': return { title: 'Other External Contacts', desc: 'External advisors, consultants, and emergency legal escalations', icon: User };
      default: return { title: 'All Phone Directory Contacts', desc: 'Centralized phone directory for legal counsel, partners, vendors, and statutory agencies', icon: Phone };
    }
  };

  const meta = getPageMeta();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      {/* Hidden vCard file input */}
      <input
        ref={vcfInputRef}
        type="file"
        accept=".vcf,text/vcard"
        className="hidden"
        onChange={handleVCardUpload}
      />

      {/* QR Scanner Modal */}
      <VCardQRScanner
        open={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onResult={handleQRResult}
      />

      <PageHeader title={meta.title} description={meta.desc}>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={handleExportExcel} 
            variant="outline" 
            size="sm" 
            className="h-9"
          >
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <div className="flex items-center rounded-md border bg-background">
            <Button 
              onClick={() => vcfInputRef.current?.click()}
              variant="ghost"
              size="sm" 
              className="h-9 rounded-none border-r px-3"
            >
              <ContactRound className="h-4 w-4 mr-2" /> Import
            </Button>
            <Button 
              onClick={() => setIsQRScannerOpen(true)}
              variant="ghost"
              size="sm" 
              className="h-9 rounded-none px-3"
              title="Scan QR Code dari kartu nama"
            >
              <QrCode className="h-4 w-4 mr-2" /> Scan QR
            </Button>
          </div>
          <Button 
            onClick={openAddModal} 
            size="sm" 
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Contact
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

      {/* KPI Cards when in All View */}
      {activeCategory === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Directory</span>
              <Phone size={16} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">{contacts.length}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Lawyers & Notaries</span>
              <Scale size={16} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">{contacts.filter(c => c.category === 'Lawyer').length}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Govt Agencies</span>
              <Landmark size={16} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">{contacts.filter(c => c.category === 'Government').length}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Legal Vendors</span>
              <Store size={16} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">{contacts.filter(c => c.category === 'Vendor').length}</p>
          </div>
        </div>
      )}

      {/* Search & View Switcher Toolbar (Shadcn Style) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Search + Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search contacts..." 
              className="pl-9 h-9 text-sm rounded-md"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Shadcn Tabs style for categories */}
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto hide-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'lawyer', label: 'Lawyers' },
              { id: 'vendor', label: 'Vendors' },
              { id: 'government', label: 'Government' },
              { id: 'other', label: 'Others' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  activeCategory === cat.id 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-all ${
              viewMode === 'grid' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'hover:text-foreground'
            }`}
          >
            <LayoutGrid size={14} className="mr-1" /> Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-all ${
              viewMode === 'table' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'hover:text-foreground'
            }`}
          >
            <List size={14} className="mr-1" /> List
          </button>
        </div>
      </div>

      {/* Content Rendering: Grid vs Table */}
      {loading ? (
        <div className="bg-card rounded-2xl border border-border/60 p-12 text-center text-muted-foreground flex items-center justify-center gap-2 font-bold text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading contacts directory...
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID / CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedContacts.map(contact => {
            const getInitials = (name: string) => name.replace(/(Adv\.|S\.H\.|M\.H\.|Dra\.|PT|Kantor Notaris)/gi, '').trim().substring(0, 2).toUpperCase();
            return (
              <div key={contact.id} className="bg-card rounded-2xl border border-border/60 shadow-sm hover:bg-muted/40 transition-colors flex flex-col group">
                {/* Card Header */}
                <div className="p-5 pb-4 flex items-start gap-4 border-b">
                  <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                    {getInitials(contact.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground leading-tight truncate">{contact.name}</h3>
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">{contact.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate"><Building2 size={11} className="shrink-0" /> {contact.organization}</p>
                  </div>
                </div>
                {/* Card Body */}
                <div className="p-4 space-y-2 flex-1">
                  {contact.licenseNo && (
                    <div className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md w-fit flex items-center gap-1.5">
                      <ShieldCheck size={11} /> {contact.licenseNo}
                    </div>
                  )}
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{contact.notes}</p>
                  )}
                  <button onClick={() => copyToClipboard(contact.phone, `${contact.id}-phone`)} className="w-full flex items-center justify-between gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground px-2 py-1.5 rounded-md transition-colors group/copy">
                    <span className="flex items-center gap-2"><Phone size={11} className="text-muted-foreground shrink-0" />{contact.phone}</span>
                    {copiedKey === `${contact.id}-phone` ? <Check size={12} /> : <Copy size={11} className="text-muted-foreground/40 group-hover/copy:text-muted-foreground transition-colors" />}
                  </button>
                  {contact.email && contact.email !== '-' && (
                    <button onClick={() => copyToClipboard(contact.email, `${contact.id}-email`)} className="w-full flex items-center justify-between gap-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground px-2 py-1.5 rounded-md transition-colors group/copy">
                      <span className="flex items-center gap-2 truncate"><Mail size={11} className="shrink-0" /><span className="truncate">{contact.email}</span></span>
                      {copiedKey === `${contact.id}-email` ? <Check size={12} className="shrink-0" /> : <Copy size={11} className="text-muted-foreground/40 group-hover/copy:text-muted-foreground transition-colors shrink-0" />}
                    </button>
                  )}
                </div>
                {/* Card Footer */}
                <div className="px-4 py-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={11} /> {contact.city}</div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(contact)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"><Edit3 size={13} /></button>
                    {isSuperAdmin && (
                      <button onClick={() => setDeleteConfirm(contact)} title="Delete Contact" className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/40">
                <TableHead className="text-xs font-semibold text-foreground/80 pl-6">Contact Details</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Category</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">Email</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80">City</TableHead>
                <TableHead className="text-xs font-semibold text-foreground/80 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContacts.map(contact => {
                const getInitials = (name: string) => name.replace(/(Adv\.|S\.H\.|M\.H\.|Dra\.|PT|Kantor Notaris)/gi, '').trim().substring(0, 2).toUpperCase();
                return (
                <TableRow key={contact.id} className="border-border/30 hover:bg-muted/30 transition-colors group">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">{getInitials(contact.name)}</div>
                      <div>
                        <div className="font-medium text-sm text-foreground">{contact.name}</div>
                        <div className="text-xs text-foreground/75 flex items-center gap-1 mt-0.5"><Building2 size={11} /> {contact.organization}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="inline-flex items-center rounded-md border border-border/70 px-2 py-0.5 text-xs font-medium bg-muted/60 text-foreground">{contact.category}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <button onClick={() => copyToClipboard(contact.phone, `${contact.id}-phone`)} className="flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-foreground/80 transition-colors group/cp">
                      {contact.phone}
                      {copiedKey === `${contact.id}-phone` ? <Check size={12} className="text-foreground" /> : <Copy size={11} className="text-muted-foreground/60 group-hover/cp:text-foreground transition-colors" />}
                    </button>
                  </TableCell>
                  <TableCell className="py-4 text-xs">
                    {contact.email && contact.email !== '-' ? (
                      <button onClick={() => copyToClipboard(contact.email, `${contact.id}-email`)} className="flex items-center gap-1.5 text-foreground hover:text-foreground/80 transition-colors group/ce">
                        {contact.email}
                        {copiedKey === `${contact.id}-email` ? <Check size={12} className="text-foreground" /> : <Copy size={11} className="text-muted-foreground/60 group-hover/ce:text-foreground transition-colors" />}
                      </button>
                    ) : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="py-4 text-xs text-foreground">{contact.city}</TableCell>
                  <TableCell className="py-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(contact)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"><Edit3 size={14} /></button>
                      {isSuperAdmin && (
                        <button onClick={() => setDeleteConfirm(contact)} title="Delete Contact (Super Admin Only)" className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-card rounded-2xl border border-border/60 px-5 py-3 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length} contacts
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-border/40 bg-white dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                  page === currentPage
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                    : 'border border-border/40 bg-white dark:bg-zinc-800 text-muted-foreground hover:text-foreground'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-border/40 bg-white dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {!loading && filteredContacts.length === 0 && (
        <div className="bg-card rounded-2xl border border-border/60 p-12 text-center text-muted-foreground space-y-2">
          <Phone className="h-10 w-10 mx-auto opacity-20" />
          <p className="font-bold text-sm text-foreground">No contacts found</p>
          <p className="text-xs opacity-70">Try adjusting your search query or add a new contact</p>
        </div>
      )}

      {/* ── ADD / EDIT CONTACT MODAL ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0">
          {/* Gradient Header */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-sm">
                {editingContact
                  ? <Edit3 size={20} className="text-primary" />
                  : <UserPlus size={20} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold leading-tight">
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5 leading-relaxed">
                  {editingContact
                    ? 'Update contact details in the directory.'
                    : 'Add legal counsel, notary, vendor, or government contact.'}
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">

              {/* Category Selector Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category <span className="text-destructive normal-case tracking-normal font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'Lawyer',     label: 'Lawyer / Notary',         icon: Scale,    color: 'blue' },
                    { value: 'Government', label: 'Government Agency',        icon: Landmark, color: 'amber' },
                    { value: 'Vendor',     label: 'Vendor / Translator',      icon: Store,    color: 'violet' },
                    { value: 'Other',      label: 'Other Contact',            icon: User,     color: 'slate' },
                  ].map(({ value, label, icon: Icon, color }) => {
                    const isSelected = formData.category === value;
                    const colorMap: Record<string, string> = {
                      blue:   isSelected ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'   : 'border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
                      amber:  isSelected ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-border hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
                      violet: isSelected ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'border-border hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20',
                      slate:  isSelected ? 'border-slate-500 bg-slate-500/10 text-slate-600 dark:text-slate-300'  : 'border-border hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30',
                    };
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: value as any })}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 text-left ${colorMap[color]}`}
                      >
                        <Icon size={15} className="flex-shrink-0" />
                        <span className="leading-tight">{label}</span>
                        {isSelected && <Check size={13} className="ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name / Title <span className="text-destructive normal-case tracking-normal font-bold">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    required
                    placeholder="e.g. Adv. Herman Suryadi, S.H., M.H."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization / Law Firm</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    placeholder="e.g. Herman & Partners Law Firm"
                    value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Phone & City */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone <span className="text-destructive normal-case tracking-normal font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      required
                      placeholder="+62 811-xxx-xxx"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-9 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      placeholder="Jakarta"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    type="email"
                    placeholder="info@firm.co.id"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes / Specialization</label>
                <textarea
                  rows={3}
                  placeholder="Specialization, deed services, OSS permits..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-transparent placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring resize-none transition-colors"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground"><span className="text-destructive font-bold">*</span> Required fields</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="px-5 gap-2"
                >
                  {isSubmitting
                    ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                    : <><Save size={14} /> {editingContact ? 'Update Contact' : 'Save Contact'}</>}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong> from the directory? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
