
'use client';

import React, { useState } from 'react';
// Added Briefcase to the lucide-react imports to fix the "Cannot find name 'Briefcase'" error
import { Trash2, AlertCircle, Database, ShieldAlert, CheckCircle2, RefreshCcw, Zap, Briefcase, LifeBuoy, Phone, Megaphone, History, ShieldCheck, LayoutTemplate, Users, Settings } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { DangerConfirmModal } from './DangerConfirmModal';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../translations';

export const SystemMaintenance: React.FC = () => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ open: boolean, type: string, title: string, table: string | string[] } | null>(null);
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const wipeData = async (table: string | string[]) => {
        setIsLoading(true);
        try {
            const tables = Array.isArray(table) ? table : [table];

            // Use RPC function to bypass RLS
            const { data, error } = await supabase.rpc('wipe_tables', {
                table_names: tables
            });

            if (error) {
                console.error('RPC Error:', error);
                throw new Error(`Failed to wipe tables: ${error.message}`);
            }

            console.log('Wipe result:', data);

            if (data && data.success) {
                const failures = data.results?.filter((r: any) => !r.success);
                if (failures?.length > 0) {
                    const errorMsg = failures.map((f: any) => `${f.table}: ${f.error}`).join(' | ');
                    throw new Error(`Partial failure: ${errorMsg}`);
                }

                setStatusMsg({
                    text: `Successfully purged ${data.total_deleted} record(s).`,
                    type: 'success'
                });
            } else {
                throw new Error(data?.error || 'Unknown error occurred');
            }

            setConfirmModal(null);
        } catch (err: any) {
            console.error('Wipe error:', err);
            setStatusMsg({ text: `Error: ${err.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg(null), 5000);
        }
    };

    const SAFE_WIPE_ORDER = [
        // Leaf Nodes (Transaction Data)
        'it_asset_loans', 'switch_ports', 'purchase_records', 'files',
        'helpdesk_tickets', 'activity_logs', 'weekly_plans', 'purchase_plans', 'announcements',
        'user_activity_logs',

        // Mid-Level Nodes (Assets & Infrastructure)
        'it_assets', 'network_switches', 'phone_extensions',

        // Core User Data (Must be deleted before Departments/Groups)
        'user_accounts',

        // Root Nodes (Master Data)
        'user_groups', 'departments', 'asset_categories', 'companies'
    ];

    const modules = [
        { title: t('assets'), table: ['it_asset_loans', 'it_assets'], icon: Database, color: 'blue' },
        { title: t('helpdesk'), table: 'helpdesk_tickets', icon: LifeBuoy, color: 'sky' },
        { title: t('activity'), table: 'activity_logs', icon: RefreshCcw, color: 'indigo' },
        { title: t('weekly'), table: 'weekly_plans', icon: ShieldAlert, color: 'purple' },
        { title: t('purchase'), table: 'purchase_plans', icon: Zap, color: 'orange' },
        { title: t('purchaseRecord'), table: 'purchase_records', icon: Briefcase, color: 'emerald' },
        { title: t('network'), table: ['switch_ports', 'network_switches'], icon: Zap, color: 'rose' },
        { title: t('extensionDirectory'), table: 'phone_extensions', icon: Phone, color: 'cyan' },
        { title: t('announcements'), table: 'announcements', icon: Megaphone, color: 'teal' },
        { title: t('files'), table: 'files', icon: Database, color: 'slate' },
        { title: t('auditLogs'), table: 'user_activity_logs', icon: History, color: 'amber' },
        { title: t('masterData'), table: ['departments', 'companies', 'asset_categories'], icon: LayoutTemplate, color: 'blue' },
        { title: t('permissions'), table: 'user_groups', icon: ShieldCheck, color: 'indigo' },
        { title: t('users'), table: 'user_accounts', icon: Users, color: 'slate' },
        { title: t('admin'), table: 'system_settings', icon: Settings, color: 'zinc' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="bg-rose-500/[0.04] border border-rose-500/20 p-6 rounded-2xl flex items-start gap-4 transition-colors">
                <div className="p-3 bg-rose-600 text-white rounded-xl shadow-md shrink-0">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-400">{t('maintenanceTitle')}</h2>
                    <p className="text-xs text-rose-700/70 dark:text-rose-500/60 font-medium leading-relaxed mt-1">
                        {t('maintenanceDesc')} <br />
                        <span className="font-semibold">{t('maintenanceWarning')}</span>
                    </p>
                </div>
            </div>

            {statusMsg && (
                <div className={`p-4 rounded-2xl border animate-in slide-in-from-top-2 flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-500/[0.04] text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/[0.04] text-rose-700 dark:text-rose-400 border-rose-500/20'}`}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-sm font-semibold">{statusMsg.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((m, idx) => (
                    <div key={idx} className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 rounded-xl bg-muted/50 border border-border/60 text-foreground/70 group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
                                <m.icon size={20} />
                            </div>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">{m.title}</h4>
                        <p className="text-xs text-muted-foreground font-medium mb-6 leading-relaxed">Wipe all records in this module.</p>

                        <Button
                            variant="destructive"
                            className="w-full gap-2"
                            onClick={() => setConfirmModal({ open: true, type: m.title, title: `Wipe ${m.title}`, table: m.table })}
                        >
                            <Trash2 size={14} /> Clear Module
                        </Button>
                    </div>
                ))}
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-sm relative overflow-hidden group border border-border/60">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                <div className="relative z-10 max-w-lg">
                    <h3 className="text-foreground font-semibold text-xl mb-3">{t('totalReset')}</h3>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-8">
                        {t('totalResetDesc')}
                    </p>
                    <Button
                        variant="destructive"
                        size="lg"
                        className="px-8 gap-2"
                        onClick={() => setConfirmModal({ open: true, type: 'TOTAL RESET', title: 'FULL SYSTEM WIPE', table: SAFE_WIPE_ORDER })}
                    >
                        <AlertCircle size={16} /> {t('executePurge')}
                    </Button>
                </div>
            </div>

            <DangerConfirmModal
                isOpen={!!confirmModal?.open}
                onClose={() => setConfirmModal(null)}
                onConfirm={() => wipeData(confirmModal!.table)}
                title={confirmModal?.title || ''}
                message={`You are about to purge all records in ${confirmModal?.type} module.`}
                isLoading={isLoading}
            />
        </div>
    );
};

