"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { APP_MENU_STRUCTURE } from "@/constants"
import { ArrowRight } from "lucide-react"

interface GlobalSearchProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  userRole?: string;
  userGroups?: string[];
}

export function GlobalSearch({
  open,
  setOpen,
  userRole,
  userGroups = [],
}: GlobalSearchProps) {
  const navigate = useNavigate()

  const roleLower = (userRole || "").trim().toLowerCase();
  const isSuperAdmin = roleLower === "super admin" || roleLower === "super_admin" || roleLower === "superadmin";
  const isAdmin = isSuperAdmin || roleLower === "admin";
  const canAccessHR = isAdmin || userGroups.some((g) => ["hr", "hrd", "employee-data"].includes(g.toLowerCase().trim()));
  const canAccessAdmin = isAdmin || userGroups.some((g) => ["admin", "it_management"].includes(g.toLowerCase().trim()));

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const mainMenus = APP_MENU_STRUCTURE.filter((m) => !m.parentId);

  const adminMenus = canAccessAdmin
    ? APP_MENU_STRUCTURE.filter((m) => m.parentId === "admin")
    : [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="General">
          {mainMenus.map((menu) => (
            <CommandItem
              key={menu.id}
              value={menu.label}
              onSelect={() =>
                runCommand(() =>
                  navigate(menu.id === "dashboard" ? "/" : `/${menu.id}`)
                )
              }
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <span>{menu.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Administration">
          {adminMenus.map((menu) => (
            <CommandItem
              key={menu.id}
              value={menu.label} // Value used for search matching
              onSelect={() => runCommand(() => navigate(`/${menu.id}`))}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <span>{menu.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
