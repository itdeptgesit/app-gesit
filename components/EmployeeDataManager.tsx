'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, FileText, CreditCard, RefreshCcw, Search, Plus,
  FileSpreadsheet, Eye, Pencil, Trash2, KeyRound, AlertTriangle,
  Building2, Briefcase, Calendar, ShieldCheck, Mail, Phone, MapPin,
  Clock, ArrowUpRight, CheckCircle2, XCircle, ArrowRightLeft,
  ChevronLeft, ChevronRight, Filter, ShieldAlert, Award
} from 'lucide-react';
import { supabase, supabaseAdmin, ensureAuthUserWithPassword } from '../lib/supabaseClient';
import { UserAccount, UserGroup } from '../types';
import { useToast } from './ToastProvider';
import { exportToExcel } from '../lib/excelExport';
import { trackActivity } from '../lib/auditLogger';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UserAvatar } from './UserAvatar';
import { UserFormModal } from './UserFormModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { AccessDenied } from './AccessDenied';

interface EmployeeDataManagerProps {
  currentUser: UserAccount | null;
  onUpdateSuccess?: () => void;
}

export const EmployeeDataManager: React.FC<EmployeeDataManagerProps> = ({
  currentUser,
  onUpdateSuccess
}) => {
  const { showToast } = useToast();

  // State
  const [employees, setEmployees] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'contracts' | 'payroll' | 'transfers'>('directory');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Resigned'>('all');
  const [contractAlertFilter, setContractAlertFilter] = useState<'all' | 'expiring' | 'expired'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserAccount | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<UserAccount | null>(null);
  const [transferEmployee, setTransferEmployee] = useState<UserAccount | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<UserAccount | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<UserAccount | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Transfer Form state
  const [transferForm, setTransferForm] = useState({
    effectiveDate: new Date().toISOString().slice(0, 10),
    company: '',
    branch: '',
    department: '',
    jobTitle: '',
    jobLevel: '',
    reason: ''
  });

  // Transfer history state
  const [transferLogs, setTransferLogs] = useState<any[]>([]);

  // Permissions
  const roleLower = (currentUser?.role || '').toLowerCase();
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
  const isAdminOrSuperAdmin = isSuperAdmin || roleLower === 'admin';
  const isHR = (currentUser?.groups || []).some(g =>
    ['hr', 'hrd', 'employee-data'].includes(String(g).toLowerCase().trim())
  );
  const canView = isAdminOrSuperAdmin || isHR;
  const canManage = isAdminOrSuperAdmin || isHR;

  // Filter out system technical accounts
  const isTechnicalAccount = (u: any) => {
    const email = (u.email || '').toLowerCase();
    const uname = (u.username || '').toLowerCase();
    return /(admin@gesit|testing|test|developer|dev|demo|staging|sandbox)/i.test(email) ||
      /(developer|dev|demo|staging|sandbox)/i.test(uname);
  };

  // Fetch employees
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: UserAccount[] = data.map((u: any) => ({
          id: u.id,
          authId: u.auth_id,
          username: u.username,
          fullName: u.full_name,
          nickname: u.nickname || '',
          email: u.email,
          role: u.role,
          groups: u.groups || [],
          status: u.status || 'Active',
          employmentStatus: u.employment_status || u.status || 'Active',
          statusEffectiveDate: u.status_effective_date,
          separationDate: u.separation_date,
          separationReason: u.separation_reason,
          company: u.company || '',
          branch: u.branch || '',
          department: u.department || '',
          phone: u.phone,
          address: u.address,
          jobTitle: u.job_title,
          jobLevel: u.job_level,
          gradeClass: u.grade_class,
          employeeCode: u.employee_code,
          joinDate: u.join_date,
          employmentType: u.employment_type || '',
          contractType: u.contract_type || '',
          contractStartDate: u.contract_start_date,
          contractEndDate: u.contract_end_date,
          pkwtNumber: u.pkwt_number,
          payrollStatus: u.payroll_status,
          bankName: u.bank_name,
          bankAccountName: u.bank_account_name,
          bankAccountNumber: u.bank_account_number,
          taxStatus: u.tax_status,
          dateOfBirth: u.date_of_birth,
          birthPlace: u.birth_place,
          gender: u.gender,
          maritalStatus: u.marital_status,
          religion: u.religion,
          bloodType: u.blood_type,
          nik: u.nik,
          npwp: u.npwp,
          residentialAddress: u.residential_address,
          bpjsTkNumber: u.bpjs_tk_number,
          bpjsHealthNumber: u.bpjs_health_number,
          avatarUrl: u.avatar_url,
          lastLogin: u.last_login || 'Never'
        }));
        setEmployees(mapped);
      }

      // Try fetching transfer history if available
      try {
        const { data: histData } = await supabase
          .from('employee_transfer_history')
          .select('*')
          .order('effective_date', { ascending: false })
          .limit(50);
        if (histData) setTransferLogs(histData);
      } catch {
        // Table may not exist yet, safely fallback
      }
    } catch (err: any) {
      console.error('Fetch employees error:', err);
      showToast('Gagal memuat data employee: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Compute contract status / days remaining
  const getContractMeta = (emp: UserAccount) => {
    const isPKWT = `${emp.employmentType || ''} ${emp.contractType || ''}`.toLowerCase().includes('pkwt') ||
      (emp.employmentType || '').toLowerCase() === 'contract';

    if (!isPKWT && (emp.employmentType || '').toLowerCase() === 'permanent') {
      return { status: 'permanent', label: 'Tetap (PKWTT)', daysLeft: null, isExpiring: false, isExpired: false };
    }

    if (!emp.contractEndDate) {
      return { status: 'nodate', label: 'Tanpa Tanggal Akhir', daysLeft: null, isExpiring: false, isExpired: false };
    }

    const end = new Date(`${emp.contractEndDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: `Expired (${Math.abs(diffDays)} hari lalu)`, daysLeft: diffDays, isExpiring: false, isExpired: true };
    } else if (diffDays <= 60) {
      return { status: 'expiring', label: `Sisa ${diffDays} hari`, daysLeft: diffDays, isExpiring: true, isExpired: false };
    } else {
      return { status: 'active', label: `Aktif (${diffDays} hari lagi)`, daysLeft: diffDays, isExpiring: false, isExpired: false };
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = employees.length;
    const activeEmployees = employees.filter(e => (e.employmentStatus || e.status || 'Active').toLowerCase() === 'active');
    const pkwtList = employees.filter(e => {
      const type = (e.employmentType || '').toLowerCase();
      const cType = (e.contractType || '').toLowerCase();
      return type.includes('pkwt') || type.includes('contract') || cType.includes('pkwt');
    });
    const pkwttList = employees.filter(e => {
      const type = (e.employmentType || '').toLowerCase();
      return type.includes('permanent') || type.includes('tetap') || type.includes('pkwtt');
    });

    let expiringCount = 0;
    let expiredCount = 0;

    pkwtList.forEach(e => {
      const meta = getContractMeta(e);
      if (meta.isExpiring) expiringCount++;
      if (meta.isExpired) expiredCount++;
    });

    return {
      total: total,
      active: activeEmployees.length,
      pkwt: pkwtList.length,
      pkwtt: pkwttList.length,
      expiring: expiringCount,
      expired: expiredCount
    };
  }, [employees]);

  // Unique dropdown options
  const companies = useMemo(() => [...new Set(employees.map(e => e.company).filter(Boolean))].sort(), [employees]);
  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), [employees]);
  const employmentTypes = useMemo(() => [...new Set(employees.map(e => e.employmentType).filter(Boolean))].sort(), [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Exclude technical accounts
      if (isTechnicalAccount(emp)) return false;

      // Search term
      const query = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (emp.fullName || '').toLowerCase().includes(query) ||
        (emp.nickname || '').toLowerCase().includes(query) ||
        (emp.employeeCode || '').toLowerCase().includes(query) ||
        (emp.email || '').toLowerCase().includes(query) ||
        (emp.department || '').toLowerCase().includes(query) ||
        (emp.company || '').toLowerCase().includes(query) ||
        (emp.jobTitle || '').toLowerCase().includes(query) ||
        (emp.pkwtNumber || '').toLowerCase().includes(query);

      // Filters
      const matchesCompany = companyFilter ? emp.company === companyFilter : true;
      const matchesDept = departmentFilter ? emp.department === departmentFilter : true;
      const matchesEmployment = employmentFilter ? emp.employmentType === employmentFilter : true;

      const currentStatus = (emp.employmentStatus || emp.status || 'Active');
      const matchesStatus = statusFilter === 'all' ? true : currentStatus.toLowerCase() === statusFilter.toLowerCase();

      // Contract alert filter
      let matchesContractAlert = true;
      if (contractAlertFilter !== 'all') {
        const meta = getContractMeta(emp);
        if (contractAlertFilter === 'expiring') matchesContractAlert = meta.isExpiring;
        if (contractAlertFilter === 'expired') matchesContractAlert = meta.isExpired;
      }

      return matchesSearch && matchesCompany && matchesDept && matchesEmployment && matchesStatus && matchesContractAlert;
    });
  }, [employees, searchTerm, companyFilter, departmentFilter, employmentFilter, statusFilter, contractAlertFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, companyFilter, departmentFilter, employmentFilter, statusFilter, contractAlertFilter, activeTab]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'error');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (activeTab === 'contracts') {
      const data = filteredEmployees.map(e => {
        const meta = getContractMeta(e);
        return {
          'Employee ID': e.employeeCode || '-',
          'Nama Karyawan': e.fullName,
          'Perusahaan': e.company || '-',
          'Departemen': e.department || '-',
          'Jabatan': e.jobTitle || '-',
          'Status Kerja': e.employmentType || '-',
          'Nomor PKWT': e.pkwtNumber || '-',
          'Tipe Kontrak': e.contractType || '-',
          'Tanggal Mulai Kontrak': e.contractStartDate || '-',
          'Tanggal Berakhir Kontrak': e.contractEndDate || '-',
          'Status Masa Kontrak': meta.label
        };
      });
      exportToExcel(data, `GESIT-KONTRAK-PKWT-${todayStr}`);
    } else if (activeTab === 'payroll') {
      const data = filteredEmployees.map(e => ({
        'Employee ID': e.employeeCode || '-',
        'Nama Karyawan': e.fullName,
        'Departemen': e.department || '-',
        'Jabatan': e.jobTitle || '-',
        'Status Payroll': e.payrollStatus || 'Aktif',
        'Bank': e.bankName || '-',
        'Nomor Rekening': e.bankAccountNumber || '-',
        'Nama Pemilik Rekening': e.bankAccountName || '-',
        'NPWP': e.npwp || '-',
        'Status Pajak (PTKP)': e.taxStatus || '-',
        'BPJS Ketenagakerjaan': e.bpjsTkNumber || '-',
        'BPJS Kesehatan': e.bpjsHealthNumber || '-'
      }));
      exportToExcel(data, `GESIT-PAYROLL-DATA-${todayStr}`);
    } else {
      const data = filteredEmployees.map(e => ({
        'Employee ID': e.employeeCode || '-',
        'Nama Lengkap': e.fullName,
        'Nama Panggilan': e.nickname || '-',
        'Email': e.email,
        'No. Telepon': e.phone || '-',
        'Perusahaan': e.company || '-',
        'Cabang': e.branch || '-',
        'Departemen': e.department || '-',
        'Jabatan': e.jobTitle || '-',
        'Level': e.jobLevel || '-',
        'Status Kepegawaian': e.employmentType || '-',
        'Status Akun': e.status || 'Active',
        'Tanggal Bergabung': e.joinDate || '-'
      }));
      exportToExcel(data, `GESIT-MASTER-EMPLOYEE-${todayStr}`);
    }
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchTerm('');
    setCompanyFilter('');
    setDepartmentFilter('');
    setEmploymentFilter('');
    setStatusFilter('all');
    setContractAlertFilter('all');
  };

  // Transfer actions
  const openTransferModal = (emp: UserAccount) => {
    setTransferEmployee(emp);
    setTransferForm({
      effectiveDate: new Date().toISOString().slice(0, 10),
      company: emp.company || '',
      branch: emp.branch || '',
      department: emp.department || '',
      jobTitle: emp.jobTitle || '',
      jobLevel: emp.jobLevel || '',
      reason: ''
    });
  };

  const handleSaveTransfer = async () => {
    if (!transferEmployee || !transferForm.effectiveDate || !transferForm.reason.trim()) {
      showToast('Tanggal efektif dan alasan transfer wajib diisi', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Audit to employee_transfer_history if exists
      const historyRecord = {
        employee_id: transferEmployee.id,
        employee_code: transferEmployee.employeeCode || null,
        effective_date: transferForm.effectiveDate,
        old_company: transferEmployee.company || null,
        old_branch: transferEmployee.branch || null,
        old_department: transferEmployee.department || null,
        old_job_title: transferEmployee.jobTitle || null,
        old_job_level: transferEmployee.jobLevel || null,
        new_company: transferForm.company || null,
        new_branch: transferForm.branch || null,
        new_department: transferForm.department || null,
        new_job_title: transferForm.jobTitle || null,
        new_job_level: transferForm.jobLevel || null,
        reason: transferForm.reason.trim(),
        transferred_by: currentUser?.id || null
      };

      try {
        await supabase.from('employee_transfer_history').insert(historyRecord);
      } catch {
        // Fallback gracefully
      }

      // 2. Update user_accounts
      const { error: updateError } = await supabase
        .from('user_accounts')
        .update({
          company: transferForm.company || null,
          branch: transferForm.branch || null,
          department: transferForm.department || null,
          job_title: transferForm.jobTitle || null,
          job_level: transferForm.jobLevel || null
        })
        .eq('id', transferEmployee.id);

      if (updateError) throw updateError;

      await trackActivity(
        currentUser?.fullName || 'HR',
        currentUser?.role || 'Admin',
        'Transfer Employee',
        'EmployeeDataManager',
        `Transfer ${transferEmployee.fullName} (${transferEmployee.employeeCode || '-'}) ke ${transferForm.company} - ${transferForm.department}`
      );

      showToast(`Transfer untuk ${transferEmployee.fullName} berhasil disimpan`, 'success');
      setTransferEmployee(null);
      await fetchEmployees();
      onUpdateSuccess?.();
    } catch (err: any) {
      console.error('Transfer error:', err);
      showToast('Gagal memproses transfer: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save / Update Employee Form
  const handleSaveEmployee = async (userData: Partial<UserAccount>) => {
    const emailTrim = (userData.email || '').trim().toLowerCase();
    const username = userData.username || emailTrim.split('@')[0] || '';
    const passwordTrim = (userData as any).password?.trim();

    const payload: any = {
      username,
      full_name: userData.fullName,
      nickname: userData.nickname || null,
      email: emailTrim,
      role: userData.role || 'User',
      groups: userData.groups || ['general_user'],
      status: userData.status || 'Active',
      employment_status: userData.employmentStatus || 'Active',
      status_effective_date: userData.statusEffectiveDate || null,
      separation_date: userData.separationDate || null,
      separation_reason: userData.separationReason || null,
      company: userData.company || 'GESIT',
      branch: userData.branch || null,
      department: userData.department || 'Other',
      phone: userData.phone || null,
      address: userData.address || null,
      job_title: userData.jobTitle || null,
      employee_code: userData.employeeCode || null,
      join_date: userData.joinDate || null,
      job_level: userData.jobLevel || null,
      employment_type: userData.employmentType || null,
      contract_type: userData.contractType || null,
      contract_start_date: userData.contractStartDate || null,
      contract_end_date: userData.contractEndDate || null,
      pkwt_number: userData.pkwtNumber || null,
      payroll_status: userData.payrollStatus || null,
      bank_name: userData.bankName || null,
      bank_account_name: userData.bankAccountName || null,
      bank_account_number: userData.bankAccountNumber || null,
      tax_status: userData.taxStatus || null,
      dateOfBirth: userData.dateOfBirth || null,
      birth_place: userData.birthPlace || null,
      gender: userData.gender || null,
      marital_status: userData.maritalStatus || null,
      religion: userData.religion || null,
      blood_type: userData.bloodType || null,
      npwp: userData.npwp || null,
      passport_number: userData.passportNumber || null,
      residential_address: userData.residentialAddress || null,
      bpjs_tk_number: userData.bpjsTkNumber || null,
      bpjs_health_number: userData.bpjsHealthNumber || null,
      grade_class: userData.gradeClass || null,
      supervisor_id: userData.supervisorId || null,
      manager_id: userData.managerId || null,
      vp_id: userData.vpId || null,
      attendance_supervisor_id: userData.attendanceSupervisorId || null,
      attendance_hr_id: userData.attendanceHrId || null,
      attendance_manager_id: userData.attendanceManagerId || null,
      attendance_vp_id: userData.attendanceVpId || null,
      avatar_url: userData.avatarUrl || null,
      e_sign_url: userData.eSignUrl || null
    };

    try {
      if (passwordTrim && passwordTrim.length < 6) {
        showToast('Password minimal 6 karakter', 'error');
        return;
      }

      const authUserId = await ensureAuthUserWithPassword(
        emailTrim,
        passwordTrim,
        userData.fullName,
        editingEmployee?.id
      );

      if (editingEmployee) {
        if (authUserId) payload.auth_id = authUserId;
        const { error } = await supabase
          .from('user_accounts')
          .update(payload)
          .eq('id', editingEmployee.id);

        if (error) throw error;
        showToast(`Data ${userData.fullName} berhasil diperbarui`, 'success');
      } else {
        if (authUserId) payload.auth_id = authUserId;
        const { error } = await supabase
          .from('user_accounts')
          .insert([payload]);

        if (error) throw error;
        showToast(`Employee ${userData.fullName} berhasil didaftarkan`, 'success');
      }

      setIsFormModalOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
      onUpdateSuccess?.();
    } catch (err: any) {
      console.error('Save employee error:', err);
      showToast('Gagal menyimpan employee: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (user: UserAccount, newPassword: string): Promise<boolean> => {
    try {
      const authUserId = await ensureAuthUserWithPassword(
        user.email,
        newPassword,
        user.fullName,
        user.id
      );
      if (!authUserId) {
        showToast('Gagal mereset password untuk ' + user.email, 'error');
        return false;
      }
      await trackActivity(
        currentUser?.fullName || 'Admin',
        currentUser?.role || 'Admin',
        'Reset Password',
        'EmployeeDataManager',
        `Reset password untuk ${user.email} (${user.fullName})`
      );
      showToast(`Password ${user.fullName} berhasil direset`, 'success');
      return true;
    } catch (err: any) {
      showToast('Gagal mereset password: ' + (err.message || 'Unknown error'), 'error');
      return false;
    }
  };

  // Delete / Deactivate Employee
  const handleDeleteEmployee = async () => {
    if (!deleteEmployee) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('id', deleteEmployee.id);

      if (error) throw error;

      showToast(`Employee ${deleteEmployee.fullName} berhasil dihapus`, 'success');
      setDeleteEmployee(null);
      await fetchEmployees();
      onUpdateSuccess?.();
    } catch (err: any) {
      showToast('Gagal menghapus: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // If user does not have permission to view Employee Data, show detailed access restricted page
  if (!canView) {
    return (
      <AccessDenied
        moduleName="Data Employee"
        description="Modul ini berisi data kepegawaian, kontrak PKWT, dan payroll perusahaan yang bersifat rahasia."
        requiredAccess="Administrator, Tim HR, atau grup 'employee-data'"
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* PAGE HEADER */}
      <PageHeader
        title="Data Employee"
        description="Master data karyawan, kontrak, PKWT, dan payroll"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-semibold"
          >
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Export Excel
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => fetchEmployees()}
            title="Refresh Data"
          >
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          {canManage && (
            <Button
              onClick={() => {
                setEditingEmployee(null);
                setIsFormModalOpen(true);
              }}
              className="text-xs font-bold whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Employee
            </Button>
          )}
        </div>
      </PageHeader>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <Card className="border-border/60 shadow-sm relative overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Karyawan</p>
                <h3 className="text-3xl font-black text-foreground mt-1.5 tracking-tight">{stats.total}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  {stats.active} Karyawan Aktif
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <Users size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PKWT (Contract) */}
        <Card className="border-border/60 shadow-sm relative overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Karyawan PKWT</p>
                <h3 className="text-3xl font-black text-foreground mt-1.5 tracking-tight">{stats.pkwt}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {stats.total > 0 ? Math.round((stats.pkwt / stats.total) * 100) : 0}% dari total tenaga kerja
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <FileText size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PKWTT (Permanent) */}
        <Card className="border-border/60 shadow-sm relative overflow-hidden group">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Karyawan PKWTT</p>
                <h3 className="text-3xl font-black text-foreground mt-1.5 tracking-tight">{stats.pkwtt}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Karyawan Tetap (Permanent)
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <UserCheck size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Contracts Reminder */}
        <Card
          className={`border-border/60 shadow-sm relative overflow-hidden group cursor-pointer transition-colors ${
            stats.expiring > 0 ? 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-500/30' : ''
          }`}
          onClick={() => {
            setActiveTab('contracts');
            setContractAlertFilter(stats.expiring > 0 ? 'expiring' : 'all');
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Kontrak Jatuh Tempo
                </p>
                <h3 className={`text-3xl font-black mt-1.5 tracking-tight ${stats.expiring > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                  {stats.expiring}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {stats.expiring > 0 ? 'Berakhir dalam ≤ 60 hari' : 'Tidak ada kontrak segera berakhir'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                stats.expiring > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse' : 'bg-muted text-muted-foreground'
              }`}>
                <Clock size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VIEW TABS & TOOLBAR */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* TABS SELECTOR */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full sm:w-auto">
              <TabsList className="bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="directory" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <Users size={14} /> Master Data
                </TabsTrigger>
                <TabsTrigger value="contracts" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <FileText size={14} /> Kontrak & PKWT
                  {stats.expiring > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                      {stats.expiring}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="payroll" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <CreditCard size={14} /> Payroll & Pajak
                </TabsTrigger>
                <TabsTrigger value="transfers" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <ArrowRightLeft size={14} /> Riwayat Transfer
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Quick Count Info */}
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              <span>Menampilkan <b>{filteredEmployees.length}</b> dari <b>{employees.length}</b> employee</span>
            </div>
          </div>
        </CardHeader>

        {/* FILTERS & SEARCH ROW */}
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                placeholder="Cari nama, NIK, jabatan, email, departemen..."
                className="pl-10 text-xs bg-background/50 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Company */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Filter Department */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Filter Employment Type */}
            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="">Semua Status Kerja</option>
              {employmentTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>

            {/* Filter Contract Alert (Visible in contracts tab) */}
            {activeTab === 'contracts' && (
              <select
                value={contractAlertFilter}
                onChange={(e) => setContractAlertFilter(e.target.value as any)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                <option value="all">Semua Masa Kontrak</option>
                <option value="expiring">⚠️ Jatuh Tempo (≤ 60 hari)</option>
                <option value="expired">❌ Telah Berakhir</option>
              </select>
            )}

            {/* Reset Filters button */}
            {(searchTerm || companyFilter || departmentFilter || employmentFilter || statusFilter !== 'all' || contractAlertFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-9"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DATA TABLE CONTAINER */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent border-b border-border/60">
                <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Employee</TableHead>
                
                {/* DYNAMIC HEADERS BASED ON ACTIVE TAB */}
                {activeTab === 'directory' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Organisasi & Branch</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Jabatan & Level</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status Kepegawaian</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Kontak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status</TableHead>
                  </>
                )}

                {activeTab === 'contracts' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Departemen</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Nomor PKWT</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Tipe Kontrak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Periode Kontrak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Sisa Masa Berlaku</TableHead>
                  </>
                )}

                {activeTab === 'payroll' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Departemen</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Informasi Rekening Bank</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">NPWP & Pajak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">BPJS Ketenagakerjaan</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">BPJS Kesehatan</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status Payroll</TableHead>
                  </>
                )}

                {activeTab === 'transfers' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Penempatan Saat Ini</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Jabatan Saat Ini</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status Terakhir</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Aksi Mutasi</TableHead>
                  </>
                )}

                <TableHead className="px-6 py-3.5 text-center text-xs font-bold text-foreground/80">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-6 py-4"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-muted-foreground/40" />
                      <p className="font-semibold text-foreground">Tidak ada data employee ditemukan</p>
                      <p className="text-xs text-muted-foreground">Silakan sesuaikan filter atau kata kunci pencarian Anda</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((emp) => {
                  const contractMeta = getContractMeta(emp);

                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors group">
                      {/* EMPLOYEE COLUMN (Common to all tabs) */}
                      <TableCell className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={emp.fullName} url={emp.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-foreground truncate">{emp.fullName}</span>
                              {emp.nickname && emp.nickname !== emp.fullName && (
                                <span className="text-[11px] text-muted-foreground font-normal">({emp.nickname})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-semibold text-primary">
                                {emp.employeeCode || 'Belum ada NIK'}
                              </span>
                              {emp.joinDate && (
                                <span className="text-[11px] text-muted-foreground">
                                  · Masuk: {new Date(`${emp.joinDate}T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* MASTER DATA VIEW */}
                      {activeTab === 'directory' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.department || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.company || 'GESIT'} {emp.branch ? `· ${emp.branch}` : ''}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.jobTitle || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.jobLevel || 'Staff'} {emp.gradeClass ? `(${emp.gradeClass})` : ''}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold ${
                                (emp.employmentType || '').toLowerCase().includes('permanent')
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : (emp.employmentType || '').toLowerCase().includes('contract') || (emp.employmentType || '').toLowerCase().includes('pkwt')
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {emp.employmentType || 'Belum ditentukan'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs text-foreground flex items-center gap-1">
                              <Mail size={12} className="text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[180px]">{emp.email}</span>
                            </div>
                            {emp.phone && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone size={11} className="shrink-0" />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              (emp.employmentStatus || emp.status || 'Active').toLowerCase() === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                (emp.employmentStatus || emp.status || 'Active').toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`} />
                              {emp.employmentStatus || emp.status || 'Active'}
                            </span>
                          </TableCell>
                        </>
                      )}

                      {/* CONTRACTS & PKWT VIEW */}
                      {activeTab === 'contracts' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.department || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.company || '—'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {emp.pkwtNumber || <span className="text-muted-foreground font-normal italic">Belum tercatat</span>}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge variant="outline" className="text-xs">
                              {emp.contractType || emp.employmentType || 'PKWT'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-medium text-foreground">
                              {emp.contractStartDate ? new Date(`${emp.contractStartDate}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              {' s/d '}
                              {emp.contractEndDate ? new Date(`${emp.contractEndDate}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Tetap'}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            {contractMeta.isExpired ? (
                              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold">
                                ❌ {contractMeta.label}
                              </Badge>
                            ) : contractMeta.isExpiring ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold animate-pulse">
                                ⚠️ {contractMeta.label}
                              </Badge>
                            ) : contractMeta.status === 'permanent' ? (
                              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold">
                                ♾️ {contractMeta.label}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                                ✓ {contractMeta.label}
                              </Badge>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* PAYROLL & TAX VIEW */}
                      {activeTab === 'payroll' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.department || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.company || '—'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-bold text-foreground">
                              {emp.bankName ? `${emp.bankName} - ${emp.bankAccountNumber || 'No rek belum diisi'}` : '—'}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              a.n {emp.bankAccountName || emp.fullName}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="font-mono text-xs text-foreground">{emp.npwp || 'Belum ada NPWP'}</div>
                            <div className="text-[11px] text-muted-foreground">Status: {emp.taxStatus || 'TK/0'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5 font-mono text-xs">
                            {emp.bpjsTkNumber || <span className="text-muted-foreground italic font-sans">Belum diisi</span>}
                          </TableCell>
                          <TableCell className="px-6 py-3.5 font-mono text-xs">
                            {emp.bpjsHealthNumber || <span className="text-muted-foreground italic font-sans">Belum diisi</span>}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge variant="outline" className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                              {emp.payrollStatus || 'Active Payroll'}
                            </Badge>
                          </TableCell>
                        </>
                      )}

                      {/* MUTASI / TRANSFERS VIEW */}
                      {activeTab === 'transfers' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-bold text-foreground">{emp.company || 'GESIT'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.department} {emp.branch ? `· ${emp.branch}` : ''}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-bold text-foreground">{emp.jobTitle || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">Level: {emp.jobLevel || 'Staff'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge variant="outline" className="text-xs">
                              {emp.statusEffectiveDate ? `Efektif: ${emp.statusEffectiveDate}` : 'Assignment Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            {canManage && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTransferModal(emp)}
                                className="h-8 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                              >
                                <ArrowRightLeft size={13} className="mr-1.5" /> Mutasi Karyawan
                              </Button>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* ACTION BUTTONS */}
                      <TableCell className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick View Button */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setViewingEmployee(emp)}
                            title="Lihat Detail Profil"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Eye size={15} />
                          </Button>

                          {/* Edit Button */}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setIsFormModalOpen(true);
                              }}
                              title="Edit Data Employee"
                              className="text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Pencil size={15} />
                            </Button>
                          )}

                          {/* Transfer Button */}
                          {canManage && activeTab !== 'transfers' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openTransferModal(emp)}
                              title="Transfer / Mutasi Employee"
                              className="text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                            >
                              <ArrowRightLeft size={15} />
                            </Button>
                          )}

                          {/* Reset Password Button (Super Admin Only) */}
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setResetPasswordEmployee(emp)}
                              title="Reset Password Akun"
                              className="text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                            >
                              <KeyRound size={15} />
                            </Button>
                          )}

                          {/* Delete Button (Super Admin Only) */}
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteEmployee(emp)}
                              title="Hapus Data Employee"
                              className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 size={15} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border/60 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground font-medium">
            Halaman <span className="font-bold text-foreground">{currentPage}</span> dari <span className="font-bold text-foreground">{totalPages}</span> ({filteredEmployees.length} total baris)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* QUICK VIEW EMPLOYEE DETAIL MODAL */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border-border bg-card">
          {viewingEmployee && (
            <>
              {/* Header profile banner */}
              <div className="bg-muted/40 p-6 border-b border-border/60">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <UserAvatar name={viewingEmployee.fullName} url={viewingEmployee.avatarUrl} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{viewingEmployee.fullName}</h2>
                        {viewingEmployee.nickname && (
                          <Badge variant="outline" className="text-xs">
                            {viewingEmployee.nickname}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {viewingEmployee.jobTitle || 'Staff'} · {viewingEmployee.department} · {viewingEmployee.company}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-mono">
                          NIK: {viewingEmployee.employeeCode || 'Belum diisi'}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">
                          {viewingEmployee.employmentType || 'Status kerja belum diset'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewingEmployee(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {/* Detail Sections */}
              <div className="p-6 space-y-6 max-h-[68vh] overflow-y-auto">
                {/* 1. Biodata & Personal */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                    <Users size={14} className="text-primary" /> Data Pribadi
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-4 rounded-xl border border-border/50">
                    <div>
                      <span className="text-muted-foreground">Tempat / Tgl Lahir:</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {viewingEmployee.birthPlace || '—'}, {viewingEmployee.dateOfBirth || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Jenis Kelamin:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.gender || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status Pernikahan:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.maritalStatus || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agama:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.religion || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Golongan Darah:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.bloodType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">No. Telepon:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.phone || '—'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-muted-foreground">Alamat Domisili:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.residentialAddress || viewingEmployee.address || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Informasi Kontrak & PKWT */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-primary" /> Kontrak & PKWT
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-4 rounded-xl border border-border/50">
                    <div>
                      <span className="text-muted-foreground">Nomor PKWT:</span>
                      <p className="font-mono font-bold text-foreground mt-0.5">{viewingEmployee.pkwtNumber || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipe Kontrak:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.contractType || viewingEmployee.employmentType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status Masa Berlaku:</span>
                      <p className="font-semibold mt-0.5">
                        {getContractMeta(viewingEmployee).label}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tanggal Mulai Kontrak:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.contractStartDate || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tanggal Selesai Kontrak:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.contractEndDate || 'Permanen (PKWTT)'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tanggal Bergabung (Join Date):</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.joinDate || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Payroll, Rekening & Pajak */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                    <CreditCard size={14} className="text-primary" /> Payroll & Jamsostek
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-4 rounded-xl border border-border/50">
                    <div>
                      <span className="text-muted-foreground">Bank & Rekening:</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {viewingEmployee.bankName} - {viewingEmployee.bankAccountNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Atas Nama Rekening:</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.bankAccountName || viewingEmployee.fullName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status Payroll:</span>
                      <p className="font-semibold text-emerald-600 mt-0.5">{viewingEmployee.payrollStatus || 'Aktif'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">NPWP:</span>
                      <p className="font-mono font-semibold text-foreground mt-0.5">{viewingEmployee.npwp || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status Pajak (PTKP):</span>
                      <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.taxStatus || 'TK/0'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">BPJS Ketenagakerjaan:</span>
                      <p className="font-mono font-semibold text-foreground mt-0.5">{viewingEmployee.bpjsTkNumber || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">BPJS Kesehatan:</span>
                      <p className="font-mono font-semibold text-foreground mt-0.5">{viewingEmployee.bpjsHealthNumber || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-muted/30 px-6 py-4 border-t border-border/60 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setViewingEmployee(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const target = viewingEmployee;
                        setViewingEmployee(null);
                        openTransferModal(target);
                      }}
                      className="text-xs text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <ArrowRightLeft size={13} className="mr-1.5" /> Mutasi
                    </Button>
                    <Button
                      onClick={() => {
                        const target = viewingEmployee;
                        setViewingEmployee(null);
                        setEditingEmployee(target);
                        setIsFormModalOpen(true);
                      }}
                      className="text-xs font-bold"
                    >
                      <Pencil size={13} className="mr-1.5" /> Edit Lengkap
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* TRANSFER EMPLOYEE MODAL */}
      <Dialog open={!!transferEmployee} onOpenChange={(open) => !open && setTransferEmployee(null)}>
        <DialogContent className="flex max-h-[86vh] max-w-4xl flex-col overflow-hidden rounded-2xl border-border bg-card p-0">
          <div className="border-b border-border/60 px-6 pb-5 pt-6 bg-muted/20">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Employee movement & mutation
                  </p>
                  <DialogTitle className="text-xl font-bold tracking-tight">Transfer Employee</DialogTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Perbarui penempatan, departemen, atau jabatan employee dengan audit trail tercatat.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Employee ID</p>
                  <p className="text-sm font-bold text-foreground">{transferEmployee?.employeeCode || 'Belum diisi'}</p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <UserAvatar name={transferEmployee?.fullName || ''} url={transferEmployee?.avatarUrl} size="md" />
              <div>
                <p className="font-bold text-sm text-foreground">{transferEmployee?.fullName}</p>
                <p className="text-xs text-muted-foreground">{transferEmployee?.email}</p>
              </div>
              <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Identitas Tetap
              </span>
            </div>

            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Perbandingan Perpindahan</h3>
                  <p className="text-xs text-muted-foreground">Assignment lama vs penempatan baru.</p>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saat ini</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Company: <b className="text-foreground">{transferEmployee?.company || '—'}</b></p>
                    <p>Branch: <b className="text-foreground">{transferEmployee?.branch || '—'}</b></p>
                    <p>Department: <b className="text-foreground">{transferEmployee?.department || '—'}</b></p>
                    <p>Jabatan: <b className="text-foreground">{transferEmployee?.jobTitle || '—'}</b></p>
                    <p>Level: <b className="text-foreground">{transferEmployee?.jobLevel || '—'}</b></p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/40 bg-card p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">Setelah Transfer</p>
                  <div className="space-y-1 text-xs text-foreground font-medium">
                    <p>Company: <b>{transferForm.company || '—'}</b></p>
                    <p>Branch: <b>{transferForm.branch || '—'}</b></p>
                    <p>Department: <b>{transferForm.department || '—'}</b></p>
                    <p>Jabatan: <b>{transferForm.jobTitle || '—'}</b></p>
                    <p>Level: <b>{transferForm.jobLevel || '—'}</b></p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Assignment Baru</h3>
                  <p className="text-xs text-muted-foreground">Isi penempatan dan posisi baru.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold text-foreground">
                  Tanggal Efektif *
                  <Input
                    type="date"
                    value={transferForm.effectiveDate}
                    onChange={(e) => setTransferForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                    className="text-xs h-9 mt-1"
                  />
                </label>
                {([
                  ['company', 'Company / Entitas'],
                  ['branch', 'Branch / Cabang'],
                  ['department', 'Department'],
                  ['jobTitle', 'Jabatan / Job Position'],
                  ['jobLevel', 'Job Level']
                ] as const).map(([key, label]) => (
                  <label key={key} className="space-y-1.5 text-xs font-semibold text-foreground">
                    {label}
                    <Input
                      value={transferForm[key]}
                      onChange={(e) => setTransferForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={`Masukkan ${label.toLowerCase()}`}
                      className="text-xs h-9 mt-1"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section>
              <label className="space-y-1.5 text-xs font-semibold text-foreground">
                Alasan Transfer *
                <textarea
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm((f) => ({ ...f, reason: e.target.value }))}
                  className="min-h-24 w-full mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="Contoh: promosi jabatan, rotasi departemen, atau kebutuhan operasional cabang"
                />
              </label>
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button variant="outline" onClick={() => setTransferEmployee(null)} className="text-xs">
              Batal
            </Button>
            <Button onClick={handleSaveTransfer} disabled={isProcessing} className="text-xs font-bold bg-primary">
              {isProcessing ? 'Menyimpan...' : 'Simpan Mutasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* USER FORM MODAL (Add / Edit) */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={handleSaveEmployee}
        initialData={editingEmployee}
        employeeMode={true}
      />

      {/* RESET PASSWORD MODAL */}
      {resetPasswordEmployee && (
        <ResetPasswordModal
          isOpen={!!resetPasswordEmployee}
          onClose={() => setResetPasswordEmployee(null)}
          onSave={handleResetPassword}
          user={resetPasswordEmployee}
        />
      )}

      {/* DANGER CONFIRM DELETE MODAL */}
      {deleteEmployee && (
        <DangerConfirmModal
          isOpen={!!deleteEmployee}
          onClose={() => setDeleteEmployee(null)}
          onConfirm={handleDeleteEmployee}
          title={`Hapus Employee ${deleteEmployee.fullName}?`}
          message={`Apakah Anda yakin ingin menghapus data ${deleteEmployee.fullName} (${deleteEmployee.email})? Tindakan ini akan menghapus akun dan histori profilnya.`}
          confirmText="Ya, Hapus Permanen"
          isLoading={isProcessing}
        />
      )}
    </div>
  );
};

export default EmployeeDataManager;
