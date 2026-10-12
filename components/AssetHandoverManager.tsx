'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Search, ShieldCheck, UserCheck, Plus, Trash2, Cpu, Info, Check, ChevronsUpDown, Loader2, RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ITAsset, UserAccount } from '../types';
import { exportAssetTransferForm, AssetTransferInfo } from '../lib/handoverPdfExport';
import { useLanguage } from '../translations';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { WarningConfirmModal } from './WarningConfirmModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { Skeleton } from './ui/skeleton';

interface AssetHandoverManagerProps {
  currentUser: UserAccount | null;
}

export const AssetHandoverManager: React.FC<AssetHandoverManagerProps> = ({ currentUser }) => {
  const { t, language } = useLanguage();
  const isId = language === 'id';

  // 1. Core States
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [existingDocNo, setExistingDocNo] = useState('');
  const [handoverSearchTerm, setHandoverSearchTerm] = useState('');
  const [deleteHandover, setDeleteHandover] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handoverAssets = useMemo(() => {
    return assets.filter(a => a.user && (a.remarks || '').includes('[BAST]'));
  }, [assets]);

  const [handovers, setHandovers] = useState<any[]>([]);
  const [isLoadingHandovers, setIsLoadingHandovers] = useState(false);

  const fetchHandovers = async () => {
    setIsLoadingHandovers(true);
    try {
      const { data, error } = await supabase
        .from('it_asset_handovers')
        .select(`
          *,
          it_assets (
            id,
            asset_id,
            item_name,
            brand,
            serial_number
          )
        `)
        .order('handover_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('it_asset_handovers table check:', error.message);
      } else if (data) {
        setHandovers(data);
        calculateNextSequence(data);
      }
    } catch (err) {
      console.error('Error fetching handovers:', err);
    } finally {
      setIsLoadingHandovers(false);
    }
  };

  const calculateNextSequence = (handoversList: any[]) => {
    const currentYear = new Date().getFullYear();
    let maxSeq = 0;

    handoversList.forEach(h => {
      if (h.doc_no) {
        const parts = h.doc_no.split('/');
        if (parts.length >= 4) {
          const year = parseInt(parts[3], 10);
          if (year === currentYear) {
            const seqNum = parseInt(parts[1], 10);
            if (!isNaN(seqNum) && seqNum > maxSeq) {
              maxSeq = seqNum;
            }
          }
        }
      }
    });

    const nextSeq = maxSeq + 1;
    setDocSequence(String(nextSeq).padStart(3, '0'));
  };

  // 1b. Master Data States
  const [masterCompanies, setMasterCompanies] = useState<Array<{ id: number; name: string; code?: string }>>([]);
  const [masterDepartments, setMasterDepartments] = useState<Array<{ id: number; name: string }>>([]);

  // 2. Originator Details States (Prefilled with currently logged-in user details)
  const [originatorCompany, setOriginatorCompany] = useState('PT Gesit Alumas');
  const [originatorName, setOriginatorName] = useState('');
  const [originatorPosition, setOriginatorPosition] = useState('IT Specialist');
  const [originatorDept, setOriginatorDept] = useState('IT');

  // 3. Recipient Details States
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('');
  const [recipientDivision, setRecipientDivision] = useState('');
  const [recipientDept, setRecipientDept] = useState('');
  const [recipientLocation, setRecipientLocation] = useState('Head Office - The City Tower');

  // 4. Document & Handover Info States
  const [handoverDate, setHandoverDate] = useState('');
  const [docSequence, setDocSequence] = useState('001');
  const [customDocNo, setCustomDocNo] = useState('');
  const [isManualDocNo, setIsManualDocNo] = useState(false);

  // 5. Equipment States
  const [includeBag, setIncludeBag] = useState(true);
  const [includeCharger, setIncludeCharger] = useState(true);
  const [includeMouse, setIncludeMouse] = useState(true);
  const [mouseModel, setMouseModel] = useState('Mouse Wireless Logitech B170');
  const [customEquipments, setCustomEquipments] = useState<Array<{ name: string; serialNo: string; remarks: string }>>([]);
  const [note, setNote] = useState('');

  // 6. Optional Accessory details & Asset Remarks states
  const [bagSerial, setBagSerial] = useState('');
  const [bagRemarks, setBagRemarks] = useState('Black');
  const [chargerSerial, setChargerSerial] = useState('');
  const [chargerRemarks, setChargerRemarks] = useState('Black');
  const [mouseSerial, setMouseSerial] = useState('');
  const [mouseRemarks, setMouseRemarks] = useState('Black');
  const [assetRemark, setAssetRemark] = useState('');

  // Fetch all assets from Supabase
  const fetchAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const { data: assetData, error } = await supabase
        .from('it_assets')
        .select('*')
        .order('item_name', { ascending: true });

      if (error) throw error;

      if (assetData) {
        setAssets(
          assetData.map((item: any) => ({
            id: item.id,
            assetId: item.asset_id,
            item: item.item_name,
            category: item.category,
            brand: item.brand,
            serialNumber: item.serial_number,
            status: item.status,
            location: item.location,
            user: item.user_assigned,
            remarks: item.remarks,
            company: item.company,
            department: item.department,
            purchaseDate: item.purchase_date,
            specs: item.specs || {},
            image_url: item.image_url,
            condition: item.condition,
            vendor: item.vendor,
            price: item.price,
            warrantyExp: item.warranty_exp,
          }))
        );
      }

      // Fetch companies from master DB table
      const { data: companyData } = await supabase.from('companies').select('id, name, code').order('name');
      if (companyData) setMasterCompanies(companyData);

      // Fetch departments from master DB table
      const { data: deptData } = await supabase.from('departments').select('id, name').order('name');
      if (deptData) setMasterDepartments(deptData);

    } catch (err) {
      console.error('Error fetching assets:', err);
      showNotification('Failed to fetch assets list.', 'error');
    } finally {
      setIsLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchHandovers();

    // Default Dates Setup
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    setHandoverDate(localToday.toISOString().split('T')[0]);

    // Set default originator details from current logged-in user
    if (currentUser) {
      setOriginatorName(currentUser.fullName || '');
      setOriginatorCompany(currentUser.company || 'PT Gesit Alumas');
      setOriginatorPosition(currentUser.jobTitle || 'IT Specialist');
      setOriginatorDept(currentUser.department || 'IT');
    }
  }, [currentUser]);

  // Recalculate BAST Document Number dynamically
  const generatedDocNo = useMemo(() => {
    if (!handoverDate) return '';
    const dateObj = new Date(handoverDate);
    const year = dateObj.getFullYear();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[dateObj.getMonth()];

    let companyPrefix = 'GI';
    if (selectedAsset?.assetId) {
      const parts = selectedAsset.assetId.split('-');
      if (parts[0]) companyPrefix = parts[0].toUpperCase();
    } else if (recipientCompany) {
      // Fallback to recipient company initials if no asset selected
      const words = recipientCompany.split(' ');
      if (words.length > 1) {
        companyPrefix = words.map(w => w[0]).join('').toUpperCase();
      } else {
        companyPrefix = recipientCompany.substring(0, 3).toUpperCase();
      }
    }

    const paddedSeq = String(docSequence).padStart(3, '0');
    return `ATF-${companyPrefix}/${paddedSeq}/${romanMonth}/${year}`;
  }, [selectedAsset, recipientCompany, handoverDate, docSequence]);

  // Handle selected asset change
  const handleAssetSelect = (asset: ITAsset) => {
    setSelectedAsset(asset);
    setIsAssetDropdownOpen(false);

    // Auto-fill recipient details if asset has assigned user
    if (asset.user) setRecipientName(asset.user);
    if (asset.company) setRecipientCompany(asset.company);
    if (asset.department) setRecipientDept(asset.department);
    setRecipientPosition(asset.specs?.processor ? 'User Custodian' : 'User');
    setRecipientDivision('');
    setRecipientLocation(asset.location || 'Head Office - The City Tower');

    // Auto-generate elegant default note
    setNote(`New member ${asset.company || 'Gesit Company'} - ${asset.user || 'User'}`);

    // Auto-prefill Asset Remark
    setAssetRemark(asset.remarks ? asset.remarks.replace('[BAST]', '').trim() : '');
  };

  // Keep manual or auto document number aligned
  const finalDocNo = isManualDocNo ? customDocNo : generatedDocNo;

  // Add Custom Accessories Row
  const handleAddEquipment = () => {
    setCustomEquipments([...customEquipments, { name: '', serialNo: '-', remarks: '' }]);
  };

  const handleRemoveEquipment = (index: number) => {
    setCustomEquipments(customEquipments.filter((_, idx) => idx !== index));
  };

  const handleEquipmentChange = (index: number, field: 'name' | 'serialNo' | 'remarks', val: string) => {
    const updated = [...customEquipments];
    updated[index][field] = val;
    setCustomEquipments(updated);
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const proceedCetakBAST = async () => {
    if (!selectedAsset) return;
    setIsGenerating(true);
    try {
      // Assemble supporting equipments
      const supportingEquipment: Array<{ name: string; serialNo: string; remarks: string }> = [];
      if (includeBag) {
        supportingEquipment.push({
          name: 'Tas Laptop',
          serialNo: bagSerial.trim() || '-',
          remarks: bagRemarks.trim() || 'Black'
        });
      }
      if (includeCharger) {
        supportingEquipment.push({
          name: 'Charger Laptop',
          serialNo: chargerSerial.trim() || '-',
          remarks: chargerRemarks.trim() || 'Black'
        });
      }
      if (includeMouse) {
        supportingEquipment.push({
          name: mouseModel || 'Mouse Wireless Logitech B170',
          serialNo: mouseSerial.trim() || '-',
          remarks: mouseRemarks.trim() || 'Black'
        });
      }
      customEquipments.forEach(eq => {
        if (eq.name.trim()) {
          supportingEquipment.push(eq);
        }
      });

      const info: AssetTransferInfo = {
        originatorCompany,
        originatorName,
        originatorPosition,
        originatorDept,
        recipientName,
        recipientCompany,
        recipientPosition,
        recipientDivision,
        recipientDept,
        recipientLocation,
        handoverDate,
        docNo: finalDocNo,
        supportingEquipment,
        note
      };

      // Automatically update the asset custodian details in Supabase database!
      let finalRemarks = (assetRemark || '').trim();
      if (!finalRemarks.includes('[BAST]')) {
        finalRemarks = (finalRemarks + ' [BAST]').trim();
      }

      const { error: updateError } = await supabase
        .from('it_assets')
        .update({
          user_assigned: recipientName,
          company: recipientCompany,
          department: recipientDept,
          location: recipientLocation,
          remarks: finalRemarks
        })
        .eq('id', selectedAsset.id);

      if (updateError) {
        console.error('Error updating asset assignment:', updateError);
        alert(`Gagal memperbarui data status kepemilikan aset di database: ${updateError.message}`);
      } else {
        // Re-fetch assets list to show updated details in the table instantly!
        await fetchAssets();
      }

      // Save formal BAST handover history record to it_asset_handovers table!
      const handoverPayload = {
        asset_id: selectedAsset.id,
        doc_no: finalDocNo,
        handover_date: handoverDate,
        recipient_name: recipientName,
        recipient_company: recipientCompany,
        recipient_position: recipientPosition,
        recipient_division: recipientDivision,
        recipient_dept: recipientDept,
        recipient_location: recipientLocation,
        originator_name: originatorName,
        originator_company: originatorCompany,
        originator_position: originatorPosition,
        originator_dept: originatorDept,
        include_bag: includeBag,
        bag_serial: includeBag ? bagSerial : null,
        bag_remarks: includeBag ? bagRemarks : null,
        include_charger: includeCharger,
        charger_serial: includeCharger ? chargerSerial : null,
        charger_remarks: includeCharger ? chargerRemarks : null,
        include_mouse: includeMouse,
        mouse_model: includeMouse ? mouseModel : null,
        mouse_serial: includeMouse ? mouseSerial : null,
        mouse_remarks: includeMouse ? mouseRemarks : null,
        custom_equipments: customEquipments.filter(e => e.name.trim()),
        note: note,
        asset_remark: assetRemark,
        created_by: currentUser?.fullName || 'System'
      };

      const { error: insertError } = await supabase
        .from('it_asset_handovers')
        .insert([handoverPayload]);

      if (insertError) {
        console.error('Error saving BAST:', insertError);
        alert(`Gagal menyimpan riwayat BAST ke database: ${insertError.message}\n\nSilakan pastikan Anda telah menjalankan script SQL migrasi it_asset_handovers di editor SQL Supabase Anda.`);
      } else {
        await fetchHandovers();
      }

      await exportAssetTransferForm(selectedAsset, info);
      showNotification('Asset Transfer Form (BAST) PDF generated successfully!', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showNotification('Failed to generate BAST PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCetakBAST = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      showNotification('Please select an asset first.', 'error');
      return;
    }
    if (!recipientName) {
      showNotification('Please enter recipient name.', 'error');
      return;
    }

    try {
      // Check if handover already exists for this asset in it_asset_handovers
      const { data: existingHandovers, error: checkError } = await supabase
        .from('it_asset_handovers')
        .select('id, doc_no')
        .eq('asset_id', selectedAsset.id)
        .limit(1);

      if (checkError) {
        console.warn('Error checking existing handovers:', checkError);
      }

      if (existingHandovers && existingHandovers.length > 0) {
        setExistingDocNo(existingHandovers[0].doc_no);
        setWarningModalOpen(true);
        return;
      }

      await proceedCetakBAST();
    } catch (err) {
      console.error('Error in BAST check:', err);
    }
  };

  // Filtered Assets list for searchable dropdown
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const q = assetSearchTerm.toLowerCase();
      return (
        (asset.item || '').toLowerCase().includes(q) ||
        (asset.serialNumber || '').toLowerCase().includes(q) ||
        (asset.assetId || '').toLowerCase().includes(q) ||
        (asset.brand || '').toLowerCase().includes(q) ||
        (asset.user || '').toLowerCase().includes(q)
      );
    });
  }, [assets, assetSearchTerm]);

  // Filtered Handovers list for search bar
  const filteredHandovers = useMemo(() => {
    return handovers.filter(h => {
      const q = handoverSearchTerm.toLowerCase();
      const docNo = (h.doc_no || '').toLowerCase();
      const assetId = (h.it_assets?.asset_id || '').toLowerCase();
      const deviceName = (h.it_assets?.item_name || '').toLowerCase();
      const recipient = (h.recipient_name || '').toLowerCase();
      const company = (h.recipient_company || '').toLowerCase();
      const dept = (h.recipient_dept || '').toLowerCase();
      return docNo.includes(q) || assetId.includes(q) || deviceName.includes(q) || recipient.includes(q) || company.includes(q) || dept.includes(q);
    });
  }, [handovers, handoverSearchTerm]);

  // Instant Cetak Ulang PDF
  const handleInstantCetakUlang = async (handover: any) => {
    const relatedAsset = assets.find(a => a.id === handover.asset_id) || {
      id: handover.asset_id,
      assetId: handover.it_assets?.asset_id || '-',
      item: handover.it_assets?.item_name || 'Deleted Asset',
      brand: handover.it_assets?.brand || '-',
      serialNumber: handover.it_assets?.serial_number || '-',
      specs: {}
    } as ITAsset;

    const supportingEquipment: Array<{ name: string; serialNo: string; remarks: string }> = [];
    if (handover.include_bag) {
      supportingEquipment.push({
        name: 'Tas Laptop',
        serialNo: handover.bag_serial || '-',
        remarks: handover.bag_remarks || 'Black'
      });
    }
    if (handover.include_charger) {
      supportingEquipment.push({
        name: 'Charger Laptop',
        serialNo: handover.charger_serial || '-',
        remarks: handover.charger_remarks || 'Black'
      });
    }
    if (handover.include_mouse) {
      supportingEquipment.push({
        name: handover.mouse_model || 'Mouse Wireless Logitech B170',
        serialNo: handover.mouse_serial || '-',
        remarks: handover.mouse_remarks || 'Black'
      });
    }
    if (handover.custom_equipments) {
      handover.custom_equipments.forEach((eq: any) => {
        if (eq.name) supportingEquipment.push(eq);
      });
    }

    const info: AssetTransferInfo = {
      originatorCompany: handover.originator_company,
      originatorName: handover.originator_name,
      originatorPosition: handover.originator_position,
      originatorDept: handover.originator_dept,
      recipientName: handover.recipient_name,
      recipientCompany: handover.recipient_company,
      recipientPosition: handover.recipient_position,
      recipientDivision: handover.recipient_division,
      recipientDept: handover.recipient_dept,
      recipientLocation: handover.recipient_location,
      handoverDate: handover.handover_date,
      docNo: handover.doc_no,
      supportingEquipment,
      note: handover.note
    };

    try {
      setIsGenerating(true);
      await exportAssetTransferForm(relatedAsset, info);
      showNotification(isId ? 'Berhasil mencetak ulang PDF!' : 'PDF successfully reprinted!', 'success');
    } catch (err) {
      console.error('Error printing again:', err);
      showNotification(isId ? 'Gagal mencetak ulang PDF.' : 'Failed to reprint PDF.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Return / Pengembalian Aset
  const handleReturnAsset = (handover: any) => {
    const relatedAsset = assets.find(a => a.id === handover.asset_id);
    if (relatedAsset) {
      setSelectedAsset(relatedAsset);
    }

    // Swap: Originator is now the previous Recipient (User)
    setOriginatorName(handover.recipient_name || '');
    setOriginatorCompany(handover.recipient_company || '');
    setOriginatorPosition(handover.recipient_position || '');
    setOriginatorDept(handover.recipient_dept || '');

    // Recipient is now IT (prefetch logged-in IT user if available)
    if (currentUser) {
      setRecipientName(currentUser.fullName || '');
      setRecipientCompany(currentUser.company || 'PT Gesit Alumas');
      setRecipientPosition(currentUser.jobTitle || 'IT Specialist');
      setRecipientDept(currentUser.department || 'IT');
      setRecipientLocation('Head Office - The City Tower');
      setRecipientDivision('');
    }

    // Load accessories
    setIncludeBag(handover.include_bag !== false);
    setBagSerial(handover.bag_serial || '');
    setBagRemarks(handover.bag_remarks || 'Black');

    setIncludeCharger(handover.include_charger !== false);
    setChargerSerial(handover.charger_serial || '');
    setChargerRemarks(handover.charger_remarks || 'Black');

    setIncludeMouse(handover.include_mouse !== false);
    setMouseModel(handover.mouse_model || 'Mouse Wireless Logitech B170');
    setMouseSerial(handover.mouse_serial || '');
    setMouseRemarks(handover.mouse_remarks || 'Black');

    setCustomEquipments(handover.custom_equipments || []);

    // Elegant return note
    setNote(isId
      ? `PENGEMBALIAN ASET: Pengembalian aset dari ${handover.recipient_name} kepada IT`
      : `ASSET RETURN: Asset returned from ${handover.recipient_name} to IT`
    );
    setAssetRemark(handover.asset_remark || '');

    // Generate an elegant return document sequence
    if (handover.doc_no) {
      const parts = handover.doc_no.split('/');
      if (parts.length >= 4) {
        setCustomDocNo(`ATF-RET/${parts[1]}/${parts[2]}/${parts[3]}`);
      }
    }

    showNotification(
      isId ? 'Formulir pengembalian aset berhasil disiapkan di atas!' : 'Asset return form prepared successfully above!',
      'success'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete Handover Record
  const handleDeleteHandover = async () => {
    if (!deleteHandover) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('it_asset_handovers')
        .delete()
        .eq('id', deleteHandover.id);

      if (error) {
        console.error('Error deleting handover:', error);
        showNotification(isId ? 'Gagal menghapus riwayat serah terima.' : 'Failed to delete handover history.', 'error');
      } else {
        showNotification(isId ? 'Riwayat serah terima berhasil dihapus.' : 'Handover history deleted successfully.', 'success');
        await fetchHandovers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteHandover(null);
    }
  };

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Handover Form (BAST)"
        description="Generate beautiful, pixel-perfect official Asset Transfer Forms directly from selected inventory assets."
      />

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4.5 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-bottom-5 duration-300 ${notification.type === 'success'
            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
          <span className="text-sm font-semibold">{notification.text}</span>
        </div>
      )}

      <form onSubmit={handleCetakBAST} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Asset Selector & Accessories */}
        <div className="lg:col-span-4 space-y-6">

          {/* Asset Selector Section */}
          <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Cpu size={16} className="text-primary" />
              SELECT ASSET
            </h3>

            {/* Custom Searchable Dropdown */}
            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Search & Select Inventory Device</Label>
              <button
                type="button"
                onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-background dark:bg-zinc-800 border border-border/80 dark:border-zinc-700 hover:border-border dark:hover:border-zinc-500 rounded-xl text-left text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-ring dark:text-zinc-100"
              >
                {selectedAsset ? (
                  <span className="truncate text-foreground font-semibold">
                    {selectedAsset.assetId} - {selectedAsset.item}
                  </span>
                ) : (
                  <span className="text-muted-foreground dark:text-zinc-500 font-normal">Choose device from inventory...</span>
                )}
                <ChevronsUpDown size={15} className="text-muted-foreground" />
              </button>

              {isAssetDropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 z-40 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden max-h-[320px] flex flex-col">
                  <div className="p-2 border-b border-border/60 bg-muted/30 flex items-center gap-2">
                    <Search size={14} className="text-muted-foreground/80 ml-1.5" />
                    <input
                      type="text"
                      placeholder="Search name, serial number, brand, user..."
                      value={assetSearchTerm}
                      onChange={(e) => setAssetSearchTerm(e.target.value)}
                      className="w-full bg-transparent border-0 p-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[260px]">
                    {isLoadingAssets ? (
                      <div className="p-2 space-y-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <div key={idx} className="flex flex-col space-y-1.5 p-2 border-b border-border/30 last:border-0">
                            <Skeleton className="h-3.5 w-3/4 rounded-md" />
                            <Skeleton className="h-2.5 w-1/2 rounded-md" />
                          </div>
                        ))}
                      </div>
                    ) : filteredAssets.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">No matching assets found.</div>
                    ) : (
                      filteredAssets.map(asset => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleAssetSelect(asset)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-muted/60 border-b border-border/30 last:border-0 flex items-center justify-between text-xs transition-all ${selectedAsset?.id === asset.id ? 'bg-primary/5 text-primary' : 'text-foreground'
                            }`}
                        >
                          <div className="space-y-0.5 max-w-[80%]">
                            <p className="font-bold truncate">{asset.item}</p>
                            <p className="text-xs text-muted-foreground font-medium truncate">
                              ID: <span className="font-bold text-foreground/80">{asset.assetId}</span> | S/N: {asset.serialNumber || '-'}
                            </p>
                            {asset.user && (
                              <p className="text-xs font-semibold text-primary">
                                Assigned to: {asset.user}
                              </p>
                            )}
                          </div>
                          {selectedAsset?.id === asset.id && <Check size={14} className="text-primary" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Asset Details Card */}
            {selectedAsset && (
              <div className="mt-4 p-4 bg-muted/30 border border-border/60 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <Cpu size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{selectedAsset.item}</h4>
                    <p className="text-xs font-medium text-muted-foreground">{selectedAsset.brand || 'No Brand'}</p>
                  </div>
                </div>
                <div className="h-[1px] bg-border/40" />
                <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                  <div>
                    <span className="text-muted-foreground block text-[9.5px]">Asset ID</span>
                    <span className="font-bold">{selectedAsset.assetId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9.5px]">Serial Number</span>
                    <span className="font-semibold truncate">{selectedAsset.serialNumber || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[9.5px]">Specifications</span>
                    <span className="font-medium text-foreground/80 block mb-2">
                      {selectedAsset.specs?.processor || ''} {selectedAsset.specs?.ram ? `| ${selectedAsset.specs.ram}` : ''} {selectedAsset.specs?.storage ? `| ${selectedAsset.specs.storage}` : ''}
                    </span>
                    <Label className="text-[9.5px] text-muted-foreground block mb-1">Asset Remark (Catatan Aset - Bisa Diisi Manual)</Label>
                    <Input
                      value={assetRemark}
                      onChange={(e) => setAssetRemark(e.target.value)}
                      placeholder="e.g. Kondisi fisik mulus, segel utuh, baterai normal"
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accessories Block */}
          <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus size={16} className="text-emerald-500" />
              SUPPORTING ACCESSORIES
            </h3>

            <div className="space-y-3">
              {/* Tas Laptop Accessory */}
              <div className="p-3 hover:bg-muted/20 border border-border/60 rounded-2xl transition-all space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeBag}
                    onChange={(e) => setIncludeBag(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-foreground dark:text-zinc-100">Tas Laptop</p>
                    <p className="text-xs text-muted-foreground font-medium">Standard laptop bag</p>
                  </div>
                </label>
                {includeBag && (
                  <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-border/20">
                    <div>
                      <Label className="text-xs font-medium mb-0.5 text-muted-foreground block">Serial Number (S/N)</Label>
                      <Input
                        value={bagSerial}
                        onChange={(e) => setBagSerial(e.target.value)}
                        placeholder="-"
                        className="h-7 text-[11px] rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-0.5 text-muted-foreground block">Remarks (Catatan)</Label>
                      <Input
                        value={bagRemarks}
                        onChange={(e) => setBagRemarks(e.target.value)}
                        placeholder="Black"
                        className="h-7 text-[11px] rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Charger Laptop Accessory */}
              <div className="p-3 hover:bg-muted/20 border border-border/60 rounded-2xl transition-all space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCharger}
                    onChange={(e) => setIncludeCharger(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-foreground dark:text-zinc-100">Charger Laptop</p>
                    <p className="text-xs text-muted-foreground font-medium">Standard power adapter</p>
                  </div>
                </label>
                {includeCharger && (
                  <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-border/20">
                    <div>
                      <Label className="text-xs font-medium mb-0.5 text-muted-foreground block">Serial Number (S/N)</Label>
                      <Input
                        value={chargerSerial}
                        onChange={(e) => setChargerSerial(e.target.value)}
                        placeholder="-"
                        className="h-7 text-[11px] rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-0.5 text-muted-foreground block">Remarks (Catatan)</Label>
                      <Input
                        value={chargerRemarks}
                        onChange={(e) => setChargerRemarks(e.target.value)}
                        placeholder="Black"
                        className="h-7 text-[11px] rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mouse Wireless Accessory */}
              <div className="p-3 hover:bg-muted/20 border border-border/60 rounded-2xl transition-all space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeMouse}
                    onChange={(e) => setIncludeMouse(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-foreground dark:text-zinc-100">Mouse Wireless</p>
                    <p className="text-xs text-muted-foreground font-medium">Specify mouse model, S/N & remarks</p>
                  </div>
                </label>
                {includeMouse && (
                  <div className="space-y-2 mt-1 pt-1 border-t border-border/20">
                    <div>
                      <Label className="text-xs font-medium mb-0.5 text-muted-foreground block">Mouse Model (Ketik Manual)</Label>
                      <Input
                        value={mouseModel}
                        onChange={(e) => setMouseModel(e.target.value)}
                        placeholder="e.g. Mouse Wireless Logitech B170"
                        className="h-8 text-xs font-semibold rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium mb-0.5 text-muted-foreground block">Serial Number (S/N)</Label>
                        <Input
                          value={mouseSerial}
                          onChange={(e) => setMouseSerial(e.target.value)}
                          placeholder="-"
                          className="h-7 text-[11px] rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-0.5 text-muted-foreground block">Remarks (Catatan)</Label>
                        <Input
                          value={mouseRemarks}
                          onChange={(e) => setMouseRemarks(e.target.value)}
                          placeholder="Black"
                          className="h-7 text-[11px] rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Extra Items */}
            {customEquipments.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-medium text-muted-foreground">Additional Items</h4>
                {customEquipments.map((eq, idx) => (
                  <div key={idx} className="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipment(idx)}
                      className="absolute top-2 right-2 text-rose-500 hover:bg-rose-500/10 p-1 rounded-lg transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="space-y-2 text-xs">
                      <div>
                        <Label className="text-xs mb-1">Item Name</Label>
                        <Input
                          value={eq.name}
                          onChange={(e) => handleEquipmentChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Laptop Sleeve"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1">S/N</Label>
                          <Input
                            value={eq.serialNo}
                            onChange={(e) => handleEquipmentChange(idx, 'serialNo', e.target.value)}
                            placeholder="-"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1">Remarks</Label>
                          <Input
                            value={eq.remarks}
                            onChange={(e) => handleEquipmentChange(idx, 'remarks', e.target.value)}
                            placeholder="Black"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddEquipment}
              className="w-full h-9 text-xs rounded-xl flex items-center justify-center gap-1.5 border-dashed border-border/80"
            >
              <Plus size={13} />
              Add Custom Accessory
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: Handover Form & Info */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card rounded-2xl border border-border/60 p-6 md:p-8 shadow-sm space-y-6">

            {/* Header Document Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Handover Date</Label>
                <Input
                  type="date"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  className="rounded-xl h-10 text-sm font-medium"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block flex items-center justify-between">
                  <span>Document Number (BAST)</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isManualDocNo) setCustomDocNo(generatedDocNo);
                      setIsManualDocNo(!isManualDocNo);
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {isManualDocNo ? 'Auto-Generate' : 'Manual Edit'}
                  </button>
                </Label>
                {isManualDocNo ? (
                  <Input
                    value={customDocNo}
                    onChange={(e) => setCustomDocNo(e.target.value)}
                    className="rounded-xl h-10 text-sm font-semibold border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  />
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={docSequence}
                      onChange={(e) => setDocSequence(e.target.value)}
                      placeholder="Seq"
                      className="w-20 rounded-xl h-10 text-center font-bold text-sm"
                    />
                    <div className="flex-1 flex items-center px-3.5 bg-muted/40 dark:bg-zinc-800/80 border border-border/60 rounded-xl text-sm font-medium text-foreground/80 dark:text-zinc-200 select-none overflow-hidden truncate">
                      {generatedDocNo}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-[1px] bg-border/40" />

            {/* DATA ORIGINATOR */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" />
                1. Data Originator (IT Manager / Staff)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Full Name</Label>
                  <Input
                    value={originatorName}
                    onChange={(e) => setOriginatorName(e.target.value)}
                    placeholder="Enter originator name..."
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Company</Label>
                  <select
                    value={originatorCompany}
                    onChange={(e) => setOriginatorCompany(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring h-10 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 transition-all"
                  >
                    <option value="">- Select Company -</option>
                    {masterCompanies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Position</Label>
                  <Input
                    value={originatorPosition}
                    onChange={(e) => setOriginatorPosition(e.target.value)}
                    placeholder="e.g. IT Specialist"
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
                  <select
                    value={originatorDept}
                    onChange={(e) => setOriginatorDept(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring h-10 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 transition-all"
                  >
                    <option value="">- Select Department -</option>
                    {masterDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-border/40" />

            {/* DATA RECIPIENT */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <UserCheck size={14} className="text-emerald-500" />
                2. Data Recipient (Asset Receiver / User)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Recipient Name</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter recipient full name..."
                    className="rounded-xl h-10 text-sm font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Company</Label>
                  <select
                    value={recipientCompany}
                    onChange={(e) => setRecipientCompany(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring h-10 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 transition-all"
                  >
                    <option value="">- Select Company -</option>
                    {masterCompanies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Position</Label>
                  <Input
                    value={recipientPosition}
                    onChange={(e) => setRecipientPosition(e.target.value)}
                    placeholder="e.g. User Custodian"
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Division</Label>
                  <Input
                    value={recipientDivision}
                    onChange={(e) => setRecipientDivision(e.target.value)}
                    placeholder="e.g. Procurement / Support"
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
                  <select
                    value={recipientDept}
                    onChange={(e) => setRecipientDept(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring h-10 bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 transition-all"
                  >
                    <option value="">- Select Department -</option>
                    {masterDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Location</Label>
                  <Input
                    value={recipientLocation}
                    onChange={(e) => setRecipientLocation(e.target.value)}
                    placeholder="e.g. Head Office - The City Tower"
                    className="rounded-xl h-10 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-border/40" />

            {/* NOTES */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <Info size={14} className="text-amber-500" />
                3. Additional Notes
              </h4>
              <div>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. New member The Gesit Companies - Bendry"
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={isGenerating || !selectedAsset || !recipientName}
                className="rounded-xl h-12 px-8 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    GENERATING BAST...
                  </>
                ) : (
                  <>
                    <FileText size={15} />
                    CETAK BAST (PDF)
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>

      </form>

      {/* Handover List / History Table */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              {isId ? "DAFTAR SERAH TERIMA ASET (RIWAYAT)" : "ASSET HANDOVER REGISTRY (HISTORY)"}
            </h3>
            <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full sm:hidden animate-pulse">
              {filteredHandovers.length} BAST
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                type="text"
                placeholder={isId ? "Cari BAST (No Dokumen, Asset ID, Penerima...)" : "Search BAST (Doc No, Asset ID, Recipient...)"}
                value={handoverSearchTerm}
                onChange={(e) => setHandoverSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-full border-border/40 focus-visible:ring-primary/20"
              />
            </div>
            <span className="text-xs hidden sm:inline-block font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full shrink-0">
              {filteredHandovers.length} BAST
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-border/60 rounded-2xl">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-semibold text-xs text-foreground/80">{isId ? "No. Dokumen" : "Doc. Number"}</TableHead>
                <TableHead className="font-semibold text-xs text-foreground/80">Asset ID</TableHead>
                <TableHead className="font-semibold text-xs text-foreground/80">{isId ? "Nama Perangkat" : "Device Name"}</TableHead>
                <TableHead className="font-semibold text-xs text-foreground/80">{isId ? "Custodian (Penerima)" : "Custodian (Recipient)"}</TableHead>
                <TableHead className="font-semibold text-xs text-foreground/80">Company / Dept</TableHead>
                <TableHead className="font-semibold text-xs text-foreground/80">{isId ? "Tanggal Penyerahan" : "Handover Date"}</TableHead>
                <TableHead className="font-semibold text-xs text-foreground/80 text-center">{isId ? "Aksi" : "Action"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHandovers ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/10">
                    <TableCell className="py-4"><Skeleton className="h-4 w-32 rounded-md" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-36 rounded-md" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32 rounded-md" />
                        <Skeleton className="h-2.5 w-16 rounded-md" />
                      </div>
                    </TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredHandovers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    {handoverSearchTerm
                      ? (isId ? 'Tidak ditemukan riwayat serah terima BAST yang cocok.' : 'No matching BAST handover history found.')
                      : (isId ? 'Belum ada aset yang pernah dicetak BAST nya di sini.' : 'No assets have had a BAST printed here yet.')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredHandovers.map((handover) => {
                  const deviceCode = handover.it_assets?.asset_id || '-';
                  const deviceName = handover.it_assets?.item_name || 'Deleted Asset';
                  return (
                    <TableRow key={handover.id} className="hover:bg-muted/10">
                      <TableCell className="font-mono text-xs font-semibold text-slate-500 dark:text-zinc-400">{handover.doc_no}</TableCell>
                      <TableCell className="font-bold text-xs text-primary">{deviceCode}</TableCell>
                      <TableCell className="font-semibold text-xs text-foreground/90">{deviceName}</TableCell>
                      <TableCell className="font-bold text-xs text-foreground/90">{handover.recipient_name}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground/80">{handover.recipient_company}</div>
                        <div className="text-xs text-muted-foreground">{handover.recipient_dept || '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium font-mono text-slate-500 dark:text-zinc-400">{handover.handover_date}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Cetak Ulang Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleInstantCetakUlang(handover)}
                            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full"
                            title={isId ? "Cetak Ulang PDF" : "Reprint PDF"}
                          >
                            <FileText size={14} />
                          </Button>

                          {/* Edit / Reload Form Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // Restore selected asset
                              const relatedAsset = assets.find(a => a.id === handover.asset_id);
                              if (relatedAsset) {
                                setSelectedAsset(relatedAsset);
                              }
                              setRecipientName(handover.recipient_name || '');
                              setRecipientCompany(handover.recipient_company || '');
                              setRecipientPosition(handover.recipient_position || '');
                              setRecipientDivision(handover.recipient_division || '');
                              setRecipientDept(handover.recipient_dept || '');
                              setRecipientLocation(handover.recipient_location || 'Head Office - The City Tower');

                              setOriginatorName(handover.originator_name || '');
                              setOriginatorCompany(handover.originator_company || '');
                              setOriginatorPosition(handover.originator_position || '');
                              setOriginatorDept(handover.originator_dept || '');

                              setIncludeBag(handover.include_bag !== false);
                              setBagSerial(handover.bag_serial || '');
                              setBagRemarks(handover.bag_remarks || 'Black');
                              setIncludeCharger(handover.include_charger !== false);
                              setChargerSerial(handover.charger_serial || '');
                              setChargerRemarks(handover.charger_remarks || 'Black');
                              setIncludeMouse(handover.include_mouse !== false);
                              setMouseModel(handover.mouse_model || 'Mouse Wireless Logitech B170');
                              setMouseSerial(handover.mouse_serial || '');
                              setMouseRemarks(handover.mouse_remarks || 'Black');
                              setCustomEquipments(handover.custom_equipments || []);
                              setNote(handover.note || '');
                              setAssetRemark(handover.asset_remark || '');

                              // Scroll to form smoothly
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              showNotification('Data BAST berhasil dimuat kembali ke formulir di atas!', 'success');
                            }}
                            className="h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full"
                            title="Edit / Muat Ulang ke Formulir"
                          >
                            <Cpu size={14} />
                          </Button>

                          {/* Return / Pengembalian Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReturnAsset(handover)}
                            className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full"
                            title="Return (Pengembalian Aset dari User ke IT)"
                          >
                            <RotateCcw size={14} />
                          </Button>

                          {/* Hapus Button */}
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteHandover(handover)}
                              className="h-8 w-8 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full"
                              title="Hapus Riwayat BAST"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <WarningConfirmModal
        isOpen={warningModalOpen}
        onClose={() => setWarningModalOpen(false)}
        onConfirm={() => {
          setWarningModalOpen(false);
          proceedCetakBAST();
        }}
        title="Asset Handover Sudah Pernah Dibuat"
        message={
          <div className="space-y-2">
            <p>Perhatian: BAST Handover untuk aset ini sudah pernah dibuat sebelumnya dengan <strong>No. Dokumen: {existingDocNo}</strong>.</p>
            <p>Apakah Anda yakin ingin tetap membuat dan mencetak BAST baru?</p>
          </div>
        }
        confirmText="Buat BAST Baru"
        cancelText="Batal"
      />

      <DangerConfirmModal
        isOpen={!!deleteHandover}
        onClose={() => setDeleteHandover(null)}
        onConfirm={handleDeleteHandover}
        title="Hapus Riwayat Handover?"
        message={
          <div className="space-y-2">
            <p>Apakah Anda yakin ingin menghapus riwayat serah terima (BAST) dengan No. Dokumen: <strong>{deleteHandover?.doc_no}</strong>?</p>
            <p className="text-rose-500 font-bold text-[11px] uppercase tracking-wider">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
          </div>
        }
        isLoading={isDeleting}
        confirmText="Hapus"
      />
    </div>
  );
};
