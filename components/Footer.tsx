
'use client';

import React from 'react';
import { useLanguage } from '../translations';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-4 px-8 border-t border-border bg-background transition-colors duration-300 z-10">
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            © {year} The Gesit Companies. GESIT PORTAL™. All rights reserved.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{t('systemOnline')}</span>
          </div>
          <span className="w-px h-3 bg-border"></span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">V 4.1.2-STABLE</span>
        </div>
      </div>
    </footer>
  );
};

