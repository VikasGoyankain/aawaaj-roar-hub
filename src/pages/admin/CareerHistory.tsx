import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import type { CareerHistory, Profile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, ChevronLeft, ChevronRight, Edit, Briefcase } from 'lucide-react';

const PAGE_SIZE = 20;

interface CareerRow extends CareerHistory {
  member_name?: string;
  member_email?: string;
}

export default function CareerHistoryPage() {
  const { hasRole, profile: me } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<CareerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [editRow, setEditRow] = useState<CareerRow | null>(null);
  const [editAchievements, setEditAchievements] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: careers, count, error } = await supabase
      .from('career_history')
      .select('*', { count: 'exact' })
      .order('start_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { console.error(error); setLoading(false); return; }
    const careerList = (careers || []) as CareerHistory[];
    setTotalCount(count || 0);
    if (careerList.length === 0) { setRows([]); setLoading(false); return; }

    const userIds = [...new Set(careerList.map((c) => c.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
    const pMap = new Map((profiles || []).map((p: Pick<Profile, 'id' | 'full_name' | 'email'>) => [p.id, p]));

    setRows(careerList.map((c) => {
      const p = pMap.get(c.user_id);
      return { ...c, member_name: p?.full_name || 'Unknown', member_email: p?.email };
    }));
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(0); }, [search]);

  const filteredRows = search
    ? rows.filter(
        (r) =>
          r.member_name?.toLowerCase().includes(search.toLowerCase()) ||
          r.role_name.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const handleEditSave = async () => {
    if (!editRow) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('career_history')
        .update({ key_achievements: editAchievements, summary_of_work: editSummary })
        .eq('id', editRow.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        admin_id: me?.id,
        action: 'update_career_entry',
        target_type: 'career_history',
        target_id: String(editRow.id),
        details: { member: editRow.member_name, role: editRow.role_name },
      });
      toast({ title: 'Updated', description: 'Career entry saved.' });
      setEditRow(null);
      fetchData();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setEditLoading(false); }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading career data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-primary">Career Tree</h2>
          <p className="text-sm text-muted-foreground">Every member's role journey — auto-recorded on role changes</p>
        </div>
        <span className="ml-auto rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
          {totalCount} entries
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by member or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-foreground">Member</TableHead>
              <TableHead className="font-semibold text-foreground">Role</TableHead>
              <TableHead className="font-semibold text-foreground">Start</TableHead>
              <TableHead className="font-semibold text-foreground">End</TableHead>
              <TableHead className="hidden font-semibold text-foreground md:table-cell">Achievements</TableHead>
              {hasRole(['President', 'Technical Head']) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Briefcase className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No career entries found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/20">
                  <TableCell>
                    <p className="text-sm font-semibold text-foreground">{r.member_name}</p>
                    <p className="text-xs text-muted-foreground">{r.member_email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium">{r.role_name}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(r.start_date)}</TableCell>
                  <TableCell className="text-sm">
                    {r.end_date ? (
                      <span className="text-xs text-muted-foreground">{formatDate(r.end_date)}</span>
                    ) : (
                      <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700 text-xs" variant="outline">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-xs md:table-cell">
                    <p className="truncate text-xs text-muted-foreground">{r.key_achievements || '—'}</p>
                  </TableCell>
                  {hasRole(['President', 'Technical Head']) && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-primary/8"
                        onClick={() => {
                          setEditRow(r);
                          setEditAchievements(r.key_achievements || '');
                          setEditSummary(r.summary_of_work || '');
                        }}
                      >
                        <Edit className="h-4 w-4 text-primary" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{page + 1}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
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

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Edit Career Entry — <span className="font-normal">{editRow?.member_name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Key Achievements</Label>
              <Textarea
                rows={3}
                value={editAchievements}
                onChange={(e) => setEditAchievements(e.target.value)}
                placeholder="Comma-separated list of achievements..."
                className="rounded-xl resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Summary of Work</Label>
              <Textarea
                rows={3}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Brief summary of contributions..."
                className="rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button
              onClick={handleEditSave}
              disabled={editLoading}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
