import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin, ensureAuthUserWithPassword } from '../lib/supabaseClient';

import { UserAccount } from '../types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  RefreshCcw, 
  Tag, 
  Clock, 
  Bell, 
  Users, 
  Building2, 
  Settings, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Key, 
  CheckSquare, 
  Square,
  LayoutDashboard,
  Kanban,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Activity,
  FolderOpen,
  FileCheck,
  Wallet,
  Coins,
  Phone,
  BookUser,
  BarChart2,
  Scale,
  FileText,
  Eye,
  EyeOff,
  Crown,
  Briefcase,
  Network,
  PenTool,
  Loader2
} from 'lucide-react';

interface CSLSettingsProps {
  currentUser: UserAccount | null;
  view?: 'categories' | 'sla' | 'notifications' | 'users' | 'companies' | 'departments' | 'system';
}

// ── Data Interfaces ──────────────────────────────────────────────────────────
interface CategoryItem {
  id: number | string;
  code: string;
  name: string;
  sla_days: number;
  description: string;
}

interface MenuPermissions {
  dashboard: boolean;
  requests_view: boolean;
  requests_create: boolean;
  requests_review: boolean;
  routine_view: boolean;
  routine_manage: boolean;
  budget_view: boolean;
  budget_approve: boolean;
  directory_view: boolean;
  directory_manage: boolean;
  reports_view: boolean;
  settings_manage: boolean;
}

interface UserItem {
  id: number | string;
  name: string;
  email: string;
  role: string;
  groups: string[];
  permissions: MenuPermissions;
}

interface CompanyItem {
  id: number | string;
  name: string;
  code: string;
  departments: number;
  employees: number;
}

export interface DepartmentItem {
  id: number | string;
  name: string;
  code: string;
  employees: number;
}

// Default Super Admin Permissions (full access everything)
const DEFAULT_SUPER_ADMIN_PERMISSIONS: MenuPermissions = {
  dashboard: true,
  requests_view: true,
  requests_create: true,
  requests_review: true,
  routine_view: true,
  routine_manage: true,
  budget_view: true,
  budget_approve: true,
  directory_view: true,
  directory_manage: true,
  reports_view: true,
  settings_manage: true,
};

// Default Admin Permissions (full except delete)
const DEFAULT_ADMIN_PERMISSIONS: MenuPermissions = {
  dashboard: true,
  requests_view: true,
  requests_create: true,
  requests_review: true,
  routine_view: true,
  routine_manage: true,
  budget_view: true,
  budget_approve: true,
  directory_view: true,
  directory_manage: true,
  reports_view: true,
  settings_manage: false,
};

// Default Staff Permissions (operational, no approve budget / settings)
const DEFAULT_STAFF_PERMISSIONS: MenuPermissions = {
  dashboard: true,
  requests_view: true,
  requests_create: true,
  requests_review: true,
  routine_view: true,
  routine_manage: true,
  budget_view: true,
  budget_approve: false,
  directory_view: true,
  directory_manage: false,
  reports_view: true,
  settings_manage: false,
};

// Default User / Requester Permissions (submit requests only)
const DEFAULT_REQUESTER_PERMISSIONS: MenuPermissions = {
  dashboard: false,
  requests_view: true,
  requests_create: true,
  requests_review: false,
  routine_view: false,
  routine_manage: false,
  budget_view: false,
  budget_approve: false,
  directory_view: false,
  directory_manage: false,
  reports_view: false,
  settings_manage: false,
};

// ── Mock Data Defaults ───────────────────────────────────────────────────────
const MOCK_CATEGORIES: CategoryItem[] = [
  { id: 1, code: 'AGR', name: 'Agreement', sla_days: 5, description: 'Contract drafting, revision, and review requests' },
  { id: 2, code: 'LREV', name: 'Legal Review', sla_days: 5, description: 'Review of external templates and business documents' },
  { id: 3, code: 'CORPSECR', name: 'Corporate Secretary', sla_days: 5, description: 'Board minutes, resolutions, and statutory filings' },
  { id: 4, code: 'OSS', name: 'OSS', sla_days: 14, description: 'OSS system permits and licensing registration' },
  { id: 5, code: 'LIC', name: 'Licensing', sla_days: 10, description: 'General regional and sector-specific licenses' },
  { id: 6, code: 'NOTARY', name: 'Notary', sla_days: 7, description: 'Deed preparation and notarization coordination' },
  { id: 7, code: 'LEGALOP', name: 'Legal Opinion', sla_days: 5, description: 'Formal written legal analysis and advisory opinions' },
  { id: 8, code: 'DOCREQ', name: 'Document Request', sla_days: 2, description: 'Retrieval of corporate documents or permits' },
  { id: 9, code: 'COMPLIANCE', name: 'Compliance', sla_days: 5, description: 'Regulatory reports and compliance reviews' },
  { id: 10, code: 'OTHER', name: 'Other', sla_days: 5, description: 'General and miscellaneous support' },
];

// Users loaded dynamically from DB

// Companies loaded dynamically from DB

