'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, User, Building2, Phone, Calendar, Info, ShieldCheck, Briefcase, MapPin, Plus, Trash2, Cpu } from 'lucide-react';
import { ITAsset, UserAccount } from '../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportAssetTransferForm, AssetTransferInfo } from '../lib/handoverPdfExport';
import { supabase } from '../lib/supabaseClient';
import { WarningConfirmModal } from './WarningConfirmModal';
import { useLanguage } from '../translations';

interface AssetHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: ITAsset | null;
  currentUser: UserAccount | null;
}

export const AssetHandoverModal: React.FC<AssetHandoverModalProps> = ({ isOpen, onClose, asset, currentUser }) => {
  const { t, language } = useLanguage();
  const isId = language === 'id';
  const [activeTab, setActiveTab] = useState<'recipient' | 'originator' | 'equipment'>('recipient');

  // 1. Data Originator States
  const [originatorCompany, setOriginatorCompany] = useState('PT Gesit Alumas');
  const [originatorName, setOriginatorName] = useState('');
  const [originatorPosition, setOriginatorPosition] = useState('IT Specialist');
  const [originatorDept, setOriginatorDept] = useState('IT');

  // 2. Data Recipient States
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('');
  const [recipientDivision, setRecipientDivision] = useState('');
  const [recipientDept, setRecipientDept] = useState('');
  const [recipientLocation, setRecipientLocation] = useState('Head Office - The City Tower');

  // 3. Document Details States
  const [handoverDate, setHandoverDate] = useState('');
  const [docNo, setDocNo] = useState('');

  // 4. Equipment States
  const [includeBag, setIncludeBag] = useState(true);
  const [includeCharger, setIncludeCharger] = useState(true);
  const [includeMouse, setIncludeMouse] = useState(true);
  const [mouseModel, setMouseModel] = useState('Mouse Wireless Logitech B170');
  const [customEquipments, setCustomEquipments] = useState<Array<{ name: string; serialNo: string; remarks: string }>>([]);
  const [note, setNote] = useState('');

  // 5. Optional Accessory details & Asset Remarks states
  const [bagSerial, setBagSerial] = useState('');
  const [bagRemarks, setBagRemarks] = useState('Black');
  const [chargerSerial, setChargerSerial] = useState('');
  const [chargerRemarks, setChargerRemarks] = useState('Black');
  const [mouseSerial, setMouseSerial] = useState('');
  const [mouseRemarks, setMouseRemarks] = useState('Black');
  const [assetRemark, setAssetRemark] = useState('');
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [existingDocNo, setExistingDocNo] = useState('');

  useEffect(() => {
    if (isOpen && asset) {
      setActiveTab('recipient');

      // Pre-fill Originator
      setOriginatorCompany('PT Gesit Alumas');
      setOriginatorName(currentUser?.fullName || 'Bendry');
      setOriginatorPosition('IT Specialist');
      setOriginatorDept('IT');

      // Pre-fill Recipient
      setRecipientName(asset.user || '');
      setRecipientCompany(asset.company || 'PT Dharma Alumas Sakti');
      setRecipientPosition(asset.specs?.processor ? 'User Custodian' : '');
      setRecipientDivision('');
      setRecipientDept(asset.department || 'DAS');
      setRecipientLocation('Head Office - The City Tower');

      // Set Date & Document Number
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      const dateStr = localToday.toISOString().split('T')[0];
      setHandoverDate(dateStr);

      const year = today.getFullYear();
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const romanMonth = romanMonths[today.getMonth()];
      const companyPrefix = asset.assetId ? asset.assetId.split('-')[0].toUpperCase() : 'GI';
      setDocNo(`ATF-${companyPrefix}/001/${romanMonth}/${year}`);

      // Set Notes
      const cleanRemarks = asset.remarks ? asset.remarks.replace('[BAST]', '').trim() : '';
      if (cleanRemarks) {
        setNote(cleanRemarks);
        setAssetRemark(cleanRemarks);
      } else {
        setNote(`New member ${asset.company || 'Dharma Alumas Sakti'} - ${asset.user || 'Kiki Meisara'}`);
        setAssetRemark('');
      }
      
      setIncludeBag(true);
      setBagSerial('');
      setBagRemarks('Black');
      setIncludeCharger(true);
      setChargerSerial('');
      setChargerRemarks('Black');
      setIncludeMouse(true);
      setMouseModel('Mouse Wireless Logitech B170');
      setMouseSerial('');
      setMouseRemarks('Black');
      setCustomEquipments([]);
    }
  }, [isOpen, asset, currentUser]);

  // Recalculate notes when recipient name or company changes
  useEffect(() => {
    if (recipientName || recipientCompany) {
      setNote(`New member ${recipientCompany || 'Dharma Alumas Sakti'} - ${recipientName || 'User'}`);
    }
  }, [recipientName, recipientCompany]);

  if (!isOpen || !asset) return null;

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

  const proceedSubmit = async () => {
    if (!asset) return;

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
      docNo,
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
      .eq('id', asset.id);

    if (updateError) {
      console.error('Error updating asset assignment:', updateError);
      alert(`Gagal memperbarui data status kepemilikan aset di database: ${updateError.message}`);
    }

    // Save formal BAST handover history record to it_asset_handovers table!
    const handoverPayload = {
      asset_id: asset.id,
      doc_no: docNo,
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
    }

    await exportAssetTransferForm(asset, info);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName) return;

    try {
      // Check if handover already exists for this asset in it_asset_handovers
      const { data: existingHandovers, error: checkError } = await supabase
        .from('it_asset_handovers')
        .select('id, doc_no')
        .eq('asset_id', asset.id)
        .limit(1);

      if (checkError) {
        console.warn('Error checking existing handovers:', checkError);
      }

      if (existingHandovers && existingHandovers.length > 0) {
        setExistingDocNo(existingHandovers[0].doc_no);
        setWarningModalOpen(true);
        return;
      }

      await proceedSubmit();
    } catch (err) {
      console.error('Error in BAST check:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground leading-none">Asset Transfer Form</h3>
              <p className="text-xs text-muted-foreground mt-1">Official BAST Handover Form</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('recipient')}
            className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 text-center ${activeTab === 'recipient' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            1. Data Recipient
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('originator')}
            className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 text-center ${activeTab === 'originator' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            2. Originator & Doc
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 text-center ${activeTab === 'equipment' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            3. Accessories & Note
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">

            {/* Tab 1: Recipient (Penerima) */}
            {activeTab === 'recipient' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Device Info & Asset Remark */}
                <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
                    <Cpu size={14} className="text-blue-500" />
                    <span>{asset.assetId} - {asset.item} ({asset.brand})</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">Asset Remark (Catatan Aset - Bisa Diisi Manual)</label>
                    <Input 
                      value={assetRemark}
                      onChange={e => setAssetRemark(e.target.value)}
                      placeholder="e.g. Kondisi mulus, segel utuh, baterai normal"
                      className="h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-semibold text-xs"
                    />
                  </div>
                </div>

                <span className="text-xs font-medium text-muted-foreground block">IDENTITAS PENERIMA (DATA RECIPIENT)</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Recipient Name <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        placeholder="e.g. Rizki Meisara Rosadi"
                        value={recipientName}
                        onChange={e => setRecipientName(e.target.value)}
                        required
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Company <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        placeholder="e.g. PT Dharma Alumas Sakti"
                        value={recipientCompany}
                        onChange={e => setRecipientCompany(e.target.value)}
                        required
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Position</label>
                    <div className="relative">
                      <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        placeholder="e.g. Secretary to Chairman"
                        value={recipientPosition}
                        onChange={e => setRecipientPosition(e.target.value)}
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Division</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        placeholder="e.g. Property"
                        value={recipientDivision}
                        onChange={e => setRecipientDivision(e.target.value)}
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Department (Code)</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        placeholder="e.g. DAS"
                        value={recipientDept}
                        onChange={e => setRecipientDept(e.target.value)}
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Location</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        placeholder="e.g. Head Office - The City Tower"
                        value={recipientLocation}
                        onChange={e => setRecipientLocation(e.target.value)}
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Originator & Doc Details (Penyerah & Nomor Surat) */}
            {activeTab === 'originator' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <span className="text-xs font-medium text-muted-foreground block">DATA PENYERAH (DATA ORIGINATOR) & DOKUMEN</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Originator Name <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        value={originatorName}
                        onChange={e => setOriginatorName(e.target.value)}
                        required
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Originator Company <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        value={originatorCompany}
                        onChange={e => setOriginatorCompany(e.target.value)}
                        required
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Originator Position</label>
                    <Input 
                      value={originatorPosition}
                      onChange={e => setOriginatorPosition(e.target.value)}
                      className="h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Originator Department</label>
                    <Input 
                      value={originatorDept}
                      onChange={e => setOriginatorDept(e.target.value)}
                      className="h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Handover Date <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <Input 
                        type="date"
                        value={handoverDate}
                        onChange={e => setHandoverDate(e.target.value)}
                        required
                        className="pl-9 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs text-slate-700 dark:text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground block">Document No (DOC NO) <span className="text-rose-500">*</span></label>
                    <Input 
                      value={docNo}
                      onChange={e => setDocNo(e.target.value)}
                      required
                      placeholder="e.g. ATF-DAS/01/IV/2026"
                      className="h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Accessories & Custom Equipment */}
            {activeTab === 'equipment' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <span className="text-xs font-medium text-muted-foreground block">ACCESSORIES & CUSTOM SUPPORTING EQUIPMENT</span>
                
                {/* Standard checkboxes with S/N & Remarks */}
                <div className="space-y-3">
                  {/* Tas Laptop */}
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="bag"
                        checked={includeBag}
                        onChange={e => setIncludeBag(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <label htmlFor="bag" className="text-xs font-bold text-slate-700 dark:text-zinc-300 select-none cursor-pointer">
                        Include Tas Laptop
                      </label>
                    </div>
                    {includeBag && (
                      <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                        <div>
                          <label className="text-xs mb-0.5 text-muted-foreground block font-medium">Serial Number (S/N)</label>
                          <Input
                            value={bagSerial}
                            onChange={e => setBagSerial(e.target.value)}
                            placeholder="-"
                            className="h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-xs mb-0.5 text-muted-foreground block font-medium">Remarks (Catatan)</label>
                          <Input
                            value={bagRemarks}
                            onChange={e => setBagRemarks(e.target.value)}
                            placeholder="Black"
                            className="h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Charger Laptop */}
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="charger"
                        checked={includeCharger}
                        onChange={e => setIncludeCharger(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <label htmlFor="charger" className="text-xs font-bold text-slate-700 dark:text-zinc-300 select-none cursor-pointer">
                        Include Charger Laptop
                      </label>
                    </div>
                    {includeCharger && (
                      <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                        <div>
                          <label className="text-xs mb-0.5 text-muted-foreground block font-medium">Serial Number (S/N)</label>
                          <Input
                            value={chargerSerial}
                            onChange={e => setChargerSerial(e.target.value)}
                            placeholder="-"
                            className="h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-xs mb-0.5 text-muted-foreground block font-medium">Remarks (Catatan)</label>
                          <Input
                            value={chargerRemarks}
                            onChange={e => setChargerRemarks(e.target.value)}
                            placeholder="Black"
                            className="h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mouse Wireless */}
                  <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="mouse"
                        checked={includeMouse}
                        onChange={e => setIncludeMouse(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <label htmlFor="mouse" className="text-xs font-bold text-slate-700 dark:text-zinc-300 select-none cursor-pointer">
                        Include Mouse Wireless
                      </label>
                    </div>
                    {includeMouse && (
                      <div className="space-y-2 mt-1 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                        <div>
                          <label className="text-xs mb-0.5 text-muted-foreground block font-medium">Mouse Model (Ketik Manual)</label>
                          <Input
                            value={mouseModel}
                            onChange={e => setMouseModel(e.target.value)}
                            placeholder="e.g. Mouse Wireless Logitech B170"
                            className="h-8 text-xs font-semibold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs mb-0.5 text-muted-foreground block font-medium">Serial Number (S/N)</label>
                            <Input
                              value={mouseSerial}
                              onChange={e => setMouseSerial(e.target.value)}
                              placeholder="-"
                              className="h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-xs mb-0.5 text-muted-foreground block font-medium">Remarks (Catatan)</label>
                            <Input
                              value={mouseRemarks}
                              onChange={e => setMouseRemarks(e.target.value)}
                              placeholder="Black"
                              className="h-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Equipments List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">PERLENGKAPAN TAMBAHAN LAINNYA</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddEquipment}
                      className="h-8 rounded-xl"
                    >
                      <Plus size={12} className="mr-1" /> Tambah Baris
                    </Button>
                  </div>

                  {customEquipments.map((eq, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 animate-in slide-in-from-top-1">
                      <div className="flex-1 space-y-2">
                        <Input 
                          placeholder="Nama Barang (e.g. Keyboard Wireless)"
                          value={eq.name}
                          onChange={e => handleEquipmentChange(idx, 'name', e.target.value)}
                          className="h-9 bg-white dark:bg-zinc-800 font-semibold text-xs border-zinc-200 dark:border-zinc-700"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input 
                            placeholder="Serial No"
                            value={eq.serialNo}
                            onChange={e => handleEquipmentChange(idx, 'serialNo', e.target.value)}
                            className="h-8 bg-white dark:bg-zinc-800 text-[10px] border-zinc-200 dark:border-zinc-700"
                          />
                          <Input 
                            placeholder="Remarks / Keterangan"
                            value={eq.remarks}
                            onChange={e => handleEquipmentChange(idx, 'remarks', e.target.value)}
                            className="h-8 bg-white dark:bg-zinc-800 text-[10px] border-zinc-200 dark:border-zinc-700"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEquipment(idx)}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0 h-10 w-10 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Custom Note input */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                  <label className="text-sm font-medium text-foreground block">Catatan Tambahan (Note)</label>
                  <Input 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. New member Dharma Alumas Sakti - Kiki Meisara"
                    className="h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 focus:border-blue-500 font-semibold text-xs"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
              Aset: <strong className="text-slate-600 dark:text-zinc-400 font-bold">{asset.assetId}</strong>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-11 px-5 rounded-xl"
              >
                Batal
              </Button>
              
              {activeTab === 'recipient' ? (
                <Button
                  type="button"
                  onClick={() => setActiveTab('originator')}
                  className="h-11 px-6 rounded-xl"
                >
                  Lanjut
                </Button>
              ) : activeTab === 'originator' ? (
                <Button
                  type="button"
                  onClick={() => setActiveTab('equipment')}
                  className="h-11 px-6 rounded-xl"
                >
                  Lanjut
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!recipientName || !recipientCompany}
                  className="h-11 px-6 shadow-md rounded-xl"
                >
                  <FileText size={14} className="mr-2" />
                  Cetak BAST (PDF)
                </Button>
              )}
            </div>
          </div>

        </form>

      </div>
      <WarningConfirmModal
        isOpen={warningModalOpen}
        onClose={() => setWarningModalOpen(false)}
        onConfirm={() => {
          setWarningModalOpen(false);
          proceedSubmit();
        }}
        title={isId ? "Asset Handover Sudah Pernah Dibuat" : "Asset Handover Already Exists"}
        message={
          <div className="space-y-2">
            <p>
              {isId 
                ? "Perhatian: BAST Handover untuk aset ini sudah pernah dibuat sebelumnya dengan " 
                : "Attention: BAST Handover for this asset has already been created with "}
              <strong>No. Dokumen: {existingDocNo}</strong>.
            </p>
            <p>
              {isId 
                ? "Apakah Anda yakin ingin tetap membuat dan mencetak BAST baru?" 
                : "Are you sure you want to create and print a new BAST?"}
            </p>
          </div>
        }
        confirmText={isId ? "Buat BAST Baru" : "Create New BAST"}
        cancelText={isId ? "Batal" : "Cancel"}
      />
    </div>
  );
};
