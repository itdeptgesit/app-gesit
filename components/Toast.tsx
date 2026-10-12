'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const configs = {
        success: {
            icon: <CheckCircle2 size={18} />,
            bg: 'bg-emerald-500',
            border: 'border-emerald-400/20',
            text: 'text-white'
        },
        error: {
            icon: <XCircle size={18} />,
            bg: 'bg-rose-500',
            border: 'border-rose-400/20',
            text: 'text-white'
        },
        info: {
            icon: <Info size={18} />,
            bg: 'bg-blue-500',
            border: 'border-blue-400/20',
            text: 'text-white'
        },
        warning: {
            icon: <AlertTriangle size={18} />,
            bg: 'bg-amber-500',
            border: 'border-amber-400/20',
            text: 'text-white'
        }
    };

    const config = configs[type];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl shadow-black/10 border ${config.bg} ${config.border} ${config.text} min-w-[320px] max-w-md`}
        >
            <div className="shrink-0 p-1.5 bg-white/20 rounded-lg">
                {config.icon}
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold tracking-tight leading-tight">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-all opacity-60 hover:opacity-100"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};
