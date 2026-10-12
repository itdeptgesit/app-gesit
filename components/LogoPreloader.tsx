'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LogoPreloaderProps {
    logoUrl?: string;
    appName?: string;
    isVisible: boolean;
}

export const LogoPreloader: React.FC<LogoPreloaderProps> = ({ 
    logoUrl = '/image/logo.png', 
    appName = 'GESIT PORTAL',
    isVisible 
}) => {
    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden"
        >
            {/* Background Grain/Depth */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <svg className="h-full w-full">
                    <filter id="noise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noise)" />
                </svg>
            </div>

            <div className="relative flex items-center gap-6 md:gap-8 bg-white dark:bg-zinc-950 px-8 py-6 rounded-xl">
                {/* Logo Container (Left) */}
                <motion.div 
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ 
                        opacity: 1, 
                        x: 0,
                        scale: 1,
                        y: [0, -6, 0] 
                    }}
                    transition={{ 
                        opacity: { duration: 0.8 },
                        x: { duration: 0.8, ease: "easeOut" },
                        scale: { type: "spring", stiffness: 100, damping: 20 },
                        y: { 
                            duration: 4, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                        }
                    }}
                    className="relative w-16 h-16 md:w-20 md:h-20 group shrink-0"
                >
                    {/* Outline / Base Layer */}
                    <img 
                        src={logoUrl} 
                        alt="Logo Base" 
                        className="w-full h-full object-contain opacity-[0.08] brightness-0"
                    />

                    {/* Fluid Fill Layer */}
                    <motion.div
                        initial={{ height: "0%" }}
                        animate={{ height: "100%" }}
                        transition={{ 
                            duration: 3, 
                            ease: "easeInOut",
                            repeat: Infinity,
                            repeatType: "loop",
                            repeatDelay: 0.8
                        }}
                        className="absolute bottom-0 left-0 w-full overflow-hidden"
                    >
                        <img 
                            src={logoUrl} 
                            alt="Logo Fill" 
                            className="absolute bottom-0 left-0 w-full h-[64px] md:h-[80px] object-contain"
                        />
                        
                        <motion.div
                            animate={{ x: ["-100%", "0%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute top-0 left-0 w-[200%] h-2 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent blur-sm"
                        ></motion.div>
                    </motion.div>

                    {/* Radial Glow */}
                    <div className="absolute inset-[-40%] bg-blue-500/10 rounded-full blur-[40px] -z-10" />
                </motion.div>

                {/* Vertical Divider Accent */}
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "40px", opacity: 0.2 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="w-[1px] bg-slate-400 dark:bg-white"
                ></motion.div>

                {/* Text Content (Right) */}
                <div className="flex flex-col">
                    <motion.h2 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-[0.3em] uppercase"
                    >
                        {appName}
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-[0.5em] mt-1"
                    >
                        Enterprise System
                    </motion.div>
                </div>
            </div>

            {/* Bottom Accent */}
            <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "20%" }}
                className="absolute bottom-12 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
            ></motion.div>
        </motion.div>
    );
};

