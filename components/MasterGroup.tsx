
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Layers, Pencil, Trash2, ShieldCheck, RefreshCcw } from 'lucide-react';
import { UserAccount, UserGroup } from '../types';
import { GroupFormModal } from './GroupFormModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MasterGroupProps {
    currentUser: UserAccount | null;
}

export const MasterGroup: React.FC<MasterGroupProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [groups, setGroups] = useState<UserGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
    const [deleteGroup, setDeleteGroup] = useState<UserGroup | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchGroups = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('user_groups').select('*');
        if (data) {
            const mapped = data.map(g => ({
                id: g.id,
                name: g.name,
                description: g.description,
                allowedMenus: g.allowed_menus || []
            }));
            setGroups(mapped);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchGroups(); }, []);

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingGroup(null);
        setIsModalOpen(true);
    };

    const handleEdit = (group: UserGroup) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteGroup) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('user_groups').delete().eq('id', deleteGroup.id);
            if (error) throw error;

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                'Delete Group',
                'Security',
                `Deleted group ${deleteGroup.name}`
            );

            await fetchGroups();
            setDeleteGroup(null);
        } catch (err: any) {
            showToast("Failed to delete group: " + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (data: UserGroup) => {
        const payload = {
            id: data.id,
            name: data.name,
            description: data.description,
            allowed_menus: data.allowedMenus
        };

        if (editingGroup) {
            await supabase.from('user_groups').update(payload).eq('id', editingGroup.id);
        } else {
            await supabase.from('user_groups').insert([payload]);
        }

        await trackActivity(
            currentUser?.fullName || 'User',
            currentUser?.role || 'User',
            editingGroup ? 'Update Group' : 'Create Group',
            'Security',
            `${editingGroup ? 'Updated' : 'Created'} group ${data.name}`
        );

        fetchGroups();
    };

    return (
        <div className="animate-in fade-in duration-300 pb-10">
            <PageHeader
                title="Master Group & Access"
                description="Configure user groups and system menu permissions"
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchGroups}
                        className="w-9 hover:bg-muted"
                    >
                        <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        onClick={handleAdd}
                        >
                        <Plus size={14} className="mr-2" /> Add Group
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/60 bg-muted/20">
                    <div className="relative max-w-md">
                        <Input
                            placeholder="Search group..."
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
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Group Name</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Description</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Accessible Menus</TableHead>
                                <TableHead className="pr-6 py-3 font-semibold text-xs text-foreground/80 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20"><RefreshCcw className="animate-spin text-blue-500 mx-auto" size={24} /></TableCell></TableRow>
                            ) : filteredGroups.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500 font-medium">No group records found.</TableCell></TableRow>
                            ) : filteredGroups.map((group) => (
                                <TableRow key={group.id} className="group hover:bg-muted/50">
                                    <TableCell className="text-slate-500 font-mono text-xs text-center">{group.id}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                                                <Layers size={16} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{group.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-xs">{group.description}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                            {group.allowedMenus.slice(0, 4).map(m => (
                                                <Badge key={m} variant="outline" className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 text-xs font-medium rounded-md">
                                                    {m}
                                                </Badge>
                                            ))}
                                            {group.allowedMenus.length > 4 && (
                                                <Badge variant="outline" className="px-2.5 py-1 bg-muted/50 text-muted-foreground border border-border/60 text-xs font-medium rounded-md">
                                                    +{group.allowedMenus.length - 4} More
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(group)} className="w-8"><ShieldCheck size={14} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteGroup(group)} className="w-8"><Trash2 size={14} /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <GroupFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingGroup}
            />

            <DangerConfirmModal
                isOpen={!!deleteGroup}
                onClose={() => setDeleteGroup(null)}
                onConfirm={executeDelete}
                title="Delete Access Group"
                message={`Delete group "${deleteGroup?.name}"? Users in this group will lose access rights defined by this policy.`}
                isLoading={isProcessing}
            />
        </div>
    );
};

