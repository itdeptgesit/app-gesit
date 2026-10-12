'use client';

import React from 'react';

const getAvatarColor = (name: string) => {
    const colors = [
        'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
        'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500', 'bg-fuchsia-500',
        'bg-orange-500', 'bg-teal-500'
    ];
    let hash = 0;
    const cleanName = (name || 'System').trim();
    for (let i = 0; i < cleanName.length; i++) {
        hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

interface UserAvatarProps {
    name: string;
    url?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, url, size = 'sm', className = '' }) => {
    const fallbackColor = getAvatarColor(name);
    const initial = (name || 'S').trim().charAt(0).toUpperCase();

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg'
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden border border-white/10 ring-2 ring-slate-100/50 dark:ring-white/5 shrink-0 ${url ? 'bg-slate-100' : fallbackColor} ${className}`}>
            {url ? (
                <img src={url} alt="" aria-hidden="true" className="w-full h-full object-cover" />
            ) : initial}
        </div>
    );
};
