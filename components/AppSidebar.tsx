import * as React from "react"
import {
    LayoutGrid, LifeBuoy, Activity, Calendar, ShoppingCart, Package,
    Network, Folder, Shield, Users, Building2,
    Briefcase, Layers, Zap, Phone,
    Settings, Megaphone, ChevronRight, Key,
    Star, Compass, UserCircle, Download
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    useSidebar
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { APP_MENU_STRUCTURE } from '../constants';
import { UserAccount, UserGroup } from '../types';
import { useLanguage } from '../translations';
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
    LayoutDashboard: Compass,
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
    Megaphone: Megaphone,
    Key: Key,
    User: UserCircle
};

interface NavigationSidebarProps {
    currentUser: UserAccount | null;
    groupDefinitions: UserGroup[];
    onLogout: () => void;
    appName?: string;
    logoUrl?: string;
}

export function NavigationSidebar({
    currentUser,
    groupDefinitions,
    onLogout,
}: NavigationSidebarProps) {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const allowedMenuIds = React.useMemo(() => {
        const allowed = new Set<string>();
        const role = currentUser?.role?.toLowerCase() || '';
        const userGroups = currentUser?.groups || [];

        if (role === 'super admin' || role === 'super_admin') {
            APP_MENU_STRUCTURE.forEach(m => allowed.add(m.id));
            return allowed;
        }

        if (userGroups.length === 0) {
            ['helpdesk', 'asset-loan', 'extension-directory', 'profile'].forEach(id => allowed.add(id));
            return allowed;
        }

        userGroups.forEach(groupId => {
            const groupConfig = groupDefinitions?.find(g => g.id === groupId);
            if (groupConfig && Array.isArray(groupConfig.allowedMenus)) {
                groupConfig.allowedMenus.forEach(menuId => allowed.add(menuId));
            } else if (APP_MENU_STRUCTURE.some(m => m.id === groupId)) {
                allowed.add(groupId);
            }
        });

        APP_MENU_STRUCTURE.forEach(menu => {
            if (menu.parentId && allowed.has(menu.id)) allowed.add(menu.parentId);
        });

        return allowed;
    }, [currentUser, groupDefinitions]);

    const buildMenuItems = React.useCallback((parentId?: string) => {
        const allMenus = APP_MENU_STRUCTURE;
        return allMenus
            .filter(m => m.parentId === parentId && allowedMenuIds.has(m.id))
            .map(m => ({
                id: m.id,
                title: t(m.id.replace(/-(.)/g, (_: string, c: string) => c.toUpperCase()) as any) || m.label,
                url: m.id === 'dashboard' ? '/' : `/${m.id}`,
                icon: ICON_MAP[m.iconName] || LayoutGrid,
                children: allMenus
                    .filter(c => c.parentId === m.id && allowedMenuIds.has(c.id))
                    .map(c => ({
                        id: c.id,
                        title: t(c.id.replace(/-(.)/g, (_: string, c: string) => c.toUpperCase()) as any) || c.label,
                        url: `/${c.id}`,
                    }))
            }));
    }, [allowedMenuIds, t]);

    const mainItems = React.useMemo(() =>
        buildMenuItems(undefined).filter(m => m.id !== 'admin'),
        [buildMenuItems]
    );

    const adminItem = React.useMemo(() => {
        if (!allowedMenuIds.has('admin')) return null;
        const adminMenu = APP_MENU_STRUCTURE.find(m => m.id === 'admin');
        if (!adminMenu) return null;
        return {
            id: 'admin',
            title: t('administration' as any) || "Administration",
            url: "/admin",
            icon: Shield,
            children: APP_MENU_STRUCTURE
                .filter(c => c.parentId === 'admin' && allowedMenuIds.has(c.id))
                .map(c => ({
                    id: c.id,
                    title: t(c.id.replace(/-(.)/g, (_: string, c: string) => c.toUpperCase()) as any) || c.label,
                    url: `/${c.id}`,
                }))
        };
    }, [allowedMenuIds, t]);

    const isPathActive = (url: string) => {
        if (url === '/') return location.pathname === '/';
        return location.pathname === url || location.pathname.startsWith(url + '/');
    };

    const renderNavItem = (item: any) => {
        const IconComp = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        const isActive = isPathActive(item.url) ||
            (hasChildren && item.children.some((c: any) => isPathActive(c.url)));

        if (hasChildren) {
            return (
                <SidebarMenuItem key={item.id}>
                    <Collapsible
                        defaultOpen={isActive}
                        className="group/collapsible"
                    >
                        <CollapsibleTrigger
                            render={
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    isActive={isActive}
                                    className={cn(
                                        "text-[13px] font-normal",
                                        isActive
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                />
                            }
                        >
                            {IconComp && <IconComp size={15} strokeWidth={1.3} />}
                            <span>{item.title}</span>
                            <ChevronRight
                                size={13}
                                strokeWidth={1.5}
                                className="ml-auto shrink-0 opacity-40 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                            />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.children.map((child: any) => {
                                    const isChildActive = isPathActive(child.url);
                                    return (
                                        <SidebarMenuSubItem key={child.id}>
                                            <SidebarMenuSubButton
                                                isActive={isChildActive}
                                                render={<NavLink to={child.url} />}
                                                className={cn(
                                                    "text-[13px] font-normal",
                                                    isChildActive
                                                        ? "bg-white dark:bg-sidebar-accent text-foreground border border-border/10"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                                                )}
                                            >
                                                {child.title}
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    );
                                })}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </Collapsible>
                </SidebarMenuItem>
            );
        }

        // Leaf item — navigate programmatically to avoid asChild issues
        return (
            <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    onClick={() => navigate(item.url)}
                    className={cn(
                        "text-[13px] font-normal cursor-pointer",
                        isActive
                            ? "bg-white dark:bg-sidebar-accent text-foreground border border-border/10"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {IconComp && <IconComp size={15} strokeWidth={1.3} />}
                    <span>{item.title}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    };

    return (
        <Sidebar variant="inset" collapsible="icon" className="border-none">
            {/* ── Header: Logo + Name ── */}
            <SidebarHeader className="h-14 flex flex-row items-center px-4 border-none">
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md overflow-hidden">
                                            <img src="/image/logo-white.png" alt="Gesit Logo" className="h-full w-full object-contain" />
                                        </div>
                    {!isCollapsed && (
                        <span className="truncate text-[14px] font-semibold tracking-tight text-foreground">
                            Gesit Portal
                        </span>
                    )}
                </div>
            </SidebarHeader>

            {/* ── Content ── */}
            <SidebarContent className="px-2 py-3 gap-0 overflow-x-hidden">
                <SidebarGroup className="p-0 mb-4">
                    {!isCollapsed && (
                        <SidebarGroupLabel className="px-2 mb-1 h-auto text-[11px] font-normal text-muted-foreground/40 tracking-wide">
                            Main
                        </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
                            {mainItems.map(renderNavItem)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {adminItem && (
                    <SidebarGroup className="p-0">
                        {!isCollapsed && (
                            <SidebarGroupLabel className="px-2 mb-1 h-auto text-[11px] font-normal text-muted-foreground/40 tracking-wide">
                                Components
                            </SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-0.5">
                                {renderNavItem(adminItem)}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            {/* ── Footer: Download button ── */}
            <SidebarFooter className="p-0" />
        </Sidebar>
    );
}
