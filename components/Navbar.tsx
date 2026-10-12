'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    LayoutGrid, LifeBuoy, Activity, Calendar, ShoppingCart, Package,
    Network, Folder, Shield, ChevronDown, Users, Building2,
    Briefcase, Layers, Zap, Phone, Settings, Megaphone
} from 'lucide-react';
import { APP_MENU_STRUCTURE } from '../constants';
import { UserGroup } from '../types';
import { useLanguage } from '../translations';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

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
    Settings: Settings,
    Megaphone: Megaphone
};

interface NavbarProps {
    currentView: string;
    userGroups: string[];
    userRole?: string;
    groupDefinitions: UserGroup[];
}

export const Navbar: React.FC<NavbarProps> = ({
    currentView, userGroups = [], userRole, groupDefinitions = []
}) => {
    const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
    const { t } = useLanguage();
    const navRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setActiveSubMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allowedMenuIds = useMemo(() => {
        const allowed = new Set<string>();
        const role = userRole?.toLowerCase() || '';

        console.log("Navbar: userRole:", userRole, "role:", role, "groups:", userGroups);

        // Only Super Admin gets full access; Admin/Staff/User are driven by groups
        if (role === 'super admin' || role === 'super_admin') {
            APP_MENU_STRUCTURE.forEach(m => allowed.add(m.id));
            return allowed;
        }

        if (!userGroups || userGroups.length === 0) {
            allowed.add('dashboard');
            return allowed;
        }
        userGroups.forEach(groupId => {
            const groupConfig = groupDefinitions?.find(g => g.id === groupId);
            if (groupConfig?.allowedMenus) {
                groupConfig.allowedMenus.forEach(menuId => allowed.add(menuId));
            } else if (APP_MENU_STRUCTURE.some(m => m.id === groupId)) {
                allowed.add(groupId);
            }
        });

        // Also ensure that if any child is allowed, the parent is also allowed
        APP_MENU_STRUCTURE.forEach(menu => {
            if (menu.parentId && allowed.has(menu.id)) {
                allowed.add(menu.parentId);
            }
        });

        return allowed;
    }, [userGroups, groupDefinitions, userRole]);

    const menuItems = useMemo(() => {
        const parents = APP_MENU_STRUCTURE.filter(m => !m.parentId);
        return parents.map(parent => {
            if (!allowedMenuIds.has(parent.id)) return null;
            const children = APP_MENU_STRUCTURE.filter(m => m.parentId === parent.id);
            const allowedChildren = children.filter(child => allowedMenuIds.has(child.id));

            const getLabel = (id: string, defaultLabel: string) => {
                const key = id.replace(/-(.)/g, (_, c) => c.toUpperCase()) as any;
                return t(key) || defaultLabel;
            };

            return {
                id: parent.id,
                label: getLabel(parent.id, parent.label),
                icon: ICON_MAP[parent.iconName] || LayoutGrid,
                subItems: allowedChildren.length > 0 ? allowedChildren.map(c => ({
                    id: c.id,
                    label: getLabel(c.id, c.label),
                    icon: ICON_MAP[c.iconName]
                })) : undefined
            };
        }).filter(Boolean);
    }, [allowedMenuIds, t]);

    return (
        <div
            className="w-full bg-white/70 dark:bg-[#020617]/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-zinc-800/50 sticky top-16 z-40 transition-all hidden md:flex justify-center py-3.5 px-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-none"
            ref={navRef}
        >
            <nav className="flex items-center gap-3 max-w-[1400px] w-full">
                <LayoutGroup>
                    {menuItems.map((item: any) => {
                        const hasSub = !!item.subItems;
                        const Icon = item.icon;
                        const path = item.id === 'dashboard' ? '/' : `/${item.id}`;

                        if (hasSub) {
                            const isSubActive = item.subItems?.some((s: any) => currentView === s.id);
                            return (
                                <div key={item.id} className="relative flex flex-col items-center shrink-0">
                                    <motion.button
                                        onClick={() => setActiveSubMenu(activeSubMenu === item.id ? null : item.id)}
                                        className={`relative flex items-center gap-3 px-6 py-3 rounded-xl text-[11px] font-bold transition-colors duration-300 tracking-tight whitespace-nowrap z-10
                                            ${isSubActive
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        {isSubActive && (
                                            <motion.div
                                                layoutId="nav-pill"
                                                className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/40 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.2)] ring-1 ring-blue-500/20 rounded-xl z-[-1]"
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <Icon size={20} className={`${isSubActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'} transition-colors duration-300`} strokeWidth={isSubActive ? 2.5 : 2} />
                                        <span>{item.label}</span>
                                        <ChevronDown size={12} className={`transition-transform duration-300 ${activeSubMenu === item.id ? 'rotate-180' : ''} ${isSubActive ? 'opacity-100' : 'opacity-40'}`} />
                                    </motion.button>

                                    <AnimatePresence>
                                        {activeSubMenu === item.id && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-[calc(100%+8px)] left-0 w-64 bg-white dark:bg-[#0f172a] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-zinc-800 py-3 z-50 overflow-hidden ring-1 ring-slate-900/5"
                                            >
                                                <div className="flex flex-col gap-0.5 px-1.5">
                                                    {item.subItems.map((sub: any) => (
                                                        <NavLink
                                                            key={sub.id}
                                                            to={`/${sub.id}`}
                                                            onClick={() => setActiveSubMenu(null)}
                                                            className={({ isActive }) => `w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[11px] font-bold transition-all duration-200 tracking-tight
                                                                ${isActive
                                                                    ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/30'
                                                                    : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'}`}
                                                        >
                                                            {sub.icon && <sub.icon size={16} className={currentView === sub.id ? 'text-blue-600' : 'opacity-40'} />}
                                                            {sub.label}
                                                        </NavLink>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        }

                        return (
                            <div key={item.id} className="relative flex flex-col items-center shrink-0">
                                <NavLink
                                    to={path}
                                    className={({ isActive }) => `relative flex items-center gap-3 px-6 py-3 rounded-xl text-[11px] font-bold transition-colors duration-300 tracking-tight whitespace-nowrap z-10
                                        ${isActive
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    {({ isActive }) => (
                                        <>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="nav-pill"
                                                    className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/40 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.2)] ring-1 ring-blue-500/20 rounded-xl z-[-1]"
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                />
                                            )}
                                            <Icon size={20} className={`${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'} transition-colors duration-300`} strokeWidth={isActive ? 2.5 : 2} />
                                            <span>{item.label}</span>
                                        </>
                                    )}
                                </NavLink>
                            </div>
                        );
                    })}
                </LayoutGroup>
            </nav>
        </div>
    );
};

