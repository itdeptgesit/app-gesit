"use client"

import * as React from "react"
import { useLocation } from "react-router-dom"
import {
  useSidebar,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavGroup, type NavItem } from "@/components/nav-group"
import { NavUser } from "@/components/nav-user"
import { APP_MENU_STRUCTURE } from "../constants"
import { UserAccount, UserGroup } from "../types"
import { useLanguage } from "../translations"

// LUCIDE ICONS
import {
  Home,
  HelpCircle,
  Activity,
  Calendar,
  ShoppingCart,
  Package,
  Server,
  FolderOpen,
  Shield,
  Users,
  Building2,
  Briefcase,
  Layers,
  Zap,
  Phone,
  Settings,
  Megaphone,
  Key,
  User,
  LayoutGrid,
  LayoutDashboard,
  Receipt,
  ArrowLeftRight,
  FileCheck,
  Fingerprint,
  History,
  Scale,
  CheckSquare,
BarChart2,
  BarChart3,
  PieChart,
  FileBarChart,
  Kanban,
  Wallet,
  Coins,
  Store,
  Landmark,
  BookOpen,
  MoreHorizontal,
  CreditCard,
  PhoneCall,
  Clock,
  Timer,
  MapPin,
  FileText,
  MonitorCog,
  Network as NetworkIcon,
} from "lucide-react"

// Section groupings
const CSL_IDS = ['csl-requests', 'routine', 'budget', 'reports']
const IT_IDS  = ['it-operations', 'it-payment', 'it-assets', 'tv-meeting-rooms']
const DIRECTORY_IDS = ['directory-external', 'extension-directory', 'office-layout']

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  LayoutDashboard: LayoutDashboard,
  Home: Home,
  LifeBuoy: HelpCircle,
  Activity: Activity,
  Calendar: Calendar,
  ShoppingCart: ShoppingCart,
  Cpu: Package,
  Network: NetworkIcon,
  Server: Server,
  FolderOpen: FolderOpen,
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
  User: User,
  Receipt: Receipt,
  ArrowLeftRight: ArrowLeftRight,
  FileCheck: FileCheck,
  Fingerprint: Fingerprint,
  History: History,
  Scale: Scale,
  CheckSquare: CheckSquare,
  BarChart2: BarChart2,
  BarChart3: BarChart3,
  PieChart: PieChart,
  FileBarChart: FileBarChart,
  Kanban: Kanban,
  Wallet: Wallet,
  Coins: Coins,
  Store: Store,
  Landmark: Landmark,
  BookOpen: BookOpen,
  MoreHorizontal: MoreHorizontal,
  CreditCard: CreditCard,
  Clock: Clock,
  Timer: Timer,
  PhoneCall: PhoneCall,
  FileText: FileText,
  MapPin: MapPin,
  MonitorCog: MonitorCog,
}

interface AppSidebarProps {
  currentUser: UserAccount | null
  groupDefinitions: UserGroup[]
  onLogout: () => void
  onNavigate?: (view: string) => void
  appName?: string
  logoUrl?: string
}