export const CSLSettings: React.FC<CSLSettingsProps> = ({ currentUser, view = 'categories' }) => {
  // ── States ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryItem[]>(MOCK_CATEGORIES);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catForm, setCatForm] = useState({ code: '', name: '', sla_days: 5, description: '' });

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'User', groupsStr: 'csl_requester', password: '', eSignUrl: '', employeeCode: '', jobTitle: '', joinDate: '', jobLevel: 'Staff', company: 'GESIT', department: 'Other' });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [isUserSaving, setIsUserSaving] = useState(false);
  const [isUploadingESign, setIsUploadingESign] = useState(false);

  // User Permissions Modal State
  const [permUser, setPermUser] = useState<UserItem | null>(null);
  const [userPerms, setUserPerms] = useState<MenuPermissions>(DEFAULT_REQUESTER_PERMISSIONS);

  // Company Modal State
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', code: '', departments: 1, employees: 10 });

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'user' | 'company' | 'department'; id: number | string; name: string } | null>(null);

  // Department Modal State
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });

  // Single Designated Approver Routing State
  const [expenseApprover, setExpenseApprover] = useState<string>(() => {
    try {
      const s = localStorage.getItem('csl_expense_approver');
      if (s) return s;
    } catch {}
    return 'natalia@gesit.co.id';
  });

  const [offshoreApprover, setOffshoreApprover] = useState<string>(() => {
    try {
      const s = localStorage.getItem('csl_offshore_approver');
      if (s) return s;
    } catch {}
    return 'natalia@gesit.co.id';
  });

  const handleSaveApprovers = async () => {
    // Save to local storage first (fallback)
    localStorage.setItem('csl_expense_approver', expenseApprover);
    localStorage.setItem('csl_offshore_approver', offshoreApprover);
    
    // Save to Supabase (upsert)
    try {
      await supabase.from('csl_system_settings').upsert([
        { setting_key: 'csl_expense_approver', setting_value: expenseApprover },
        { setting_key: 'csl_offshore_approver', setting_value: offshoreApprover }
      ], { onConflict: 'setting_key' });
    } catch (e) {
      console.warn('System settings table may not exist yet, using localStorage only.', e);
    }
    
    showFeedback('Pengaturan System & Approver berhasil disimpan!');
  };

  // ── Fetch DB Data ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (view === 'categories' || view === 'sla') {
        const { data, error } = await supabase.from('csl_request_categories').select('*').order('name');
        if (!error && data && data.length > 0) setCategories(data);
      }
      if (view === 'users' || view === 'notifications') {
        const { data, error } = await supabase
          .from('user_accounts')
          .select('id, full_name, email, role, groups, department, company')
          .order('full_name');
        if (error) {
          console.error('CSLSettings: Failed to load users:', error);
        } else if (data) {
          const mapped: UserItem[] = data.map((u: any) => {
            const role = u.role || 'User';
            const roleLower = role.trim().toLowerCase();
            const defaultPerms =
              roleLower === 'super admin' || roleLower === 'super_admin'
                ? DEFAULT_SUPER_ADMIN_PERMISSIONS
                : roleLower === 'admin'
                ? DEFAULT_ADMIN_PERMISSIONS
                : roleLower === 'staff'
                ? DEFAULT_STAFF_PERMISSIONS
                : DEFAULT_REQUESTER_PERMISSIONS;
            const groupsArr: string[] = u.groups || [];
            const permissions = groupsArr.length > 0 ? {
              dashboard: groupsArr.includes('dashboard'),
              requests_view: groupsArr.includes('req_view') || groupsArr.includes('requests_view') || groupsArr.includes('csl-requests'),
              requests_create: groupsArr.includes('req_submit') || groupsArr.includes('requests_create'),
              requests_review: groupsArr.includes('req_review') || groupsArr.includes('requests_review'),
              routine_view: groupsArr.includes('routine_view') || groupsArr.includes('routine'),
              routine_manage: groupsArr.includes('routine_create') || groupsArr.includes('routine_manage'),
              budget_view: groupsArr.includes('budget') || groupsArr.includes('budget_view'),
              budget_approve: groupsArr.includes('budget') || groupsArr.includes('budget_approve'),
              directory_view: groupsArr.includes('directory') || groupsArr.includes('directory_view'),
              directory_manage: groupsArr.includes('directory_manage'),
              reports_view: groupsArr.includes('reports') || groupsArr.includes('reports_view'),
              settings_manage: groupsArr.includes('settings') || groupsArr.includes('settings_manage'),
            } : defaultPerms;

            return {
              id: u.id,
              name: u.full_name || u.email || 'Unknown',
              email: u.email || '',
              role,
              groups: groupsArr,
              permissions,
            };
          });
          setUsers(mapped);
        }
      }

      // Fetch system settings for approvers
      const { data: sysSettings, error: sysError } = await supabase.from('csl_system_settings').select('*');
      if (!sysError && sysSettings) {
        const expenseRow = sysSettings.find((s: any) => s.setting_key === 'csl_expense_approver');
        const offshoreRow = sysSettings.find((s: any) => s.setting_key === 'csl_offshore_approver');
        if (expenseRow?.setting_value) {
          setExpenseApprover(expenseRow.setting_value);
          localStorage.setItem('csl_expense_approver', expenseRow.setting_value);
        }
        if (offshoreRow?.setting_value) {
          setOffshoreApprover(offshoreRow.setting_value);
          localStorage.setItem('csl_offshore_approver', offshoreRow.setting_value);
        }
      }

      if (view === 'companies') {
        const [compRes, usersRes] = await Promise.all([
          supabase.from('companies').select('*').order('name'),
          supabase.from('user_accounts').select('company')
        ]);
        if (compRes.error) {
          console.error('CSLSettings: Failed to load companies:', compRes.error);
        } else if (compRes.data) {
          const users = usersRes.data || [];
          setCompanies(compRes.data.map((c: any) => {
            // Count users that belong to this company (match by name or code)
            const memberCount = users.filter(u => 
              u.company === c.name || u.company === c.code || 
              (u.company && u.company.toLowerCase() === c.name.toLowerCase())
            ).length;
            
            return {
              id: c.id,
              name: c.name,
              code: c.code || '',
              departments: c.departments || 0,
              employees: memberCount,
            };
          }));
        }
      }
      if (view === 'departments') {
        const [deptRes, usersRes] = await Promise.all([
          supabase.from('departments').select('*').order('name'),
          supabase.from('user_accounts').select('department')
        ]);
        if (deptRes.error) {
          console.error('CSLSettings: Failed to load departments:', deptRes.error);
        } else if (deptRes.data) {
          const users = usersRes.data || [];
          setDepartments(deptRes.data.map((d: any) => {
            const memberCount = users.filter(u => 
              u.department === d.name || u.department === d.code || 
              (u.department && u.department.toLowerCase() === d.name.toLowerCase())
            ).length;
            
            return {
              id: d.id,
              name: d.name,
              code: d.code || '',
              employees: memberCount,
            };
          }));
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view]);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // ── Category Handlers ──────────────────────────────────────────────────────
  const openCategoryModal = (cat?: CategoryItem) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({ code: cat.code, name: cat.name, sla_days: cat.sla_days, description: cat.description });
    } else {
      setEditingCategory(null);
      setCatForm({ code: '', name: '', sla_days: 5, description: '' });
    }
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim() || !catForm.code.trim()) return;

    if (editingCategory) {
      const updated = categories.map(c => c.id === editingCategory.id ? {
        ...c,
        code: catForm.code.toUpperCase().trim(),
        name: catForm.name.trim(),
        sla_days: Number(catForm.sla_days),
        description: catForm.description.trim()
      } : c);
      setCategories(updated);
      showFeedback(`Category "${catForm.name}" updated successfully!`);
    } else {
      const newCat: CategoryItem = {
        id: Date.now(),
        code: catForm.code.toUpperCase().trim(),
        name: catForm.name.trim(),
        sla_days: Number(catForm.sla_days),
        description: catForm.description.trim()
      };
      setCategories(prev => [newCat, ...prev]);
      showFeedback(`Category "${catForm.name}" added successfully!`);
    }

    setCatModalOpen(false);
  };

  // ── User Handlers ──────────────────────────────────────────────────────────
  const openUserModal = async (u?: UserItem) => {
      if (u) {
        setEditingUser(u);
        // Ambil e_sign_url secara terpisah agar aman meski kolom belum ada
        let eSignUrl = '';
        try {
          const { data: signData } = await supabase
            .from('user_accounts')
            .select('e_sign_url')
            .eq('id', u.id)
            .single();
          eSignUrl = signData?.e_sign_url || '';
        } catch (_) { /* kolom belum ada, abaikan */ }
        setUserForm({
          name: u.name, email: u.email, role: u.role, groupsStr: u.groups.join(', '), password: '', eSignUrl,
          employeeCode: (u as any).employee_code || '',
          jobTitle: (u as any).job_title || '',
          joinDate: (u as any).join_date || '',
          jobLevel: (u as any).job_level || 'Staff',
          company: (u as any).company || 'GESIT',
          department: (u as any).department || 'Other',
        });
      } else {
        setEditingUser(null);
        setUserForm({
          name: '', email: '', role: 'User', groupsStr: 'csl_requester', password: '', eSignUrl: '',
          employeeCode: '', jobTitle: '', joinDate: '', jobLevel: 'Staff', company: 'GESIT', department: 'Other',
        });
      }
      setShowUserPassword(false);
      setUserModalOpen(true);
    };

  const handleESignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingESign(true);
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dmr8bxdos';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gesit_erp_preset';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', uploadPreset);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) {
        setUserForm(prev => ({ ...prev, eSignUrl: data.secure_url }));
      } else {
        throw new Error(data.error?.message || 'Upload gagal');
      }
    } catch (err: any) {
      showFeedback(`E-Sign upload gagal: ${err.message}`);
    } finally {
      setIsUploadingESign(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    let groupsArr = userForm.groupsStr.split(',').map(g => g.trim().toLowerCase()).filter(Boolean);
    if (userForm.role === 'Super Admin' && !groupsArr.includes('super_admin')) {
      groupsArr.unshift('super_admin');
    }
    setIsUserSaving(true);
    try {
      const emailTrim = userForm.email.trim().toLowerCase();
      const passwordTrim = userForm.password.trim();

      if (passwordTrim && passwordTrim.length < 6) {
        throw new Error('Password minimal 6 karakter');
      }

      // Ensure user exists in Supabase Auth & password is properly configured
      const authUserId = await ensureAuthUserWithPassword(
        emailTrim,
        passwordTrim,
        userForm.name.trim(),
        editingUser?.id
      );

      if (editingUser) {
        const updatePayload: any = {
                  full_name: userForm.name.trim(),
                  email: emailTrim,
                  role: userForm.role,
                  groups: groupsArr,
                  e_sign_url: userForm.eSignUrl || null,
                  employee_code: userForm.employeeCode || null,
                  job_title: userForm.jobTitle || null,
                  join_date: userForm.joinDate || null,
                  job_level: userForm.jobLevel || null,
                  company: userForm.company || 'GESIT',
                  department: userForm.department || 'Other',
                };
        if (authUserId) {
          updatePayload.auth_id = authUserId;
        }

        let { error } = await supabaseAdmin.from('user_accounts').update(updatePayload).eq('email', emailTrim);

        if (error) {
          const fallback = await supabase.from('user_accounts').update(updatePayload).eq('email', emailTrim);
          if (fallback.error) throw fallback.error;
        }
        showFeedback(`User "${userForm.name}" updated!`);
      } else {
        const username = emailTrim.split('@')[0];
        const newUserPayload = {
                  username,
                  full_name: userForm.name.trim(),
                  email: emailTrim,
                  role: userForm.role,
                  groups: groupsArr.length ? groupsArr : ['general_user'],
                  company: userForm.company || 'GESIT',
                  department: userForm.department || 'Other',
                  status: 'Active',
                  employee_code: userForm.employeeCode || username,
                  job_title: userForm.jobTitle || null,
                  join_date: userForm.joinDate || null,
                  job_level: userForm.jobLevel || 'Staff',
                  auth_id: authUserId || null,
                };

        let { error } = await supabaseAdmin.from('user_accounts').insert([newUserPayload]);
        if (error) {
          console.warn('supabaseAdmin insert failed, trying supabase anon fallback:', error);
          const fallback = await supabase.from('user_accounts').insert([newUserPayload]);
          if (fallback.error) throw fallback.error;
        }
        showFeedback(`User "${userForm.name}" ditambahkan!`);
      }
      setUserModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      showFeedback(`Error: ${err.message || 'Gagal menyimpan user'}`);
    } finally {
      setIsUserSaving(false);
    }
  };

  // ── Permissions Modal Handlers ─────────────────────────────────────────────
  const openPermissionsModal = (u: UserItem) => {
    setPermUser(u);
    const roleLower = (u.role || '').trim().toLowerCase();
    const defaultPerms =
      roleLower === 'super admin' || roleLower === 'super_admin'
        ? DEFAULT_SUPER_ADMIN_PERMISSIONS
        : roleLower === 'admin'
        ? DEFAULT_ADMIN_PERMISSIONS
        : roleLower === 'staff'
        ? DEFAULT_STAFF_PERMISSIONS
        : DEFAULT_REQUESTER_PERMISSIONS;

    if (u.groups && Array.isArray(u.groups) && u.groups.length > 0) {
      const g = u.groups;
      setUserPerms({
        dashboard: g.includes('dashboard'),
        requests_view: g.includes('req_view') || g.includes('requests_view') || g.includes('csl-requests'),
        requests_create: g.includes('req_submit') || g.includes('requests_create'),
        requests_review: g.includes('req_review') || g.includes('requests_review'),
        routine_view: g.includes('routine_view') || g.includes('routine'),
        routine_manage: g.includes('routine_create') || g.includes('routine_manage'),
        budget_view: g.includes('budget') || g.includes('budget_view'),
        budget_approve: g.includes('budget') || g.includes('budget_approve'),
        directory_view: g.includes('directory') || g.includes('directory_view'),
        directory_manage: g.includes('directory_manage'),
        reports_view: g.includes('reports') || g.includes('reports_view'),
        settings_manage: g.includes('settings') || g.includes('settings_manage'),
      });
    } else {
      setUserPerms(u.permissions || defaultPerms);
    }
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    // Konversi MenuPermissions object ke array menu IDs (format yang sama dengan MenuPermissionsModal)
    const menuIds: string[] = [];
    if (userPerms.dashboard) menuIds.push('dashboard');
    if (userPerms.requests_view) menuIds.push('req_view');
    if (userPerms.requests_create) menuIds.push('req_submit');
    if (userPerms.requests_review) menuIds.push('req_review');
    if (userPerms.routine_view) menuIds.push('routine_view');
    if (userPerms.routine_manage) menuIds.push('routine_create');
    if (userPerms.budget_view || userPerms.budget_approve) menuIds.push('budget');
    if (userPerms.directory_view || userPerms.directory_manage) menuIds.push('directory-external');
    if (userPerms.reports_view) menuIds.push('reports');
    if (userPerms.settings_manage) menuIds.push('settings');

    try {
      const { error } = await supabaseAdmin
        .from('user_accounts')
        .update({ groups: menuIds })
        .eq('id', permUser.id);
      if (error) throw error;
      // Update local state setelah DB berhasil
      setUsers(users.map(u => u.id === permUser.id ? { ...u, groups: menuIds, permissions: userPerms } : u));
      showFeedback(`Permissions saved for ${permUser.name}`);
    } catch (err: any) {
      showFeedback(`Gagal menyimpan: ${err.message}`);
    }
    setPermUser(null);
  };

  const applyPreset = (preset: 'super_admin' | 'admin' | 'staff' | 'user') => {
    if (preset === 'super_admin') setUserPerms(DEFAULT_SUPER_ADMIN_PERMISSIONS);
    if (preset === 'admin') setUserPerms(DEFAULT_ADMIN_PERMISSIONS);
    if (preset === 'staff') setUserPerms(DEFAULT_STAFF_PERMISSIONS);
    if (preset === 'user') setUserPerms(DEFAULT_REQUESTER_PERMISSIONS);
  };

  // ── Company Handlers ───────────────────────────────────────────────────────
  const openCompanyModal = (c?: CompanyItem) => {
    if (c) {
      setEditingCompany(c);
      setCompanyForm({ name: c.name, code: c.code, departments: c.departments, employees: c.employees });
    } else {
      setEditingCompany(null);
      setCompanyForm({ name: '', code: '', departments: 1, employees: 10 });
    }
    setCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim()) return;
    try {
      if (editingCompany) {
        const { error } = await supabase.from('companies').update({
          name: companyForm.name.trim(),
          code: companyForm.code.toUpperCase().trim() || 'COMP',
          departments: Number(companyForm.departments),
          employees: Number(companyForm.employees),
        }).eq('id', editingCompany.id);
        if (error) throw error;
        showFeedback(`Company "${companyForm.name}" updated!`);
      } else {
        const { error } = await supabase.from('companies').insert([{
          name: companyForm.name.trim(),
          code: companyForm.code.toUpperCase().trim() || 'COMP',
          departments: Number(companyForm.departments),
          employees: Number(companyForm.employees),
        }]);
        if (error) throw error;
        showFeedback(`Company "${companyForm.name}" added!`);
      }
      setCompanyModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    }
  };

  // ── Department Handlers ──────────────────────────────────────────────────────
  const openDeptModal = (d?: DepartmentItem) => {
    if (d) {
      setEditingDept(d);
      setDeptForm({ name: d.name, code: d.code });
    } else {
      setEditingDept(null);
      setDeptForm({ name: '', code: '' });
    }
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    try {
      if (editingDept) {
        const { error } = await supabase.from('departments').update({
          name: deptForm.name.trim(),
          code: deptForm.code.toUpperCase().trim() || 'DEPT',
        }).eq('id', editingDept.id);
        if (error) throw error;
        showFeedback(`Department "${deptForm.name}" updated!`);
      } else {
        const { error } = await supabase.from('departments').insert([{
          name: deptForm.name.trim(),
          code: deptForm.code.toUpperCase().trim() || 'DEPT',
        }]);
        if (error) throw error;
        showFeedback(`Department "${deptForm.name}" added!`);
      }
      setDeptModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`);
    }
  };

  // ── Delete Handler ────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, name } = deleteConfirm;
    try {
      if (type === 'category') {
        await supabase.from('csl_request_categories').delete().eq('id', id);
        setCategories(categories.filter(c => c.id !== id));
      }
      if (type === 'user') {
        let { error } = await supabaseAdmin.from('user_accounts').delete().eq('id', id);
        if (error) {
          const fallback = await supabase.from('user_accounts').delete().eq('id', id);
          if (fallback.error) throw fallback.error;
        }
        try {
          await supabaseAdmin.auth.admin.deleteUser(id.toString());
        } catch (authErr) {
          console.warn('Could not delete auth user:', authErr);
        }
        setUsers(users.filter(u => u.id !== id));
      }
      if (type === 'company') {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw error;
        setCompanies(companies.filter(co => co.id !== id));
      }
      if (type === 'department') {
        const { error } = await supabase.from('departments').delete().eq('id', id);
        if (error) throw error;
        setDepartments(departments.filter(d => d.id !== id));
      }
      showFeedback(`"${name}" berhasil dihapus.`);
    } catch (err: any) {
      showFeedback(`Gagal menghapus: ${err.message || 'Error occurred'}`);
    }
    setDeleteConfirm(null);
  };

  // ── Render Feedback Toast ──────────────────────────────────────────────────
  const feedbackBanner = feedbackMessage && (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
      <Check className="h-4 w-4 text-emerald-400" />
      <span>{feedbackMessage}</span>
    </div>
  );

  // ── Request Categories View ────────────────────────────────────────────────
  if (view === 'categories') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Request Categories" description="Manage request types, codes, SLA targets, and configurations">
          <div className="flex items-center gap-2">
            <Button onClick={() => openCategoryModal()} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
              <Plus className="h-4 w-4 mr-1.5" /> Add Category
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </PageHeader>

        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {['Code', 'Name', 'SLA (Days)', 'Description', 'Actions'].map(h => (
                  <TableHead key={h} className="text-sm font-semibold text-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(cat => (
                <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">{cat.code}</TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{cat.name}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 rounded-md px-2.5 py-1">
                      {cat.sla_days} business days
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{cat.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button onClick={() => openCategoryModal(cat)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil size={14} />
                      </Button>
                      <Button onClick={() => setDeleteConfirm({ type: 'category', id: cat.id, name: cat.name })} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Category Modal */}
        <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Tag size={18} />
                <span className="text-sm font-semibold">Category Config</span>
              </div>
              <DialogTitle className="text-xl font-black">{editingCategory ? 'Edit Category' : 'Add Request Category'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Code *</label>
                  <Input required placeholder="AGR" value={catForm.code} onChange={e => setCatForm({...catForm, code: e.target.value})} className="h-10 text-sm font-mono uppercase bg-muted/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Category Name *</label>
                  <Input required placeholder="Agreement Review" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="h-10 text-sm bg-muted/30" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">SLA Target (Business Days) *</label>
                <Input type="number" min={1} max={90} required value={catForm.sla_days} onChange={e => setCatForm({...catForm, sla_days: Number(e.target.value)})} className="h-10 text-sm bg-muted/30" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Description</label>
                <textarea rows={3} placeholder="Description..." value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} className="w-full p-3 text-xs bg-muted/30 border border-border/30 rounded-xl font-medium resize-none" />
              </div>

              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setCatModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">Save Category</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── SLA Configuration View ─────────────────────────────────────────────────
  if (view === 'sla') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="SLA Configuration" description="Configure default business day SLA targets for request types">
          <Button variant="outline" size="sm" onClick={fetchData} className="text-xs font-bold">
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </PageHeader>

        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {['Category', 'Current SLA (Days)', 'Escalation Policy'].map(h => (
                  <TableHead key={h} className="text-sm font-semibold text-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, idx) => (
                <TableRow key={cat.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-indigo-600" />
                      <span className="text-sm font-bold text-foreground">{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        value={cat.sla_days} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCategories(categories.map((c, i) => i === idx ? { ...c, sla_days: val } : c));
                        }}
                        className="w-24 h-9 text-center font-mono font-bold text-sm bg-muted/30" 
                      />
                      <span className="text-xs text-muted-foreground font-semibold">business days</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground font-medium">Auto-escalate to CSL Lead on SLA breach</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 bg-muted/20 border-t border-border/20 flex justify-end">
            <Button onClick={() => showFeedback('SLA Configuration saved successfully!')} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              <Save size={14} className="mr-1.5" /> Save SLA Changes
            </Button>
          </div>
        </div>
      </div>
    );
  }



  // ── Users & Roles & Permissions View ──────────────────────────────────────
  if (view === 'users') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Users & Menu Access Permissions" description="Manage user accounts, system roles, and menu access rights for each user">
          <Button onClick={() => openUserModal()} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Add User Account
          </Button>
        </PageHeader>

        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {['User Name', 'Email', 'Role', 'Access Scope', 'Actions'].map(h => (
                  <TableHead key={h} className="text-sm font-semibold text-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-bold text-foreground">{u.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => openPermissionsModal(u)} variant="outline" size="sm" className="h-7 text-[11px] font-bold rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                      <ShieldCheck size={13} className="mr-1" /> Configure Permissions
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button onClick={() => openUserModal(u)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil size={14} />
                      </Button>
                      <Button onClick={() => setDeleteConfirm({ type: 'user', id: u.id, name: u.name })} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Basic Info Modal */}
        <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Users size={18} />
                <span className="text-sm font-semibold">User Account</span>
              </div>
              <DialogTitle className="text-xl font-black">{editingUser ? 'Edit User Account' : 'Add New User Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Full Name *</label>
                <Input required placeholder="Budi Santoso" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="h-10 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">Email Address *</label>
                <Input type="email" required placeholder="budi@gesit.co.id" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="h-10 text-sm bg-muted/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-foreground mb-1 block">
                  {editingUser ? 'New Password (Biarkan kosong jika tidak diubah)' : 'Set Password (Opsional)'}
                </label>
                <div className="relative">
                  <Input
                    type={showUserPassword ? "text" : "password"}
                    placeholder={editingUser ? "Password baru..." : "Password untuk login akun"}
                    value={userForm.password}
                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                    className="h-10 text-sm bg-muted/30 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                              <label className="text-[11px] font-bold text-foreground mb-1 block">Primary System Role *</label>
                              <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold">
                                <option value="Super Admin">Super Admin (Kelola Seluruh Sistem)</option>
                                <option value="Admin">Admin (Approve & Edit, Tanpa Hapus)</option>
                                <option value="Staff">Staff (Mengerjakan Request & Membuat)</option>
                                <option value="User">User (Hanya Request CSL)</option>
                              </select>
                            </div>
                            {/* ── Employment Info ── */}
                            <div className="rounded-2xl border border-border/40 p-4 bg-muted/20 space-y-3">
                              <label className="text-[11px] font-bold text-foreground block">Employment Info (diisi HR)</label>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">ID Employee</label>
                                  <Input placeholder="EMP-0001" value={userForm.employeeCode} onChange={e => setUserForm({...userForm, employeeCode: e.target.value})} className="h-9 text-sm bg-muted/30" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Job Title</label>
                                  <Input placeholder="IT Specialist" value={userForm.jobTitle} onChange={e => setUserForm({...userForm, jobTitle: e.target.value})} className="h-9 text-sm bg-muted/30" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Company</label>
                                  <Input placeholder="GESIT" value={userForm.company} onChange={e => setUserForm({...userForm, company: e.target.value})} className="h-9 text-sm bg-muted/30" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Department</label>
                                  <Input placeholder="IT" value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})} className="h-9 text-sm bg-muted/30" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Job Level</label>
                                  <select value={userForm.jobLevel} onChange={e => setUserForm({...userForm, jobLevel: e.target.value})} className="w-full h-9 px-2 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold">
                                    <option value="Staff">Staff</option>
                                    <option value="Senior Staff">Senior Staff</option>
                                    <option value="Supervisor">Supervisor</option>
                                    <option value="Manager">Manager</option>
                                    <option value="VP">VP</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Join Date</label>
                                  <Input type="date" value={userForm.joinDate} onChange={e => setUserForm({...userForm, joinDate: e.target.value})} className="h-9 text-sm bg-muted/30" />
                                </div>
                              </div>
                            </div>
              {/* ── E-Sign Section ── */}
              <div className="rounded-2xl border-2 border-dashed border-border/60 p-4 bg-muted/20 space-y-3">
                <label className="text-[11px] font-bold text-foreground block">Digital Signature (E-Sign)</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-16 rounded-lg border border-border/40 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                    {userForm.eSignUrl ? (
                      <img src={userForm.eSignUrl} alt="E-Signature" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <PenTool size={18} />
                        <span className="text-xs font-medium uppercase">No Sign</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-border/40 rounded-lg text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:bg-muted/40 transition-all">
                      {isUploadingESign ? <Loader2 size={13} className="animate-spin" /> : <PenTool size={13} />}
                      {isUploadingESign ? 'Uploading...' : 'Upload Signature'}
                      <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={handleESignUpload} disabled={isUploadingESign} />
                    </label>
                    {userForm.eSignUrl && (
                      <button type="button" onClick={() => setUserForm(prev => ({ ...prev, eSignUrl: '' }))} className="text-[10px] font-bold text-rose-500 hover:underline text-left">Remove</button>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setUserModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="submit" disabled={isUserSaving} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                  {isUserSaving ? 'Saving...' : 'Save Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 🛡️ MENU PERMISSIONS MATRIX MODAL */}
        <Dialog open={!!permUser} onOpenChange={() => setPermUser(null)}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <ShieldCheck size={20} />
                <span className="text-sm font-semibold text-indigo-600">Access Control Matrix</span>
              </div>
              <DialogTitle className="text-xl font-black text-foreground">Menu Permissions - {permUser?.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Grant or revoke menu access rights specifically for account <strong className="text-foreground">{permUser?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Role Preset Shortcut */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-foreground block">Apply Quick Preset by Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button type="button" onClick={() => applyPreset('super_admin')} className="text-[10px] font-extrabold uppercase py-2 px-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center justify-center gap-1">
                    <Crown size={12} className="text-purple-600" /> Super Admin
                  </button>
                  <button type="button" onClick={() => applyPreset('admin')} className="text-[10px] font-extrabold uppercase py-2 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-1">
                    <ShieldCheck size={12} className="text-indigo-600" /> Admin
                  </button>
                  <button type="button" onClick={() => applyPreset('staff')} className="text-[10px] font-extrabold uppercase py-2 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-1">
                    <Briefcase size={12} className="text-blue-600" /> Staff
                  </button>
                  <button type="button" onClick={() => applyPreset('user')} className="text-[10px] font-extrabold uppercase py-2 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1">
                    <FileText size={12} className="text-emerald-600" /> User
                  </button>
                </div>
              </div>

              {/* Granular Menu Permission Switches */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Module & Menu Toggles</h4>

                {[
                  { key: 'dashboard', label: 'Dashboard & Quick Metrics', icon: LayoutDashboard, color: 'text-indigo-600', desc: 'Access hero landing page and system overview' },
                  { key: 'requests_view', label: 'Request Management - View Requests', icon: Kanban, color: 'text-blue-600', desc: 'View list of legal requests' },
                  { key: 'requests_create', label: 'Request Management - Submit Request', icon: PlusCircle, color: 'text-blue-600', desc: 'Create new legal service requests' },
                  { key: 'requests_review', label: 'Request Management - Review & Process', icon: CheckCircle2, color: 'text-blue-600', desc: 'Assign staff, update status, and review tickets' },
                  { key: 'routine_view', label: 'Routine Activities - View Monitoring', icon: Calendar, color: 'text-emerald-600', desc: 'Access recurring compliance and tax schedules' },
                  { key: 'routine_manage', label: 'Routine Activities - Create Schedules', icon: Activity, color: 'text-emerald-600', desc: 'Define new routine schedules' },
                  { key: 'budget_view', label: 'Budget & Cost - View Monitoring', icon: Wallet, color: 'text-violet-600', desc: 'View budget allocations and expenditure graphs' },
                  { key: 'budget_approve', label: 'Budget & Cost - Approve & Disburse', icon: Coins, color: 'text-violet-600', desc: 'Approve cost requests and disburse funds' },
                  { key: 'directory_view', label: 'Phone Directory - Access Contacts', icon: Phone, color: 'text-rose-600', desc: 'Search lawyers, vendors, and government agencies' },
                  { key: 'directory_manage', label: 'Phone Directory - Add Contacts', icon: BookUser, color: 'text-rose-600', desc: 'Register new external contacts' },
                  { key: 'reports_view', label: 'Reports & Analytics', icon: BarChart2, color: 'text-teal-600', desc: 'View SLA compliance and team productivity reports' },
                  { key: 'settings_manage', label: 'Settings & User Permissions', icon: Settings, color: 'text-slate-600', desc: 'Configure system categories, SLA, and user access' },
                ].map((item) => {
                  const isChecked = (userPerms as any)[item.key];
                  const ItemIcon = item.icon;
                  return (
                    <div key={item.key} onClick={() => setUserPerms({ ...userPerms, [item.key]: !isChecked })} className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 border border-border/20 rounded-xl cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted/50 border border-border/60 mt-0.5">
                          <ItemIcon className={`h-4 w-4 ${item.color}`} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-indigo-600 ml-2">
                        {isChecked ? <CheckSquare size={20} className="text-indigo-600 fill-indigo-100" /> : <Square size={20} className="text-muted-foreground/40" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setPermUser(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="button" onClick={handleSavePermissions} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">
                  <Save size={14} className="mr-1.5" /> Save User Permissions
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle size={20} />
                <span className="text-sm font-semibold text-red-500">Delete Confirmation</span>
              </div>
              <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This action will delete <strong>{deleteConfirm?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-6 pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
              <Button onClick={handleConfirmDelete} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-9 px-5">Confirm Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Companies View ────────────────────────────────────────────────────────
  if (view === 'companies') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Companies & Entities" description="Manage registered corporate entities and subsidiaries">
          <Button onClick={() => openCompanyModal()} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Add Company
          </Button>
        </PageHeader>

        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {['Company Code', 'Company / Entity Name', 'Departments', 'Employees', 'Actions'].map(h => (
                  <TableHead key={h} className="text-sm font-semibold text-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      {c.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.departments}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.employees}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button onClick={() => openCompanyModal(c)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil size={14} />
                      </Button>
                      <Button onClick={() => setDeleteConfirm({ type: 'company', id: c.id, name: c.name })} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-xs font-semibold text-muted-foreground">
                    No companies or entities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Company Modal */}
        <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Building2 size={18} />
                <span className="text-sm font-semibold">Entity Config</span>
              </div>
              <DialogTitle className="text-xl font-black">{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Code *</label>
                  <Input required placeholder="GESIT" value={companyForm.code} onChange={e => setCompanyForm({...companyForm, code: e.target.value})} className="h-10 text-sm font-mono uppercase bg-muted/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Company Name *</label>
                  <Input required placeholder="PT GESIT Utama" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} className="h-10 text-sm bg-muted/30" />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setCompanyModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">Save Entity</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle size={20} />
                <span className="text-sm font-semibold text-red-500">Delete Confirmation</span>
              </div>
              <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This action will delete <strong>{deleteConfirm?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-6 pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
              <Button onClick={handleConfirmDelete} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-9 px-5">Confirm Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Departments View ───────────────────────────────────────────────────────
  if (view === 'departments') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
        {feedbackBanner}
        <PageHeader title="Departments" description="Manage organizational departments and divisions">
          <Button onClick={() => openDeptModal()} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Add Department
          </Button>
        </PageHeader>

        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {['Dept Code', 'Department Name', 'Members', 'Actions'].map(h => (
                  <TableHead key={h} className="text-sm font-semibold text-foreground">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(d => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      {d.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{d.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.employees}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button onClick={() => openDeptModal(d)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil size={14} />
                      </Button>
                      <Button onClick={() => setDeleteConfirm({ type: 'department', id: d.id, name: d.name })} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-xs font-semibold text-muted-foreground">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Department Modal */}
        <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Network size={18} />
                <span className="text-sm font-semibold">Department Config</span>
              </div>
              <DialogTitle className="text-xl font-black">{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveDept} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Code *</label>
                  <Input required placeholder="HR" value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})} className="h-10 text-sm font-mono uppercase bg-muted/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-foreground mb-1 block">Department Name *</label>
                  <Input required placeholder="Human Resources" value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} className="h-10 text-sm bg-muted/30" />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setDeptModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-5">Save Department</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle size={20} />
                <span className="text-sm font-semibold text-red-500">Delete Confirmation</span>
              </div>
              <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This action will delete <strong>{deleteConfirm?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-6 pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
              <Button onClick={handleConfirmDelete} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-9 px-5">Confirm Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── System Settings View (includes Notifications) ────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      {feedbackBanner}
      <PageHeader title="System Settings" description="Global configuration, notification preferences, and maintenance" />

      <div className="space-y-6">
        {/* General Info */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2"><Settings size={18} className="text-indigo-600" /> General Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Application Name</label>
              <Input defaultValue="CSL-LINK" className="h-10 text-sm bg-muted/30 font-bold" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-foreground mb-1 block">Default Language</label>
              <select className="w-full h-10 px-3 text-sm bg-muted/30 border border-border/30 rounded-xl font-semibold">
                <option>Bahasa Indonesia</option>
                <option>English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings — embedded */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2"><Bell size={18} className="text-indigo-600" /> Notification Settings</h3>
          <p className="text-xs text-muted-foreground">Configure email alerts and system notification preferences.</p>
          <div className="space-y-1">
            {[
              { label: 'Email notifikasi saat request baru masuk', defaultOn: true },
              { label: 'Email alert saat request ditugaskan ke staff legal', defaultOn: true },
              { label: 'Email update saat status request berubah', defaultOn: true },
              { label: 'Peringatan SLA breach (1 hari kerja sebelum deadline)', defaultOn: true },
              { label: 'Notifikasi in-app untuk tugas urgent', defaultOn: false },
              { label: 'Laporan ringkasan aktivitas mingguan', defaultOn: false },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                <div className="flex items-center gap-3">
                  <Bell size={14} className="text-indigo-600 shrink-0" />
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={item.defaultOn} className="sr-only peer" />
                  <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Routing & Approvers Configuration */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-indigo-600">
            <ShieldCheck size={20} />
            <h3 className="text-base font-bold text-foreground">Designated Single Approver Configuration</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Pilih <strong>1 orang Approver utama</strong> untuk masing-masing modul. Notifikasi email persetujuan hanya akan dikirimkan kepada 1 approver yang dipilih. Pengaturan ini akan tersimpan global di Supabase database.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Expenses Approval Approver */}
            <div className="border border-border/60 rounded-2xl p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Wallet size={16} />
                  <h4 className="text-xs font-bold text-foreground">Expenses Approval Approver</h4>
                </div>
                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                  1 Approver Selected
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pilih 1 orang yang menerima email & menyetujui Expenses Approval (Biaya Operasional).
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto pt-1">
                {users.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Loading users...</p>
                ) : (
                  users.filter(u => u.role?.toLowerCase().includes('admin')).map(u => {
                    const isSelected = expenseApprover === u.email;
                    return (
                      <label key={`exp-${u.id}`} className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-card border-border/30 hover:border-indigo-300'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email} • <span className="font-semibold text-indigo-600">{u.role}</span></p>
                        </div>
                        <input
                          type="radio"
                          name="expense_approver_radio"
                          checked={isSelected}
                          onChange={() => setExpenseApprover(u.email)}
                          className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Offshore Invoice Payment Approver */}
            <div className="border border-border/60 rounded-2xl p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                  <Briefcase size={16} />
                  <h4 className="text-xs font-bold text-foreground">Offshore Invoice Approver</h4>
                </div>
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                  1 Approver Selected
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pilih 1 orang yang menerima email & menyetujui Offshore Invoice Payment (Luar Negeri).
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto pt-1">
                {users.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Loading users...</p>
                ) : (
                  users.filter(u => u.role?.toLowerCase().includes('admin')).map(u => {
                    const isSelected = offshoreApprover === u.email;
                    return (
                      <label key={`off-${u.id}`} className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-50/70 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800' : 'bg-card border-border/30 hover:border-indigo-300'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email} • <span className="font-semibold text-indigo-600">{u.role}</span></p>
                        </div>
                        <input
                          type="radio"
                          name="offshore_approver_radio"
                          checked={isSelected}
                          onChange={() => setOffshoreApprover(u.email)}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveApprovers} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 px-6 shadow-md">
            <Save size={14} className="mr-1.5" /> Simpan Pengaturan
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md font-sans border border-border/60 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle size={20} />
              <span className="text-sm font-semibold text-red-500">Delete Confirmation</span>
            </div>
            <DialogTitle className="text-xl font-black">Are you sure?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              This action will delete <strong>{deleteConfirm?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="p-6 pt-4 border-t border-border/30 gap-2 flex sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} className="text-xs font-bold rounded-xl h-9">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-9 px-5">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
