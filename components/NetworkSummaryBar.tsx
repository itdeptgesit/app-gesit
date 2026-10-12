'use client';

import React from 'react';
import { Server, Router, Wifi, Video, Monitor, Printer, Phone, HardDrive, CheckCircle, Clock, Wrench, XCircle } from 'lucide-react';
import { NetworkSwitch } from '../types';

interface NetworkSummaryBarProps {
    switches: NetworkSwitch[];
}

export const NetworkSummaryBar: React.FC<NetworkSummaryBarProps> = ({ switches }) => {
    const summary = React.useMemo(() => {
        const stats = {
            total: switches.length,
            byType: {} as Record<string, number>,
            byStatus: {
                active: 0,
                spare: 0,
                maintenance: 0,
                decommissioned: 0
            }
        };

        switches.forEach(sw => {
            const type = sw.model || 'Unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            const status = (sw.status || 'active') as string;
            if (status in stats.byStatus) {
                stats.byStatus[status as keyof typeof stats.byStatus]++;
            }
        });

        return stats;
    }, [switches]);

    const getTypeIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('router') || t.includes('mikrotik')) return Router;
        if (t.includes('access point') || t.includes('ap') || t.includes('wifi')) return Wifi;
        if (t.includes('cctv') || t.includes('camera') || t.includes('nvr')) return Video;
        if (t.includes('pc') || t.includes('computer')) return Monitor;
        if (t.includes('printer')) return Printer;
        if (t.includes('phone')) return Phone;
        if (t.includes('server')) return HardDrive;
        return Server;
    };

    const topTypes = Object.entries(summary.byType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-sm mb-8 relative overflow-hidden">
      {/* Decorative Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

      {/* Header with Total Count */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 relative z-10">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            NetVision Intelligence <span className="text-blue-500 font-bold">.</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">Sentralisasi manajemen infrastruktur IT & monitoring real-time</p>
        </div>
        <div className="flex items-center gap-4 bg-blue-500/[0.04] border border-blue-500/20 rounded-xl px-8 py-5 shadow-sm">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Server size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Total Assets</div>
            <div className="text-3xl font-bold text-foreground leading-none">{summary.total}</div>
          </div>
        </div>
      </div>

      {/* Status Distribution Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Online', count: summary.byStatus.active, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Spare', count: summary.byStatus.spare, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Maintenance', count: summary.byStatus.maintenance, icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
          { label: 'Out of Order', count: summary.byStatus.decommissioned, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' }
        ].map((item) => (
          <div key={item.label} className="bg-muted/50 border border-border/60 p-5 rounded-xl flex items-center gap-4 transition-colors">
            <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground leading-none mb-1.5">{item.label}</div>
              <div className="text-2xl font-bold text-foreground leading-none">{item.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Device Type Breakdown */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-border/60 flex-1" />
          <h3 className="text-xs font-medium text-muted-foreground">Hardware Taxonomy Distribution</h3>
          <div className="h-px bg-border/60 flex-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {topTypes.map(([type, count]) => {
            const Icon = getTypeIcon(type);
            return (
              <div key={type} className="group bg-card border border-border/60 rounded-xl p-4 flex flex-col items-center gap-3 hover:bg-muted/40 transition-colors cursor-default">
                <div className="w-10 h-10 bg-muted/50 border border-border/60 text-foreground/70 group-hover:bg-blue-500 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                  <Icon size={18} />
                </div>
                <div className="text-center w-full">
                  <div className="text-xl font-bold text-foreground leading-none mb-1.5">{count}</div>
                  <div className="text-xs font-medium text-muted-foreground truncate px-1">{type}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

