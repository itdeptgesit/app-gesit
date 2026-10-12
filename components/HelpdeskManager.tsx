'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sendNotificationToAdmins, sendNotificationToUser } from '../utils/NotificationSystemUtils';
import { sendTicketNotificationEmail } from '../utils/EmailSystemUtils';
import { UserAccount } from '../types';
import { useLanguage } from '../translations';
import {
    Search, RefreshCcw, CheckCircle2, Clock, AlertCircle, MessageSquare, X, Loader2, Send, ClipboardList,
    User, Building2, PauseCircle, Lock, Unlock, MessageCircle, ChevronLeft, ChevronRight, ChevronDown, CircleDot, RotateCcw,
    Image as ImageIcon, Smile, Paperclip, Globe, Zap, Hash, PlusCircle, LifeBuoy, Check, CheckCheck,
    ArrowLeft, ArrowRight, ShieldCheck, CloudUpload, Phone, Info, FileText, File, ExternalLink, Star, Download, Inbox, Shield,
    Share2, MoreHorizontal, Link, Archive, Plus, Bell, Moon, Sun, LogOut, Settings, Trash2, Folder, FolderOpen,
    Bold, Italic, List, Code, Quote, Megaphone, Radio, BarChart2
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from './StatCard';
import { UserAvatar } from './UserAvatar';
import { DangerConfirmModal } from './DangerConfirmModal';
import { FluentEmoji } from '@lobehub/fluent-emoji';
import { FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';

// SHADCN UI IMPORTS
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface HelpdeskManagerProps {
    currentUser: UserAccount | null;
    onLogout?: () => void;
    onNavigate?: (page: string) => void;
}

export const HelpdeskManager: React.FC<HelpdeskManagerProps> = ({ currentUser, onLogout, onNavigate }) => {
    const { language, setLanguage, t } = useLanguage();
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [resolutionNote, setResolutionNote] = useState('');
    const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isSolveConfirmOpen, setIsSolveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [isInternal, setIsInternal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiTriggerRef = useRef<HTMLButtonElement>(null);
    const [detailTab, setDetailTab] = useState<'chat' | 'info' | 'details'>('chat');
    const [itStaff, setItStaff] = useState<{ name: string; email: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const role = currentUser?.role?.toLowerCase() || '';
    const groups = currentUser?.groups || [];
    const SUPPORT_GROUPS = ['it', 'it_staff', 'it_management', 'support', 'admin'];
    const isAdmin = (role === 'super admin' || role === 'super_admin') ||
        groups.some(g => SUPPORT_GROUPS.includes(g.toLowerCase()));

    // Profile Dropdown state
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        if (onLogout) {
            onLogout();
        } else {
            await supabase.auth.signOut();
            window.location.reload();
        }
    };

    // Simplified Mechanism: Support = IT Admin roles or IT group members or specifically authorized by Admin.
    // Requesters = Everyone else (Staff & User roles).
    const isSupport = isAdmin;

    // Client-side UI states from HelpdeskPublic
    const [viewMode, setViewMode] = useState<'list' | 'form' | 'success' | 'detail' | 'archive'>(isSupport ? 'list' : 'form');
    const [archivePage, setArchivePage] = useState(1);
    const ARCHIVE_PER_PAGE = 5;
    const [recentFilter, setRecentFilter] = useState<'Progress' | 'Resolved'>('Progress');
    const [supportFilter, setSupportFilter] = useState<'all' | 'assigned' | 'mine'>('all');
    const [userRoles, setUserRoles] = useState<Record<string, string>>({});
    const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
    const [isManagementMode, setIsManagementMode] = useState(isSupport);
    const [managementTab, setManagementTab] = useState<'queue' | 'analytics'>('queue');
    const [showMobileDetails, setShowMobileDetails] = useState(false);

    useEffect(() => {
        const fetchAvatars = async () => {
            try {
                const { data } = await supabase.from('user_accounts').select('full_name, avatar_url');
                if (data) {
                    const map: Record<string, string> = {};
                    data.forEach((u: any) => { if (u.avatar_url) map[u.full_name] = u.avatar_url; });
                    setUserAvatars(map);
                }
            } catch (e) { }
        };
        fetchAvatars();
    }, []);

    // Sync isManagementMode with isSupport when it changes, but allow manual toggle
    useEffect(() => {
        setIsManagementMode(isSupport);
    }, [isSupport]);


    // Fetch User Roles for display differentiation
    useEffect(() => {
        const fetchUserRoles = async () => {
            try {
                const { data } = await supabase.from('user_accounts').select('email, role');
                if (data) {
                    const mapping: Record<string, string> = {};
                    data.forEach(u => {
                        if (u.email) mapping[u.email.toLowerCase()] = u.role;
                    });
                    setUserRoles(mapping);
                }
            } catch (err) {
                console.warn("Failed to fetch user roles mapping", err);
            }
        };
        if (isSupport) fetchUserRoles();
    }, [isSupport]);

    // Fetch IT Staff for assignment dropdown
    useEffect(() => {
        const fetchItStaff = async () => {
            try {
                // Fetch users who are IT admins/staff, in IT/Support groups, OR marked as Helpdesk Support
                const { data } = await supabase
                    .from('user_accounts')
                    .select('full_name, email, groups, role');

                if (data) {
                    const authorizedStaff = data.filter(u =>
                        (u.role?.toLowerCase() === 'super admin' || u.role?.toLowerCase() === 'super_admin') ||
                        (u.groups && u.groups.some((g: string) => SUPPORT_GROUPS.includes(g.toLowerCase())))
                    );
                    setItStaff(authorizedStaff.map((u: any) => ({ name: u.full_name || u.email, email: u.email })));
                }
            } catch (err) {
                console.warn('Failed to fetch IT staff', err);
            }
        };
        if (isSupport) fetchItStaff();
    }, [isSupport]);

    const [lastCreatedTicketId, setLastCreatedTicketId] = useState('');
    const [departments, setDepartments] = useState<string[]>([]);
    const [newTicketData, setNewTicketData] = useState({
        subject: '',
        description: '',
        priority: 'Medium' as any,           // Ditentukan oleh Tim IT saat menangani tiket
        department: ((currentUser?.department as string) || 'General'),  // Diambil otomatis dari profil user
        attachments: [] as { url: string; name: string; type: string }[]
    });
    const newTicketFileInputRef = useRef<HTMLInputElement>(null);
    const newTicketDescriptionRef = useRef<HTMLTextAreaElement>(null);
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [infoModal, setInfoModal] = useState<{ title: string; content: string; icon: any } | null>(null);

    const applyFormatting = (textarea: HTMLTextAreaElement, type: string, value: string, setter: (val: string) => void) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selection = textarea.value.substring(start, end);
        let replacement = '';
        let cursorOffset = 0;

        switch (type) {
            case 'bold':
                if (selection.startsWith('**') && selection.endsWith('**')) {
                    replacement = selection.slice(2, -2);
                    cursorOffset = 0;
                } else {
                    replacement = `**${selection || 'text'}**`;
                    cursorOffset = 2;
                }
                break;
            case 'italic':
                if (selection.startsWith('*') && selection.endsWith('*')) {
                    replacement = selection.slice(1, -1);
                    cursorOffset = 0;
                } else {
                    replacement = `*${selection || 'text'}*`;
                    cursorOffset = 1;
                }
                break;
            case 'link': replacement = `[${selection || 'label'}](url)`; cursorOffset = 1; break;
            case 'list': replacement = `\n- ${selection || 'item'}`; break;
            case 'code': replacement = `\`\`\`\n${selection || 'code'}\n\`\`\``; break;
            default: return;
        }

        const newValue = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        setter(newValue);

        setTimeout(() => {
            textarea.focus();
            if (selection) {
                textarea.setSelectionRange(start, start + replacement.length);
            } else {
                textarea.setSelectionRange(start + cursorOffset, start + replacement.length - cursorOffset);
            }
        }, 0);
    };

    const applyNewTicketFormatting = (type: string) => {
        const textarea = newTicketDescriptionRef.current;
        if (!textarea) return;

        if (type === 'image' || type === 'file') {
            newTicketFileInputRef.current?.click();
            return;
        }

        applyFormatting(textarea, type, newTicketData.description, (val) =>
            setNewTicketData(prev => ({ ...prev, description: val }))
        );
    };

    // Feedback State
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');

    // Reset feedback state when ticket changes
    useEffect(() => {
        setFeedbackRating(0);
        setFeedbackComment('');
    }, [selectedTicket?.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const EMOJI_CATEGORIES = [
        {
            name: 'Smileys',
            icon: <Smile size={16} />,
            emojis: [
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '?', '??', '??', '?', '??', '??', '??', '??', '??'
            ]
        },
        {
            name: 'Nature',
            icon: <Globe size={16} />,
            emojis: [
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??'
            ]
        },
        {
            name: 'Tech',
            icon: <Zap size={16} />,
            emojis: [
                '??', '??', '??', '??', '??', '??', '??', '?', '???', '??',
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '??', '??', '???', '???', '???', '???', '???', '???', '??',
                '??', '??', '??', '???', '??', '??', '??', '??', '???', '???'
            ]
        },
        {
            name: 'Symbols',
            icon: <Hash size={16} />,
            emojis: [
                '?', '?', '??', '?', '??', '?', '?', '??', '??', '??',
                '??', '??', '??', '??', '??', '??', '??', '??', '??', '??',
                '??', '??', '???', '??', '???', '??', '??', '??', '??', '??',
                '??', '?', '?', '??', '?', '?', '?', '?', '?'

            ]
        }
    ];

    const MessageContent = ({ text }: { text: string }) => {
        if (!text) return null;

        // Regex for bold (**), italic (*), and emojis
        const combinedRegex = /(\*\*.*?\*\*|\*.*?\*|[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}])/gu;
        const parts = text.split(combinedRegex);

        const emojiOnlyRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\s]+$/u;
        const isBigEmoji = text.length <= 6 && emojiOnlyRegex.test(text.trim());

        return (
            <span className={cn("whitespace-pre-wrap leading-relaxed", isBigEmoji && "text-4xl block my-2")}>
                {parts.map((part, i) => {
                    if (!part) return null;

                    // Bold
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
                    }
                    // Italic
                    if (part.startsWith('*') && part.endsWith('*')) {
                        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
                    }
                    // Emoji
                    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
                    if (part.length <= 4 && emojiRegex.test(part)) {
                        return (
                            <FluentEmoji
                                key={i}
                                emoji={part}
                                size={isBigEmoji ? 48 : 20}
                                className={isBigEmoji ? "inline-block transform transition-transform hover:scale-110" : "inline-block align-middle transform translate-y-[-1px] mx-0.5"}
                            />
                        );
                    }
                    // Plain text
                    return <React.Fragment key={i}>{part}</React.Fragment>;
                })}
            </span>
        );
    };

    const EmojiRenderer = ({ text }: { text: string }) => {
        return <MessageContent text={text} />;
    };

    const RichContentRenderer = ({ text, attachments = [], isSelf = false }: { text: string; attachments?: string[]; isSelf?: boolean }) => {
        if (!text && (!attachments || attachments.length === 0)) return null;

        const lines = text ? text.split('\n') : [];

        // Track URLs already rendered via markdown to avoid duplicates
        const renderedUrls = new Set<string>();
        if (text) {
            const matches = text.match(/\((https?:\/\/.*?)\)/g);
            if (matches) {
                matches.forEach(m => renderedUrls.add(m.slice(1, -1)));
            }
        }

        const filteredLines = lines.filter(line => !line.includes('[Resolved on:'));

        return (
            <div className="space-y-1">
                {filteredLines.map((line, idx) => {
                    const imageMatch = line.match(/!\[image\]\((.*?)\)/);
                    const fileMatch = line.match(/\[Attached (File|PDF)\]\((.*?)\)/);

                    const isUrlPdf = (url: string) =>
                        url.toLowerCase().includes('.pdf') ||
                        url.toLowerCase().includes('raw/upload') ||
                        url.toLowerCase().includes('resource_type:raw');

                    if (imageMatch && !isUrlPdf(imageMatch[1])) {
                        const imageUrl = imageMatch[1];
                        return (
                            <div key={idx} onClick={() => setPreviewImage(imageUrl)} className="block cursor-zoom-in group/img relative overflow-hidden rounded-xl border border-black/5 dark:border-white/5 mt-2 transition-transform active:scale-[0.98] w-full max-w-lg">
                                <img src={imageUrl} alt="Attachment" className="max-w-full max-h-[300px] object-contain bg-slate-100 dark:bg-zinc-800 rounded-lg shadow-sm" loading="lazy" />
                            </div>
                        );
                    }
                    if (fileMatch || (imageMatch && isUrlPdf(imageMatch[1]))) {
                        const fileUrl = fileMatch ? fileMatch[2] : imageMatch![1];
                        const isPdf = (fileMatch && fileMatch[1] === 'PDF') || isUrlPdf(fileUrl);
                        return (
                            <div key={idx} onClick={() => isPdf ? setPreviewImage(fileUrl) : window.open(fileUrl, '_blank')} className={`flex items-center gap-3 p-3 rounded-xl mt-2 border transition-all cursor-pointer ${isSelf ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-zinc-800 border-slate-200/50 dark:border-zinc-700/50 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                <div className={`p-2 rounded-lg ${isSelf ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className={`text-xs font-bold truncate ${isSelf ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{isPdf ? 'Attached PDF' : 'Attached Document'}</p>
                                    <p className={`text-[10px] truncate ${isSelf ? 'text-white/70' : 'text-slate-500'}`}>Click to {isPdf ? 'preview' : 'view'}</p>
                                </div>
                                <ExternalLink size={14} className={isSelf ? 'text-white/60' : 'text-slate-400'} />
                            </div>
                        );
                    }
                    if (line.trim() === '' && lines.length > 1) return <div key={idx} className="h-1" />;
                    return <div key={idx} className="leading-relaxed"><EmojiRenderer text={line} /></div>;
                })}

                {/* Render explicit attachments if not already in text */}
                {attachments && attachments.filter(url => !renderedUrls.has(url)).map((url, i) => {
                    const isPdf = url.toLowerCase().includes('.pdf');
                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$|^data:image/i);

                    if (isImage && !isPdf) {
                        return (
                            <div key={`attr-${i}`} onClick={() => setPreviewImage(url)} className="block cursor-zoom-in group/img relative overflow-hidden rounded-xl border border-black/5 dark:border-white/5 mt-2 transition-transform active:scale-[0.98] w-full max-w-lg">
                                <img src={url} alt="Attachment" className="max-w-full max-h-[300px] object-contain bg-slate-100 dark:bg-zinc-800 rounded-lg shadow-sm" loading="lazy" />
                            </div>
                        );
                    }

                    return (
                        <div key={`attr-${i}`} onClick={() => isPdf ? setPreviewImage(url) : window.open(url, '_blank')} className={`flex items-center gap-3 p-3 rounded-xl mt-2 border transition-all cursor-pointer ${isSelf ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-zinc-800 border-slate-200/50 dark:border-zinc-700/50 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <div className={`p-2 rounded-lg ${isSelf ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                <FileText size={18} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className={`text-xs font-bold truncate ${isSelf ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{isPdf ? 'Attached PDF' : 'Attached Document'}</p>
                            </div>
                            <ExternalLink size={14} className={isSelf ? 'text-white/60' : 'text-slate-400'} />
                        </div>
                    );
                })}
            </div>
        );
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    };

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.error("Error playing sound:", e));
    };

    const sendBrowserNotification = (ticket: any) => {
        if (Notification.permission === 'granted') {
            new Notification('Gesit ERP - New Helpdesk Ticket', {
                body: `New request from ${ticket.requesterName}: ${ticket.subject}`,
                icon: '/logo.png'
            });
        }
    };

    const mapTicket = (t: any) => ({
        id: t.id,
        ticketId: t.ticket_id,
        requesterName: t.requester_name,
        requesterEmail: t.requester_email,
        requesterPhone: t.requester_phone,
        department: t.department,
        subject: t.subject,
        description: t.description,
        priority: t.priority,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        assignedTo: t.assigned_to,
        assignedToEmail: t.assigned_to_email,
        resolution: t.resolution,
        rating: t.rating,
        feedback: t.feedback,
        attachments: t.attachments || [],
        resolvedAt: t.resolved_at,
        respondedAt: t.responded_at
    });

    const fetchTickets = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            let query = supabase.from('helpdesk_tickets').select('*');

            // SECURITY: If not Support, only fetch their own tickets (Case-Insensitive)
            if (!isSupport) {
                if (currentUser?.email) {
                    query = query.ilike('requester_email', currentUser.email);
                } else {
                    // If profile not yet loaded and not IT staff, return empty to prevent leak
                    setTickets([]);
                    if (!silent) setIsLoading(false);
                    return;
                }
            }

            const { data, error } = await query.order('updated_at', { ascending: false });
            if (error) throw error;
            if (data) {
                setTickets(data.map(mapTicket));
            }
        } catch (err: any) {
            console.error("Fetch Tickets Error:", err);
            if (!silent) showToast(err.message, 'error');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const fetchMessages = async (ticketId: number) => {
        try {
            const { data, error } = await supabase
                .from('helpdesk_ticket_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });
            if (error) throw error;

            // Filter out internal messages for non-support staff
            const filteredMessages = isSupport
                ? data
                : (data || []).filter((m: any) => !m.is_internal);

            setMessages(filteredMessages || []);
        } catch (err: any) {
            console.error('Error fetching messages:', err);
        }
    };

    // Auto-refresh mechanism (Polling Fallback)
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchTickets(true);
        }, 5000); // 5 seconds

        return () => clearInterval(intervalId);
    }, [currentUser?.email, isSupport]);

    // Independent Auto-refresh for selected ticket messages
    useEffect(() => {
        if (!selectedTicket?.id) return;
        const intervalId = setInterval(() => {
            fetchMessages(selectedTicket.id);
        }, 5000); // 5 seconds

        return () => clearInterval(intervalId);
    }, [selectedTicket?.id, isSupport]);

    useEffect(() => {
        fetchTickets();

        const fetchDepts = async () => {
            const { data } = await supabase.from('departments').select('name').order('name');
            if (data) setDepartments(data.map(d => d.name));
        };
        fetchDepts();

        const fetchBroadcasts = async () => {
            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) {
                    console.warn("Using fallback broadcasts:", error.message);
                    setBroadcasts([
                        { id: 1, title: 'Maintenance', content: "Printer Lantai 27 sedang dalam perbaikan (Maintenace).", created_at: new Date().toISOString() },
                        { id: 2, title: 'Update', content: "Pembaruan sistem email pada pukul 17:00 WIB.", created_at: new Date(Date.now() - 86400000).toISOString() }
                    ]);
                    return;
                }

                if (data) setBroadcasts(data);
            } catch (err) {
                console.error("Broadcast fetch error:", err);
            }
        };
        fetchBroadcasts();

        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const channel = supabase
            .channel('helpdesk_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'helpdesk_tickets'
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newTicket = {
                        id: payload.new.id,
                        ticketId: payload.new.ticket_id,
                        requesterName: payload.new.requester_name,
                        requesterEmail: payload.new.requester_email,
                        requesterPhone: payload.new.requester_phone,
                        department: payload.new.department,
                        subject: payload.new.subject,
                        description: payload.new.description,
                        priority: payload.new.priority,
                        status: payload.new.status,
                        createdAt: payload.new.created_at,
                        updatedAt: payload.new.updated_at || payload.new.created_at,
                        assignedTo: payload.new.assigned_to,
                        assignedToEmail: payload.new.assigned_to_email,
                        resolution: payload.new.resolution,
                        rating: payload.new.rating,
                        feedback: payload.new.feedback
                    };
                    if (!isSupport && newTicket.requesterEmail?.toLowerCase() !== currentUser?.email?.toLowerCase()) return;
                    setTickets(prev => [newTicket, ...prev]);
                    showToast(`New Ticket: ${newTicket.subject}`, 'success');
                    playNotificationSound();
                    sendBrowserNotification(newTicket);
                } else if (payload.eventType === 'UPDATE') {
                    const updatedTicket = {
                        id: payload.new.id,
                        ticketId: payload.new.ticket_id,
                        requesterName: payload.new.requester_name,
                        requesterEmail: payload.new.requester_email,
                        requesterPhone: payload.new.requester_phone,
                        department: payload.new.department,
                        subject: payload.new.subject,
                        description: payload.new.description,
                        priority: payload.new.priority,
                        status: payload.new.status,
                        createdAt: payload.new.created_at,
                        updatedAt: payload.new.updated_at || payload.new.created_at,
                        assignedTo: payload.new.assigned_to,
                        assignedToEmail: payload.new.assigned_to_email,
                        resolution: payload.new.resolution,
                        rating: payload.new.rating,
                        feedback: payload.new.feedback
                    };

                    if (!isSupport && updatedTicket.requesterEmail?.toLowerCase() !== currentUser?.email?.toLowerCase()) {
                        setTickets(prev => prev.filter(t => t.id !== updatedTicket.id));
                        return;
                    }

                    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));

                    // Update selected ticket if it's the one being modified
                    setSelectedTicket(prev => {
                        if (prev && prev.id === updatedTicket.id) {
                            return updatedTicket;
                        }
                        return prev;
                    });
                } else if (payload.eventType === 'DELETE') {
                    setTickets(prev => prev.filter(t => String(t.id) !== String(payload.old.id)));
                    setSelectedTicket(prev => prev && String(prev.id) === String(payload.old.id) ? null : prev);
                    // Absolute safety: Fetch latest data to ensure UI is in sync
                    fetchTickets();
                }
            })
            .subscribe();

        const msgChannel = supabase
            .channel('global_messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'helpdesk_ticket_messages'
            }, (payload) => {
                // Only notify if message is from User and not from IT
                if (payload.new.sender_role === 'User') {
                    playNotificationSound();

                    // Fetch ticket subject for better notification
                    supabase.from('helpdesk_tickets')
                        .select('subject, requester_name')
                        .eq('id', payload.new.ticket_id)
                        .single()
                        .then(({ data }) => {
                            const body = data
                                ? `New message on ${data.subject} from ${data.requester_name}`
                                : `New message: ${payload.new.message.substring(0, 50)}...`;

                            if (Notification.permission === 'granted') {
                                new Notification('Gesit ERP - New Message', { body });
                            }
                        });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(msgChannel);
        };
    }, [currentUser?.email, isSupport]);

    useEffect(() => {
        if (selectedTicket) {
            // Always start with a clean input area for new messages
            setResolutionNote('');
            
            setFeedbackRating(selectedTicket.rating || 0);
            setFeedbackComment(selectedTicket.feedback || '');
            fetchMessages(selectedTicket.id);

            // Subscribe to new messages for this ticket
            const channel = supabase
                .channel(`ticket_messages_${selectedTicket.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'helpdesk_ticket_messages',
                    filter: `ticket_id=eq.${selectedTicket.id}`
                }, (payload) => {
                    setMessages(prev => [...prev, payload.new]);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setResolutionNote('');
            setMessages([]);
        }
    }, [selectedTicket?.id]);

    const performUpload = (file: File, resourceType: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dmr8bxdos';
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gesit_erp_preset';

            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);

            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.secure_url);
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error?.message || 'Upload failed'));
                    } catch (e) {
                        reject(new Error('Upload failed'));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
    };
    const uploadFileToChat = async (file: File) => {
        if (!selectedTicket) return;

        setIsUploading(true);
        const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dmr8bxdos';
        const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gesit_erp_preset';

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_preset', uploadPreset);

        // Determine resource type
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        const resourceType = isImage ? 'image' : 'raw';

        try {
            setUploadProgress(0);
            const publicUrl = await performUpload(file, resourceType);

            const senderRole = isSupport ? 'IT' : 'User';
            const { error: msgError } = await supabase.from('helpdesk_ticket_messages').insert([{
                ticket_id: selectedTicket.id,
                sender_name: currentUser?.fullName || 'IT Support',
                sender_role: senderRole,
                message: isImage ? `![image](${publicUrl})` : isPdf ? `[Attached PDF](${publicUrl})` : `[Attached File](${publicUrl})`
            }]);

            if (msgError) throw msgError;
            showToast("File uploaded successfully.");
        } catch (err: any) {
            console.error('Upload Error Details:', err);
            showToast(err.message || "Upload failed.", 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadFileToChat(file);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    await uploadFileToChat(file);
                    return;
                }
            }
        }
    };

    const addEmoji = (emoji: string) => {
        setResolutionNote(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            // High-Security Filter (Defense in Depth)
            if (!isSupport && t.requesterEmail?.toLowerCase() !== currentUser?.email?.toLowerCase()) {
                return false;
            }

            // Support Filter: All vs Assigned vs Mine (reported)
            if (isSupport) {
                if (supportFilter === 'assigned') {
                    if (t.assignedToEmail?.toLowerCase() !== currentUser?.email?.toLowerCase()) {
                        return false;
                    }
                } else if (supportFilter === 'mine') {
                    if (t.requesterEmail?.toLowerCase() !== currentUser?.email?.toLowerCase()) {
                        return false;
                    }
                }
            }

            const matchesSearch = (t.requesterName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.ticketId || '').toLowerCase().includes(searchTerm.toLowerCase());
            const isResolved = t.status === 'Resolved' || t.status === 'Closed';
            const matchesStatus = statusFilter === 'All' ? true
                : statusFilter === 'Open' ? !isResolved
                : t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tickets, searchTerm, statusFilter, isSupport, supportFilter, currentUser?.email]);

    const handleExportExcel = () => {
        if (filteredTickets.length === 0) return;

        const dataToExport = filteredTickets.map(t => ({
            "Ticket ID": t.ticketId,
            "Requester": t.requesterName,
            "Email": t.requesterEmail,
            "Phone": t.requesterPhone || "-",
            "Department": t.department,
            "Subject": t.subject,
            "Description": t.description,
            "Priority": t.priority,
            "Status": t.status,
            "Created At": t.createdAt || "-",
            "Assigned To": t.assignedTo || "Unassigned",
            "Resolution": t.resolution || "-"
        }));

        exportToExcel(dataToExport, `GESIT-HELPDESK-${new Date().toISOString().split('T')[0]}`);
    };

    // Pagination Logic
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const paginatedTickets = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTickets.slice(start, start + itemsPerPage);
    }, [filteredTickets, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
        setCurrentPage(1);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Resolved':
            case 'Closed':
                return <div className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase text-[8px]"><CheckCircle2 size={12} /> Solved</div>;
            case 'In Progress':
                return <div className="flex items-center gap-1.5 text-blue-500 font-bold uppercase text-[8px]"><Clock size={12} /> Process</div>;
            case 'Pending':
                return <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase text-[8px]"><PauseCircle size={12} /> Hold</div>;
            case 'Open':
                return <div className="flex items-center gap-1.5 text-rose-500 font-bold uppercase text-[8px]"><CircleDot size={12} className="animate-pulse" /> New</div>;
            default:
                return <span className="text-[8px] font-bold uppercase text-slate-400">{status}</span>;
        }
    };

    const isOwner = useMemo(() => {
        if (!selectedTicket || !currentUser) return false;
        if (!selectedTicket.assignedTo) return true;
        return selectedTicket.assignedTo === currentUser.fullName;
    }, [selectedTicket, currentUser]);

    const isSolved = useMemo(() => {
        const s = selectedTicket?.status;
        if (!s) return false;
        // If status is not one of the active ones, consider it solved/resolved
        return !['Open', 'In Progress', 'Pending', 'New', 'Process', 'Hold'].includes(s);
    }, [selectedTicket]);

    const isRequester = useMemo(() => {
        if (!selectedTicket || !currentUser) return false;
        return selectedTicket.requesterEmail?.toLowerCase() === currentUser.email?.toLowerCase();
    }, [selectedTicket, currentUser]);

    const handleSubmitFeedback = async () => {
        if (!selectedTicket || isActionLoading || feedbackRating === 0) return;
        setIsActionLoading(true);
        try {
            console.log(`[Feedback] Submitting for Ticket ID: ${selectedTicket.id}`, { rating: feedbackRating, feedback: feedbackComment });

            const { error, count } = await supabase
                .from('helpdesk_tickets')
                .update({
                    rating: feedbackRating,
                    feedback: feedbackComment,
                    updated_at: new Date().toISOString()
                }, { count: 'exact' })
                .eq('id', selectedTicket.id);

            if (error) throw error;
            if (count === 0) throw new Error("Update failed: Ticket not found or permission denied.");

            showToast(t('feedbackSuccess'), 'success');

            // Update local state immediately for better UX
            const updatedTicket = { ...selectedTicket, rating: feedbackRating, feedback: feedbackComment };
            setSelectedTicket(updatedTicket);
            setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));

        } catch (err: any) {
            console.error("[Feedback Error]", err);
            showToast(t('feedbackFailed'), 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!selectedTicket || isActionLoading || isSolved || !resolutionNote.trim()) return;
        setIsActionLoading(true);
        try {
            const senderRole = isSupport ? 'IT' : 'User';
            const updatePayload: any = {};
            if (isSupport && !isInternal) {
                if (!selectedTicket.assignedTo) {
                    updatePayload.assigned_to = currentUser?.fullName || 'IT Support';
                    updatePayload.assigned_to_email = currentUser?.email;
                }
            }

            // Update ticket if IT is resolving, otherwise just a reply
            if (Object.keys(updatePayload).length > 0) {
                const { error: ticketError } = await supabase.from('helpdesk_tickets').update(updatePayload).eq('id', selectedTicket.id);
                if (ticketError) throw ticketError;
            }

            // Insert into messages history
            const { error: msgError } = await supabase.from('helpdesk_ticket_messages').insert([{
                ticket_id: selectedTicket.id,
                sender_name: currentUser?.fullName || 'User',
                sender_role: senderRole,
                message: resolutionNote,
                is_internal: isInternal && isSupport
            }]);
            if (msgError) throw msgError;

            showToast('Reply sent successfully');

            // Notifications logic...
            if (isSupport && selectedTicket.requesterEmail) {
                await sendNotificationToUser(
                    { email: selectedTicket.requesterEmail },
                    'Support Response',
                    `IT Support has replied to your ticket: ${selectedTicket.subject}`,
                    'Success',
                    'helpdesk'
                );
            } else if (!isSupport) {
                // Notify IT or Admin if user replies
                const targetEmail = selectedTicket.assignedToEmail;
                if (targetEmail) {
                    await sendNotificationToUser(
                        { email: targetEmail },
                        'User Response',
                        `${currentUser?.fullName} replied to: ${selectedTicket.subject}`,
                        'Info',
                        'helpdesk'
                    );
                }
            }

            setResolutionNote('');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleNewTicketFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dmr8bxdos';
        const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gesit_erp_preset';

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('upload_preset', uploadPreset);

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        const resourceType = isImage ? 'image' : (isPdf ? 'raw' : 'auto');

        try {
            setUploadProgress(0);
            const publicUrl = await performUpload(file, resourceType);

            setNewTicketData(prev => ({
                ...prev,
                attachments: [...prev.attachments, { url: publicUrl, name: file.name, type: file.type }],
            }));
            showToast("File attached and added to content area.");
        } catch (err: any) {
            console.error('Upload Error:', err);
            showToast(err.message || "Upload failed.", 'error');
        } finally {
            setIsUploading(false);
            if (newTicketFileInputRef.current) newTicketFileInputRef.current.value = '';
        }
    };

    const handleCreateTicket = async () => {
        if (!newTicketData.subject || !newTicketData.description) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        setIsActionLoading(true);
        try {
            const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
            const { data: createdData, error: dbError } = await supabase.from('helpdesk_tickets').insert([{
                ticket_id: ticketId,
                requester_name: currentUser?.fullName,
                requester_email: currentUser?.email,
                department: newTicketData.department,
                subject: newTicketData.subject,
                description: newTicketData.description,
                priority: newTicketData.priority,
                status: 'Open',
                attachments: newTicketData.attachments.map(a => a.url),
                created_at: new Date().toISOString()
            }]).select().single();

            if (dbError) throw dbError;

            // Notify Admins via Global System
            await sendNotificationToAdmins(
                'New Service Ticket',
                `${currentUser?.fullName} reported: ${newTicketData.subject}`,
                'Info',
                'helpdesk'
            );

            // Notify Requester
            if (currentUser?.email) {
                await sendNotificationToUser(
                    { email: currentUser.email, id: currentUser.id },
                    'Ticket Submitted',
                    `Your ticket #${ticketId} has been successfully established and placed in the IT queue.`,
                    'Success',
                    'helpdesk'
                );
            }

            // Notify IT Operation via Email
            await sendTicketNotificationEmail({
                ticketId: ticketId,
                requesterName: currentUser?.fullName || 'User',
                requesterEmail: currentUser?.email || '-',
                department: newTicketData.department,
                subject: newTicketData.subject,
                priority: newTicketData.priority,
                category: 'General Support',
                description: newTicketData.description
            });

            showToast(`Ticket ${ticketId} established.`);
            setLastCreatedTicketId(ticketId);

            // Auto-redirect to Chat
            if (createdData) {
                const mapped = mapTicket(createdData);
                setSelectedTicket(mapped);
                setViewMode('list'); // Reset view mode to list so chat is visible in the main area
            } else {
                setViewMode('success');
            }
            setNewTicketData({
                subject: '',
                description: '',
                priority: 'Medium',
                department: 'General',
                attachments: []
            });
            fetchTickets();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateStatus = async (ticketId: number, nextStatus: string, forcedNote?: string) => {
        if (isActionLoading) return;
        
        // Block if trying to resolve an already resolved ticket
        if (isSolved && nextStatus === 'Resolved') return;

        if (!isOwner) {
            showToast('Only the ticket owner can change status', 'error');
            return;
        }

        if (nextStatus === 'Resolved') {
            let finalNote = resolutionNote.trim();

            // If empty, try to fetch the last IT message as requested
            if (!finalNote) {
                const lastITMessage = [...messages].reverse().find(m => m.sender_role === 'IT');
                if (lastITMessage) {
                    finalNote = lastITMessage.message;
                    setResolutionNote(finalNote);
                }
            }

            if (!finalNote) {
                showToast('Please provide a resolution note first', 'error');
                return;
            }
            setIsSolveConfirmOpen(true);
            return;
        }
        
        // For Reopening or regular updates
        executeStatusUpdate(ticketId, nextStatus, forcedNote);
    };

    const handleConvertToActivity = async () => {
        if (!selectedTicket || isActionLoading || !isSolved) return;
        setIsActionLoading(true);
        try {
            const payload = {
                activity_name: selectedTicket.subject,
                category: 'Troubleshooting',
                requester: selectedTicket.requesterName,
                department: selectedTicket.department,
                it_personnel: selectedTicket.assignedTo || currentUser?.fullName || 'IT Support',
                type: selectedTicket.priority === 'Critical' ? 'Critical' : 'Minor',
                status: 'Completed',
                remarks: selectedTicket.resolution || selectedTicket.description,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('activity_logs').insert([payload]);
            if (error) throw error;

            showToast('Converted to IT Activity successfully');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteTicket = async (ticketId: number) => {
        setIsActionLoading(true);
        try {
            console.log(`[HelpdeskDelete] ATTEMPT - Ticket ID: ${ticketId}`);

            // Delete related messages first
            const { error: msgErr } = await supabase.from('helpdesk_ticket_messages').delete().eq('ticket_id', ticketId);
            if (msgErr) throw msgErr;

            // Perform Delete with count verification
            const { error, count } = await supabase
                .from('helpdesk_tickets')
                .delete({ count: 'exact' })
                .eq('id', ticketId);

            console.log(`[HelpdeskDelete] DB Result - Deleted Count: ${count}`, error || '');

            if (error) throw error;

            if (count === 0) {
                throw new Error("RLS Block: Your account does not have permission to delete this ticket. Deletion aborted.");
            }

            // Verify it's gone
            const { data: verifyData } = await supabase.from('helpdesk_tickets').select('id').eq('id', ticketId).maybeSingle();
            if (verifyData) {
                throw new Error("Silent Failure: Database accepted the deletion but the ticket still exists. Check for background triggers.");
            }

            showToast('Ticket deleted successfully');
            setTickets(prev => prev.filter(t => String(t.id) !== String(ticketId)));
            setSelectedTicket(null);
            setIsDeleteConfirmOpen(false);
            // Safety sync
            fetchTickets();
        } catch (err: any) {
            console.error("[HelpdeskDelete] FATAL ERROR:", err);
            showToast(err.message || "Failed to delete ticket", 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const executeStatusUpdate = async (ticketId: number, nextStatus: string, forcedNote?: string) => {
        setIsActionLoading(true);
        try {
            let finalResolution = forcedNote || resolutionNote;
            if (nextStatus === 'Resolved') {
                const now = new Date().toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }).replace(',', '');
                if (!finalResolution.includes('[Resolved on:')) {
                    finalResolution = `${finalResolution}\n\n[Resolved on: ${now}]`;
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email;

            console.log(`[HelpdeskUpdate] EXECUTION START - Ticket:${ticketId} Status:${nextStatus}`);
            console.log(`[HelpdeskUpdate] Auth Session: ${session ? 'Active (' + userEmail + ')' : 'None'}`);

            const payload: any = {
                status: nextStatus,
                resolution: finalResolution,
                updated_at: new Date().toISOString()
            };

            if (isSupport) {
                // Only IT assigns/claims the ticket; requester actions must not overwrite the assigned staff
                payload.assigned_to = currentUser?.fullName || 'IT Support';
                payload.assigned_to_email = userEmail;
            }

            if (nextStatus === 'Resolved') {
                payload.resolved_at = new Date().toISOString();
            } else if (nextStatus === 'In Progress' && !selectedTicket?.respondedAt) {
                // First time picked up/started
                payload.responded_at = new Date().toISOString();
            }

            console.log(`[HelpdeskUpdate] Payload:`, payload);

            // Perform Update
            const { error: updateErr, count: affectedRows, status: dbStatus } = await supabase
                .from('helpdesk_tickets')
                .update(payload, { count: 'exact' })
                .eq('id', ticketId);

            console.log(`[HelpdeskUpdate] DB Result - Status: ${dbStatus} Affected: ${affectedRows}`, updateErr || '');

            if (updateErr) throw updateErr;

            if (affectedRows === 0) {
                // Try fallback by ticket_id string if ID failed
                const { count: fallbackRows } = await supabase
                    .from('helpdesk_tickets')
                    .update(payload, { count: 'exact' })
                    .eq('ticket_id', selectedTicket?.ticketId);

                if (!fallbackRows || fallbackRows === 0) {
                    throw new Error("RLS Block: Your account does not have permission to update this ticket. Please ensure the Supabase RLS policy is correctly applied.");
                }
            }

            // Verification Check
            const { data: verifyData } = await supabase.from('helpdesk_tickets').select('status').eq('id', ticketId).single();
            if (verifyData?.status !== nextStatus) {
                throw new Error("Silent Failure: Database accepted the update but the status remains unchanged. Check for DB triggers.");
            }

            showToast(`Ticket status updated to ${nextStatus}`);
            setIsSolveConfirmOpen(false);
            await fetchTickets();

            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => prev ? {
                    ...prev,
                    status: nextStatus as any,
                    resolution: finalResolution,
                    assignedTo: currentUser?.fullName || prev.assignedTo,
                    assignedToEmail: userEmail || prev.assignedToEmail
                } : null);
                setResolutionNote(finalResolution);
            }

            // Notify Requester
            if (selectedTicket?.requesterEmail) {
                const statusLabels: Record<string, string> = {
                    'Resolved': 'marked as solved',
                    'In Progress': 'in progress',
                    'Pending': 'placed on hold'
                };
                const actionText = statusLabels[nextStatus] || `updated to ${nextStatus}`;
                
                await sendNotificationToUser(
                    { email: selectedTicket.requesterEmail },
                    `Ticket ${nextStatus}`,
                    `Your technical request "${selectedTicket.subject}" is now ${actionText}.`,
                    nextStatus === 'Resolved' ? 'Success' : 'Info',
                    'helpdesk'
                );
            }
        } catch (err: any) {
            console.error("[HelpdeskUpdate] FATAL ERROR:", err);
            showToast(err.message || "Failed to save status", 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdatePriority = async (ticketId: number, newPriority: string) => {
        if (isActionLoading || !isOwner) return;
        setIsActionLoading(true);
        try {
            const { error } = await supabase.from('helpdesk_tickets').update({
                priority: newPriority,
                updated_at: new Date().toISOString()
            }).eq('id', ticketId);
            if (error) throw error;
            showToast(`Priority updated to ${newPriority}`);
            setSelectedTicket((prev: any) => prev ? { ...prev, priority: newPriority } : null);
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t));
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAssignTicket = async (ticketId: number, staffName: string) => {
        if (isActionLoading || !isOwner) return;
        setIsActionLoading(true);
        try {
            const staff = itStaff.find(s => s.name === staffName);
            const { error } = await supabase.from('helpdesk_tickets').update({
                assigned_to: staffName || null,
                assigned_to_email: staff?.email || null,
                updated_at: new Date().toISOString()
            }).eq('id', ticketId);
            if (error) throw error;
            showToast(staffName ? `Assigned to ${staffName}` : 'Unassigned');
            
            // Notify Assigned Staff
            if (staffName && staff?.email) {
                await sendNotificationToUser(
                    { email: staff.email },
                    'New Assignment',
                    `You have been assigned to ticket: ${selectedTicket?.subject}`,
                    'Info',
                    'helpdesk'
                );
            }

            setSelectedTicket((prev: any) => prev ? { ...prev, assignedTo: staffName, assignedToEmail: staff?.email } : null);
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assignedTo: staffName } : t));
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const stats = useMemo(() => {
        const total = tickets.length;
        const open = tickets.filter(t => t.status === 'Open').length;
        const inProgress = tickets.filter(t => t.status === 'In Progress').length;
        const resolved = tickets.filter(t => t.status === 'Resolved').length;
        return { total, open, inProgress, resolved };
    }, [tickets]);

    // Analytics Dashboard Data
    const analyticsData = useMemo(() => {
        // Real trend data for 7-day trend
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const trendData = last7Days.map(date => {
            const dayLabel = new Date(date).toLocaleDateString([], { weekday: 'short' });
            const requests = tickets.filter(t => t.createdAt?.split('T')[0] === date).length;
            const resolved = tickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt?.split('T')[0] === date).length;
            return { name: dayLabel, requests, resolved };
        });

        const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
        let totalSlaHours = 0;
        let resolvedWithDates = 0;
        resolvedTickets.forEach(t => {
            // Priority: Start from respondedAt (Process time) to Resolved
            const startTime = t.respondedAt || t.createdAt;
            if (startTime && t.resolvedAt) {
                const start = new Date(startTime);
                const end = new Date(t.resolvedAt);
                const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                if (diffHours >= 0) {
                    totalSlaHours += diffHours;
                    resolvedWithDates++;
                }
            }
        });
        const avgSla = resolvedWithDates > 0 ? (totalSlaHours / resolvedWithDates).toFixed(1) : '0';

        const ratedTickets = tickets.filter(t => t.rating && t.rating > 0);
        const totalRating = ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0);
        const avgRating = ratedTickets.length > 0 ? (totalRating / ratedTickets.length).toFixed(1) : '0';

        // SLA Compliance (Resolved within 24h)
        const slaCompliantCount = resolvedTickets.filter(t => {
            if (t.createdAt && t.resolvedAt) {
                const diff = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
                return diff <= 24;
            }
            return false;
        }).length;
        const slaCompliance = resolvedTickets.length > 0 ? ((slaCompliantCount / resolvedTickets.length) * 100).toFixed(1) : '100';

        // Current real status data
        const statusData = [
            { name: 'Open', value: tickets.filter(t => t.status === 'Open').length, color: '#f43f5e' },
            { name: 'In Progress', value: tickets.filter(t => t.status === 'In Progress').length, color: '#3b82f6' },
            { name: 'Pending', value: tickets.filter(t => t.status === 'Pending').length, color: '#f59e0b' },
            { name: 'Resolved', value: tickets.filter(t => t.status === 'Resolved').length, color: '#10b981' }
        ].filter(d => d.value > 0);

        // Category breakdown
        const categoryCounts = tickets.reduce((acc, t) => {
            const dep = t.department || 'General';
            acc[dep] = (acc[dep] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const categoryData = Object.keys(categoryCounts).map(key => ({
            name: key,
            count: categoryCounts[key]
        })).sort((a, b) => b.count - a.count).slice(0, 5); // Top 5 categories

        return { trendData, statusData, categoryData, avgSla, avgRating, slaCompliance };
    }, [tickets]);

    // Perform Search for Client View
    const performSearch = async (id: string) => {
        if (!id) return;
        setIsLoading(true);
        try {
            const { data, error: dbError } = await supabase
                .from('helpdesk_tickets')
                .select('*')
                .eq('ticket_id', id.toUpperCase().trim())
                .maybeSingle();

            if (dbError) throw dbError;
            if (!data) throw new Error('Ticket ID not found.');

            // Verify access if not support staff
            if (!isSupport && data.requester_email?.toLowerCase() !== currentUser?.email?.toLowerCase()) {
                throw new Error('You do not have permission to view this ticket.');
            }

            setSelectedTicket(mapTicket(data));
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadImage = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = url.split('/').pop()?.split('?')[0] || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };

    const InfoItem = ({ item }: { item: any }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        return (
            <div className="flex flex-col gap-1">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "flex items-center gap-3 w-full p-3 text-left rounded-xl border border-border/40 bg-background hover:border-primary/40 hover:bg-primary/5 transition-all group",
                        isExpanded && "border-primary/40 bg-primary/5"
                    )}
                >
                    <div className={cn(
                        "w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0",
                        isExpanded && "bg-primary text-primary-foreground"
                    )}>
                        <item.icon size={16} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-none mb-1">{item.label}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.title}</p>
                    </div>
                    <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", isExpanded && "rotate-180")} />
                </button>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 pt-1 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-800/20 rounded-b-xl border-x border-b border-border/30">
                                {item.detail}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">

            {/* Page Header */}
            <PageHeader
                title={isManagementMode ? t('ticketingManager') : t('ticketingCenter')}
                description={t('ticketingSubtitle')}
            >
                {isSupport && (
                    <Button
                        variant={isManagementMode ? "outline" : "default"}
                        size="sm"
                        className="text-xs font-bold"
                        onClick={() => setIsManagementMode(!isManagementMode)}
                    >
                        {isManagementMode ? (
                            <><User className="mr-2 h-3.5 w-3.5" /> {t('centerView')}</>
                        ) : (
                            <><Shield className="mr-2 h-3.5 w-3.5" /> {t('managementMode')}</>
                        )}
                    </Button>
                )}
            </PageHeader>


            {/* Mode Switcher (Requester) */}
            {!isManagementMode && (
                <Tabs
                    value={viewMode === 'form' || viewMode === 'success' ? 'form' : 'archive'}
                    onValueChange={(val) => {
                        if (val === 'form') {
                            setNewTicketData({
                                subject: '',
                                description: '',
                                priority: 'Medium' as any,
                                department: (currentUser?.department as string) || 'General',
                                attachments: []
                            });
                        }
                        setViewMode(val as any);
                    }}
                    className="w-fit mb-6"
                >
                    <TabsList>
                        <TabsTrigger value="form">
                            <LifeBuoy size={14} className="mr-2" /> {t('submitTicket')}
                        </TabsTrigger>
                        <TabsTrigger value="archive">
                            <Inbox size={14} className="mr-2" /> {t('myTickets')}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            {toast && (
                <div className={cn(
                    "fixed top-24 right-8 z-[2000] flex items-center gap-2 px-4 py-2.5 rounded-md shadow-lg border animate-in slide-in-from-right-2 duration-300",
                    toast.type === 'success' ? "bg-background border-border text-foreground" : "bg-destructive text-destructive-foreground"
                )}>
                    {toast.type === 'success' ? <CheckCircle2 size={14} className="text-primary" /> : <AlertCircle size={14} />}
                    <span className="text-xs font-medium">{toast.text}</span>
                </div>
            )}

            {
                isManagementMode && (
                    <>
                        {/* Tab Toggles for Management Mode - Standardized */}
                        <Tabs value={managementTab} onValueChange={(val) => setManagementTab(val as any)} className="w-fit mb-6">
                            <TabsList>
                                <TabsTrigger value="queue">
                                    <List size={14} className="mr-2" /> Queue
                                </TabsTrigger>
                                <TabsTrigger value="analytics">
                                    <BarChart2 size={14} className="mr-2" /> Analytics
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {managementTab === 'queue' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                                <StatCard label={t('totalRequests')} value={stats.total} icon={MessageSquare} percentageChange={8} subValue={t('vsLastMonth')} color="slate" />
                                <StatCard label={t('awaitingAction')} value={stats.open} icon={CircleDot} percentageChange={-2} subValue={t('vsLastMonth')} color="rose" status="at-risk" />
                                <StatCard label={t('activeSessions')} value={stats.inProgress} icon={Clock} percentageChange={15} subValue={t('vsLastMonth')} color="blue" />
                                <StatCard label={t('resolvedIncidents')} value={stats.resolved} icon={CheckCircle2} percentageChange={5} subValue={t('vsLastMonth')} color="emerald" status="on-track" />
                            </div>
                        )}
                    </>
                )
            }

            {/* AREA UTAMA */}
            {
                viewMode === 'success' ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-12 text-center border border-border shadow-sm max-w-lg mx-auto mt-12 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('reportSent')}</h2>
                        <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">{t('reportSuccessDesc')}</p>

                        <div className="bg-slate-50 dark:bg-zinc-800/50 px-8 py-4 rounded-xl border border-border inline-block mb-8">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('reportId')}</div>
                            <span className="text-xl font-bold text-primary font-mono tracking-tight">#{lastCreatedTicketId}</span>
                        </div>

                        <div>
                            <Button
                                size="lg"
                                onClick={() => setViewMode('archive')}
                                className="w-full font-bold"
                            >
                                {t('returnToTicketing')}
                            </Button>
                        </div>
                    </div>
                ) : viewMode === 'form' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full mt-6"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <Card className="border-border/60 shadow-sm overflow-hidden">
                                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800/50 bg-slate-50/30 dark:bg-zinc-800/20">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t('submitSupportTicket')}</CardTitle>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('supportTeamBackSoon')}</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-7">
                                        {/* Info Banner */}
                                        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/60 dark:bg-indigo-950/20 px-4 py-3">
                                            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                                            <p className="text-[12px] font-medium text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                                                Lengkapi <span className="font-bold">Subjek</span> dan <span className="font-bold">Deskripsi</span> di bawah ini, lalu klik <span className="font-bold">Kirim Laporan</span>. Prioritas tiket akan ditentukan oleh Tim IT setelah laporan diterima.
                                            </p>
                                        </div>

                                        {/* Subject Field */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="ticket-subject" className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                                                    {t('subject')} <span className="text-rose-500">*</span>
                                                </Label>
                                                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{newTicketData.subject.length}/120</span>
                                            </div>
                                            <Input
                                                id="ticket-subject"
                                                className="h-11"
                                                maxLength={120}
                                                placeholder={t('subjectPlaceholder')}
                                                value={newTicketData.subject}
                                                onChange={e => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                                            />
                                            <p className="text-[11px] font-medium text-muted-foreground/90 leading-relaxed">
                                                Ringkasan singkat masalah atau permintaan — contoh: "Reset password email".
                                            </p>
                                        </div>

                                        {/* Departemen: auto dari profil user */}
                                        <div className="space-y-2">
                                            <Label htmlFor="ticket-department" className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Departemen</Label>
                                            <div className="relative">
                                                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                                                <Input
                                                    id="ticket-department"
                                                    className="h-11 pl-10 bg-slate-50/80 dark:bg-zinc-800/80"
                                                    value={newTicketData.department}
                                                    readOnly
                                                />
                                                <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                                            </div>
                                            <p className="text-[11px] font-medium text-muted-foreground/90 leading-relaxed">
                                                Terisi otomatis dari profil Anda.
                                            </p>
                                        </div>

                                        {/* Deskripsi Field */}
                                        <div className="space-y-2">
                                            <Label htmlFor="ticket-description" className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                                                {t('description')} <span className="text-rose-500">*</span>
                                            </Label>
                                            <div className="border border-border rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-800/50 focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-500/50 transition-all">
                                                {/* Rich Text Toolbar */}
                                                <div className="px-3 py-2 bg-white/50 dark:bg-zinc-900/50 border-b border-border flex flex-wrap gap-1.5 items-center">
                                                    {[
                                                        { icon: Bold, type: 'bold' },
                                                        { icon: Italic, type: 'italic' },
                                                        { icon: Link, type: 'link' },
                                                        { icon: List, type: 'list' },
                                                        { icon: ImageIcon, type: 'image' },
                                                        { icon: FileText, type: 'file' },
                                                        { icon: Code, type: 'code' }
                                                    ].map((item, idx) => (
                                                        <Button
                                                            key={idx}
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() => applyNewTicketFormatting(item.type)}
                                                            className="w-8 transition-all"
                                                        >
                                                            <item.icon size={13} />
                                                        </Button>
                                                    ))}
                                                    {isUploading && <Loader2 size={13} className="animate-spin text-indigo-500 ml-2" />}
                                                </div>
                                                <Textarea
                                                    ref={newTicketDescriptionRef}
                                                    id="ticket-description"
                                                    className="min-h-[220px] h-[220px] resize-none bg-transparent border-0 shadow-none rounded-none px-5 py-5 text-[14px] font-medium leading-relaxed focus-visible:ring-0 focus-visible:border-0"
                                                    placeholder={t('descPlaceholder')}
                                                    value={newTicketData.description}
                                                    onChange={e => setNewTicketData({ ...newTicketData, description: e.target.value })}
                                                />

                                                {/* Email-style Attachments Section */}
                                                {newTicketData.attachments.length > 0 && (
                                                    <div className="px-4 py-3 bg-muted/20 border-t border-input">
                                                        <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                            <Paperclip size={12} />
                                                            {newTicketData.attachments.length} {t('attachmentsCount')}
                                                        </div>
                                                        <div className="flex flex-wrap gap-3">
                                                            {newTicketData.attachments.map((file, i) => (
                                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md shadow-sm transition-all group max-w-[200px]">
                                                                    <div className={`p-1.5 rounded-md shrink-0 ${file.type.startsWith('image/') ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                        {file.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[11px] font-medium text-foreground truncate">{file.name}</p>
                                                                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">{file.type.split('/')[1] || 'FILE'}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setNewTicketData(prev => ({
                                                                                ...prev,
                                                                                attachments: prev.attachments.filter((_, idx) => idx !== i)
                                                                            }));
                                                                        }}
                                                                        className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Hidden File Input */}
                                                <input type="file" ref={newTicketFileInputRef} className="hidden" multiple onChange={handleNewTicketFileUpload} />
                                            </div>
                                            <p className="text-[11px] font-medium text-muted-foreground/90 leading-relaxed">
                                                Jelaskan detail masalah. Gunakan toolbar (B, I, daftar, tautan) untuk format teks, dan lampirkan gambar/file bila diperlukan.
                                            </p>
                                        </div>
                                    </CardContent>
                                    <div className="p-6 border-t bg-slate-50/50 dark:bg-zinc-800/30 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                            <span className="text-rose-500 font-bold">*</span> Wajib diisi — Subjek &amp; Deskripsi
                                        </p>
                                        <div className="flex items-center justify-end gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setViewMode('archive')}
                                                className="text-[11px] font-black uppercase tracking-widest transition-all"
                                            >
                                                {t('cancel')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleCreateTicket}
                                                disabled={isActionLoading || !newTicketData.subject.trim() || !newTicketData.description.trim()}
                                                className="text-[11px] font-black uppercase tracking-widest"
                                            >
                                                {isActionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={14} className="mr-2" />}
                                                {t('submitReport')}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Sidebar Info in Form */}
                            <div className="space-y-6">
                                <Card className="border-border/60 shadow-sm overflow-hidden p-5 bg-indigo-50/10">
                                    <CardTitle className="text-sm font-bold mb-4 flex items-center gap-2">
                                        <Info size={16} className="text-indigo-500" />
                                        Support Info
                                    </CardTitle>
                                    {infoModal ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-background rounded-lg p-4 border border-border shadow-sm relative"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <infoModal.icon size={16} className="text-primary" />
                                                <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">{infoModal.title}</h4>
                                            </div>
                                            <p className="text-[12px] text-muted-foreground leading-relaxed font-medium mb-4">
                                                {infoModal.content}
                                            </p>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setInfoModal(null)}
                                                className="w-full text-xs font-bold"
                                            >
                                                Dismiss
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <div className="space-y-4">
                                            {[
                                                {
                                                    label: '08.00 - 17:00',
                                                    icon: Clock,
                                                    title: 'Ticketing Operating Hours',
                                                    detail: 'Our technical support team is available every business day (Monday - Friday) from 08:00 to 17:00 WIB. Requests submitted outside these hours will be prioritized on the next business day.'
                                                },
                                                {
                                                    label: 'Ext Call 196',
                                                    icon: Phone,
                                                    title: 'IT Extension Support',
                                                    detail: 'For immediate technical assistance within the office area, please call extension 196. We are ready to help with hardware, network, and internal application issues.'
                                                }
                                            ].map((item, i) => (
                                                <InfoItem key={i} item={item} />
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                <Card className="border-border/60 shadow-sm overflow-hidden p-5 bg-amber-50/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                            <Megaphone size={16} className="text-amber-500" />
                                            Active Communications
                                        </CardTitle>
                                        <Radio size={12} className="text-amber-500 animate-pulse" />
                                    </div>
                                    <div className="space-y-3">
                                        {broadcasts.length > 0 ? broadcasts.map((b, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-background border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden group">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 shrink-0">
                                                        <Zap size={12} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {b.title && <h5 className="text-[10px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 mb-0.5">{b.title}</h5>}
                                                        <p className="text-xs font-medium text-slate-700 dark:text-zinc-400 leading-relaxed mb-1.5 line-clamp-2">
                                                            {b.content || b.message}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-bold text-indigo-500/80 uppercase tracking-tight">System Signal</span>
                                                            <span className="text-[9px] text-slate-300">•</span>
                                                            <span className="text-[9px] font-medium text-slate-400">{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-8 text-center bg-slate-50/50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active system alerts</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                ) : (isManagementMode && managementTab === 'analytics') ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="border-border/60 shadow-sm relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Resolution Time</p>
                                            <h3 className="text-3xl font-black text-foreground tracking-tight">{analyticsData.avgSla}<span className="text-lg font-bold text-muted-foreground ml-1">hrs</span></h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                            <Clock size={20} />
                                        </div>
                                    </div>
                                        SLA target benchmark: 24h
                                </div>
                            </Card>

                            <Card className="border-border/60 shadow-sm relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">SLA Compliance</p>
                                            <h3 className="text-3xl font-black text-foreground tracking-tight">{analyticsData.slaCompliance}<span className="text-lg font-bold text-muted-foreground ml-1">%</span></h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                                            <ShieldCheck size={20} />
                                        </div>
                                    </div>
                                        Target: 90% resolution rate
                                </div>
                            </Card>

                            <Card className="border-border/60 shadow-sm relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">CSAT Score</p>
                                            <h3 className="text-3xl font-black text-foreground tracking-tight">{analyticsData.avgRating}<span className="text-lg font-bold text-muted-foreground ml-1">/ 5</span></h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                                            <Star size={20} />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                        Based on {tickets.filter(t => t.rating).length} responses
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <BarChart2 size={16} className="text-indigo-500" />
                                        Ticket Volume Trend (7 Days)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analyticsData.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.2} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888888' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888888' }} />
                                            <ReTooltip
                                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                labelStyle={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} iconType="circle" />
                                            <Line type="monotone" name="New Requests" dataKey="requests" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" name="Resolved" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-6">
                                <Card className="border-border/60 shadow-sm flex flex-col">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <CircleDot size={16} className="text-rose-500" />
                                            Status Distribution
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 flex-1 flex items-center">
                                        <div className="h-[200px] w-full flex">
                                            <ResponsiveContainer width="50%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={analyticsData.statusData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {analyticsData.statusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <ReTooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="w-1/2 flex flex-col justify-center gap-3 pl-4">
                                                {analyticsData.statusData.map((d, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.name}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">{d.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Bottom Row - Category Breakdown */}
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold">Top Ticket Categories</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData.categoryData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#888888" opacity={0.2} />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888888' }} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} width={120} />
                                        <ReTooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} name="Total Tickets">
                                            {
                                                analyticsData.categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : index === 1 ? '#6366f1' : index === 2 ? '#818cf8' : '#a5b4fc'} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                ) : (isManagementMode && managementTab === 'queue') ? (
                    <div className="space-y-4">
                        {/* TOOLBAR */}
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <ClipboardList size={16} className="text-primary" />
                                        IT Support Queue
                                    </CardTitle>
                                    <p className="text-[11px] font-medium text-muted-foreground mt-1">{filteredTickets.length} Total Tickets</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-xs font-semibold">
                                        <FileSpreadsheet size={14} className="mr-2 text-emerald-600" /> Export
                                    </Button>
                                    <Button variant="outline" size="icon-sm" onClick={() => fetchTickets()} title="Refresh">
                                        <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger render={
                                            <button className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-input/30 px-3 text-xs font-semibold text-foreground transition-all hover:bg-input/50 dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10" />
                                        }>
                                            <MoreHorizontal size={14} /> Filter
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 font-medium z-[200]">
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel className="text-xs">Filter Status</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {['All', 'Open', 'In Progress', 'Resolved'].map(st => (
                                                    <DropdownMenuItem key={st} onClick={() => setStatusFilter(st)} className="text-xs flex justify-between">
                                                        <span>{st === 'In Progress' ? 'Active' : st}</span>
                                                        {statusFilter === st && <Check size={14} className="text-primary" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel className="text-xs">Ticket View</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setSupportFilter('all')} className="text-xs flex justify-between">All Tickets {supportFilter === 'all' && <Check size={14} className="text-primary" />}</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSupportFilter('assigned')} className="text-xs flex justify-between">My Tasks {supportFilter === 'assigned' && <Check size={14} className="text-primary" />}</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setSupportFilter('mine')} className="text-xs flex justify-between">My Reports {supportFilter === 'mine' && <Check size={14} className="text-primary" />}</DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={resetFilters} className="text-xs text-rose-600"><RotateCcw size={14} className="mr-2" /> Reset Filters</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search ticket ID, subject, requester, email, department..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* TICKETS DATA TABLE */}
                        <Card className="border-border/60 shadow-sm">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Ticket</TableHead>
                                                <TableHead className="min-w-[220px]">Subject</TableHead>
                                                <TableHead>Requester</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Priority</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Assigned To</TableHead>
                                                <TableHead>Last Activity</TableHead>
                                                <TableHead>Rating</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-40 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Loader2 size={24} className="animate-spin text-primary/60" />
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Scanning...</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : paginatedTickets.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-40 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Inbox className="h-8 w-8 text-muted-foreground/40" />
                                                            <p className="text-sm font-medium text-muted-foreground">No tickets found.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedTickets.map(ticket => {
                                                    const statusVariant: any = {
                                                        'Open': 'destructive',
                                                        'Resolved': 'default',
                                                        'In Progress': 'default',
                                                        'Pending': 'secondary',
                                                    };
                                                    const statusClass: any = {
                                                        'Resolved': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-transparent',
                                                        'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-transparent',
                                                    };
                                                    const priorityVariant: any = {
                                                        'Critical': 'destructive',
                                                        'High': 'default',
                                                        'Medium': 'secondary',
                                                        'Low': 'outline',
                                                    };
                                                    return (
                                                        <TableRow
                                                            key={ticket.id}
                                                            onClick={() => setSelectedTicket(ticket)}
                                                            className="cursor-pointer"
                                                        >
                                                            <TableCell className="font-mono text-[11px] font-bold text-muted-foreground whitespace-nowrap">#{ticket.ticketId}</TableCell>
                                                            <TableCell>
                                                                <p className="text-sm font-semibold text-foreground line-clamp-1 max-w-[240px]">{ticket.subject}</p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2 min-w-[170px]">
                                                                    <UserAvatar name={ticket.requesterName} url={userAvatars[ticket.requesterName]} size="sm" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[13px] font-semibold text-foreground truncate">{ticket.requesterName}</p>
                                                                        <p className="text-[10px] text-muted-foreground truncate">{ticket.requesterEmail}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{ticket.department || '-'}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={priorityVariant[ticket.priority] || 'secondary'} className="rounded-md text-[10px] font-bold uppercase tracking-wide">
                                                                    {ticket.priority}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={statusVariant[ticket.status] || 'secondary'} className={cn('rounded-md text-[10px] font-bold uppercase tracking-wide', statusClass[ticket.status])}>
                                                                    {ticket.status === 'Pending' ? 'On Hold' : ticket.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{ticket.assignedTo || <span className="italic">Unassigned</span>}</TableCell>
                                                            <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{(() => {
                                                                const d = new Date(ticket.updatedAt || ticket.createdAt);
                                                                return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                            })()}</TableCell>
                                                            <TableCell>
                                                                {ticket.status === 'Resolved' && ticket.rating ? (
                                                                    <div className="flex gap-0.5">
                                                                        {[1, 2, 3, 4, 5].map(star => (
                                                                            <Star key={star} size={12} className={ticket.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'} />
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground/60">—</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/20">
                                <span className="text-[11px] font-bold text-muted-foreground">{filteredTickets.length} Total Tickets</span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft size={14} />
                                    </Button>
                                    <span className="text-[11px] font-bold text-muted-foreground px-1">{currentPage} / {totalPages || 1}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* CHAT & MANAGE MODAL */}
                        <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
                            <DialogContent className="max-w-[1250px] sm:max-w-[1250px] px-0 py-0 gap-0 overflow-hidden rounded-2xl border-none bg-white dark:bg-zinc-900" showCloseButton={false}>
                                <div className="h-[85vh] w-full flex flex-col lg:flex-row overflow-hidden bg-white dark:bg-zinc-900">
                                    
                            

                        {/* CENTER COLUMN */}
                        <div className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-zinc-900">
                            {selectedTicket ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="px-6 py-4 bg-white/95 dark:bg-zinc-900/95 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 z-20 sticky top-0">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                                                <ChevronLeft size={18} />
                                            </button>

                                            <div className="relative shrink-0">
                                                <UserAvatar name={selectedTicket.requesterName} url={userAvatars[selectedTicket.requesterName]} size="md" />
                                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                                            </div>

                                            <div className="min-w-0 flex flex-col justify-center">
                                                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate tracking-tight">{selectedTicket.requesterName}</h3>
                                                <span className="text-[11px] font-medium text-emerald-500 tracking-wide">Active now</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                            <button className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                                                <MoreHorizontal size={18} />
                                            </button>
                                            <button
                                                onClick={() => setShowMobileDetails(!showMobileDetails)}
                                                className={`lg:hidden p-2 rounded-full transition-all ${showMobileDetails ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                            >
                                                <Info size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* WA-style Chat Messages */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4 bg-slate-50/50 dark:bg-zinc-900/50 relative">
                                        {/* Date separator */}
                                        <div className="flex justify-center mb-6">
                                            <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 px-3 py-1 bg-white/60 dark:bg-zinc-800/60 rounded-full">
                                                {new Date(selectedTicket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* First message: ticket description (from requester) */}
                                        <div className="flex flex-col w-full text-center items-center justify-center gap-2 mb-8 mt-2 opacity-50">
                                             <div className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 rounded-lg max-w-sm text-xs font-medium text-slate-600 dark:text-slate-300 text-left">
                                                <strong>Subject:</strong> {selectedTicket.subject}
                                             </div>
                                        </div>

                                        <div className="flex items-end gap-3 mb-2 flex-row">
                                            <div className="max-w-[80%] flex flex-col items-start">
                                                <div className="bg-zinc-800 dark:bg-zinc-800 rounded-lg rounded-bl-sm px-4 py-3 shadow-sm border border-zinc-700">
                                                    <div className="text-sm font-medium text-white leading-relaxed">
                                                        <RichContentRenderer text={selectedTicket.description} attachments={selectedTicket.attachments} />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1.5">{new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        <AnimatePresence mode="popLayout">
                                            {messages.map((msg, idx) => {
                                                const isSelf = msg.sender_role === 'IT';
                                                const isInternalMsg = msg.is_internal;
                                                if (isInternalMsg && !isSupport) return null;

                                                const senderInitials = (msg.sender_name || 'S').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'} mb-1`}
                                                    >
                                                        {/* Avatar — only for other side */}
                                                        <UserAvatar name={msg.sender_name || 'S'} url={userAvatars[msg.sender_name]} size="sm" className={isSelf ? 'ring-indigo-100 dark:ring-indigo-900/50' : ''} />

                                                        <div className={`max-w-[80%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                                                            <div className={`px-4 py-3 shadow-sm relative ${isInternalMsg
                                                                ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/40 rounded-lg'
                                                                : isSelf
                                                                    ? 'bg-zinc-950 dark:bg-black text-white rounded-lg rounded-br-sm border border-black dark:border-zinc-800'
                                                                    : 'bg-zinc-800 dark:bg-zinc-800 text-white border border-zinc-700 rounded-lg rounded-bl-sm'
                                                                }`}>
                                                                {isInternalMsg && (
                                                                    <div className="flex items-center gap-1 mb-1.5 opacity-80">
                                                                        <Shield size={10} className="text-amber-600" />
                                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Internal Note</span>
                                                                    </div>
                                                                )}
                                                                <div className={`text-sm leading-relaxed ${isSelf ? 'text-white' : isInternalMsg ? 'text-amber-900 dark:text-amber-200' : 'text-white font-medium'}`}>
                                                                    {(() => {
                                                                        const imageMatch = msg.message.match(/!\[image\]\((.*?)\)/);
                                                                        const fileMatch = msg.message.match(/\[Attached (File|PDF)\]\((.*?)\)/);
                                                                        if (imageMatch) return (
                                                                            <div onClick={() => setPreviewImage(imageMatch[1])} className="block cursor-zoom-in overflow-hidden rounded-lg mt-1">
                                                                                <img src={imageMatch[1]} alt="Attachment" className="max-w-full max-h-[260px] object-contain rounded-lg hover:opacity-90 transition-opacity" loading="lazy" />
                                                                            </div>
                                                                        );
                                                                        if (fileMatch) {
                                                                            const fileUrl = fileMatch[2];
                                                                            const isPdf = fileMatch[1] === 'PDF';
                                                                            if (isPdf) return (
                                                                                <div onClick={() => setPreviewImage(fileUrl)} className={`flex items-center gap-3 p-2.5 rounded-lg mt-1 cursor-pointer bg-white/10 hover:bg-white/20 transition-all`}>
                                                                                    <div className="p-2 rounded bg-white/10 text-white shrink-0"><FileText size={16} /></div>
                                                                                    <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate text-white">Attached PDF</p><p className="text-[10px] text-white/50">Tap to preview</p></div>
                                                                                </div>
                                                                            );
                                                                            return (
                                                                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-2.5 rounded-lg mt-1 bg-white/10 hover:bg-white/20 transition-all`}>
                                                                                    <div className="p-2 rounded bg-white/10 text-white shrink-0"><FileText size={16} /></div>
                                                                                    <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-white truncate">Document</p><p className="text-[10px] text-white/50">Click to view</p></div>
                                                                                </a>
                                                                            );
                                                                        }
                                                                        return <EmojiRenderer text={msg.message} />;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div className={`flex items-center gap-1 mt-1.5 justify-end`}>
                                                                <span className="text-[10px] font-medium text-slate-400">
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Simplified Input Bar */}
                                    <div className="px-6 py-4 bg-white dark:bg-zinc-900 shrink-0">
                                        {!isSolved ? (
                                            <div className="flex items-end gap-3 p-1.5 pl-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                                <div className="flex-1 min-h-[44px] flex items-center">
                                                    <textarea
                                                        rows={1}
                                                        className="w-full bg-transparent border-none text-[14px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80 outline-none resize-none leading-relaxed py-2.5"
                                                        placeholder={isInternal ? 'Type a private note...' : 'Type your message...'}
                                                        value={resolutionNote}
                                                        onChange={e => {
                                                            setResolutionNote(e.target.value);
                                                            e.target.style.height = 'auto';
                                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                                        }}
                                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                                        onPaste={handlePaste}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1.5 pb-1">
                                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFileUpload} />
                                                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition-all">
                                                        {isUploading ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Paperclip size={18} />}
                                                    </button>
                                                    <div className="relative">
                                                        <button ref={emojiTriggerRef} onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showEmojiPicker ? 'text-indigo-500 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50'}`}>
                                                            <Smile size={18} />
                                                        </button>
                                                        <AnimatePresence>
                                                            {showEmojiPicker && (
                                                                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="absolute bottom-full right-0 mb-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xl z-[100] w-[280px] overflow-hidden">
                                                                    <div className="p-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                                                                        <div className="flex gap-1 overflow-x-auto no-scrollbar">{EMOJI_CATEGORIES.map((cat, catIdx) => (<button key={cat.name} onClick={() => setActiveEmojiCategory(catIdx)} className={`p-1.5 rounded-lg transition-all shrink-0 ${activeEmojiCategory === catIdx ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>{cat.icon}</button>))}</div>
                                                                    </div>
                                                                    <div className="p-2 grid grid-cols-7 gap-1 h-[180px] overflow-y-auto custom-scrollbar">{EMOJI_CATEGORIES[activeEmojiCategory].emojis.map(emoji => (<button key={emoji} onClick={() => addEmoji(emoji)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-lg"><FluentEmoji emoji={emoji} size={18} /></button>))}</div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    {isSupport && (
                                                        <button
                                                            onClick={() => setIsInternal(!isInternal)}
                                                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isInternal ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-zinc-700/50'}`}
                                                            title={isInternal ? 'Internal Mode On' : 'Internal Mode Off'}
                                                        >
                                                            <Shield size={16} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={handleSendReply}
                                                        disabled={isActionLoading || !resolutionNote.trim()}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isInternal ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-slate-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white shadow-lg shadow-black/10'} disabled:opacity-30 disabled:shadow-none`}
                                                    >
                                                        {isActionLoading ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className={isInternal ? 'text-white' : 'text-white dark:text-black'} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-center shrink-0">
                                                <div className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-4 py-2 rounded-full flex items-center gap-2 border border-slate-200 dark:border-zinc-700">
                                                    <Lock size={14} className="opacity-70" />
                                                    {t('ticketResolvedMsg')}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-4"><MessageSquare size={24} className="text-slate-300 dark:text-slate-600" /></div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('selectTicketTip')}</p>
                                </div>
                            )}
                        </div>


                        {/* RIGHT COLUMN: Ticket Details */}
                        <div className={`w-full lg:w-80 shrink-0 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-zinc-800 ${(!selectedTicket || !showMobileDetails) ? 'hidden lg:flex' : 'flex'}`}>
                            {selectedTicket ? (
                                <>
                                    {/* Action Header */}
                                    <div className="p-4 flex items-center justify-between shrink-0 z-10 sticky top-0 bg-white dark:bg-zinc-900 border-b lg:border-none border-slate-100 dark:border-zinc-800">
                                        <button onClick={() => setShowMobileDetails(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                                           <X size={16} />
                                        </button>
                                        <div className="ml-auto flex gap-2">
                                            <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 transition-colors">
                                                <Bell size={14} />
                                            </button>
                                            <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 transition-colors">
                                                <X size={14} className="hidden lg:block" onClick={() => setSelectedTicket(null)} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-0 space-y-6">
                                        {/* Profile Card Center */}
                                        <div className="flex flex-col items-center text-center">
                                            <div className="relative mb-3">
                                                <UserAvatar name={selectedTicket.requesterName} url={userAvatars[selectedTicket.requesterName]} size="xl" className="w-24 h-24 text-4xl shadow-sm" />
                                                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-zinc-900" />
                                            </div>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{selectedTicket.requesterName}</h2>
                                            <p className="text-xs font-semibold text-emerald-500 tracking-wide mt-1">Active now</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedTicket.subject}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedTicket.requesterEmail}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedTicket.requesterPhone || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedTicket.department}</p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                                             <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors text-left group">
                                                 <div className="flex items-center gap-3">
                                                     <div className="p-2 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 group-hover:bg-blue-100 transition-colors">
                                                         <FolderOpen size={16} />
                                                     </div>
                                                     <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Shared Files</p>
                                                 </div>
                                                 <ChevronRight size={16} className="text-slate-400" />
                                             </button>
                                        </div>

                                        {/* Functional Statuses Collapse Block */}
                                        <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                                                    <select
                                                        value={selectedTicket.status}
                                                        onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                                                        disabled={isActionLoading || !isOwner}
                                                        className="w-full p-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                    >
                                                        <option value="Open">Open</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Pending">Pending</option>
                                                        <option value="Resolved">Resolved</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Priority</label>
                                                    <select
                                                        value={selectedTicket.priority}
                                                        onChange={(e) => handleUpdatePriority(selectedTicket.id, e.target.value)}
                                                        disabled={isActionLoading || !isOwner}
                                                        className="w-full p-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                    >
                                                        <option value="Low">Low</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="High">High</option>
                                                        <option value="Critical">Critical</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {isSupport && (
                                                <>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                                                        <select
                                                            value={selectedTicket.department || 'General'}
                                                            onChange={async (e) => {
                                                                const newDept = e.target.value;
                                                                try {
                                                                    await supabase.from('helpdesk_tickets').update({ department: newDept, updated_at: new Date().toISOString() }).eq('id', selectedTicket.id);
                                                                    setSelectedTicket((prev: any) => prev ? { ...prev, department: newDept } : null);
                                                                    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, department: newDept } : t));
                                                                    showToast('Category updated');
                                                                } catch (err: any) {
                                                                    showToast(err.message, 'error');
                                                                }
                                                            }}
                                                            disabled={isActionLoading || !isOwner}
                                                            className="w-full p-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                        >
                                                            <option value="General">General</option>
                                                            <option value="General Inquiry">General Inquiry</option>
                                                            <option value="Technical Support">Technical Support</option>
                                                            <option value="Hardware Issue">Hardware Issue</option>
                                                            <option value="Account & Access">Account & Access</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assign To</label>
                                                        <select
                                                            value={selectedTicket.assignedTo || ''}
                                                            onChange={(e) => handleAssignTicket(selectedTicket.id, e.target.value)}
                                                            disabled={isActionLoading || !isOwner}
                                                            className="w-full p-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                        >
                                                            <option value="">Unassigned</option>
                                                            {itStaff.map(staff => (
                                                                <option key={staff.email} value={staff.name}>{staff.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Dates */}
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamps</label>

                                            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 space-y-2.5 border border-slate-100 dark:border-zinc-800">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-zinc-400">Created</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {new Date(selectedTicket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} <span className="text-slate-400 font-normal ml-0.5">{new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </span>
                                                </div>

                                                {selectedTicket.updatedAt && (
                                                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-200 dark:border-zinc-700/50">
                                                        <span className="text-slate-500 dark:text-zinc-400">Activity</span>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {new Date(selectedTicket.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} <span className="text-slate-400 font-normal ml-0.5">{new Date(selectedTicket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {selectedTicket.resolvedAt && (
                                                <div className="mt-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3 flex flex-col items-center text-center shadow-sm">
                                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1">{t('timeResolved')}</span>
                                                    <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                                                        {new Date(selectedTicket.resolvedAt).toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                                                        {new Date(selectedTicket.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Feedback / Rating */}
                                        {selectedTicket.status === 'Resolved' && (
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('clientFeedback')}</label>
                                                {selectedTicket.rating ? (
                                                    <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg p-3 border border-slate-100 dark:border-zinc-700">
                                                        <div className="flex gap-1 mb-2">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star key={star} size={14} className={selectedTicket.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'} />
                                                            ))}
                                                        </div>
                                                        {selectedTicket.feedback ? (
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{selectedTicket.feedback}"</p>
                                                        ) : (
                                                            <p className="text-[10px] text-slate-400 italic">{t('noComments')}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-medium text-slate-500 italic bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg p-2.5 text-center border border-amber-100 dark:border-amber-800/40">
                                                        {t('waitingRating')}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                                            {isSolveConfirmOpen ? (
                                                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                                        <div>
                                                            <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tight">Mark as Resolved?</h4>
                                                            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium leading-relaxed mt-1">
                                                                This will close the ticket and notify the requester.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setIsSolveConfirmOpen(false); }}
                                                            className="flex-1 h-9 rounded-lg text-[10px] font-bold uppercase bg-white dark:bg-zinc-800 text-slate-500 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); selectedTicket && executeStatusUpdate(selectedTicket.id, 'Resolved'); }}
                                                            disabled={isActionLoading}
                                                            className="flex-1 h-9 rounded-lg text-[10px] font-bold uppercase bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
                                                        >
                                                            {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                            Confirm
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {!isSolved && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                disabled={isActionLoading || !isOwner}
                                                                onClick={() => handleUpdateStatus(selectedTicket.id, 'In Progress')}
                                                                className={`flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border ${selectedTicket.status === 'In Progress' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-zinc-700 hover:border-indigo-500 hover:text-indigo-600'}`}
                                                            >Process</button>
                                                            <button
                                                                disabled={isActionLoading || !isOwner}
                                                                onClick={() => handleUpdateStatus(selectedTicket.id, 'Pending')}
                                                                className={`flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border ${selectedTicket.status === 'Pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-zinc-700 hover:border-amber-500 hover:text-amber-600'}`}
                                                            >Hold</button>
                                                        </div>
                                                    )}
                                                    {isSolved ? (
                                                        <button
                                                            disabled={isActionLoading || !isOwner}
                                                            onClick={() => handleUpdateStatus(selectedTicket.id, 'In Progress', 'Ticket reopened for further investigation.')}
                                                            className="w-full h-10 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-zinc-700"
                                                        >
                                                            <RefreshCcw size={16} /> Reopen Ticket
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={isActionLoading || !isOwner}
                                                            onClick={() => handleUpdateStatus(selectedTicket.id, 'Resolved')}
                                                            className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                        >
                                                            <CheckCircle2 size={16} /> Mark Resolved
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {isSolved && (
                                                <button
                                                    onClick={handleConvertToActivity}
                                                    disabled={isActionLoading}
                                                    className="w-full h-10 bg-white dark:bg-zinc-800 hover:bg-indigo-50 border border-slate-200 dark:border-zinc-700 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
                                                    Log to Assets
                                                </button>
                                            )}
                                            {isAdmin && (
                                                isDeleteConfirmOpen ? (
                                                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                                            <div>
                                                                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tight">Delete Ticket?</h4>
                                                                <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium leading-relaxed mt-1">
                                                                    This action cannot be undone. All data will be lost.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setIsDeleteConfirmOpen(false); }}
                                                                className="flex-1 h-9 rounded-lg text-[10px] font-bold uppercase bg-white dark:bg-zinc-800 text-slate-500 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); selectedTicket && handleDeleteTicket(selectedTicket.id); }}
                                                                disabled={isActionLoading}
                                                                className="flex-1 h-9 rounded-lg text-[10px] font-bold uppercase bg-rose-500 hover:bg-rose-600 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
                                                            >
                                                                {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsDeleteConfirmOpen(true)}
                                                        disabled={isActionLoading}
                                                        className="w-full h-10 bg-white dark:bg-zinc-800 hover:bg-rose-50 border border-rose-200 dark:border-rose-900/50 text-rose-600 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        <Trash2 size={16} /> Delete Ticket
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-3"><Info size={20} className="text-slate-300 dark:text-slate-600" /></div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">No ticket selected</p>
                                </div>
                            )}
                        </div>
                        </div>
                    </DialogContent>
                </Dialog>
                </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-280px)] min-h-[650px]">
                        {/* LEFT COLUMN: User's Ticket List */}
                        <div className={`w-full lg:w-96 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden shrink-0 transition-all duration-300 ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="p-4 border-b border-border/60 flex flex-col gap-3 bg-card/95 backdrop-blur-xl shrink-0 z-10 sticky top-0">
                                {/* Title & Count */}
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <LifeBuoy size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t('myTickets')}</h2>
                                        <p className="text-[11px] font-medium text-muted-foreground">
                                            {filteredTickets.length} {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'}
                                        </p>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder={t('searchTickets')}
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Status Filters */}
                                <Tabs
                                    value={statusFilter === 'All' ? 'All' : statusFilter === 'Resolved' ? 'Resolved' : 'Progress'}
                                    onValueChange={(val) => {
                                        if (val === 'All') setStatusFilter('All');
                                        else if (val === 'Progress') setStatusFilter('Open');
                                        else setStatusFilter('Resolved');
                                    }}
                                >
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="All">{t('statusAll')}</TabsTrigger>
                                        <TabsTrigger value="Progress">{t('statusProgress')}</TabsTrigger>
                                        <TabsTrigger value="Resolved">{t('statusResolved')}</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {isLoading ? (
                                    <div className="p-10 text-center flex flex-col items-center gap-2"><Loader2 size={24} className="animate-spin text-blue-500" /><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Scanning...</p></div>
                                ) : filteredTickets.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-2 min-h-[200px] p-10 text-center">
                                        <Inbox className="h-8 w-8 text-muted-foreground/40" />
                                        <p className="text-sm font-medium text-muted-foreground">Tidak ada laporan.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {filteredTickets.map(ticket => {
                                            const isSelected = selectedTicket?.id === ticket.id;
                                            const statusDot: any = {
                                                'Open': 'bg-rose-500',
                                                'Resolved': 'bg-emerald-500',
                                                'In Progress': 'bg-blue-500',
                                                'Pending': 'bg-amber-400',
                                            };

                                            const statusBadgeVariant: any = {
                                                'Open': 'destructive',
                                                'Resolved': 'default',
                                                'In Progress': 'default',
                                                'Pending': 'secondary',
                                            };
                                            const statusBadgeClass: any = {
                                                'Resolved': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-transparent',
                                                'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-transparent',
                                            };

                                            const statusLabel: any = {
                                                'Open': 'Open',
                                                'Resolved': 'Resolved',
                                                'In Progress': 'In Progress',
                                                'Pending': 'On Hold',
                                            };

                                            const priorityDot: any = {
                                                'Critical': 'bg-rose-500',
                                                'High': 'bg-orange-500',
                                                'Medium': 'bg-blue-500',
                                                'Low': 'bg-slate-400',
                                            };

                                            return (
                                                <div
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className={`group flex items-start gap-4 px-5 py-4 cursor-pointer transition-all duration-200 relative
                                                        ${isSelected
                                                            ? 'bg-slate-50 dark:bg-zinc-800'
                                                            : 'hover:bg-slate-50/50 dark:hover:bg-zinc-800/50'
                                                        }
                                                    `}
                                                >
                                                    {/* Ticket Icon / Avatar */}
                                                    <div className="relative shrink-0 pt-0.5">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isSelected ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 border-slate-200 dark:border-zinc-700'}`}>
                                                            <LifeBuoy size={18} />
                                                        </div>
                                                        {/* Status dot */}
                                                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${statusDot[ticket.status] || 'bg-slate-400'}`} />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                                                #{ticket.ticketId}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-slate-400 shrink-0">{(() => {
                                                                const d = new Date(ticket.updatedAt || ticket.createdAt);
                                                                const now = new Date();
                                                                const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
                                                                if (diff < 60) return 'Just now';
                                                                if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                                                                if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                            })()}</span>
                                                        </div>
                                                        <h4 className={`text-[14px] font-bold truncate leading-snug ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                                                            {ticket.subject}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <Badge variant={statusBadgeVariant[ticket.status] || 'secondary'} className={cn('rounded-md text-[10px] font-bold uppercase tracking-wide', statusBadgeClass[ticket.status])}>
                                                                {statusLabel[ticket.status] || ticket.status}
                                                            </Badge>
                                                            <Badge variant="outline" className="gap-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide">
                                                                <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[ticket.priority] || 'bg-slate-400'}`} />
                                                                {ticket.priority}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[12px] text-slate-500 dark:text-zinc-500 line-clamp-1 italic font-medium mt-0.5">
                                                            {ticket.description.replace(/[#*`]/g, '')}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Chat Area */}
                        <div className={`flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col rounded-xl overflow-hidden shadow-sm ${!selectedTicket ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
                            {selectedTicket ? (
                                <>
                                    <div className="px-5 py-4 bg-white dark:bg-zinc-900 border-b border-border/60 flex items-center justify-between shrink-0 z-20 sticky top-0">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all shrink-0">
                                                <ChevronLeft size={20} />
                                            </button>

                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 border border-border shrink-0">
                                                <LifeBuoy size={20} />
                                            </div>

                                            <div className="min-w-0 flex flex-col">
                                                <h3 className="text-[14px] font-black text-slate-800 dark:text-white truncate tracking-tight">{selectedTicket.subject}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">#{selectedTicket.ticketId}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-zinc-700"></span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedTicket.department}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.15em]",
                                            selectedTicket.status === 'Resolved'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400'
                                                : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400'
                                        )}>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", selectedTicket.status === 'Resolved' ? 'bg-emerald-500' : 'bg-indigo-500')} />
                                            {selectedTicket.status === 'Resolved' ? t('statusResolved') :
                                                selectedTicket.status === 'In Progress' ? t('statusProgress') : t('statusReceived')}
                                        </div>
                                    </div>

                                    {/* Clean Messages Area */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 space-y-6 bg-slate-50/30 dark:bg-zinc-950/50">
                                         {/* Original Ticket Description */}
                                         <div className="flex flex-col items-center mb-8">
                                             <div className="px-4 py-1.5 bg-slate-200/50 dark:bg-zinc-800/50 rounded-full text-[9px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-8 border border-border/40 shadow-sm">
                                                 {t('reportCreated')} • {new Date(selectedTicket.createdAt).toLocaleDateString()}
                                             </div>
 
                                             <div className="w-full max-w-2xl mx-auto mt-2">
                                                 <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
                                                     <div className="flex items-start justify-between gap-4">
                                                         <div className="flex items-center gap-3">
                                                             <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                                 <Info size={20} />
                                                             </div>
                                                             <div>
                                                                 <h3 className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('complaintDetail')}</h3>
                                                                 <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">#{selectedTicket.ticketId} • {selectedTicket.category}</p>
                                                             </div>
                                                         </div>
                                                         <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                                                             {new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                         </div>
                                                     </div>
                                                     <div className="w-full h-px bg-slate-100 dark:bg-zinc-800/80"></div>
                                                     <div className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                                                         <RichContentRenderer text={selectedTicket.description} attachments={selectedTicket.attachments} isSelf={false} />
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>

                                        {/* Message History */}
                                        {messages.map((msg, i) => {
                                            const isFromSupport = msg.sender_role === 'IT';
                                            return (
                                                <div key={i} className={`flex ${!isFromSupport ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                    <div className="max-w-[85%] space-y-1.5">
                                                        {isFromSupport && (
                                                            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-400 ml-1 flex items-center gap-1.5">
                                                                <Shield size={10} /> {t('itTeam')}
                                                            </div>
                                                        )}
                                                        <div className={cn(
                                                            "px-5 py-4 shadow-xl border transition-all relative",
                                                            !isFromSupport
                                                                ? 'bg-zinc-950 dark:bg-indigo-600 text-white border-transparent rounded-[20px] rounded-tr-none shadow-zinc-950/10'
                                                                : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border-slate-200 dark:border-zinc-700/80 rounded-[20px] rounded-tl-none shadow-slate-200/50 dark:shadow-none'
                                                        )}>
                                                            <div className="text-[14px] leading-relaxed font-medium">
                                                                <RichContentRenderer text={msg.message} isSelf={!isFromSupport} />
                                                            </div>
                                                        </div>
                                                        <div className={cn("flex mt-1.5 items-center gap-1.5", !isFromSupport ? 'justify-end' : 'justify-start ml-2')}>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {!isFromSupport && <div className="flex -space-x-1"><Check size={12} className="text-indigo-400/50" /><Check size={12} className="text-indigo-500" /></div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Integrated Input Bar */}
                                    <div className="p-4 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800/60 z-10 sticky bottom-0">
                                        {!isSolved ? (
                                            <div className="max-w-4xl mx-auto">
                                                <div className="relative group flex items-end bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm pl-2 pr-2 py-2">
                                                    <button 
                                                        onClick={() => fileInputRef.current?.click()} 
                                                        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-all"
                                                    >
                                                        <Paperclip size={20} />
                                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                                                    </button>
                                                    <textarea
                                                        rows={1}
                                                        className="flex-1 bg-transparent border-none text-slate-900 dark:text-slate-100 text-[14px] font-medium p-3 placeholder:text-slate-400 outline-none resize-none max-h-[150px] custom-scrollbar"
                                                        placeholder={t('writeMessage')}
                                                        value={resolutionNote}
                                                        onChange={e => {
                                                            setResolutionNote(e.target.value);
                                                            e.target.style.height = 'auto';
                                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                                                        }}
                                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                                    />
                                                    <Button
                                                        onClick={handleSendReply}
                                                        disabled={isActionLoading || !resolutionNote.trim()}
                                                        size="icon"
                                                        className="w-10 shrink-0 ml-2"
                                                    >
                                                        {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} className="translate-x-[1px]" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="max-w-4xl mx-auto py-2">
                                                {selectedTicket.rating ? (
                                                    <div className="py-4 px-6 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-border flex flex-col items-center gap-2.5">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 size={14} />
                                                                {t('ticketRated')}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                                                                SOLVED: {new Date(selectedTicket.updatedAt || selectedTicket.createdAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-1.5 mt-1">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    size={20}
                                                                    className={selectedTicket.rating >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}
                                                                />
                                                            ))}
                                                        </div>
                                                        {selectedTicket.feedback && (
                                                            <p className="text-sm text-center text-muted-foreground italic px-4">
                                                                "{selectedTicket.feedback}"
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : isRequester ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-slate-50 dark:bg-zinc-900/80 rounded-xl p-6 border border-slate-200 dark:border-zinc-800 space-y-5"
                                                    >
                                                        <div className="text-center space-y-1.5 mb-2">
                                                            <h4 className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white">{t('howWasService')}</h4>
                                                            <p className="text-[12px] font-medium text-slate-500 dark:text-zinc-400 leading-relaxed whitespace-pre-line">{t('giveRatingDesc')}</p>
                                                        </div>

                                                        <div className="flex justify-center gap-3">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={star}
                                                                    onClick={() => setFeedbackRating(star)}
                                                                    className="transition-transform active:scale-90"
                                                                >
                                                                    <Star
                                                                        size={24}
                                                                        className={cn(
                                                                            "transition-all duration-300",
                                                                            feedbackRating >= star
                                                                                ? "fill-amber-400 text-amber-400 scale-110"
                                                                                : "text-muted-foreground/30 hover:text-muted-foreground/50"
                                                                        )}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {feedbackRating > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                className="space-y-3 pt-2"
                                                            >
                                                                <textarea
                                                                    className="w-full text-[13px] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[100px] resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                                                                    placeholder={t('feedbackPlaceholder')}
                                                                    value={feedbackComment}
                                                                    onChange={(e) => setFeedbackComment(e.target.value)}
                                                                />
                                                                <Button
                                                                    onClick={handleSubmitFeedback}
                                                                    disabled={isActionLoading}
                                                                    className="w-full text-xs font-bold uppercase tracking-wider"
                                                                >
                                                                    {isActionLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Check size={14} className="mr-2" />}
                                                                    {t('submitRating')}
                                                                </Button>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                ) : (
                                                    <div className="py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-center gap-3">
                                                        <Lock size={14} className="opacity-40" />
                                                        {t('ticketResolved')}
                                                    </div>
                                                )}

                                                {/* Reopen: requester can reopen a resolved ticket */}
                                                <div className="mt-5 flex justify-center">
                                                    <button
                                                        onClick={() => handleUpdateStatus(selectedTicket.id, 'In Progress', 'Ticket reopened by requester.')}
                                                        disabled={isActionLoading}
                                                        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                                                    >
                                                        <RefreshCcw size={14} />
                                                        Reopen Ticket
                                                    </button>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="p-12 text-center max-w-sm">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-zinc-700">
                                        <MessageSquare size={32} className="text-indigo-200 dark:text-indigo-900" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 tracking-tight">{t('selectConv')}</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{t('selectConvDesc')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}



            {/* Image Preview Modal */}
            {
                previewImage && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl" onClick={() => setPreviewImage(null)}>
                        <button className="absolute top-8 right-24 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all" onClick={(e) => { e.stopPropagation(); if (previewImage) handleDownloadImage(previewImage); }} title="Download"><Download size={24} /></button>
                        <button className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all" onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}><X size={24} /></button>
                        <div className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                            {previewImage.toLowerCase().includes('.pdf') ? (
                                <div className="w-full h-full max-w-5xl relative flex flex-col items-center justify-center">
                                    <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewImage)}&embedded=true`} className="w-full h-full bg-white rounded-xl shadow-2xl" title="PDF Preview" />
                                    <div className="absolute bottom-4 right-4">
                                        <a href={previewImage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 text-white text-[10px] font-bold uppercase rounded-lg border border-white/10 hover:bg-slate-800 transition-all"><ExternalLink size={12} /> Open Original PDF</a>
                                    </div>
                                </div>
                            ) : (
                                <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
};




