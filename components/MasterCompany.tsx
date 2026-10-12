
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Building2, MapPin, Phone, Globe, Pencil, Trash2, RefreshCcw, Tag } from 'lucide-react';
import { CompanyFormModal } from './CompanyFormModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { Company, UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface MasterCompanyProps {
    currentUser: UserAccount | null;
}

export const MasterCompany: React.FC<MasterCompanyProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchCompanies = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('companies').select('*').order('id', { ascending: true });
        if (!error && data) {
            setCompanies(data as Company[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingCompany(null);
        setIsModalOpen(true);
    };

    const handleEdit = (company: Company) => {
        setEditingCompany(company);
        setIsModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteCompany) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('companies').delete().eq('id', deleteCompany.id);
            if (error) throw error;

            await trackActivity(
                currentUser?.fullName || 'User',
                currentUser?.role || 'User',
                'Delete Company',
                'Master',
                `Deleted company ${deleteCompany.name} (${deleteCompany.code})`
            );

            await fetchCompanies();
            setDeleteCompany(null);
        } catch (err: any) {
            showToast("Failed to delete record: " + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (data: Partial<Company>) => {
        if (editingCompany) {
            await supabase.from('companies').update(data).eq('id', editingCompany.id);
        } else {
            await supabase.from('companies').insert([data]);
        }

        await trackActivity(
            currentUser?.fullName || 'User',
            currentUser?.role || 'User',
            editingCompany ? 'Update Company' : 'Create Company',
            'Master',
            `${editingCompany ? 'Updated' : 'Created'} company ${data.name} (${data.code})`
        );

        fetchCompanies();
    };

    return (
        <div className="animate-in fade-in duration-300 pb-10">
            <PageHeader
                title="Master Company"
                description="Manage your enterprise entities & organizational structure"
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchCompanies}
                        className="w-9 hover:bg-muted"
                    >
                        <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        onClick={handleAdd}
                        >
                        <Plus size={14} className="mr-2" /> New Entity
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/60 bg-muted/20">
                    <div className="relative max-w-md">
                        <Input
                            placeholder="Search records..."
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
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Company Name</TableHead>
                                <TableHead className="py-3 font-semibold text-xs text-foreground/80">Address</TableHead>
                                <TableHead className="pr-6 py-3 font-semibold text-xs text-foreground/80 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20"><RefreshCcw className="animate-spin text-blue-500 mx-auto" size={24} /></TableCell></TableRow>
                            ) : filteredCompanies.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500 font-medium">No company records found.</TableCell></TableRow>
                            ) : filteredCompanies.map((company) => (
                                <TableRow key={company.id} className="group hover:bg-muted/50">
                                    <TableCell className="text-slate-500 font-mono text-xs text-center">{company.id}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="px-2 py-0.5 rounded-md font-mono text-xs font-medium text-muted-foreground bg-muted/50 border-transparent">
                                            {company.code || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
                                                <Building2 size={16} />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{company.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed truncate max-w-xs">{company.address}</p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(company)} className="w-8"><Pencil size={14} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteCompany(company)} className="w-8"><Trash2 size={14} /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <CompanyFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} initialData={editingCompany} />
            <DangerConfirmModal isOpen={!!deleteCompany} onClose={() => setDeleteCompany(null)} onConfirm={executeDelete} title="Delete Company" message={`Permanently erase registry for "${deleteCompany?.name}"?`} isLoading={isProcessing} />
        </div>
    );
};

