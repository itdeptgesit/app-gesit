
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Users, UserCircle, Pencil, Trash2, RefreshCcw, UserPlus, AlertCircle } from 'lucide-react';
import { DepartmentFormModal } from './DepartmentFormModal';
import { DepartmentMembersModal } from './DepartmentMembersModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { UserAccount } from '../types';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MasterDepartmentProps {
    currentUser: UserAccount | null;
}

interface Department {
    id: number;
    name: string;
    head: string;
    memberCount: number;
    description: string;
}

export const MasterDepartment: React.FC<MasterDepartmentProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [selectedDeptForMembers, setSelectedDeptForMembers] = useState<Department | null>(null);
    const [deleteDept, setDeleteDept] = useState<Department | null>(null);

    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data: deptData, error: deptError } = await supabase.from('departments').select('*').order('id', { ascending: true });
            if (deptError) throw deptError;

            const { data: userData, error: userError } = await supabase.from('user_accounts').select('department');
            if (userError) throw userError;

            if (deptData) {
                const mapped = deptData.map(d => {
                    const count = userData ? userData.filter((u: any) => {
                        const depts = (u.department || '').split(',').map((name: string) => name.trim().toLowerCase());
                        return depts.includes(d.name.trim().toLowerCase());
                    }).length : 0;

                    return {
                        id: d.id,
                        name: d.name,
                        head: d.head,
                        memberCount: count,
                        description: d.description
                    };
                });
                setDepartments(mapped);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchDepartments(); }, []);

    const filteredDepts = departments.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.head || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingDept(null);
        setIsModalOpen(true);
    };

    const handleEdit = (dept: Department) => {
        setEditingDept(dept);
        setIsModalOpen(true);
    };

    const handleManageMembers = (dept: Department) => {
        setSelectedDeptForMembers(dept);
        setIsMembersModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteDept) return;
        setIsProcessing(true);
        try {
            const { error: deleteError } = await supabase.from('departments').delete().eq('id', deleteDept.id);
            if (deleteError) throw deleteError;

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                'Delete Department',
                'Master',
                `Deleted department ${deleteDept.name}`
            );

            await fetchDepartments();
            setDeleteDept(null);
        } catch (err: any) {
            setError("Failed to delete record: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (data: Partial<Department>) => {
        const payload = {
            name: data.name,
            head: data.head,
            description: data.description
        };

        try {
            if (editingDept) {
                const { error: updateError } = await supabase.from('departments').update(payload).eq('id', editingDept.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('departments').insert([payload]);
                if (insertError) throw insertError;
            }

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                editingDept ? 'Update Department' : 'Create Department',
                'Master',
                `${editingDept ? 'Updated' : 'Created'} department ${payload.name}`
            );

            fetchDepartments();
        } catch (err: any) {
            showToast("Failed to save department: " + err.message, 'error');
        }
    };

    return (
        <div className="animate-in fade-in duration-300 pb-10">
            <PageHeader
                title="Master Department"
                description="Manage your company's organizational units & personnel"
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchDepartments}
                        className="w-9 hover:bg-muted"
                    >
                        <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        onClick={handleAdd}
                        >
                        <Plus size={14} className="mr-2" /> New Dept
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/60 bg-muted/20">
                    <div className="relative max-w-md">
                        <Input
                            placeholder="Search departments..."
                            className="w-full pl-10 pr-4 py-2 bg-card border-border/60 rounded-md font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                                <TableHead className="pl-6 py-3 font-semibold text-xs text-foreground/80 w-12 text-center">ID</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Department Name</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Head / Leader</TableHead>
                                <TableHead className="pr-6 py-3 font-semibold text-xs text-foreground/80 text-center">Personnel</TableHead>
                                <TableHead className="pr-6 py-3 font-semibold text-xs text-foreground/80 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20"><RefreshCcw className="animate-spin text-zinc-900 dark:text-zinc-100 mx-auto" size={24} /></TableCell></TableRow>
                            ) : filteredDepts.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500 font-medium">No department records found.</TableCell></TableRow>
                            ) : filteredDepts.map((dept) => (
                                <TableRow key={dept.id} className="group hover:bg-muted/50">
                                    <TableCell className="text-slate-500 font-mono text-xs text-center">{dept.id}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-muted/50 text-foreground/70 flex items-center justify-center border border-border/60">
                                                <Users size={16} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{dept.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium text-foreground">{dept.head || '-'}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-medium" onClick={() => handleManageMembers(dept)}>
                                            {dept.memberCount} Members
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)} className="w-8"><Pencil size={14} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteDept(dept)} className="w-8"><Trash2 size={14} /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <DepartmentFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} initialData={editingDept} />
            <DepartmentMembersModal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} department={selectedDeptForMembers} onUpdate={fetchDepartments} />
            <DangerConfirmModal isOpen={!!deleteDept} onClose={() => setDeleteDept(null)} onConfirm={executeDelete} title="Delete Department" message="Remove department from registry?" isLoading={isProcessing} />
        </div>
    );
};

