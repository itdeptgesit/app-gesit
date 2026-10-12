'use client';

import React, { useState } from 'react';
import { Brain, Filter, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Shield } from 'lucide-react';
import { Insight } from '../utils/IntelligenceUtils';
import { IntelligenceInsight } from './IntelligenceInsight';

interface IntelligenceLayerProps {
    insights: Insight[];
}

export const IntelligenceLayer: React.FC<IntelligenceLayerProps> = ({ insights }) => {
    const [filter, setFilter] = useState<'all' | 'anomaly' | 'prediction' | 'recommendation' | 'risk' | 'trend'>('all');

    const filteredInsights = filter === 'all'
        ? insights
        : insights.filter(i => i.category === filter);

    const filterOptions = [
        { value: 'all' as const, label: 'All Insights', icon: Sparkles, count: insights.length },
        { value: 'anomaly' as const, label: 'Anomalies', icon: AlertTriangle, count: insights.filter(i => i.category === 'anomaly').length },
        { value: 'prediction' as const, label: 'Predictions', icon: TrendingUp, count: insights.filter(i => i.category === 'prediction').length },
        { value: 'recommendation' as const, label: 'Recommendations', icon: Lightbulb, count: insights.filter(i => i.category === 'recommendation').length },
        { value: 'risk' as const, label: 'Risks', icon: Shield, count: insights.filter(i => i.category === 'risk').length },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-xl">
                        <Brain size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">
                            Intelligence Center
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            AI-powered insights and recommendations
                        </p>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {filterOptions.map(option => {
                        const IconComponent = option.icon;
                        const isActive = filter === option.value;

                        return (
                            <button
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                            >
                                <IconComponent size={14} />
                                <span>{option.label}</span>
                                {option.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${isActive
                                            ? 'bg-white/20'
                                            : 'bg-slate-100 dark:bg-slate-700'
                                        }`}>
                                        {option.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Insights Grid */}
            {filteredInsights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInsights.map(insight => (
                        <IntelligenceInsight key={insight.id} insight={insight} />
                    ))}
                </div>
            ) : (
                <div className="bg-card rounded-2xl border border-border/60 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                        <Sparkles size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                        All Systems Optimal
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {filter === 'all'
                            ? 'No insights to display. Your systems are running smoothly.'
                            : `No ${filter} insights at this time. Everything looks good!`
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

