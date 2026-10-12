"use client"

import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Disclosure,
  DisclosurePanel,
  Button as RACButton,
  Link as RACLink,
  Text,
} from "react-aria-components"
import { tv } from "tailwind-variants"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/ui/button"

// ADOBE SPECTRUM ICONS
import ChevronRight from "@spectrum-icons/workflow/ChevronRight"

const navItemVariants = tv({
  base: "group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-all outline-none",
  variants: {
    isActive: {
      true: "bg-accent font-bold shadow-sm text-accent-foreground",
      false: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    },
  },
})

export function NavMain({
  items,
  label = "Platform"
}: {
  items: {
      title: string
      url: string
      icon: React.ComponentType<any>
      isActive?: boolean
      items?: {
        title: string
        url: string
      }[]
    }[],
  label?: string
}) {
  const location = useLocation()

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      {label && (
        <div className="px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-widest">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const isItemActive = location.pathname === item.url || item.items?.some(sub => location.pathname === sub.url)
          
          if (!item.items?.length) {
            return (
              <NavLink 
                key={item.title} 
                to={item.url}
                className={({ isActive }) => navItemVariants({ isActive })}
              >
                {Icon && <Icon size="S" />}
                <span className="truncate">{item.title}</span>
              </NavLink>
            )
          }

          return (
            <Disclosure key={item.title} defaultExpanded={isItemActive}>
              <div className="flex flex-col gap-1">
                <RACButton
                  slot="trigger"
                  className={({ isHovered }) => twMerge(
                    navItemVariants({ isActive: isItemActive }),
                    isHovered && "bg-accent/50 text-foreground"
                  )}
                >
                  {Icon && <Icon size="S" />}
                  <span className="truncate flex-1">{item.title}</span>
                  <span className="transition-transform duration-200 group-expanded:rotate-90 text-muted-foreground/50">
                    <ChevronRight size="S" />
                  </span>
                </RACButton>
                <DisclosurePanel className="flex flex-col gap-1 ml-4 border-l border-border/50 pl-2">
                  {item.items.map((subItem) => (
                    <NavLink
                      key={subItem.title}
                      to={subItem.url}
                      className={({ isActive }) => twMerge(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] transition-all",
                        isActive 
                          ? "bg-accent/40 text-foreground font-semibold" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{subItem.title}</span>
                    </NavLink>
                  ))}
                </DisclosurePanel>
              </div>
            </Disclosure>
          )
        })}
      </div>
    </div>
  )
}
