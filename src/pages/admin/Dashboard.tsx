import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import type { Submission, AuditLog, Profile } from '@/lib/types';
import {
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalSubmissions: number;
  newSubmissions: number;
  inProgressSubmissions: number;
  resolvedSubmissions: number;
  victimReports: number;
  volunteerApplications: number;
}

const statusStyles: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700 border-blue-200',
  'In-Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  Resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Accepted: 'bg-teal-100 text-teal-700 border-teal-200',
};

export default function Dashboard() {
  const { profile, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSubmissions: 0,
    newSubmissions: 0,
    inProgressSubmissions: 0,
    resolvedSubmissions: 0,
    victimReports: 0,
    volunteerApplications: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [recentLogs, setRecentLogs] = useState<(AuditLog & { admin_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        let submissionQuery = supabase.from('submissions').select('*');
        if (hasRole(['Regional Head', 'University President']) && !hasRole(['President'])) {
          submissionQuery = submissionQuery.eq('region', profile?.residence_district ?? '');
        }
        const { data: submissions } = await submissionQuery;
        const allSubmissions = submissions || [];

        setStats({
          totalUsers: userCount || 0,
          totalSubmissions: allSubmissions.length,
          newSubmissions: allSubmissions.filter((s) => s.status === 'New').length,
          inProgressSubmissions: allSubmissions.filter((s) => s.status === 'In-Progress').length,
          resolvedSubmissions: allSubmissions.filter((s) => s.status === 'Resolved').length,
          victimReports: allSubmissions.filter((s) => s.type === 'victim_report').length,
          volunteerApplications: allSubmissions.filter((s) => s.type === 'volunteer_application').length,
        });

        let recentQuery = supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (hasRole(['Regional Head', 'University President']) && !hasRole(['President'])) {
          recentQuery = recentQuery.eq('region', profile?.residence_district ?? '');
        }
        const { data: recent } = await recentQuery;
        setRecentSubmissions((recent as Submission[]) || []);

        if (hasRole(['President'])) {
          const { data: logs } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          if (logs && logs.length > 0) {
            const adminIds = [...new Set(logs.map((l: AuditLog) => l.admin_id))];
            const { data: admins } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', adminIds);

            const adminMap = new Map(
              (admins || []).map((a: Pick<Profile, 'id' | 'full_name'>) => [a.id, a.full_name])
            );

            setRecentLogs(
              logs.map((l: AuditLog) => ({ ...l, admin_name: adminMap.get(l.admin_id) || 'Unknown' }))
            );
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile, hasRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const resolutionRate = stats.totalSubmissions > 0
    ? Math.round((stats.resolvedSubmissions / stats.totalSubmissions) * 100)
    : 0;

  const statCards = [
    {
      label: 'Total Members',
      value: stats.totalUsers,
      icon: Users,
      sub: 'Active social engineers',
      color: 'text-primary',
      bg: 'bg-primary/8',
      border: 'border-primary/20',
    },
    {
      label: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: FileText,
      sub: `${stats.victimReports} reports · ${stats.volunteerApplications} applications`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'New / Pending',
      value: stats.newSubmissions,
      icon: AlertTriangle,
      sub: `${stats.inProgressSubmissions} in progress`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Resolution Rate',
      value: `${resolutionRate}%`,
      icon: TrendingUp,
      sub: `${stats.resolvedSubmissions} resolved`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Command Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Real-time snapshot of the Aawaaj Movement</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl border ${card.border} bg-white p-6 shadow-sm transition-shadow hover:shadow-md`}
          >
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Submissions */}
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Submissions</h3>
              <p className="text-xs text-muted-foreground">Latest 5 entries</p>
            </div>
          </div>
          <div className="p-4">
            {recentSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{sub.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.type === 'victim_report' ? '🛡️ Victim Report' : '🙋 Volunteer Application'}
                        {' · '}
                        {formatDateTime(sub.created_at)}
                      </p>
                    </div>
                    <Badge className={`ml-3 shrink-0 border text-xs font-medium ${statusStyles[sub.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`} variant="outline">
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        {hasRole(['President']) && (
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
                <p className="text-xs text-muted-foreground">Latest admin actions</p>
              </div>
            </div>
            <div className="p-4">
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-sm font-medium capitalize text-foreground">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by <span className="font-medium text-primary">{log.admin_name}</span>
                        {' · '}
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Placeholder if not President */}
        {!hasRole(['President']) && (
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Status Summary</h3>
                <p className="text-xs text-muted-foreground">Submission breakdown</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'New', count: stats.newSubmissions, color: 'bg-blue-500' },
                { label: 'In Progress', count: stats.inProgressSubmissions, color: 'bg-amber-500' },
                { label: 'Resolved', count: stats.resolvedSubmissions, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.label}</span>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full ${item.color} transition-all`}
                      style={{ width: stats.totalSubmissions > 0 ? `${(item.count / stats.totalSubmissions) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
