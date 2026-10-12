"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
    Search,
    Phone,
    Building2,
    Info,
    PhoneOutgoing,
    PhoneIncoming,
    Globe,
    LayoutGrid,
    MapPin,
    Users,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    Plus,
    Trash2,
    Pencil,
    Loader2,
    X,
    Activity,
    Zap,
    Sun,
    Moon,
    ChevronLeft,
    ChevronRight,
    LayoutList,
    Share2,
    ExternalLink,
    FileDown,
    FileText,
    UploadCloud,
    Image as ImageIcon
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { trackActivity } from "../lib/auditLogger";
import { PhoneExtension, UserAccount } from "../types";
import { useLanguage } from "../translations";
import { UserAvatar } from "./UserAvatar";
import { StatCard } from "./StatCard";
import { exportToExcel } from "../lib/excelExport";
import { exportDirectoryPDF } from "../lib/directoryPdfExport";
import { useToast } from "./ToastProvider";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { ModalWrapper } from "@/components/ui/ModalWrapper";


const capitalizeWords = (str: string) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};


/* ===========================
   Components
=========================== */

// 1. Instruction Panel
const InstructionPanel = () => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const floor27Steps = [
        { label: t('pickupIncoming'), code: '#70 + Ext', icon: PhoneIncoming, color: 'text-[#B8860B] dark:text-[#D4AF37]' },
        { label: t('callTo26thFloor'), code: '## + Ext lt.26', icon: PhoneOutgoing, color: 'text-[#D4AF37]' },
        { label: t('outgoingCall'), code: '* + PIN + 9 + NUMBER', icon: Globe, color: 'text-[#B8860B] dark:text-[#D4AF37]' },
        { label: t('internationalCall'), code: '* + PIN + 9 + 01017 + CC + No.', icon: PhoneOutgoing, color: 'text-[#D4AF37]' },
    ];
    const floor26Steps = [
        { label: t('pickupIncoming'), code: '#41 + Ext', icon: PhoneIncoming, color: 'text-emerald-500' },
        { label: t('callTo27thFloor'), code: '88** + PIN + Ext lt.27', icon: PhoneOutgoing, color: 'text-teal-500' },
        { label: t('outgoingCall'), code: '81** + PIN + NUMBER', icon: Globe, color: 'text-green-400' },
    ];

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className={`
                    w-full flex items-center justify-between px-5 py-3.5 transition-all duration-300
                    rounded-2xl border
                    ${isOpen
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 rounded-b-none'
                        : 'bg-white dark:bg-slate-900 border-border/10 dark:border-white/[0.04] shadow-sm hover:border-primary/30 hover:shadow-md'
                    }
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-all duration-300 ${isOpen ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                        <PhoneOutgoing className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                        <span className={`text-sm font-black tracking-tight ${isOpen ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                            {t('dialingProtocol')}
                        </span>
                        <span className={`text-[10px] font-semibold mt-0.5 ${isOpen ? 'text-white/70' : 'text-slate-400'}`}>
                            {t('intercomGuide')}
                        </span>
                    </div>
                </div>
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${isOpen ? 'bg-white/20 rotate-180' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-slate-400'}`} strokeWidth={3} />
                </div>
            </button>

            {/* Collapsible Content */}
            <div className={`
                grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
            `}>
                <div className="overflow-hidden">
                    <div className="bg-white dark:bg-slate-900 border border-t-0 border-border/10 dark:border-white/[0.04] rounded-b-2xl shadow-sm">
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* 27th Floor Card */}
                            <div className="relative rounded-xl overflow-hidden border border-[#D4AF37]/30 dark:border-[#D4AF37]/10">
                                {/* Gradient Header */}
                                <div className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B] px-5 py-3 flex items-center gap-3">
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <Building2 size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white tracking-wide">{t('floor27CityTower')}</p>
                                    </div>
                                </div>

                                {/* Steps */}
                                <div className="bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 space-y-2.5">
                                    {floor27Steps.map((step, i) => {
                                        const Icon = step.icon;
                                        return (
                                            <div key={i} className="flex items-center justify-between gap-3 group/row">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm shrink-0`}>
                                                        <Icon size={11} className={step.color} />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate group-hover/row:text-[#B8860B] dark:group-hover/row:text-[#D4AF37] transition-colors">
                                                        {step.label}
                                                    </span>
                                                </div>
                                                <kbd className="shrink-0 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-slate-700 dark:text-slate-200 bg-muted/50 border border-border/60 whitespace-nowrap group-hover/row:border-[#D4AF37]/40 dark:group-hover/row:border-[#D4AF37]/20 group-hover/row:text-[#B8860B] dark:group-hover/row:text-[#D4AF37] transition-colors">
                                                    {step.code}
                                                </kbd>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 26th Floor Card */}
                            <div className="relative rounded-xl overflow-hidden border border-emerald-100 dark:border-emerald-500/10">
                                {/* Gradient Header */}
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 flex items-center gap-3">
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <MapPin size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white tracking-wide">{t('floor26GesitResources')}</p>
                                    </div>
                                </div>

                                {/* Steps */}
                                <div className="bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 space-y-2.5">
                                    {floor26Steps.map((step, i) => {
                                        const Icon = step.icon;
                                        return (
                                            <div key={i} className="flex items-center justify-between gap-3 group/row">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm shrink-0`}>
                                                        <Icon size={11} className={step.color} />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate group-hover/row:text-emerald-600 dark:group-hover/row:text-emerald-400 transition-colors">
                                                        {step.label}
                                                    </span>
                                                </div>
                                                <kbd className="shrink-0 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-slate-700 dark:text-slate-200 bg-muted/50 border border-border/60 whitespace-nowrap group-hover/row:border-emerald-300 dark:group-hover/row:border-emerald-500/40 group-hover/row:text-emerald-700 dark:group-hover/row:text-emerald-300 transition-colors">
                                                    {step.code}
                                                </kbd>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// 2. Extension Card
const ExtensionCard: React.FC<{
    ext: PhoneExtension;
    index: number;
    canEdit?: boolean;
    isAdmin?: boolean;
    isFocused?: boolean;
    onEdit?: (ext: PhoneExtension) => void;
    onDelete?: (id: number) => void;
}> = ({ ext, index, canEdit, isAdmin, isFocused, onEdit, onDelete }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);
    const is27 = ext.floor === 27;

    const theme = {
        border: is27 ? 'border-primary/10 dark:border-primary/5' : 'border-emerald-500/10 dark:border-emerald-500/5',
        activeRing: is27 ? 'ring-primary/20' : 'ring-emerald-500/20',
        rightBg: is27 ? 'group-hover:bg-primary' : 'group-hover:bg-emerald-500',
        rightText: is27 ? 'text-foreground dark:text-zinc-100' : 'text-emerald-500 dark:text-emerald-400',
        badge: is27 ? 'bg-primary/5 text-primary' : 'bg-emerald-500/5 text-emerald-500'
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(ext.ext);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0, scale: 0.98, y: 10 },
                visible: {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { duration: 0.4, ease: "easeOut" }
                }
            }}
            whileHover={{
                y: -6,
                transition: { duration: 0.3, ease: "easeOut" }
            }}
            className={`
                group relative flex w-full h-28 rounded-[1.75rem] overflow-hidden border transition-all duration-500
                hover:-translate-y-1.5 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]
                ${theme.border} bg-white/80 dark:bg-slate-800/60 backdrop-blur-xl
                dark:border-slate-700/50
                ${isFocused ? `ring-2 ${theme.activeRing} shadow-lg scale-105` : 'shadow-sm dark:shadow-slate-900/50'}
            `}
        >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150`} />

            {/* Left Side: Info */}
            <div className={`flex-1 p-4 pr-2 flex flex-col justify-between relative z-10`} >
                <div className="flex items-center gap-4">
                    <UserAvatar
                        name={ext.name}
                        url={ext.photo_url}
                        size="md"
                        className="shadow-sm ring-2 ring-white/50 dark:ring-slate-800/50 shrink-0 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="min-w-0 flex flex-col justify-center">
                        <h3 className="text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={ext.name}>
                            {capitalizeWords(ext.name)}
                        </h3>
                        <div className="flex flex-col mt-0.5">
                            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate tracking-wide" title={ext.dept}>
                                {ext.dept}
                            </p>
                            {ext.role && (
                                <p className="text-[10px] text-slate-300 dark:text-slate-500 font-medium truncate mt-0.5">
                                    {ext.role}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/5">
                    <div className="flex items-center gap-2">
                        <MapPin size={10} className="text-primary/60" />
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-300">
                            {t('floorLabel')} {ext.floor}
                        </span>
                    </div>

                    {/* Admin Actions */}
                    {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <button onClick={(e) => { e.stopPropagation(); onEdit?.(ext); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-90"><Pencil size={11} /></button>
                            {isAdmin && <button onClick={(e) => { e.stopPropagation(); onDelete?.(ext.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-90"><Trash2 size={11} /></button>}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side: Modern Glass Badge */}
            <button
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className={`
                    w-20 group/btn relative flex flex-col items-center justify-center cursor-pointer transition-all duration-500
                    border-l border-slate-200/30 dark:border-slate-800/30 overflow-hidden
                `}
                title={t('clickToCopyExt')}
            >
                {/* Active Hover Background */}
                <div className={`absolute inset-0 transition-opacity duration-500 opacity-0 group-hover/btn:opacity-100 ${theme.rightBg}`} />

                <div className="relative z-10 flex flex-col items-center scale-110">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-300 ${copied ? 'text-white' : 'text-slate-400 dark:text-slate-300 group-hover/btn:text-white/70'}`}>
                        {copied ? t('extCopied') : 'Ext'}
                    </span>
                    <span className={`text-3xl font-black tracking-tighter tabular-nums transition-all duration-300 ${copied
                        ? 'text-white scale-110'
                        : `group-hover/btn:text-white group-active/btn:scale-95 ${is27
                            ? 'text-foreground dark:text-zinc-100'
                            : 'text-emerald-500 dark:text-emerald-400'
                        }`
                        }`}>
                        {ext.ext}
                    </span>
                </div>

                {/* Decorative Icon */}
                <div className="absolute -bottom-2 -right-2 opacity-5 scale-150 transition-all duration-700 group-hover/btn:rotate-45 group-hover/btn:opacity-20 translate-y-2 group-hover/btn:translate-y-0">
                    <Phone className={`w-12 h-12 ${theme.rightText} group-hover/btn:text-white`} />
                </div>

                {/* Copied Overlay */}
                <motion.div
                    className="absolute inset-0 bg-emerald-500 flex items-center justify-center z-20"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: copied ? 1 : 0, opacity: copied ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                    <Check className="text-white w-8 h-8" strokeWidth={4} />
                </motion.div>
            </button>
        </motion.div>
    );
};

