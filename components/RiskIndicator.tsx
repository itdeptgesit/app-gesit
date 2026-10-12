'use client';

import React from 'react';
import { Shield, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { RiskScore } from '../utils/IntelligenceUtils';

interface RiskIndicatorProps {
    riskScore: RiskScore;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({ riskScore }) => {
    const { score, level, factors } = riskScore;

    // Level-based styling
    const levelStyles = {
        low: {
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-200 dark:border-emerald-800',
            gradient: 'from-emerald-500 to-emerald-600',
            icon: CheckCircle2
        },
        medium: {
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-amber-200 dark:border-amber-800',
            gradient: 'from-amber-500 to-amber-600',
            icon: AlertTriangle
        },
        high: {
            color: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-50 dark:bg-orange-950/30',
            border: 'border-orange-200 dark:border-orange-800',
            gradient: 'from-orange-500 to-orange-600',
            icon: AlertCircle
        },
        critical: {
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/30',
            border: 'border-rose-200 dark:border-rose-800',
            gradient: 'from-rose-500 to-rose-600',
            icon: AlertCircle
        }
    };

    const style = levelStyles[level];
    const IconComponent = style.icon;

    // Calculate gauge rotation (0-180 degrees)
    const rotation = (score / 100) * 180;

    return (
        <div className={`${style.bg} ${style.border} border rounded-xl p-6 animate-in fade-in slide-in-from-bottom-3`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${style.gradient} text-white shadow-lg`}>
                    <Shield size={20} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base leading-none">
                        Risk Assessment
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                        System Health Score
                    </p>
                </div>
            </div>

            {/* Gauge Chart */}
            <div className="relative w-full h-32 mb-6">
                <svg viewBox="0 0 200 100" className="w-full h-full">
                    {/* Background arc */}
                    <path
                        d="M 20 90 A 80 80 0 0 1 180 90"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-slate-200 dark:text-slate-800"
                    />
                    {/* Colored segments */}
                    <path
                        d="M 20 90 A 80 80 0 0 1 65 25"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 65 25 A 80 80 0 0 1 100 10"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="12"
                    />
                    <path
                        d="M 100 10 A 80 80 0 0 1 135 25"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="12"
                    />
                    <path
                        d="M 135 25 A 80 80 0 0 1 180 90"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    {/* Needle */}
                    <g transform={`rotate(${rotation - 90} 100 90)`}>
                        <line
                            x1="100"
                            y1="90"
                            x2="100"
                            y2="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className={style.color}
                        />
                        <circle cx="100" cy="90" r="6" fill="currentColor" className={style.color} />
                    </g>
                </svg>

                {/* Score Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <div className={`text-4xl font-black ${style.color}`}>{score}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Risk Score
                    </div>
                </div>
            </div>

            {/* Level Badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
                <IconComponent size={16} className={style.color} />
                <span className={`${style.color} text-sm font-black uppercase tracking-wider`}>
                    {level} Risk
                </span>
            </div>

            {/* Risk Factors */}
            {factors.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                        Contributing Factors
                    </h4>
                    {factors.map((factor, index) => (
                        <div key={index} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {factor.name}
                                </span>
                                <span className={`font-bold ${style.color}`}>
                                    +{factor.impact}
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${style.gradient} rounded-full transition-all duration-500`}
                                    style={{ width: `${factor.impact}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                                {factor.description}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* No Risk Message */}
            {factors.length === 0 && (
                <div className="text-center py-4">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-50" />
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                        All systems operating within normal parameters
                    </p>
                </div>
            )}
        </div>
    );
};