export function AppSidebarModern({
  currentUser,
  groupDefinitions,
  onLogout,
  onNavigate,
  appName = "Gesit Portal",
  logoUrl = "/image/logo.png",
}: AppSidebarProps) {
  const { t } = useLanguage()
  const location = useLocation()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const allowedMenuIds = React.useMemo(() => {
    const allowed = new Set<string>()
    const role = (currentUser?.role || "").trim().toLowerCase()
    const userGroups = currentUser?.groups || []

    // Only Super Admin gets full access; Admin/Staff/User are driven by groups
    if (role === "super admin" || role === "super_admin" || role === "superadmin") {
      APP_MENU_STRUCTURE.forEach((m) => allowed.add(m.id))
      return allowed
    }

    if (userGroups.length > 0) {
      userGroups.forEach((g) => {
        if (g === "dashboard") allowed.add("dashboard")
        if (g === "req_view" || g === "requests_view" || g === "csl-requests") {
          allowed.add("csl-requests"); allowed.add("csl-all-requests"); allowed.add("csl-my-requests"); allowed.add("csl-categories")
        }
        if (g === "req_submit" || g === "requests_create") {
          allowed.add("csl-requests")
        }
        if (g === "routine_view" || g === "routine") {
          allowed.add("routine"); allowed.add("routine-activity"); allowed.add("routine-task"); allowed.add("routine-timeline"); allowed.add("routine-monitoring")
        }
        if (g === "budget" || g === "budget_view") {
          allowed.add("budget"); allowed.add("budget-expense"); allowed.add("budget-offshore-invoice"); allowed.add("budget-report")
        }
        if (g === "directory" || g === "directory_view") {
          allowed.add("directory-external")
        }
        if (g === "reports" || g === "reports_view") {
          allowed.add("reports"); allowed.add("reports-request"); allowed.add("reports-task"); allowed.add("reports-budget")
        }
        if (g === "users" || g === "user_accounts") {
          allowed.add("users");
        }
      })

      userGroups.forEach((groupId) => {
        const groupConfig = groupDefinitions?.find((g) => g.id === groupId)
        if (groupConfig && Array.isArray(groupConfig.allowedMenus)) {
          groupConfig.allowedMenus.forEach((menuId) => allowed.add(menuId))
        } else if (APP_MENU_STRUCTURE.some((m) => m.id === groupId)) {
          allowed.add(groupId)
        }
      })

      allowed.add("profile")

      APP_MENU_STRUCTURE.forEach((menu) => {
        if (menu.parentId && allowed.has(menu.id)) allowed.add(menu.parentId)
      })

      // When parent attendance is allowed, allow all attendance sub-pages
      if (allowed.has('attendance')) {
        APP_MENU_STRUCTURE.forEach((menu) => {
          if (menu.parentId === 'attendance') allowed.add(menu.id)
        })
      }

      if (allowed.size > 0) return allowed
    }

    // Role-based defaults if no custom group assigned
    if (role === "staff") {
      [
        "dashboard", "it-operations", "helpdesk", "activity", "weekly", "network",
        "it-payment", "purchase", "purchase-record",
        "it-assets", "assets", "asset-loan", "asset-handover", "files", "extension-directory", "office-layout", "tv-meeting-rooms", "attendance", "profile", "users"
      ].forEach((id) => allowed.add(id))
      return allowed
    }

    // Standard user fallback
    ["dashboard", "helpdesk", "asset-loan", "extension-directory", "office-layout", "attendance", "csl-requests", "profile"].forEach((id) =>
      allowed.add(id)
    )

    APP_MENU_STRUCTURE.forEach((menu) => {
      if (menu.parentId && allowed.has(menu.id)) allowed.add(menu.parentId)
    })

    // When parent attendance is allowed, allow all attendance sub-pages
    if (allowed.has('attendance')) {
      APP_MENU_STRUCTURE.forEach((menu) => {
        if (menu.parentId === 'attendance') allowed.add(menu.id)
      })
    }

    return allowed
  }, [currentUser, groupDefinitions])

  // Helper: build NavItems from a list of top-level IDs
  const buildItems = React.useCallback((ids: string[]): NavItem[] => {
    const allMenus = APP_MENU_STRUCTURE
    return ids
      .filter((id) => allowedMenuIds.has(id))
      .map((id) => {
        const m = allMenus.find((x) => x.id === id)
        if (!m) return null
        return {
          title: t(m.id.replace(/-(.)/g, (_: string, c: string) => c.toUpperCase()) as any) || m.label,
          url: m.id === "dashboard" ? "/" : `/${m.id}`,
          icon: ICON_MAP[m.iconName] || LayoutGrid,
          isActive: m.id === "dashboard"
            ? location.pathname === "/"
            : location.pathname === `/${m.id}` || location.pathname.startsWith(`/${m.id}-`),
          items: allMenus
            .filter((c) => c.parentId === m.id && allowedMenuIds.has(c.id))
            .map((c) => ({
              title: t(c.id.replace(/-(.)/g, (_: string, ch: string) => ch.toUpperCase()) as any) || c.label,
              url: `/${c.id}`,
              icon: ICON_MAP[c.iconName] || LayoutGrid,
            })),
        } as NavItem
      })
      .filter(Boolean) as NavItem[]
  }, [allowedMenuIds, t, location.pathname])

  const mainItems      = buildItems(['dashboard'])
  const cslItems       = buildItems(CSL_IDS)
  const itItems        = buildItems(IT_IDS)
  const directoryItems = buildItems(DIRECTORY_IDS)

  const adminItems: NavItem[] = React.useMemo(() => {
    const allMenus = APP_MENU_STRUCTURE
    const adminNode = allMenus.find((m) => m.id === "admin")
    if (!adminNode || !allowedMenuIds.has("admin")) return []

    return [
      {
        title: t('settingsAndSetup') || "Administration",
        url: "/admin",
        icon: ICON_MAP[adminNode.iconName] || LayoutGrid,
        isActive: false,
        items: allMenus
          .filter((c) => c.parentId === "admin" && allowedMenuIds.has(c.id))
          .map((c) => ({
            title:
              t(
                c.id.replace(/-(.)/g, (_: string, ch: string) =>
                  ch.toUpperCase()
                ) as any
              ) || c.label,
            url: `/${c.id}`,
            icon: ICON_MAP[c.iconName] || LayoutGrid,
          })),
      },
    ]
  }, [allowedMenuIds, t])

  const userData = currentUser
    ? {
        name: currentUser.fullName,
        email: currentUser.email,
        avatar: currentUser.avatarUrl || "",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "",
      }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary/10">
                <img src={logoUrl} alt={appName} className="size-5 object-contain" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">{appName}</span>
                <span className="truncate text-[11px] text-sidebar-foreground/50">Enterprise Portal</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {mainItems.length > 0      && <NavGroup items={mainItems} />}
        {cslItems.length > 0       && <NavGroup title="CSL" items={cslItems} />}
        {itItems.length > 0        && <NavGroup title="IT" items={itItems} />}
        {directoryItems.length > 0 && <NavGroup title="Office & Directory" items={directoryItems} />}
        {adminItems.length > 0     && <NavGroup title="Administration" items={adminItems} />}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userData} onLogout={onLogout} onNavigate={onNavigate} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
