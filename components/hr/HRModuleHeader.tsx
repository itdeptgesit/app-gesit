import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const HRModuleHeader: React.FC<{ eyebrow: string; title: string; description: string; action?: React.ReactNode }> = ({ eyebrow, title, description, action }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#976954] dark:text-[#BC9C33]">{eyebrow}</div>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    {action || <ArrowUpRight className="text-muted-foreground/60" size={18} />}
  </div>
);

export default HRModuleHeader;
