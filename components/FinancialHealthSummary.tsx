import React from 'react';
import { TrendingUp, AlertTriangle, Wallet, PieChart } from 'lucide-react';

interface FinancialHealthSummaryProps {
    outflowChange: number;
    pendingCount: number;
    largestCategory: { name: string; percentage: number };
    riskLevel: 'Low' | 'Medium' | 'High';
}

export const FinancialHealthSummary: React.FC<FinancialHealthSummaryProps> = ({
    outflowChange,
    pendingCount,
    largestCategory,
    riskLevel
}) => {
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'text-emerald-500 bg-emerald-500/[0.04] border-emerald-500/20';
            case 'Medium': return 'text-amber-500 bg-amber-500/[0.04] border-amber-500/20';
            case 'High': return 'text-rose-500 bg-rose-500/[0.04] border-rose-500/20';
            default: return 'text-slate-500 bg-muted/50';
        }
    };

    return (
        <div className="bg-card rounded-2xl p-3 border border-border/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                    <TrendingUp size={16} />
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Cash Outflow</p>
                    <p className={`text-xs font-semibold ${outflowChange > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {outflowChange > 0 ? '↑' : '↓'} {Math.abs(outflowChange)}% <span className="text-muted-foreground font-medium text-xs">vs last month</span>
                    </p>
                </div>
            </div>

            <div className="h-6 w-px bg-border/60 hidden md:block"></div>

            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
                    <AlertTriangle size={16} />
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Pending Approvals</p>
                    <p className="text-xs font-semibold text-foreground">
                        {pendingCount} <span className="text-muted-foreground font-medium text-xs">invoices</span>
                    </p>
                </div>
            </div>

            <div className="h-6 w-px bg-border/60 hidden md:block"></div>

            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                    <PieChart size={16} />
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Largest Category</p>
                    <p className="text-xs font-semibold text-foreground">
                        {largestCategory.name} <span className="text-muted-foreground font-medium text-xs">({largestCategory.percentage}%)</span>
                    </p>
                </div>
            </div>

            <div className="h-6 w-px bg-border/60 hidden md:block"></div>

            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-muted/50 border border-border/60 text-foreground/70 rounded-lg">
                    <Wallet size={16} />
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Risk Level</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRiskColor(riskLevel)}`}>
                        {riskLevel}
                    </span>
                </div>
            </div>
        </div>
    );
};

