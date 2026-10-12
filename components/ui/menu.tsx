"use client"

import * as React from "react"
import {
  Menu as RACMenu,
  MenuItem as RACMenuItem,
  MenuProps as RACMenuProps,
  MenuItemProps as RACMenuItemProps,
  MenuTrigger as RACMenuTrigger,
  composeRenderProps,
  Text,
  Header,
  Separator,
  Section,
} from "react-aria-components"
import { tv } from "tailwind-variants"
import { twMerge } from "tailwind-merge"
import { Popover } from "./popover"
import { ChevronRight } from "lucide-react"

const menuVariants = tv({
  base: "outline-none p-1 max-h-[inherit] overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none",
})

const itemVariants = tv({
  base: [
    "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none cursor-default select-none transition-colors",
    "focus:bg-accent focus:text-accent-foreground",
    "disabled:opacity-50 disabled:pointer-events-none",
  ],
  variants: {
    variant: {
      default: "text-foreground",
      destructive: "text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export function MenuTrigger(props: React.ComponentProps<typeof RACMenuTrigger>) {
  return <RACMenuTrigger {...props} />
}

export interface MenuProps<T> extends RACMenuProps<T> {
  className?: string
}

export function Menu<T extends object>({ className, ...props }: MenuProps<T>) {
  return (
    <RACMenu
      {...props}
      className={composeRenderProps(className, (className) =>
        menuVariants({ className })
      )}
    />
  )
}

export interface MenuItemProps extends RACMenuItemProps {
  variant?: "default" | "destructive"
}

export function MenuItem({ className, variant, ...props }: MenuItemProps) {
  return (
    <RACMenuItem
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        itemVariants({
          variant,
          className: twMerge(
            className,
            renderProps.isFocused && "bg-accent text-accent-foreground"
          ),
        })
      )}
    />
  )
}

export function MenuSeparator(props: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      {...props}
      className={twMerge("-mx-1 my-1 h-px bg-border/50", props.className)}
    />
  )
}

export function MenuHeader(props: React.ComponentProps<typeof Header>) {
  return (
    <Header
      {...props}
      className={twMerge(
        "px-3 py-2 text-xs font-semibold text-muted-foreground",
        props.className
      )}
    />
  )
}

export function MenuSection<T extends object>(props: React.ComponentProps<typeof Section<T>>) {
  return <Section {...props} />
}

export { RACMenuTrigger as DropdownMenu }
