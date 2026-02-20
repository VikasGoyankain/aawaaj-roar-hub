import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog, Profile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';

const PAGE_SIZE = 20;

const actionLabels: Record<string, { label: string; color: string }> = {
  invite_user: { label: 'User Invited', color: 'bg-blue-100 text-blue-700' },
  add_member: { label: 'Member Added', color: 'bg-blue-100 text-blue-700' },
  grant_role: { label: 'Role Granted', color: 'bg-purple-100 text-purple-700' },
  revoke_role: { label: 'Role Revoked', color: 'bg-orange-100 text-orange-700' },
  change_role: { label: 'Role Changed', color: 'bg-purple-100 text-purple-700' },
  delete_user: { label: 'User Deleted', color: 'bg-red-100 text-red-700' },
  delete_member: { label: 'Member Deleted', color: 'bg-red-100 text-red-700' },
  update_submission_status: { label: 'Status Updated', color: 'bg-yellow-100 text-yellow-700' },
  edit_career_history: { label: 'Career Edited', color: 'bg-teal-100 text-teal-700' },
  delete_blog: { label: 'Blog Deleted', color: 'bg-red-100 text-red-700' },
};

export default function AuditLogsPage() {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<(AuditLog & { admin_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
      return;
    }

    const allLogs = (data as AuditLog[]) || [];
    setTotalCount(count || 0);

    // Fetch admin names
    if (allLogs.length > 0) {
      const adminIds = [...new Set(allLogs.map((l) => l.admin_id))];
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', adminIds);

      const adminMap = new Map(
        (admins || []).map((a: Pick<Profile, 'id' | 'full_name'>) => [a.id, a.full_name])
      );

      setLogs(allLogs.map((l) => ({ ...l, admin_name: adminMap.get(l.admin_id) || 'Unknown' })));
    } else {
      setLogs([]);
    }

    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(0);
  }, [actionFilter, search]);

  // Filter by search (client-side on admin name and details)
  const filteredLogs = search
    ? logs.filter(
        (l) =>
          l.admin_name?.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!hasRole(['President', 'Technical Head'])) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Access Restricted</p>
        <p className="text-sm text-gray-400">Only the President or Technical Head can view audit logs.</p>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#002D04]">Audit Logs</h2>
        <p className="text-sm text-gray-500">Track all admin actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(actionLabels).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-gray-400">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const actionInfo = actionLabels[log.action] || {
                  label: log.action,
                  color: 'bg-gray-100 text-gray-700',
                };
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">
                      {log.admin_name}
                    </TableCell>
                    <TableCell>
                      <Badge className={actionInfo.color} variant="secondary">
                        {actionInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate md:table-cell text-sm text-gray-500">
                      {log.details && typeof log.details === 'object'
                        ? Object.entries(log.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
            {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
