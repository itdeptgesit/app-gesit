import React from 'react';
import { LayoutDashboard, Wallet, Cpu } from 'lucide-react';

export type DashboardMode = 'overview' | 'finance' | 'technical';

interface DashboardModeSwitcherProps {
    mode: DashboardMode;
    onChange: (mode: DashboardMode) => void;
}

export const DashboardModeSwitcher: React.FC<DashboardModeSwitcherProps> = ({ mode, onChange }) => {
    const modes = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'finance', label: 'Finance', icon: Wallet },
        { id: 'technical', label: 'Technical', icon: Cpu },
    ];

    return (
        <div className="flex p-1 bg-slate-100 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700/50 w-fit">
            {modes.map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.id;
                return (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id as DashboardMode)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-slate-300'
                            }`}
                    >
                        <Icon size={16} />
                        <span className="hidden sm:inline">{m.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

