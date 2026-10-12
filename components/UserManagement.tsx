'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Pencil, RefreshCcw, ShieldCheck, Target, Clock, ChevronLeft, ChevronRight, Users, Activity, FileSpreadsheet, KeyRound } from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';
import { UserAccount, UserGroup } from '../types';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { MenuPermissionsModal } from './MenuPermissionsModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { supabase, supabaseAdmin, ensureAuthUserWithPassword } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const E_SIGN_MAP: Record<string, string> = {
  'sylvia@gesit.co.id': '/image/e-sign/sylvia.png',
  'rudi.siarudin@gesit.co.id': '/image/e-sign/siarudin.png',
  'desi@gesit.co.id': '/image/e-sign/desi.png',
  'natalia@gesit.co.id': '/image/e-sign/e-sign_bu-nata.png',
};

interface UserManagementProps {
  onUpdateSuccess?: () => void;
  currentUser: UserAccount | null;
  employeeMode?: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onUpdateSuccess, currentUser, employeeMode = false }) => {
  const { showToast } = useToast();
  const isEmployeeMode = employeeMode || (typeof window !== 'undefined' && window.location.pathname === '/employee-data');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserAccount | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserAccount | null>(null);
  const [permissionUser, setPermissionUser] = useState<UserAccount | null>(null);
  const [transferUser, setTransferUser] = useState<UserAccount | null>(null);
  const [transferForm, setTransferForm] = useState({ effectiveDate: new Date().toISOString().slice(0, 10), company: '', branch: '', department: '', jobTitle: '', jobLevel: '', reason: '' });
  const [viewingSignature, setViewingSignature] = useState<{ name: string; url: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr || dateStr === 'Never') return 'Offline';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return `Invalid: ${dateStr}`;

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSecs < 60) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.from('user_accounts').select('*').order('full_name');
      if (userError) throw userError;
      const { data: groupData, error: groupError } = await supabase.from('user_groups').select('*').order('name');
      if (groupError) throw groupError;
      if (userData) {
        const usersMapped = userData.map((u: any) => ({
          id: u.id,
          authId: u.auth_id,
          username: u.username,
          fullName: u.full_name,
          nickname: u.nickname || '',
          email: u.email,
          role: u.role,
          groups: u.groups || [],
          status: u.status,
          employmentStatus: u.employment_status || 'Active',
          statusEffectiveDate: u.status_effective_date,
          separationDate: u.separation_date,
          separationReason: u.separation_reason,
          company: u.company || '',
          department: u.department || '',
          phone: u.phone,
          address: u.address,
          jobTitle: u.job_title,
supervisorId: u.supervisor_id?.toString(),
          managerId: u.manager_id?.toString(),
          vpId: u.vp_id?.toString(),
          attendanceSupervisorId: u.attendance_supervisor_id?.toString() || '',
          attendanceHrId: u.attendance_hr_id?.toString() || '',
          attendanceManagerId: u.attendance_manager_id?.toString() || '',
          attendanceVpId: u.attendance_vp_id?.toString() || '',
          lastLogin: u.last_login ? u.last_login : 'Never',
          avatarUrl: u.avatar_url,
          eSignUrl: u.e_sign_url,
          employeeCode: u.employee_code,
          dateOfBirth: u.date_of_birth,
          birthPlace: u.birth_place,
          gender: u.gender,
          maritalStatus: u.marital_status,
          religion: u.religion,
          bloodType: u.blood_type,
          nik: u.nik,
          npwp: u.npwp,
          passportNumber: u.passport_number,
          residentialAddress: u.residential_address,
          bpjsTkNumber: u.bpjs_tk_number,
          bpjsHealthNumber: u.bpjs_health_number,
          gradeClass: u.grade_class,
          branch: u.branch,
          joinDate: u.join_date,
          jobLevel: u.job_level,
          employmentType: u.employment_type,
          contractType: u.contract_type,
          contractStartDate: u.contract_start_date,
          contractEndDate: u.contract_end_date,
          pkwtNumber: u.pkwt_number,
          payrollStatus: u.payroll_status,
          bankName: u.bank_name,
          bankAccountName: u.bank_account_name,
          bankAccountNumber: u.bank_account_number,
          taxStatus: u.tax_status,
        }));
        setUsers(usersMapped);

        // Audit check
        const marchUsers = usersMapped.filter(u => u.lastLogin.includes('2026-03'));
        if (marchUsers.length > 0) {
          console.log(`UserManagement: Found ${marchUsers.length} users active in March 2026`);
        } else {
          console.warn("UserManagement: No March 2026 active users found in database!");
        }
      }
      if (groupData) {
        setGroups(groupData.map((g: any) => ({ id: g.id, name: g.name, description: g.description, allowedMenus: g.allowed_menus || [] })));
      }
    } catch (err: any) { console.warn("Fetch data error", err); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const isTechnicalAccount = (user: UserAccount) => {
    const email = (user.email || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    return /(admin|testing|test|developer|dev|demo|staging|sandbox)/i.test(email) ||
      /(admin|testing|test|developer|dev|demo|staging|sandbox)/i.test(username);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (isEmployeeMode && isTechnicalAccount(user)) return false;
      const matchesSearch = (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesDepartment = departmentFilter ? user.department === departmentFilter : true;
      const matchesEmployment = employmentFilter ? user.employmentType === employmentFilter : true;
      return matchesSearch && matchesRole && matchesDepartment && matchesEmployment;
    });
  }, [users, searchTerm, roleFilter, departmentFilter, employmentFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter]);

  const handleExportExcel = () => {
    if (filteredUsers.length === 0) return;

    const dataToExport = filteredUsers.map(u => ({
      "Username": u.username,
      "Full Name": u.fullName,
      "Email": u.email,
      "Role": u.role,
      "Department": u.department,
      "Status": u.status,
      "Last Login": u.lastLogin || "-",
      "Company": u.company || "-"
    }));

    exportToExcel(dataToExport, `GESIT-USERS-${new Date().toISOString().split('T')[0]}`);
  };

  const handleAddUser = () => { setEditingUser(null); setIsModalOpen(true); };
  const handleEditUser = (user: UserAccount) => { setEditingUser(user); setIsModalOpen(true); };
  const openTransfer = (user: UserAccount) => {
    setTransferUser(user);
    setTransferForm({ effectiveDate: new Date().toISOString().slice(0, 10), company: user.company || '', branch: user.branch || '', department: user.department || '', jobTitle: user.jobTitle || '', jobLevel: user.jobLevel || '', reason: '' });
  };
  const submitTransfer = async () => {
    if (!transferUser || !transferForm.effectiveDate || !transferForm.reason.trim()) { showToast('Tanggal efektif dan alasan wajib diisi', 'error'); return; }
    setIsProcessing(true);
    try {
      const history = { employee_id: transferUser.id, employee_code: transferUser.employeeCode || null, effective_date: transferForm.effectiveDate, old_company: transferUser.company || null, old_branch: transferUser.branch || null, old_department: transferUser.department || null, old_job_title: transferUser.jobTitle || null, old_job_level: transferUser.jobLevel || null, new_company: transferForm.company || null, new_branch: transferForm.branch || null, new_department: transferForm.department || null, new_job_title: transferForm.jobTitle || null, new_job_level: transferForm.jobLevel || null, reason: transferForm.reason.trim(), transferred_by: currentUser?.id || null };
      const { data: insertedHistory, error: historyError } = await supabase.from('employee_transfer_history').insert(history).select('id').single();
      if (historyError) throw historyError;
      const { error: updateError } = await supabase.from('user_accounts').update({ company: transferForm.company || null, branch: transferForm.branch || null, department: transferForm.department || null, job_title: transferForm.jobTitle || null, job_level: transferForm.jobLevel || null }).eq('id', transferUser.id);
      if (updateError) {
        if (insertedHistory?.id) await supabase.from('employee_transfer_history').delete().eq('id', insertedHistory.id);
        throw updateError;
      }
      const { data: verified } = await supabase.from('user_accounts').select('id, company, branch, department, job_title, job_level').eq('id', transferUser.id).single();
      const expected = { company: transferForm.company || null, branch: transferForm.branch || null, department: transferForm.department || null, job_title: transferForm.jobTitle || null, job_level: transferForm.jobLevel || null };
      if (!verified || verified.id !== transferUser.id || Object.entries(expected).some(([key, value]) => verified[key as keyof typeof verified] !== value)) {
        if (insertedHistory?.id) await supabase.from('employee_transfer_history').delete().eq('id', insertedHistory.id);
        throw new Error('Verifikasi transfer gagal; histori dibatalkan');
      }
      showToast('Transfer employee berhasil disimpan', 'success'); setTransferUser(null); await fetchData(); onUpdateSuccess?.();
    } catch (error: any) { showToast(`Gagal transfer employee: ${error.message || 'Unknown error'}`, 'error'); }
    finally { setIsProcessing(false); }
  };

  const handleResetPassword = async (user: UserAccount, newPassword: string): Promise<boolean> => {
    try {
      const authUserId = await ensureAuthUserWithPassword(
        user.email,
        newPassword,
        user.fullName,
        user.id
      );
      if (!authUserId) {
        showToast("Gagal mereset password untuk " + user.email, "error");
        return false;
      }
      await trackActivity(
        currentUser?.fullName || 'User',
        currentUser?.role || 'User',
        'Reset Password',
        'UserManagement',
        `Reset password untuk ${user.email} (${user.fullName})`
      );
      showToast(`Password ${user.fullName} berhasil direset`, "success");
      return true;
    } catch (err: any) {
      showToast("Gagal mereset password: " + (err.message || 'Unknown error'), "error");
      return false;
    }
  };

  const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super admin' || currentUser?.role?.toLowerCase() === 'super_admin';
  const isAdminOrSuperAdmin = isSuperAdmin || currentUser?.role?.toLowerCase() === 'admin';
  const canManageEmployees = isAdminOrSuperAdmin || (isEmployeeMode && (currentUser?.groups || []).some((group) => ['hr', 'hrd', 'employee-data', 'attendance-request', 'attendance_request'].includes(String(group).toLowerCase().trim())));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader
              title={isEmployeeMode ? 'Data Employee' : 'System Administration'}
              description={isEmployeeMode ? 'Master data karyawan, kontrak, PKWT, dan payroll' : 'Global user access control & node registry'}

      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-bold"
          >
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Export Excel
          </Button>
          {canManageEmployees && (
            <Button
              onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
              className="text-xs font-bold whitespace-nowrap"
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Register Identity
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Input placeholder={isEmployeeMode ? 'Cari nama, kode employee, jabatan...' : 'Search user identity...'} className="w-full pl-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
        </div>
        {!isEmployeeMode && <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground flex-wrap w-full sm:w-auto">
          {['', 'Super Admin', 'Admin', 'Staff', 'User'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${roleFilter === r ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'}`}>{r || 'All'}</button>
          ))}
        </div>}
        {isEmployeeMode && <>
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Semua Departemen</option>{[...new Set(users.map((u) => u.department).filter(Boolean))].sort().map((department) => <option key={department} value={department}>{department}</option>)}</select>
          <select value={employmentFilter} onChange={(e) => setEmploymentFilter(e.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Semua Status Kerja</option>{[...new Set(users.map((u) => u.employmentType).filter(Boolean))].sort().map((employment) => <option key={employment} value={employment}>{employment}</option>)}</select>
        </>}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-transparent">
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Employee</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Email</TableHead>
                <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Department</TableHead>
                {isEmployeeMode ? <>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Jabatan</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Status Kerja</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Kontrak</TableHead>
                </> : <>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Role</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">E-Sign</TableHead>
                  <TableHead className="px-6 py-3 font-semibold text-xs text-foreground/80">Access Scope</TableHead>
                </>}
                <TableHead className="px-6 py-3 text-center font-semibold text-xs text-foreground/80">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-md" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-8 w-24 rounded-md" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-8 w-40 rounded-lg" /></TableCell>
                    <TableCell className="px-6 py-4 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedUsers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground text-sm">Registry Empty.</TableCell></TableRow>
              ) : paginatedUsers.map((user) => {
                const userESign = user.eSignUrl || E_SIGN_MAP[user.email?.toLowerCase().trim() || ''];
                return (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell className="px-6 py-4 font-medium text-sm text-foreground">
                    <div className="flex flex-col"><span>{user.fullName}</span><span className="text-xs font-normal text-muted-foreground">{isEmployeeMode ? (user.employeeCode || 'Kode belum diisi') : user.username}</span>{isEmployeeMode && user.joinDate && <span className="text-[11px] font-normal text-muted-foreground">Join: {new Date(`${user.joinDate}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col"><span className="text-xs font-medium text-foreground">{user.department || '—'}</span><span className="text-xs text-muted-foreground">{user.company || '—'}</span></div>
                  </TableCell>
                  {isEmployeeMode ? <>
                    <TableCell className="px-6 py-4"><div className="text-xs font-medium">{user.jobTitle || '—'}</div><div className="text-[11px] text-muted-foreground">{user.jobLevel || '—'}</div></TableCell>
                    <TableCell className="px-6 py-4"><Badge variant="outline" className="text-xs">{user.employmentType || 'Belum diisi'}</Badge></TableCell>
                    <TableCell className="px-6 py-4"><div className="text-xs">{user.contractType || '—'}</div><div className="text-[11px] text-muted-foreground">{user.contractEndDate ? `s/d ${new Date(`${user.contractEndDate}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Tanpa tanggal akhir'}</div></TableCell>
                  </> : <>
                    <TableCell className="px-6 py-4"><Badge variant="outline" className="rounded-md text-xs font-medium">{user.role}</Badge></TableCell>
                    <TableCell className="px-6 py-4">{userESign ? <Badge variant="secondary" className="text-xs text-emerald-700">Active</Badge> : <span className="text-xs text-muted-foreground italic">No E-Sign</span>}</TableCell>
                    <TableCell className="px-6 py-4"><Button variant="outline" size="sm" onClick={() => setPermissionUser(user)} className="h-8 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Configure Permissions</Button></TableCell>
                  </>}
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground transition-colors">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEditUser(user)} title="Edit User" className="text-muted-foreground hover:text-foreground"><Pencil size={15} /></Button>
                      {isEmployeeMode && canManageEmployees && <Button variant="ghost" size="icon-sm" onClick={() => openTransfer(user)} title="Transfer Employee" className="text-muted-foreground hover:text-blue-600"><RefreshCcw size={15} /></Button>}
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setResetPasswordUser(user)} title="Reset Password (Super Admin Only)" className="text-muted-foreground hover:text-amber-500"><KeyRound size={15} /></Button>
                      )}
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteUser(user)} title="Delete User (Super Admin Only)" className="text-muted-foreground hover:text-destructive"><Trash2 size={15} /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        </div>

        <div className="px-6 py-3.5 bg-muted/10 border-t border-border/60 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages || 1}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft size={16} /></Button>
            <Button variant="outline" size="icon-xs" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}><ChevronRight size={16} /></Button>
          </div>
        </div>
      </div>

      <Dialog open={!!transferUser} onOpenChange={(open) => !open && setTransferUser(null)}>
        <DialogContent className="flex max-h-[86vh] max-w-4xl flex-col overflow-hidden rounded-2xl border-slate-200 bg-white p-0">
            <div className="border-b border-slate-100 px-6 pb-5 pt-6">
              <DialogHeader><div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Employee movement</p><DialogTitle className="text-xl tracking-tight">Transfer Employee</DialogTitle><p className="mt-1 text-sm text-slate-500">Pindahkan assignment tanpa membuat employee baru.</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Employee ID</p><p className="text-sm font-semibold text-slate-800">{transferUser?.employeeCode || 'Belum diisi'}</p></div></div></DialogHeader>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{(transferUser?.fullName || 'E').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><p className="font-semibold text-slate-900">{transferUser?.fullName}</p><p className="text-xs text-slate-500">{transferUser?.email || 'Email belum diisi'}</p></div><span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Account tetap</span></div>
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Ringkasan perpindahan</h3><p className="text-xs text-slate-500">Employee sama, assignment diperbarui.</p></div><RefreshCcw className="h-4 w-4 text-slate-400" /></div><div className="grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-white p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Saat ini</p><div className="space-y-1 text-xs text-slate-600"><p>Company: {transferUser?.company || 'Belum diisi'}</p><p>Branch: {transferUser?.branch || 'Belum diisi'}</p><p>Department: {transferUser?.department || 'Belum diisi'}</p><p>Jabatan: {transferUser?.jobTitle || 'Belum diisi'}</p><p>Level: {transferUser?.jobLevel || 'Belum diisi'}</p></div></div><div className="rounded-lg border border-slate-900 bg-white p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-700">Setelah transfer</p><div className="space-y-1 text-xs text-slate-700"><p>Company: {transferForm.company || 'Belum diisi'}</p><p>Branch: {transferForm.branch || 'Belum diisi'}</p><p>Department: {transferForm.department || 'Belum diisi'}</p><p>Jabatan: {transferForm.jobTitle || 'Belum diisi'}</p><p>Level: {transferForm.jobLevel || 'Belum diisi'}</p></div></div></div></section><section><div className="mb-3 flex items-end justify-between"><div><h3 className="text-sm font-semibold text-slate-900">Assignment baru</h3><p className="text-xs text-slate-500">Isi bagian yang berubah.</p></div><span className="text-xs text-slate-400">* wajib</span></div><div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-700">Tanggal efektif<Input type="date" value={transferForm.effectiveDate} onChange={(e) => setTransferForm((form) => ({ ...form, effectiveDate: e.target.value }))} /></label>
                {([['company','Company'],['branch','Branch'],['department','Department'],['jobTitle','Job Position'],['jobLevel','Job Level']] as const).map(([key,label]) => <label key={key} className="space-y-1.5 text-sm font-medium text-slate-700">{label}<Input value={transferForm[key]} onChange={(e) => setTransferForm((form) => ({ ...form, [key]: e.target.value }))} placeholder={`Masukkan ${label.toLowerCase()}`} /></label>)}
              </div></section>
              <section><label className="space-y-1.5 text-sm font-medium text-slate-700">Alasan transfer<span className="ml-1 font-normal text-slate-400">(wajib)</span><textarea value={transferForm.reason} onChange={(e) => setTransferForm((form) => ({ ...form, reason: e.target.value }))} className="min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" placeholder="Contoh: kebutuhan organisasi, promosi, atau rotasi kerja" /></label></section>
            </div>
            <DialogFooter className="shrink-0 border-t border-slate-100 bg-white px-6 py-4"><Button variant="outline" onClick={() => setTransferUser(null)} className="border-slate-200 bg-white">Batal</Button><Button onClick={submitTransfer} disabled={isProcessing} className="bg-slate-900 text-white hover:bg-slate-800">{isProcessing ? 'Menyimpan...' : 'Simpan Transfer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (userData) => {
          const emailTrim = (userData.email || '').trim().toLowerCase();
          const username = userData.username || emailTrim.split('@')[0] || '';
          const passwordTrim = (userData as any).password?.trim();

          const payload = {
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
            department: userData.department || 'Other',
            phone: userData.phone,
            address: userData.address,
            job_title: userData.jobTitle,
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
            date_of_birth: userData.dateOfBirth || null,
            birth_place: userData.birthPlace || null,
            gender: userData.gender || null,
            marital_status: userData.maritalStatus || null,
            religion: userData.religion || null,
            blood_type: userData.bloodType || null,
            // NIK wajib melalui Vault/RPC; jangan kirim plaintext dari browser.
            npwp: userData.npwp || null,
            passport_number: userData.passportNumber || null,
            residential_address: userData.residentialAddress || null,
            bpjs_tk_number: userData.bpjsTkNumber || null,
            bpjs_health_number: userData.bpjsHealthNumber || null,
            grade_class: userData.gradeClass || null,
            branch: userData.branch || null,
            supervisor_id: userData.supervisorId || null,
            manager_id: userData.managerId || null,
            vp_id: userData.vpId || null,
            attendance_supervisor_id: userData.attendanceSupervisorId || null,
            attendance_hr_id: userData.attendanceHrId || null,
            attendance_manager_id: userData.attendanceManagerId || null,
            attendance_vp_id: userData.attendanceVpId || null,
            avatar_url: userData.avatarUrl,
            e_sign_url: userData.eSignUrl || null
          };
          try {
            if (passwordTrim && passwordTrim.length < 6) {
              showToast("Password minimal 6 karakter", "error");
              return;
            }

            const authUserId = await ensureAuthUserWithPassword(
              emailTrim,
              passwordTrim,
              userData.fullName,
              editingUser?.id
            );

            if (editingUser) {
              const updatePayload: any = { ...payload };
              if (authUserId) updatePayload.auth_id = authUserId;
              let { error } = await supabaseAdmin.from('user_accounts').update(updatePayload).eq('email', emailTrim);
              if (error) {
                const fallback = await supabase.from('user_accounts').update(updatePayload).eq('email', emailTrim);
                if (fallback.error) throw fallback.error;
              }
            } else {
              const newRecord = {
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
                department: userData.department || 'Other',
                phone: userData.phone,
                address: userData.address,
                job_title: userData.jobTitle,
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
            date_of_birth: userData.dateOfBirth || null,
            birth_place: userData.birthPlace || null,
            gender: userData.gender || null,
            marital_status: userData.maritalStatus || null,
            religion: userData.religion || null,
            blood_type: userData.bloodType || null,
            // NIK wajib melalui Vault/RPC; jangan kirim plaintext dari browser.
            npwp: userData.npwp || null,
            passport_number: userData.passportNumber || null,
            residential_address: userData.residentialAddress || null,
            bpjs_tk_number: userData.bpjsTkNumber || null,
            bpjs_health_number: userData.bpjsHealthNumber || null,
            grade_class: userData.gradeClass || null,
            branch: userData.branch || null,
            supervisor_id: userData.supervisorId || null,
                manager_id: userData.managerId || null,
                vp_id: userData.vpId || null,
                attendance_supervisor_id: userData.attendanceSupervisorId || null,
                attendance_hr_id: userData.attendanceHrId || null,
                attendance_manager_id: userData.attendanceManagerId || null,
                attendance_vp_id: userData.attendanceVpId || null,
                avatar_url: userData.avatarUrl,
                e_sign_url: userData.eSignUrl || null,
                auth_id: authUserId || null
              };
              let { error } = await supabaseAdmin.from('user_accounts').insert([newRecord]);
              if (error) {
                console.warn('supabaseAdmin insert failed, trying supabase anon fallback:', error);
                const fallback = await supabase.from('user_accounts').insert([newRecord]);
                if (fallback.error) throw fallback.error;
              }
            }
            if (onUpdateSuccess) onUpdateSuccess();

            await trackActivity(
              currentUser?.fullName || 'User',
              currentUser?.role || 'User',
              editingUser ? 'Update User' : 'Create User',
              'UserManagement',
              `${editingUser ? 'Updated' : 'Created'} user ${payload.email} (${payload.full_name})`
            );
            fetchData();
            showToast(editingUser ? "User updated successfully" : "User created successfully", "success");
            setIsModalOpen(false);
          } catch (err: any) {
            console.error("Save user error:", err);
            showToast("Failed to save user: " + (err.message || 'Unknown error'), "error");
          }
        }}
        initialData={editingUser}
        availableGroups={groups}
        employeeMode={isEmployeeMode}
      />

      <DangerConfirmModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={async () => {
          if (!deleteUser) return;
          setIsProcessing(true);
          try {
            let { error } = await supabaseAdmin.from('user_accounts').delete().eq('id', deleteUser.id);
            if (error) {
              const fallback = await supabase.from('user_accounts').delete().eq('id', deleteUser.id);
              if (fallback.error) throw fallback.error;
            }
            try {
              await supabaseAdmin.auth.admin.deleteUser(deleteUser.id.toString());
            } catch (authErr) {
              console.warn('Could not delete auth user:', authErr);
            }
            await trackActivity(
              currentUser?.fullName || 'User',
              currentUser?.role || 'User',
              'Delete User',
              'UserManagement',
              `Deleted user ${deleteUser.email} (${deleteUser.fullName})`
            );
            await fetchData();
            showToast("User deleted successfully", "success");
            setDeleteUser(null);
          } catch (err: any) {
            showToast("Failed to delete user: " + (err.message || 'Unknown error'), "error");
          } finally {
            setIsProcessing(false);
          }
        }}
        title="Revoke Node Identity"
        message={`Permanently erase protocol access for "${deleteUser?.fullName}"?`}
        isLoading={isProcessing}
      />

      <ResetPasswordModal
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        user={resetPasswordUser}
        onSave={handleResetPassword}
      />

      <MenuPermissionsModal
        isOpen={!!permissionUser}
        onClose={() => setPermissionUser(null)}
        user={permissionUser}
        groupDefinitions={groups}
        onSave={async (menus) => {
          if (!permissionUser) return;
          try {
            const { error } = await supabaseAdmin.from('user_accounts').update({ groups: menus }).eq('id', permissionUser.id);
            if (error) {
              console.error('MenuPermissions save error:', error);
              throw error;
            }
            showToast(`Permissions updated for ${permissionUser.fullName}`, "success");
            await fetchData();
            setPermissionUser(null);
          } catch (err: any) {
            console.error('MenuPermissions full error:', err);
            showToast("Gagal menyimpan permission: " + (err.message || 'Unknown error'), "error");
          }
        }}
      />

      {/* ── E-Signature Preview Modal ── */}
      {viewingSignature && (
        <Dialog open={!!viewingSignature} onOpenChange={(open) => !open && setViewingSignature(null)}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
              <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                Digital Signature — {viewingSignature.name}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <div className="p-6 bg-muted/20 rounded-2xl border border-border/60 flex items-center justify-center min-h-[160px]">
                <img src={viewingSignature.url} alt="Digital Signature" className="max-h-36 max-w-full object-contain filter contrast-125" />
              </div>
            </div>
            <DialogFooter className="px-6 py-3.5 border-t border-border/60 gap-2 flex sm:justify-end bg-muted/10">
              <Button variant="outline" size="sm" onClick={() => setViewingSignature(null)} className="text-xs font-medium">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

