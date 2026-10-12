'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface DangerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  isLoading?: boolean;
  entityName?: string; // for confirmation typing
  confirmText?: string;
  /**
   * Variant determines visual theme.
   * 'danger' (default) – clean ShadCN Alert Dialog styling with dark button.
   * 'logout' – blue theme confirm button.
   */
  variant?: 'danger' | 'logout';
}

export const DangerConfirmModal: React.FC<DangerConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading,
  entityName,
  confirmText,
  variant = 'danger',
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  const isConfirmDisabled = isLoading || (entityName ? inputValue !== entityName : false);
  const buttonText = confirmText || (variant === 'logout' ? 'Log out' : 'Delete');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
      <DialogContent showCloseButton={false} className="sm:max-w-[480px] p-6 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col space-y-2 text-left">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50 leading-tight">
            {title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 leading-normal font-normal">
            {message}
          </p>
        </div>

        {entityName && (
          <div className="space-y-2 my-4">
            <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Please type <span className="font-bold text-slate-900 dark:text-zinc-50">{entityName}</span> to confirm.
            </div>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={entityName}
              className="h-9 border-slate-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
              autoFocus
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setInputValue('');
              onClose();
            }}
            disabled={isLoading}
            className="text-xs font-semibold h-9 px-4 rounded-md text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`text-xs font-semibold h-9 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${
              variant === 'logout'
                ? 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 border border-blue-600 dark:border-blue-500'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 border border-zinc-900 dark:border-zinc-50'
            }`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
