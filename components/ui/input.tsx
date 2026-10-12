import * as React from "react"
import { 
    Input as RACInput, 
    InputProps as RACInputProps,
    composeRenderProps
} from "react-aria-components"

import { cn } from "@/lib/utils"

interface InputProps extends RACInputProps {
    className?: string
}

function Input({ className, type, ...props }: InputProps) {
  return (
    <RACInput
      type={type}
      className={composeRenderProps(className, (className, renderProps) => 
        cn(
          "h-9 w-full min-w-0 rounded-xl border border-input bg-input/30 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:border-zinc-700 px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          renderProps.isFocused && "border-ring ring-[3px] ring-ring/50",
          renderProps.isInvalid && "border-destructive ring-destructive/20",
          className
        )
      )}
      {...props}
    />
  )
}

export { Input }