// 3. Extension Table
const ExtensionTable: React.FC<{
    extensions: PhoneExtension[];
    canEdit?: boolean;
    isAdmin?: boolean;
    onEdit?: (ext: PhoneExtension) => void;
    onDelete?: (id: number) => void;
    totalItems?: number;
}> = ({ extensions, canEdit, isAdmin, onEdit, onDelete, totalItems }) => {
    const { t } = useLanguage();
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const handleCopy = (id: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="w-full bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden animate-in fade-in duration-700">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="border-border/60 hover:bg-transparent">
                            <TableHead className="w-14 text-center py-3 font-semibold text-xs text-foreground/80 pl-6 pr-2">#</TableHead>
                            <TableHead className="py-3 font-semibold text-xs text-foreground/80">{t('nameLabel')}</TableHead>
                            <TableHead className="text-center py-3 font-semibold text-xs text-foreground/80">{t('extensionLabel')}</TableHead>
                            <TableHead className="py-3 font-semibold text-xs text-foreground/80">{t('deptLabel')}</TableHead>
                            <TableHead className="text-center py-3 font-semibold text-xs text-foreground/80">{t('floorLabel')}</TableHead>
                            {isAdmin && <TableHead className="text-center py-3 font-semibold text-xs text-foreground/80">{t('pinLabel')}</TableHead>}
                            {(canEdit || isAdmin) && <TableHead className="text-right py-3 font-semibold text-xs text-foreground/80 pr-6">{t('actions')}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {extensions.map((ext, idx) => (
                            <TableRow key={ext.id} className="group hover:bg-muted/40 border-border/60">
                                <TableCell className="pl-6 pr-2 py-4 text-center w-14">
                                    <span className="text-xs font-medium text-muted-foreground">{idx + 1}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar
                                            name={ext.name}
                                            url={ext.photo_url}
                                            size="sm"
                                            className="ring-2 ring-primary/10 shadow-sm shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <span className="block text-sm font-semibold text-foreground truncate">
                                                {capitalizeWords(ext.name)}
                                            </span>
                                            {ext.role && <span className="block text-xs text-muted-foreground truncate mt-0.5">{ext.role}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center py-4">
                                    <button
                                        onClick={() => handleCopy(ext.id, ext.ext)}
                                        title="Klik untuk menyalin extension"
                                        aria-label={`Copy extension ${ext.ext}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/60 font-mono text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-95 group/btn"
                                    >
                                        <span className="tabular-nums tracking-tight">{ext.ext}</span>
                                        {copiedId === ext.id
                                            ? <Check size={14} strokeWidth={2.5} className="text-emerald-500" />
                                            : <Copy size={14} className="text-muted-foreground opacity-0 group-hover/btn:opacity-100 transition-opacity -ml-0.5" />}
                                    </button>
                                </TableCell>
                                <TableCell className="py-4">
                                    <span className="inline-block px-2.5 py-1 rounded-md bg-muted/50 border border-border/60 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                        {ext.dept}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center py-4">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                            ${ext.floor === 27
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}
                                        title={ext.floor === 27 ? 'The Gesit Companies' : 'Gesit Natural Resources'}
                                    >
                                        <Building2 size={12} className="shrink-0" />
                                        {t('floorLabel')} {ext.floor}
                                    </span>
                                </TableCell>
                                {isAdmin && (
                                    <TableCell className="text-center py-4">
                                        <span className="font-mono text-xs font-medium text-muted-foreground tracking-widest select-all">
                                            {ext.pin || '---'}
                                        </span>
                                    </TableCell>
                                )}
                                {(canEdit || isAdmin) && (
                                    <TableCell className="text-right py-4 pr-6">
                                        <div className="inline-flex gap-0.5 items-center justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit?.(ext)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"><Pencil size={15} /></Button>
                                            {isAdmin && <Button variant="ghost" size="icon" onClick={() => onDelete?.(ext.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={15} /></Button>}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {totalItems !== undefined && (
                    <div className="px-6 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            Showing {extensions.length} of {totalItems} entries
                        </span>
                        <span className="font-medium text-foreground/70">
                            {totalItems} contact{totalItems !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};



// 5. Main Component
export const ExtensionDirectory = ({
    currentUser,
    variant = 'standalone',
    externalSearchTerm,
    externalFloorFilter,
    onFloorFilterChange
}: {
    currentUser?: UserAccount | null;
    variant?: 'standalone' | 'integrated';
    externalSearchTerm?: string;
    externalFloorFilter?: 'All' | 26 | 27;
    onFloorFilterChange?: (floor: 'All' | 26 | 27) => void;
}) => {
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState("");
    const [floorFilter, setFloorFilter] = useState<'All' | 26 | 27>('All');
    const [extensions, setExtensions] = useState<PhoneExtension[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExt, setEditingExt] = useState<PhoneExtension | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // New state for upload status
    const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
        // Integrated variant (public) always uses grid, standalone uses table for admin
        if (variant === 'integrated') return 'grid';
        return currentUser?.role === 'Admin' ? 'table' : 'grid';
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== "undefined") {
            return document.documentElement.classList.contains("dark") ? "dark" : "light";
        }
        return "light";
    });

    const [formData, setFormData] = useState<Partial<PhoneExtension>>({
        name: '',
        dept: '',
        ext: '',
        floor: 27,
        role: '',
        pin: '',
        photo_url: ''
    });

    const isAdmin = currentUser?.role === 'Admin';
    const isStaff = currentUser?.role === 'Staff';
    const canEdit = isAdmin || isStaff;
    const isPublic = !currentUser;

    // Use external search term if provided, otherwise use local state
    const activeSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : searchTerm;

    useEffect(() => {
        fetchExtensions();
    }, []);

    // Sync local floor filter with external prop if provided
    useEffect(() => {
        if (externalFloorFilter !== undefined) {
            setFloorFilter(externalFloorFilter);
        }
    }, [externalFloorFilter]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, floorFilter]);

    const fetchExtensions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('phone_extensions')
                .select('*')
                .order('name');

            if (error) throw error;
            setExtensions(data || []);
        } catch (error) {
            console.error('Error fetching extensions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleShare = () => {
        const url = window.location.origin + window.location.pathname + 'directory';
        navigator.clipboard.writeText(url);
        setIsSharing(true);
        setTimeout(() => setIsSharing(false), 2000);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingExt) {
                const { error } = await supabase
                    .from('phone_extensions')
                    .update({
                        name: formData.name,
                        dept: formData.dept,
                        ext: formData.ext,
                        floor: formData.floor,
                        role: formData.role,
                        pin: formData.pin,
                        photo_url: formData.photo_url
                    })
                    .eq('id', editingExt.id);
                if (error) throw error;
                await trackActivity(currentUser?.fullName || 'User', currentUser?.role || 'User', 'Update Extension', 'Extensions', `Updated extension ${formData.ext} for ${formData.name}`);
            } else {
                const { error } = await supabase
                    .from('phone_extensions')
                    .insert([formData]);
                if (error) throw error;
                await trackActivity(currentUser?.fullName || 'User', currentUser?.role || 'User', 'Create Extension', 'Extensions', `Created new extension ${formData.ext} for ${formData.name}`);
            }
            setIsModalOpen(false);
            fetchExtensions();
        } catch (error) {
            console.error('Error saving extension:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formDataUpload,
                }
            );

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setFormData({ ...formData, photo_url: data.secure_url });
        } catch (error) {
            console.error('Error uploading image:', error);
            showToast('Failed to upload image. Please try again or use a URL.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this extension?')) return;
        try {
            const { error } = await supabase
                .from('phone_extensions')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await trackActivity(currentUser?.fullName || 'User', currentUser?.role || 'User', 'Delete Extension', 'Extensions', `Deleted extension with ID ${id}`);
            fetchExtensions();
        } catch (error) {
            console.error('Error deleting extension:', error);
        }
    };

    const openModal = (ext?: PhoneExtension) => {
        if (ext) {
            setEditingExt(ext);
            setFormData({
                name: ext.name,
                dept: ext.dept,
                ext: ext.ext,
                floor: ext.floor,
                role: ext.role,
                pin: ext.pin || '',
                photo_url: ext.photo_url || ''
            });
        } else {
            setEditingExt(null);
            setFormData({
                name: '',
                dept: '',
                ext: '',
                floor: 27,
                role: '',
                pin: '',
                photo_url: ''
            });
        }
        setIsModalOpen(true);
    };

    const seedData = async () => {
        if (!confirm('This will seed initial data. Continue?')) return;
        const INITIAL_DATA = [
            { name: "JSB", dept: "Board of Commissioners", ext: "101", floor: 27 },
            { name: "JSC", dept: "Board of Commissioners", ext: "102", floor: 27 },
            { name: "MSA", dept: "Board of Commissioners", ext: "103", floor: 27 },
            { name: "MSB", dept: "Board of Commissioners", ext: "104", floor: 27 },
            { name: "MSC", dept: "Board of Commissioners", ext: "105", floor: 27 },
            { name: "MSD", dept: "Board of Commissioners", ext: "106", floor: 27 },
            { name: "MSA Bed Room", dept: "Board of Commissioners", ext: "107", floor: 27 },
            { name: "Jones", dept: "Deputy CEO & President", ext: "502", floor: 27 },
            { name: "Asma", dept: "PA & Secretary", ext: "111", floor: 27 },
            { name: "Intan", dept: "PA & Secretary", ext: "112", floor: 27 },
            { name: "Dinny", dept: "PA & Secretary", ext: "113", floor: 27 },
            { name: "Ety", dept: "PA & Secretary", ext: "188", floor: 27 },
            { name: "Dwi", dept: "PA & Secretary", ext: "511", floor: 27 },
            { name: "Peng Tjoan", dept: "Corporate Affair", ext: "130", floor: 27 },
            { name: "Thomas", dept: "Corporate Affair", ext: "131", floor: 27 },
            { name: "Yudha", dept: "Corporate Affair", ext: "181", floor: 27 },
            { name: "Ruby", dept: "Corporate Affair", ext: "182", floor: 27 },
            { name: "Natalia", dept: "Corporate Secretary", ext: "140", floor: 27 },
            { name: "Yohan", dept: "Corporate Secretary", ext: "141", floor: 27 },
            { name: "Sylvia", dept: "Corporate Secretary", ext: "142", floor: 27 },
            { name: "Desi", dept: "Corporate Secretary", ext: "143", floor: 27 },
            { name: "Nancy", dept: "Corporate Secretary", ext: "152", floor: 27 },
            { name: "Nike", dept: "Corporate Secretary", ext: "504", floor: 27 },
            { name: "Yayan", dept: "Finance & Accounting", ext: "120", floor: 27 },
            { name: "Maradona", dept: "Finance & Accounting", ext: "154", floor: 27 },
            { name: "Vanesha", dept: "Finance & Accounting", ext: "161", floor: 27 },
            { name: "Stephanie Y.", dept: "Finance & Accounting", ext: "167", floor: 27 },
            { name: "Merly", dept: "Finance & Accounting", ext: "122", floor: 27 },
            { name: "Lisi", dept: "Finance & Accounting", ext: "163", floor: 27 },
            { name: "Parawinata", dept: "Finance & Accounting", ext: "170", floor: 27 },
            { name: "Novitasari", dept: "Finance & Accounting", ext: "171", floor: 27 },
            { name: "Mian", dept: "Finance & Accounting", ext: "169", floor: 27 },
            { name: "Evi", dept: "Finance & Accounting", ext: "168", floor: 27 },
            { name: "Rama", dept: "Finance & Accounting", ext: "172", floor: 27 },
            { name: "Winarti", dept: "Finance & Accounting", ext: "173", floor: 27 },
            { name: "Javier", dept: "HR & Logistic", ext: "195", floor: 27 },
            { name: "Sarah", dept: "HR & Logistic", ext: "115", floor: 27, role: "Sec. to Javier" },
            { name: "Rara", dept: "HR & Logistic", ext: "198", floor: 27 },
            { name: "Resti", dept: "HR & Logistic", ext: "185", floor: 27, role: "HR" },
            { name: "Nisa", dept: "HR & Logistic", ext: "187", floor: 27, role: "HR" },
            { name: "Bendry", dept: "HR & Logistic", ext: "197", floor: 27, role: "IT" },
            { name: "Rudi", dept: "HR & Logistic", ext: "196", floor: 27, role: "IT" },
            { name: "Noni", dept: "HR & Logistic", ext: "191", floor: 27, role: "GA" },
            { name: "Suryadi", dept: "HR & Logistic", ext: "189", floor: 27, role: "GA" },
            { name: "Susilo", dept: "HR & Logistic", ext: "162", floor: 27, role: "GA" },
            { name: "Jave", dept: "Business Development", ext: "201", floor: 27 },
            { name: "Corinna", dept: "Business Development", ext: "302", floor: 27 },
            { name: "Greg", dept: "Business Development", ext: "205", floor: 27 },
            { name: "Stefanini", dept: "Business Development", ext: "203", floor: 27 },
            { name: "Eliaanti", dept: "Business Development", ext: "204", floor: 27 },
            { name: "Donny T.", dept: "Business Development", ext: "202", floor: 27 },
            { name: "Petrus", dept: "Business Development", ext: "206", floor: 27 },
            { name: "Neysa", dept: "Business Development", ext: "207", floor: 27 },
            { name: "Katherine", dept: "Business Development", ext: "208", floor: 27 },
            { name: "Artika", dept: "Financial Investment", ext: "114", floor: 27, role: "Sec. to Jave" },
            { name: "Ita", dept: "Financial Investment", ext: "305", floor: 27 },
            { name: "Suryadi Hertanto", dept: "Trading", ext: "301", floor: 27 },
            { name: "Hilaluddin", dept: "Trading", ext: "303", floor: 27 },
            { name: "Harvey", dept: "Trading", ext: "304", floor: 27 },
            { name: "Ayu", dept: "Trading", ext: "306", floor: 27 },
            { name: "Kevin", dept: "Gesit Foundation", ext: "192", floor: 27 },
            { name: "Yuni", dept: "Gesit Foundation", ext: "186", floor: 27 },
            { name: "Widya", dept: "Receptionist", ext: "180/0", floor: 27 },
            { name: "Board Room 1", dept: "Common Areas", ext: "800", floor: 27 },
            { name: "Board Room 2", dept: "Common Areas", ext: "801", floor: 27 },
            { name: "Conference Room", dept: "Common Areas", ext: "802", floor: 27 },
            { name: "Meeting Room (Lobby)", dept: "Common Areas", ext: "803", floor: 27 },
            { name: "Sofa Room", dept: "Common Areas", ext: "805", floor: 27 },
            { name: "Pantry", dept: "Common Areas", ext: "190", floor: 27 },
            { name: "Fendra", dept: "Vice President", ext: "211", floor: 26 },
            { name: "Budhi", dept: "Vice President", ext: "210", floor: 26 },
            { name: "Husni", dept: "Vice President", ext: "212", floor: 26 },
            { name: "Yudha", dept: "Vice President", ext: "209", floor: 26 },
            { name: "Dwi", dept: "Office Management", ext: "213", floor: 26 },
            { name: "Dimas", dept: "Office Management", ext: "232", floor: 26 },
            { name: "Rahmat Hidayat", dept: "Permit & License", ext: "236", floor: 26 },
            { name: "Novita Sitorus", dept: "Permit & License", ext: "240", floor: 26 },
            { name: "Afif", dept: "Finance & Accounting", ext: "228", floor: 26 },
            { name: "Said", dept: "Finance & Accounting", ext: "226", floor: 26 },
            { name: "Yusup", dept: "Procurement", ext: "223", floor: 26 },
            { name: "Puji", dept: "Information Technology", ext: "232", floor: 26 },
            { name: "Tunggul", dept: "Engineering", ext: "215", floor: 26 },
            { name: "Lydia", dept: "Project", ext: "220", floor: 26 },
            { name: "Juni", dept: "HRGA", ext: "232", floor: 26 },
            { name: "Receptionist", dept: "Front Desk", ext: "200", floor: 26 }
        ];

        try {
            const { error } = await supabase.from('phone_extensions').insert(INITIAL_DATA);
            if (error) throw error;
            showToast('Data seeded successfully!', 'success');
            fetchExtensions();
        } catch (error) {
            console.error('Error seeding data:', error);
            showToast('Error seeding data. Check console.', 'error');
        }
    };

    const filteredExtensions = useMemo(() => {
        return extensions.filter((item) => {
            const activeFloorFilter = externalFloorFilter !== undefined ? externalFloorFilter : floorFilter;
            if (activeFloorFilter !== 'All' && Number(item.floor) !== activeFloorFilter) return false;

            const searchLower = activeSearchTerm.toLowerCase().trim();
            if (!searchLower) return true;

            const nameMatch = (item.name || "").toLowerCase().includes(searchLower);
            const deptMatch = (item.dept || "").toLowerCase().includes(searchLower);
            const extMatch = (item.ext || "").toLowerCase().includes(searchLower);
            const roleMatch = item.role ? item.role.toLowerCase().includes(searchLower) : false;

            return nameMatch || deptMatch || extMatch || roleMatch;
        }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [extensions, activeSearchTerm, floorFilter, externalFloorFilter]);

    const totalPages = Math.ceil(filteredExtensions.length / itemsPerPage);
    const paginatedExtensions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredExtensions.slice(start, start + itemsPerPage);
    }, [filteredExtensions, currentPage, itemsPerPage]);

    const stats = useMemo(() => ({
        total: extensions.length,
        floor26: extensions.filter(e => Number(e.floor) === 26).length,
        floor27: extensions.filter(e => Number(e.floor) === 27).length
    }), [extensions]);

    const handleExportExcel = () => {
        if (filteredExtensions.length === 0) return;

        const dataToExport = filteredExtensions.map(ext => {
            const row: any = {
                'Name': ext.name,
                'Extension': ext.ext,
                'Floor': `${ext.floor}th Floor`,
                'Department': ext.dept,
                'Role': ext.role || '-'
            };
            if (isAdmin) {
                row['PIN'] = ext.pin || '-';
            }
            return row;
        });

        exportToExcel(dataToExport, `GESIT-EXTENSIONS-${new Date().toISOString().split('T')[0]}`);

        if (currentUser) {
            trackActivity(
                currentUser.fullName,
                currentUser.role,
                'Export Excel',
                'Directory',
                `Exported ${filteredExtensions.length} extensions to Excel`
            );
        }
    };

    const handleExportPDF = () => {
        if (extensions.length === 0) return;

        exportDirectoryPDF(extensions);

        if (currentUser) {
            trackActivity(
                currentUser.fullName,
                currentUser.role,
                'Export PDF',
                'Directory',
                `Exported ${extensions.length} extensions to PDF`
            );
        }
    };

    return (
        <div className="flex flex-col pb-10 font-sans animate-in fade-in duration-700 px-0 sm:px-0 w-full overflow-x-hidden">
            

            

            

            {/* Simple Public Title */}
            {variant === 'integrated' && (
                <div className="mb-10 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            PHONE DIRECTORY
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            THE CITY TOWER - FLOOR 26 & 27
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="rounded-xl font-bold bg-white dark:bg-slate-900 border-border text-slate-800 dark:text-slate-200">
                            <FileText className="mr-2 h-4 w-4 text-red-500" /> {t('exportPdf')}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleTheme}
                            className="rounded-xl bg-white dark:bg-slate-900 border-border text-slate-800 dark:text-slate-200 h-9 w-9 shrink-0 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-indigo-500" />}
                        </Button>
                    </div>
                </div>
            )}

            {/* Dashboard Header (Admin/Standalone) */}
            {variant === 'standalone' && (
                <div className="mb-6 pt-4">
                    <PageHeader title="Phone Directory" description="The City Tower & Infrastructure Registry">
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 px-3 shrink-0 rounded-xl font-bold bg-white dark:bg-slate-900 border-border text-slate-800 dark:text-slate-200" title="Export PDF">
                            <FileText className="h-4 w-4 text-red-500 sm:mr-2" />
                            <span className="hidden sm:inline">{t('exportPdf')}</span>
                        </Button>
                        {canEdit && (
                            <Button
                                size="sm"
                                onClick={() => openModal()}
                                className="h-9 px-3 shrink-0 font-bold rounded-xl shadow-sm"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">{t('addingExtension')}</span>
                            </Button>
                        )}
                    </PageHeader>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            label="Total Extensions"
                            value={stats.total}
                            icon={Users}
                            percentageChange={10}
                            subValue="Active Nodes"
                            color="slate"
                        />
                        <StatCard
                            label="The Gesit Companies"
                            value={stats.floor27}
                            icon="/image/logo.png"
                            percentageChange={2}
                            subValue="Floor 27"
                            color="blue"
                        />
                        <StatCard
                            label="Gesit Natural Resources"
                            value={stats.floor26}
                            icon="/image/logo.png"
                            percentageChange={5}
                            subValue="Floor 26"
                            color="emerald"
                            status="on-track"
                        />
                    </div>
                </div>
            )}


            <InstructionPanel />

            {/* List Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full bg-primary" />
                    <h2 className="text-sm font-semibold text-foreground tracking-wide">
                        Directory Registry
                    </h2>
                </div>

                {/* Search + Filters row — stacks on mobile */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 flex items-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${searchTerm ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        <Input
                            placeholder={t('searchDirectoryPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-10 h-11 bg-transparent border-none rounded-2xl font-bold focus-visible:ring-0 outline-none shadow-none dark:text-slate-100 placeholder:text-muted-foreground/50"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <X size={16} strokeWidth={3} />
                            </button>
                        )}
                    </div>

                    {/* Filters + View Toggles — wraps as a row on all sizes */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Floor Switches */}
                        <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/60 rounded-xl">
                            <button
                                onClick={() => { setFloorFilter('All'); onFloorFilterChange?.('All'); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${floorFilter === 'All'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {t('allFloors')}
                            </button>
                            <button
                                onClick={() => { setFloorFilter(26); onFloorFilterChange?.(26); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${floorFilter === 26
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                26
                            </button>
                            <button
                                onClick={() => { setFloorFilter(27); onFloorFilterChange?.(27); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${floorFilter === 27
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                27
                            </button>
                        </div>

                        {/* View Mode Toggles */}
                        <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/60 rounded-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                    ? 'bg-card text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                title={t('gridMode')}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'table'
                                    ? 'bg-card text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                title={t('tableMode')}
                            >
                                <LayoutList size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-28 bg-card rounded-2xl p-4 flex gap-4 animate-pulse border border-border/60 shadow-sm overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl bg-slate-200/50 dark:bg-slate-700/60 shrink-0 self-center" />
                            <div className="flex-1 space-y-3 py-1 self-center">
                                <div className="h-3.5 w-3/4 bg-slate-200/50 dark:bg-slate-700/60 rounded-full" />
                                <div className="space-y-2">
                                    <div className="h-2 w-1/2 bg-slate-200/40 dark:bg-slate-700/40 rounded-full" />
                                    <div className="h-2 w-1/3 bg-slate-200/40 dark:bg-slate-700/40 rounded-full" />
                                </div>
                            </div>
                            <div className="w-16 h-full flex flex-col items-center justify-center gap-2 border-l border-slate-200/30 dark:border-slate-700/30 bg-slate-50/50 dark:bg-slate-700/30 -mr-4">
                                <div className="h-2 w-8 bg-slate-200/50 dark:bg-slate-700/50 rounded-full" />
                                <div className="h-6 w-10 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredExtensions.length > 0 ? (
                <>
                    <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div
                            key="grid"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={{
                                visible: {
                                    transition: {
                                        staggerChildren: 0.05
                                    }
                                }
                            }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {paginatedExtensions.map((ext, index) => (
                                <ExtensionCard
                                    key={`${ext.id}-${ext.ext}`}
                                    ext={ext}
                                    index={index}
                                    isAdmin={isAdmin}
                                    canEdit={canEdit}
                                    isFocused={searchTerm.length > 0}
                                    onEdit={openModal}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="table"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                            <ExtensionTable
                                extensions={paginatedExtensions}
                                isAdmin={isAdmin}
                                canEdit={canEdit}
                                onEdit={openModal}
                                onDelete={handleDelete}
                                totalItems={filteredExtensions.length}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between gap-4">
                        <p className="text-xs font-medium text-muted-foreground">
                            Page {currentPage} of {totalPages} • {filteredExtensions.length} {filteredExtensions.length === 1 ? 'extension' : 'extensions'}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Previous page"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="w-9 h-9 border-border/60"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <span className="text-sm font-semibold text-foreground tabular-nums px-1">{currentPage}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Next page"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="w-9 h-9 border-border/60"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-card rounded-2xl border-2 border-dashed border-border/60"
                >
                    <div className="p-6 bg-muted/50 rounded-2xl border border-border/60">
                        <Search size={40} className="text-muted-foreground/40 mx-auto" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">No Extension Found</h3>
                        <p className="text-xs font-medium text-muted-foreground">Verify the search name or extension number</p>
                    </div>
                </motion.div>
            )}

            {/* Admin Migration Hint */}
            {isAdmin && extensions.length === 0 && !isLoading && (
                <div className="mt-12 p-8 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900/40 border border-amber-100/50 dark:border-amber-500/20 rounded-2xl text-center animate-in fade-in zoom-in duration-700">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/30 animate-bounce">
                            <Zap size={24} aria-hidden="true" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-amber-900 dark:text-amber-100">System Initialization Required</h4>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">No records found. Sync with provided TGC parameters?</p>
                        </div>
                        <Button
                            onClick={seedData}
                            className="mt-2 px-8 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-amber-500/30"
                        >
                            Sync Data Environment
                        </Button>
                    </div>
                </div>
            )}

            {/* Admin Modal */}
            <ModalWrapper isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="sm:max-w-xl">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary text-primary-foreground rounded-lg shadow-sm">
                            {editingExt ? <Pencil size={18} /> : <Plus size={18} />}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            {editingExt ? t('editingExtension') : t('addingExtension')}
                        </h3>
                    </div>
                    <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close modal" className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">{t('nameLabel')}</label>
                                <Input
                                    required
                                    className="w-full px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus-visible:bg-white dark:focus-visible:bg-slate-700/50 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 transition-all shadow-inner"
                                    value={formData.name}
                                    placeholder="Full name..."
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Photo Upload Section */}
                            <div>
                                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">{t('uploadPhoto')}</label>
                                <div className="flex gap-4 items-start">
                                    <div className="relative group shrink-0">
                                        <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                            {formData.photo_url ? (
                                                <img
                                                    src={formData.photo_url}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="text-slate-400" size={24} />
                                            )}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-white" size={20} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                id="photo-upload"
                                                disabled={isUploading}
                                            />
                                            <label
                                                htmlFor="photo-upload"
                                                className={`
                                                    flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer
                                                    ${isUploading
                                                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                                        : 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:hover:bg-indigo-500/20 dark:text-indigo-400'}
                                                `}
                                            >
                                                <UploadCloud size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {isUploading ? t('loading') : t('uploadPhoto')}
                                                </span>
                                            </label>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-white dark:bg-slate-900 px-2 text-[9px] font-bold text-slate-400">Or use URL</span>
                                            </div>
                                        </div>

                                        <Input
                                            className="w-full px-4 border-slate-200 dark:border-slate-700 text-xs font-medium focus-visible:bg-white dark:focus-visible:bg-slate-700/50 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 outline-none transition-all"
                                            value={formData.photo_url || ''}
                                            placeholder="https://..."
                                            onChange={e => setFormData({ ...formData, photo_url: e.target.value })}
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">{t('extensionLabel')}</label>
                                    <Input
                                        required
                                        className="w-full px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 outline-none transition-all shadow-inner"
                                        value={formData.ext}
                                        placeholder="Ext"
                                        onChange={e => setFormData({ ...formData, ext: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">{t('floorFieldLabel')}</label>
                                    <select
                                        className="w-full px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                        value={formData.floor}
                                        onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                                    >
                                        <option value={26}>26th Floor</option>
                                        <option value={27}>27th Floor</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">{t('deptLabel')}</label>
                                <Input
                                    required
                                    className="w-full px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 outline-none transition-all shadow-inner"
                                    value={formData.dept}
                                    placeholder="Cluster..."
                                    onChange={e => setFormData({ ...formData, dept: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">{t('roleLabel')}</label>
                                <Input
                                    className="w-full px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 outline-none transition-all shadow-inner"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">{t('pinLabel')}</label>
                                <Input
                                    className="w-full px-5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 outline-none transition-all shadow-inner font-mono"
                                    value={formData.pin}
                                    placeholder="Enter pin..."
                                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                />
                            </div>

                    </div>
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
                            {editingExt ? t('save') : t('addingExtension')}
                        </Button>
                    </div>
                </form>
            </ModalWrapper>

        </div >
    );
};
