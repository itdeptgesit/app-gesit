"use client"

import * as React from "react"
import {
  Popover as RACPopover,
  PopoverProps as RACPopoverProps,
  OverlayArrow,
  composeRenderProps,
  Dialog,
} from "react-aria-components"
import { tv } from "tailwind-variants"
import { twMerge } from "tailwind-merge"

const popoverVariants = tv({
  base: "z-50 min-w-80 rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/5 dark:ring-white/10 outline-none",
  variants: {
    isEntering: {
      true: "animate-in fade-in zoom-in-95 duration-200 ease-out",
    },
    isExiting: {
      true: "animate-out fade-out zoom-out-95 duration-150 ease-in",
    },
    placement: {
      top: "mb-2",
      bottom: "mt-2",
      left: "mr-2",
      right: "ml-2",
      "bottom start": "mt-2",
      "bottom end": "mt-2",
      "top start": "mb-2",
      "top end": "mb-2",
      "left start": "mr-2",
      "left end": "mr-2",
      "right start": "ml-2",
      "right end": "ml-2",
      center: "",
    },
  },
})

export interface PopoverProps extends Omit<RACPopoverProps, "children"> {
  showArrow?: boolean
  className?: string
  children: React.ReactNode
}

export function Popover({
  className,
  showArrow,
  children,
  ...props
}: PopoverProps) {
  return (
    <RACPopover
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        popoverVariants({
          ...renderProps,
          placement: renderProps.placement || undefined,
          className,
        })
      )}
    >
      {showArrow && (
        <OverlayArrow className="group">
          <svg
            width={12}
            height={12}
            viewBox="0 0 12 12"
            className="block fill-popover stroke-border stroke-1"
          >
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
      )}
      <Dialog className="outline-none">
        {children}
      </Dialog>
    </RACPopover>
  )
}

export { Popover as PopoverContent }
