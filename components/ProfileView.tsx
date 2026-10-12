'use client';

import React, { useState, useEffect } from 'react';
import {
    User, Mail, Phone, MapPin, Shield, Key, Save,
    LogOut, Lock, Building2, Loader2, CheckCircle2,
    Briefcase, ShieldCheck, Globe, Camera, Edit3, X,
    Calendar, Trash2, Bell, Settings
} from 'lucide-react';
import { UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useLanguage } from '../translations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileViewProps {
    onLogout: () => void;
    user: UserAccount | null;
    onUpdateSuccess?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onLogout, user, onUpdateSuccess }) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // State form
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        company: '',
        department: '',
        jobTitle: ''
    });

    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [companyList, setCompanyList] = useState<{ id: number, name: string }[]>([]);
    const [departmentList, setDepartmentList] = useState<{ name: string }[]>([]);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const [activeSessions, setActiveSessions] = useState<any[]>([]);

    // Fetch and poll active sessions
    useEffect(() => {
        if (!user?.id) return;

        const token = localStorage.getItem('device_session_token');

        const fetchSessions = async () => {
            const { data: sessions, error: fetchError } = await supabase
                .from('user_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('last_updated', { ascending: false });

            if (!fetchError && sessions) {
                const formattedSessions = sessions.map(s => ({
                    device: s.device,
                    browser: s.browser,
                    ip: s.ip,
                    lastUpdated: new Date(s.last_updated).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: 'numeric', minute: 'numeric', hour12: true
                    }),
                    sessionToken: s.session_token,
                    isCurrent: s.session_token === token,
                    location: 'Identifying...'
                }));
                setActiveSessions(formattedSessions);

                // Fetch locations dynamically
                const sessionsWithLocations = await Promise.all(formattedSessions.map(async (sess) => {
                    if (!sess.ip || sess.ip === '127.0.0.1' || sess.ip === 'localhost') return { ...sess, location: 'Local Network' };
                    try {
                        const res = await fetch(`https://get.geojs.io/v1/ip/geo/${sess.ip}.json`);
                        if (res.ok) {
                            const locData = await res.json();
                            const locString = [locData.city, locData.country].filter(Boolean).join(', ');
                            return { ...sess, location: locString || 'Unknown Region' };
                        }
                    } catch (e) {
                        console.log('Location fetch failed:', e);
                    }
                    return { ...sess, location: 'Unknown Location' };
                }));
                setActiveSessions(sessionsWithLocations);
            }
        };

        fetchSessions();
        const interval = setInterval(fetchSessions, 5000);
        return () => clearInterval(interval);
    }, [user?.id]);

    // Sinkronisasi data saat user prop berubah atau mode edit aktif
    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                phone: user.phone || '',
                address: user.address || '',
                company: user.company || '',
                department: user.department || '',
                jobTitle: user.jobTitle || ''
            });
            setAvatarUrl(user.avatarUrl || '');
        }

        const fetchMasterData = async () => {
            try {
                const { data: companies } = await supabase.from('companies').select('id, name').order('name');
                if (companies) setCompanyList(companies);

                const { data: depts } = await supabase.from('departments').select('name').order('name');
                if (depts) setDepartmentList(depts);
            } catch (err) {
                console.error("Error fetching master data:", err);
            }
        };
        fetchMasterData();
    }, [user]);

    const userInitial = (formData.fullName || 'US').substring(0, 2).toUpperCase();
    const userRole = user?.role || 'Staff';
    const userEmail = user?.email || 'No Email';

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const { error } = await supabase
                .from('user_accounts')
                .update({
                    full_name: formData.fullName,
                    phone: formData.phone,
                    address: formData.address,
                    company: formData.company,
                    department: formData.department,
                    job_title: formData.jobTitle,
                    avatar_url: avatarUrl
                })
                .eq('id', user.id);

            if (error) throw error;

            setSaveMessage({ text: t('profileUpdated'), type: 'success' });
            setIsEditing(false);

            // Meminta App.tsx menyegarkan data currentUser
            if (onUpdateSuccess) onUpdateSuccess();

            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error: any) {
            console.error("Save error:", error);
            setSaveMessage({ text: t('profileUpdateFailed'), type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTerminateAllSessions = async () => {
        if (user?.id) {
            try {
                await supabase.from('user_sessions').delete().eq('user_id', user.id);
            } catch (err) {
                console.error("Failed to delete sessions:", err);
            }
        }
        onLogout();
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        const cloudName = 'dmr8bxdos';
        const uploadPreset = 'gesit_erp_preset';

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_preset', uploadPreset);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: uploadData
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error?.message || 'Upload failed');

            if (data.secure_url) {
                setAvatarUrl(data.secure_url);

                await supabase
                    .from('user_accounts')
                    .update({ avatar_url: data.secure_url })
                    .eq('id', user.id);

                if (onUpdateSuccess) onUpdateSuccess();
                setSaveMessage({ text: 'Photo updated successfully', type: 'success' });
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } catch (error) {
            console.error('Upload Error:', error);
            setSaveMessage({ text: 'Upload failed', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-sans">

            {/* ── COMPACT HEADER CARD ── */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden mb-8 relative">
                {/* Edit button top-right */}
                <div className="absolute top-4 right-4 z-10">
                    <Button
                        size="sm"
                        variant={isEditing ? 'secondary' : 'outline'}
                        onClick={() => setIsEditing(!isEditing)}
                        className="font-bold text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 h-9 px-4 rounded-xl"
                    >
                        <Edit3 size={14} className="mr-2" />
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </Button>
                </div>

                <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
                    {/* Avatar Container */}
                    <div className="relative group shrink-0">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-slate-100 dark:border-zinc-800 shadow-md bg-slate-50 dark:bg-zinc-800">
                            <Avatar className="w-full h-full rounded-full">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-3xl font-black bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-full">
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all border-2 border-white dark:border-zinc-900">
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                            <Camera size={14} className="text-white" />
                        </label>
                    </div>

                    {/* Info Container */}
                    <div className="flex-1 text-center sm:text-left flex flex-col justify-center min-h-[7rem]">
                        <div className="mb-3">
                            <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3 mb-1">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
                                    {formData.fullName || 'User Profile'}
                                </h1>
                                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-none text-xs font-medium px-2.5 py-1 rounded-full">
                                    {userRole}
                                </Badge>
                            </div>
                            <p className="text-[15px] text-slate-500 dark:text-zinc-400 font-medium">
                                {[formData.jobTitle, formData.department, formData.company].filter(Boolean).join(' · ')}
                            </p>
                        </div>

                        {/* Quick meta chips */}
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-auto">
                            <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full border border-border/60 text-xs font-medium text-foreground/70">
                                <Mail size={13} className="text-indigo-400" /> {userEmail}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* â”€â”€ SAVE MESSAGE â”€â”€ */}
            {saveMessage && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'}`}>
                    <CheckCircle2 size={15} /> {saveMessage.text}
                </div>
            )}

            {/* â”€â”€ TABS â”€â”€ */}
            <Tabs defaultValue="personal" className="w-full">
                <div className="flex justify-start overflow-x-auto no-scrollbar mb-6">
                    <TabsList className="min-w-max shadow-sm bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl">
                        <TabsTrigger value="personal" className="rounded-lg px-5 text-[13px] font-bold">Personal</TabsTrigger>
                        <TabsTrigger value="account" className="rounded-lg px-5 text-[13px] font-bold">Account</TabsTrigger>
                        <TabsTrigger value="security" className="rounded-lg px-5 text-[13px] font-bold">Security</TabsTrigger>
                        <TabsTrigger value="notifications" className="rounded-lg px-5 text-[13px] font-bold">Notifications</TabsTrigger>
                    </TabsList>
                </div>

                {/* â”€â”€ PERSONAL TAB â”€â”€ */}
                <TabsContent value="personal">
                    <Card className="rounded-2xl border-border/60 bg-card shadow-sm overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">Personal Details</h3>
                                    <p className="text-slate-400 dark:text-zinc-500 text-xs mt-0.5">Update your identity and contact information.</p>
                                </div>
                                {!isEditing && (
                                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="rounded-xl font-bold h-9 gap-2">
                                        <Edit3 size={13} /> Edit
                                    </Button>
                                )}
                            </div>

                            <Separator className="bg-border/60" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {[
                                    { label: 'Full Name', key: 'fullName', icon: <User size={14} /> },
                                    { label: 'Job Title', key: 'jobTitle', icon: <Briefcase size={14} /> },
                                    { label: 'Phone', key: 'phone', icon: <Phone size={14} /> },
                                ].map(({ label, key, icon }) => (
                                    <div key={key} className="space-y-1.5">
                                        <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            {icon} {label}
                                        </Label>
                                        <Input
                                            value={(formData as any)[key]}
                                            disabled={!isEditing}
                                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                            className="h-11 rounded-xl border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 font-semibold text-sm disabled:opacity-60 disabled:cursor-default focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500"
                                        />
                                    </div>
                                ))}

                                <div className="space-y-1.5">
                                    <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <Building2 size={14} /> Department
                                    </Label>
                                    <Select disabled={!isEditing} value={formData.department} onValueChange={(val) => setFormData({ ...formData, department: val })}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 font-semibold text-sm disabled:opacity-60">
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IT">Information Technology</SelectItem>
                                            <SelectItem value="HR">Human Resources</SelectItem>
                                            <SelectItem value="Finance">Finance</SelectItem>
                                            <SelectItem value="Operations">Operations</SelectItem>
                                            {departmentList.map(dept => (
                                                <SelectItem key={dept.name} value={dept.name}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                        <Globe size={14} /> Company
                                    </Label>
                                    <Select disabled={!isEditing} value={formData.company} onValueChange={(val) => setFormData({ ...formData, company: val })}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 font-semibold text-sm disabled:opacity-60">
                                            <SelectValue placeholder="Select company" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companyList.map(comp => (
                                                <SelectItem key={comp.id} value={comp.name}>{comp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl font-bold">Cancel</Button>
                                    <Button onClick={handleSave} disabled={isSaving} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 gap-2">
                                        {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </TabsContent>

                {/* â”€â”€ ACCOUNT TAB â”€â”€ */}
                <TabsContent value="account">
                    <div className="space-y-4">
                        <Card className="rounded-2xl border-border/60 bg-card shadow-sm overflow-hidden">
                            <div className="p-6 sm:p-8 space-y-6">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">Account Settings</h3>
                                    <p className="text-slate-400 dark:text-zinc-500 text-xs mt-0.5">Manage your account preferences and visibility.</p>
                                </div>
                                <Separator className="bg-border/60" />

                                {/* Account Status */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Account Status</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Your account is currently active</p>
                                    </div>
                                    <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Active
                                    </span>
                                </div>

                                <Separator className="bg-border/60" />

                                {/* Visibility */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Profile Visibility</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Make your profile visible to other users</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>

                                <Separator className="bg-border/60" />

                                {/* Data Export */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Data Export</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Download a copy of your personal data</p>
                                    </div>
                                    <Button variant="outline" className="w-full sm:w-auto font-bold rounded-xl">Export Data</Button>
                                </div>
                            </div>
                        </Card>

                        {/* Danger Zone */}
                        <Card className="rounded-2xl border-rose-100 dark:border-rose-900/30 bg-card shadow-sm overflow-hidden">
                            <div className="p-6 sm:p-8">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                                        <Shield size={14} className="text-rose-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-rose-600">Danger Zone</h3>
                                        <p className="text-xs text-slate-400">Irreversible and destructive actions</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Delete Account</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Permanently delete your account and all data</p>
                                    </div>
                                    <Button variant="destructive" className="w-full sm:w-auto font-bold rounded-xl gap-2">
                                        <Trash2 size={14} /> Delete Account
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                {/* â”€â”€ SECURITY TAB â”€â”€ */}
                <TabsContent value="security">
                    <Card className="rounded-2xl border-border/60 bg-card shadow-sm overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">Security Protocols</h3>
                                <p className="text-slate-400 dark:text-zinc-500 text-xs mt-0.5">Manage your passcode and active sessions.</p>
                            </div>
                            <Separator className="bg-border/60" />

                            {/* Change Password */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                                        <Key size={15} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Change Password</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Update your security key for system access</p>
                                    </div>
                                </div>
                                <Button onClick={() => setIsPasswordModalOpen(true)} variant="outline" className="w-full sm:w-auto font-bold rounded-xl gap-2">
                                    <Lock size={14} /> Update Key
                                </Button>
                            </div>

                            <Separator className="bg-border/60" />

                            {/* Terminate sessions */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                                        <LogOut size={15} className="text-rose-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Session Control</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Sign out from all active terminals</p>
                                    </div>
                                </div>
                                <Button onClick={handleTerminateAllSessions} variant="outline" className="w-full sm:w-auto font-bold rounded-xl gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10">
                                    <LogOut size={14} /> Terminate All
                                </Button>
                            </div>

                            <Separator className="bg-border/60" />

                            {/* Active Sessions */}
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Active Sessions</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Manage your active login sessions across devices.</p>
                                </div>
                                <div className="border border-border/60 rounded-xl overflow-x-auto">
                                    <Table className="min-w-[560px]">
                                        <TableHeader className="bg-muted/20">
                                            <TableRow className="hover:bg-transparent border-b border-border/60">
                                                <TableHead className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Device</TableHead>
                                                <TableHead className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP Address</TableHead>
                                                <TableHead className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</TableHead>
                                                <TableHead className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Seen</TableHead>
                                                <TableHead className="py-3 px-4" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeSessions.map((session, index) => (
                                                <TableRow key={session.sessionToken || index} className={`border-b border-border/60 last:border-0 ${session.isCurrent ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'hover:bg-muted/50'} transition-colors`}>
                                                    <TableCell className="py-4 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${session.isCurrent ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-muted/50'}`}>
                                                                <Shield size={12} className={session.isCurrent ? 'text-indigo-500' : 'text-slate-400'} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{session.device}</p>
                                                                <p className="text-[10px] text-slate-400 mt-0.5">{session.browser}</p>
                                                            </div>
                                                            {session.isCurrent && (
                                                                <span className="ml-1 text-[10px] font-medium bg-indigo-500 text-white px-2 py-0.5 rounded-full">Now</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-4 text-xs font-mono text-slate-500 dark:text-zinc-400">{session.ip}</TableCell>
                                                    <TableCell className="py-4 px-4">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                                                            {session.location === 'Identifying...' ? <Loader2 size={11} className="animate-spin text-slate-300" /> : <Globe size={11} className="text-slate-300" />}
                                                            {session.location}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-4 text-xs text-slate-400">{session.lastUpdated}</TableCell>
                                                    <TableCell className="py-4 px-4 text-right">
                                                        {session.isCurrent ? (
                                                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</span>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                                                                onClick={async () => {
                                                                    if (session.sessionToken) {
                                                                        await supabase.from('user_sessions').delete().eq('session_token', session.sessionToken);
                                                                        setActiveSessions(prev => prev.filter(s => s.sessionToken !== session.sessionToken));
                                                                    }
                                                                }}>
                                                                Revoke
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* â”€â”€ NOTIFICATIONS TAB â”€â”€ */}
                <TabsContent value="notifications">
                    <Card className="rounded-2xl border-border/60 bg-card shadow-sm overflow-hidden">
                        <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                                <Bell size={28} className="text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">Notification Preferences</h3>
                                <p className="text-slate-400 dark:text-zinc-500 text-sm max-w-xs mx-auto mt-1">
                                    Alert synchronization preferences will be available shortly.
                                </p>
                            </div>
                            <span className="text-xs font-medium text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-500/20">
                                Coming Soon
                            </span>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
        </div>
    );
};