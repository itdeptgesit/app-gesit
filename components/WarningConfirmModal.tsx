'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

interface WarningConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export const WarningConfirmModal: React.FC<WarningConfirmModalProps> = ({
  isOpen, onClose, onConfirm, title, message, isLoading, confirmText = 'Lanjutkan', cancelText = 'Batal'
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[440px] p-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-xl border-none shadow-2xl z-[200]">
        <div className="p-8">
          <div className="flex flex-col">
            <div className="mb-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
            </div>

            <div className="text-xs font-medium text-slate-500 dark:text-zinc-400 leading-relaxed mb-6">
              {message}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-full border border-slate-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all flex-1"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all flex-1 flex items-center justify-center gap-2 shadow-lg bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 shadow-zinc-900/10 dark:shadow-none"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" strokeWidth={3} />}
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
