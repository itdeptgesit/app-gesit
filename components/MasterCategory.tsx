
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Layers, Pencil, Trash2, RefreshCcw, Tag, FileText } from 'lucide-react';
import { CategoryFormModal } from './CategoryFormModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { AssetCategory, UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MasterCategoryProps {
    currentUser: UserAccount | null;
}

export const MasterCategory: React.FC<MasterCategoryProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
    const [deleteCategory, setDeleteCategory] = useState<AssetCategory | null>(null);
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchCategories = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('asset_categories').select('*').order('name', { ascending: true });
        if (!error && data) {
            setCategories(data as AssetCategory[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleAdd = () => {
        setEditingCategory(null);
        setIsModalOpen(true);
    };

    const handleEdit = (category: AssetCategory) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteCategory) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('asset_categories').delete().eq('id', deleteCategory.id);
            if (error) throw error;

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                'Delete Category',
                'Master',
                `Deleted category ${deleteCategory.name} (${deleteCategory.code})`
            );

            await fetchCategories();
            setDeleteCategory(null);
        } catch (err: any) {
            showToast("Failed to delete record: " + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (data: Partial<AssetCategory>) => {
        if (editingCategory) {
            await supabase.from('asset_categories').update(data).eq('id', editingCategory.id);
        } else {
            await supabase.from('asset_categories').insert([data]);
        }

        await trackActivity(
            currentUser?.fullName || 'User',
            currentUser?.role || 'User',
            editingCategory ? 'Update Category' : 'Create Category',
            'Master',
            `${editingCategory ? 'Updated' : 'Created'} category ${data.name} (${data.code})`
        );

        fetchCategories();
    };

    return (
        <div className="animate-in fade-in duration-300 pb-10 font-sans">
            <PageHeader
                title="Master Categories"
                description="Classification Hierarchy Management"
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchCategories}
                        className="w-9 hover:bg-muted"
                    >
                        <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        onClick={handleAdd}
                        >
                        <Plus size={14} className="mr-2" /> New Category
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/60 bg-muted/20">
                    <div className="relative max-w-md">
                        <Input
                            placeholder="Search classification..."
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
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Code</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Category Name</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Description</TableHead>
                                <TableHead className="pr-6 py-3 font-semibold text-xs text-foreground/80 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20"><RefreshCcw className="animate-spin text-blue-500 mx-auto" size={24} /></TableCell></TableRow>
                            ) : filteredCategories.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500 font-medium">No records found.</TableCell></TableRow>
                            ) : filteredCategories.map((cat) => (
                                <TableRow key={cat.id} className="group hover:bg-muted/50">
                                    <TableCell className="text-slate-500 font-mono text-xs text-center">{cat.id}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="px-2 py-0.5 rounded-md font-mono text-xs font-medium text-muted-foreground bg-muted/50 border-transparent">
                                            {cat.code || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                                                <Layers size={16} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{cat.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed truncate max-w-xs">{cat.description || '-'}</p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="w-8"><Pencil size={14} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteCategory(cat)} className="w-8"><Trash2 size={14} /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <CategoryFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} initialData={editingCategory} />
            <DangerConfirmModal isOpen={!!deleteCategory} onClose={() => setDeleteCategory(null)} onConfirm={executeDelete} title="Purge Category" message={`Erase classification registry for "${deleteCategory?.name}"?`} isLoading={isProcessing} />
        </div>
    );
};

