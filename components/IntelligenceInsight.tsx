'use client';

import React from 'react';
import {
    Lightbulb, AlertTriangle, TrendingUp, Shield, CheckCircle2,
    Info, AlertCircle, ChevronRight, Sparkles
} from 'lucide-react';
import { Insight } from '../utils/IntelligenceUtils';

interface IntelligenceInsightProps {
    insight: Insight;
}

export const IntelligenceInsight: React.FC<IntelligenceInsightProps> = ({ insight }) => {
    // Type-based styling
    const typeStyles = {
        info: {
            bg: 'bg-blue-500/[0.04]',
            border: 'border-blue-500/20',
            icon: 'text-blue-600 dark:text-blue-400',
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            text: 'text-blue-900 dark:text-blue-100'
        },
        success: {
            bg: 'bg-emerald-500/[0.04]',
            border: 'border-emerald-500/20',
            icon: 'text-emerald-600 dark:text-emerald-400',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            text: 'text-emerald-900 dark:text-emerald-100'
        },
        warning: {
            bg: 'bg-amber-500/[0.04]',
            border: 'border-amber-500/20',
            icon: 'text-amber-600 dark:text-amber-400',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            text: 'text-amber-900 dark:text-amber-100'
        },
        critical: {
            bg: 'bg-rose-500/[0.04]',
            border: 'border-rose-500/20',
            icon: 'text-rose-600 dark:text-rose-400',
            iconBg: 'bg-rose-100 dark:bg-rose-900/40',
            text: 'text-rose-900 dark:text-rose-100'
        }
    };

    // Category-based icons
    const categoryIcons = {
        anomaly: AlertTriangle,
        prediction: TrendingUp,
        recommendation: Lightbulb,
        risk: Shield,
        trend: Sparkles
    };

    const style = typeStyles[insight.type];
    const IconComponent = categoryIcons[insight.category];

    // Priority badge
    const priorityBadge = {
        high: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', label: 'High' },
        medium: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', label: 'Medium' },
        low: { bg: 'bg-slate-500/10 border border-slate-500/20', text: 'text-slate-600 dark:text-zinc-400', label: 'Low' }
    }[insight.priority];

    return (
        <div
            className={`${style.bg} ${style.border} border rounded-2xl p-5 transition-colors ${insight.action ? 'cursor-pointer' : ''} group animate-in fade-in slide-in-from-bottom-2`}
            onClick={insight.action?.onClick}
        >
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`${style.iconBg} ${style.icon} p-3 rounded-xl shrink-0`}>
                    <IconComponent size={20} strokeWidth={2.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className={`font-bold ${style.text} text-sm leading-tight`}>
                            {insight.title}
                        </h4>
                        <span className={`${priorityBadge.bg} ${priorityBadge.text} text-xs font-medium px-2.5 py-1 rounded-full shrink-0`}>
                            {priorityBadge.label}
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        {insight.description}
                    </p>

                    {/* Metric Display */}
                    {insight.metric && insight.value !== undefined && (
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-muted-foreground">
                                {insight.metric}:
                            </span>
                            <span className={`text-sm font-semibold ${style.text}`}>
                                {insight.value}
                            </span>
                        </div>
                    )}

                    {/* Action Button */}
                    {insight.action && (
                        <div className="flex items-center gap-2 text-xs font-semibold group-hover:gap-3 transition-all">
                            <span className={style.icon}>{insight.action.label}</span>
                            <ChevronRight size={14} className={`${style.icon} group-hover:translate-x-1 transition-transform`} />
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground mt-2">
                        {insight.timestamp.toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

