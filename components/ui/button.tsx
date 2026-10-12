import * as React from "react"
import { 
    Button as RACButton, 
    ButtonProps as RACButtonProps,
    composeRenderProps 
} from "react-aria-components"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 shadow",
        outline:
          "border-border bg-input/30 hover:bg-input/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:active:bg-white/5 text-foreground dark:text-white/90 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 gap-2",
        xs: "h-7 px-2 text-xs gap-1",
        sm: "h-8 px-3 text-xs gap-1.5",
        lg: "h-10 px-8 gap-2",
        icon: "h-9 w-9",
        "icon-xs": "h-6 w-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends Omit<RACButtonProps, 'render'>, VariantProps<typeof buttonVariants> {
    className?: string
    disabled?: boolean // Compatibility with old API
    title?: string // Standard HTML title attribute
    type?: "submit" | "reset" | "button" // Standard HTML type
    render?: React.ReactElement | ((props: any) => React.ReactNode)
}

function Button({
  className,
  variant = "default",
  size = "default",
  disabled,
  isDisabled,
  render,
  ...props
}: ButtonProps) {
  const finalIsDisabled = isDisabled ?? disabled;

  // Convert Element-based render to Function-based for RAC compatibility
  const finalRender = React.isValidElement(render)
    ? (domProps: any) => React.cloneElement(render as React.ReactElement, domProps)
    : render;

  return (
    <RACButton
      {...props}
      render={finalRender as any}
      isDisabled={finalIsDisabled}
      className={composeRenderProps(className, (className, renderProps) => 
        cn(buttonVariants({ variant, size, className }),
        renderProps.isFocusVisible && "ring-2 ring-ring ring-offset-2",
        renderProps.isPressed && "scale-[0.98]"
      ))}
    />
  )
}

export { Button, buttonVariants }
