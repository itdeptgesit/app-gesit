import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FolderKanban, ListChecks, CheckCircle2,
    Calendar, Zap, TrendingUp,
    Database, Activity, Megaphone,
    ShoppingCart, Box, Shield,
    MessageSquare, RefreshCcw, ChevronRight, Info, Phone, Search, ArrowUpRight, Target,
    Wallet, CheckCircle2 as CheckCircle2Icon, Clock, Briefcase, Tag, Star,
    Sun, Moon, Sunrise, User, Building2, Sparkles, LifeBuoy, Plus,
    Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind, CloudSun
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
    ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { UserAccount, Announcement } from '../types';
import { StatCard } from './StatCard';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../translations';
import { Mail, ArrowRight, Check, AlertCircle, Loader2, X, AlertTriangle } from 'lucide-react';
import { isGoogleConnected, getStoredToken, signInWithGoogle, signOutGoogle } from '../lib/googleCalendar';

// SHADCN UI IMPORTS
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AIAssistant } from './AIAssistant';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
    id: number;
    task: string;
    category: string;
    dueDate: string;
    priority: 'Low' | 'Medium' | 'High';
    status: string;
    owner?: string;
    startTime?: string;
}

interface ProjectItem {
    id: number;
    name: string;
    status: 'Completed' | 'In Progress' | 'On Hold' | 'Pending';
    progress: number;
    totalTasks: number;
    completedTasks: number;
    dueDate: string;
    owner: string;
    department?: string;
    priority?: string;
}

interface PerformanceData {
    day: string;
    value: number;
    value2?: number;
}

interface TaskplusDashboardProps {
    onNavigate: (view: string) => void;
    userName?: string;
    userRole?: string;
    currentUser?: UserAccount | null;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", bg?: string, dot: string }> = {
        'Completed': { variant: 'outline', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
        'In Progress': { variant: 'outline', bg: 'bg-zinc-100/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700', dot: 'bg-zinc-900 dark:bg-zinc-100' },
        'On Hold': { variant: 'outline', bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-500' },
        'Pending': { variant: 'outline', bg: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700/50', dot: 'bg-slate-400' },
        'Done': { variant: 'outline', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
        'To Do': { variant: 'outline', bg: 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700/50', dot: 'bg-slate-400' },
    };
    const c = config[status] || config['Pending'];
    return (
        <Badge variant={c.variant} className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 ${c.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {status}
        </Badge>
    );
};

// ─── Weather Helper & Component ───────────────────────────────────────────────

const getWeatherDetails = (code: number | null, isDaytime: boolean, language: 'en' | 'id' = 'id') => {
    const defaultUrl = isDaytime 
        ? 'https://assets-v2.lottiefiles.com/a/5855a50a-1151-11ee-8713-db7d99d1cba7/0K62KcjosX.lottie'
        : 'https://assets-v2.lottiefiles.com/a/584838ca-1151-11ee-870e-2b08e98fd879/NLTBfths9o.lottie';

    const isEn = language === 'en';

    if (code === null) return { condition: isEn ? 'Clear' : 'Cerah', icon: isDaytime ? Sun : Moon, lottieUrl: defaultUrl };
    
    switch (code) {
        case 0:
            return { 
                condition: isEn ? 'Clear' : 'Cerah', 
                icon: isDaytime ? Sun : Moon, 
                lottieUrl: isDaytime 
                    ? 'https://assets-v2.lottiefiles.com/a/5855a50a-1151-11ee-8713-db7d99d1cba7/0K62KcjosX.lottie'
                    : 'https://assets-v2.lottiefiles.com/a/584838ca-1151-11ee-870e-2b08e98fd879/NLTBfths9o.lottie'
            };
        case 1:
        case 2:
            return { 
                condition: isEn ? 'Partly Cloudy' : 'Cerah Berawan', 
                icon: isDaytime ? CloudSun : Moon, 
                lottieUrl: isDaytime 
                    ? 'https://assets-v2.lottiefiles.com/a/584a51a0-1151-11ee-870f-73f0e4a25c18/OiRsquuDDf.lottie'
                    : 'https://assets-v2.lottiefiles.com/a/583b455c-1151-11ee-870b-13dd4c78db9c/9xWkK1I9gX.lottie'
            };
        case 3:
            return { 
                condition: isEn ? 'Cloudy' : 'Berawan', 
                icon: Cloud, 
                lottieUrl: isDaytime 
                    ? 'https://assets-v2.lottiefiles.com/a/584a51a0-1151-11ee-870f-73f0e4a25c18/OiRsquuDDf.lottie'
                    : 'https://assets-v2.lottiefiles.com/a/583b455c-1151-11ee-870b-13dd4c78db9c/9xWkK1I9gX.lottie'
            };
        case 45:
        case 48:
            return { 
                condition: isEn ? 'Foggy' : 'Kabut', 
                icon: Wind, 
                lottieUrl: 'https://assets-v2.lottiefiles.com/a/58360a9c-1151-11ee-8707-cf3589cbba23/k2vovxilDL.lottie'
            };
        case 51:
        case 53:
        case 55:
            return { 
                condition: isEn ? 'Drizzle' : 'Gerimis', 
                icon: CloudDrizzle, 
                lottieUrl: isDaytime
                    ? 'https://assets-v2.lottiefiles.com/a/58526552-1151-11ee-8710-7f5bc355e2bb/JIYnBacuWm.lottie'
                    : 'https://assets-v2.lottiefiles.com/a/58447ea6-1151-11ee-870c-5feb8c9a44b1/adpc1aPmVz.lottie'
            };
        case 56:
        case 57:
            return { 
                condition: isEn ? 'Freezing Drizzle' : 'Gerimis Dingin', 
                icon: CloudSnow, 
                lottieUrl: 'https://assets-v2.lottiefiles.com/a/5837c3dc-1151-11ee-8709-1bfa94b3ca50/1JbNUYBlfw.lottie'
            };
        case 61:
        case 63:
        case 65:
        case 80:
        case 81:
        case 82:
            return { 
                condition: isEn ? 'Rainy' : 'Hujan', 
                icon: CloudRain, 
                lottieUrl: isDaytime 
                    ? 'https://assets-v2.lottiefiles.com/a/58526552-1151-11ee-8710-7f5bc355e2bb/JIYnBacuWm.lottie'
                    : 'https://assets-v2.lottiefiles.com/a/58447ea6-1151-11ee-870c-5feb8c9a44b1/adpc1aPmVz.lottie'
            };
        case 66:
        case 67:
        case 71:
        case 73:
        case 75:
        case 77:
            return { 
                condition: isEn ? 'Snowy' : 'Salju', 
                icon: CloudSnow, 
                lottieUrl: isDaytime 
                    ? 'https://assets-v2.lottiefiles.com/a/5837c3dc-1151-11ee-8709-1bfa94b3ca50/1JbNUYBlfw.lottie'
                    : 'https://assets-v2.lottiefiles.com/a/58458008-1151-11ee-870d-4fdc70664590/UqiDxC2TrX.lottie'
            };
        case 95:
        case 96:
        case 99:
            return { 
                condition: isEn ? 'Thunderstorm' : 'Badai Petir', 
                icon: CloudLightning, 
                lottieUrl: 'https://assets-v2.lottiefiles.com/a/5856708e-1151-11ee-8714-6b61dd71fb9b/2XR4PRuYfx.lottie'
            };
    }
};

const formatGmailDate = (dateStr: string, lang: 'en' | 'id'): string => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return lang === 'id' ? 'Baru saja' : 'Just now';
        if (diffMins < 60) return lang === 'id' ? `${diffMins} mnt lalu` : `${diffMins}m ago`;
        if (diffHours < 24) return lang === 'id' ? `${diffHours} jam lalu` : `${diffHours}h ago`;
        
        return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
            month: 'short',
            day: 'numeric',
        });
    } catch (e) {
        return dateStr;
    }
};

interface GmailMessage {
    id: string;
    sender: string;
    senderEmail: string;
    subject: string;
    snippet: string;
    date: string;
    isUnread: boolean;
}

interface GmailWidgetProps {
    language: 'en' | 'id';
    t: (key: string) => string;
}

const GmailWidget: React.FC<GmailWidgetProps> = ({ language, t }) => {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [emails, setEmails] = useState<GmailMessage[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);

    const checkConnection = () => {
        setConnected(isGoogleConnected());
    };

    useEffect(() => {
        checkConnection();
        const interval = setInterval(checkConnection, 2000);
        return () => clearInterval(interval);
    }, []);

    const loadEmails = async (search = '') => {
        const token = getStoredToken();
        if (!token) {
            setConnected(false);
            return;
        }

        try {
            setError(null);
            const query = search 
                ? `&q=is:unread is:inbox ${encodeURIComponent(search)}` 
                : '&q=is:unread is:inbox';
            const listRes = await fetch(
                `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15${query}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (listRes.status === 401) {
                signOutGoogle();
                setConnected(false);
                return;
            }

            if (!listRes.ok) {
                throw new Error(`Gmail API error: ${listRes.status}`);
            }

            const listData = await listRes.json();
            const messages = listData.messages || [];
            if (messages.length === 0) {
                setEmails([]);
                return;
            }

            const details = await Promise.all(
                messages.map(async (msg: { id: string }) => {
                    const detailRes = await fetch(
                        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    if (!detailRes.ok) return null;
                    const detailData = await detailRes.json();

                    const headers = detailData.payload?.headers || [];
                    const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
                    const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
                    const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

                    let sender = fromHeader;
                    let senderEmail = '';
                    const emailMatch = fromHeader.match(/<([^>]+)>/);
                    if (emailMatch) {
                        sender = fromHeader.replace(/<[^>]+>/, '').trim();
                        senderEmail = emailMatch[1];
                    } else if (fromHeader.includes('@')) {
                        senderEmail = fromHeader;
                        sender = fromHeader.split('@')[0];
                    }

                    sender = sender.replace(/^["']|["']$/g, '');
                    const isUnread = detailData.labelIds?.includes('UNREAD') || false;

                    return {
                        id: msg.id,
                        sender,
                        senderEmail,
                        subject: subjectHeader,
                        snippet: detailData.snippet || '',
                        date: dateHeader,
                        isUnread,
                    };
                })
            );

            setEmails(details.filter((d): d is GmailMessage => d !== null));
        } catch (err: any) {
            console.error('Failed to load Gmail messages:', err);
            setError(err.message || 'Failed to fetch emails');
        }
    };

    const handleSelectEmail = async (email: GmailMessage) => {
        setSelectedEmail(email);

        if (email.isUnread) {
            const token = getStoredToken();
            if (!token) return;

            try {
                const res = await fetch(
                    `https://www.googleapis.com/gmail/v1/users/me/messages/${email.id}/modify`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            removeLabelIds: ['UNREAD'],
                        }),
                    }
                );

