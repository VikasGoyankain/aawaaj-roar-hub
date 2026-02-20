import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import type { Submission, SubmissionStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUSES: SubmissionStatus[] = ['New', 'In-Progress', 'Resolved'];

const statusColor: Record<SubmissionStatus, string> = {
  New: 'bg-blue-100 text-blue-700',
  'In-Progress': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
};

const urgencyColor: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 15;

export default function SubmissionsPage() {
  const { profile: currentUser, hasRole } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Detail dialog
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (currentUser?.role === 'Regional Head' || currentUser?.role === 'University President') {
      query = query.eq('region', currentUser.region);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching submissions:', error);
    } else {
      setSubmissions((data as Submission[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [currentUser, page, statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, typeFilter]);

  const handleStatusChange = async (submission: Submission, newStatus: SubmissionStatus) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', submission.id);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        admin_id: currentUser?.id,
        action: 'update_submission_status',
        target_type: 'submission',
        target_id: submission.id,
        details: {
          submission_name: submission.full_name,
          old_status: submission.status,
          new_status: newStatus,
        },
      });

      toast({
        title: 'Status updated',
        description: `"${submission.full_name}" is now ${newStatus}`,
      });

      // Update local state
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submission.id ? { ...s, status: newStatus } : s))
      );
      if (selectedSubmission?.id === submission.id) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#002D04]">Submissions</h2>
        <p className="text-sm text-gray-500">{totalCount} total submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="victim_report">Victim Report</SelectItem>
            <SelectItem value="volunteer_application">Volunteer Application</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitter</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Region</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                  No submissions found
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{sub.full_name}</p>
                      <p className="text-xs text-gray-500">{sub.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {sub.type === 'victim_report' ? 'Victim Report' : 'Volunteer App'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {hasRole(['President', 'Regional Head']) ? (
                      <Select
                        value={sub.status}
                        onValueChange={(v) => handleStatusChange(sub, v as SubmissionStatus)}
                        disabled={updatingStatus}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={statusColor[sub.status]} variant="secondary">
                        {sub.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {sub.region || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {formatDateTime(sub.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.type === 'victim_report'
                ? 'Victim Report'
                : 'Volunteer Application'}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-gray-500">Full Name</p>
                  <p className="text-sm">{selectedSubmission.full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Email</p>
                  <p className="text-sm">{selectedSubmission.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Phone</p>
                  <p className="text-sm">{selectedSubmission.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Date of Birth</p>
                  <p className="text-sm">{selectedSubmission.dob || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Location</p>
                  <p className="text-sm">
                    {[selectedSubmission.district, selectedSubmission.state, selectedSubmission.pincode]
                      .filter(Boolean)
                      .join(', ') || selectedSubmission.region || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <Badge className={statusColor[selectedSubmission.status]} variant="secondary">
                    {selectedSubmission.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Recommended By</p>
                  <p className="text-sm">{selectedSubmission.recommended_by || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Created</p>
                  <p className="text-sm">{formatDateTime(selectedSubmission.created_at)}</p>
                </div>
              </div>

              {selectedSubmission.type === 'victim_report' && (
                <>
                  <div className="border-t pt-3">
                    <p className="mb-2 text-xs font-medium text-gray-500">Incident Date</p>
                    <p className="text-sm">{selectedSubmission.incident_date || '—'}</p>
                  </div>
                  {selectedSubmission.urgency_level && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Urgency</p>
                      <Badge
                        className={urgencyColor[selectedSubmission.urgency_level]}
                        variant="secondary"
                      >
                        {selectedSubmission.urgency_level.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Incident Description</p>
                    <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                      {selectedSubmission.incident_description || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Perpetrator Info</p>
                    <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                      {selectedSubmission.perpetrator_info || '—'}
                    </p>
                  </div>
                </>
              )}

              {selectedSubmission.type === 'volunteer_application' && (
                <>
                  <div className="border-t pt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Role</p>
                      <p className="text-sm capitalize">
                        {selectedSubmission.serve_role?.replace('_', ' ') || '—'}
                      </p>
                    </div>
                    {selectedSubmission.volunteer_scope && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">Volunteer Scope</p>
                        <p className="text-sm capitalize">{selectedSubmission.volunteer_scope}</p>
                      </div>
                    )}
                  </div>
                  {(selectedSubmission.serve_area_district || selectedSubmission.serve_area_state) && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Serve Area</p>
                      <p className="text-sm">
                        {[selectedSubmission.serve_area_district, selectedSubmission.serve_area_state, selectedSubmission.serve_area_pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                  {selectedSubmission.college && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">College / University</p>
                      <p className="text-sm">{selectedSubmission.college}</p>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Skills</p>
                    <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                      {selectedSubmission.skills || '—'}
                    </p>
                  </div>
                  {selectedSubmission.about_self && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">About Themselves</p>
                      <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                        {selectedSubmission.about_self}
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedSubmission.consent !== undefined && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-500">Contact Consent</p>
                  <p className="text-sm">{selectedSubmission.consent ? '✅ Consented' : '❌ Not consented'}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
