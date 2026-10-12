// Intelligence Layer Utilities
// Provides smart insights, anomaly detection, predictions, and recommendations

export interface Insight {
    id: string;
    type: 'info' | 'success' | 'warning' | 'critical';
    category: 'anomaly' | 'prediction' | 'recommendation' | 'risk' | 'trend';
    title: string;
    description: string;
    metric?: string;
    value?: string | number;
    action?: {
        label: string;
        onClick: () => void;
    };
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
}

export interface RiskScore {
    score: number; // 0-100
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
        name: string;
        impact: number;
        description: string;
    }>;
}

// Calculate percentage change between two values
export const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

// Detect if a value is anomalous (outside normal range)
export const detectAnomaly = (
    current: number,
    historical: number[],
    threshold: number = 1.5
): boolean => {
    if (historical.length === 0) return false;

    const avg = historical.reduce((a, b) => a + b, 0) / historical.length;
    const stdDev = Math.sqrt(
        historical.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / historical.length
    );

    return Math.abs(current - avg) > threshold * stdDev;
};

// Predict when budget will be exhausted
export const predictBudgetExhaustion = (
    currentSpending: number,
    totalBudget: number,
    daysElapsed: number,
    totalDays: number = 30
): { willExceed: boolean; daysUntilExhaustion?: number; projectedTotal?: number } => {
    const dailyRate = currentSpending / daysElapsed;
    const projectedTotal = dailyRate * totalDays;
    const remaining = totalBudget - currentSpending;
    const daysUntilExhaustion = remaining / dailyRate;

    return {
        willExceed: projectedTotal > totalBudget,
        daysUntilExhaustion: daysUntilExhaustion > 0 ? Math.round(daysUntilExhaustion) : undefined,
        projectedTotal
    };
};

// Calculate risk score based on multiple factors
export const calculateRiskScore = (metrics: {
    budgetUtilization?: number; // 0-100
    slaCompliance?: number; // 0-100
    criticalTickets?: number;
    overdueItems?: number;
    maintenanceRate?: number; // 0-100
}): RiskScore => {
    const factors: RiskScore['factors'] = [];
    let totalScore = 0;
    let factorCount = 0;

    // Budget risk
    if (metrics.budgetUtilization !== undefined) {
        const budgetRisk = metrics.budgetUtilization > 90 ? 30 : metrics.budgetUtilization > 75 ? 15 : 0;
        if (budgetRisk > 0) {
            factors.push({
                name: 'Budget Utilization',
                impact: budgetRisk,
                description: `${metrics.budgetUtilization}% of budget consumed`
            });
            totalScore += budgetRisk;
            factorCount++;
        }
    }

    // SLA risk
    if (metrics.slaCompliance !== undefined) {
        const slaRisk = metrics.slaCompliance < 95 ? 25 : metrics.slaCompliance < 98 ? 10 : 0;
        if (slaRisk > 0) {
            factors.push({
                name: 'SLA Compliance',
                impact: slaRisk,
                description: `${metrics.slaCompliance}% compliance rate`
            });
            totalScore += slaRisk;
            factorCount++;
        }
    }

    // Critical tickets risk
    if (metrics.criticalTickets !== undefined && metrics.criticalTickets > 0) {
        const ticketRisk = Math.min(metrics.criticalTickets * 5, 25);
        factors.push({
            name: 'Critical Tickets',
            impact: ticketRisk,
            description: `${metrics.criticalTickets} critical issues pending`
        });
        totalScore += ticketRisk;
        factorCount++;
    }

    // Overdue items risk
    if (metrics.overdueItems !== undefined && metrics.overdueItems > 0) {
        const overdueRisk = Math.min(metrics.overdueItems * 3, 15);
        factors.push({
            name: 'Overdue Items',
            impact: overdueRisk,
            description: `${metrics.overdueItems} items past deadline`
        });
        totalScore += overdueRisk;
        factorCount++;
    }

    // Maintenance rate risk
    if (metrics.maintenanceRate !== undefined && metrics.maintenanceRate > 15) {
        const maintenanceRisk = Math.min((metrics.maintenanceRate - 15) * 2, 15);
        factors.push({
            name: 'Asset Maintenance',
            impact: maintenanceRisk,
            description: `${metrics.maintenanceRate}% of assets in maintenance`
        });
        totalScore += maintenanceRisk;
        factorCount++;
    }

    const score = Math.min(totalScore, 100);
    const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

    return { score, level, factors };
};

