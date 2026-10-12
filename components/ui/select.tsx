"use client"

import * as React from "react"
import {
  Select as RACSelect,
  SelectValue as RACSelectValue,
  SelectProps as RACSelectProps,
  Button as RACButton,
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  ListBoxItemProps as RACListBoxItemProps,
  composeRenderProps,
} from "react-aria-components"
import { Key } from "@react-types/shared"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon } from "lucide-react"
import { Popover } from "./popover"

export interface SelectProps<T extends object, V = any> extends Omit<RACSelectProps<T>, 'children'> {
  label?: string
  description?: string
  errorMessage?: string
  children: React.ReactNode | ((item: T) => React.ReactNode)
  placeholder?: string
  className?: string
  disabled?: boolean
}

function Select<T extends object, V = any>({
  children,
  defaultValue,
  value,
  onValueChange,
  disabled,
  defaultSelectedKey,
  selectedKey,
  onSelectionChange,
  isDisabled,
  className,
  ...props
}: SelectProps<T, V> & {
  defaultValue?: V
  value?: V
  onValueChange?: (value: V) => void
  disabled?: boolean
}) {
  // Map traditional props to RAC props
  const finalDefaultKey = (defaultSelectedKey ?? defaultValue) as Key | undefined;
  const finalKey = (selectedKey ?? value) as Key | undefined;
  const finalIsDisabled = isDisabled ?? disabled;
  
  const handleSelectionChange = (key: Key) => {
    onSelectionChange?.(key);
    onValueChange?.(key as V);
  };

  return (
    <RACSelect
      {...props}
      defaultSelectedKey={finalDefaultKey}
      selectedKey={finalKey}
      onSelectionChange={handleSelectionChange}
      isDisabled={finalIsDisabled}
      className={cn("group flex flex-col gap-2", className)}
    >
      {children as React.ReactNode}
    </RACSelect>
  )
}

function SelectItem<T extends Key>({ className, value, children, ...props }: { value: T } & Omit<RACListBoxItemProps<any>, 'value'>) {
  // Wrap the key in an object for RAC ListBoxItem
  const itemValue = React.useMemo(() => ({ key: value }), [value]);
  return (
    <RACListBoxItem
      {...props}
      id={value}
      value={itemValue}
      textValue={String(children)}
      className={composeRenderProps(className, (className, renderProps) => cn(
        "relative flex w-full cursor-default items-center gap-2.5 rounded-xl py-2 pr-8 pl-3 text-sm outline-none select-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        "disabled:opacity-50 disabled:pointer-events-none",
        "group-selected:font-bold",
        className
      ))}
    >
      {composeRenderProps(children, (children, renderProps) => (
        <>
          <span className="flex-1 truncate">
            {children}
          </span>
          {renderProps.isSelected && (
            <span className="absolute right-2 flex size-4 items-center justify-center">
              <CheckIcon size={14} className="text-primary" />
            </span>
          )}
        </>
      ))}
    </RACListBoxItem>
  )
}

// --- Modular Components for Backward Compatibility ---

function SelectTrigger({ className, children, ...props }: any) {
  return (
    <RACButton 
      {...props}
      className={composeRenderProps(className, (className, renderProps) => cn(
        "flex h-9 items-center justify-between gap-2.5 rounded-xl border border-input bg-input/30 px-3 py-2 text-sm transition-all outline-none [&>span]:line-clamp-1",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:hover:bg-input/50",
        renderProps.isPressed && "scale-[0.98]",
        className
      ))}
    >
      {children}
      <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
    </RACButton>
  )
}

function SelectContent({ className, children, ...props }: any) {
  return (
    <Popover {...props} className={cn("min-w-[--trigger-width]", className)}>
        <RACListBox className="outline-none p-1">
          {children}
        </RACListBox>
    </Popover>
  )
}

const SelectValueInternal = RACSelectValue;

interface SelectValueProps {
  placeholder?: string
  className?: string
}

function SelectValue({ placeholder, className, ...props }: SelectValueProps & Omit<React.ComponentProps<typeof RACSelectValue>, 'placeholder'>) {
  const RACSelectValueAny = RACSelectValue as any;
  return (
    <RACSelectValueAny
      {...props}
      placeholder={placeholder || "Select an option"}
      className={cn("text-sm text-muted-foreground", className)}
    />
  )
}

const SelectRoot = RACSelect;
const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectLabel = ({ children, className }: any) => (
  <header className={cn("px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest", className)}>
    {children}
  </header>
);

export { 
    Select, 
    SelectItem,
    SelectTrigger,
    SelectContent,
    SelectValue,
    SelectRoot,
    SelectGroup,
    SelectLabel
}
