import React, { useState } from 'react';
import { UserAccount } from '../types';
import { CSLDashboard } from './CSLDashboard';
import { TaskplusDashboard } from './TaskplusDashboard';
import { LayoutDashboard, Briefcase } from 'lucide-react';

interface HomeDashboardProps {
  currentUser: UserAccount | null;
  userName?: string;
  userRole?: string;
  onNavigate: (path: string) => void;
}

const IT_GROUPS = ['it', 'it_staff', 'it_management', 'support', 'admin'];
const CSL_FULL = ['csl_admin', 'csl_staff', 'csl_management'];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ currentUser, userName, userRole, onNavigate }) => {
  const groups = (currentUser?.groups || []).map(g => g.toLowerCase());
  const role = (currentUser?.role || '').toLowerCase();
  const isSuper = role === 'super admin' || role === 'super_admin';

  const hasIT = isSuper || groups.some(g => IT_GROUPS.includes(g));
  const hasCSL = isSuper || groups.some(g => CSL_FULL.includes(g));
  const canSwitch = hasIT && hasCSL;

  const [view, setView] = useState<'it' | 'csl'>(hasCSL && !hasIT ? 'csl' : 'it');

  const switchButton = canSwitch ? (
    <div className="flex justify-center pt-4">
      <div className="inline-flex items-center gap-1 rounded-full border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView('it')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            view === 'it'
              ? 'bg-primary text-primary-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard size={14} />
          IT Dashboard
        </button>
        <button
          type="button"
          onClick={() => setView('csl')}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            view === 'csl'
              ? 'bg-primary text-primary-foreground shadow'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Briefcase size={14} />
          CSL Dashboard
        </button>
      </div>
    </div>
  ) : null;

  const content =
    view === 'it' ? (
      <TaskplusDashboard onNavigate={onNavigate} userName={userName} userRole={userRole} currentUser={currentUser} />
    ) : (
      <CSLDashboard currentUser={currentUser} onNavigate={onNavigate} />
    );

  return (
    <>
      {switchButton}
      {content}
    </>
  );
};