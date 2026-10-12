
'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Search, RefreshCcw, ShoppingCart, User, Calendar, CheckCircle2, XCircle, UserCheck, AlertCircle } from 'lucide-react';
import { PurchasePlan, UserAccount } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ApprovalManagerProps {
    currentUser?: UserAccount | null;
}

export const ApprovalManager: React.FC<ApprovalManagerProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [pendingRequests, setPendingRequests] = useState<PurchasePlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [usersMap, setUsersMap] = useState<Record<string, UserAccount>>({});
    // Reverse map for name-based lookup
    const [usersByName, setUsersByName] = useState<Record<string, UserAccount>>({});

    const formatErrorMessage = (err: any): string => {
        if (!err) return "Unknown error occurred";
        if (typeof err === 'string') return err;

        const message = err.message || err.error_description || err.error?.message;
        const details = err.details || "";
        const hint = err.hint || "";
        const code = err.code || "";

        if (message) {
            return `${message}${details ? ' (Details: ' + details + ')' : ''}${hint ? ' (Hint: ' + hint + ')' : ''}${code ? ' [Code: ' + code + ']' : ''}`;
        }

        try {
            const allProps: Record<string, any> = {};
            Object.getOwnPropertyNames(err).forEach(key => {
                allProps[key] = err[key];
            });
            return JSON.stringify(allProps, null, 2);
        } catch (e) {
            return String(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase.from('user_accounts').select('*');
            if (error) throw error;
            if (data) {
                const map: Record<string, UserAccount> = {};
                const nameMap: Record<string, UserAccount> = {};
                data.forEach((u: any) => {
                    const user: UserAccount = {
                        ...u,
                        fullName: u.full_name,
                        supervisorId: u.supervisor_id?.toString(),
                        managerId: u.manager_id?.toString()
                    };
                    map[u.id.toString()] = user;
                    nameMap[u.full_name.toLowerCase()] = user;
                });
                setUsersMap(map);
                setUsersByName(nameMap);
                return { map, nameMap };
            }
        } catch (err) {
            console.error("Fetch users error:", err);
        }
        return { map: {}, nameMap: {} };
    };

    const fetchPendingRequests = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const { map: currentUsersMap, nameMap: currentNameMap } = await fetchUsers();

            const { data, error } = await supabase
                .from('purchase_plans')
                .select('*')
                .in('status', ['Pending Supervisor', 'Pending Manager', 'Pending Approval'])
                .order('id', { ascending: false });

            if (error) throw error;

            if (data) {
                const myPendingItems: PurchasePlan[] = [];

                data.forEach(p => {
                    const plan: PurchasePlan = {
                        id: p.id,
                        item: p.item,
                        specs: p.specs,
                        quantity: p.quantity,
                        unitPrice: p.unit_price,
                        totalPrice: p.total_price,
                        vendor: p.vendor,
                        status: p.status,
                        requester: p.requester,
                        requestDate: p.request_date,
                        justification: p.justification
                    };

                    // Use name-based fallback lookup for requester data
                    const requesterData = currentNameMap[plan.requester.toLowerCase()];

                    let showForMe = false;

                    if (currentUser.role === 'Admin' && plan.status === 'Pending Approval') {
                        showForMe = true;
                    }

                    if (requesterData && requesterData.supervisorId === currentUser.id?.toString() && plan.status === 'Pending Supervisor') {
                        showForMe = true;
                    }

                    if (requesterData && requesterData.managerId === currentUser.id?.toString() && plan.status === 'Pending Manager') {
                        showForMe = true;
                    }

                    if (showForMe) {
                        myPendingItems.push(plan);
                    }
                });

                setPendingRequests(myPendingItems);
            }
        } catch (err: any) {
            const readableError = formatErrorMessage(err);
            console.error("Approval fetch error details:", readableError);
            setErrorMessage(`Gagal mengambil data persetujuan: ${readableError}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, [currentUser]);

    const handleApprove = async (plan: PurchasePlan) => {
        if (!confirm(`Approve request "${plan.item}" dari ${plan.requester}?`)) return;

        const requesterData = usersByName[plan.requester.toLowerCase()];
        let nextStatus = 'Approved';

        if (plan.status === 'Pending Supervisor') {
            if (requesterData && requesterData.managerId) {
                nextStatus = 'Pending Manager';
            }
        } else if (plan.status === 'Pending Manager') {
            nextStatus = 'Approved';
        }

        try {
            const { error } = await supabase.from('purchase_plans').update({ status: nextStatus }).eq('id', plan.id);
            if (error) throw error;
            fetchPendingRequests();
        } catch (err: any) {
            showToast(`Gagal menyetujui: ${formatErrorMessage(err)}`, 'error');
        }
    };

    const handleReject = async (plan: PurchasePlan) => {
        if (confirm(`Tolak request "${plan.item}" dari ${plan.requester}?`)) {
            try {
                const { error } = await supabase.from('purchase_plans').update({ status: 'Rejected' }).eq('id', plan.id);
                if (error) throw error;
                fetchPendingRequests();
            } catch (err: any) {
                showToast(`Gagal menolak: ${formatErrorMessage(err)}`, 'error');
            }
        }
    };

    const formatIDR = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
    };

    const filteredRequests = pendingRequests.filter(req =>
        req.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requester.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-300">
            <PageHeader
                title="Approvals Required"
                description="Purchase request verification & protocol compliance"
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchPendingRequests}
                        className="w-9 hover:bg-muted"
                    >
                        <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </PageHeader>

            {errorMessage && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-destructive animate-in slide-in-from-top-2">
                    <AlertCircle size={20} className="shrink-0 mt-0.5 text-destructive/80" />
                    <div className="flex-1">
                        <div className="flex justify-between">
                            <p className="font-semibold text-sm">Fetch Error</p>
                            <Button variant="ghost" size="icon-xs" onClick={() => setErrorMessage(null)} className="text-destructive"><X size={14} /></Button>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1 font-mono">{errorMessage}</p>
                    </div>
                </div>
            )}

            <div className="bg-card border border-border/40 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/40 bg-muted/20">
                    <div className="relative max-w-md">
                        <Input
                            type="text"
                            placeholder="Cari item atau pemohon..."
                            className="w-full pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {isLoading ? (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <RefreshCcw className="animate-spin text-primary" size={32} />
                            <p className="font-medium">Memuat data persetujuan...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="p-16 text-center text-muted-foreground">
                            <ShoppingCart size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="text-lg font-semibold text-foreground">Tidak ada tugas persetujuan</p>
                            <p className="text-sm opacity-70">Semua permintaan pembelian telah diproses atau belum ada permintaan baru.</p>
                        </div>
                    ) : filteredRequests.map(req => (
                        <div key={req.id} className="p-5 flex flex-col md:flex-row gap-5 items-start hover:bg-muted/30 transition-colors">
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-base font-semibold text-foreground">{req.item}</h3>
                                    <Badge variant="outline" className="border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-xs font-medium ml-4">
                                        {req.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 font-medium">{req.specs}</p>
                                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <User size={14} className="text-muted-foreground/60" />
                                        <span>Pemohon: {req.requester}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-muted-foreground/60" />
                                        <span>Tanggal: {req.requestDate}</span>
                                    </div>
                                    <Badge variant="outline" className="border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10 text-xs font-medium">
                                        Total: {formatIDR(req.totalPrice)}
                                    </Badge>
                                </div>
                                <div className="mt-3 p-3 bg-muted/20 rounded-lg text-xs italic text-muted-foreground border border-border/40">
                                    "{req.justification}"
                                </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto md:flex-none mt-4 md:mt-0">
                                <Button
                                    variant="outline"
                                    onClick={() => handleReject(req)}
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10 flex-1 md:flex-none"
                                >
                                    Reject
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={() => handleApprove(req)}
                                    className="flex-1 md:flex-none"
                                >
                                    <Check size={16} /> Approve
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
