'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Bell, Menu, ChevronDown, LogOut, User, Sun, Moon,
    LayoutGrid,
    LifeBuoy, Activity, Calendar, ShoppingCart, Package, Network, Folder,
    Shield, Users, Building2, Briefcase, Layers, Zap, Phone, Megaphone,
    X, Share2, Home, Settings, Github, Search, Mic, Plus
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useLanguage } from '../translations';
import { supabase } from '../lib/supabaseClient';
import { NotificationItem, UserGroup } from '../types';
import { APP_MENU_STRUCTURE } from '../constants';

const ICON_MAP: Record<string, React.ElementType> = {
    LayoutDashboard: LayoutGrid,
    LifeBuoy: LifeBuoy,
    Activity: Activity,
    Calendar: Calendar,
    ShoppingCart: ShoppingCart,
    Cpu: Package,
    Network: Network,
    FolderOpen: Folder,
    Shield: Shield,
    Users: Users,
    Building2: Building2,
    Briefcase: Briefcase,
    Layers: Layers,
    Zap: Zap,
    Phone: Phone,
    Settings: Megaphone,
    Megaphone: Megaphone
};

interface TopNavigationProps {
    onMenuClick: () => void;
    onLogout?: () => void;
    userGroups?: string[];
    userRole?: string;
    groupDefinitions?: UserGroup[];
    user?: {
        name: string;
        role: string;
        email?: string;
        id?: number | string;
        jobTitle?: string;
        avatarUrl?: string;
    };
    appName?: string;
    logoUrl?: string;
    variant?: 'admin' | 'public';
    searchProps?: {
        value: string;
        onChange: (val: string) => void;
    };
    floorFilter?: 'All' | 26 | 27;
    onFloorFilterChange?: (floor: 'All' | 26 | 27) => void;
    onShare?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
    onMenuClick, onLogout,
    userGroups = [], userRole, groupDefinitions = [],
    user, appName = 'TASKPLUS', logoUrl,
    variant = 'admin', searchProps,
    floorFilter = 'All', onFloorFilterChange, onShare
}) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const { language, setLanguage, t } = useLanguage();

    const navigate = useNavigate();
    const location = useLocation();
    const currentView = location.pathname.substring(1) || 'dashboard';

    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);

    const userName = user?.name || 'User';
    const LOGO_URL = "/image/logo.png";

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setIsNotificationOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user) return;
        const fetchNotifications = async () => {
            let query = supabase.from('notifications').select('*');
            const email = user.email?.toLowerCase();

            if (user.id && email) {
                query = query.or(`user_id.eq.${user.id},user_email.ilike.${email}`);
            } else if (user.id) {
                query = query.eq('user_id', user.id);
            } else if (email) {
                query = query.ilike('user_email', email);
            } else {
                return;
            }

            const { data } = await query.order('created_at', { ascending: false }).limit(10);
            if (data) setNotifications(data.map((n: any) => ({
                id: n.id, 
                userId: n.user_id || n.user_email, 
                title: n.title, 
                message: n.message, 
                type: n.type, 
                isRead: n.is_read, 
                createdAt: n.created_at, 
                link: n.link
            })));
        };
        fetchNotifications();
    }, [user?.email, user?.id]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (!error) setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // ─── Get Breadcrumb Label ───────────────────────────────────────────
    const getBreadcrumb = () => {
        if (currentView === 'dashboard' || currentView === '') return 'Dashboard';
        const menu = APP_MENU_STRUCTURE.find(m => m.id === currentView);
        if (menu) {
            const key = menu.id.replace(/-(.)/g, (_, c) => c.toUpperCase()) as any;
            const translated = t(key);
            return (translated && translated !== key) ? translated : menu.label;
        }
        return currentView.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    // ─── Get current date ───────────────────────────────────────────────
    const formattedDate = new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="sticky top-0 z-50 flex flex-col w-full">
            {/* HEADER */}
            {variant === 'public' ? (
                // PUBLIC VARIANT
                <header className="relative z-20 h-16 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-6 md:px-8 flex items-center justify-between transition-all">
                    <NavLink to="/" className="flex items-center gap-3 group shrink-0">
                        <div className="w-9 h-9 flex items-center justify-center">
                            <img src="/image/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                TASKPLUS <span className="text-blue-600">Directory</span>
                            </h1>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium tracking-wider uppercase">Internal Registry</p>
                        </div>
                    </NavLink>

                    <div className="flex items-center gap-4 ml-8">
                        <NavLink
                            to="/helpdesk"
                            className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all ${isActive ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <LifeBuoy size={14} />
                            Helpdesk
                        </NavLink>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden md:flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg border border-slate-200 dark:border-zinc-700">
                            <LayoutGroup id="floor-filter">
                                {['All', 27, 26].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => onFloorFilterChange?.(f as any)}
                                        className={`relative px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors duration-200 z-10 ${floorFilter === f ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        {floorFilter === f && (
                                            <motion.div
                                                layoutId="active-pill"
                                                className="absolute inset-0 bg-white dark:bg-slate-700 shadow-sm rounded-md z-[-1]"
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        {f === 'All' ? 'ALL' : `${f}F`}
                                    </button>
                                ))}
                            </LayoutGroup>
                        </div>

                        <button onClick={onShare} aria-label="Share page" className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Share">
                            <Share2 size={16} />
                        </button>
                        <button onClick={toggleTheme} aria-label="Toggle light/dark theme" className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </div>
                </header>
            ) : (
                <header className="relative z-20 h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-6 flex items-center justify-between gap-6 transition-all">
                    {/* Left: Mobile menu + Search */}
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={onMenuClick} aria-label="Toggle navigation menu" className="md:hidden p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            <Menu size={20} />
                        </button>

                        <div className="relative flex-1 max-w-md group">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-10 pr-12 py-2 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-bold text-slate-400">
                                <span>⌘</span>
                                <span className="text-[11px]">+</span>
                                <span>K</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-1">
                        {/* Theme Toggle */}
                        <button onClick={toggleTheme} aria-label="Toggle dark mode" className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Notifications */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                aria-label="Notifications"
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all relative rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                                )}
                            </button>
                            <AnimatePresence>
                                {isNotificationOpen && (
                                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-800 overflow-hidden z-[100]">
                                        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100 dark:border-zinc-800">
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                                            {unreadCount > 0 && <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-semibold rounded-full">{unreadCount} New</span>}
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="py-10 text-center">
                                                    <Bell size={20} className="text-slate-300 mx-auto mb-2" />
                                                    <p className="text-xs text-slate-400">No notifications</p>
                                                </div>
                                            ) : notifications.map(n => (
                                                <div key={n.id} onClick={() => { markAsRead(n.id); if (n.link) navigate(n.link); setIsNotificationOpen(false); }} className={`px-4 py-3 border-b border-slate-50 dark:border-zinc-800/50 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}>
                                                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white mb-0.5">{n.title}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2">{n.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2" />

                        {user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-700">
                                            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 font-semibold text-xs">{userName.substring(0, 2).toUpperCase()}</div>}
                                        </div>
                                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-[1.5px] border-white dark:border-slate-900"></div>
                                    </div>
                                    <div className="hidden md:flex flex-col text-left">
                                        <span className="text-sm font-semibold text-slate-800 dark:text-white leading-none">{userName}</span>
                                        <span className="text-[11px] text-slate-400 mt-0.5">{user?.email || ''}</span>
                                    </div>
                                    <ChevronDown size={14} className={`hidden md:block text-slate-300 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                            className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-800 overflow-hidden z-[100]"
                                        >
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{user?.role || 'Operator'}</p>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
                                            </div>
                                            <div className="p-1.5">
                                                <button onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                    <User size={16} className="text-slate-400" />
                                                    Account Info
                                                </button>
                                                <button onClick={() => { onLogout?.(); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all">
                                                    <LogOut size={16} />
                                                    Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <NavLink
                                to="/login"
                                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[12px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-2"
                            >
                                <Zap size={14} />
                                ACCESS PORTAL
                            </NavLink>
                        )}
                    </div>
                </header>
            )}
        </div>
    );
};

