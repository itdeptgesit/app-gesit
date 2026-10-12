import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { 
  Kanban, 
  Calendar, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  TrendingUp, 
  FileText, 
  ShieldCheck, 
  PhoneCall, 
  ArrowUpRight,
  Globe,
  CheckSquare,
  Layers,
  Sparkles,
  Receipt,
  UserCheck,
  ArrowRight
} from 'lucide-react';

interface CSLDashboardProps {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT:        'border-zinc-500/25 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 font-medium',
  SUBMITTED:    'border-blue-500/25 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-medium',
  PROCESSING:   'border-amber-500/25 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium',
  REVIEW_USER:  'border-purple-500/25 text-purple-700 dark:text-purple-300 bg-purple-500/10 font-medium',
  COMPLETED:    'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  CLOSED:       'border-emerald-500/25 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium',
  REJECTED:     'border-rose-500/25 text-rose-700 dark:text-rose-300 bg-rose-500/10 font-medium',
};

const formatStatus = (s: string) => {
  if (!s) return '';
  if (s === 'REVIEW_USER') return 'Review';
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export const CSLDashboard: React.FC<CSLDashboardProps> = ({ currentUser, onNavigate }) => {
  const firstName = currentUser?.fullName?.split(' ')[0] || 'User';

  const [stats, setStats] = useState({
    activeRequests: 0,
    pendingTasks: 0,
    pendingExpenses: 0,
    pendingOffshore: 0,
    completedRequests: 0,
    totalRequests: 0,
    slaCompliantRequests: 0,
  });

  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    DRAFT: 0, SUBMITTED: 0, PROCESSING: 0, REVIEW_USER: 0, COMPLETED: 0
  });

  const [myActionItems, setMyActionItems] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          { data: requests },
          { data: tasks },
          { data: expenses },
        ] = await Promise.all([
          supabase.from('csl_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('csl_tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('csl_expense_approvals').select('*'),
        ]);

        if (requests) {
          const active = requests.filter(r => !['COMPLETED', 'CLOSED', 'REJECTED'].includes(r.status));
          const completed = requests.filter(r => r.status === 'COMPLETED' || r.status === 'CLOSED');

          // SLA Compliance calculation
          let compliantCount = 0;
          completed.forEach(r => {
            if (r.sla_due_date) {
              if (new Date(r.updated_at || r.created_at) <= new Date(r.sla_due_date)) compliantCount++;
            } else {
              compliantCount++;
            }
          });

          // Status breakdown
          const counts: Record<string, number> = { DRAFT: 0, SUBMITTED: 0, PROCESSING: 0, REVIEW_USER: 0, COMPLETED: 0 };
          requests.forEach(r => {
            if (counts[r.status] !== undefined) counts[r.status]++;
            else if (r.status === 'CLOSED') counts.COMPLETED++;
          });
          setStatusCounts(counts);

          // Action items for current user
          const myId = currentUser?.id ? String(currentUser.id) : '';
          const myName = currentUser?.fullName || '';
          const actionItems = requests.filter(r =>
            !['COMPLETED', 'CLOSED', 'REJECTED'].includes(r.status) &&
            (r.assigned_pic_id === myId || r.assigned_pic_name === myName || (r.status === 'REVIEW_USER' && r.requester_email === currentUser?.email))
          );
          setMyActionItems(actionItems.slice(0, 5));

          setStats(prev => ({
            ...prev,
            activeRequests: active.length,
            completedRequests: completed.length,
            totalRequests: requests.length,
            slaCompliantRequests: compliantCount,
          }));

          setRecentRequests(requests.slice(0, 6));
        }

        if (tasks) {
          const pending = tasks.filter(t => t.status !== 'Completed');
          setStats(prev => ({ ...prev, pendingTasks: pending.length }));
          setUpcomingTasks(pending.slice(0, 4));
        }

        if (expenses) {
          const pendingEx = expenses.filter(e => e.status === 'PENDING_APPROVAL');
          setStats(prev => ({ ...prev, pendingExpenses: pendingEx.length }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const slaPercentage = stats.completedRequests > 0
    ? Math.round((stats.slaCompliantRequests / stats.completedRequests) * 100)
    : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      
      {/* ── Hero Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 md:p-8 shadow-sm">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-32 -bottom-10 h-44 w-44 rounded-full bg-amber-500/5 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-[11px] font-semibold text-foreground tracking-wide uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Corporate Secretary & Legal Platform</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName}!
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Overview of legal requests, compliance routines, document repositories, offshore payments, and expense approvals.
            </p>
          </div>

          <div className="relative shrink-0 flex items-center justify-center md:justify-end">
            <img 
              src="/image/teamwork.png" 
              alt="Teamwork Illustration" 
              className="h-28 md:h-32 lg:h-36 w-auto object-contain drop-shadow-sm select-none pointer-events-none" 
            />
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Requests */}
        <div 
          onClick={() => onNavigate('csl-all-requests')}
          className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Requests</span>
            <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center">
              <Kanban className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground">{stats.activeRequests}</p>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Requests currently in progress</p>
          </div>
        </div>

        {/* Pending Tasks */}
        <div 
          onClick={() => onNavigate('routine-task')}
          className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pending Tasks</span>
            <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground">{stats.pendingTasks}</p>
              <span className="text-xs text-muted-foreground">Tasks</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Routines &amp; agreement obligations</p>
          </div>
        </div>

        {/* Pending Approvals (Expenses & Offshore) */}
        <div 
          onClick={() => onNavigate('budget')}
          className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pending Approvals</span>
            <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground">
                {stats.pendingExpenses + stats.pendingOffshore}
              </p>
              <span className="text-xs text-muted-foreground">Approvals</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.pendingExpenses} Expenses • {stats.pendingOffshore} Offshore
            </p>
          </div>
        </div>

        {/* SLA Compliance */}
        <div 
          onClick={() => onNavigate('reports-request')}
          className="bg-card border border-border/40 p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-border/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">SLA Compliance</span>
            <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold font-mono text-foreground">{slaPercentage}%</p>
              <span className="text-xs text-muted-foreground">Target met</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Completed within SLA timeframe</p>
          </div>
        </div>
      </div>

      {/* ── Quick Access Modules Grid ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Access Modules
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { id: 'csl-requests', label: 'Ticketing & Requests', icon: Kanban, route: 'csl-all-requests', desc: 'Legal intake & SLA' },
            { id: 'routine', label: 'Tasks & Compliance', icon: Calendar, route: 'routine-task', desc: 'Routines & tracking' },
            { id: 'budget-exp', label: 'Budget & Expenses', icon: Receipt, route: 'budget', desc: 'Company & personal expenses' },
            { id: 'directory', label: 'Directory & Reports', icon: TrendingUp, route: 'reports-request', desc: 'Analytics & contacts' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.route)}
                className="flex flex-col items-start p-4 rounded-xl border border-border/60 bg-card hover:border-border hover:bg-muted/40 transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-lg bg-muted/70 flex items-center justify-center text-foreground group-hover:text-primary transition-colors mb-3">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Dashboard Sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols): Status Mini Breakdown & Recent Requests */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Breakdown Mini Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Requests Pipeline by Status</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time status overview of all legal requests</p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {stats.totalRequests} Total
              </Badge>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { status: 'DRAFT', label: 'Draft', count: statusCounts.DRAFT, style: STATUS_STYLE.DRAFT },
                { status: 'SUBMITTED', label: 'Submitted', count: statusCounts.SUBMITTED, style: STATUS_STYLE.SUBMITTED },
                { status: 'PROCESSING', label: 'Processing', count: statusCounts.PROCESSING, style: STATUS_STYLE.PROCESSING },
                { status: 'REVIEW_USER', label: 'Review', count: statusCounts.REVIEW_USER, style: STATUS_STYLE.REVIEW_USER },
                { status: 'COMPLETED', label: 'Completed', count: statusCounts.COMPLETED, style: STATUS_STYLE.COMPLETED },
              ].map((s) => (
                <div 
                  key={s.status} 
                  onClick={() => onNavigate('csl-all-requests')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border ${s.style} cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  <span className="text-xl font-bold font-mono">{s.count}</span>
                  <span className="text-[10px] font-semibold mt-0.5 tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Legal Requests Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Recent Legal Requests</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Latest submitted requests requiring attention</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('csl-all-requests')} 
                className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="divide-y divide-border/40">
              {recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => {
                  const isOverdue = req.sla_due_date && new Date(req.sla_due_date) < new Date() && !['COMPLETED', 'CLOSED', 'REJECTED'].includes(req.status);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigate('csl-all-requests')}
                      className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-foreground">{req.request_number}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                            {req.department || req.company || 'General'}
                          </span>
                          {isOverdue && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-500/30 text-rose-600 bg-rose-500/10 gap-1 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate max-w-md">
                          {req.description || 'No description provided'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          PIC: <span className="font-medium text-foreground/80">{req.assigned_pic_name || 'Unassigned'}</span> • {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Badge variant="outline" className={`text-[11px] px-2.5 py-0.5 rounded-md border ${STATUS_STYLE[req.status] || ''}`}>
                          {formatStatus(req.status)}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No requests recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Action Items & Active Tasks */}
        <div className="space-y-6">
          
          {/* Action Items Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">My Action Items</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks &amp; reviews assigned to you</p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {myActionItems.length}
              </Badge>
            </div>

            <div className="p-4 space-y-2.5">
              {myActionItems.length > 0 ? (
                myActionItems.map((req, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => onNavigate('csl-all-requests')} 
                    className="p-3 rounded-lg bg-muted/40 hover:bg-muted/80 transition-colors border border-border/60 cursor-pointer space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-semibold text-foreground">{req.request_number}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-600 bg-blue-500/10">
                        {req.status === 'REVIEW_USER' ? 'Review Needed' : 'Assigned to You'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{req.description || 'No description'}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground space-y-1">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500/60 mb-2" />
                  <p className="text-xs font-semibold text-foreground">You're all caught up!</p>
                  <p className="text-[11px]">No pending actions assigned to you.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Tasks & Compliance Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Upcoming Tasks</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Compliance &amp; agreement schedules</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onNavigate('routine-task')} 
                className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="p-4 space-y-2.5">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task, idx) => {
                  const isTaskOverdue = task.due_date && new Date(task.due_date) < new Date();
                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigate('routine-task')}
                      className={`p-3 rounded-lg border space-y-1.5 cursor-pointer transition-colors ${
                        isTaskOverdue 
                          ? 'bg-rose-500/5 border-rose-500/25 hover:bg-rose-500/10' 
                          : 'bg-muted/30 border-border/60 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase text-primary tracking-wide">
                              {task.category || 'Routine'}
                            </span>
                            {isTaskOverdue && (
                              <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-foreground truncate mt-0.5">
                            {task.task_name || task.company || 'Unnamed Task'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {task.status || 'Pending'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                        <span>PIC: <strong className="font-medium text-foreground/80">{task.owner || '-'}</strong></span>
                        <span className={isTaskOverdue ? 'text-rose-600 font-semibold' : ''}>
                          {task.due_date || task.finish_date 
                            ? new Date(task.due_date || task.finish_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) 
                            : 'No date'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No upcoming tasks.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