// Generate insights from dashboard statistics
export const generateInsights = (stats: {
    totalPaidSpend: number;
    pendingBudget: number;
    approvedBudget: number;
    ticketPriorities: { critical: number; high: number; medium: number; low: number };
    openTickets: number;
    resolvedTickets: number;
    vendors: Array<{ name: string; total: number; transactionCount: number }>;
    assetStatuses: { operational: number; maintenance: number; retired: number };
    totalAssets: number;
    overdueLoans: number;
    activeLoans: number;
    deptSpending: Record<string, number>;
}, onNavigate: (view: string) => void): Insight[] => {
    const insights: Insight[] = [];

    // 1. Budget Anomaly Detection
    const totalBudget = stats.totalPaidSpend + stats.pendingBudget + stats.approvedBudget;
    const budgetUtilization = totalBudget > 0 ? (stats.totalPaidSpend / totalBudget) * 100 : 0;

    if (budgetUtilization > 85) {
        insights.push({
            id: 'budget-high',
            type: 'warning',
            category: 'anomaly',
            title: 'High Budget Utilization Detected',
            description: `${budgetUtilization.toFixed(1)}% of total budget has been consumed. Consider reviewing pending approvals.`,
            metric: 'Budget Utilization',
            value: `${budgetUtilization.toFixed(1)}%`,
            priority: budgetUtilization > 95 ? 'high' : 'medium',
            timestamp: new Date(),
            action: {
                label: 'Review Budget',
                onClick: () => onNavigate('purchase')
            }
        });
    }

    // 2. Predictive Alert - Budget Exhaustion
    const prediction = predictBudgetExhaustion(stats.totalPaidSpend, totalBudget, 20, 30);
    if (prediction.willExceed && prediction.daysUntilExhaustion) {
        insights.push({
            id: 'budget-predict',
            type: 'critical',
            category: 'prediction',
            title: 'Budget Overrun Predicted',
            description: `At current spending rate, budget will exceed in approximately ${prediction.daysUntilExhaustion} days.`,
            metric: 'Projected Overrun',
            value: `${prediction.daysUntilExhaustion} days`,
            priority: 'high',
            timestamp: new Date(),
            action: {
                label: 'View Spending',
                onClick: () => onNavigate('purchase')
            }
        });
    }

    // 3. Vendor Spending Recommendation
    if (stats.vendors.length > 0) {
        const topVendor = stats.vendors[0];
        const totalVendorSpend = stats.vendors.reduce((sum, v) => sum + v.total, 0);
        const topVendorShare = (topVendor.total / totalVendorSpend) * 100;

        if (topVendorShare > 40) {
            insights.push({
                id: 'vendor-concentration',
                type: 'info',
                category: 'recommendation',
                title: 'Vendor Concentration Risk',
                description: `${topVendor.name} represents ${topVendorShare.toFixed(1)}% of total spending. Consider diversifying suppliers.`,
                metric: 'Vendor Share',
                value: `${topVendorShare.toFixed(1)}%`,
                priority: 'medium',
                timestamp: new Date(),
                action: {
                    label: 'View Vendors',
                    onClick: () => onNavigate('purchase')
                }
            });
        }
    }

    // 4. SLA Risk - Critical Tickets
    const criticalAndHigh = stats.ticketPriorities.critical + stats.ticketPriorities.high;
    if (criticalAndHigh > 5) {
        insights.push({
            id: 'sla-risk',
            type: 'critical',
            category: 'risk',
            title: 'SLA Breach Risk Detected',
            description: `${criticalAndHigh} high-priority tickets open. Immediate attention required to maintain SLA compliance.`,
            metric: 'Critical Backlog',
            value: criticalAndHigh,
            priority: 'high',
            timestamp: new Date(),
            action: {
                label: 'View Tickets',
                onClick: () => onNavigate('helpdesk')
            }
        });
    }

    // 5. Asset Maintenance Alert
    const maintenanceRate = (stats.assetStatuses.maintenance / stats.totalAssets) * 100;
    if (maintenanceRate > 15) {
        insights.push({
            id: 'asset-maintenance',
            type: 'warning',
            category: 'anomaly',
            title: 'High Asset Maintenance Rate',
            description: `${maintenanceRate.toFixed(1)}% of assets are in maintenance. Consider lifecycle review or replacement planning.`,
            metric: 'Maintenance Rate',
            value: `${maintenanceRate.toFixed(1)}%`,
            priority: 'medium',
            timestamp: new Date(),
            action: {
                label: 'View Assets',
                onClick: () => onNavigate('assets')
            }
        });
    }

    // 6. Overdue Loans Alert
    if (stats.overdueLoans > 0) {
        insights.push({
            id: 'overdue-loans',
            type: 'warning',
            category: 'anomaly',
            title: 'Overdue Asset Loans Detected',
            description: `${stats.overdueLoans} asset loans are past their return date. Follow up required.`,
            metric: 'Overdue Items',
            value: stats.overdueLoans,
            priority: 'high',
            timestamp: new Date(),
            action: {
                label: 'View Loans',
                onClick: () => onNavigate('asset-loan')
            }
        });
    }

    // 7. Positive Trend - Ticket Resolution
    const resolutionRate = stats.openTickets + stats.resolvedTickets > 0
        ? (stats.resolvedTickets / (stats.openTickets + stats.resolvedTickets)) * 100
        : 0;

    if (resolutionRate > 80 && stats.resolvedTickets > 10) {
        insights.push({
            id: 'ticket-success',
            type: 'success',
            category: 'trend',
            title: 'Excellent Ticket Resolution Rate',
            description: `${resolutionRate.toFixed(1)}% resolution rate. Team is performing exceptionally well.`,
            metric: 'Resolution Rate',
            value: `${resolutionRate.toFixed(1)}%`,
            priority: 'low',
            timestamp: new Date()
        });
    }

    // 8. Department Spending Insight
    const deptEntries = Object.entries(stats.deptSpending);
    if (deptEntries.length > 0) {
        const topDept = deptEntries.sort(([, a], [, b]) => b - a)[0];
        const totalDeptSpend = deptEntries.reduce((sum, [, val]) => sum + val, 0);
        const topDeptShare = (topDept[1] / totalDeptSpend) * 100;

        if (topDeptShare > 50) {
            insights.push({
                id: 'dept-spending',
                type: 'info',
                category: 'recommendation',
                title: 'Department Budget Imbalance',
                description: `${topDept[0]} accounts for ${topDeptShare.toFixed(1)}% of spending. Review budget allocation across departments.`,
                metric: 'Department Share',
                value: `${topDeptShare.toFixed(1)}%`,
                priority: 'low',
                timestamp: new Date()
            });
        }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};
