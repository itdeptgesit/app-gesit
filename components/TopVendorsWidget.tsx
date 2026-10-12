import React from 'react';
import { Store, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface VendorData {
    name: string;
    total: number;
    transactionCount: number;
}

interface TopVendorsWidgetProps {
    vendors: VendorData[];
}

export const TopVendorsWidget: React.FC<TopVendorsWidgetProps> = ({ vendors }) => {
    const formatIDR = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    return (
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-zinc-800/50 shadow-sm p-5 flex flex-col h-full relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <Store size={120} />
            </div>

            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-500/20 shadow-sm">
                    <Store size={16} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="font-black text-slate-900 dark:text-white tracking-tight text-base leading-none">Key Suppliers</h2>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">Top Entities</p>
                </div>
            </div>

            <div className="space-y-1 flex-1 relative z-10">
                {vendors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <Store size={32} className="mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No vendor data</p>
                    </div>
                ) : (
                    vendors.slice(0, 5).map((vendor, idx) => (
                        <motion.div
                            key={vendor.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative group/item"
                        >
                            <div className="flex justify-between items-center z-10 relative p-2 -mx-1 rounded-xl hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-all duration-300 hover:translate-x-1.5 cursor-pointer border border-transparent hover:border-slate-100/50 dark:hover:border-zinc-800/50 group/row">
                                <div className="flex items-center gap-4">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm border transition-transform duration-300 group-hover/row:scale-110
                                        ${idx === 0 ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-yellow-950/20 dark:to-amber-900/10 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20' :
                                            idx === 1 ? 'bg-gradient-to-br from-slate-50 to-slate-150 dark:from-zinc-900 dark:to-zinc-800 text-slate-600 dark:text-slate-350 border-slate-200/60 dark:border-zinc-700/50' :
                                                idx === 2 ? 'bg-gradient-to-br from-orange-55 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/10 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-500/20' :
                                                    'bg-slate-50 dark:bg-zinc-800/40 text-slate-450 dark:text-zinc-500 border-slate-100/80 dark:border-zinc-800/80'}
                                    `}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[140px] group-hover/row:text-primary transition-colors duration-200">
                                            {vendor.name === 'Unknown' || !vendor.name ? 'General Supplier' : vendor.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100/50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                                {vendor.transactionCount} Txns
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end justify-center">
                                    <p className="text-xs font-black text-slate-900 dark:text-white font-mono leading-none">
                                        {formatIDR(vendor.total).replace('Rp', '')}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
            {vendors.length > 3 && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-center relative z-10">
                    <button className="inline-flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest group/btn">
                        View All Vendors
                        <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};

