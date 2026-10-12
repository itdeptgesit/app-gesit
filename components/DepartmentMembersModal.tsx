
'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, UserPlus, Search, Loader2, UserCheck, AlertCircle, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Department {
    id: number;
    name: string;
}

interface UserSimple {
    id: number | string;
    fullName: string;
    email: string;
    department: string;
    jobTitle?: string;
}

interface DepartmentMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
    onUpdate?: () => void;
}

export const DepartmentMembersModal: React.FC<DepartmentMembersModalProps> = ({ isOpen, onClose, department, onUpdate }) => {
    const { t } = useLanguage();
    const [members, setMembers] = useState<UserSimple[]>([]);
    const [availableUsers, setAvailableUsers] = useState<UserSimple[]>([]);
    const [showAddMode, setShowAddMode] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);

    useEffect(() => {
        if (isOpen && department) {
            fetchMembers();
            setShowAddMode(false);
            setSelectedUserId('');
            setError(null);
        }
    }, [isOpen, department]);

    const fetchMembers = async () => {
        if (!department) return;
        setIsLoading(true);
        setError(null);

        try {
            const { data: allUsers, error: fetchError } = await supabase
                .from('user_accounts')
                .select('id, full_name, email, department, job_title');

            if (fetchError) throw fetchError;

            if (allUsers) {
                const targetDept = department.name.trim().toLowerCase();
                const filteredMembers = allUsers
                    .filter((u: any) => {
                        const depts = (u.department || '')
                            .split(',')
                            .map((d: string) => d.trim().toLowerCase())
                            .filter(Boolean);
                        return depts.includes(targetDept);
                    })
                    .map((u: any) => ({
                        id: u.id,
                        fullName: u.full_name || 'No Name',
                        email: u.email || '',
                        department: u.department || '',
                        jobTitle: u.job_title
                    }));
                setMembers(filteredMembers);
            }
        } catch (err: any) {
            setError(t('failedFetchData') + ": " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableUsers = async () => {
        if (!department) return;
        setIsLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('user_accounts')
                .select('id, full_name, email, department')
                .order('full_name');

            if (fetchError) throw fetchError;

            if (data) {
                const targetDept = department.name.trim().toLowerCase();
                const filtered = data
                    .filter((u: any) => {
                        const depts = (u.department || '')
                            .split(',')
                            .map((d: string) => d.trim().toLowerCase())
                            .filter(Boolean);
                        return !depts.includes(targetDept);
                    })
                    .map((u: any) => ({
                        id: u.id,
                        fullName: u.full_name || 'No Name',
                        email: u.email || '',
                        department: u.department || 'No Department'
                    }));
                setAvailableUsers(filtered);
            }
        } catch (err: any) {
            setError(t('failedFetchData') + ": " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAdd = () => {
        fetchAvailableUsers();
        setShowAddMode(true);
    };

    const handleAddMember = async () => {
        if (!selectedUserId || !department) return;
        setIsActionLoading(true);
        setError(null);

        try {
            const userIdNumeric = !isNaN(Number(selectedUserId)) ? Number(selectedUserId) : selectedUserId;

            const { data: user, error: userError } = await supabase
                .from('user_accounts')
                .select('department')
                .eq('id', userIdNumeric)
                .single();

            if (userError || !user) throw new Error("User data not found");

            let currentDepts = (user.department || '')
                .split(',')
                .map((d: string) => d.trim())
                .filter(Boolean);

            const targetDeptName = department.name.trim();
            const alreadyExists = currentDepts.some(d => d.toLowerCase() === targetDeptName.toLowerCase());

            if (!alreadyExists) {
                currentDepts.push(targetDeptName);
            }

            const { error: updateError } = await supabase
                .from('user_accounts')
                .update({ department: currentDepts.join(', ') })
                .eq('id', userIdNumeric);

            if (updateError) throw updateError;

            await fetchMembers();
            setShowAddMode(false);
            setSelectedUserId('');
            if (onUpdate) onUpdate();
        } catch (err: any) {
            setError(t('failedSave') + ": " + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const confirmRemove = async () => {
        if (!department || deleteId === null) return;

        setIsActionLoading(true);
        setError(null);

        try {
            const dbUserId = typeof deleteId === 'string' && !isNaN(Number(deleteId)) ? Number(deleteId) : deleteId;

            const { data: user, error: userError } = await supabase
                .from('user_accounts')
                .select('department')
                .eq('id', dbUserId)
                .single();

            if (userError || !user) throw new Error("User record not found");

            const targetDeptNameNormalized = department.name.trim().toLowerCase();
            const currentDepts = (user.department || '').split(',');

            const updatedDepts = currentDepts
                .map((d: string) => d.trim())
                .filter(d => {
                    const isMatch = d.toLowerCase() === targetDeptNameNormalized;
                    return !isMatch && d !== '';
                });

            const newDeptString = updatedDepts.join(', ');

            const { error: updateError } = await supabase
                .from('user_accounts')
                .update({ department: newDeptString })
                .eq('id', dbUserId);

            if (updateError) throw updateError;

            setMembers(prev => prev.filter(m => String(m.id) !== String(deleteId)));
            if (onUpdate) onUpdate();

        } catch (err: any) {
            setError(t('failedDelete') + ": " + (err.message || "Unknown error"));
        } finally {
            setIsActionLoading(false);
            setDeleteId(null);
        }
    };

    if (!isOpen || !department) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh] border border-border/60 font-sans overflow-hidden">

                <div className="px-6 py-4 border-b border-border/40 flex justify-between items-center bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {department.name} <span className="text-foreground">Personnel</span>
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Management Engine</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-destructive">
                        <X size={20} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {error && (
                        <div className="m-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive animate-in slide-in-from-top-2">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p className="text-xs font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    {showAddMode ? (
                        <div className="p-6 bg-muted/20 m-6 rounded-xl border border-border/40 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <UserPlus size={18} className="text-primary" />
                                <h4 className="text-sm font-semibold text-foreground">Assign Personnel</h4>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <select
                                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none font-medium text-foreground disabled:opacity-50 shadow-sm"
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        disabled={isActionLoading}
                                    >
                                        <option value="">-- Select Account --</option>
                                        {availableUsers.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.fullName} • {u.department}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-3.5 pointer-events-none text-muted-foreground">
                                        <Plus size={16} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAddMode(false)}
                                        disabled={isActionLoading}
                                        className="text-xs font-medium"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={handleAddMember}
                                        disabled={!selectedUserId || isActionLoading}
                                        className="gap-2 text-xs font-medium"
                                    >
                                        {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                                        Confirm Assignment
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="px-6 py-3.5 border-b border-border/40 bg-muted/20 flex justify-between items-center">
                            <span className="text-xs font-semibold text-muted-foreground">Personnel List : {members.length}</span>
                            <Button
                                variant="default"
                                onClick={handleOpenAdd}
                                disabled={isLoading || isActionLoading}
                                className="gap-2 text-xs font-medium"
                            >
                                <Plus size={14} /> Assign Person
                            </Button>
                        </div>
                    )}

                    <ul className="divide-y divide-border/40">
                        {isLoading && members.length === 0 ? (
                            <li className="p-12 text-center flex flex-col items-center gap-4">
                                <Loader2 size={32} className="animate-spin text-primary" />
                                <p className="text-xs font-medium text-muted-foreground">Syncing Personnel Data...</p>
                            </li>
                        ) : (members.length === 0 && !showAddMode) ? (
                            <li className="p-20 text-center flex flex-col items-center gap-4 text-muted-foreground">
                                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center shadow-inner border border-border/40">
                                    <UserPlus size={32} className="opacity-20" />
                                </div>
                                <p className="text-sm font-medium italic">No department members registered.</p>
                            </li>
                        ) : (
                            members.map(member => (
                                <li key={member.id} className="px-6 py-4 flex justify-between items-center hover:bg-muted/30 group transition-all animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-muted/20 flex items-center justify-center text-sm font-semibold text-foreground border border-border/40">
                                            {member.fullName ? member.fullName.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-foreground">{member.fullName}</p>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {(member.department || '').split(',').map((d, i) => {
                                                    const cleanDept = d.trim();
                                                    if (!cleanDept) return null;
                                                    const isCurrent = cleanDept.toLowerCase() === department.name.trim().toLowerCase();
                                                    return (
                                                        <span key={i} className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${isCurrent ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 text-muted-foreground border-border/40'}`}>
                                                            {cleanDept}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDeleteId(member.id);
                                        }}
                                        disabled={isActionLoading}
                                        className="text-destructive hover:text-white hover:bg-destructive rounded-md active:scale-90 relative z-[600]"
                                        title="Remove Personnel"
                                    >
                                        {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} className="pointer-events-none" />}
                                    </Button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                <div className="px-6 py-3.5 bg-muted/10 border-t border-border/40 text-center shrink-0">
                    <p className="text-[11px] font-medium text-muted-foreground italic">
                        Personnel changes are automatically synced to global directory
                    </p>
                </div>
            </div>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="z-[600]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will remove the selected personnel from the {department.name} department.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemove} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Remove Personnel</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};


