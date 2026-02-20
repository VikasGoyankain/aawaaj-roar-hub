import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        // Fetch user count
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch submissions
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

        // Recent submissions
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

        // Recent audit logs (President only)
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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-700';
      case 'In-Progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'Resolved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#002D04]">Dashboard</h2>
        <p className="text-sm text-gray-500">Overview of Aawaaj Movement admin panel</p>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Members</CardTitle>
            <Users className="h-5 w-5 text-[#002D04]" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#002D04]">{stats.totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Submissions</CardTitle>
            <FileText className="h-5 w-5 text-[#002D04]" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#002D04]">{stats.totalSubmissions}</p>
            <div className="mt-1 flex gap-2 text-xs text-gray-500">
              <span>{stats.victimReports} reports</span>
              <span>·</span>
              <span>{stats.volunteerApplications} applications</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">New / Pending</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{stats.newSubmissions}</p>
            <div className="mt-1 flex gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{stats.inProgressSubmissions} in progress</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Resolved</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.resolvedSubmissions}</p>
            <div className="mt-1 flex gap-2 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3" />
              <span>
                {stats.totalSubmissions > 0
                  ? Math.round((stats.resolvedSubmissions / stats.totalSubmissions) * 100)
                  : 0}
                % resolution rate
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Submissions</CardTitle>
            <CardDescription>Latest 5 submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubmissions.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{sub.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {sub.type === 'victim_report' ? 'Victim Report' : 'Volunteer Application'}{' '}
                        · {formatDateTime(sub.created_at)}
                      </p>
                    </div>
                    <Badge className={statusColor(sub.status)} variant="secondary">
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Logs (President only) */}
        {hasRole(['President']) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest admin actions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-gray-500">
                        by {log.admin_name} · {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
