
'use client';

import React from 'react';
import { X, User, Building2, Calendar, Clock, MapPin, ClipboardList, CheckSquare, Zap, ShieldCheck, Target } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ActivityLog } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActivityDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: ActivityLog | null;
    userAvatarMap?: Record<string, string>;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ isOpen, onClose, activity, userAvatarMap = {} }) => {
    if (!isOpen || !activity) return null;

    const formatDate = (date: string | null | undefined) => {
        if (!date) return null;
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return date;
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return date;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
            <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl flex flex-col max-h-[92vh]">
                <DialogHeader className="flex flex-row items-center justify-between gap-4 px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <UserAvatar name={activity.itPersonnel} url={userAvatarMap[activity.itPersonnel]} size="lg" className="ring-2 ring-border/40" />
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">{activity.itPersonnel}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <ShieldCheck size={12} className="text-primary" />
                                <p className="text-xs text-muted-foreground">IT Personnel</p>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                        <X size={18} />
                    </Button>
                </DialogHeader>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-3 tracking-tight leading-tight">{activity.activityName}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-border/60 bg-muted/40 text-foreground text-xs font-medium">
                                {activity.category}
                            </Badge>
                            <Badge variant="outline" className={`text-xs font-medium ${activity.type === 'Critical' ? 'bg-rose-500/10 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-900/50' : 'bg-indigo-500/10 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 dark:border-indigo-900/50'}`}>
                                {activity.type} Severity
                            </Badge>
                            <Badge variant="outline" className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-900/30 text-xs font-medium">
                                <Zap size={10} className="fill-current" />
                                {activity.status}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 border border-border/40 p-6 rounded-lg">

                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40">
                                <User size={16} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Requester</p>
                                <p className="text-sm font-semibold text-foreground tracking-tight">{activity.requester || 'System Core'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40">
                                <Building2 size={16} className="text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Department</p>
                                <p className="text-sm font-semibold text-foreground tracking-tight">{activity.department || 'General'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40">
                                <Calendar size={16} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Plan / Starts</p>
                                <p className="text-sm font-semibold text-foreground tracking-tight">{formatDate(activity.createdAt) || 'Not Set'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40">
                                <CheckSquare size={16} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Completion</p>
                                <p className="text-sm font-semibold text-foreground tracking-tight">{formatDate(activity.completedAt) || 'In-Progress'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40">
                                <MapPin size={16} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Location</p>
                                <p className="text-sm font-semibold text-foreground tracking-tight">{activity.location || 'Site Office'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40">
                                <Clock size={16} className="text-cyan-500" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Duration</p>
                                <p className="text-sm font-semibold text-foreground tracking-tight">{activity.duration || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="col-span-1 sm:col-span-2 mt-2 pt-6 border-t border-border/40">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                                <p className="text-xs font-medium text-foreground">Diagnostic Remarks</p>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg border border-border/40 text-sm text-muted-foreground italic leading-relaxed font-medium">
                                "{activity.remarks || 'No additional protocols recorded.'}"
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
