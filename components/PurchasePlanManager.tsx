'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    ShoppingCart, RefreshCcw, Check, X,
    Trash2, Wallet, Pencil,
    Clock, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight,
    ListFilter, BarChart3, UserCheck, ShieldCheck, Zap, Fingerprint, Eye, FileText
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Cell, PieChart, Pie
} from 'recharts';
import { PurchasePlan, PurchaseRequisition, UserAccount } from '../types';
import { PurchaseRequestModal } from './PurchaseRequestModal';
import { PurchaseDetailModal } from './PurchaseDetailModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { RejectReasonModal } from './RejectReasonModal';
import { PurchaseRequisitionFormModal } from './PurchaseRequisitionFormModal';
import { PurchaseRequisitionDetailModal } from './PurchaseRequisitionDetailModal';
import { supabase } from '../lib/supabaseClient';
import { StatCard } from './StatCard';
import { exportToExcel } from '../lib/excelExport';
import { FileSpreadsheet } from 'lucide-react';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PurchasePlanManagerProps {
    currentUser: UserAccount | null;
}

type ProcurementTab = 'requisitions' | 'approvals' | 'analytics';

export const PurchasePlanManager: React.FC<PurchasePlanManagerProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<ProcurementTab>('requisitions');

    // Legacy state
    const [plans, setPlans] = useState<PurchasePlan[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PurchasePlan | null>(null);
    const [selectedRequesterProfile, setSelectedRequesterProfile] = useState<UserAccount | null>(null);
    const [approverNames, setApproverNames] = useState({ spv: '', manager: '' });
    const [rejectTarget, setRejectTarget] = useState<PurchasePlan | null>(null);
    const [deletePlan, setDeletePlan] = useState<PurchasePlan | null>(null);

    // New Purchase Requisitions state
    const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
    const [isReqFormOpen, setIsReqFormOpen] = useState(false);
    const [isReqDetailOpen, setIsReqDetailOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
    const [editingRequisition, setEditingRequisition] = useState<PurchaseRequisition | null>(null);
    const [rejectRequisitionTarget, setRejectRequisitionTarget] = useState<PurchaseRequisition | null>(null);
    const [deleteRequisitionTarget, setDeleteRequisitionTarget] = useState<PurchaseRequisition | null>(null);

    // Shared state
    const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [usdRate, setUsdRate] = useState<number>(16300);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // RBAC Logic
    const roleLower = (currentUser?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
    const isStaff = roleLower === 'staff';
    const canManage = isAdmin || isSuperAdmin || isStaff;
    const canDelete = isAdmin || isSuperAdmin;

    const mapRequisition = (p: any): PurchaseRequisition => ({
        id: p.id,
        requesterUsername: p.requester_username,
        requesterFullname: p.requester_fullname,
        department: p.department,
        requestDate: p.request_date,
        paidTo: p.paid_to,
        bankAccount: p.bank_account,
        requestedItems: p.requested_items || [],
        itRecommendations: p.it_recommendations || [],
        notes: p.notes,
        grandTotal: Number(p.grand_total) || 0,
        discount: Number(p.discount) || 0,
        deliveryFee: Number(p.delivery_fee) || 0,
        currency: (p.currency as 'IDR' | 'USD') || 'IDR',
        status: p.status,
        category: p.category,
        supervisorId: p.supervisor_id,
        supervisorName: p.supervisor_name,
        supervisorApprovedAt: p.supervisor_approved_at,
        vpId: p.vp_id,
        vpName: p.vp_name,
        vpApprovedAt: p.vp_approved_at,
        financeId: p.finance_id,
        financeName: p.finance_name,
        financeApprovedAt: p.finance_approved_at,
        accountingId: p.accounting_id,
        accountingName: p.accounting_name,
        accountingApprovedAt: p.accounting_approved_at,
        rejectReason: p.reject_reason,
        rejectedBy: p.rejected_by,
        rejectedAt: p.rejected_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users mapping
            const { data: userData } = await supabase.from('user_accounts').select('*');
            if (userData) {
                setAllUsers(userData.map((u: any) => ({
                    id: u.id, email: u.email, fullName: u.full_name, role: u.role, company: u.company, jobTitle: u.job_title,
                    supervisorId: u.supervisor_id?.toString(), managerId: u.manager_id?.toString(), vpId: u.vp_id?.toString(), department: u.department,
                    status: u.status, username: u.username, groups: u.groups || []
                })));
            }

            // Fetch legacy plans
            const { data: planData, error } = await supabase.from('purchase_plans').select('*').order('id', { ascending: false });
            if (error) throw error;
            if (planData) {
                setPlans(planData.map(p => ({
                    id: p.id, item: p.item, specs: p.specs, quantity: p.quantity, unitPrice: p.unit_price,
                    totalPrice: p.total_price, vendor: p.vendor, status: p.status, requester: p.requester,
                    requestDate: p.request_date, justification: p.justification
                })));
            }

            // Fetch PR Requisitions (with graceful fallback if table not created yet)
            try {
                const { data: reqData, error: reqError } = await supabase.from('purchase_requisitions').select('*').order('id', { ascending: false });
                if (reqError) {
                    if (reqError.code === '42P01') {
                        console.warn("purchase_requisitions table not found. Please execute migration_pr_requisitions.sql.");
                    } else {
                        throw reqError;
                    }
                }
                if (reqData) {
                    setRequisitions(reqData.map(mapRequisition));
                }
            } catch (innerErr) {
                console.error("Failed to load purchase requisitions:", innerErr);
            }
            try {
                // open.er-api.com: CORS-enabled, updates daily with today's date
                const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
                if (rateRes.ok) {
                    const rateData = await rateRes.json();
                    if (rateData && rateData.rates && rateData.rates.IDR) {
                        setUsdRate(Math.round(rateData.rates.IDR));
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch realtime USD rate, using fallback.', err);
            }
        } catch (err: any) {
            console.error(err);
            showToast("Failed to reload data: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const getRequesterProfile = (requesterString: string) => {
        if (!allUsers.length) return null;
        const normalize = (s?: string) => (s || '').toLowerCase().trim();
        const normalizedReq = normalize(requesterString);
        let profile = allUsers.find(u => normalize(u.username) === normalizedReq);
        if (profile) return profile;
        profile = allUsers.find(u => normalize(u.fullName) === normalizedReq);
        return profile || null;
    };

    // Routing checkers
    const isMyTurnToApprove = (plan: PurchasePlan) => {
        if (!currentUser || !allUsers.length) return false;
        if (plan.status === 'Approved' || plan.status === 'Rejected') return false;
        const currentUserIdStr = currentUser.id?.toString();
        if (plan.status === 'Pending Approval') return isAdmin;
        const requesterProfile = getRequesterProfile(plan.requester);
        if (!requesterProfile) return false;
        if (plan.status === 'Pending Supervisor') return requesterProfile.supervisorId === currentUserIdStr;
        if (plan.status === 'Pending Manager') return requesterProfile.managerId === currentUserIdStr;
        return false;
    };

    const isMyTurnToApproveRequisition = (req: PurchaseRequisition) => {
        if (!currentUser) return false;
        if (req.status === 'Approved' || req.status === 'Rejected') return false;
        const currentUserIdStr = String(currentUser.id);
        if (req.status === 'Pending Supervisor') return req.supervisorId === currentUserIdStr;
        if (req.status === 'Pending VP') return req.vpId === currentUserIdStr;
        if (req.status === 'Pending Finance') return req.financeId === currentUserIdStr;
        if (req.status === 'Pending Accounting') return req.accountingId === currentUserIdStr;
        return false;
    };

    const stats = useMemo(() => {
        const approvedRequisitions = requisitions.filter(r => r.status === 'Approved');

        const pendingRequisitions = requisitions.filter(r => r.status.includes('Pending'));

        const totalSpend = approvedRequisitions.reduce((sum, r) => {
            const isUSD = String(r.currency || 'IDR').toUpperCase().includes('USD') || String(r.currency || '').toUpperCase() === 'DOLLAR';
            const rate = isUSD ? usdRate : 1; 
            return sum + (r.grandTotal * rate);
        }, 0);

        const unapprovedSpend = pendingRequisitions.reduce((sum, r) => {
            const isUSD = String(r.currency || 'IDR').toUpperCase().includes('USD') || String(r.currency || '').toUpperCase() === 'DOLLAR';
            const rate = isUSD ? usdRate : 1; 
            return sum + (r.grandTotal * rate);
        }, 0);

        const pendingCount = pendingRequisitions.length;

        const actionsCount = requisitions.filter(isMyTurnToApproveRequisition).length;

        const approvedCount = approvedRequisitions.length;

        return { totalSpend, unapprovedSpend, pendingCount, approvedCount, actionsCount };
    }, [requisitions, allUsers, currentUser, usdRate]);

    const filteredRequisitions = useMemo(() => {
        if (activeTab === 'approvals') {
            return requisitions.filter(isMyTurnToApproveRequisition).filter(r =>
                r.requesterFullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.paidTo || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (activeTab !== 'requisitions') return [];
        return requisitions.filter(r =>
            r.requesterFullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.paidTo || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [requisitions, searchTerm, activeTab, currentUser]);

    // Pagination helpers
    const totalPages = useMemo(() => {
        return Math.ceil(filteredRequisitions.length / itemsPerPage);
    }, [filteredRequisitions]);

    const paginatedRequisitions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRequisitions.slice(start, start + itemsPerPage);
    }, [filteredRequisitions, currentPage]);

    const handleExportExcel = () => {
        if (filteredRequisitions.length === 0) return;
        const dataToExport = filteredRequisitions.map(r => ({
            "PR ID": `PR-${String(r.id).padStart(4, '0')}`,
            "Requester": r.requesterFullname,
            "Department": r.department,
            "Date": r.requestDate,
            "Paid To": r.paidTo || "-",
            "Bank Account": r.bankAccount || "-",
            "Grand Total": r.grandTotal,
            "Status": r.status,
            "Notes": r.notes || "-"
        }));
        exportToExcel(dataToExport, `GESIT-PR-REQUISITIONS-${new Date().toISOString().split('T')[0]}`);
    };

    const analyticsData = useMemo(() => {
        const statuses: Record<string, number> = {};
        requisitions.forEach(r => { statuses[r.status] = (statuses[r.status] || 0) + 1; });

        const vendors: Record<string, number> = {};
        requisitions.forEach(r => {
            (r.itRecommendations || []).forEach(item => {
                const v = item.vendor || 'Unknown';
                vendors[v] = (vendors[v] || 0) + (item.price * item.qty);
            });
        });

        const statusChart = Object.entries(statuses).map(([name, value]) => ({ name, value }));
        const vendorChart = Object.entries(vendors)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return { statusChart, vendorChart };
    }, [requisitions]);

    // Legacy Approvals
    const handleApprove = async (plan: PurchasePlan) => {
        setIsActionLoading(true);
        try {
            const requesterProfile = getRequesterProfile(plan.requester);
            let nextStatus = 'Approved';
            if (plan.status === 'Pending Supervisor') nextStatus = (requesterProfile && requesterProfile.managerId) ? 'Pending Manager' : 'Approved';
            else if (plan.status === 'Pending Manager' || plan.status === 'Pending Approval') nextStatus = 'Approved';
            const { error } = await supabase.from('purchase_plans').update({ status: nextStatus }).eq('id', plan.id);
            if (error) throw error;
            showToast("Legacy plan approved", "success");
            await fetchData();
        } catch (err: any) { showToast("Authorization failed: " + err.message, 'error'); } finally { setIsActionLoading(false); }
    };

    const submitReject = async (reason: string) => {
        if (!rejectTarget) return;
        setIsActionLoading(true);
        try {
            const { error } = await supabase.from('purchase_plans').update({ status: 'Rejected', justification: `${rejectTarget.justification}\n\n[DENIED]: ${reason}` }).eq('id', rejectTarget.id);
            if (error) throw error;
            setRejectTarget(null);
            showToast("Legacy plan rejected", "success");
            await fetchData();
        } catch (err: any) { showToast("Denial failed: " + err.message, 'error'); } finally { setIsActionLoading(false); }
    };

    const handleEditRequisition = async (payload: Partial<PurchaseRequisition>) => {
        if (!editingRequisition) return;
        setIsActionLoading(true);
        try {
            const { error } = await supabase
                .from('purchase_requisitions')
                .update({
                    department: payload.department,
                    company: payload.company,
                    paid_to: payload.paidTo,
                    bank_account: payload.bankAccount,
                    requested_items: payload.requestedItems,
                    it_recommendations: payload.itRecommendations,
                    notes: payload.notes,
                    grand_total: payload.grandTotal,
                    discount: payload.discount,
                    delivery_fee: payload.deliveryFee,
                    currency: payload.currency,
                    category: payload.category,
                    supervisor_id: payload.supervisorId,
                    supervisor_name: payload.supervisorName,
                    vp_id: payload.vpId,
                    vp_name: payload.vpName,
                })
                .eq('id', editingRequisition.id);
            if (error) throw error;
            setEditingRequisition(null);
            setIsReqFormOpen(false);
            showToast('Requisition updated successfully', 'success');
            fetchData();
        } catch (err: any) {
            showToast('Update failed: ' + err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Requisition Approvals
    const handleApproveRequisition = async (req: PurchaseRequisition) => {
        setIsActionLoading(true);
        try {
            let nextStatus: PurchaseRequisition['status'] = 'Approved';
            const now = new Date().toISOString();
            const updateData: any = {};
            const currentUserIdStr = String(currentUser?.id);
            const currentUserName = currentUser?.fullName || 'Approver';

            if (req.status === 'Pending Supervisor') {
                nextStatus = 'Pending VP';
                updateData.supervisor_approved_at = now;
                updateData.supervisor_name = currentUserName;
            } else if (req.status === 'Pending VP') {
                nextStatus = 'Approved';
                updateData.vp_approved_at = now;
                updateData.vp_name = currentUserName;

                // Auto-insert into purchase_records
                try {
                    const desc = req.requestedItems && req.requestedItems.length > 0
                        ? req.requestedItems.map(item => item.description).join(', ')
                        : `Purchase Request #${req.id}`;

                    const totalQty = req.itRecommendations && req.itRecommendations.length > 0
                        ? req.itRecommendations.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
                        : req.requestedItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

                    const recordItems = (req.itRecommendations && req.itRecommendations.length > 0)
                        ? req.itRecommendations.map(item => ({
                            description: item.description,
                            qty: item.qty,
                            price: item.price,
                            vendor: item.vendor
                        }))
                        : req.requestedItems.map(item => ({
                            description: item.description,
                            qty: item.qty,
                            price: req.grandTotal / (req.requestedItems.length || 1),
                            vendor: ''
                        }));

                    const vendorName = req.itRecommendations && req.itRecommendations.length > 0
                        ? req.itRecommendations[0].vendor
                        : 'Various';

                    const pDateObj = new Date(req.requestDate || now.split('T')[0]);
                    const yy = pDateObj.getFullYear().toString().slice(-2);
                    const mm = (pDateObj.getMonth() + 1).toString().padStart(2, '0');
                    const dd = pDateObj.getDate().toString().padStart(2, '0');
                    const prefix = `TR-${yy}${mm}${dd}-`;

                    const { data: trxData } = await supabase
                        .from('purchase_records')
                        .select('transaction_id')
                        .like('transaction_id', `${prefix}%`)
                        .order('transaction_id', { ascending: false })
                        .limit(1);

                    let nextNumber = 1;
                    if (trxData && trxData.length > 0 && trxData[0].transaction_id) {
                        const lastId = trxData[0].transaction_id;
                        const lastNumber = parseInt(lastId.split('-').pop() || '0', 10);
                        if (!isNaN(lastNumber)) {
                            nextNumber = lastNumber + 1;
                        }
                    }

                    const newTrxId = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

                    const purchaseRecordPayload = {
                        transaction_id: newTrxId,
                        description: desc || `Purchase Request #${req.id}`,
                        qty: totalQty || 1,
                        price: req.grandTotal / (totalQty || 1),
                        vat: 0,
                        delivery_fee: 0,
                        insurance: 0,
                        app_fee: 0,
                        other_cost: 0,
                        subtotal: req.grandTotal,
                        total_va: req.grandTotal,
                        project_name: '-',
                        user_name: req.requesterFullname,
                        department: req.department,
                        company: 'THE GESIT COMPANIES',
                        status: 'Paid',
                        purchase_date: req.requestDate || now.split('T')[0],
                        payment_date: null,
                        vendor: vendorName || 'Various',
                        platform: '-',
                        payment_method: 'Transfer',
                        category: req.category || 'Hardware',
                        evidence_link: '',
                        input_by: 'System (Auto-inserted via PR VP Approval)',
                        remarks: req.notes ? `${req.notes}\n[PR #${req.id}]` : `Auto-generated from Approved Requisition #${req.id}`,
                        docs: {
                            prForm: true,
                            cashAdvance: false,
                            checkout: false,
                            paymentSlip: false,
                            invoice: false,
                            expenseApproval: false,
                            checkByRara: false
                        },
                        items: recordItems
                    };

                    const { error: insertErr } = await supabase.from('purchase_records').insert([purchaseRecordPayload]);
                    if (insertErr) {
                        console.error('Error auto-inserting purchase record:', insertErr);
                    } else {
                        // Log activity for auto-generation
                        await supabase.from('activity_logs').insert([{
                            activity_name: `Auto Purchase Record: PR-${String(req.id).padStart(4, '0')}`,
                            category: 'Procurement',
                            requester: req.requesterFullname,
                            department: req.department,
                            it_personnel: currentUserName,
                            type: req.grandTotal > 10000000 ? 'Critical' : 'Minor',
                            status: 'Completed',
                            remarks: `Auto-generated purchase record from Requisition #${req.id} approved by VP.`,
                            created_at: now
                        }]);
                    }
                } catch (autoInsertErr) {
                    console.error('Auto-insert exception:', autoInsertErr);
                }
            } else if (req.status === 'Pending Finance') {
                nextStatus = 'Pending Accounting';
                updateData.finance_approved_at = now;
                updateData.finance_name = currentUserName;
            } else if (req.status === 'Pending Accounting') {
                nextStatus = 'Approved';
                updateData.accounting_approved_at = now;
                updateData.accounting_name = currentUserName;
            }

            updateData.status = nextStatus;

            const { error } = await supabase.from('purchase_requisitions').update(updateData).eq('id', req.id);
            if (error) throw error;

            showToast("Requisition approved successfully", "success");
            setIsReqDetailOpen(false);
            setSelectedRequisition(null);
            await fetchData();
        } catch (err: any) {
            showToast("Approval failed: " + err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const submitRejectRequisition = async (reason: string) => {
        if (!rejectRequisitionTarget) return;
        setIsActionLoading(true);
        try {
            const now = new Date().toISOString();
            const { error } = await supabase.from('purchase_requisitions').update({
                status: 'Rejected',
                reject_reason: reason,
                rejected_by: String(currentUser?.id),
                rejected_at: now
            }).eq('id', rejectRequisitionTarget.id);

            if (error) throw error;

            setRejectRequisitionTarget(null);
            setIsReqDetailOpen(false);
            setSelectedRequisition(null);
            showToast("Requisition rejected successfully", "success");
            await fetchData();
        } catch (err: any) {
            showToast("Rejection failed: " + err.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const getStatusDisplay = (plan: PurchasePlan) => {
        const isMyAction = isMyTurnToApprove(plan);
        if (isMyAction) {
            return (
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-primary font-semibold text-xs animate-pulse"><Zap size={10} className="fill-current" /> Action Required</div>
                    <div className="text-xs text-muted-foreground italic">Pending your signature</div>
                </div>
            );
        }
        if (plan.status.startsWith('Pending')) {
            const profile = getRequesterProfile(plan.requester);
            let waitingFor = 'HQ Admin';
            if (plan.status === 'Pending Supervisor' && profile) waitingFor = allUsers.find(u => u.id.toString() === profile.supervisorId)?.fullName || 'Supervisor';
            else if (plan.status === 'Pending Manager' && profile) waitingFor = allUsers.find(u => u.id.toString() === profile.managerId)?.fullName || 'Manager';
            return (<div className="flex flex-col gap-0.5"><div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs"><Clock size={11} /> {plan.status.replace('Pending ', '')}</div><div className="text-xs text-muted-foreground">Waiting for {waitingFor.split(' ')[0]}</div></div>);
        }
        if (plan.status === 'Approved') return <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs"><CheckCircle2 size={11} /> Approved</div>;
        return <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-xs"><XCircle size={11} /> Rejected</div>;
    };

    const getRequisitionStatusDisplay = (req: PurchaseRequisition) => {
        const isMyAction = isMyTurnToApproveRequisition(req);
        if (isMyAction) {
            return (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary animate-pulse">
                    <Zap size={9} className="fill-primary" />
                    <span className="text-xs font-medium">Action Required</span>
                </div>
            );
        }
        if (req.status.startsWith('Pending')) {
            let waitingFor = 'Approver';
            if (req.status === 'Pending Supervisor') {
                waitingFor = allUsers.find(u => String(u.id) === req.supervisorId)?.fullName?.split(' ')[0] || 'Supervisor';
            } else if (req.status === 'Pending VP') {
                waitingFor = allUsers.find(u => String(u.id) === req.vpId)?.fullName?.split(' ')[0] || 'VP';
            } else if (req.status === 'Pending Finance') {
                waitingFor = 'Finance';
            } else if (req.status === 'Pending Accounting') {
                waitingFor = 'Accounting';
            }
            return (
                <div className="flex flex-col gap-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 w-fit">
                        <Clock size={9} className="text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{req.status.replace('Pending ', '')}</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-1">→ {waitingFor}</span>
                </div>
            );
        }
        if (req.status === 'Approved') return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                <CheckCircle2 size={9} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Approved</span>
            </div>
        );
        return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25">
                <XCircle size={9} className="text-rose-500" />
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Rejected</span>
            </div>
        );
    };

    const getCategoryBadge = (category: string | undefined) => {
        const map: Record<string, { bg: string; text: string }> = {
            'Hardware':             { bg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800', text: 'text-violet-600 dark:text-violet-400' },
            'Accessories':          { bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',         text: 'text-sky-600 dark:text-sky-400' },
            'Cloud & Hosting':      { bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',      text: 'text-blue-600 dark:text-blue-400' },
            'Subscription':         { bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800', text: 'text-indigo-600 dark:text-indigo-400' },
            'Maintenance & Support':{ bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800', text: 'text-orange-600 dark:text-orange-400' },
            'IT Services':          { bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',     text: 'text-teal-600 dark:text-teal-400' },
        };
        const c = map[category || ''] || { bg: 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700', text: 'text-slate-500 dark:text-zinc-400' };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${c.bg} ${c.text}`}>
                {category || '—'}
            </span>
        );
    };

    const formatIDR = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    const handleCreateRequisition = async (payload: Partial<PurchaseRequisition>) => {
        try {
            const { error } = await supabase.from('purchase_requisitions').insert([
                {
                    requester_username: payload.requesterUsername,
                    requester_fullname: payload.requesterFullname,
                    department: payload.department,
                    company: payload.company,
                    request_date: payload.requestDate,
                    paid_to: payload.paidTo,
                    bank_account: payload.bankAccount,
                    requested_items: payload.requestedItems,
                    it_recommendations: payload.itRecommendations,
                    notes: payload.notes,
                    grand_total: payload.grandTotal,
                    discount: payload.discount,
                    delivery_fee: payload.deliveryFee,
                    status: payload.status,
                    category: payload.category,
                    supervisor_id: payload.supervisorId,
                    supervisor_name: payload.supervisorName,
                    vp_id: payload.vpId,
                    vp_name: payload.vpName,
                    finance_id: payload.financeId,
                    finance_name: payload.financeName,
                    accounting_id: payload.accountingId,
                    accounting_name: payload.accountingName
                }
            ]);
            if (error) throw error;
            setIsReqFormOpen(false);
            showToast("Requisition submitted successfully", "success");
            fetchData();
        } catch (err: any) {
            showToast("Submission failed: " + err.message, "error");
        }
    };

    const selectedRequisitionWithNames = useMemo(() => {
        if (!selectedRequisition || !allUsers.length) return selectedRequisition;
        return {
            ...selectedRequisition,
            supervisorName: selectedRequisition.supervisorName || allUsers.find(u => String(u.id) === selectedRequisition.supervisorId)?.fullName || '',
            vpName: selectedRequisition.vpName || allUsers.find(u => String(u.id) === selectedRequisition.vpId)?.fullName || '',
        };
    }, [selectedRequisition, allUsers]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <PageHeader
                title="Procurement Center"
                description="Managed investment & equipment audit log"
            >
                <div className="flex justify-center mb-2">
                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1); }} className="w-auto">
                        <TabsList>
                            <TabsTrigger value="requisitions">
                                <FileText size={14} className="mr-2" /> PR REQUISITIONS
                            </TabsTrigger>
                            <TabsTrigger value="approvals">
                                <UserCheck size={14} className="mr-2" /> MY TASKS ({stats.actionsCount})
                            </TabsTrigger>
                            <TabsTrigger value="analytics">
                                <BarChart3 size={14} className="mr-2" /> REPORTS
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                <StatCard label="Approved budget" value={formatIDR(stats.totalSpend)} icon={Wallet} color="emerald" subValue="Total verified" />
                <StatCard label="Pending budget" value={formatIDR(stats.unapprovedSpend)} icon={Wallet} color="amber" subValue="Total unapproved" />
                <StatCard label="Tasks" value={stats.actionsCount} icon={ShieldCheck} color={stats.actionsCount > 0 ? "rose" : "blue"} subValue="Awaiting your ID" />
                <StatCard label="Global queue" value={stats.pendingCount} icon={Clock} color="amber" subValue="Requests in cycle" />
                <StatCard label="Fulfilled" value={stats.approvedCount} icon={CheckCircle2} color="blue" subValue="Completed nodes" />
            </div>

            <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col min-h-[550px]">
                <div className="px-6 py-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-card sticky top-0 z-20">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or department..."
                            className="w-full pl-11 bg-muted/20 border-muted-foreground/10 focus-visible:ring-1 focus-visible:ring-primary h-11"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleExportExcel}
                                className="w-11 border-muted-foreground/10 rounded-xl"
                                title="Export Excel"
                            >
                                <FileSpreadsheet size={18} />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={fetchData}
                                className="w-11 text-muted-foreground hover:text-primary border-muted-foreground/10 rounded-xl"
                            >
                                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                            </Button>
                        </div>
                        {canManage && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setIsReqFormOpen(true)}
                                    className="gap-2 rounded-xl"
                                >
                                    New Request
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    {activeTab === 'analytics' ? (
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Status Distribution */}
                                <div className="bg-muted/20 p-6 rounded-2xl border border-border/60">
                                    <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                                        <Clock size={14} /> Workflow Distribution
                                    </h3>
                                    <div className="h-64 w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analyticsData.statusChart}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analyticsData.statusChart.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][index % 5]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{plans.length + requisitions.length}</span>
                                            <span className="text-xs font-semibold text-muted-foreground">Requests</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {analyticsData.statusChart.map((s, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-background rounded-md border text-foreground">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][idx % 5] }} />
                                                <span className="text-xs font-medium text-muted-foreground truncate">{s.name}</span>
                                                <span className="ml-auto text-xs font-bold">{s.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Vendors Spending */}
                                <div className="bg-muted/20 p-6 rounded-2xl border border-border/60">
                                    <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                                        <ShoppingCart size={14} /> Top Projected Spend by Vendor
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.vendorChart} margin={{ top: 0, right: 30, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                <YAxis hide />
                                                <Tooltip
                                                    formatter={(value: number) => formatIDR(value)}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                    {analyticsData.vendorChart.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={1 - (index * 0.15)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-xs text-center text-muted-foreground mt-4">Aggregated cost from all request types</p>
                                </div>
                            </div>
                            <div className="p-12 text-center border-t border-border/60 border-dashed">
                                <p className="text-xs font-medium text-muted-foreground/50 tracking-wide">Full Audit Trail Synced with Corporate Ledger</p>
                            </div>
                        </div>
                    ) : (
                        /* REQUISITIONS TABLE VIEW */
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30 text-muted-foreground font-semibold text-xs border-b border-border">
                                    <th className="px-5 py-3">PR #</th>
                                    <th className="px-5 py-3">Requester</th>
                                    <th className="px-5 py-3">Category</th>
                                    <th className="px-5 py-3">Paid To</th>
                                    <th className="px-5 py-3 text-right">Grand Total</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading && !paginatedRequisitions.length ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={idx} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-5"><Skeleton className="h-4 w-16" /></td>
                                            <td className="px-6 py-5"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-6 py-5"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-6 py-5"><Skeleton className="h-4 w-20 ml-auto" /></td>
                                            <td className="px-6 py-5"><Skeleton className="h-4 w-20" /></td>
                                            <td className="px-6 py-5"><Skeleton className="h-8 w-8 mx-auto" /></td>
                                        </tr>
                                    ))
                                ) : filteredRequisitions.length === 0 ? (
                                    <tr><td colSpan={6} className="py-24 text-center text-muted-foreground text-xs italic">No PR requisitions found.</td></tr>
                                ) : paginatedRequisitions.map(req => {
                                    const isMyTurn = isMyTurnToApproveRequisition(req);
                                    return (
                                        <tr key={req.id} className={cn("hover:bg-muted/50 transition-colors group align-middle", isMyTurn && "bg-primary/5 border-l-2 border-l-primary")}>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-semibold text-xs text-foreground">PR-{String(req.id).padStart(4, '0')}</span>
                                                    <span className="text-xs text-muted-foreground mt-0.5">{req.requestDate}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground text-xs">{req.requesterFullname}</span>
                                                    <span className="text-xs text-muted-foreground font-mono mt-0.5">{req.department}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {getCategoryBadge(req.category)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-sm text-foreground font-medium">{req.paidTo || <span className="text-muted-foreground italic">—</span>}</span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-mono text-sm font-semibold text-foreground">
                                                        {String(req.currency || 'IDR').toUpperCase().includes('USD') || String(req.currency || '').toUpperCase() === 'DOLLAR'
                                                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(req.grandTotal)
                                                            : formatIDR(req.grandTotal)}
                                                    </span>
                                                    {req.currency === 'USD' && <span className="text-xs text-muted-foreground font-mono">USD</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {getRequisitionStatusDisplay(req)}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setSelectedRequisition(req); setIsReqDetailOpen(true); }}
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        title="View PR Details"
                                                    >
                                                        <Eye size={15} />
                                                    </Button>
                                                    {isMyTurn ? (
                                                        <>
                                                            <Button
                                                                size="icon"
                                                                variant="default"
                                                                onClick={() => handleApproveRequisition(req)}
                                                                disabled={isActionLoading}
                                                                className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                title="Approve"
                                                            >
                                                                <Check size={14} strokeWidth={3} />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="default"
                                                                onClick={() => setRejectRequisitionTarget(req)}
                                                                disabled={isActionLoading}
                                                                className="h-8 w-8 bg-rose-600 hover:bg-rose-700 text-white"
                                                                title="Reject"
                                                            >
                                                                <X size={14} strokeWidth={3} />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                             {(isAdmin || isSuperAdmin) && req.status !== 'Approved' && req.status !== 'Rejected' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => { setEditingRequisition(req); setIsReqFormOpen(true); }}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
                                                                    title="Edit (Admin)"
                                                                >
                                                                    <Pencil size={13} />
                                                                </Button>
                                                            )}
                                                            {canDelete && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setDeleteRequisitionTarget(req)}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-between shrink-0">
                    <p className="text-xs font-medium text-muted-foreground">Page {currentPage} of {totalPages || 1} • {filteredRequisitions.length} records</p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="w-8 text-muted-foreground hover:text-primary transition-all"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="w-8 text-muted-foreground hover:text-primary transition-all"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Form Modals - handles both Create and Edit */}
            <PurchaseRequisitionFormModal
                isOpen={isReqFormOpen}
                onClose={() => { setIsReqFormOpen(false); setEditingRequisition(null); }}
                onSubmit={editingRequisition ? handleEditRequisition : handleCreateRequisition}
                currentUser={currentUser}
                allUsers={allUsers}
                initialData={editingRequisition}
                usdRate={usdRate}
            />

            {/* Detail Modals */}
            <PurchaseRequisitionDetailModal 
                isOpen={isReqDetailOpen} 
                onClose={() => setIsReqDetailOpen(false)} 
                requisition={selectedRequisitionWithNames} 
                currentUser={currentUser} 
                onApprove={handleApproveRequisition} 
                onReject={(req) => setRejectRequisitionTarget(req)} 
                usdRate={usdRate} 
                onUpdate={fetchData}
            />

            {/* Reject Reason Modals */}
            <RejectReasonModal isOpen={!!rejectRequisitionTarget} onClose={() => setRejectRequisitionTarget(null)} onSubmit={submitRejectRequisition} itemName={rejectRequisitionTarget ? `PR Requisition for ${rejectRequisitionTarget.requesterFullname}` : ''} />

            <DangerConfirmModal isOpen={!!deleteRequisitionTarget} onClose={() => setDeleteRequisitionTarget(null)} onConfirm={async () => { if (!deleteRequisitionTarget) return; await supabase.from('purchase_requisitions').delete().eq('id', deleteRequisitionTarget.id); setDeleteRequisitionTarget(null); fetchData(); }} title="Purge PR Requisition" message={deleteRequisitionTarget ? `Remove PR Requisition PR-${String(deleteRequisitionTarget.id).padStart(4, '0')} permanently?` : ''} />
        </div>
    );
};
