'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import { useLanguage } from '../translations';
import { supabase } from '../lib/supabaseClient';
import { NotificationItem, UserGroup } from '../types';
import { useTheme } from "next-themes";

// LUCIDE ICONS
import {
  Bell,
  LogOut,
  Moon,
  Sun,
  Palette,
  Circle,
  Sparkles,
  User,
  CreditCard,
  Globe,
  Check,
  Search,
  Settings,
} from "lucide-react";

// SHADCN COMPONENTS
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalSearch } from "./global-search";

interface HeaderProps {
  onMenuClick?: () => void;
  onLogout?: () => void;
  onNavigate?: (view: string) => void;
  currentView?: string;
  userGroups?: string[];
  userRole?: string;
  groupDefinitions?: UserGroup[];
  user?: {
    id?: string | number;
    name: string;
    role: string;
    email?: string;
    jobTitle?: string;
    avatarUrl?: string;
  };
  appName?: string;
  logoUrl?: string;
  forceShowLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLogout, onNavigate,
  user, userRole, userGroups = [],
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [themeColor, setThemeColor] = useState<string>('default');

  const isAdmin = userRole === 'Admin' || userGroups.some(g => g.toLowerCase() === 'admin');

  const userName = user?.name || 'User';

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    const saved = localStorage.getItem('theme-color');
    if (saved) {
      setThemeColor(saved);
      document.documentElement.classList.add(`theme-${saved}`);
    }
  }, []);

  const changeThemeColor = (color: string) => {
    document.documentElement.classList.remove('theme-green', 'theme-rose', 'theme-orange', 'theme-default');
    if (color !== 'default') {
      document.documentElement.classList.add(`theme-${color}`);
    }
    setThemeColor(color);
    localStorage.setItem('theme-color', color);
  };

  const toggleTheme = (e: React.MouseEvent) => {
    const isDarkCurrent = resolvedTheme === 'dark';
    if (!document.startViewTransition) {
      setTheme(isDarkCurrent ? 'light' : 'dark');
      return;
    }
    document.documentElement.style.setProperty('--click-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--click-y', `${e.clientY}px`);
    document.startViewTransition(() => {
      flushSync(() => {
        setTheme(isDarkCurrent ? 'light' : 'dark');
      });
    });
  };

  useEffect(() => {
    if (!user?.email) return;
    const userEmail = user.email.toLowerCase();
    const mapNotification = (n: any): NotificationItem => ({
      id: n.id,
      userId: n.user_id || n.user_email,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read ?? false,
      createdAt: n.created_at,
      link: n.link
    });
    const fetchNotifications = async () => {
      let query = supabase.from('notifications').select('*');
      if (user?.id && userEmail) {
        query = query.or(`user_id.eq.${user.id},user_email.ilike.${userEmail}`);
      } else if (user?.id) {
        query = query.eq('user_id', user.id);
      } else if (userEmail) {
        query = query.ilike('user_email', userEmail);
      } else {
        return;
      }
      const { data } = await query.order('created_at', { ascending: false }).limit(20);
      if (data) setNotifications(data.map(mapNotification));
    };
    fetchNotifications();
    const channel = supabase.channel(`notifications:${user?.id || userEmail}`).on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const n = payload.new;
        if (n.user_id === user?.id || (userEmail && n.user_email?.toLowerCase() === userEmail)) {
          const mapped = mapNotification(n);
          setNotifications(prev => [mapped, ...prev].slice(0, 20));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.email]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const email = user.email?.toLowerCase();
    let query = supabase.from('notifications').update({ is_read: true });
    if (user.id && email) query = query.or(`user_id.eq.${user.id},user_email.ilike.${email}`);
    else if (user.id) query = query.eq('user_id', user.id);
    else if (email) query = query.ilike('user_email', email);
    else return;
    const { error } = await query.eq('is_read', false);
    if (!error) setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    const email = user.email?.toLowerCase();
    let query = supabase.from('notifications').delete();
    if (user.id && email) {
      query = query.or(`user_id.eq.${user.id},user_email.ilike.${email}`);
    } else if (user.id) {
      query = query.eq('user_id', user.id);
    } else if (email) {
      query = query.ilike('user_email', email);
    } else {
      return;
    }
    
    const { error } = await query;
    if (!error) setNotifications([]);
    setIsNotificationOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const themeColors = [
    { id: 'default', label: 'Default', className: 'fill-indigo-500 text-indigo-500' },
    { id: 'green', label: 'Green', className: 'fill-emerald-500 text-emerald-500' },
    { id: 'rose', label: 'Rose', className: 'fill-rose-500 text-rose-500' },
    { id: 'orange', label: 'Orange', className: 'fill-orange-500 text-orange-500' },
  ];

  return (
    <div className="z-50 h-16 header-fixed peer/header w-full bg-transparent transition-all duration-300">
      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} userRole={userRole} userGroups={userGroups} />
      <div className="relative flex h-full items-center gap-2 py-4 px-0">

        {/* Search \u2014 takes remaining space */}
        <div className="flex-1 min-w-0">
          {/* Mobile Search Icon */}
          <Button
            variant="outline"
            size="icon"
            className="flex sm:hidden h-9 w-9 bg-muted/50 text-muted-foreground border-none rounded-xl"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Desktop Search Button \u2014 capped width so right-side icons fit */}
          <Button
            variant="outline"
            className="hidden sm:flex w-full max-w-[240px] lg:max-w-sm justify-between bg-muted/50 text-sm font-normal text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <div className="flex items-center min-w-0">
              <Search className="mr-2 h-4 w-4 shrink-0" />
              <span className="hidden lg:inline-flex truncate">Search command or menus...</span>
              <span className="inline-flex lg:hidden truncate">Search...</span>
            </div>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex shrink-0 ml-2">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Right-side actions \u2014 always visible, never shrink */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Language Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="w-8 text-muted-foreground/60 hover:text-foreground" />}>
              <Globe className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuItem onClick={() => setLanguage('en' as any)}>
                English
                {language === 'en' && <Check className="ml-auto size-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('id' as any)}>
                Indonesia
                {language === 'id' && <Check className="ml-auto size-4 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <Tooltip>
              <TooltipTrigger render={
                <DropdownMenuTrigger render={
                  <Button variant="ghost" size="icon" className="relative w-8 text-muted-foreground/60 hover:text-foreground" />
                } />
              }>
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 block h-1.5 w-1.5 rounded-full bg-rose-500" />
                )}
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" sideOffset={8} className="w-[320px] p-0">
              <div className="px-4 py-3 flex justify-between items-center border-b border-border/10 bg-muted/20">
                <h3 className="text-[13px] font-medium text-foreground">Notifications</h3>
                <div className="flex gap-3">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={clearAllNotifications} className="text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors">
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">Everything caught up!</div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { markAsRead(n.id); if (n.link) onNavigate?.(n.link); setIsNotificationOpen(false); }}
                        className="px-4 py-3 flex items-start gap-3 hover:bg-accent/30 cursor-pointer transition-colors border-b border-border/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 border border-border/10">
                          <span className="text-[10px] font-bold text-foreground">
                            {n.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-normal text-foreground truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-normal">{n.message}</p>
                        </div>
                        {!n.isRead && <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>



          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 text-muted-foreground/60 hover:text-foreground"
            onClick={toggleTheme}
          >
            <Moon className="size-4 block" />
            <Sun className="size-4 hidden" />
          </Button>

          {/* User Avatar & Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="h-9 w-9 p-0 hover:ring-2 hover:ring-muted rounded-full ml-1">
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-border/20 shadow-sm flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-bold">
                    {user?.avatarUrl && !avatarError ? (
                      <img src={user.avatarUrl} alt={userName} className="h-full w-full object-cover" onError={() => setAvatarError(true)} />
                    ) : (
                      userName
                        .split(' ')
                        .map((p) => p.charAt(0))
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    )}
                  </div>
                </Button>
              }
            />
            <DropdownMenuContent align="end" sideOffset={12} className="w-64 p-2">
              <div className="flex flex-col gap-1 px-2 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1.5">
                  {user?.role || 'USER'}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-bold text-foreground leading-tight">{userName}</span>
                  <span className="truncate text-[11px] font-medium text-muted-foreground/70 mt-0.5">{user?.email}</span>
                </div>
              </div>
              <DropdownMenuSeparator className="my-2 opacity-50" />
              <DropdownMenuGroup className="space-y-1">
                <DropdownMenuItem 
                  render={<Link to="/profile" className="flex w-full items-center gap-2" />} 
                  className="rounded-xl px-3 py-2.5 cursor-pointer"
                >
                  <User size={16} className="text-muted-foreground" />
                  <span className="text-[13px] font-semibold">{t('profile')}</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem 
                    render={<Link to="/system-settings" className="flex w-full items-center gap-2" />} 
                    className="rounded-xl px-3 py-2.5 cursor-pointer"
                  >
                    <Settings size={16} className="text-muted-foreground" />
                    <span className="text-[13px] font-semibold">{t('settings')}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-2 opacity-50" />
              <DropdownMenuItem 
                onClick={() => onLogout?.()} 
                variant="destructive"
                className="rounded-xl px-3 py-2.5 focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut size={16} />
                <span className="text-[13px] font-bold">{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div> {/* end right-side actions */}
      </div>
    </div>
  );
};
