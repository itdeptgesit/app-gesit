"use client"

import { Link, useLocation } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Types
export interface NavItem {
  title: string
  url: string
  icon?: React.ComponentType<any>
  isActive?: boolean
  items?: NavSubItem[]
}

export interface NavSubItem {
  title: string
  url: string
  icon?: React.ComponentType<any>
}

interface NavGroupProps {
  title?: string
  items: NavItem[]
  onNavigate?: (id: string) => void
}

export function NavGroup({ title, items, onNavigate }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const location = useLocation()
  const href = location.pathname

  return (
    <SidebarGroup>
      {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${item.url}`

          // No sub-items: simple link
          if (!item.items || item.items.length === 0)
            return (
              <SidebarMenuLink
                key={key}
                item={item}
                href={href}
                onNavigate={onNavigate}
              />
            )

          // Collapsed sidebar: show dropdown
          if (state === "collapsed" && !isMobile)
            return (
              <SidebarMenuCollapsedDropdown
                key={key}
                item={item}
                href={href}
                onNavigate={onNavigate}
              />
            )

          // Expanded sidebar: show collapsible
          return (
            <SidebarMenuCollapsible
              key={key}
              item={item}
              href={href}
              onNavigate={onNavigate}
            />
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function SidebarMenuLink({
  item,
  href,
  onNavigate,
}: {
  item: NavItem
  href: string
  onNavigate?: (id: string) => void
}) {
  const { setOpenMobile } = useSidebar()
  const isActive = checkIsActive(href, item)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isActive}
        render={
          <Link
            to={item.url}
            onClick={() => {
              setOpenMobile(false)
              onNavigate?.(item.url.replace("/", "") || "dashboard")
            }}
          />
        }
      >
        {item.icon && <item.icon className="size-4" />}
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
  onNavigate,
}: {
  item: NavItem
  href: string
  onNavigate?: (id: string) => void
}) {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenuItem>
      <Collapsible
        defaultOpen={checkIsActive(href, item, true)}
        className="group/collapsible"
      >
        <CollapsibleTrigger
          render={<SidebarMenuButton tooltip={item.title} />}
        >
          {item.icon && <item.icon className="size-4" />}
          <span>{item.title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {item.items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={checkIsActive(href, subItem)}
                  render={
                    <Link
                      to={subItem.url}
                      onClick={() => {
                        setOpenMobile(false)
                        onNavigate?.(subItem.url.replace("/", ""))
                      }}
                    />
                  }
                >
                  {subItem.icon && <subItem.icon className="size-4" />}
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
  onNavigate,
}: {
  item: NavItem
  href: string
  onNavigate?: (id: string) => void
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              tooltip={item.title}
              isActive={checkIsActive(href, item)}
            />
          }
        >
          {item.icon && <item.icon className="size-4" />}
          <span>{item.title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {item.title}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {item.items?.map((sub) => (
            <DropdownMenuItem
              key={`${sub.title}-${sub.url}`}
              onClick={() => onNavigate?.(sub.url.replace("/", ""))}
            >
              <Link
                to={sub.url}
                className={`flex items-center gap-2 w-full ${checkIsActive(href, sub) ? "bg-secondary" : ""}`}
              >
                {sub.icon && <sub.icon className="size-4" />}
                <span className="max-w-52 text-wrap">{sub.title}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(
  href: string,
  item: { url: string; items?: { url: string }[] },
  mainNav = false
) {
  return (
    href === item.url ||
    href.split("?")[0] === item.url ||
    !!item?.items?.filter((i) => href === i.url || href.startsWith(i.url + "?")).length ||
    (mainNav &&
      href.split("/")[1] !== "" &&
      (href.split("/")[1] === item?.url?.split("/")[1] ||
       href.startsWith(item?.url?.split("?")[0] + "-")))
  )
}
