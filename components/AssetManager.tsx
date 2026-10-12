'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Plus, Pencil, QrCode, RefreshCcw, Trash2, Package, CheckCircle2, History,
  Download, FileSpreadsheet, ChevronLeft, ChevronRight, Clock, AlertCircle, XCircle, RotateCcw,
  FileText
} from 'lucide-react';
import { AssetFormModal } from './AssetFormModal';
import { AssetQRModal } from './AssetQRModal';
import { AssetDetailModal } from './AssetDetailModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { ITAsset, UserAccount } from '../types';
import { AssetHandoverModal } from './AssetHandoverModal';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import { trackActivity } from '../lib/auditLogger';
import * as XLSX from 'xlsx';
import { StatCard } from './StatCard';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/button';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface AssetManagerProps {
  currentUser: UserAccount | null;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ITAsset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<ITAsset | null>(null);
  const [qrAsset, setQrAsset] = useState<ITAsset | null>(null);
  const [detailAsset, setDetailAsset] = useState<ITAsset | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [notification, setNotification] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [handoverAsset, setHandoverAsset] = useState<ITAsset | null>(null);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  // RBAC Logic
  const roleLower = (currentUser?.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin';
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
  const isStaff = roleLower === 'staff';
  const canManage = isAdmin || isSuperAdmin || isStaff;
  const canDelete = isAdmin || isSuperAdmin;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const { data: assetData } = await supabase.from('it_assets').select('*').order('id', { ascending: true });
      if (assetData) {
        setAssets(assetData.map((item: any) => ({
          id: item.id, assetId: item.asset_id, item: item.item_name, category: item.category, brand: item.brand,
          serialNumber: item.serial_number, status: item.status, location: item.location, user: item.user_assigned,
          remarks: item.remarks, company: item.company, department: item.department,
          purchaseDate: (item.purchase_date && item.purchase_date.toString().toLowerCase() !== 'nan' && item.purchase_date !== '-') ? item.purchase_date : null,
          specs: item.specs || {},
          image_url: item.image_url,
          condition: item.condition,
          vendor: item.vendor,
          price: item.price,
          warrantyExp: (item.warranty_exp && item.warranty_exp.toString().toLowerCase() !== 'nan' && item.warranty_exp !== '-') ? item.warranty_exp : null
        })));
      }
    } catch (error) { console.error('Error fetching assets:', error); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAssets(); }, []);

  const filteredAssets = useMemo(() => assets.filter(asset => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (asset.item || '').toLowerCase().includes(searchLower) || (asset.user || '').toLowerCase().includes(searchLower) || (asset.assetId || '').toLowerCase().includes(searchLower);
    let matchesStatus = statusFilter === 'All' ? true : asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [assets, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(start, start + itemsPerPage);
  }, [filteredAssets, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Used':
        return <div className="flex items-center gap-1.5 text-emerald-500 font-medium text-xs"><CheckCircle2 size={12} /> Live</div>;
      case 'Idle':
        return <div className="flex items-center gap-1.5 text-blue-500 font-medium text-xs"><Clock size={12} /> Stock</div>;
      case 'Repair':
        return <div className="flex items-center gap-1.5 text-amber-500 font-medium text-xs"><RefreshCcw size={12} /> Maint</div>;
      case 'Broken':
        return <div className="flex items-center gap-1.5 text-rose-500 font-medium text-xs"><AlertCircle size={12} /> Fail</div>;
      case 'Disposed':
        return <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs"><XCircle size={12} /> Out</div>;
      default:
        return <span className="text-xs font-medium text-slate-400">{status}</span>;
    }
  };

  const handleExportExcel = () => {
    if (filteredAssets.length === 0) return;

    const exportData = filteredAssets.map(a => ({
      "Asset ID": a.assetId,
      "Item Name": a.item,
      "Category": a.category,
      "Brand": a.brand || "",
      "S/N": a.serialNumber || "",
      "Status": a.status,
      "Condition": a.condition || "New",
      "Location": a.location,
      "User Assigned": a.user || "Unassigned",
      "Department": a.department || "",
      "Company": a.company,
      "Purchase Date": a.purchaseDate || "-",
      "Warranty Exp": a.warrantyExp || "-",
      "Vendor": a.vendor || "",
      "Barcode URL": `${(import.meta.env.VITE_ASSET_BASE_URL || 'https://it.gesit.co.id/asset').replace(/\/+$/, '')}?id=${a.assetId}`,
      "Remarks": a.remarks || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");

    // Auto-size columns
    const wscols = [
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 },
      { wch: 40 }, { wch: 30 }
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `GESIT-ASSETS-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Item": "Contoh: Laptop Thinkpad X1",
        "Category": "Laptop",
        "Company": "Gesit Alumas",
        "Brand": "Lenovo",
        "Serial Number": "SN123456",
        "Status": "Active",
        "Custodian": "Rudi",
        "Location": "Office A",
        "Department": "IT",
        "Purchase Date": "2024-01-20",
        "Remarks": "Catatan tambahan",
        "Asset ID": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assets");

    // Auto-size columns
    const wscols = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 30 }, { wch: 20 }
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, "GESIT_ASSET_TEMPLATE.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setNotification({ text: 'Starting bulk import...', type: 'success' });

    try {
      const reader = new FileReader();
      const loadFile = () => new Promise<ArrayBuffer>((resolve) => {
        reader.onload = (evt) => resolve(evt.target?.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });

      const buffer = await loadFile();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (rawData.length === 0) throw new Error('Excel file is empty');

      // 1. Fetch metadata for ID generation
      const { data: companies } = await supabase.from('companies').select('name, code');
      const { data: categories } = await supabase.from('asset_categories').select('name, code');
      const { data: existingAssets } = await supabase.from('it_assets').select('asset_id, company, category');

      const companyMap = new Map(companies?.map(c => [c.name.toLowerCase().trim(), c.code]));
      const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase().trim(), c.code]));

      // 2. Build current counters for sequential IDs
      const counters: Record<string, number> = {};
      existingAssets?.forEach(a => {
        const parts = (a.asset_id || '').split('-');
        if (parts.length >= 3) {
          const isIT = parts[0].toUpperCase() === 'IT';
          const prefix = isIT ? `${parts[1]}-${parts[2]}` : `${parts[0]}-${parts[1]}`;
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num)) {
            counters[prefix] = Math.max(counters[prefix] || 0, num);
          }
        }
      });

      const validRecords = rawData.map((rawRow: any) => {
        // Normalize keys
        const row: any = {};
        Object.keys(rawRow).forEach(key => {
          if (rawRow[key] !== null && rawRow[key] !== undefined) {
            row[key.toLowerCase().trim()] = rawRow[key];
          }
        });

        if (Object.keys(row).length === 0) return null;

        const itemName = (row.item || row.itemname || row['item name'] || row.name || row.produk || row.barang || row.item_name || '').toString().trim();
        const category = (row.category || row.kategori || '').toString().trim();
        const company = (row.company || row.perusahaan || row.pt || '').toString().trim();

        if (!itemName || !category || !company) return null;

        // Generate Professional ID: COMP-CAT-001
        let finalAssetId = (row.assetid || row.asset_id || row['asset id'] || '').toString().trim();

        if (!finalAssetId) {
          const compCode = companyMap.get(company.toLowerCase()) || company.substring(0, 3).toUpperCase();
          const catCode = categoryMap.get(category.toLowerCase()) || category.substring(0, 3).toUpperCase();
          const prefix = `${compCode}-${catCode}`;

          counters[prefix] = (counters[prefix] || 0) + 1;
          const suffix = counters[prefix].toString().padStart(3, '0');
          finalAssetId = `${prefix}-${suffix}`;
        }

        return {
          item_name: itemName,
          category: category,
          brand: (row.brand || row.merk || '').toString().trim(),
          serial_number: (row.serialnumber || row.serial_number || row['serial number'] || row.sn || '').toString().trim(),
          status: (row.status || 'Active').toString().trim(),
          location: (row.location || row.lokasi || '').toString().trim(),
          user_assigned: (row.user || row.custodian || row.pemakai || '').toString().trim(),
          remarks: (row.remarks || row.notes || row.keterangan || '').toString().trim(),
          company: company,
          department: (row.department || row.departemen || row.dept || '').toString().trim(),
          purchase_date: row.purchasedate || row.purchase_date || row['purchase date'] || row.tanggal || null,
          asset_id: finalAssetId,
          image_url: row.image_url || row.image || null
        };
      }).filter((r): r is any => r !== null);

      if (validRecords.length === 0) {
        const foundHeaders = rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'None';
        throw new Error(`Data tidak terbaca atau kolom utama (Item, Category, Company) tidak ditemukan. Judul kolom yang terbaca: [${foundHeaders}]`);
      }

      const { error } = await supabase.from('it_assets').insert(validRecords);
      if (error) throw error;

      await trackActivity(
        currentUser?.fullName || 'User',
        currentUser?.role || 'User',
        'Bulk Import',
        'Assets',
        `Imported ${validRecords.length} assets from Excel`
      );

      setNotification({ text: `Successfully imported ${validRecords.length} assets`, type: 'success' });
      fetchAssets();
    } catch (err: any) {
      console.error('Import error:', err);
      setNotification({ text: `Import failed: ${err.message}`, type: 'error' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full min-h-screen bg-transparent py-4 sm:py-6 px-0 sm:px-4 space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Asset Manager" description="Managed corporate inventory">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx, .xls, .csv"
          onChange={handleImportExcel}
        />
        {(isAdmin || isSuperAdmin) && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="h-9 px-3 shrink-0"
              title="Download Blank Template"
            >
              <Download className="w-3.5 h-3.5 sm:mr-2" />
              <span className="hidden sm:inline">Template</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="h-9 px-3 shrink-0 border-dashed"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 sm:mr-2 ${isImporting ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isImporting ? 'Processing...' : 'Bulk Import'}</span>
            </Button>
          </div>
        )}
        <Button 
          size="sm"
          onClick={handleExportExcel} 
          className="h-9 px-3 shrink-0"
        >
          <Download className="w-3.5 h-3.5 sm:mr-2" />
          <span className="hidden sm:inline">Export Excel</span>
        </Button>
      </PageHeader>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${notification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-400'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{notification.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total assets" value={assets.length} subValue="Total entries" icon={Package} color="blue" />
        <StatCard label="In production" value={assets.filter(a => a.status === 'Used' || a.status === 'Active').length} icon={CheckCircle2} color="emerald" />
        <StatCard label="Standby stock" value={assets.filter(a => a.status === 'Idle').length} icon={History} color="indigo" />
      </div>

      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-all">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Filter item name or custodian..." 
            className="w-full pl-11 bg-muted/20 border-muted-foreground/10 focus-visible:ring-1 focus-visible:ring-primary h-10 text-xs rounded-xl" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 md:w-[150px] h-10 bg-background border-muted text-sm rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-sm">All Status</SelectItem>
              <SelectItem value="Active" className="text-sm">Active</SelectItem>
              <SelectItem value="Used" className="text-sm">Used</SelectItem>
              <SelectItem value="Idle" className="text-sm">Idle</SelectItem>
              <SelectItem value="Repair" className="text-sm">Repair</SelectItem>
              <SelectItem value="Broken" className="text-sm">Broken</SelectItem>
              <SelectItem value="Disposed" className="text-sm">Disposed</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={resetFilters}
            className="h-10 w-10 text-muted-foreground hover:text-destructive border-muted-foreground/10 shrink-0 rounded-xl"
            title="Reset Filters"
          >
            <RotateCcw size={16} />
          </Button>

          {canManage && (
            <Button 
              onClick={() => { setEditingAsset(null); setIsModalOpen(true); }} 
              className="h-10 gap-2 flex-1 md:flex-none rounded-xl"
            >
              <Plus size={14} /> Add Asset
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/20 hover:bg-transparent">
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Node Profile</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Cluster</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Assignment / Site</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Status</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80 text-center">Protocol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-50 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                        <div className="flex flex-col gap-2 w-full">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-8 w-24 mx-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedAssets.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="px-6 py-20 text-center text-sm text-muted-foreground">No entries detected.</TableCell></TableRow>
              ) : paginatedAssets.map((asset) => (
                <TableRow key={asset.id} className="group">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => { setDetailAsset(asset); setIsDetailOpen(true); }}
                        className="w-10 h-10 rounded-md bg-muted/50 border border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/40 transition-colors border-dashed"
                      >
                        {asset.image_url ? (
                          <img src={asset.image_url} alt={asset.item} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center opacity-20 group-hover:opacity-40 transition-opacity">
                            <Package size={14} className="text-slate-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-sm leading-none">{asset.item}</span>
                        <span className="text-xs font-medium text-primary mt-1.5 font-mono">{asset.assetId}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4"><span className="text-sm text-muted-foreground">{asset.category}</span></TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground text-sm">{asset.user || 'Unassigned'}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">{asset.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {getStatusIcon(asset.status)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5 opacity-100 md:opacity-40 md:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => { setQrAsset(asset); setIsQROpen(true); }} className="w-8" title="Label"><QrCode size={14} /></Button>

                      {canManage && (
                        <Button variant="ghost" size="icon" onClick={() => { setEditingAsset(asset); setIsModalOpen(true); }} className="w-8" title="Edit">
                          <Pencil size={14} />
                        </Button>
                      )}

                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteAsset(asset)} className="w-8" title="Delete">
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View (Card List) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-zinc-800/40">
          {isLoading ? (
            Array.from({ length: itemsPerPage }).map((_, idx) => (
              <div key={idx} className="p-4 space-y-3">
                <div className="flex justify-between"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /></div>
                <div className="flex gap-3"><Skeleton className="w-12 h-12 rounded-lg shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/3" /></div></div>
                <div className="grid grid-cols-2 gap-2"><Skeleton className="h-7 w-full" /><Skeleton className="h-7 w-full" /></div>
              </div>
            ))
          ) : paginatedAssets.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No entries detected.</div>
          ) : paginatedAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => { setDetailAsset(asset); setIsDetailOpen(true); }}
              className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {asset.category}
                </span>
                <div>
                  {getStatusIcon(asset.status)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border flex items-center justify-center overflow-hidden shrink-0 border-dashed">
                  {asset.image_url ? (
                    <img src={asset.image_url} alt={asset.item} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={18} className="text-slate-400 opacity-50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-sm text-foreground block truncate">{asset.item}</span>
                  <span className="text-xs font-medium text-primary mt-1 block font-mono">{asset.assetId}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-zinc-800/20 text-[11px]">
                <div>
                  <span className="text-xs block font-medium text-muted-foreground leading-none">Custodian</span>
                  <span className="font-medium text-foreground block truncate mt-0.5">{asset.user || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-xs block font-medium text-muted-foreground leading-none">Location</span>
                  <span className="font-medium text-foreground block truncate mt-0.5">{asset.location || '-'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-zinc-800/20">
                <span className="text-xs text-muted-foreground">
                  {asset.brand ? `${asset.brand}` : ''} {asset.serialNumber ? `· S/N: ${asset.serialNumber}` : ''}
                </span>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="View QR Code Label"
                    onClick={() => { setQrAsset(asset); setIsQROpen(true); }}
                    className="w-7 h-7 text-slate-500 hover:text-indigo-600"
                    title="Label"
                  >
                    <QrCode size={14} />
                  </Button>

                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit Asset"
                      onClick={() => { setEditingAsset(asset); setIsModalOpen(true); }}
                      className="w-7 h-7 text-slate-500 hover:text-amber-600"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete Asset"
                      onClick={() => setDeleteAsset(asset)}
                      className="w-7 h-7 text-slate-500 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-slate-50/30 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Page {currentPage} of {totalPages || 1} ({filteredAssets.length} assets)</p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              className="w-8 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              className="w-8 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      <AssetFormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAsset(null); }} onSubmit={async (formData) => {
        try {
          if (!formData.assetId) throw new Error("Asset ID could not be generated. Please select Company and Category.");

          const sanitizeDate = (date: string | null | undefined) => {
            if (!date || date.toString().toLowerCase() === 'nan' || date === '-') return null;
            return date;
          };

          const payload = {
            item_name: formData.item,
            category: formData.category,
            brand: formData.brand,
            serial_number: formData.serialNumber,
            status: formData.status,
            location: formData.location,
            user_assigned: formData.user,
            remarks: formData.remarks,
            company: formData.company,
            department: formData.department,
            purchase_date: sanitizeDate(formData.purchaseDate),
            specs: formData.specs,
            asset_id: formData.assetId,
            image_url: formData.image_url,
            condition: formData.condition,
            vendor: formData.vendor,
            price: formData.price,
            warranty_exp: sanitizeDate(formData.warrantyExp)
          };

          let error;
          if (editingAsset) {
            const result = await supabase.from('it_assets').update(payload).eq('id', editingAsset.id);
            error = result.error;
          } else {
            const result = await supabase.from('it_assets').insert([payload]);
            error = result.error;
          }


          if (error) throw error;

          await trackActivity(
            currentUser?.fullName || 'User',
            currentUser?.role || 'User',
            editingAsset ? 'Update Asset' : 'Create Asset',
            'Assets',
            `${editingAsset ? 'Updated' : 'Created'} asset ${payload.asset_id} (${payload.item_name})`
          );

          setNotification({ text: editingAsset ? 'Asset updated successfully' : 'Asset added successfully', type: 'success' });
          setTimeout(() => setNotification(null), 3000);

          setIsModalOpen(false);
          setEditingAsset(null);
          await fetchAssets();
        } catch (error: any) {
          console.error('Submission error:', error);
          setNotification({ text: `Failed to save asset: ${error.message || 'Unknown error'}`, type: 'error' });
          setTimeout(() => setNotification(null), 5000);
        }
      }} initialData={editingAsset} />
      <AssetQRModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} asset={qrAsset} />
      <AssetDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} asset={detailAsset} />
      <DangerConfirmModal isOpen={!!deleteAsset} onClose={() => setDeleteAsset(null)} onConfirm={async () => {
        if (!deleteAsset) return;
        const { error } = await supabase.from('it_assets').delete().eq('id', deleteAsset.id);
        if (!error) {
          await trackActivity(
            currentUser?.fullName || 'User',
            currentUser?.role || 'User',
            'Delete Asset',
            'Assets',
            `Deleted asset ${deleteAsset.assetId} (${deleteAsset.item})`
          );
        }
        setDeleteAsset(null);
        await fetchAssets();
      }} title="Purge Record" message={`Irreversibly remove "${deleteAsset?.item}" node?`} />
      <AssetHandoverModal
        isOpen={isHandoverOpen}
        onClose={() => {
          setIsHandoverOpen(false);
          setHandoverAsset(null);
          fetchAssets();
        }}
        asset={handoverAsset}
        currentUser={currentUser}
      />
    </div>
  );
};

