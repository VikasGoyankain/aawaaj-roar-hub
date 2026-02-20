import { useEffect, useState, useCallback } from 'react';
import SEO from '@/components/SEO';
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
import { Search, ChevronLeft, ChevronRight, ShieldAlert, ScrollText } from 'lucide-react';

const PAGE_SIZE = 20;

const actionLabels: Record<string, { label: string; color: string }> = {
  invite_user: { label: 'User Invited', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  add_member: { label: 'Member Added', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  grant_role: { label: 'Role Granted', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  revoke_role: { label: 'Role Revoked', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  change_role: { label: 'Role Changed', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  delete_user: { label: 'User Deleted', color: 'bg-red-100 text-red-700 border-red-200' },
  delete_member: { label: 'Member Deleted', color: 'bg-red-100 text-red-700 border-red-200' },
  update_submission_status: { label: 'Status Updated', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  edit_career_history: { label: 'Career Edited', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  delete_blog: { label: 'Blog Deleted', color: 'bg-red-100 text-red-700 border-red-200' },
  manage_roles: { label: 'Roles Managed', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
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

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(0); }, [actionFilter, search]);

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
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">Access Restricted</p>
        <p className="mt-1 text-sm text-muted-foreground">Only the President or Technical Head can view audit logs.</p>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Audit Logs" description="Complete audit trail of all admin actions in Aawaaj Movement." noIndex />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
          <ScrollText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-primary">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">Complete trail of all admin actions</p>
        </div>
        <div className="ml-auto">
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
            {totalCount} total records
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by admin, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full rounded-xl sm:w-[220px]">
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
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-foreground">Admin</TableHead>
              <TableHead className="font-semibold text-foreground">Action</TableHead>
              <TableHead className="hidden font-semibold text-foreground md:table-cell">Details</TableHead>
              <TableHead className="font-semibold text-foreground">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <ScrollText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No audit logs found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const actionInfo = actionLabels[log.action] || {
                  label: log.action.replace(/_/g, ' '),
                  color: 'bg-gray-100 text-gray-700 border-gray-200',
                };
                return (
                  <TableRow key={log.id} className="hover:bg-muted/20">
                    <TableCell>
                      <p className="text-sm font-semibold text-foreground">{log.admin_name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border text-xs font-medium ${actionInfo.color}`} variant="outline">
                        {actionInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-xs md:table-cell">
                      <p className="truncate text-xs text-muted-foreground">
                        {log.details && typeof log.details === 'object'
                          ? Object.entries(log.details)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')
                          : '—'}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}</span> of{' '}
            <span className="font-medium text-foreground">{totalCount}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
