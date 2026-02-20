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

  // Edit dialog
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

    // Get member names
    const userIds = [...new Set(careerList.map((c) => c.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
    const pMap = new Map((profiles || []).map((p: Pick<Profile, 'id' | 'full_name' | 'email'>) => [p.id, p]));

    const combined: CareerRow[] = careerList.map((c) => {
      const p = pMap.get(c.user_id);
      return { ...c, member_name: p?.full_name || 'Unknown', member_email: p?.email };
    });

    setRows(combined);
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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-[#002D04]" />
        <div>
          <h2 className="text-2xl font-bold text-[#002D04]">Career Tree</h2>
          <p className="text-sm text-gray-500">Every member's role journey - auto-recorded on role changes</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search by member or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="hidden md:table-cell">Achievements</TableHead>
              {hasRole('President') && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-gray-400">No career entries</TableCell></TableRow>
            ) : (
              filteredRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{r.member_name}</p>
                    <p className="text-xs text-gray-500">{r.member_email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.role_name}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(r.start_date)}</TableCell>
                  <TableCell className="text-sm">
                    {r.end_date ? (
                      <span className="text-gray-500">{formatDate(r.end_date)}</span>
                    ) : (
                      <Badge className="bg-green-100 text-green-700" variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate md:table-cell text-sm text-gray-500">
                    {r.key_achievements || '—'}
                  </TableCell>
                  {hasRole('President') && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditRow(r); setEditAchievements(r.key_achievements || ''); setEditSummary(r.summary_of_work || ''); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Career Entry — {editRow?.member_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Achievements</Label>
              <Textarea rows={3} value={editAchievements} onChange={(e) => setEditAchievements(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Summary of Work</Label>
              <Textarea rows={3} value={editSummary} onChange={(e) => setEditSummary(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editLoading} className="bg-[#002D04] hover:bg-[#004d0a]">
              {editLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
