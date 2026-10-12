'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, Calendar, Clock, User, ShieldCheck, Tag,
    Info, CheckCircle2, MapPin, Building2, Search,
    ChevronDown, AlertTriangle, Zap, Pencil, Plus,
    RefreshCcw, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityLog, UserAccount } from '../types';
import { UserAvatar } from './UserAvatar';
import { useLanguage } from '../translations';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from '@/components/ui/button';

interface ActivityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<ActivityLog>) => Promise<void>;
    initialData?: ActivityLog | null;
    currentUserName?: string;
    users?: any[];
    departments?: string[];
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
    isOpen, onClose, onSubmit, initialData, currentUserName,
    users = [], departments = []
}) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<Partial<ActivityLog>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Date State
    const [createdAt, setCreatedAt] = useState('');
    const [completedAt, setCompletedAt] = useState('');
    const [updatedAt, setUpdatedAt] = useState('');

    // User Search State
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const userDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const dateOnly = (str: string | undefined | null) => str ? str.split('T')[0] : '';
                
                setCreatedAt(dateOnly(initialData.createdAt));
                setCompletedAt(dateOnly(initialData.completedAt));
                setUpdatedAt(dateOnly(initialData.updatedAt || new Date().toISOString()));

                setFormData({
                    ...initialData,
                    itPersonnel: initialData.itPersonnel || currentUserName || 'IT Staff',
                });
                setUserSearch(initialData.requester || '');
            } else {
                const today = new Date().toISOString().split('T')[0];
                setCreatedAt(today);
                setCompletedAt(today);
                setUpdatedAt(today);

                setFormData({
                    status: 'Completed',
                    type: 'Minor',
                    itPersonnel: currentUserName || 'IT Admin',
                    requester: '',
                    location: 'Head Office TCT 27',
                    department: '',
                    category: 'Troubleshooting',
                    remarks: '',
                    duration: '',
                });
                setUserSearch('');
            }
        }
    }, [initialData, isOpen, currentUserName]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredUsers = useMemo(() => {
        if (!userSearch || userSearch.trim().length === 0) return [];
        const search = userSearch.toLowerCase();
        return users.filter(u => {
            const name = (u.fullName || u.name || '').toLowerCase();
            const dept = (u.department || '').toLowerCase();
            return name.includes(search) || dept.includes(search);
        });
    }, [users, userSearch]);

    const handleUserSelect = (user: any) => {
        const userName = user.fullName || user.name;
        const matchedDept = departments.find(d => d.toLowerCase() === (user.department || '').toLowerCase()) || user.department;
        setFormData(prev => ({ ...prev, requester: userName, department: matchedDept || prev.department }));
        setUserSearch(userName);
        setShowUserDropdown(false);
    };

    const handleManualEntry = () => {
        setFormData(prev => ({ ...prev, requester: userSearch }));
        setShowUserDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const dataToSubmit = {
                ...formData,
                requester: userSearch,
                createdAt: `${createdAt}T00:00:00`,
                completedAt: formData.status === 'Completed' ? `${completedAt}T00:00:00` : null,
                updatedAt: `${updatedAt}T00:00:00`,
                location: formData.location?.trim() || 'Head Office TCT 27'
            };
            await onSubmit(dataToSubmit);
        } finally {
            setIsSubmitting(false);
        }
    };

    const labelClass = "block text-sm font-medium text-foreground mb-1.5";
    const inputClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/50 transition-all";
    const selectClass = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50 transition-all appearance-none cursor-pointer";
    const inputLockedClass = "w-full px-3 py-2 rounded-md border border-input bg-muted/40 text-sm font-medium text-muted-foreground cursor-not-allowed";

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose}>
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                <div>
                    <h2 className="text-lg font-semibold text-foreground leading-tight">
                        {initialData ? 'Edit Activity' : 'New Activity Entry'}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Activity documentation & records
                    </p>
                </div>
                <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form id="activityForm" onSubmit={handleSubmit} className="space-y-6">
                    {/* Activity Name */}
                    <div className="p-5 rounded-lg bg-muted/20 border border-border/40">
                        <label className={labelClass}>Activity Summary</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={formData.activityName || ''}
                            onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                            required
                            placeholder="What was done?"
                            autoFocus
                        />
                    </div>

                    {/* Requester & Department */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div ref={userDropdownRef}>
                            <label className={labelClass}>Requester</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={userSearch}
                                    onChange={(e) => {
                                        setUserSearch(e.target.value);
                                        setShowUserDropdown(true);
                                    }}
                                    onFocus={() => setShowUserDropdown(true)}
                                    placeholder="Search user..."
                                />
                                <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

                                <AnimatePresence>
                                    {showUserDropdown && (userSearch.trim().length > 0 || filteredUsers.length > 0) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-background rounded-lg shadow-2xl border border-border/60 max-h-60 overflow-y-auto z-50 custom-scrollbar p-1.5"
                                        >
                                            {filteredUsers.map((user, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleUserSelect(user)}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center gap-3 rounded-md transition-colors group"
                                                >
                                                    <UserAvatar name={user.fullName || user.name} url={user.avatarUrl} size="md" className="border-2 border-border" />
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors tracking-tight">{user.fullName || user.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{user.department}</p>
                                                    </div>
                                                </button>
                                            ))}

                                            {userSearch.trim() && !filteredUsers.some(u => (u.fullName || u.name || '').toLowerCase() === userSearch.toLowerCase()) && (
                                                <button
                                                    type="button"
                                                    onClick={handleManualEntry}
                                                    className="w-full text-left px-3 py-3 bg-muted/40 hover:bg-muted flex items-center gap-3 rounded-md transition-colors mt-1"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-muted-foreground/10 text-muted-foreground flex items-center justify-center">
                                                        <Plus size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground leading-none">Add "{userSearch}"</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Manual entry</p>
                                                    </div>
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Department</label>
                            <div className="relative">
                                <select
                                    className={selectClass}
                                    value={formData.department || ''}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select Sector</option>
                                    {departments.map((dept, idx) => (
                                        <option key={idx} value={dept}>{dept}</option>
                                    ))}
                                    {formData.department && !departments.includes(formData.department) && (
                                        <option value={formData.department}>{formData.department}</option>
                                    )}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Start Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className={`${inputClass} cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full`}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                    value={createdAt}
                                    onChange={(e) => setCreatedAt(e.target.value)}
                                    required
                                />
                                <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>{formData.status === 'Completed' ? 'Completed Date' : 'Updated Date'}</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className={`${inputClass} cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full`}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                    value={formData.status === 'Completed' ? completedAt : updatedAt}
                                    onChange={(e) => formData.status === 'Completed' ? setCompletedAt(e.target.value) : setUpdatedAt(e.target.value)}
                                    required
                                />
                                <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400/50 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Duration & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Duration</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={formData.duration || ''}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    placeholder="e.g. 15m, 2h"
                                />
                                <Zap size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Location</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={formData.location || ''}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Site or Office"
                                />
                                <MapPin size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Category & Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Classification</label>
                            <div className="relative">
                                <select
                                    className={selectClass}
                                    value={formData.category || 'Troubleshooting'}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    <option value="Troubleshooting">Troubleshooting</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Creative & Design">Creative & Design</option>
                                    <option value="Infrastructure & Network">Infrastructure & Network</option>
                                    <option value="Procurement & Assets">Procurement & Assets</option>
                                    <option value="Technical Support">Technical Support</option>
                                    <option value="Web Development">Web Development</option>
                                    <option value="Other">Other</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Priority Level</label>
                            <div className="relative">
                                <select
                                    className={selectClass}
                                    value={formData.type || 'Minor'}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    required
                                >
                                    <option value="Minor">Minor</option>
                                    <option value="Major">Major</option>
                                    <option value="Critical">Critical</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* IT Personnel & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Handled By</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={inputLockedClass}
                                    value={formData.itPersonnel || ''}
                                    readOnly
                                />
                                <ShieldCheck size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400/50 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Operational Status</label>
                            <div className="relative">
                                <select
                                    className={selectClass}
                                    value={formData.status || 'Completed'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    required
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className={labelClass}>Documentation Details</label>
                        <textarea
                            rows={3}
                            className={`${inputClass} resize-none min-h-[100px]`}
                            value={formData.remarks || ''}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            placeholder="Additional notes or findings..."
                        />
                    </div>
                </form>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-3.5 border-t border-border/40 gap-2 flex sm:justify-end items-center bg-muted/10 shrink-0">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    form="activityForm"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {initialData ? 'Update Record' : 'Save Activity'}
                </Button>
            </div>
        </ModalWrapper>
    );
};