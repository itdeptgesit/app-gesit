import React, { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, LayoutDashboard, ListTodo, Users, UserRoundPlus, ArrowUpRight, ChevronRight, PieChart, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface HRDashboardProps {
  currentUser?: any;
}

const card = 'rounded-2xl border border-[#e7e5e2] bg-white';

export const HRDashboard: React.FC<HRDashboardProps> = ({ currentUser }) => {
  const [employeeCount, setEmployeeCount] = useState(0);
  const [holidayCount, setHolidayCount] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState({ present: 0, late: 0, absent: 0 });
  const [employmentMix, setEmploymentMix] = useState<Record<string, number>>({});
  const [departmentMix, setDepartmentMix] = useState<Array<{ name: string; count: number }>>([]);
  const [lifecycleMix, setLifecycleMix] = useState<Record<string, number>>({});
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [employeesResult, holidaysResult, leaveResult, attendanceResult] = await Promise.allSettled([
        supabase.from('user_accounts').select('id, full_name, nickname, email, department, job_title, employment_type, status, employment_status, employee_code, company').order('full_name'),
        supabase.from('company_holidays').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('attendance_records').select('status').eq('date', today),
      ]);
      if (!mounted) return;
      const employees = employeesResult.status === 'fulfilled' ? employeesResult.value : { data: [], error: employeesResult.reason };
      const holidays = holidaysResult.status === 'fulfilled' ? holidaysResult.value : { count: 0, error: holidaysResult.reason };
      const leave = leaveResult.status === 'fulfilled' ? leaveResult.value : { count: 0, error: leaveResult.reason };
      const attendance = attendanceResult.status === 'fulfilled' ? attendanceResult.value : { data: [], error: attendanceResult.reason };
      if (employees.error) console.error('[HR Dashboard] user_accounts:', employees.error);
      if (holidays.error) console.error('[HR Dashboard] company_holidays:', holidays.error);
      if (leave.error) console.error('[HR Dashboard] leave_requests:', leave.error);
      if (attendance.error) console.error('[HR Dashboard] attendance_records:', attendance.error);
      const employeeRows = employees.data || [];
      const activeEmployeeRows = employeeRows.filter((row: any) => String(row.employment_status || row.status || 'Active').toLowerCase() === 'active');
      const activeCount = activeEmployeeRows.length || employeeRows.length;
      setEmployees(employeeRows.slice(0, 8));
      setEmployeeCount(activeCount);
      setHolidayCount(holidays.count || 0);
      setPendingLeave(leave.count || 0);
      const mix: Record<string, number> = {};
      const departments: Record<string, number> = {};
      const lifecycle: Record<string, number> = {};
      employeeRows.forEach((row: any) => { const type = row.employment_type || 'Belum diisi'; mix[type] = (mix[type] || 0) + 1; const department = row.department || 'Belum diisi'; departments[department] = (departments[department] || 0) + 1; const status = row.employment_status || row.status || 'Active'; lifecycle[status] = (lifecycle[status] || 0) + 1; });
      setEmploymentMix(mix);
      setLifecycleMix(lifecycle);
      setDepartmentMix(Object.entries(departments).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6));
      const attendanceMix = { present: 0, late: 0, absent: 0 };
      (attendance.data || []).forEach((row: any) => { if (row.status === 'late') attendanceMix.late += 1; else if (row.status === 'absent') attendanceMix.absent += 1; else attendanceMix.present += 1; });
      attendanceMix.absent = Math.max(attendanceMix.absent, activeCount - attendanceMix.present - attendanceMix.late);
      setAttendanceToday(attendanceMix);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredEmployees = employees.filter((employee) => {
    const haystack = [employee.full_name, employee.nickname, employee.email, employee.department, employee.job_title, employee.employee_code].join(' ').toLowerCase();
    return haystack.includes(employeeSearch.toLowerCase()) && (employeeStatus === 'all' || String(employee.status || '').toLowerCase() === employeeStatus);
  });

  const month = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
  const stats = [
    { label: 'Total Employee', value: employeeCount, note: 'Active workforce', icon: Users, color: 'bg-[#f3eee8] text-[#6e6354]' },
    { label: 'Pending Approval', value: pendingLeave, note: 'Need HR review', icon: ListTodo, color: 'bg-[#fff0e8] text-[#976954]' },
    { label: 'Company Holidays', value: holidayCount, note: 'Configured dates', icon: CalendarDays, color: 'bg-[#e8f8ef] text-[#2b8454]' },
    { label: 'Attendance Today', value: attendanceToday.present + attendanceToday.late, note: `${attendanceToday.present} hadir · ${attendanceToday.late} terlambat`, icon: CheckCircle2, color: 'bg-[#f0e9ff] text-[#7350b5]' },
  ];

  return (
    <div className="min-h-full bg-[#f8f7f7] p-4 text-[#0b0b0b] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#976954]"><span className="rounded-full bg-[#0b0b0b] px-2 py-1 text-[10px] tracking-[0.12em] text-white">HR WORKSPACE</span><LayoutDashboard size={15} /> Human Resources</div>
            <h1 className="text-3xl font-medium tracking-[-0.05em] sm:text-4xl">Good morning, {currentUser?.fullName?.split(' ')[0] || 'HR Team'}</h1>
            <p className="mt-2 text-sm text-[#6e6354]">People, policy, and workforce operations at a glance.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e7e5e2] bg-white px-3 py-2 text-sm text-[#6e6354]"><Clock3 size={15} /> {month}</div>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map(({ label, value, note, icon: Icon, color }) => <div className={`${card} p-4 sm:p-5`} key={label}><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></span><ArrowUpRight size={16} className="text-[#b5aca4]" /></div><div className="mt-6 text-3xl font-medium tracking-[-0.05em]">{loading ? '…' : value}</div><div className="mt-1 text-sm font-semibold">{label}</div><div className="mt-1 text-xs text-[#8d837b]">{note}</div></div>)}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className={`${card} p-5 sm:p-6`}><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Karyawan per Departemen</h2><p className="mt-1 text-xs text-[#8d837b]">Distribusi employee aktif berdasarkan organisasi</p></div><BarChart3 size={19} className="text-[#976954]" /></div><div className="mt-6 space-y-4">{departmentMix.length ? departmentMix.map((item) => { const max = departmentMix[0].count || 1; return <div key={item.name}><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-[#4f4842]">{item.name}</span><span className="text-[#8d837b]">{item.count}</span></div><div className="h-2 rounded-full bg-[#f0ece8]"><div className="h-2 rounded-full bg-[#976954] transition-all" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} /></div></div> }) : <p className="py-8 text-center text-sm text-[#8d837b]">Belum ada data departemen.</p>}</div></div>
          <div className={`${card} p-5 sm:p-6`}><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Komposisi Employment</h2><p className="mt-1 text-xs text-[#8d837b]">Jenis status kerja employee</p></div><PieChart size={19} className="text-[#2b8454]" /></div><div className="mt-5 flex items-center gap-5"><div className="h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(#976954 0deg ${((employmentMix['Permanent'] || 0) / Math.max(1, employeeCount)) * 360}deg, #2b8454 ${((employmentMix['Permanent'] || 0) / Math.max(1, employeeCount)) * 360}deg ${(((employmentMix['Permanent'] || 0) + (employmentMix['Contract'] || 0)) / Math.max(1, employeeCount)) * 360}deg, #7350b5 ${(((employmentMix['Permanent'] || 0) + (employmentMix['Contract'] || 0)) / Math.max(1, employeeCount)) * 360}deg 360deg)` }}><div className="m-3 flex h-[calc(100%-24px)] items-center justify-center rounded-full bg-white text-center"><div><p className="text-2xl font-semibold">{employeeCount}</p><p className="text-[10px] text-[#8d837b]">employee</p></div></div></div><div className="space-y-3 text-xs">{[['Permanent','#976954'],['Contract','#2b8454'],['Lainnya','#7350b5']].map(([label,color]) => <div className="flex items-center gap-2" key={label}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-[#6e6354]">{label}</span><strong>{label === 'Lainnya' ? Object.entries(employmentMix).filter(([key]) => !['Permanent','Contract'].includes(key)).reduce((sum, [, value]) => sum + value, 0) : employmentMix[label] || 0}</strong></div>)}</div></div></div>
        </section>
        <section className={`${card} p-5 sm:p-6`}><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Attendance Today</h2><p className="mt-1 text-xs text-[#8d837b]">Status attendance tercatat hari ini</p></div><a href="/attendance" className="text-xs font-semibold text-[#976954]">Buka report</a></div><div className="mt-5 grid grid-cols-3 gap-3">{[['Hadir',attendanceToday.present,'bg-[#e8f8ef] text-[#2b8454]'],['Terlambat',attendanceToday.late,'bg-[#fff0e8] text-[#976954]'],['Tidak hadir',attendanceToday.absent,'bg-[#f0e9ff] text-[#7350b5]']].map(([label,value,color]) => <div className={`rounded-xl p-4 ${color}`} key={label as string}><p className="text-xs font-medium">{label}</p><p className="mt-2 text-2xl font-semibold">{loading ? '…' : value}</p></div>)}</div></section>

        <section className={`${card} p-5 sm:p-6`}><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Lifecycle Karyawan</h2><p className="mt-1 text-xs text-[#8d837b]">Employee tetap tersimpan untuk histori HR</p></div><Users size={19} className="text-[#7350b5]" /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Active','bg-[#e8f8ef] text-[#2b8454]'],['On Leave','bg-[#f0e9ff] text-[#7350b5]'],['Resigned','bg-[#fff0e8] text-[#976954]'],['Terminated','bg-slate-100 text-slate-600']].map(([label,color]) => <div className={`rounded-xl p-4 ${color}`} key={label}><p className="text-xs font-medium">{label}</p><p className="mt-2 text-2xl font-semibold">{loading ? '…' : lifecycleMix[label] || 0}</p></div>)}</div><p className="mt-4 text-xs text-[#8d837b]">Resign dan terminated tidak menghapus employee, attendance, cuti, payroll, atau histori transfer.</p></section>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className={`${card} p-5 sm:p-6`}><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold tracking-[-0.02em]">HR workspace</h2><p className="mt-1 text-sm text-[#8d837b]">Manage your people operations from one place.</p></div><span className="rounded-full bg-[#e8f8ef] px-3 py-1 text-xs font-semibold text-[#2b8454]">Live</span></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><a href="/employee-data" className="rounded-xl border border-[#e7e5e2] p-4 transition-colors hover:bg-[#f8f7f7]"><UserRoundPlus size={19} className="text-[#976954]" /><div className="mt-8 text-sm font-semibold">Employee Data</div><div className="mt-1 text-xs text-[#8d837b]">Profiles and employment</div></a><a href="/calendar" className="rounded-xl border border-[#e7e5e2] p-4 transition-colors hover:bg-[#f8f7f7]"><CalendarDays size={19} className="text-[#2b8454]" /><div className="mt-8 text-sm font-semibold">Company Calendar</div><div className="mt-1 text-xs text-[#8d837b]">Holidays and shared leave</div></a><a href="/attendance" className="rounded-xl border border-[#e7e5e2] p-4 transition-colors hover:bg-[#f8f7f7]"><CheckCircle2 size={19} className="text-[#7350b5]" /><div className="mt-8 text-sm font-semibold">Attendance</div><div className="mt-1 text-xs text-[#8d837b]">Daily workforce status</div></a></div></div>
          <div className={`${card} p-5 sm:p-6`}><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Quick actions</h2><p className="mt-1 text-xs text-[#8d837b]">Common HR tasks</p></div><ListTodo size={19} className="text-[#976954]" /></div><div className="mt-5 divide-y divide-[#eeeae6]">{['Add employee', 'Review leave requests', 'Configure company holiday'].map((item, index) => <a href={index === 0 ? '/employee-data' : index === 1 ? '/attendance-request' : '/calendar'} key={item} className="flex items-center justify-between py-3 text-sm font-medium hover:text-[#976954]"><span>{item}</span><ChevronRight size={16} className="text-[#b5aca4]" /></a>)}</div></div>
        </section>

        <section className={`${card} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeae6] p-5"><div><h2 className="text-lg font-semibold">Employee directory</h2><p className="mt-1 text-xs text-[#8d837b]">Search and review workforce records</p></div><a href="/employee-data" className="flex items-center gap-1 rounded-lg bg-[#0b0b0b] px-3 py-2 text-xs font-medium text-white">Manage employees <ArrowUpRight size={14} /></a></div>
          <div className="flex flex-wrap gap-2 border-b border-[#eeeae6] p-4"><input value={employeeSearch} onChange={event => setEmployeeSearch(event.target.value)} placeholder="Search name, email, department..." className="min-w-[240px] flex-1 rounded-lg border border-[#e7e5e2] bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#976954]" /><select value={employeeStatus} onChange={event => setEmployeeStatus(event.target.value)} className="rounded-lg border border-[#e7e5e2] bg-white px-3 py-2 text-sm"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#fafafa] text-[11px] uppercase tracking-wider text-[#8d837b]"><tr><th className="px-5 py-3 font-medium">Employee</th><th className="px-5 py-3 font-medium">Department</th><th className="px-5 py-3 font-medium">Position</th><th className="px-5 py-3 font-medium">Employment</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-[#eeeae6]">{filteredEmployees.map(employee => <tr key={employee.id} className="hover:bg-[#fcfbfa]"><td className="px-5 py-3"><div className="font-medium">{employee.nickname || employee.full_name || '—'}</div><div className="text-xs text-[#8d837b]">{employee.nickname && employee.full_name && employee.nickname !== employee.full_name ? `${employee.full_name} · ` : ''}{employee.email || '—'}</div></td><td className="px-5 py-3 text-[#6e6354]">{employee.department || '—'}</td><td className="px-5 py-3 text-[#6e6354]">{employee.job_title || '—'}</td><td className="px-5 py-3 text-[#6e6354]">{employee.employment_type || '—'}</td><td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${String(employee.status).toLowerCase() === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-[#e8f8ef] text-[#2b8454]'}`}>{employee.status || 'Active'}</span></td><td className="px-5 py-3 text-right"><a href="/employee-data" className="text-xs font-semibold text-[#976954]">View</a></td></tr>)}{filteredEmployees.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#8d837b]">No employee records found</td></tr>}</tbody></table></div>
        </section>

        <section className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b border-[#eeeae6] p-5"><div><h2 className="text-lg font-semibold">People operations</h2><p className="mt-1 text-xs text-[#8d837b]">HR modules and current workflow</p></div><a href="/employee-data" className="flex items-center gap-1 text-xs font-semibold text-[#976954]">View employee data <ArrowUpRight size={14} /></a></div><div className="grid divide-y divide-[#eeeae6] sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-5"><p className="text-xs text-[#8d837b]">Workforce</p><p className="mt-2 text-2xl font-medium">{employeeCount || '—'}</p><p className="mt-1 text-xs text-[#8d837b]">active employee records</p></div><div className="p-5"><p className="text-xs text-[#8d837b]">Policy calendar</p><p className="mt-2 text-2xl font-medium">{holidayCount || '—'}</p><p className="mt-1 text-xs text-[#8d837b]">active company dates</p></div><div className="p-5"><p className="text-xs text-[#8d837b]">Action queue</p><p className="mt-2 text-2xl font-medium">{pendingLeave || '—'}</p><p className="mt-1 text-xs text-[#8d837b]">pending leave requests</p></div></div></section>
      </div>
    </div>
  );
};

export default HRDashboard;
