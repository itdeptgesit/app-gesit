'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Plus, RefreshCcw, FileSpreadsheet, Trash2, Pencil, Filter,
    ArrowUpRight, Wallet, CheckCircle2, Clock, Briefcase, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Check, BarChart3, Eye, Tag, PieChart, Calendar, Building2,
    Save, AlertTriangle, Database, LayoutGrid, TableProperties, SlidersHorizontal, RotateCcw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Area
} from 'recharts';
import { PurchaseRecord, UserAccount, PurchaseBudget } from '../types';
import { PurchaseRecordFormModal } from './PurchaseRecordFormModal';
import { PurchaseRecordDetailModal } from './PurchaseRecordDetailModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../translations';
import { StatCard } from './StatCard';
import { FinancialHealthSummary } from './FinancialHealthSummary';
import { TopVendorsWidget } from './TopVendorsWidget';
import { exportToExcel } from '../lib/excelExport';
import { sendToGoogleSheet } from '../lib/googleSheets';
import { useToast } from './ToastProvider';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 dark:bg-zinc-950/95 backdrop-blur-md text-white border border-slate-200/10 dark:border-white/10 rounded-2xl p-4 shadow-2xl w-[220px] pointer-events-none flex flex-col gap-2">
                <p className="text-xs font-medium text-slate-300 m-0 leading-none">{label}</p>
                <div className="flex flex-col gap-1">
                    {payload.map((pld: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-xs font-bold mt-1">
                            <span className="text-xs text-slate-300/70">Total Value</span>
                            <span className="text-white font-mono">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(pld.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const DOC_KEYS = [
    { key: 'prForm', label: 'PR Form' },
    { key: 'cashAdvance', label: 'Cash Advance' },
    { key: 'checkout', label: 'Checkout' },
    { key: 'paymentSlip', label: 'Payment Slip' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'expenseApproval', label: 'Expense Approval' },
    { key: 'checkByRara', label: 'Audited' }
];

export const PurchaseRecordManager = ({ currentUser }: { currentUser: UserAccount | null }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [records, setRecords] = useState<PurchaseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [projectFilter, setProjectFilter] = useState('All');

    // Advanced Filters
    const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
    const [quarterFilter, setQuarterFilter] = useState('All');
    const [monthFilter, setMonthFilter] = useState('All');
    const [companyFilter, setCompanyFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);
    const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const periodRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (periodRef.current && !periodRef.current.contains(event.target as Node)) {
                setIsPeriodOpen(false);
            }
        };
        if (isPeriodOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPeriodOpen]);

    const periodLabel = useMemo(() => {
        if (startDate && endDate) {
            return `${startDate} - ${endDate}`;
        }
        if (monthFilter !== 'All') {
            return `${monthFilter.slice(0, 3)} ${yearFilter !== 'All' ? yearFilter : ''}`.trim();
        }
        if (quarterFilter !== 'All') {
            return `${quarterFilter} ${yearFilter !== 'All' ? `FY ${yearFilter}` : ''}`.trim();
        }
        if (yearFilter !== 'All') {
            return `FY ${yearFilter}`;
        }
        return 'All Period';
    }, [yearFilter, monthFilter, quarterFilter, startDate, endDate]);

    const activeMoreFiltersCount = useMemo(() => {
        let count = 0;
        if (categoryFilter !== 'All') count++;
        if (projectFilter !== 'All') count++;
        if (statusFilter !== 'All') count++;
        return count;
    }, [categoryFilter, projectFilter, statusFilter]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PurchaseRecord | null>(null);
    const [deleteRecord, setDeleteRecord] = useState<PurchaseRecord | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<PurchaseRecord | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Budgeting Feature States
    const [viewMode, setViewMode] = useState<'ledger' | 'budgeting'>('ledger');
    const [budgetYear, setBudgetYear] = useState<number>(new Date().getFullYear());
    const [budgets, setBudgets] = useState<PurchaseBudget[]>([]);
    const [budgetSheetMode, setBudgetSheetMode] = useState<'budget' | 'actual' | 'variance'>('variance');
    const [isSavingBudget, setIsSavingBudget] = useState(false);
    const [isDbPersistent, setIsDbPersistent] = useState(true);
    const [budgetViewLayout, setBudgetViewLayout] = useState<'visual' | 'spreadsheet'>('visual');
    const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({});
    const [editedBudgets, setEditedBudgets] = useState<Record<string, Record<string, number>>>({});

    const handleCellChange = (category: string, monthKey: string, value: string) => {
        if (value === '') {
            setEditedBudgets(prev => ({
                ...prev,
                [category]: {
                    ...prev[category],
                    [monthKey]: 0
                }
            }));
            return;
        }
        const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
        setEditedBudgets(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [monthKey]: numValue
            }
        }));
    };

    const STANDARD_CATEGORIES = ['Hardware', 'Accessories', 'Cloud & Hosting', 'Subscription', 'Maintenance & Support', 'IT Services'];
    const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('purchase_records').select('*, payment_method, evidence_link').order('purchase_date', { ascending: false });
            if (data) {
                const sanitizeFetchDate = (date: string | null | undefined) => {
                    if (!date || date === '-' || date.toString().toLowerCase() === 'nan') return null;
                    return date;
                };

                setRecords(data.map((r: any) => ({
                    id: r.id, transactionId: r.transaction_id, description: r.description,
                    qty: r.qty, price: r.price, vat: r.vat, deliveryFee: r.delivery_fee,
                    insurance: r.insurance, appFee: r.app_fee, otherCost: r.other_cost,
                    subtotal: r.subtotal, totalVa: r.total_va, projectName: r.project_name,
                    user: r.user_name, department: r.department, company: r.company,
                    status: r.status,
                    purchaseDate: sanitizeFetchDate(r.purchase_date),
                    paymentDate: sanitizeFetchDate(r.payment_date),
                    paymentMethod: r.payment_method,
                    category: r.category,
                    evidenceLink: r.evidence_link,
                    inputBy: r.input_by,
                    vendor: r.vendor, platform: r.platform, remarks: r.remarks, docs: r.docs || {},
                    items: r.items || []
                })));
            }
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchRecords(); }, []);

    const fetchBudgets = async (year: number) => {
        try {
            const { data, error } = await supabase
                .from('purchase_budgets')
                .select('*')
                .eq('year', year);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                setBudgets(data);
                setIsDbPersistent(true);
            } else {
                const local = localStorage.getItem(`purchase_budgets_${year}`);
                if (local) {
                    setBudgets(JSON.parse(local));
                } else {
                    const initial = STANDARD_CATEGORIES.map(cat => ({
                        year,
                        category: cat,
                        january: 0, february: 0, march: 0, april: 0, may: 0, june: 0,
                        july: 0, august: 0, september: 0, october: 0, november: 0, december: 0
                    }));
                    if (year === 2026) {
                        const seed = [
                            { category: 'Hardware', january: 10000000, february: 15000000, march: 2000000, april: 1000000, may: 20000000, june: 0, july: 0, august: 0, september: 0, october: 0, november: 0, december: 0 },
                            { category: 'Accessories', january: 500000, february: 500000, march: 500000, april: 500000, may: 500000, june: 500000, july: 500000, august: 500000, september: 500000, october: 500000, november: 500000, december: 500000 },
                            { category: 'Cloud & Hosting', january: 4000000, february: 4000000, march: 4000000, april: 4000000, may: 4000000, june: 4000000, july: 4000000, august: 4000000, september: 4000000, october: 4000000, november: 4000000, december: 4000000 },
                            { category: 'Subscription', january: 3500000, february: 4000000, march: 1000000, april: 1000000, may: 1000000, june: 1000000, july: 1000000, august: 1000000, september: 1000000, october: 1000000, november: 1000000, december: 1000000 },
                            { category: 'Maintenance & Support', january: 2000000, february: 500000, march: 500000, april: 500000, may: 500000, june: 500000, july: 500000, august: 500000, september: 500000, october: 500000, november: 500000, december: 500000 },
                            { category: 'IT Services', january: 15000000, february: 1000000, march: 1000000, april: 1000000, may: 2000000, june: 1000000, july: 1000000, august: 1000000, september: 1000000, october: 1000000, november: 1000000, december: 1000000 }
                        ].map(s => ({ year, ...s }));
                        setBudgets(seed);
                    } else {
                        setBudgets(initial);
                    }
                }
                setIsDbPersistent(true);
            }
        } catch (err: any) {
            console.error('Fetch budget database error:', err);
            setIsDbPersistent(false);
            const local = localStorage.getItem(`purchase_budgets_${year}`);
            if (local) {
                setBudgets(JSON.parse(local));
            } else {
                const initial = STANDARD_CATEGORIES.map(cat => ({
                    year,
                    category: cat,
                    january: 0, february: 0, march: 0, april: 0, may: 0, june: 0,
                    july: 0, august: 0, september: 0, october: 0, november: 0, december: 0
                }));
                if (year === 2026) {
                    const seed = [
                        { category: 'Hardware', january: 10000000, february: 15000000, march: 2000000, april: 1000000, may: 20000000, june: 0, july: 0, august: 0, september: 0, october: 0, november: 0, december: 0 },
                        { category: 'Accessories', january: 500000, february: 500000, march: 500000, april: 500000, may: 500000, june: 500000, july: 500000, august: 500000, september: 500000, october: 500000, november: 500000, december: 500000 },
                        { category: 'Cloud & Hosting', january: 4000000, february: 4000000, march: 4000000, april: 4000000, may: 4000000, june: 4000000, july: 4000000, august: 4000000, september: 4000000, october: 4000000, november: 4000000, december: 4000000 },
                        { category: 'Subscription', january: 3500000, february: 4000000, march: 1000000, april: 1000000, may: 1000000, june: 1000000, july: 1000000, august: 1000000, september: 1000000, october: 1000000, november: 1000000, december: 1000000 },
                        { category: 'Maintenance & Support', january: 2000000, february: 500000, march: 500000, april: 500000, may: 500000, june: 500000, july: 500000, august: 500000, september: 500000, october: 500000, november: 500000, december: 500000 },
                        { category: 'IT Services', january: 15000000, february: 1000000, march: 1000000, april: 1000000, may: 2000000, june: 1000000, july: 1000000, august: 1000000, september: 1000000, october: 1000000, november: 1000000, december: 1000000 }
                    ].map(s => ({ year, ...s }));
                    setBudgets(seed);
                } else {
                    setBudgets(initial);
                }
            }
        }
    };

    const actualSpentMap = useMemo(() => {
        const map: Record<string, Record<number, number>> = {};
        records.forEach(r => {
            if (r.status !== 'Paid' || !r.purchaseDate) return;
            const dateObj = new Date(r.purchaseDate);
            if (isNaN(dateObj.getTime())) return;
            const y = dateObj.getFullYear();
            if (y !== budgetYear) return;
            const m = dateObj.getMonth(); // 0-11
            const cat = r.category || 'Uncategorized';
            if (!map[cat]) {
                map[cat] = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0 };
            }
            map[cat][m] = (map[cat][m] || 0) + (r.subtotal || 0);
        });
        return map;
    }, [records, budgetYear]);

    const allCategories = useMemo(() => {
        const cats = new Set(STANDARD_CATEGORIES);
        Object.keys(actualSpentMap).forEach(cat => cats.add(cat));
        return Array.from(cats);
    }, [actualSpentMap]);

    useEffect(() => {
        const initialEditMap: Record<string, Record<string, number>> = {};
        allCategories.forEach(cat => {
            const existing = budgets.find(b => b.category === cat);
            initialEditMap[cat] = {};
            MONTH_KEYS.forEach(m => {
                initialEditMap[cat][m] = existing ? (existing[m as keyof PurchaseBudget] as number || 0) : 0;
            });
        });
        setEditedBudgets(initialEditMap);
    }, [budgets, allCategories]);

    useEffect(() => {
        if (viewMode === 'budgeting') {
            fetchBudgets(budgetYear);
        }
    }, [viewMode, budgetYear]);

    const handleSaveBudget = async () => {
        setIsSavingBudget(true);
        try {
            const payloads = allCategories.map(cat => {
                const rowValues = editedBudgets[cat] || {};
                return {
                    year: budgetYear,
                    category: cat,
                    january: rowValues.january || 0,
                    february: rowValues.february || 0,
                    march: rowValues.march || 0,
                    april: rowValues.april || 0,
                    may: rowValues.may || 0,
                    june: rowValues.june || 0,
                    july: rowValues.july || 0,
                    august: rowValues.august || 0,
                    september: rowValues.september || 0,
                    october: rowValues.october || 0,
                    november: rowValues.november || 0,
                    december: rowValues.december || 0,
                    created_by: currentUser?.fullName || 'System'
                };
            });

            if (isDbPersistent) {
                const { error } = await supabase
                    .from('purchase_budgets')
                    .upsert(payloads, { onConflict: 'year,category' });
                
                if (error) throw error;
                showToast("Budget saved to database successfully!", "success");
            } else {
                localStorage.setItem(`purchase_budgets_${budgetYear}`, JSON.stringify(payloads));
                showToast("Budget saved to local storage fallback successfully!", "success");
            }
            
            await fetchBudgets(budgetYear);
        } catch (err: any) {
            console.error('Save budget error:', err);
            showToast("Failed to save budget: " + err.message, "error");
        } finally {
            setIsSavingBudget(false);
        }
    };

    const handleFormSubmit = async (formData: Partial<PurchaseRecord>) => {
        setIsActionLoading(true);
        try {
            const sanitizeSaveDate = (date: string | null | undefined) => {
                if (!date || date === '-' || date.toString().toLowerCase() === 'nan') return null;
                return date;
            };

            const payload = {
                transaction_id: formData.transactionId, description: formData.description,
                qty: formData.qty, price: formData.price, vat: formData.vat, delivery_fee: formData.deliveryFee,
                insurance: formData.insurance, app_fee: formData.appFee, other_cost: formData.otherCost,
                subtotal: formData.subtotal, total_va: formData.totalVa, project_name: formData.projectName,
                user_name: formData.user, department: formData.department, company: formData.company,
                status: formData.status,
                purchase_date: sanitizeSaveDate(formData.purchaseDate),
                payment_date: sanitizeSaveDate(formData.paymentDate),
                vendor: formData.vendor, platform: formData.platform,
                payment_method: formData.paymentMethod,
                category: formData.category,
                evidence_link: formData.evidenceLink,
                input_by: formData.inputBy || currentUser?.fullName || 'System',
                remarks: formData.remarks, docs: formData.docs,
                items: formData.items
            };

            if (editingRecord) {
                await supabase.from('purchase_records').update(payload).eq('id', editingRecord.id);
            } else {
                await supabase.from('purchase_records').insert([payload]);
            }
            setIsModalOpen(false);
            setEditingRecord(null);
            await fetchRecords();

            // Auto-export to Google Sheets (Fire and forget)
            const dateObj = payload.purchase_date ? new Date(payload.purchase_date) : new Date();
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            sendToGoogleSheet({
                ...payload,
                id: editingRecord ? editingRecord.id : 'NEW',
                monthName: months[dateObj.getMonth()],
                year: dateObj.getFullYear()
            });
            showToast(editingRecord ? 'Record updated successfully!' : 'New entry saved successfully!');

            // Log activity for Dashboard timeline
            await supabase.from('activity_logs').insert([{
                activity_name: editingRecord ? `Updated Purchase: ${formData.description}` : `New Purchase: ${formData.description}`,
                category: 'Procurement',
                requester: formData.user || 'System',
                department: formData.department || 'General',
                it_personnel: currentUser?.fullName || 'IT Dept',
                type: (formData.totalVa || 0) > 10000000 ? 'Critical' : 'Minor',
                status: 'Completed',
                remarks: `Purchase of ${formData.description} via ${formData.platform || 'Unknown'}. Total: ${formData.totalVa}`,
                created_at: new Date().toISOString()
            }]);
        } catch (err) {
            showToast('Failed to save record', 'error');
        } finally { setIsActionLoading(false); }
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch = (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.user || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' ? true : r.status === statusFilter;
            const matchesProject = projectFilter === 'All' ? true : r.projectName === projectFilter;
            const matchesCompany = companyFilter === 'All' ? true : r.company === companyFilter;
            const matchesCategory = categoryFilter === 'All' ? true : r.category === categoryFilter;

            let matchesDate = true;
            if (r.purchaseDate) {
                const d = new Date(r.purchaseDate);
                // Year Filter
                if (yearFilter !== 'All' && d.getFullYear().toString() !== yearFilter) matchesDate = false;

                // Quarter Filter
                if (quarterFilter !== 'All') {
                    const q = Math.floor((d.getMonth() + 3) / 3);
                    if (`Q${q}` !== quarterFilter) matchesDate = false;
                }

                // Month Filter
                if (monthFilter !== 'All') {
                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    if (months[d.getMonth()] !== monthFilter) matchesDate = false;
                }

                // Custom Range
                if (startDate && d < new Date(startDate)) matchesDate = false;
                if (endDate && d > new Date(endDate)) matchesDate = false;
            }

            return matchesSearch && matchesStatus && matchesProject && matchesCompany && matchesCategory && matchesDate;
        });
    }, [records, searchTerm, statusFilter, projectFilter, companyFilter, categoryFilter, yearFilter, quarterFilter, monthFilter, startDate, endDate]);

    const totals = useMemo(() => {
        const rowTotals: Record<string, { budget: number; actual: number; variance: number }> = {};
        const colTotals: Record<number, { budget: number; actual: number; variance: number }> = {};
        let grandBudget = 0;
        let grandActual = 0;

        for (let m = 0; m < 12; m++) {
            colTotals[m] = { budget: 0, actual: 0, variance: 0 };
        }

        allCategories.forEach(cat => {
            rowTotals[cat] = { budget: 0, actual: 0, variance: 0 };
            for (let m = 0; m < 12; m++) {
                const monthKey = MONTH_KEYS[m];
                const budgetVal = editedBudgets[cat]?.[monthKey] || 0;
                const actualVal = actualSpentMap[cat]?.[m] || 0;
                const varianceVal = budgetVal - actualVal;

                rowTotals[cat].budget += budgetVal;
                rowTotals[cat].actual += actualVal;
                rowTotals[cat].variance += varianceVal;

                colTotals[m].budget += budgetVal;
                colTotals[m].actual += actualVal;
                colTotals[m].variance += varianceVal;

                grandBudget += budgetVal;
                grandActual += actualVal;
            }
        });

        return { rowTotals, colTotals, grandBudget, grandActual, grandVariance: grandBudget - grandActual };
    }, [allCategories, editedBudgets, actualSpentMap]);

    const handleExportExcel = () => {
        if (filteredRecords.length === 0) return;

        const sortedForExcel = [...filteredRecords].sort((a, b) => {
            const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
            const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
            return dateA - dateB;
        });

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const dataToExport = sortedForExcel.map(r => {
            const dateObj = r.purchaseDate ? new Date(r.purchaseDate) : new Date();
            return {
                "Transaction ID": r.transactionId,
                "Description": r.description,
                "Date": r.purchaseDate || "-",
                "Vendor": r.vendor || "-",
                "Category": r.category || "-",
                "Company": r.company,
                "Department": r.department || "-",
                "User": r.user || "-",
                "Project": r.projectName || "-",
                "Status": r.status,
                "Payment Method": r.paymentMethod || "-",
                "Payment Date": r.paymentDate || "-",
                "Price": r.price,
                "Qty": r.qty,
                "Subtotal": r.subtotal,
                "VAT": r.vat,
                "Delivery": r.deliveryFee,
                "Insurance": r.insurance,
                "App Fee": r.appFee,
                "Other": r.otherCost,
                "Total VA": r.totalVa,
                "Platform": r.platform || "-",
                "Evidence": r.evidenceLink || "-",
                "Remarks": r.remarks || "",
                "Month": months[dateObj.getMonth()],
                "Year": dateObj.getFullYear()
            };
        });

        exportToExcel(dataToExport, `GESIT-PURCHASE-${new Date().toISOString().split('T')[0]}`);
    };

    const handleSyncAllToSheet = async () => {
        if (filteredRecords.length === 0) return;
        setIsSyncingAll(true);
        try {
            // Sort by date ASC for syncing so they append correctly at the end of the sheet
            const sortedForSync = [...filteredRecords].sort((a, b) => {
                const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
                const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
                return dateA - dateB;
            });

            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            for (const record of sortedForSync) {
                const dateObj = record.purchaseDate ? new Date(record.purchaseDate) : new Date();

                const payload = {
                    transaction_id: record.transactionId,
                    description: record.description,
                    qty: record.qty,
                    price: record.price,
                    vat: record.vat,
                    delivery_fee: record.deliveryFee,
                    insurance: record.insurance,
                    app_fee: record.appFee,
                    other_cost: record.otherCost,
                    subtotal: record.subtotal,
                    total_va: record.totalVa,
                    project_name: record.projectName,
                    user_name: record.user,
                    department: record.department,
                    company: record.company,
                    status: record.status,
                    purchase_date: record.purchaseDate,
                    payment_date: record.paymentDate,
                    vendor: record.vendor,
                    platform: record.platform,
                    payment_method: record.paymentMethod,
                    category: record.category,
                    evidence_link: record.evidenceLink,
                    input_by: record.inputBy,
                    remarks: record.remarks,
                    monthName: months[dateObj.getMonth()],
                    year: dateObj.getFullYear()
                };
                await sendToGoogleSheet(payload);
            }
            showToast(`Successfully synced ${filteredRecords.length} records to Google Sheets!`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Batch sync encountered an error.', 'error');
        } finally {
            setIsSyncingAll(false);
        }
    };

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, projectFilter, yearFilter, quarterFilter, monthFilter, startDate, endDate]);

    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRecords.slice(start, start + itemsPerPage);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

    const projects = useMemo(() => {
        const unique = Array.from(new Set(records.map(r => r.projectName).filter(Boolean)));
        return unique.sort();
    }, [records]);

    const availableYears = useMemo(() => {
        const distinctYears = Array.from(new Set(records.map(r => r.purchaseDate ? new Date(r.purchaseDate).getFullYear() : null).filter(Boolean)));
        return distinctYears.sort((a, b) => (b as number) - (a as number));
    }, [records]);

    const availableCompanies = useMemo(() => {
        const distinct = Array.from(new Set(records.map(r => r.company).filter(Boolean)));
        return distinct.sort();
    }, [records]);

    const availableCategories = useMemo(() => {
        const distinct = Array.from(new Set(records.map(r => r.category).filter(Boolean)));
        return distinct.sort();
    }, [records]);

    const financialHealth = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const thisMonthRecords = records.filter(r => {
            if (!r.purchaseDate) return false;
            const d = new Date(r.purchaseDate);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const lastMonthRecords = records.filter(r => {
            if (!r.purchaseDate) return false;
            const d = new Date(r.purchaseDate);
            // Handle January case for previous month
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });

        const thisMonthTotal = thisMonthRecords.reduce((sum, r) => sum + (r.subtotal || 0), 0);
        const lastMonthTotal = lastMonthRecords.reduce((sum, r) => sum + (r.subtotal || 0), 0);

        let outflowChange = 0;
        if (lastMonthTotal > 0) {
            outflowChange = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
        }

        const pendingCount = records.filter(r => r.status === 'Pending').length;

        // Largest Category
        const catTotals: Record<string, number> = {};
        let totalSpend = 0;
        records.forEach(r => {
            const cat = r.category || 'Uncategorized';
            catTotals[cat] = (catTotals[cat] || 0) + (r.subtotal || 0);
            totalSpend += (r.subtotal || 0);
        });

        const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        const largestName = sortedCats[0]?.[0] || 'N/A';
        const largestVal = sortedCats[0]?.[1] || 0;
        const largestPercentage = totalSpend > 0 ? Math.round((largestVal / totalSpend) * 100) : 0;

        // Risk Level Logic
        let risk: 'Low' | 'Medium' | 'High' = 'Low';
        if (pendingCount > 10) risk = 'High';
        else if (pendingCount > 5) risk = 'Medium';

        return {
            outflowChange,
            pendingCount,
            largestCategory: { name: largestName, percentage: largestPercentage },
            riskLevel: risk,
            totalDisbursed: records.filter(r => r.status === 'Paid').reduce((sum, r) => sum + (r.subtotal || 0), 0),
            liability: records.filter(r => r.status !== 'Paid').reduce((sum, r) => sum + (r.subtotal || 0), 0),
            fiscalVolume: records.reduce((sum, r) => sum + (r.subtotal || 0), 0)
        };
    }, [records]);

    const chartData = useMemo(() => {
        const grouped: Record<string, { name: string; total: number; sortKey: number }> = {};

        filteredRecords.forEach(r => {
            if (!r.purchaseDate) return;
            const d = new Date(r.purchaseDate);
            if (isNaN(d.getTime())) return;
            const y = d.getFullYear();
            const m = d.getMonth();
            const key = `${y}-${m}`;
            const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            if (!grouped[key]) {
                grouped[key] = {
                    name: label,
                    total: 0,
                    sortKey: y * 12 + m
                };
            }
            grouped[key].total += (r.subtotal || 0);
        });

        return Object.values(grouped)
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(item => ({ name: item.name, total: item.total }));
    }, [filteredRecords]);

    const deptData = useMemo(() => {
        const data: Record<string, number> = {};
        const totalFiltered = filteredRecords.reduce((sum, r) => sum + (r.subtotal || 0), 0);

        filteredRecords.forEach(r => {
            const dept = r.department || 'Unknown';
            data[dept] = (data[dept] || 0) + (r.subtotal || 0);
        });

        return Object.entries(data)
            .map(([name, total]) => ({
                name,
                total,
                percentage: totalFiltered > 0 ? Math.round((total / totalFiltered) * 100) : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [filteredRecords]);

    const categoryData = useMemo(() => {
        const data: Record<string, number> = {};
        const totalFiltered = filteredRecords.reduce((sum, r) => sum + (r.subtotal || 0), 0);

        filteredRecords.forEach(r => {
            const cat = r.category || 'Uncategorized';
            data[cat] = (data[cat] || 0) + (r.subtotal || 0);
        });
        return Object.entries(data)
            .map(([name, total]) => ({
                name,
                total,
                percentage: totalFiltered > 0 ? Math.round((total / totalFiltered) * 100) : 0
            }))
            .sort((a, b) => b.total - a.total);
    }, [filteredRecords]);

    const vendorData = useMemo(() => {
        const data: Record<string, { total: number; count: number }> = {};
        filteredRecords.forEach(r => {
            const v = r.vendor || 'Unknown';
            if (!data[v]) data[v] = { total: 0, count: 0 };
            data[v].total += (r.subtotal || 0);
            data[v].count += 1;
        });
        return Object.entries(data)
            .map(([name, val]) => ({ name, total: val.total, transactionCount: val.count }))
            .sort((a, b) => b.total - a.total);
    }, [filteredRecords]);


    const formatIDR = (num: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200 pb-10 pt-6">
            {/* Header & Financial Health */}
            <div className="space-y-8 mb-10">
                <PageHeader
                    title="Purchase Records"
                    description="Procurement & Financial Audit Registry"
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full lg:w-auto">
                        <FinancialHealthSummary
                            outflowChange={financialHealth.outflowChange}
                            pendingCount={financialHealth.pendingCount}
                            largestCategory={financialHealth.largestCategory}
                            riskLevel={financialHealth.riskLevel}
                        />
                    </div>
                </PageHeader>
            </div>

            {/* Main Tabs switcher (Ledger vs Budget Tracker) and Row Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-xs">
                <div className="flex items-center gap-3">
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full sm:w-auto">
                        <TabsList className="bg-muted p-1 rounded-xl border border-border/60 flex">
                            <TabsTrigger value="ledger" className="text-xs font-medium px-4 py-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                                <Briefcase size={14} className="mr-2 text-blue-600 dark:text-blue-400" /> LEDGER
                            </TabsTrigger>
                            <TabsTrigger value="budgeting" className="text-xs font-medium px-4 py-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                                <FileSpreadsheet size={14} className="mr-2 text-indigo-600 dark:text-indigo-400" /> BUDGET TRACKER
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {viewMode === 'ledger' && (
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportExcel} 
                            className="text-xs font-medium h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                        >
                            <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Export Excel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSyncAllToSheet}
                            disabled={isSyncingAll || filteredRecords.length === 0}
                            className="text-xs font-medium h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                        >
                            {isSyncingAll ? <RefreshCcw className="mr-1.5 h-4 w-4 animate-spin text-blue-500" /> : <RefreshCcw className="mr-1.5 h-4 w-4 text-blue-500" />}
                            Sync Sheets
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
                            className="text-xs font-medium h-9 px-4 rounded-xl transition-colors"
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Entri Baru
                        </Button>
                    </div>
                )}
            </div>

            {viewMode === 'ledger' ? (
                <>

            {/* Sleek Executive Filter Toolbar */}
            <div className="space-y-3">
                <Card className="rounded-2xl border border-border/60 bg-card overflow-visible">
                    <CardContent className="p-3 sm:p-3.5 space-y-3">
                        {/* Main Single-Line Filter Row */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                            {/* Left Controls: Period, Company, Search */}
                            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                                {/* Period Popover Trigger & Dropdown */}
                                <div className="relative shrink-0" ref={periodRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                                        className={cn(
                                            "h-9 px-3 rounded-xl text-sm font-medium flex items-center gap-2 border transition-colors cursor-pointer",
                                            isPeriodOpen || (quarterFilter !== 'All' || monthFilter !== 'All' || startDate || endDate)
                                                ? "bg-primary/10 border-primary/30 text-primary font-medium"
                                                : "bg-background border-border text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <Calendar size={13} className="text-primary shrink-0" />
                                        <span className="font-medium text-foreground">Period:</span>
                                        <span className="font-medium text-muted-foreground">{periodLabel}</span>
                                        {isPeriodOpen ? <ChevronUp size={13} className="text-muted-foreground shrink-0" /> : <ChevronDown size={13} className="text-muted-foreground shrink-0" />}
                                    </button>

                                    {/* Popover Menu matching screenshot */}
                                    {isPeriodOpen && (
                                        <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[380px] bg-card rounded-2xl border border-border shadow-xl p-4 sm:p-5 z-[200] space-y-4 animate-in fade-in zoom-in-95 duration-150">
                                            {/* FISCAL YEAR */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                                                    <span>Fiscal Year</span>
                                                    <span className="font-bold">Jan – Dec</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {availableYears.map(y => (
                                                            <button
                                                                key={y}
                                                                type="button"
                                                                onClick={() => setYearFilter(y.toString())}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                                                                    yearFilter === y.toString()
                                                                        ? "bg-primary text-primary-foreground"
                                                                        : "bg-muted text-foreground hover:bg-muted/80"
                                                                )}
                                                            >
                                                                FY {y}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setQuarterFilter('All');
                                                            setMonthFilter('All');
                                                            setStartDate('');
                                                            setEndDate('');
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                                                            quarterFilter === 'All' && monthFilter === 'All' && !startDate && !endDate
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                        )}
                                                    >
                                                        <Check size={13} className="stroke-[3]" /> Full Year
                                                    </button>
                                                </div>
                                            </div>

                                            {/* QUARTER */}
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-muted-foreground">
                                                    Quarter ({yearFilter !== 'All' ? `FY ${yearFilter}` : 'FY 2026'})
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[
                                                        { key: 'Q1', range: 'Jan – Mar' },
                                                        { key: 'Q2', range: 'Apr – Jun' },
                                                        { key: 'Q3', range: 'Jul – Sep' },
                                                        { key: 'Q4', range: 'Oct – Dec' },
                                                    ].map(q => {
                                                        const isSelected = quarterFilter === q.key;
                                                        return (
                                                            <button
                                                                key={q.key}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setQuarterFilter('All');
                                                                    } else {
                                                                        setQuarterFilter(q.key);
                                                                        setMonthFilter('All');
                                                                        setStartDate('');
                                                                        setEndDate('');
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "p-2 rounded-xl text-center flex flex-col items-center justify-center transition-colors border cursor-pointer",
                                                                    isSelected
                                                                        ? "border-primary bg-primary/10 text-primary font-medium"
                                                                        : "border-border bg-background text-foreground hover:bg-muted"
                                                                )}
                                                            >
                                                                <span className="text-xs font-semibold leading-tight">{q.key}</span>
                                                                <span className="text-xs text-muted-foreground leading-tight mt-0.5">{q.range}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* MONTH */}
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-muted-foreground">
                                                    Month ({yearFilter !== 'All' ? `FY ${yearFilter}` : 'FY 2026'})
                                                </div>
                                                <div className="grid grid-cols-6 gap-1.5">
                                                    {[
                                                        { short: 'Jan', full: 'January' },
                                                        { short: 'Feb', full: 'February' },
                                                        { short: 'Mar', full: 'March' },
                                                        { short: 'Apr', full: 'April' },
                                                        { short: 'May', full: 'May' },
                                                        { short: 'Jun', full: 'June' },
                                                        { short: 'Jul', full: 'July' },
                                                        { short: 'Aug', full: 'August' },
                                                        { short: 'Sep', full: 'September' },
                                                        { short: 'Oct', full: 'October' },
                                                        { short: 'Nov', full: 'November' },
                                                        { short: 'Dec', full: 'December' },
                                                    ].map(m => {
                                                        const isSelected = monthFilter === m.full;
                                                        return (
                                                            <button
                                                                key={m.short}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setMonthFilter('All');
                                                                    } else {
                                                                        setMonthFilter(m.full);
                                                                        setQuarterFilter('All');
                                                                        setStartDate('');
                                                                        setEndDate('');
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "h-8 rounded-xl text-xs font-medium transition-colors border cursor-pointer",
                                                                    isSelected
                                                                        ? "bg-primary text-primary-foreground border-primary"
                                                                        : "bg-muted border-border text-foreground hover:bg-muted/80"
                                                                )}
                                                            >
                                                                {m.short}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Custom Date Range Collapsible */}
                                            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCustomDateOpen(!isCustomDateOpen)}
                                                    className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={13} className="text-blue-500" />
                                                        <span>Custom Date Range</span>
                                                    </div>
                                                    {isCustomDateOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                </button>

                                                {isCustomDateOpen && (
                                                    <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                                                                <Input
                                                                    type="date"
                                                                    value={startDate}
                                                                    onChange={e => {
                                                                        setStartDate(e.target.value);
                                                                        setMonthFilter('All');
                                                                        setQuarterFilter('All');
                                                                    }}
className="h-8 text-xs font-medium bg-muted/40 border-border/60 rounded-xl"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                                                                <Input
                                                                    type="date"
                                                                    value={endDate}
                                                                    onChange={e => {
                                                                        setEndDate(e.target.value);
                                                                        setMonthFilter('All');
                                                                        setQuarterFilter('All');
                                                                    }}
                                                                    className="h-8 text-xs font-medium bg-muted/40 border-border/60 rounded-xl"
                                                                />
                                                            </div>
                                                        </div>
                                                        {(startDate || endDate) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                                                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                                                            >
                                                                Clear Custom Dates
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Company / Entity Selector */}
                                <div className="shrink-0 min-w-[150px]">
                                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                                        <SelectTrigger className="w-full h-9 rounded-xl text-xs font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                                <span className="font-bold text-slate-800 dark:text-zinc-100">Company:</span>
                                                <span className="font-semibold text-slate-700 dark:text-zinc-200 max-w-[120px] truncate">{companyFilter === 'All' ? 'All' : companyFilter}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 shadow-xl min-w-[200px] max-h-[300px]">
                                            <SelectItem value="All">All Companies</SelectItem>
                                            {availableCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Search Bar */}
                                <div className="relative flex-1 min-w-[220px]">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                                    <Input
                                        placeholder="Search descriptions, companies, projects..."
                                        className="pl-9 pr-8 h-9 bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200/90 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-blue-500/30"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center text-xs font-semibold"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right Controls: More Filters & Reset */}
                            <div className="flex items-center gap-2 shrink-0 justify-end">
                                <Button
                                    variant={showMoreFilters || activeMoreFiltersCount > 0 ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowMoreFilters(!showMoreFilters)}
                                    className={cn(
                                        "h-9 px-3.5 text-xs font-medium gap-2 rounded-xl transition-colors border",
                                        showMoreFilters || activeMoreFiltersCount > 0
                                            ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/15"
                                            : "bg-background border-border text-foreground hover:bg-muted"
                                    )}
                                >
                                    <SlidersHorizontal size={13} className={activeMoreFiltersCount > 0 ? "text-primary" : "text-muted-foreground"} />
                                    <span>More Filters</span>
                                    {activeMoreFiltersCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                                            {activeMoreFiltersCount}
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setYearFilter(new Date().getFullYear().toString());
                                        setQuarterFilter('All');
                                        setMonthFilter('All');
                                        setCompanyFilter('All');
                                        setCategoryFilter('All');
                                        setProjectFilter('All');
                                        setStatusFilter('All');
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className="h-9 px-3 text-xs font-semibold gap-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800"
                                >
                                    <RotateCcw size={13} />
                                    <span>Reset</span>
                                </Button>
                            </div>
                        </div>

                        {/* Expandable Subrow: More Filters */}
                        {showMoreFilters && (
                            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center gap-2.5 animate-in slide-in-from-top-2 duration-200">
                                {/* Status Filter */}
                                <div className="flex-1 min-w-[130px]">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className={cn(
                                            "w-full h-8.5 rounded-xl text-xs font-semibold",
                                            statusFilter !== 'All' ? "border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70" : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700"
                                        )}>
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className="text-slate-400 dark:text-zinc-500 font-normal">Status:</span>
                                                <span className="font-semibold">{statusFilter === 'All' ? 'All Status' : statusFilter}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 shadow-xl">
                                            <SelectItem value="All">All Status</SelectItem>
                                            <SelectItem value="Paid">Paid</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Month Filter */}
                                <div className="flex-1 min-w-[135px]">
                                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                                        <SelectTrigger className={cn(
                                            "w-full h-8.5 rounded-xl text-xs font-semibold",
                                            monthFilter !== 'All' ? "border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70" : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700"
                                        )}>
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Clock size={12} className="text-slate-400 dark:text-zinc-500" />
                                                <span className="text-slate-400 dark:text-zinc-500 font-normal">Month:</span>
                                                <span className="font-semibold">{monthFilter === 'All' ? 'All Months' : monthFilter}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 shadow-xl">
                                            <SelectItem value="All">All Months</SelectItem>
                                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Quarter Filter */}
                                <div className="flex-1 min-w-[130px]">
                                    <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                                        <SelectTrigger className={cn(
                                            "w-full h-8.5 rounded-xl text-xs font-semibold",
                                            quarterFilter !== 'All' ? "border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70" : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700"
                                        )}>
                                            <div className="flex items-center gap-1.5 truncate">
                                                <PieChart size={12} className="text-slate-400 dark:text-zinc-500" />
                                                <span className="text-slate-400 dark:text-zinc-500 font-normal">Quarter:</span>
                                                <span className="font-semibold">{quarterFilter === 'All' ? 'All Quarters' : quarterFilter}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 shadow-xl">
                                            <SelectItem value="All">All Quarters</SelectItem>
                                            <SelectItem value="Q1">Q1 (Jan - Mar)</SelectItem>
                                            <SelectItem value="Q2">Q2 (Apr - Jun)</SelectItem>
                                            <SelectItem value="Q3">Q3 (Jul - Sep)</SelectItem>
                                            <SelectItem value="Q4">Q4 (Oct - Dec)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Category Filter */}
                                <div className="flex-1 min-w-[140px]">
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className={cn(
                                            "w-full h-8.5 rounded-xl text-xs font-semibold",
                                            categoryFilter !== 'All' ? "border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70" : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700"
                                        )}>
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Tag size={12} className="text-slate-400 dark:text-zinc-500" />
                                                <span className="text-slate-400 dark:text-zinc-500 font-normal">Category:</span>
                                                <span className="font-semibold">{categoryFilter === 'All' ? 'All Categories' : categoryFilter}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 shadow-xl">
                                            <SelectItem value="All">All Categories</SelectItem>
                                            {availableCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Project Filter */}
                                {projects.length > 0 && (
                                    <div className="flex-1 min-w-[135px]">
                                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                                            <SelectTrigger className={cn(
                                                "w-full h-8.5 rounded-xl text-xs font-semibold",
                                                projectFilter !== 'All' ? "border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70" : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700"
                                            )}>
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <Briefcase size={12} className="text-slate-400 dark:text-zinc-500" />
                                                    <span className="text-slate-400 dark:text-zinc-500 font-normal">Project:</span>
                                                    <span className="font-semibold">{projectFilter === 'All' ? 'All Projects' : projectFilter}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 shadow-xl">
                                                <SelectItem value="All">All Projects</SelectItem>
                                                {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Date Range Button */}
                                <Button
                                    variant={showDatePicker ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className={cn(
                                        "h-8.5 px-3 text-xs font-semibold gap-1.5 rounded-xl border",
                                        (startDate || endDate) 
                                            ? "border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 font-bold" 
                                            : "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200"
                                    )}
                                >
                                    <Calendar size={12} className={(startDate || endDate) ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"} />
                                    <span>{startDate || endDate ? `${startDate} s/d ${endDate}` : 'Custom Dates'}</span>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showDatePicker && (
                <Card className="border border-primary/20 bg-primary/5 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                    <CardContent className="p-4 flex flex-wrap gap-5 items-end">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground">Rentang Tanggal Awal</label>
                            <Input
                                type="date"
                                className="w-[180px] h-9 bg-card font-medium border-border/60 rounded-xl"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground">Rentang Tanggal Akhir</label>
                            <Input
                                type="date"
                                className="w-[180px] h-9 bg-card font-medium border-border/60 rounded-xl"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs font-medium text-muted-foreground h-9 hover:bg-muted">
                            Reset Tanggal
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Stat Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <StatCard label="Disbursed Funds" value={formatIDR(financialHealth.totalDisbursed)} subValue="Verified & Settled" icon={CheckCircle2} color="emerald" />
                <StatCard
                    label="Liability Exposure"
                    value={formatIDR(financialHealth.liability)}
                    subValue={`${financialHealth.pendingCount} Pending Approval`}
                    icon={Clock}
                    color={financialHealth.riskLevel === 'High' ? 'rose' : financialHealth.riskLevel === 'Medium' ? 'amber' : 'blue'}
                />
                <StatCard
                    label="Budget Efficiency"
                    value={`${Math.min(100, Math.round((financialHealth.totalDisbursed / (financialHealth.totalDisbursed * 1.25 || 1)) * 100))}%`}
                    subValue="Utilization Rate"
                    icon={PieChart}
                    color="violet"
                />
                <StatCard label="Fiscal Volume" value={formatIDR(financialHealth.fiscalVolume)} subValue="Gross Transaction Value" icon={Wallet} color="indigo" />
            </div>

            {/* Optimized Layout: Fiscal Trend & Breakdown Grid */}
            <div className="grid grid-cols-1 gap-6">
                {/* Main Chart Card */}
<Card className="rounded-2xl border border-border/60 shadow-sm overflow-hidden bg-card">
                            <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-muted/60 text-foreground rounded-xl border border-border/60">
                                    <BarChart3 size={18} />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="font-semibold text-foreground text-sm">Fiscal Trend</h2>
                                    <p className="text-xs text-muted-foreground">Volume Transaksi Bulanan</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                                        </linearGradient>
                                        <linearGradient id="strokeTotal" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#3b82f6" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)} />
                                    <Tooltip
                                        isAnimationActive={false}
                                        cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        content={<CustomTooltip />}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="url(#strokeTotal)" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3.5} />
                                    <Bar dataKey="total" barSize={32} radius={[6, 6, 0, 0]} fill="url(#strokeTotal)" opacity={0.1} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Row 3.2: 3-Column Bento Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <TopVendorsWidget vendors={vendorData} />

                    {/* Department Allocation */}
                    <div className="bg-card rounded-2xl border border-border/80 p-5 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-muted/60 text-foreground rounded-xl border border-border/60">
                                <Briefcase size={16} />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="font-semibold text-foreground text-sm">Departmental</h2>
                                <p className="text-xs text-muted-foreground">Alokasi per Departemen</p>
                            </div>
                        </div>
                        <div className="space-y-2.5 flex-1">
                            {deptData.length === 0 ? (
                                <p className="text-center py-5 text-muted-foreground text-xs">Tidak ada data</p>
                            ) : deptData.slice(0, 5).map((dept, idx) => (
                                <div key={dept.name} className="space-y-1.5 p-2 -mx-2 rounded-xl transition-colors hover:bg-muted/50 group">
                                    <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", idx === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/40')}></div>
                                            <span className="text-foreground truncate max-w-[130px]">{dept.name}</span>
                                        </div>
                                        <div className="text-right flex items-center gap-1.5">
                                            <span className="text-foreground font-mono font-semibold">{formatIDR(dept.total)}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 text-xs w-6">{dept.percentage}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                            style={{ width: `${dept.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-card rounded-2xl border border-border/80 p-5 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-muted/60 text-foreground rounded-xl border border-border/60">
                                <Tag size={16} />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="font-semibold text-foreground text-sm">Classified</h2>
                                <p className="text-xs text-muted-foreground">Distribusi Kategori</p>
                            </div>
                        </div>
                        <div className="space-y-2.5 flex-1">
                            {categoryData.length === 0 ? (
                                <p className="text-center py-5 text-muted-foreground text-xs">Tidak ada data</p>
                            ) : categoryData.slice(0, 5).map((cat, idx) => (
                                <div key={cat.name} className="space-y-1.5 p-2 -mx-2 rounded-xl transition-colors hover:bg-muted/50 group">
                                    <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", idx === 0 ? 'bg-indigo-500' : 'bg-muted-foreground/40')}></div>
                                            <span className="text-foreground truncate max-w-[130px]">{cat.name}</span>
                                        </div>
                                        <div className="text-right flex items-center gap-1.5">
                                            <span className="text-foreground font-mono font-semibold">{formatIDR(cat.total)}</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 text-xs w-6">{cat.percentage}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                                            style={{ width: `${cat.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* General Transaction Ledger Container */}
            <Card className="shadow-sm rounded-2xl overflow-hidden border border-border/60 bg-card">
                <CardHeader className="px-5 sm:px-6 py-4 border-b border-border flex flex-row items-center justify-between bg-muted/20">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-semibold text-foreground">General Transaction Ledger</h2>
                            <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-full text-primary border-primary/20 bg-primary/10">
                                Audited
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-medium text-muted-foreground">{filteredRecords.length} Transaksi Ditemukan</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground hidden sm:inline-block">
                            Halaman {currentPage} dari {totalPages || 1}
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Desktop View Table */}
                    <div className="hidden lg:block w-full">
                        <Table className="w-full table-fixed">
                            <TableHeader>
                                <TableRow className="bg-muted/30 border-b border-border">
                                    <TableHead className="py-3 text-xs font-semibold text-foreground/80 px-4 w-[13%] whitespace-nowrap">Audit Identity</TableHead>
                                    <TableHead className="py-3 text-xs font-semibold text-foreground/80 px-4 w-[32%] whitespace-nowrap">Item & Procurement Details</TableHead>
                                    <TableHead className="text-right py-3 text-xs font-semibold text-foreground/80 px-4 w-[15%] whitespace-nowrap">Fiscal Value</TableHead>
                                    <TableHead className="py-3 text-xs font-semibold text-foreground/80 px-4 w-[17%] whitespace-nowrap">Corporate Entity</TableHead>
                                    <TableHead className="text-center py-3 text-xs font-semibold text-foreground/80 px-3 w-[9%] whitespace-nowrap">Ledger Status</TableHead>
                                    <TableHead className="text-center py-3 text-xs font-semibold text-foreground/80 px-2 w-[7%] whitespace-nowrap">Audit Docs</TableHead>
                                    <TableHead className="text-right py-3 px-2 pr-5 w-[7%] whitespace-nowrap text-xs font-semibold text-foreground/80">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border">
                                {isLoading ? (
                                    Array.from({ length: 8 }).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-4 px-4">
                                                <div className="flex flex-col gap-2">
                                                    <Skeleton className="h-5 w-24 rounded-md" />
                                                    <Skeleton className="h-3 w-16" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-4">
                                                <div className="flex flex-col gap-2 max-w-[280px]">
                                                    <Skeleton className="h-4 w-full" />
                                                    <div className="flex gap-2">
                                                        <Skeleton className="h-4 w-16 rounded-full" />
                                                        <Skeleton className="h-4 w-12 rounded-full" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-4 text-right flex flex-col items-end gap-2">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-3 w-16" />
                                            </TableCell>
                                            <TableCell className="py-4 px-4">
                                                <div className="flex flex-col gap-2">
                                                    <Skeleton className="h-3 w-20" />
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-3">
                                                <Skeleton className="h-6 w-16 rounded-full" />
                                            </TableCell>
                                            <TableCell className="py-4 px-2 flex justify-center">
                                                <Skeleton className="h-8 w-8 rounded-full" />
                                            </TableCell>
                                            <TableCell className="py-4 pr-5 px-2">
                                                <div className="flex justify-end gap-1.5">
                                                    <Skeleton className="h-7 w-7 rounded-lg" />
                                                    <Skeleton className="h-7 w-7 rounded-lg" />
                                                    <Skeleton className="h-7 w-7 rounded-lg" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-20 text-center">
                                            <div className="max-w-md mx-auto space-y-3">
                                                <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                                                    <Search size={22} />
                                                </div>
                                                <h3 className="font-semibold text-foreground text-sm">Tidak Ada Data Transaksi</h3>
                                                <p className="text-xs text-muted-foreground">Tidak ada catatan transaksi yang sesuai dengan filter atau kata kunci yang dipilih.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedRecords.map(record => {
                                    const isSettled = !!record.docs?.expenseApproval || (record.remarks && record.remarks.includes('Expense Approval Settled'));
                                    const itemCount = (record.items || []).length;

                                    return (
                                        <TableRow key={record.id} className="group transition-colors hover:bg-muted/50">
                                            {/* Column 1: Audit Identity */}
                                            <TableCell className="py-3.5 px-4 align-middle whitespace-normal">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(record.transactionId);
                                                                showToast(`ID ${record.transactionId} disalin!`, 'info');
                                                            }}
                                                            title="Klik untuk menyalin ID"
                                                            className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-lg w-fit tracking-tight cursor-pointer hover:bg-blue-500/15 transition-colors"
                                                        >
                                                            {record.transactionId}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                        <Calendar size={11} className="text-muted-foreground shrink-0" />
                                                        <span>{record.purchaseDate || '-'}</span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Column 2: Item & Procurement Details */}
                                            <TableCell className="py-3.5 px-4 align-middle whitespace-normal">
                                                <div className="flex flex-col gap-1">
                                                    <p 
                                                        onClick={() => { setSelectedDetail(record); setIsDetailOpen(true); }}
                                                        className="font-semibold text-foreground text-xs sm:text-[13px] tracking-tight leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                                                    >
                                                        {record.description}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                        {record.category && (
                                                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                                                {record.category}
                                                            </span>
                                                        )}
                                                        {record.vendor && (
                                                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border truncate max-w-[130px]">
                                                                {record.vendor}
                                                            </span>
                                                        )}
                                                        {record.paymentMethod && (
                                                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25">
                                                                {record.paymentMethod}
                                                            </span>
                                                        )}
                                                        {itemCount > 0 && (
                                                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/25">
                                                                {itemCount} item
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Column 3: Fiscal Value */}
                                            <TableCell className="py-3.5 px-4 text-right align-middle whitespace-normal">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <p className="font-mono font-semibold text-xs sm:text-[13px] text-foreground tracking-tight">
                                                        Rp {new Intl.NumberFormat('id-ID').format(record.subtotal)}
                                                    </p>
                                                    {isSettled ? (
                                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/25 flex items-center gap-1">
                                                            <CheckCircle2 size={9} className="stroke-[2.5]" />
                                                            Settled (Aktual)
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            Gross Total
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Column 4: Corporate Entity */}
                                            <TableCell className="py-3.5 px-4 align-middle whitespace-normal">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1">
                                                        {record.company}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                                        <Building2 size={10} className="text-primary shrink-0" />
                                                        <span className="truncate">{record.department}</span>
                                                        {record.user && (
                                                            <>
                                                                <span className="text-slate-300 dark:text-zinc-600">•</span>
                                                                <span className="truncate">{record.user}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Column 5: Ledger Status */}
                                            <TableCell className="py-3.5 px-3 align-middle text-center whitespace-normal">
                                                <span
                                                    className={cn(
                                                        "text-xs font-medium gap-1.5 px-2.5 py-0.5 rounded-full border inline-flex items-center justify-center",
                                                        record.status === 'Paid' 
                                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' 
                                                            : record.status === 'Rejected'
                                                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                                                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        record.status === 'Paid' ? "bg-emerald-500" : record.status === 'Rejected' ? "bg-rose-500" : "bg-amber-500"
                                                    )}></span>
                                                    {record.status || 'Pending'}
                                                </span>
                                            </TableCell>

                                            {/* Column 6: Audit Docs */}
                                            <TableCell className="py-3.5 px-2 align-middle text-center whitespace-normal">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-0.5 justify-center">
                                                        {DOC_KEYS.map((doc) => {
                                                            const isPresent = !!(record.docs && record.docs[doc.key as keyof typeof record.docs]);
                                                            return (
                                                                <div
                                                                    key={doc.key}
                                                                    title={`${doc.label}: ${isPresent ? 'Lengkap (Ada)' : 'Belum Ada'}`}
                                                                    className={cn(
                                                                        "w-1.5 h-3.5 rounded-[1.5px] transition-all cursor-help",
                                                                        isPresent 
                                                                            ? "bg-emerald-500 dark:bg-emerald-400" 
                                                                            : "bg-slate-200 dark:bg-zinc-800 border border-slate-300/80 dark:border-zinc-700"
                                                                    )}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <span className="text-xs font-mono text-muted-foreground leading-none">
                                                        {Object.values(record.docs || {}).filter(Boolean).length}/7 docs
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Column 7: Aksi */}
                                            <TableCell className="py-3.5 text-right pr-4 px-2 align-middle whitespace-normal">
                                                <div className="inline-flex items-center gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => { setSelectedDetail(record); setIsDetailOpen(true); }} 
                                                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-primary" 
                                                        title="Lihat Detail Transaksi"
                                                    >
                                                        <Eye size={14} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => { setEditingRecord(record); setIsModalOpen(true); }} 
                                                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground" 
                                                        title="Edit Data"
                                                    >
                                                        <Pencil size={13} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => setDeleteRecord(record)} 
                                                        className="w-7 h-7 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60" 
                                                        title="Hapus Transaksi"
                                                    >
                                                        <Trash2 size={13} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View Card List */}
                    <div className="block lg:hidden divide-y divide-slate-100 dark:divide-zinc-800/60">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-24 rounded-md" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                    <div className="flex justify-between items-center pt-2">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-8 w-24 rounded-lg" />
                                    </div>
                                </div>
                            ))
                        ) : filteredRecords.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground text-xs">
                                Tidak Ada Data Transaksi
                            </div>
                        ) : (
                            paginatedRecords.map(record => {
                                const isSettled = !!record.docs?.expenseApproval || (record.remarks && record.remarks.includes('Expense Approval Settled'));

                                return (
                                    <div key={record.id} className="p-5 space-y-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-lg w-fit">
                                                    {record.transactionId}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                    <Calendar size={11} className="opacity-80" />
                                                    {record.purchaseDate || '-'}
                                                </div>
                                            </div>
                                            <span
                                                className={cn(
                                                    "text-xs font-medium gap-1.5 px-2.5 py-0.5 rounded-full border w-fit flex items-center shrink-0",
                                                    record.status === 'Paid' 
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' 
                                                        : record.status === 'Rejected'
                                                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
                                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                                                )}
                                            >
                                                <span className={cn("w-1.5 h-1.5 rounded-full", record.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500')}></span>
                                                {record.status || 'Pending'}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <p 
                                                onClick={() => { setSelectedDetail(record); setIsDetailOpen(true); }}
                                                className="font-semibold text-foreground text-xs leading-snug cursor-pointer"
                                            >
                                                {record.description}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {record.category && (
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                                                        {record.category}
                                                    </span>
                                                )}
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                                                    {record.vendor}
                                                </span>
                                                {record.paymentMethod && (
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                                                        {record.paymentMethod}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                <Building2 size={11} className="text-primary" />
                                                <span>{record.company}</span>
                                                <span className="text-slate-300 dark:text-zinc-700/60">•</span>
                                                <span>{record.department}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t border-border">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {isSettled ? 'Nilai Aktual (Settled)' : 'Fiscal Value (Gross)'}
                                                </span>
                                                <span className="font-mono font-semibold text-sm text-foreground">
                                                    Rp {new Intl.NumberFormat('id-ID').format(record.subtotal)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedDetail(record); setIsDetailOpen(true); }} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary">
                                                    <Eye size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingRecord(record); setIsModalOpen(true); }} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground">
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteRecord(record)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive">
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>

                {/* Pagination Controls */}
                {filteredRecords.length > 0 && (
                    <div className="px-6 sm:px-8 py-4 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10">
                        <div className="text-xs font-medium text-muted-foreground">
                            Menampilkan <span className="text-foreground font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>-
                            <span className="text-foreground font-semibold">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span>
                            <span className="mx-1">dari total</span>
                            <span className="text-primary font-semibold">{filteredRecords.length}</span> transaksi
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="rounded-xl h-8"
                            >
                                <ChevronLeft size={14} className="mr-1" /> Prev
                            </Button>

                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className={cn("w-8 h-8 p-0 text-xs font-medium rounded-xl transition-colors", currentPage === page ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                                            >
                                                {page}
                                            </Button>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="text-muted-foreground">..</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded-xl h-8"
                            >
                                Next <ChevronRight size={14} className="ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {!isDbPersistent && (
                        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl mb-6">
                            <AlertTriangle size={18} className="shrink-0 animate-pulse" />
                            <div className="text-xs font-bold leading-normal">
                                <span className="font-semibold block mb-0.5">Local Fallback Active</span>
                                Database migration not yet applied. Budget data is currently saved to browser local storage.
                                To enable database synchronization, please run <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono">migration_purchase_budgets.sql</code> in your Supabase SQL Editor.
                            </div>
                        </div>
                    )}

                    {/* Budget Controls Bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-card border border-border/60 rounded-xl">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-wrap">
                            <Select value={budgetYear.toString()} onValueChange={(val) => setBudgetYear(parseInt(val, 10))}>
                                <SelectTrigger className="w-full sm:w-[120px] h-9">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2025, 2026, 2027, 2028].map(y => (
                                        <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <Tabs value={budgetViewLayout} onValueChange={(v) => setBudgetViewLayout(v as any)} className="w-full sm:w-auto">
                                <TabsList className="bg-muted border-none w-full sm:w-auto flex">
                                    <TabsTrigger value="visual" className="text-xs font-medium px-3 py-1 h-7 flex-1 sm:flex-none justify-center gap-1">
                                        <LayoutGrid size={11} /> VISUAL
                                    </TabsTrigger>
                                    <TabsTrigger value="spreadsheet" className="text-xs font-medium px-3 py-1 h-7 flex-1 sm:flex-none justify-center gap-1">
                                        <TableProperties size={11} /> SPREADSHEET
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <Tabs value={budgetSheetMode} onValueChange={(v) => setBudgetSheetMode(v as any)} className="w-full sm:w-auto">
                                <TabsList className="bg-muted border-none w-full sm:w-auto flex">
                                    <TabsTrigger value="variance" className="text-xs font-medium px-3 py-1 h-7 flex-1 sm:flex-none justify-center">
                                        PERFORMANCE
                                    </TabsTrigger>
                                    <TabsTrigger value="budget" className="text-xs font-medium px-3 py-1 h-7 flex-1 sm:flex-none justify-center">
                                        TARGETS (EDIT)
                                    </TabsTrigger>
                                    <TabsTrigger value="actual" className="text-xs font-medium px-3 py-1 h-7 flex-1 sm:flex-none justify-center">
                                        ACTUAL SPEND
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {isDbPersistent ? (
                                <Badge variant="outline" className="text-xs font-medium py-1 px-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5">
                                    <Database size={11} /> SUPABASE
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs font-medium py-1 px-3 bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5 animate-pulse">
                                    <AlertTriangle size={11} /> LOCAL STORAGE
                                </Badge>
                            )}

                            {budgetSheetMode === 'budget' && (
                                <Button
                                    size="sm"
                                    onClick={handleSaveBudget}
                                    disabled={isSavingBudget}
                                    className="text-xs font-medium transition-colors bg-primary gap-1.5"
                                >
                                    {isSavingBudget ? <RefreshCcw size={13} className="animate-spin" /> : <Save size={13} />}
                                    Save targets
                                </Button>
                            )}
                        </div>
                    </div>

                    {budgetViewLayout === 'visual' ? (
                        /* Visual Card View Dashboard */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {allCategories.map(cat => {
                                const rowTotal = totals.rowTotals[cat] || { budget: 0, actual: 0, variance: 0 };
                                const isExpanded = expandedBreakdown[cat] || false;
                                const utilizationRate = rowTotal.budget > 0 
                                    ? Math.round((rowTotal.actual / rowTotal.budget) * 100)
                                    : 0;
                                
                                return (
                                    <Card key={cat} className="rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col justify-between">
                                        <CardContent className="p-5 flex flex-col gap-4">
                                            {/* Header */}
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <h3 className="font-semibold text-sm text-foreground">{cat}</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Annual Budget Performance</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge className={cn(
                                                        "text-xs font-medium py-0.5 px-2",
                                                        utilizationRate > 100 
                                                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                            : utilizationRate >= 80
                                                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                    )} variant="outline">
                                                        {utilizationRate > 100 ? 'OVER BUDGET' : `${utilizationRate}% USED`}
                                                    </Badge>
                                                    {budgetSheetMode === 'budget' && (
                                                        <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                                                            EDITING TARGETS
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                                    <span>Utilization Rate</span>
                                                    <span>{utilizationRate}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-500",
                                                            utilizationRate > 100 
                                                                ? "bg-rose-500" 
                                                                : utilizationRate >= 80
                                                                    ? "bg-amber-500" 
                                                                    : "bg-emerald-500"
                                                        )}
                                                        style={{ width: `${Math.min(100, utilizationRate)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Annual Totals Grid */}
                                            <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground font-medium">Budget</span>
                                                    <span className="text-xs font-semibold text-foreground mt-0.5 font-mono">{formatIDR(rowTotal.budget)}</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border pl-3">
                                                    <span className="text-xs text-muted-foreground font-medium">Actual</span>
                                                    <span className="text-xs font-semibold text-foreground mt-0.5 font-mono">{formatIDR(rowTotal.actual)}</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border pl-3">
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        {rowTotal.variance >= 0 ? 'Remaining' : 'Deficit'}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs font-semibold mt-0.5 font-mono",
                                                        rowTotal.variance >= 0 ? "text-emerald-500" : "text-rose-500"
                                                    )}>
                                                        {formatIDR(Math.abs(rowTotal.variance))}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expandable Monthly Breakdown */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 flex flex-col gap-2 mt-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                                                    <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground pb-1 border-b border-border">
                                                        <span>Month</span>
                                                        <span className="text-right">Budget</span>
                                                        <span className="text-right">Actual</span>
                                                        <span className="text-right">Var</span>
                                                    </div>
                                                    {Array.from({ length: 12 }).map((_, mIdx) => {
                                                        const monthKey = MONTH_KEYS[mIdx];
                                                        const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mIdx];
                                                        
                                                        const budgetVal = editedBudgets[cat]?.[monthKey] || 0;
                                                        const actualVal = actualSpentMap[cat]?.[mIdx] || 0;
                                                        const varianceVal = budgetVal - actualVal;

                                                        if (budgetVal === 0 && actualVal === 0 && budgetSheetMode !== 'budget') return null;

                                                        return (
                                                            <div key={monthKey} className="grid grid-cols-4 items-center text-xs py-1 border-b border-border/40">
                                                                <span className="font-semibold text-foreground">{monthName}</span>
                                                                <span className="text-right font-mono">
                                                                    {budgetSheetMode === 'budget' ? (
                                                                        <Input
                                                                            type="text"
                                                                            value={editedBudgets[cat]?.[monthKey] ? new Intl.NumberFormat('id-ID').format(editedBudgets[cat][monthKey]) : ''}
                                                                            onChange={(e) => handleCellChange(cat, monthKey, e.target.value)}
                                                                            className="h-6 w-full text-right font-mono text-xs bg-muted/40 border border-border/40 px-1 rounded"
                                                                            placeholder="0"
                                                                        />
                                                                    ) : (
                                                                        formatIDR(budgetVal)
                                                                    )}
                                                                </span>
                                                                <span className="text-right font-mono text-muted-foreground">{formatIDR(actualVal)}</span>
                                                                <span className={cn(
                                                                    "text-right font-bold font-mono",
                                                                    varianceVal >= 0 ? "text-emerald-500" : "text-rose-500"
                                                                )}>
                                                                    {varianceVal >= 0 ? '+' : '-'}{formatIDR(Math.abs(varianceVal))}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </CardContent>

                                        {/* Toggle Footer */}
                                        <div className="px-5 py-3 bg-slate-50/50 dark:bg-zinc-800/20 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setExpandedBreakdown(prev => ({ ...prev, [cat]: !isExpanded }))}
                                                className="h-7 text-primary hover:text-primary/80"
                                            >
                                                {isExpanded ? 'Hide Monthly Detail' : 'Show Monthly Detail'}
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        /* Grid Card */
                        <Card className="shadow-sm rounded-xl overflow-hidden border-none bg-background/50 backdrop-blur-sm">
                            <CardContent className="p-0 overflow-x-auto relative">
                                <Table className="min-w-[1500px]">
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 border-b">
                                            <TableHead className="font-bold py-4 px-4 w-[180px] text-xs uppercase tracking-wider sticky left-0 bg-muted/95 dark:bg-zinc-950/95 border-r border-slate-200 dark:border-zinc-850 shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-20">Category</TableHead>
                                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
                                                <TableHead key={m} className="text-right font-bold py-4 px-3 text-xs uppercase tracking-wider w-[100px]">{m}</TableHead>
                                            ))}
                                            <TableHead className="text-right font-bold py-4 px-4 text-xs uppercase tracking-wider w-[140px]">Annual Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allCategories.map(cat => {
                                            const rowTotal = totals.rowTotals[cat] || { budget: 0, actual: 0, variance: 0 };
                                            return (
                                                <TableRow key={cat} className="group transition-colors hover:bg-muted/30">
                                                    {/* Category Name - Sticky Column */}
                                                    <TableCell className="py-4 px-4 font-bold text-foreground text-[11px] uppercase tracking-wider sticky left-0 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-10 group-hover:bg-slate-50 dark:group-hover:bg-zinc-800/80 transition-colors">
                                                        {cat}
                                                    </TableCell>
                                                    
                                                    {/* Monthly Cells */}
                                                    {Array.from({ length: 12 }).map((_, mIdx) => {
                                                        const monthKey = MONTH_KEYS[mIdx];
                                                        const budgetVal = editedBudgets[cat]?.[monthKey] || 0;
                                                        const actualVal = actualSpentMap[cat]?.[mIdx] || 0;
                                                        const varianceVal = budgetVal - actualVal;
                                                        
                                                        

                                                        return (
                                                            <TableCell key={mIdx} className="py-4 px-3 text-right">
                                                                {budgetSheetMode === 'budget' ? (
                                                                    <div className="flex justify-end">
                                                                        <Input
                                                                            type="text"
                                                                            value={editedBudgets[cat]?.[monthKey] ? new Intl.NumberFormat('id-ID').format(editedBudgets[cat][monthKey]) : ''}
                                                                            onChange={(e) => handleCellChange(cat, monthKey, e.target.value)}
                                                                            placeholder="0"
                                                                            className="h-8 w-24 text-right text-xs font-mono font-bold bg-background border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary hover:border-muted-foreground/40 shadow-inner transition-all duration-150"
                                                                        />
                                                                    </div>
                                                                ) : budgetSheetMode === 'actual' ? (
                                                                    <span className="font-mono font-bold text-xs text-foreground">
                                                                        {actualVal > 0 ? formatIDR(actualVal) : '-'}
                                                                    </span>
                                                                ) : (
                                                                    /* Performance comparison view */
                                                                    <div className="flex flex-col gap-1 text-[10px] font-mono leading-none">
                                                                        <div className="flex justify-between gap-1.5 text-muted-foreground/60 text-[9px]">
                                                                            <span>B:</span>
                                                                            <span>{budgetVal > 0 ? formatIDR(budgetVal) : '0'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between gap-1.5 font-bold text-foreground">
                                                                            <span>A:</span>
                                                                            <span>{actualVal > 0 ? formatIDR(actualVal) : '0'}</span>
                                                                        </div>
                                                                        <div className={cn(
                                                                            "flex justify-between gap-1.5 font-black border-t border-muted-foreground/10 pt-0.5 mt-0.5",
                                                                            varianceVal > 0 ? "text-emerald-500" : varianceVal < 0 ? "text-rose-500" : "text-muted-foreground/40"
                                                                        )}>
                                                                            <span>{varianceVal > 0 ? 'Rem:' : varianceVal < 0 ? 'Over:' : 'Bal:'}</span>
                                                                            <span>{varianceVal !== 0 ? formatIDR(Math.abs(varianceVal)) : '0'}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    
                                                    {/* Row Total */}
                                                    <TableCell className="py-4 px-4 text-right bg-muted/10 font-bold">
                                                        {budgetSheetMode === 'budget' ? (
                                                            <span className="font-mono text-xs text-foreground font-black">
                                                                {formatIDR(rowTotal.budget)}
                                                            </span>
                                                        ) : budgetSheetMode === 'actual' ? (
                                                            <span className="font-mono text-xs text-foreground font-black">
                                                                {formatIDR(rowTotal.actual)}
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1 text-[10px] font-mono leading-none text-right">
                                                                <div className="flex justify-between gap-1.5 text-muted-foreground/60 text-[9px]">
                                                                    <span>B:</span>
                                                                    <span>{formatIDR(rowTotal.budget)}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-1.5 font-bold text-foreground">
                                                                    <span>A:</span>
                                                                    <span>{formatIDR(rowTotal.actual)}</span>
                                                                </div>
                                                                <div className={cn(
                                                                    "flex justify-between gap-1.5 font-black border-t border-muted-foreground/10 pt-0.5 mt-0.5",
                                                                    rowTotal.variance > 0 ? "text-emerald-500" : rowTotal.variance < 0 ? "text-rose-500" : "text-muted-foreground/40"
                                                                )}>
                                                                    <span>{rowTotal.variance > 0 ? 'Rem:' : rowTotal.variance < 0 ? 'Over:' : 'Bal:'}</span>
                                                                    <span>{formatIDR(Math.abs(rowTotal.variance))}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        
                                        {/* Bottom Total Row */}
                                        <TableRow className="bg-muted/30 border-t border-b font-black">
                                            <TableCell className="py-4 px-4 font-black text-foreground text-xs uppercase tracking-wider sticky left-0 bg-muted/95 dark:bg-zinc-950/95 border-r border-slate-200 dark:border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-10">
                                                Total
                                            </TableCell>
                                            
                                            {Array.from({ length: 12 }).map((_, mIdx) => {
                                                const colTotal = totals.colTotals[mIdx] || { budget: 0, actual: 0, variance: 0 };
                                                return (
                                                    <TableCell key={mIdx} className="py-4 px-3 text-right">
                                                        {budgetSheetMode === 'budget' ? (
                                                            <span className="font-mono text-xs text-foreground">
                                                                {formatIDR(colTotal.budget)}
                                                            </span>
                                                        ) : budgetSheetMode === 'actual' ? (
                                                            <span className="font-mono text-xs text-foreground">
                                                                {formatIDR(colTotal.actual)}
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1 text-[10px] font-mono leading-none text-right">
                                                                <div className="flex justify-between gap-1.5 text-muted-foreground/60 text-[9px]">
                                                                    <span>B:</span>
                                                                    <span>{formatIDR(colTotal.budget)}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-1.5 text-foreground">
                                                                    <span>A:</span>
                                                                    <span>{formatIDR(colTotal.actual)}</span>
                                                                </div>
                                                                <div className={cn(
                                                                    "flex justify-between gap-1.5 border-t border-muted-foreground/10 pt-0.5 mt-0.5",
                                                                    colTotal.variance > 0 ? "text-emerald-500" : colTotal.variance < 0 ? "text-rose-500" : "text-muted-foreground/40"
                                                                )}>
                                                                    <span>{colTotal.variance > 0 ? 'Rem:' : colTotal.variance < 0 ? 'Over:' : 'Bal:'}</span>
                                                                    <span>{formatIDR(Math.abs(colTotal.variance))}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                            
                                            {/* Grand Total */}
                                            <TableCell className="py-4 px-4 text-right bg-muted/20 font-black">
                                                {budgetSheetMode === 'budget' ? (
                                                    <span className="font-mono text-xs text-primary font-black">
                                                        {formatIDR(totals.grandBudget)}
                                                    </span>
                                                ) : budgetSheetMode === 'actual' ? (
                                                    <span className="font-mono text-xs text-primary font-black">
                                                        {formatIDR(totals.grandActual)}
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col gap-1 text-[10px] font-mono leading-none text-right text-primary font-black">
                                                        <div className="flex justify-between gap-1.5 text-primary/60 text-[9px]">
                                                            <span>B:</span>
                                                            <span>{formatIDR(totals.grandBudget)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-1.5 text-primary font-bold">
                                                            <span>A:</span>
                                                            <span>{formatIDR(totals.grandActual)}</span>
                                                        </div>
                                                        <div className={cn(
                                                            "flex justify-between gap-1.5 border-t border-primary/20 pt-0.5 mt-0.5 font-black",
                                                            totals.grandVariance > 0 ? "text-emerald-500" : totals.grandVariance < 0 ? "text-rose-500" : "text-primary/80"
                                                        )}>
                                                            <span>{totals.grandVariance > 0 ? 'Rem:' : totals.grandVariance < 0 ? 'Over:' : 'Bal:'}</span>
                                                            <span>{formatIDR(Math.abs(totals.grandVariance))}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <PurchaseRecordFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleFormSubmit} initialData={editingRecord} />
            <PurchaseRecordDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} record={selectedDetail} />
            <DangerConfirmModal
                isOpen={!!deleteRecord} onClose={() => setDeleteRecord(null)}
                onConfirm={async () => {
                    await supabase.from('purchase_records').delete().eq('id', deleteRecord!.id);
                    setDeleteRecord(null);
                    fetchRecords();
                }}
                title="Delete Record" message={`Purge transaction record "${deleteRecord?.transactionId}"?`}
                isLoading={isActionLoading}
            />
        </div>
    );
};

