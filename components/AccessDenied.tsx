'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft, LifeBuoy, Lock, Mail, ChevronRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAccount } from '../types';

interface AccessDeniedProps {
  moduleName?: string;
  description?: string;
  requiredAccess?: string;
  currentUser: UserAccount | null;
  onBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  moduleName = 'Halaman Ini',
  description = 'Anda tidak memiliki hak akses untuk membuka halaman ini.',
  requiredAccess = 'Administrator atau Human Resources (HR)',
  currentUser,
  onBack
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const userRole = currentUser?.role || 'User';
  const userGroups = currentUser?.groups || [];

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-400">
      <Card className="max-w-xl w-full border-border/70 shadow-xl overflow-hidden bg-card/95 backdrop-blur-sm">
        {/* Top Header Glow Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Icon & Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-[10px] font-bold uppercase tracking-wider">
                  Akses Terbatas
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  403 Forbidden
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
                Tidak Memiliki Izin Akses
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Halaman <b className="text-foreground">{moduleName}</b> dilindungi dan memerlukan otorisasi khusus. {description}
          </p>

          {/* User & Access Details Box */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Akun Pengguna</span>
              <span className="font-semibold text-foreground text-right">
                {currentUser?.fullName || 'Pengguna'} <span className="text-muted-foreground font-normal">({currentUser?.email || '-'})</span>
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Role Saat Ini</span>
              <Badge variant="outline" className="text-[11px] font-semibold">
                {userRole}
              </Badge>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Akses Diperlukan</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 text-right">
                {requiredAccess}
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <span className="text-muted-foreground font-medium">Grup Terdaftar</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {userGroups.length > 0 ? (
                  userGroups.map((g) => (
                    <span key={g} className="px-2 py-0.5 rounded-md bg-background border border-border text-[11px] text-muted-foreground">
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground italic">Tidak ada grup tambahan</span>
                )}
              </div>
            </div>
          </div>

          {/* Guidance note */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Jika Anda memerlukan akses ke modul ini untuk keperluan tugas pekerjaan, silakan ajukan permohonan hak akses kepada <b>Administrator IT</b> atau <b>Tim HR</b> melalui tiket Helpdesk.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="w-full sm:w-auto text-xs font-semibold gap-1.5"
            >
              <ArrowLeft size={14} /> Kembali ke Beranda
            </Button>

            <Button
              onClick={() => navigate('/helpdesk')}
              className="w-full sm:w-auto text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LifeBuoy size={14} /> Minta Akses via Helpdesk <ChevronRight size={14} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
