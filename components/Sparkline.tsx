'use client';

import React from 'react';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: 'blue' | 'green' | 'red' | 'amber' | 'emerald' | 'rose' | 'indigo';
    showGradient?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    width = 100,
    height = 30,
    color = 'blue',
    showGradient = true
}) => {
    if (!data || data.length === 0) return null;

    // Color mapping
    const colorMap = {
        blue: { stroke: '#2563eb', fill: '#2563eb' },
        green: { stroke: '#10b981', fill: '#10b981' },
        emerald: { stroke: '#10b981', fill: '#10b981' },
        red: { stroke: '#ef4444', fill: '#ef4444' },
        rose: { stroke: '#ef4444', fill: '#ef4444' },
        amber: { stroke: '#f59e0b', fill: '#f59e0b' },
        indigo: { stroke: '#6366f1', fill: '#6366f1' }
    };

    const colors = colorMap[color];

    // Calculate points
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const pathD = `M ${points}`;
    const areaD = `M 0,${height} L ${points} L ${width},${height} Z`;

    return (
        <svg
            width={width}
            height={height}
            className="sparkline"
            style={{ display: 'block' }}
        >
            {showGradient && (
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={colors.fill} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
                    </linearGradient>
                </defs>
            )}

            {/* Area fill */}
            {showGradient && (
                <path
                    d={areaD}
                    fill={`url(#gradient-${color})`}
                />
            )}

            {/* Line */}
            <polyline
                points={points}
                fill="none"
                stroke={colors.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
