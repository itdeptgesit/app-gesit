'use client';

import React, { useState, useEffect } from 'react';
import { Database, Wifi, Server, HardDrive, Activity, CheckCircle2, AlertTriangle, XCircle, Zap } from 'lucide-react';
import { runAllHealthChecks, calculateOverallStatus, HealthCheckResult } from '../utils/HealthCheckUtils';

interface SystemHealthMonitorProps {
    className?: string;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ className = '' }) => {
    const [services, setServices] = useState<HealthCheckResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Run health checks on mount and periodically
    useEffect(() => {
        const performHealthChecks = async () => {
            const results = await runAllHealthChecks();
            setServices(results);
            setIsLoading(false);
        };

        // Initial check
        performHealthChecks();

        // Update every 10 seconds
        const interval = setInterval(performHealthChecks, 10000);

        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return CheckCircle2;
            case 'degraded': return AlertTriangle;
            case 'down': return XCircle;
        }
    };

    const getStatusColor = (status: HealthCheckResult['status']) => {
        switch (status) {
            case 'operational': return {
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                text: 'text-emerald-600 dark:text-emerald-400',
                icon: 'text-emerald-500',
                pulse: 'bg-emerald-500'
            };
            case 'degraded': return {
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20',
                text: 'text-amber-600 dark:text-amber-400',
                icon: 'text-amber-500',
                pulse: 'bg-amber-500'
            };
            case 'down': return {
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20',
                text: 'text-rose-600 dark:text-rose-400',
                icon: 'text-rose-500',
                pulse: 'bg-rose-500'
            };
        }
    };

    const getServiceIcon = (name: string) => {
        switch (name) {
            case 'Database': return Database;
            case 'API Server': return Server;
            case 'Network': return Wifi;
            case 'Storage': return HardDrive;
            default: return Activity;
        }
    };

    const overallStatus = services.length > 0 ? calculateOverallStatus(services) : 'operational';
    const averageUptime = services.length > 0
        ? (services.reduce((sum, s) => sum + s.uptime, 0) / services.length).toFixed(2)
        : '0.00';

    if (isLoading) {
        return (
            <div className={`space-y-4 animate-in fade-in duration-500 ${className}`}>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl animate-pulse">
                        <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            System Health
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Checking system status...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 animate-in fade-in duration-500 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl">
                        <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            System Health
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Real-time infrastructure monitoring
                        </p>
                    </div>
                </div>

                {/* Overall Status Badge */}
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${getStatusColor(overallStatus).bg} ${getStatusColor(overallStatus).border}`}>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(overallStatus).pulse} animate-pulse`} />
                    <span className={`text-xs font-semibold ${getStatusColor(overallStatus).text}`}>
                        {overallStatus === 'operational' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Degraded Performance' : 'System Down'}
                    </span>
                </div>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((service) => {
                    const StatusIcon = getStatusIcon(service.status);
                    const ServiceIcon = getServiceIcon(service.name);
                    const colors = getStatusColor(service.status);

                    return (
                        <div
                            key={service.name}
                            className={`${colors.bg} ${colors.border} border rounded-2xl p-5 transition-colors`}
                        >
                            {/* Service Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2.5 rounded-xl bg-muted/50 border border-border/60 ${colors.text} shadow-sm`}>
                                    <ServiceIcon size={20} strokeWidth={2.5} />
                                </div>
                                <StatusIcon size={18} className={colors.icon} />
                            </div>

                            {/* Service Name */}
                            <h3 className="font-semibold text-foreground mb-1">
                                {service.name}
                            </h3>

                            {/* Uptime */}
                            <div className="flex items-baseline gap-2 mb-3">
                                <span className={`text-2xl font-bold ${colors.text}`}>
                                    {service.uptime.toFixed(1)}%
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                    Uptime
                                </span>
                            </div>

                            {/* Response Time */}
                            <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-muted-foreground font-medium">
                                    Response Time
                                </span>
                                <span className={`font-semibold ${colors.text}`}>
                                    {Math.round(service.responseTime)}ms
                                </span>
                            </div>

                            {/* Uptime Bar */}
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${colors.pulse} transition-all duration-500`}
                                    style={{ width: `${service.uptime}%` }}
                                />
                            </div>

                            {/* Last Checked */}
                            <div className="mt-2 text-xs text-muted-foreground">
                                Updated {service.lastChecked.toLocaleTimeString()}
                            </div>

                            {/* Error Details (if any) */}
                            {service.details && service.status !== 'operational' && (
                                <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 truncate" title={service.details}>
                                    {service.details}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary Stats */}
            <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            Average Uptime
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                            {averageUptime}%
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            Services Online
                        </div>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {services.filter(s => s.status === 'operational').length}/{services.length}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                            Status
                        </div>
                        <div className={`text-xl font-bold ${getStatusColor(overallStatus).text}`}>
                            {overallStatus.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

