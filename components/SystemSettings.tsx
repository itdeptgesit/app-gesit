'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, Settings, Globe, Shield, CheckCircle2, AlertCircle, Palette, RefreshCw, Mail, Phone, 
  LayoutTemplate, Lock, Database, Download, Trash2, ShieldAlert, Building2, Eye, 
  Monitor, ChevronRight, Check, Power, Server, Fingerprint, LayoutGrid, LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { UserAccount } from '../types';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SystemSettingsProps { currentUser: UserAccount | null; }

interface SystemSettings {
    appName: string; logoUrl: string; maintenanceMode: boolean; primaryColor: string;
    supportEmail: string; supportPhone: string; loginTitle: string; loginMessage: string;
    sessionTimeout: number; maxLoginAttempts: number; requireSpecialChars: boolean;
    fontFamily: string; appTagline: string; faviconUrl: string; companyAddress: string;
    companyWebsite: string;
}

const colorPresets = [
    { name: 'ChatGPT Green', value: '#10a37f' },
    { name: 'Threads Black', value: '#000000' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Red', value: '#e11d48' },
    { name: 'Green', value: '#059669' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Amber', value: '#d97706' },
];

const fontPresets = [
    { name: 'Inter', value: 'Inter' },
    { name: 'Outfit', value: 'Outfit' },
    { name: 'Jakarta Sans', value: 'Plus Jakarta Sans' },
    { name: 'Poppins', value: 'Poppins' },
    { name: 'Montserrat', value: 'Montserrat' },
    { name: 'Urbanist', value: 'Urbanist' },
    { name: 'Sora', value: 'Sora' },
    { name: 'Lexend', value: 'Lexend' },
    { name: 'Figtree', value: 'Figtree' },
    { name: 'Ubuntu', value: 'Ubuntu' },
    { name: 'Manrope', value: 'Manrope' },
    { name: 'Space Grotesk', value: 'Space Grotesk' },
    { name: 'DM Sans', value: 'DM Sans' },
    { name: 'Geist', value: 'Geist' },
    { name: 'Nunito', value: 'Nunito' },
    { name: 'Raleway', value: 'Raleway' },
    { name: 'Rubik', value: 'Rubik' },
    { name: 'Lato', value: 'Lato' },
    { name: 'Work Sans', value: 'Work Sans' },
    { name: 'IBM Plex Sans', value: 'IBM Plex Sans' },
    { name: 'Cabin', value: 'Cabin' },
    { name: 'Fira Sans', value: 'Fira Sans' },
    { name: 'Bricolage Grotesque', value: 'Bricolage Grotesque' },
    { name: 'Kanit', value: 'Kanit' },
    { name: 'Open Sans', value: 'Open Sans' }
];

type SettingSection = 'general' | 'appearance' | 'security' | 'system';

export const SystemSettings: React.FC<SystemSettingsProps> = ({ currentUser }) => {
    const [activeSection, setActiveSection] = useState<SettingSection>('general');
    const [settings, setSettings] = useState<SystemSettings>({
        appName: 'GESIT PORTAL', logoUrl: '/image/logo.png', maintenanceMode: false,
        primaryColor: '#2563eb', supportEmail: '', supportPhone: '',
        loginTitle: 'Welcome back', loginMessage: 'Please enter your credentials.',
        sessionTimeout: 30, maxLoginAttempts: 5, requireSpecialChars: true,
        fontFamily: 'Inter', appTagline: '', faviconUrl: '/favicon.ico',
        companyAddress: '', companyWebsite: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.from('system_settings').select('*').single();
                if (data) {
                    setSettings({
                        appName: data.app_name || 'GESIT PORTAL',
                        logoUrl: data.logo_url || '/image/logo.png',
                        maintenanceMode: data.maintenance_mode || false,
                        primaryColor: data.primary_color || '#2563eb',
                        supportEmail: data.support_email || '',
                        supportPhone: data.support_phone || '',
                        loginTitle: data.login_title || 'Welcome back',
                        loginMessage: data.login_message || 'Please enter credentials.',
                        sessionTimeout: data.session_timeout || 30,
                        maxLoginAttempts: data.max_login_attempts || 5,
                        requireSpecialChars: data.require_special_chars !== false,
                        fontFamily: data.font_family || 'Inter',
                        appTagline: data.app_tagline || '',
                        faviconUrl: data.favicon_url || '/favicon.ico',
                        companyAddress: data.company_address || '',
                        companyWebsite: data.company_website || ''
                    });
                }
            } catch (err: any) { console.warn(err); } finally { setIsLoading(false); }
        };
        fetchSettings();

        // Preload preview weights for all presets so the selection cards render correctly
        const families = fontPresets.map(f => `family=${f.value.replace(/ /g, '+')}:wght@400;500`).join('&');
        const presetsUrl = `https://fonts.googleapis.com/css2?${families}&display=swap`;

        let link = document.getElementById('google-fonts-presets') as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.id = 'google-fonts-presets';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = presetsUrl;
    }, []);

    useEffect(() => {
        if (settings.primaryColor === '#000000') {
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--color-primary');
        } else {
            document.documentElement.style.setProperty('--primary', settings.primaryColor);
            document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
        }
        document.documentElement.style.setProperty('--font-sans', `"${settings.fontFamily}", sans-serif`);

        const fontUrl = `https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
        let link = document.getElementById('google-fonts') as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.id = 'google-fonts';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = fontUrl;
    }, [settings.primaryColor, settings.fontFamily]);

    const handleSave = async () => {
        setIsSaving(true);
        setStatusMsg(null);
        try {
            const payload = {
                app_name: settings.appName, logo_url: settings.logoUrl, maintenance_mode: settings.maintenanceMode,
                primary_color: settings.primaryColor, support_email: settings.supportEmail,
                support_phone: settings.supportPhone, login_title: settings.loginTitle,
                login_message: settings.loginMessage, session_timeout: settings.sessionTimeout,
                max_login_attempts: settings.maxLoginAttempts, require_special_chars: settings.requireSpecialChars,
                font_family: settings.fontFamily, app_tagline: settings.appTagline, favicon_url: settings.faviconUrl,
                company_address: settings.companyAddress, company_website: settings.companyWebsite,
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('system_settings').upsert({ id: 1, ...payload });
            if (error) throw error;
            await trackActivity(currentUser?.fullName || 'User', currentUser?.role || 'User', 'Update Settings', 'System', `Updated configs`);
            setStatusMsg({ text: 'Settings saved', type: 'success' });
        } catch (err: any) { setStatusMsg({ text: `Failed: ${err.message}`, type: 'error' });
        } finally { setIsSaving(false); setTimeout(() => setStatusMsg(null), 3000); }
    };

    const handleExportLogs = async () => {
        setIsExporting(true);
        try {
            const { data, error } = await supabase.from('user_activity_logs').select('*').order('created_at', { ascending: false });
            if (error || !data) throw error || new Error("No logs");
            const csv = ['Timestamp,User,Action,Details', ...data.map(l => `"${l.created_at}","${l.user_name}","${l.action}","${(l.details || '').replace(/"/g, '""')}"`)].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Logs_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        } catch (err: any) { setStatusMsg({ text: 'Export failed', type: 'error' });
        } finally { setIsExporting(false); }
    };

    const handleClearCache = () => {
        setIsClearing(true);
        setTimeout(() => { localStorage.clear(); sessionStorage.clear(); location.reload(); }, 800);
    };

    if (isLoading) return <div className="flex h-[40vh] items-center justify-center"><RefreshCw className="animate-spin text-muted-foreground" size={24} /></div>;

    const nav = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'system', label: 'System', icon: Settings },
    ];

    return (
        <div className="w-full py-6 px-4 md:px-8 space-y-8 min-h-screen">
            <PageHeader title="System Settings" description="Manage your global application settings and theme.">
                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {statusMsg && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("text-xs font-medium px-3 py-1.5 rounded-full border", statusMsg.type === 'success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100")}>
                        {statusMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} 
                    Save Changes
                  </Button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10">
                <aside className="space-y-1">
                    {nav.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id as any)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                activeSection === item.id 
                                    ? "bg-primary text-primary-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </button>
                    ))}
                    <Separator className="my-4" />
                    <div className="px-3 py-2 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">Environment</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Server size={12} />
                            <span>System Active</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Database size={12} />
                            <span>v{settings.maxLoginAttempts}.0.2</span>
                        </div>
                    </div>
                </aside>

                <main>
                    <AnimatePresence mode="wait">
                        <motion.div key={activeSection} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-6">
                            {activeSection === 'general' && (
                                <Section title="App Identity" description="Application branding and information.">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <SettingField label="App Name" value={settings.appName} onChange={v => setSettings({...settings, appName: v})} />
                                        <SettingField label="Tagline" value={settings.appTagline} onChange={v => setSettings({...settings, appTagline: v})} />
                                        <div className="space-y-3">
                                          <SettingField label="Logo URL" value={settings.logoUrl} onChange={v => setSettings({...settings, logoUrl: v})} />
                                          <div className="h-16 w-full rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 flex items-center justify-center overflow-hidden p-2">
                                            {settings.logoUrl ? (
                                              <img src={settings.logoUrl} alt="Logo Preview" className="max-h-full object-contain" />
                                            ) : (
                                              <span className="text-xs font-medium text-muted-foreground">No Logo</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          <SettingField label="Favicon URL" value={settings.faviconUrl} onChange={v => setSettings({...settings, faviconUrl: v})} />
                                          <div className="h-16 w-full rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 flex items-center justify-center overflow-hidden p-2">
                                            {settings.faviconUrl ? (
                                              <img src={settings.faviconUrl} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                                            ) : (
                                              <span className="text-xs font-medium text-muted-foreground">No Favicon</span>
                                            )}
                                          </div>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium">Contact Details</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <SettingField label="Support Email" value={settings.supportEmail} onChange={v => setSettings({...settings, supportEmail: v})} />
                                            <SettingField label="Support Extension" value={settings.supportPhone} onChange={v => setSettings({...settings, supportPhone: v})} />
                                            <div className="sm:col-span-2">
                                                <SettingField label="Office Address" value={settings.companyAddress} onChange={v => setSettings({...settings, companyAddress: v})} textarea />
                                            </div>
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {activeSection === 'appearance' && (
                                <Section title="Appearance" description="Customize visual interface and typography.">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <Label className="text-sm font-medium">Brand Color</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {colorPresets.map(p => (
                                                    <button key={p.value} onClick={() => setSettings({...settings, primaryColor: p.value})} className={cn("w-8 h-8 rounded-full border-2 transition-transform", settings.primaryColor === p.value ? "border-primary scale-110 shadow-sm" : "border-transparent hover:scale-105")} style={{ backgroundColor: p.value }} title={p.name} />
                                                ))}
                                                <input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="w-8 h-8 rounded-full border-none p-0 overflow-hidden cursor-pointer bg-muted hover:scale-105 transition-transform" />
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="space-y-4">
                                            <Label className="text-sm font-medium">Typography</Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {fontPresets.map(f => (
                                                    <button key={f.value} onClick={() => setSettings({...settings, fontFamily: f.value})} className={cn("text-left p-3 rounded-md border text-sm transition-all", settings.fontFamily === f.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted")} style={{ fontFamily: f.value }}>
                                                        <span className="block font-medium">{f.name}</span>
                                                        <span className="text-xs text-muted-foreground">Aa Bb Cc 123</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50 dark:bg-zinc-900 border rounded-lg" style={{ fontFamily: settings.fontFamily }}>
                                            <p className="text-xs font-semibold text-muted-foreground mb-4">Preview</p>
                                            <h1 className="text-2xl font-bold mb-2">Modern Interface System</h1>
                                            <p className="text-sm text-muted-foreground leading-relaxed">This is a live preview of how the chosen typography will render across the ecosystem.</p>
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {activeSection === 'security' && (
                                <Section title="Security" description="Governance and access control policies.">
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-sm font-medium">Session Timeout</Label>
                                                    <Badge variant="outline">{settings.sessionTimeout}m</Badge>
                                                </div>
                                                <Slider min={5} max={120} step={5} value={[settings.sessionTimeout]} onValueChange={v => setSettings({...settings, sessionTimeout: v[0]})} />
                                                <p className="text-xs text-muted-foreground italic">Automatic logout after inactivity period.</p>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-sm font-medium">Max Login Attempts</Label>
                                                <div className="flex items-center gap-3">
                                                    {[3, 5, 10].map(i => (
                                                        <Button key={i} variant={settings.maxLoginAttempts === i ? "default" : "outline"} size="sm" className="w-12" onClick={() => setSettings({...settings, maxLoginAttempts: i})}>{i}</Button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground italic">Brute-force protection threshold.</p>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between p-4 rounded-lg border">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium">Password Complexity</Label>
                                                <p className="text-xs text-muted-foreground">Require special characters in passwords.</p>
                                            </div>
                                            <Switch checked={settings.requireSpecialChars} onCheckedChange={v => setSettings({...settings, requireSpecialChars: v})} />
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {activeSection === 'system' && (
                                <Section title="Maintenance & System" description="Low-level system controls and maintenance.">
                                    <div className="space-y-6">
                                        <div className="p-4 rounded-lg border border-rose-100 bg-rose-50/20 dark:bg-rose-950/20 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium text-rose-600 dark:text-rose-400">Maintenance Mode</Label>
                                                <p className="text-xs text-muted-foreground">Disable general access for all users except admins.</p>
                                            </div>
                                            <Switch checked={settings.maintenanceMode} onCheckedChange={v => setSettings({...settings, maintenanceMode: v})} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Card className="shadow-none">
                                                <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Audit Logs</CardTitle></CardHeader>
                                                <CardContent className="px-4 pb-4">
                                                    <p className="text-xs text-muted-foreground mb-4">Export system activity records to CSV.</p>
                                                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleExportLogs}>
                                                        <Download size={14} /> Export Logs
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                            <Card className="shadow-none">
                                                <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Cleanup</CardTitle></CardHeader>
                                                <CardContent className="px-4 pb-4">
                                                    <p className="text-xs text-muted-foreground mb-4">Wipe local session and browser cache.</p>
                                                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleClearCache}>
                                                        <Trash2 size={14} /> Clear Cache
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </Section>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

const Section = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <Card className="shadow-none border border-border/60">
        <CardHeader className="px-6 py-5">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-6">
            {children}
        </CardContent>
    </Card>
);

const SettingField = ({ label, value, onChange, textarea, type = "text" }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; type?: string }) => (
    <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        {textarea ? (
            <Textarea value={value} onChange={e => onChange(e.target.value)} className="min-h-[100px] resize-none text-sm" />
        ) : (
            <Input type={type} value={value} onChange={e => onChange(e.target.value)} className="h-9 text-sm" />
        )}
    </div>
);