                if (res.ok) {
                    setEmails(prev => prev.filter(e => e.id !== email.id));
                }
            } catch (err) {
                console.error('Failed to mark email as read:', err);
            }
        }
    };

    useEffect(() => {
        if (connected) {
            setLoading(true);
            loadEmails().finally(() => setLoading(false));
        } else {
            setEmails([]);
        }
    }, [connected]);

    const handleConnect = async () => {
        try {
            setLoading(true);
            setError(null);
            await signInWithGoogle();
            setConnected(true);
            await loadEmails();
        } catch (err: any) {
            console.error('Google authorization failed:', err);
            setError(err.message || 'Google authorization failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        signOutGoogle();
        setConnected(false);
        setEmails([]);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setRefreshing(true);
        loadEmails(searchTerm).finally(() => setRefreshing(false));
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadEmails(searchTerm).finally(() => setRefreshing(false));
    };

    return (
        <Card className="rounded-xl border-border overflow-hidden relative backdrop-blur-md bg-white/40 dark:bg-zinc-900/40 border border-white/20 dark:border-zinc-800/40 mt-6">
            <CardHeader className="p-6 pb-4 border-b border-border/40 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shadow-inner">
                            <Mail size={16} strokeWidth={2.2} />
                        </div>
                        <span>Gmail Workspace</span>
                        {connected && !loading && emails.filter(e => e.isUnread).length > 0 && (
                            <Badge variant="destructive" className="bg-red-500 text-white border-0 font-bold px-1.5 h-5 rounded-full text-[10px]">
                                {emails.filter(e => e.isUnread).length} New
                            </Badge>
                        )}
                    </CardTitle>

                    {connected && (
                        <div className="flex flex-wrap items-center gap-2">
                            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-60">
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={language === 'id' ? 'Cari email...' : 'Search email...'}
                                    className="h-8 pl-8 pr-3 text-xs rounded-lg border-border/60 bg-background/50 focus:bg-background transition-all"
                                />
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                            </form>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background"
                                onClick={handleRefresh}
                                disabled={refreshing || loading}
                            >
                                <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-semibold border-destructive/20 hover:bg-destructive/10 text-destructive bg-background/50"
                                onClick={handleDisconnect}
                            >
                                Disconnect
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-red-500" size={28} />
                        <p className="text-xs font-medium text-muted-foreground">Connecting to Gmail...</p>
                    </div>
                ) : !connected ? (
                    <div className="p-8 text-center flex flex-col items-center max-w-lg mx-auto">
                        <div className="relative w-16 h-16 mb-4">
                            <div className="absolute inset-0 bg-red-500/10 rounded-2xl blur-md" />
                            <div className="relative w-16 h-16 bg-red-500/5 rounded-2xl flex items-center justify-center border border-red-500/20">
                                <Mail className="text-red-500" size={28} strokeWidth={1.8} />
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-foreground mb-1">
                            {language === 'id' ? 'Hubungkan Google Workspace Anda' : 'Connect Your Google Workspace'}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                            {language === 'id' 
                                ? 'Integrasikan inbox Gmail Anda ke dashboard untuk membaca pesan masuk secara real-time dan meningkatkan alur kerja Anda.'
                                : 'Integrate your Gmail inbox into the dashboard to read incoming messages in real-time and streamline your workspace flow.'}
                        </p>
                        {error && (
                            <div className="mb-4 text-xs font-semibold text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 group transition-all"
                            onClick={handleConnect}
                        >
                            <span>{language === 'id' ? 'Hubungkan Gmail' : 'Connect Gmail'}</span>
                            <ArrowRight size={13} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto">
                        {error ? (
                            <>
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 mb-3 animate-bounce">
                                    <AlertCircle size={20} strokeWidth={2.2} />
                                </div>
                                <p className="text-xs font-bold text-foreground mb-1">
                                    {language === 'id' ? 'Gagal Memuat Kotak Masuk' : 'Failed to Load Inbox'}
                                </p>
                                <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                                    {error.includes('403') 
                                        ? (language === 'id' 
                                            ? 'Akun Google Anda terhubung sebelum fitur Gmail diaktifkan. Silakan klik "Disconnect" di kanan atas, lalu hubungkan kembali untuk mengizinkan akses email.' 
                                            : 'Your Google account was connected before Gmail integration was enabled. Please click "Disconnect" at the top right, then reconnect to grant email access.')
                                        : error}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold border-amber-500/20 hover:bg-amber-500/10 text-amber-600 bg-background/50"
                                    onClick={handleRefresh}
                                >
                                    {language === 'id' ? 'Coba Lagi' : 'Try Again'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 mb-3">
                                    <Check size={20} strokeWidth={2.5} />
                                </div>
                                <p className="text-xs font-bold text-foreground mb-1">
                                    {language === 'id' ? 'Inbox Anda Bersih!' : 'Your Inbox is Clean!'}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {language === 'id' ? 'Tidak ada email baru yang ditemukan di kotak masuk.' : 'No new emails found in your inbox.'}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border/40 max-h-[350px] overflow-y-auto custom-scrollbar">
                        {emails.map((email) => (
                            <div
                                key={email.id}
                                className={`flex items-start gap-4 p-4 hover:bg-muted/40 cursor-pointer transition-all ${
                                    email.isUnread ? 'bg-primary/5 dark:bg-primary/5' : ''
                                }`}
                                onClick={() => handleSelectEmail(email)}
                            >
                                <div className="relative mt-0.5 shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center text-xs font-black uppercase border border-border/60">
                                        {email.sender.substring(0, 2)}
                                    </div>
                                    {email.isUnread && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-background" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className={`text-xs truncate ${email.isUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'}`}>
                                            {email.sender}
                                        </h4>
                                        <span className="text-[10px] text-muted-foreground/80 font-medium shrink-0">
                                            {formatGmailDate(email.date, language)}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate mt-0.5 ${email.isUnread ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                        {email.subject}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 font-medium leading-relaxed">
                                        {email.snippet}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            {connected && emails.length > 0 && (
                <div className="p-3 border-t border-border/40 bg-muted/10 text-center">
                    <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider"
                    >
                        <span>{language === 'id' ? 'Buka Gmail Selengkapnya' : 'Go to Gmail Inbox'}</span>
                        <ArrowUpRight size={12} strokeWidth={2.5} />
                    </a>
                </div>
            )}

            {/* Email Detail Modal */}
            <AnimatePresence>
                {selectedEmail && typeof window !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedEmail(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-xl bg-background border border-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden z-[10000]"
                        >
                            <div className="p-6 border-b border-border/60 flex items-start justify-between bg-muted/20">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm uppercase border border-border/80 text-foreground shrink-0">
                                        {selectedEmail.sender.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-foreground leading-tight">{selectedEmail.sender}</h4>
                                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{selectedEmail.senderEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border/40">
                                        {new Date(selectedEmail.date).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}
                                    </span>
                                    <button
                                        onClick={() => setSelectedEmail(null)}
                                        className="w-8 h-8 rounded-lg bg-background hover:bg-muted border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Plus size={16} className="rotate-45" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Subject</span>
                                    <h2 className="text-base font-bold text-foreground mt-0.5 leading-snug">{selectedEmail.subject}</h2>
                                </div>
                                <div className="border-t border-border/40 pt-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 block mb-2">Message Snippet</span>
                                    <p className="text-xs text-foreground/90 leading-relaxed bg-muted/40 p-4 rounded-xl border border-border/40 font-medium">
                                        {selectedEmail.snippet}
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs font-semibold"
                                    onClick={() => setSelectedEmail(null)}
                                >
                                    Close
                                </Button>
                                <a
                                    href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-colors animate-pulse"
                                >
                                    <span>Reply in Gmail</span>
                                    <ArrowUpRight size={13} strokeWidth={2.2} />
                                </a>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>
        </Card>
    );
};

export const TaskplusDashboard: React.FC<TaskplusDashboardProps> = ({ onNavigate, userName, userRole = 'User', currentUser }) => {
    const { language, t } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [projectSearch, setProjectSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeMode, setActiveMode] = useState<'PERSONAL' | 'ORGANIZATION'>(currentUser?.role === 'Admin' ? 'ORGANIZATION' : 'PERSONAL');
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dismissedAnnouncements, setDismissedAnnouncements] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem('dismissed_broadcasts');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [sessionDismissed, setSessionDismissed] = useState<number[]>([]);

    const activeModalAnn = useMemo(() => {
        return announcements.find(ann => !dismissedAnnouncements.includes(ann.id!) && !sessionDismissed.includes(ann.id!));
    }, [announcements, dismissedAnnouncements, sessionDismissed]);
    const [activityYear, setActivityYear] = useState<string>('last_12M');
    const [weather, setWeather] = useState<{
        temp: number | null;
        city: string | null;
        condition: string | null;
        code: number | null;
        lottieUrl: string | null;
        loading: boolean;
    }>({
        temp: null,
        city: null,
        condition: null,
        code: null,
        lottieUrl: null,
        loading: true
    });

    const playerRef = useRef<any>(null);

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    const [stats, setStats] = useState({
        // Personal KPI
        myOpenActivities: 0,
        myOpenTickets: 0,
        myTasksTodayCount: 0,
        myProcurementRequests: 0,
        myAssetLoans: 0,
        myOverdueItems: 0,

        // Organization KPI
        totalOpenTickets: 0,
        totalActiveActivities: 0,
        pendingProcurement: 0,
        totalPurchaseThisMonth: 0,
        totalITAssets: 0,
        activeAssetLoans: 0,
        taskCompletionRate: '0%',
        totalHighPriority: 0,
        totalOverdueOrg: 0,
        supportSLA: 0,
        supportRating: 0,

        // Detailed Data
        procurementStats: { pending: 0, approved: 0, rejected: 0, totalBudget: 0 },
        personalAlerts: [] as string[],
        orgCritical: [] as string[],
        assetBreakdown: { it: 0, ga: 0, categories: {} as any },

        // Purchase Record Summary
        purchaseSummary: {
            totalDisbursed: 0,
            totalLiability: 0,
            fiscalVolume: 0,
            pendingCount: 0,
            totalRecords: 0,
            topCategories: [] as { name: string; total: number; percentage: number }[],
            topDepartments: [] as { name: string; total: number; percentage: number }[],
        },

        // Activity Heatmap
        activityHeatmap: {} as Record<string, number>,
        activityTotal: 0,
        activeAssetLoanCount: 0,
        overdueAssetLoanCount: 0,
        topHandlers: [] as {name: string, count: number}[]
    });

    const [listData, setListData] = useState({
        myTasksToday: [] as any[],
        myActivities: [] as any[],
        myProcurement: [] as any[],
        myBorrowedAssets: [] as any[],
        orgActivities: [] as any[],
        orgRecentTickets: [] as any[],
        allProjects: [] as ProjectItem[]
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const tenDaysAgo = new Date(); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            const [
                { data: weeklyPlans },
                { data: purchasePlans },
                { data: helpTickets },
                { data: activities },
                { data: itAssets },
                { data: announcementsData },
                { data: purchaseRecords },
                { count: activeLoanCount },
                { count: overdueCount }
            ] = await Promise.all([
                supabase.from('weekly_plans').select('*').order('due_date', { ascending: true }),
                supabase.from('purchase_plans').select('*').order('request_date', { ascending: false }),
                supabase.from('helpdesk_tickets').select('*').order('created_at', { ascending: false }),
                supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
                supabase.from('it_assets').select('*'),
                supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
                supabase.from('purchase_records').select('id, subtotal, status, category, department, purchase_date, vendor').order('purchase_date', { ascending: false }),
                supabase.from('it_asset_loans').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
                supabase.from('it_asset_loans').select('*', { count: 'exact', head: true }).neq('status', 'Returned').lt('expected_return_date', new Date().toISOString())
            ]);

            const currentUserName = currentUser?.fullName || '';

            const currentUserFirstName = currentUserName.split(' ')[0];

            // --- PERSONAL CALCULATIONS ---
            const myActivitiesRaw = (activities || []).filter(a => (a.requester === currentUserName || a.assigned_to === currentUserName) && a.status !== 'Completed');
            const myTicketsRaw = (helpTickets || []).filter(t => t.requester_name === currentUserName && (t.status === 'Open' || t.status === 'In Progress'));
            const myTasksToday = (weeklyPlans || []).filter(w => {
                const isAssigned = w.owner === currentUserName || w.assignee === currentUserName || w.assignee === currentUserFirstName;
                const start = w.start_date || w.due_date;
                const end = w.due_date;
                const isToday = start <= today && end >= today;
                return isToday && isAssigned;
            });
            const myProcurements = (purchasePlans || []).filter(p => p.requester === currentUserName);
            const myLoans = (itAssets || []).filter(a => a.user_assigned === currentUserName && a.status === 'Used');

            // Overdue logic
            const overdueTasksCount = (weeklyPlans || []).filter(w => {
                const isAssigned = w.owner === currentUserName || w.assignee === currentUserName || w.assignee === currentUserFirstName;
                return isAssigned && w.status !== 'Done' && w.status !== 'Completed' && w.due_date && w.due_date < today;
            }).length;
            const overdueActivitiesCount = (activities || []).filter(a => (a.requester === currentUserName || a.assigned_to === currentUserName) && a.status !== 'Completed' && a.due_date && a.due_date < today).length;
            const myOverdueTotal = overdueTasksCount + overdueActivitiesCount;

            const personalAlerts: string[] = [];
            if (myOverdueTotal > 0) personalAlerts.push(`${myOverdueTotal} planner overdue`);
            const oldProcurement = myProcurements.find(p => p.status?.includes('Pending') && p.request_date && new Date(p.request_date) < fiveDaysAgo);
            if (oldProcurement) personalAlerts.push(`1 procurement pending > 5 hari`);
            const nearDueLoan = myLoans.find(a => a.due_date && (new Date(a.due_date).getTime() - new Date().getTime()) < 3 * 24 * 3600 * 1000);
            if (nearDueLoan) personalAlerts.push(`1 loan hampir jatuh tempo`);
            
            // Add actual overdue loans to personal alerts if any
            const myOverdueLoans = (itAssets || []).filter(a => a.user_assigned === currentUserName && a.status === 'Overdue').length;
            if (myOverdueLoans > 0) personalAlerts.push(`${myOverdueLoans} asset overdue`);

            // --- ORGANIZATION CALCULATIONS ---
            const totalTickets = (helpTickets || []).filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
            const activeActivities = (activities || []).filter(a => a.status !== 'Completed');
            const pendingProc = (purchasePlans || []).filter(p => p.status?.includes('Pending'));
            const thisMonthPurchases = (purchasePlans || []).filter(p => {
                if (!p.request_date) return false;
                const d = new Date(p.request_date);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            const totalPurchaseVal = thisMonthPurchases.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
            const totalAssets = (itAssets || []).length;
            const activeLoans = (itAssets || []).filter(a => a.status === 'Used').length;
            const completionRate = weeklyPlans && weeklyPlans.length > 0 ?
                `${Math.round((weeklyPlans.filter(w => w.status === 'Done' || w.status === 'Completed').length / weeklyPlans.length) * 100)}%` : '0%';

            // --- SLA & RATING CALCULATIONS (Consistent with HelpdeskManager) ---
            const resolvedTickets = (helpTickets || []).filter(t => t.status === 'Resolved' || t.status === 'Closed');
            
            let totalSlaHours = 0;
            let resolvedWithDates = 0;
            
            resolvedTickets.forEach(t => {
                // Use responded_at (actual processing start) with fallback to created_at
                const startTime = t.responded_at || t.created_at;
                if (startTime && t.resolved_at) {
                    const start = new Date(startTime);
                    const end = new Date(t.resolved_at);
                    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    if (diffHours >= 0) {
                        totalSlaHours += diffHours;
                        resolvedWithDates++;
                    }
                }
            });
            
            const avgSlaHours = resolvedWithDates > 0 ? (totalSlaHours / resolvedWithDates).toFixed(1) : '0';
            
            const ratedTickets = (helpTickets || []).filter(t => t.rating && t.rating > 0);
            const totalRating = ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0);
            const avgRating = ratedTickets.length > 0 ? (totalRating / ratedTickets.length).toFixed(1) : '0';

            // --- TOP HANDLERS ---
            const validStaff = new Set<string>();
            (activities || []).forEach(a => {
                if (a.itPersonnel && typeof a.itPersonnel === 'string' && a.itPersonnel.trim() !== '' && a.itPersonnel !== 'undefined' && a.itPersonnel !== 'null') validStaff.add(a.itPersonnel);
                if (a.assigned_to && typeof a.assigned_to === 'string' && a.assigned_to.trim() !== '' && a.assigned_to !== 'undefined' && a.assigned_to !== 'null') validStaff.add(a.assigned_to);
            });
            (helpTickets || []).forEach(t => {
                if (t.assigned_to && typeof t.assigned_to === 'string' && t.assigned_to.trim() !== '' && t.assigned_to !== 'undefined' && t.assigned_to !== 'null') validStaff.add(t.assigned_to);
                if (t.resolved_by && typeof t.resolved_by === 'string' && t.resolved_by.trim() !== '' && t.resolved_by !== 'undefined' && t.resolved_by !== 'null') validStaff.add(t.resolved_by);
            });

            if (validStaff.size === 0) {
                validStaff.add(currentUserName || 'IT Technician');
            }

            const activeTickets = (helpTickets || []).filter(t => t.status === 'Open' || t.status === 'In Progress');
            const handlerMap: Record<string, number> = {};
            
            validStaff.forEach(staff => handlerMap[staff] = 0);

            activeTickets.forEach(t => {
                const handler = t.assigned_to || t.assignedTo || t.resolved_by;
                if (handler && typeof handler === 'string' && handlerMap[handler] !== undefined) {
                    handlerMap[handler] += 1;
                }
            });

            const topHandlersList = Object.entries(handlerMap)
                .map(([name, count]) => ({name, count}))
                .filter(h => h.name && h.name.length > 0)
                .sort((a,b) => b.count - a.count)
                .slice(0, 3);

            const orgAlerts: string[] = [];
            const oldTickets = totalTickets.filter(t => new Date(t.created_at) < threeDaysAgo).length;
            if (oldTickets >= 3) orgAlerts.push(`${oldTickets} tickets > 3 hari belum close`);
            const oldOrgProc = pendingProc.filter(p => p.request_date && new Date(p.request_date) < sevenDaysAgo).length;
            if (oldOrgProc >= 2) orgAlerts.push(`${oldOrgProc} procurement pending > 7 hari`);
            const overdueTotal = (weeklyPlans || []).filter(w => (w.status !== 'Done' && w.status !== 'Completed') && w.due_date && w.due_date < today).length;
            if (overdueTotal > 0) orgAlerts.push(`${overdueTotal} items overdue`);
            
            // Add Overdue Loans to Org Alerts
            const totalOverdueLoans = overdueCount || 0;
            if (totalOverdueLoans > 0) orgAlerts.push(`${totalOverdueLoans} asset loans overdue`);

            // --- PROJECTS DATA (FROM WEEKLY PLANS) ---

            // --- PROJECTS DATA (FROM WEEKLY PLANS) ---
            const projectPlans = (weeklyPlans || []).filter(w => w.category === 'Project');
            const groupedProjects: Record<string, { tasks: any[]; latestDate: string; owner: string; dept: string; priority: string }> = {};

            projectPlans.forEach(task => {
                const name = task.task.split(':')[0] || 'Operational';
                if (!groupedProjects[name]) {
                    groupedProjects[name] = {
                        tasks: [],
                        latestDate: task.due_date || today,
                        owner: task.assignee || 'IT',
                        dept: task.department || 'GENERAL',
                        priority: task.priority || 'Medium'
                    };
                }
                groupedProjects[name].tasks.push(task);
                if (task.due_date > groupedProjects[name].latestDate) groupedProjects[name].latestDate = task.due_date;
                // Keep the highest priority
                if (task.priority === 'High') groupedProjects[name].priority = 'High';
            });

            const projectItems: ProjectItem[] = Object.entries(groupedProjects).map(([name, data], index) => {
                const total = data.tasks.length;
                const completed = data.tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                return {
                    id: index + 1,
                    name: name,
                    status: (progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending') as any,
                    progress,
                    totalTasks: total,
                    completedTasks: completed,
                    dueDate: data.latestDate,
                    owner: data.owner,
                    department: data.dept,
                    priority: data.priority
                };
            });

            // Asset Breakdown - Real Categorization
            const itCategoryList = ['Laptop', 'PC', 'Server', 'Network', 'Monitor', 'Printer', 'Hardware'];
            let itCount = 0;
            let gaCount = 0;
            const assetCats: any = {};
            (itAssets || []).forEach(a => {
                const cat = a.category || 'Other';
                assetCats[cat] = (assetCats[cat] || 0) + 1;
                if (itCategoryList.some(c => cat.includes(c))) itCount++;
                else gaCount++;
            });

            setStats({
                myOpenActivities: myActivitiesRaw.length,
                myOpenTickets: myTicketsRaw.length,
                myTasksTodayCount: myTasksToday.length,
                myProcurementRequests: myProcurements.length,
                myAssetLoans: myLoans.length,
                myOverdueItems: myOverdueTotal,

                totalOpenTickets: totalTickets.length,
                totalActiveActivities: activeActivities.length,
                pendingProcurement: pendingProc.length,
                totalPurchaseThisMonth: totalPurchaseVal,
                totalITAssets: totalAssets,
                activeAssetLoans: activeLoanCount || 0,
                taskCompletionRate: completionRate,
                totalHighPriority: (weeklyPlans || []).filter(w => w.priority === 'High' && w.status !== 'Done' && w.status !== 'Completed').length,
                totalOverdueOrg: overdueCount || 0,
                activeAssetLoanCount: activeLoanCount || 0,
                overdueAssetLoanCount: overdueCount || 0,
                supportSLA: Number(avgSlaHours),
                supportRating: Number(avgRating),
                topHandlers: topHandlersList,

                procurementStats: {
                    pending: myProcurements.filter(p => p.status?.includes('Pending')).length,
                    approved: myProcurements.filter(p => p.status === 'Approved').length,
                    rejected: myProcurements.filter(p => p.status === 'Rejected').length,
                    totalBudget: myProcurements.reduce((acc, curr) => acc + (curr.total_price || 0), 0)
                },
                personalAlerts,
                orgCritical: orgAlerts,
                assetBreakdown: {
                    it: itCount,
                    ga: gaCount,
                    categories: assetCats
                },

                // Purchase Record Summary
                purchaseSummary: (() => {
                    const recs = purchaseRecords || [];
                    const totalDisbursed = recs.filter(r => r.status === 'Paid').reduce((sum: number, r: any) => sum + (r.subtotal || 0), 0);
                    const totalLiability = recs.filter(r => r.status !== 'Paid').reduce((sum: number, r: any) => sum + (r.subtotal || 0), 0);
                    const fiscalVolume = recs.reduce((sum: number, r: any) => sum + (r.subtotal || 0), 0);
                    const pendingCount = recs.filter(r => r.status === 'Pending').length;

                    // Top Categories
                    const catMap: Record<string, number> = {};
                    recs.forEach((r: any) => {
                        const cat = r.category || 'Uncategorized';
                        catMap[cat] = (catMap[cat] || 0) + (r.subtotal || 0);
                    });
                    const topCategories = Object.entries(catMap)
                        .map(([name, total]) => ({ name, total, percentage: fiscalVolume > 0 ? Math.round((total / fiscalVolume) * 100) : 0 }))
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 5);

                    // Top Departments
                    const deptMap: Record<string, number> = {};
                    recs.forEach((r: any) => {
                        const dept = r.department || 'Unknown';
                        deptMap[dept] = (deptMap[dept] || 0) + (r.subtotal || 0);
                    });
                    const topDepartments = Object.entries(deptMap)
                        .map(([name, total]) => ({ name, total, percentage: fiscalVolume > 0 ? Math.round((total / fiscalVolume) * 100) : 0 }))
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 5);

                    return { totalDisbursed, totalLiability, fiscalVolume, pendingCount, totalRecords: recs.length, topCategories, topDepartments };
                })(),

                // Activity Heatmap — count activities per day from multiple sources
                activityHeatmap: (() => {
                    const heatmap: Record<string, number> = {};
                    // Count from activity_logs
                    (activities || []).forEach((a: any) => {
                        const day = a.created_at?.split('T')[0];
                        if (day) heatmap[day] = (heatmap[day] || 0) + 1;
                    });
                    // Count from helpdesk_tickets
                    (helpTickets || []).forEach((t: any) => {
                        const day = t.created_at?.split('T')[0];
                        if (day) heatmap[day] = (heatmap[day] || 0) + 1;
                    });
                    // Count from weekly_plans
                    (weeklyPlans || []).forEach((w: any) => {
                        const day = w.created_at?.split('T')[0] || w.due_date;
                        if (day) heatmap[day] = (heatmap[day] || 0) + 1;
                    });
                    return heatmap;
                })(),
                activityTotal: (activities || []).length + (helpTickets || []).length + (weeklyPlans || []).length,
            });

            setListData({
                myTasksToday,
                myActivities: myActivitiesRaw.slice(0, 5),
                myProcurement: myProcurements.slice(0, 5),
                myBorrowedAssets: myLoans,
                orgActivities: activeActivities.slice(0, 10),
                orgRecentTickets: totalTickets.slice(0, 10),
                allProjects: projectItems
            });

            // --- PERFORMANCE DATA (REAL TICKET TRENDS) ---
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const performanceTrend = last7Days.map(date => {
                const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                const ticketsOnDay = (helpTickets || []).filter(t => t.created_at?.split('T')[0] === date);
                const resolvedOnDay = (helpTickets || []).filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.updated_at?.split('T')[0] === date);

                return {
                    day: dayLabel,
                    value: ticketsOnDay.length, // Open/New
                    value2: resolvedOnDay.length // Resolved
                };
            });
            setPerformanceData(performanceTrend);

            setAnnouncements(announcementsData || []);

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchData(); 

        // Real-time subscription to auto-refresh dashboard when data changes
        const channel = supabase
            .channel('dashboard-auto-refresh')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'it_asset_loans' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'helpdesk_tickets' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_plans' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_plans' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        const fetchWeather = async () => {
            const fetchWeatherData = async (lat: number, lon: number, cityName: string) => {
                try {
                    const weatherRes = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&current_weather=true`
                    );
                    if (weatherRes.ok) {
                        const weatherData = await weatherRes.json();
                        const current = weatherData.current || weatherData.current_weather;
                        if (weatherData && current) {
                            const temp = Math.round(current.temperature_2m !== undefined ? current.temperature_2m : current.temperature);
                            const code = current.weather_code !== undefined ? current.weather_code : current.weathercode;
                            const hour = new Date().getHours();
                            const isDaytime = hour >= 6 && hour < 18;
                            const details = getWeatherDetails(code, isDaytime, language);

                            setWeather({
                                temp,
                                city: cityName,
                                condition: details.condition,
                                code,
                                lottieUrl: details.lottieUrl,
                                loading: false
                            });
                            return true;
                        }
                    }
                } catch (err) {
                    console.warn('Error fetching weather data from coordinates:', err);
                }
                return false;
            };

            const fetchByIpFallback = async () => {
                // 1. Try IPWho.is (CORS-enabled, free without API key)
                try {
                    const locRes = await fetch('https://ipwho.is/');
                    if (locRes.ok) {
                        const locData = await locRes.json();
                        if (locData && locData.latitude && locData.longitude) {
                            const lat = locData.latitude;
                            const lon = locData.longitude;
                            const city = locData.city || 'Jakarta';
                            const success = await fetchWeatherData(lat, lon, city);
                            if (success) return true;
                        }
                    }
                } catch (ipWhoErr) {
                    console.warn('IPWho.is failed, trying ipapi.co:', ipWhoErr);
                }

                // 2. Fallback to IPAPI.co
                try {
                    const locRes = await fetch('https://ipapi.co/json/');
                    if (locRes.ok) {
                        const locData = await locRes.json();
                        if (locData && locData.latitude && locData.longitude) {
                            const lat = locData.latitude;
                            const lon = locData.longitude;
                            const city = locData.city || 'Jakarta';
                            const success = await fetchWeatherData(lat, lon, city);
                            if (success) return true;
                        }
                    }
                } catch (ipErr) {
                    console.warn('IP-based weather fallback also failed:', ipErr);
                }
                return false;
            };

            // Start general IP-based weather loading immediately for zero loading latency
            const ipFetchPromise = fetchByIpFallback();

            // Then try browser GPS to refine to exact high-accuracy coordinate in parallel
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        let resolvedCity = '';

                        try {
                            const geoRes = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
                                { headers: { 'Accept-Language': language === 'en' ? 'en' : 'id' } }
                            );
                            if (geoRes.ok) {
                                const geoData = await geoRes.json();
                                const address = geoData.address || {};
                                resolvedCity = address.suburb || address.village || address.city_district || address.town || address.city;
                            }
                        } catch (geoErr) {
                            console.warn('Reverse geocoding failed:', geoErr);
                        }

                        // Refine with exact GPS coordinates and the suburb name
                        await fetchWeatherData(lat, lon, resolvedCity || 'Pecenongan');
                    },
                    async (error) => {
                        console.log('HTML5 Geolocation declined or timed out, using fallback:', error.message);
                        const ipResolved = await ipFetchPromise;
                        if (!ipResolved) {
                            setWeather(prev => ({ ...prev, loading: false }));
                        }
                    },
                    { enableHighAccuracy: true, timeout: 3000 }
                );
            } else {
                const ipResolved = await ipFetchPromise;
                if (!ipResolved) {
                    setWeather(prev => ({ ...prev, loading: false }));
                }
            }
        };

        fetchWeather();
    }, []);

    useEffect(() => {
        if (playerRef.current) {
            try {
                // Force attributes for standard web components
                playerRef.current.setAttribute('autoplay', 'true');
                playerRef.current.setAttribute('loop', 'true');
                
                // Add event listener for when the component is ready
                const handleReady = () => {
                    if (playerRef.current && typeof playerRef.current.play === 'function') {
                        playerRef.current.play();
                    }
                };

                playerRef.current.addEventListener('ready', handleReady);
                
                // Try immediate execution too
                if (typeof playerRef.current.play === 'function') {
                    playerRef.current.play();
                }

                return () => {
                    if (playerRef.current) {
                        playerRef.current.removeEventListener('ready', handleReady);
                    }
                };
            } catch (e) {
                console.warn('Lottie player control trigger failed:', e);
            }
        }
    }, [weather.lottieUrl]);

    const filteredProjects = useMemo(() => {
        return listData.allProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()));
    }, [listData.allProjects, projectSearch]);

    const rpp = 10;
    const paginatedProjects = filteredProjects.slice((currentPage - 1) * rpp, currentPage * rpp);
    const totalPages = Math.max(Math.ceil(filteredProjects.length / rpp), 1);

    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse">
                {/* Hero skeleton */}
                <div className="h-44 bg-muted rounded-xl" />
                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-36 bg-muted rounded-xl" />)}
                </div>
                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 h-80 bg-muted rounded-xl" />
                    <div className="lg:col-span-8 h-80 bg-muted rounded-xl" />
                </div>
            </div>
        );
    }

    // Dynamic greeting based on time of day and weather
    const getGreeting = () => {
        const hour = new Date().getHours();
        const isDaytime = hour >= 6 && hour < 18;
        const isEn = language === 'en';
        
        let greetingText = isEn ? 'Good evening' : 'Selamat malam';
        if (hour < 12) greetingText = isEn ? 'Good morning' : 'Selamat pagi';
        else if (hour < 18) greetingText = isEn ? 'Good afternoon' : 'Selamat siang';

        if (weather.code !== null) {
            const details = getWeatherDetails(weather.code, isDaytime, language);
            return { text: greetingText, icon: details.icon };
        }

        // Fallback to time-based icons
        if (hour < 12) return { text: greetingText, icon: Sunrise };
        if (hour < 18) return { text: greetingText, icon: Sun };
        return { text: greetingText, icon: Moon };
    };
    const greeting = getGreeting();
    const GreetingIcon = greeting.icon;
    const firstName = (userName || currentUser?.fullName || 'there').split(' ')[0];
    const todayFormatted = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    return (
        <>
            {/* --- SYSTEM BROADCASTS MODAL POP-UP --- */}
            <AnimatePresence>
                {activeModalAnn && typeof window !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        {/* Blur Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setSessionDismissed(prev => [...prev, activeModalAnn.id!])}
                        />

                        {/* Modal Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="relative w-full max-w-lg bg-background border border-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden z-[10000] p-6 space-y-6"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl shrink-0 ${
                                    activeModalAnn.type === 'info' ? 'bg-zinc-500/10 dark:bg-zinc-400/10 text-zinc-900 dark:text-zinc-100' :
                                    activeModalAnn.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                                    activeModalAnn.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                                    'bg-emerald-500/10 text-emerald-500'
                                }`}>
                                    <Megaphone size={22} strokeWidth={2.2} className="animate-pulse" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                            activeModalAnn.type === 'info' ? 'bg-zinc-500/15 text-zinc-900 dark:text-zinc-100' :
                                            activeModalAnn.type === 'warning' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                                            activeModalAnn.type === 'error' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                                            'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            {activeModalAnn.type} Broadcast
                                        </span>
                                        {activeModalAnn.created_at && (
                                            <span className="text-[10px] text-muted-foreground/80 font-medium">
                                                {new Date(activeModalAnn.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground leading-snug">{activeModalAnn.title}</h2>
                                </div>
                            </div>

                            <div className="border-t border-border/40 pt-4">
                                <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/40 font-medium whitespace-pre-wrap max-h-[250px] overflow-y-auto custom-scrollbar">
                                    {activeModalAnn.content}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto text-xs font-semibold h-9 rounded-xl border-border/60"
                                    onClick={() => setSessionDismissed(prev => [...prev, activeModalAnn.id!])}
                                >
                                    {language === 'id' ? 'Tutup' : 'Close'}
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className={`w-full sm:w-auto text-xs font-bold h-9 rounded-xl text-zinc-50 dark:text-zinc-900 border-0 ${
                                        activeModalAnn.type === 'info' ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200' :
                                        activeModalAnn.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                                        activeModalAnn.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' :
                                        'bg-emerald-500 hover:bg-emerald-600'
                                    }`}
                                    onClick={() => {
                                        const updated = [...dismissedAnnouncements, activeModalAnn.id!];
                                        setDismissedAnnouncements(updated);
                                        localStorage.setItem('dismissed_broadcasts', JSON.stringify(updated));
                                    }}
                                >
                                    {language === 'id' ? 'Jangan Tampilkan Lagi' : "Don't Show Again"}
                                </Button>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>

            <div className="w-full space-y-8 animate-in fade-in duration-700 pb-16">

            {/* --- HERO HEADER --- */}
            <div className="rounded-xl border border-border/60 bg-card p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        {/* Avatar / Icon */}
                        <div className="hidden sm:flex w-14 h-14 items-center justify-center shrink-0">
                            {weather.lottieUrl ? (
                                /* @ts-ignore */
                                <dotlottie-player
                                    ref={playerRef}
                                    src={weather.lottieUrl}
                                    background="transparent"
                                    speed="1"
                                    style={{ width: '64px', height: '64px' }}
                                    loop
                                    autoplay
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <GreetingIcon size={24} className="text-primary" strokeWidth={2} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                                <span>{todayFormatted}</span>
                                {weather.city ? (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span className="text-primary flex items-center gap-1 normal-case font-bold">
                                            {weather.city} • {weather.temp}°C, {getWeatherDetails(weather.code, new Date().getHours() >= 6 && new Date().getHours() < 18, language).condition}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span className="text-primary">{greeting.text}</span>
                                    </>
                                )}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                                {greeting.text}, {firstName}
                                <span className="text-primary">.</span>
                            </h1>
                            <p className="text-sm text-muted-foreground font-medium max-w-xl">
                                {activeMode === 'PERSONAL'
                                    ? "Here's your daily workspace — tasks, tickets, and equipment at a glance."
                                    : 'Real-time organizational health, infrastructure status, and team performance.'}
                            </p>
                        </div>
                    </div>

                    {/* Mode Toggle with Icons */}
                    <div className="flex p-1 bg-muted/60 rounded-xl border border-border/60 self-start lg:self-auto">
                        {([
                            { id: 'PERSONAL', label: 'Personal', icon: User },
                            { id: 'ORGANIZATION', label: 'Organization', icon: Building2 }
                        ] as const).map(mode => {
                            const ModeIcon = mode.icon;
                            const isActive = activeMode === mode.id;
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => setActiveMode(mode.id)}
                                    className={`relative flex items-center gap-2 px-4 md:px-5 py-2 rounded-lg text-[12px] font-semibold transition-all
                                        ${isActive
                                            ? 'bg-background text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }
                                    `}
                                >
                                    <ModeIcon size={14} strokeWidth={2.2} className={isActive ? 'text-primary' : ''} />
                                    <span>{mode.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 pt-4 border-t border-border/40 flex flex-wrap gap-x-5 gap-y-1">
                    {[
                        { label: 'New Ticket', view: 'helpdesk' },
                        { label: 'Activity Log', view: 'activity' },
                        { label: 'Weekly Plan', view: 'weekly' },
                        { label: 'Procurement', view: 'purchase' },
                        { label: 'Assets', view: 'assets' },
                    ].map(action => (
                        <button
                            key={action.view}
                            onClick={() => onNavigate(action.view)}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- DASHBOARD CONTENT --- */}
            {activeMode === 'PERSONAL' ? (
                /* 🔷 MY WORKSPACE (PERSONAL) */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">

                    {/* 1. Summary Cards (Personal KPI) — Linear style */}
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="flex-1 border border-border/60 bg-card rounded-xl p-5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">My Tasks Today</p>
                            <p className="text-3xl font-bold tracking-tight text-foreground">{stats.myTasksTodayCount}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Due today</p>
                        </div>
                        <div className="flex flex-1 gap-3">
                            {[
                                { label: 'Activities', value: stats.myOpenActivities, sub: 'Pending' },
                                { label: 'Open Tickets', value: stats.myOpenTickets, sub: 'Active' },
                                { label: 'Procurement', value: stats.myProcurementRequests, sub: 'Requests' },
                                { label: 'Asset Loans', value: stats.myAssetLoans, sub: 'Borrowed' },
                            ].map(item => (
                                <div key={item.label} className="flex-1 border border-border/60 bg-card rounded-xl p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{item.label}</p>
                                    <p className="text-xl font-bold tracking-tight text-foreground mt-1">{item.value}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                        {stats.myOverdueItems > 0 && (
                            <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-4 flex items-center gap-3 min-w-[180px]">
                                <p className="text-2xl font-bold text-destructive">{stats.myOverdueItems}</p>
                                <div>
                                    <p className="text-[10px] font-semibold text-destructive">Overdue</p>
                                    <p className="text-[10px] text-destructive/70">Urgent</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* 2. My Tasks Today (Planner Integration) */}
                        <Card className="lg:col-span-4 rounded-xl border-border overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-bold flex items-center justify-between">
                                    Today's Tasks
                                    <Badge variant="secondary" className="bg-primary/5 text-primary">Planner</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 space-y-6">
                                {listData.myTasksToday.length > 0 ? (
                                    listData.myTasksToday.map((task, i) => {
                                        const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0];
                                        return (
                                            <div key={task.id} className={`flex gap-3 group p-3 rounded-lg border transition-all ${isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border/50'}`}>
                                                <div className={`w-1 h-8 rounded-full ${isOverdue ? 'bg-destructive' : 'bg-primary'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-sm font-semibold truncate ${isOverdue ? 'text-destructive' : ''}`}>{task.task}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{task.startTime || '08:00'}</span>
                                                        <div className="w-1 h-1 rounded-full bg-border" />
                                                        <StatusBadge status={task.status} />
                                                    </div>
                                                </div>
                                                {isOverdue && <Badge variant="destructive" className="h-4 text-[7px] font-bold">OVERDUE</Badge>}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-10 flex flex-col items-center text-center">
                                        <div className="relative w-20 h-20 mb-4">
                                            <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-75" />
                                            <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                                <CheckCircle2 className="text-primary" size={32} strokeWidth={1.8} />
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground mb-1">All caught up!</p>
                                        <p className="text-xs text-muted-foreground mb-4">You have no tasks scheduled for today.</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[11px] font-semibold"
                                            onClick={() => onNavigate('weekly')}
                                        >
                                            <Plus size={12} className="mr-1" /> Plan a task
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 3. My Activities & 6. Personal Alerts */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Personal Alerts (Smart Feature) */}
                            {stats.personalAlerts.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {stats.personalAlerts.map((alert, i) => (
                                        <div key={i}
                                            onClick={() => {
                                                const lower = alert.toLowerCase();
                                                if (lower.includes('procurement')) onNavigate('procurement');
                                                else if (lower.includes('loan')) onNavigate('asset-loan');
                                                else onNavigate('activities');
                                            }}
                                            className="p-4 bg-destructive/5 hover:bg-destructive/10 border border-destructive/10 rounded-xl flex items-center gap-3 animate-in fade-in duration-500 cursor-pointer transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                                                <Info size={16} />
                                            </div>
                                            <span className="text-xs font-semibold uppercase tracking-tight text-destructive">{alert}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* My Activities (Activity Logs) */}
                                <Card className="rounded-xl border-border">
                                    <CardHeader className="p-6 pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-semibold">Assigned to Me</CardTitle>
                                            <Button variant="link" size="sm" className="text-[10px] font-bold uppercase tracking-wider text-primary" onClick={() => onNavigate('weekly')}>View All</Button>
                                        </div>
                                    </CardHeader>
                                    <div className="px-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent border-b border-border/50">
                                                    <TableHead className="pl-6 h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</TableHead>
                                                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</TableHead>
                                                    <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due</TableHead>
                                                    <TableHead className="text-right pr-6 h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {listData.myActivities.map((act) => (
                                                    <TableRow key={act.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                                                        <TableCell className="pl-6 py-2.5 text-sm font-medium">{act.activity_name || act.category}</TableCell>
                                                        <TableCell className="py-2.5">
                                                            <span className={`text-[11px] font-medium ${act.priority === 'High' ? 'text-destructive' : 'text-muted-foreground'}`}>{act.priority || 'Medium'}</span>
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-[11px] text-muted-foreground font-medium">{act.due_date || '-'}</TableCell>
                                                        <TableCell className="text-right pr-6 py-2.5"><StatusBadge status={act.status} /></TableCell>
                                                    </TableRow>
                                                ))}
                                                {listData.myActivities.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-32 text-center">
                                                            <p className="text-[11px] font-medium text-muted-foreground">No activities assigned</p>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>

                                {/* 4. My Procurement Requests */}
                                <Card className="rounded-xl border-border">
                                    <CardHeader className="p-6 pb-2">
                                        <CardTitle className="text-base font-semibold">Procurement</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-4">
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: 'Pending', val: stats.procurementStats.pending, color: 'text-amber-500' },
                                                { label: 'Approved', val: stats.procurementStats.approved, color: 'text-emerald-500' },
                                                { label: 'Rejected', val: stats.procurementStats.rejected, color: 'text-destructive' },
                                            ].map((st, i) => (
                                                <div key={i} className="text-center p-3 bg-muted/40 rounded-xl border border-border/50">
                                                    <p className={`text-xl font-bold ${st.color}`}>{st.val}</p>
                                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{st.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-5 bg-primary rounded-xl text-primary-foreground relative overflow-hidden group">
                                            <p className="text-[10px] uppercase font-semibold tracking-wider opacity-90">Estimated Budget</p>
                                            <h3 className="text-2xl font-bold tracking-tight mt-0.5">{formatCurrency(stats.procurementStats.totalBudget)}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <GmailWidget language={language} t={t} />
                        </div>

                        {/* 5. My Borrowed Assets */}
                        <Card className="lg:col-span-12 rounded-xl border-border overflow-hidden bg-card">
                            <CardHeader className="px-6 py-3 border-b border-border/50 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold">Personal Inventory</CardTitle>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase mt-0.5">Equipment in your possession</p>
                                </div>
                                <Box className="text-primary/30" size={24} />
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b border-border/50">
                                            <TableHead className="pl-6 h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Asset Name</TableHead>
                                            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Serial / ID</TableHead>
                                            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                                            <TableHead className="text-right pr-6 h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {listData.myBorrowedAssets.map((asset) => {
                                            const assetDueDate = asset.due_date ? new Date(asset.due_date) : null;
                                            const isNearDue = assetDueDate && (assetDueDate.getTime() - new Date().getTime()) < 3 * 24 * 3600 * 1000;
                                            return (
                                                <TableRow key={asset.id} className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${isNearDue ? 'bg-destructive/5' : ''}`}>
                                                    <TableCell className="pl-6 py-2.5 text-sm font-medium">{asset.item_name}</TableCell>
                                                    <TableCell className="py-2.5 text-[11px] text-muted-foreground font-medium">{asset.serial_number || '-'}</TableCell>
                                                    <TableCell className={`py-2.5 text-[11px] font-medium ${isNearDue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                        {asset.due_date ? new Date(asset.due_date).toLocaleDateString() : '-'}
                                                        {isNearDue && <span className="ml-1.5 text-destructive text-[10px] font-semibold">!</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-2.5"><StatusBadge status={asset.status} /></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {listData.myBorrowedAssets.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center">
                                                    <p className="text-[11px] font-medium text-muted-foreground">No borrowed assets</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                /* 🏢 CONTROL TOWER (ORGANIZATION) */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    
                    {/* --- [NEW] MAJOR ALERTS FOR ADMINS --- */}
                    {(stats.totalOverdueOrg > 0 || stats.totalOpenTickets > 0) && (
                        <div className="flex flex-col md:flex-row gap-4 mb-2">
                            {stats.totalOverdueOrg > 0 && (
                                <div 
                                    onClick={() => onNavigate('asset-loan')}
                                    className="w-full md:w-auto pr-6 bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-destructive/15 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center text-destructive-foreground">
                                            <Shield size={16} className="animate-pulse" />
                                        </div>
                                        <div className="mr-8">
                                            <h4 className="text-xs font-bold text-destructive leading-none mb-1">Aset Terlambat!</h4>
                                            <p className="text-[11px] font-medium text-destructive/80">{stats.totalOverdueOrg} barang belum dikembalikan.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-destructive opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                            )}

                            {stats.totalOpenTickets > 0 && (
                                <div 
                                    onClick={() => onNavigate('helpdesk')}
                                    className="w-full md:w-auto pr-6 bg-zinc-500/10 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-zinc-500/15 dark:hover:bg-zinc-800/50 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 flex items-center justify-center">
                                            <MessageSquare size={16} />
                                        </div>
                                        <div className="mr-8">
                                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1">Tiket Masuk!</h4>
                                            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{stats.totalOpenTickets} tiket baru butuh balasan.</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-zinc-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* 1. Summary Cards (Global KPI) — Linear style */}
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="flex-1 border border-border/60 bg-card rounded-xl p-5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">This Month Spending</p>
                            <p className="text-3xl font-bold tracking-tight text-foreground">{formatCurrency(stats.totalPurchaseThisMonth)}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Financial summary</p>
                        </div>
                        <div className="flex flex-1 gap-3">
                            {[
                                { label: 'Activities', value: stats.totalActiveActivities, sub: 'In progress' },
                                { label: 'Procurement', value: stats.pendingProcurement, sub: 'To review' },
                                { label: 'Inventory', value: stats.totalITAssets, sub: 'Items' },
                                { label: 'Loans', value: stats.activeAssetLoans, sub: 'Out' },
                            ].map(item => (
                                <div key={item.label} className="flex-1 border border-border/60 bg-card rounded-xl p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{item.label}</p>
                                    <p className="text-xl font-bold tracking-tight text-foreground mt-1">{item.value}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border border-border/60 bg-card rounded-xl p-4 flex items-center gap-3 min-w-[180px]">
                            <p className="text-2xl font-bold text-foreground">{stats.taskCompletionRate}</p>
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground">Efficiency</p>
                                <p className="text-[10px] text-muted-foreground/70">Rate</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Purchase Record Summary */}
                    <Card className="rounded-xl border-border overflow-hidden bg-card">
                        <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Wallet size={16} />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold">Purchase Record</CardTitle>
                                    <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Financial Summary</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[9px] font-bold uppercase tracking-wider text-primary" onClick={() => onNavigate('procurement')}>
                                View All <ChevronRight size={10} className="ml-1" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Disbursed</p>
                                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(stats.purchaseSummary.totalDisbursed)}</p>
                                </div>
                                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Liability</p>
                                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 tracking-tight">{formatCurrency(stats.purchaseSummary.totalLiability)}</p>
                                </div>
                                <div className="p-3 bg-zinc-500/5 border border-slate-200 dark:border-zinc-800 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Volume</p>
                                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{formatCurrency(stats.purchaseSummary.totalDisbursed + stats.purchaseSummary.totalLiability)}</p>
                                </div>
                                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-center">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Records</p>
                                    <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{stats.purchaseSummary.totalRecords}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag size={11} className="text-indigo-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Top Categories</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {stats.purchaseSummary.topCategories.map((cat) => (
                                            <div key={cat.name} className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground uppercase">
                                                <span>{cat.name}</span>
                                                <span className="text-foreground font-bold">{formatCurrency(cat.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Briefcase size={11} className="text-emerald-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Department Spend</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {stats.purchaseSummary.topDepartments.map((dept) => (
                                            <div key={dept.name} className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground uppercase">
                                                <span>{dept.name}</span>
                                                <span className="text-foreground font-bold">{formatCurrency(dept.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Support Dynamics & Support Rating */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <Card className="lg:col-span-8 rounded-xl border-border overflow-hidden bg-card">
                            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold uppercase tracking-tight">Support Dynamics</CardTitle>
                                    <p className="text-[9px] font-medium text-muted-foreground uppercase">Resolution Velocity</p>
                                </div>
                                <Select defaultValue="last7days">
                                    <SelectTrigger className="w-[120px] rounded-lg bg-muted/40 border-border/50 font-bold uppercase text-[9px] tracking-wider h-8">
                                        <SelectValue placeholder="Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="last7days">Last 7 Days</SelectItem>
                                        <SelectItem value="monthly">This Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent className="p-5 h-[280px]">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 280 }}>
                                    <AreaChart data={performanceData}>
                                        <defs>
                                            <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="[&_line]:stroke-border" strokeOpacity={0.1} />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} />
                                        <ReTooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'hsl(var(--card))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorOpen)" name="New Tickets" />
                                        <Area type="monotone" dataKey="value2" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-4 rounded-xl border-border overflow-hidden bg-primary/5 flex flex-col items-center justify-between p-7 relative isolate h-full">
                            <div className="flex-none mb-6 text-center">
                                <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground mb-1">{t('ticketingAnalytics')}</h4>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('itServicePerformance')}</p>
                            </div>

                            <div className="w-full flex-1 flex flex-col justify-center mb-6">
                                <div className="flex justify-between items-center px-2">
                                    <div className="flex flex-col items-center gap-1.5 w-1/2 border-r border-border/60">
                                        <div className="bg-rose-500/10 p-2.5 rounded-full mb-1">
                                            <Clock size={16} className="text-rose-500" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[24px] font-black text-foreground leading-none">{stats.supportSLA}h</span>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">{t('avgSla')}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5 w-1/2">
                                        <div className="bg-amber-500/10 p-2.5 rounded-full mb-1 flex items-center justify-center gap-0.5">
                                            <Star size={16} className="text-amber-500 fill-amber-500" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[24px] font-black text-foreground leading-none flex items-baseline gap-1">
                                            {stats.supportRating} <span className="text-[12px] text-muted-foreground/50">/ 5</span>
                                        </span>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center">{t('userRating')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full font-sans mb-5 z-10">
                                <div className="flex items-center gap-2 mb-3 px-1 border-b border-border/50 pb-2">
                                    <Target size={12} className="text-primary" />
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-foreground">{t('topHandlers')}</h5>
                                </div>
                                <div className="space-y-2.5">
                                    {stats.topHandlers.map((handler, i) => (
                                        <div key={i} className="flex justify-between items-center bg-card/40 border border-border/40 p-2 rounded-lg backdrop-blur-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                                                    {handler.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-semibold text-foreground">{handler.name}</span>
                                            </div>
                                            <Badge variant={handler.count > 0 ? 'default' : 'outline'} className={`text-[9px] h-5 opacity-80 ${handler.count === 0 ? 'border-primary/20 text-muted-foreground bg-primary/5' : 'bg-primary/20 text-primary'}`}>
                                                {handler.count} {t('activeTickets')}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full bg-card/80 backdrop-blur-md border border-border/50 rounded-lg p-3 flex flex-col flex-none relative z-10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-bold uppercase text-foreground/70">{t('serviceHealth')}</span>
                                    <span className="text-[9px] font-black text-zinc-900 bg-zinc-500/10 dark:text-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                                        {Number(stats.supportRating) >= 4 ? t('excellent') : t('good')}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                    <div className="h-full bg-zinc-400 dark:bg-zinc-300 rounded-full transition-all duration-1000" style={{ width: `${Math.min((Number(stats.supportRating) / 5) * 100, 100)}%` }} />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* 4. Activity & Inventory Side-by-Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* PLATFORM ACTIVITY (GitHub Style) */}
                        <Card className="lg:col-span-8 rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
                            <CardContent className="p-6 md:p-8 flex flex-col gap-8">
                                <div className="w-full overflow-x-auto pb-4 pr-4 no-scrollbar">
                                    <div className="flex items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-2">
                                            <Activity size={16} strokeWidth={2.5} className="text-emerald-400 dark:text-emerald-500" />
                                            <h3 className="text-[13px] font-black tracking-wider uppercase text-foreground">Platform Activity</h3>
                                        </div>
                                        <Select value={activityYear} onValueChange={setActivityYear}>
                                            <SelectTrigger className="w-[130px] h-8 text-[10px] font-bold uppercase tracking-wider bg-transparent border-border/50 focus:ring-emerald-500/50">
                                                <SelectValue placeholder="Select Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="last_12M">Last 12 Months</SelectItem>
                                                <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                                                <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                                                <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="min-w-max">
                                        {(() => {
                                            const today = new Date();
                                            let startDate: Date;
                                            let endDate: Date;
                                            let totalWeeks = 0;

                                            if (activityYear === 'last_12M') {
                                                totalWeeks = 52;
                                                startDate = new Date(today);
                                                startDate.setDate(today.getDate() - (totalWeeks * 7));
                                                startDate.setDate(startDate.getDate() - startDate.getDay());
                                                endDate = new Date(today);
                                            } else {
                                                const year = parseInt(activityYear);
                                                startDate = new Date(year, 0, 1);
                                                startDate.setDate(startDate.getDate() - startDate.getDay()); // Go back to Sunday
                                                endDate = new Date(year, 11, 31);
                                                const msDiff = endDate.getTime() - startDate.getTime();
                                                totalWeeks = Math.ceil(msDiff / (1000 * 60 * 60 * 24 * 7)) + 1;
                                            }

                                            const weeks: any[] = [];
                                            let monthLabels: { label: string; offset: number }[] = [];
                                            let currentMonth = -1;

                                            for (let w = 0; w < totalWeeks; w++) {
                                                const week: any[] = [];
                                                const weekDate = new Date(startDate);
                                                weekDate.setDate(startDate.getDate() + (w * 7));

                                                const labelDate = new Date(weekDate);
                                                labelDate.setDate(weekDate.getDate() + 3);

                                                if (labelDate.getMonth() !== currentMonth) {
                                                    currentMonth = labelDate.getMonth();
                                                    monthLabels.push({
                                                        label: labelDate.toLocaleDateString('en-US', { month: 'short' }),
                                                        offset: w
                                                    });
                                                }

                                                for (let d = 1; d <= 5; d++) {
                                                    const dayDate = new Date(weekDate);
                                                    dayDate.setDate(weekDate.getDate() + d);
                                                    const key = dayDate.toISOString().split('T')[0];
                                                    week.push({ count: stats.activityHeatmap[key] || 0, date: key });
                                                }
                                                weeks.push(week);
                                            }

                                            monthLabels = monthLabels.filter((m, i, arr) => {
                                                if (i === 0 && arr.length > 1 && arr[1].offset - m.offset < 3) return false;
                                                return true;
                                            });

                                            return (
                                                <div className="flex flex-col select-none">
                                                    {/* Month Labels */}
                                                    <div className="flex relative h-5 mb-2">
                                                        {monthLabels.map((m, i) => (
                                                            <span key={i} className="absolute text-[11px] font-medium text-muted-foreground/50" style={{ left: `${m.offset * 16}px` }}> {/* ~16px per column */}
                                                                {m.label}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {/* Day Labels - Only Mon, Wed, Fri */}
                                                        <div className="flex flex-col h-[76px] justify-between text-[9px] font-bold text-muted-foreground/40 uppercase">
                                                            <span className="h-[12px] flex items-center pr-1">Mon</span>
                                                            <span className="h-[12px] flex items-center pr-1">Wed</span>
                                                            <span className="h-[12px] flex items-center pr-1">Fri</span>
                                                        </div>

                                                        {/* Grid */}
                                                        <div className="flex gap-[4px]">
                                                            {weeks.map((week, wIdx) => (
                                                                <div key={wIdx} className="flex flex-col gap-[4px]">
                                                                    {week.map((day: any, dIdx: number) => {
                                                                        const val = day.count;
                                                                        const colorClass = val === 0 ? 'bg-slate-200/70 dark:bg-zinc-800'
                                                                            : val < 3 ? 'bg-[#9be9a8] dark:bg-emerald-900/60'
                                                                                : val < 6 ? 'bg-[#40c463] dark:bg-emerald-600'
                                                                                    : val < 10 ? 'bg-[#30a14e] dark:bg-emerald-500'
                                                                                        : 'bg-[#216e39] dark:bg-emerald-400';
                                                                        return (
                                                                            <div
                                                                                key={dIdx}
                                                                                title={`${val} activities on ${day.date}`}
                                                                                className={`w-[12px] h-[12px] rounded-[3px] transition-all duration-200 ${colorClass} hover:scale-150 relative z-0 hover:z-10 hover:ring-2 hover:ring-emerald-400/50 hover:shadow-md cursor-pointer`}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Footer Options */}
                                                    <div className="flex items-center justify-between mt-4">
                                                        <span className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-help italic">
                                                            Learn how we count contributions
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-muted-foreground/50">Less</span>
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-slate-200/70 dark:bg-zinc-800" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#9be9a8] dark:bg-emerald-900/60" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#40c463] dark:bg-emerald-600" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#30a14e] dark:bg-emerald-500" />
                                                            <div className="w-[11px] h-[11px] rounded-[2px] bg-[#216e39] dark:bg-emerald-400" />
                                                            <span className="text-[10px] text-muted-foreground/50">More</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="w-full flex flex-col justify-start pt-6 border-t border-border/40">
                                    <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">Recent Logs</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3.5">
                                        {listData.orgActivities.slice(0, 6).map((act, i) => (
                                            <div key={i} className="flex gap-2.5 items-start px-1 group cursor-pointer">
                                                <div className="w-1.5 h-1.5 rounded-sm bg-emerald-400 mt-1 shrink-0 group-hover:bg-emerald-500 transition-colors" />
                                                <p className="text-[9.5px] font-bold text-foreground/80 leading-snug uppercase pt-0.5 group-hover:text-foreground transition-colors line-clamp-2">
                                                    {act.activity_name || act.category}
                                                </p>
                                            </div>
                                        ))}
                                        {listData.orgActivities.length === 0 && (
                                            <p className="text-[10px] text-muted-foreground italic">No recent logs.</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* INVENTORY CHART */}
                        <Card className="lg:col-span-4 rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex flex-col">
                            <CardHeader className="p-6 md:p-8 pb-0 border-none">
                                <CardTitle className="text-[13px] font-black tracking-wider uppercase text-foreground">Inventory</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center">
                                {/* The Pie Chart */}
                                <div className="w-full h-44 relative mb-6">
                                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 200, height: 176 }}>
                                        <PieChart>
                                            <ReTooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'hsl(var(--card))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                                            <Pie
                                                data={Object.entries(stats.assetBreakdown.categories).map(([name, value], idx) => ({ name, value, color: ['#3b82f6', '#10b981', '#111827', '#f59e0b', '#8b5cf6', '#ef4444'][idx % 6] }))}
                                                innerRadius={65} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none"
                                            >
                                                {Object.entries(stats.assetBreakdown.categories).map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#111827', '#f59e0b', '#8b5cf6', '#ef4444'][index % 6]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                                        <span className="text-3xl font-black text-foreground tracking-tight leading-none">{stats.totalITAssets}</span>
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total</span>
                                    </div>
                                </div>

                                {/* Custom Legend Grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-5 w-full max-w-[200px] mt-auto">
                                    {Object.entries(stats.assetBreakdown.categories).slice(0, 4).map(([name, value], idx) => (
                                        <div key={name} className="flex gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[5px]" style={{ backgroundColor: ['#3b82f6', '#10b981', '#111827', '#f59e0b'][idx % 4] }} />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black leading-none text-foreground">{value as number}</span>
                                                <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground mt-1 truncate max-w-[70px]">{name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 5. Recent Projects Table */}
                    <Card className="rounded-xl border-border overflow-hidden bg-card">
                        <CardHeader className="p-5 border-b border-border/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-tight">Project Initiatives</CardTitle>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                    <Input
                                        placeholder="Search projects..."
                                        className="h-8 w-[200px] pl-8 text-[10px] rounded-lg bg-muted/40 border-border/50 font-medium"
                                        value={projectSearch}
                                        onChange={(e) => setProjectSearch(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="sm" className=".5 border-border/50 text-muted-foreground">
                                    <RefreshCcw size={12} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-border/50">
                                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-9 w-[250px]">Project</TableHead>
                                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-9">Department</TableHead>
                                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-9">Status</TableHead>
                                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-9">Progress</TableHead>
                                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-9 text-right">Priority</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProjects.length > 0 ? paginatedProjects.map((item, idx) => (
                                        <TableRow key={item.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium truncate">{item.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">PJ-{2000 + item.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-[11px] text-muted-foreground font-medium">{item.department || 'General'}</TableCell>
                                            <TableCell className="py-2.5">
                                                <StatusBadge status={item.status} />
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2 w-24">
                                                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${item.progress === 100 ? 'bg-emerald-500' : 'bg-foreground/30'}`} />
                                                    </div>
                                                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{item.progress}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right py-2.5">
                                                <span className={`text-[11px] font-medium ${item.priority === 'High' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                    {item.priority || 'Normal'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                                No projects found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <div className="p-4 border-t border-border/50 flex items-center justify-between">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Showing {paginatedProjects.length} of {filteredProjects.length} initiatives</p>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="sm" className="w-7 border-border/50" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}><ChevronRight size={12} className="rotate-180" /></Button>
                                    <Button variant="outline" size="sm" className="w-7 bg-primary/10 border-primary/20 text-primary font-bold text-[10px]">{currentPage}</Button>
                                    <Button variant="outline" size="sm" className="w-7 border-border/50" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}><ChevronRight size={12} /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            
        </div>
    </>
    );
};

