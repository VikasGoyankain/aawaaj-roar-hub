import { useEffect, useState, useCallback, useRef } from 'react';
import SEO from '@/components/SEO';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getInitials } from '@/lib/utils';
import { ALL_STATES, STATES_AND_DISTRICTS, searchColleges, type UniversityEntry } from '@/lib/india-data';
import type { Assignment, AssignmentType, RoleName } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  MapPinned,
  Search,
  Pencil,
  Plus,
  Loader2,
  GraduationCap,
  MapPin,
  Shield,
  Trash2,
} from 'lucide-react';

/* ── Role badge color helper ── */
const roleBadgeColor: Record<string, string> = {
  President: 'bg-purple-100 text-purple-700',
  'Technical Head': 'bg-indigo-100 text-indigo-700',
  'Content Head': 'bg-pink-100 text-pink-700',
  'Regional Head': 'bg-blue-100 text-blue-700',
  'University President': 'bg-cyan-100 text-cyan-700',
  Volunteer: 'bg-gray-100 text-gray-700',
};

/* ── Inline university search (same as Profile page) ── */
function UniversitySearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<UniversityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (raw: string) => {
    setQuery(raw);
    onChange(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (raw.length < 2) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchColleges(raw);
      setResults(data);
      setShowDrop(data.length > 0);
      setLoading(false);
    }, 300);
  };

  const pick = (uni: UniversityEntry) => {
    setQuery(uni.name);
    onChange(uni.name);
    setShowDrop(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length) setShowDrop(true); }}
          placeholder="Search university…"
          className="rounded-xl pr-8"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {showDrop && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-background shadow-lg max-h-52 overflow-y-auto">
          {results.map((uni) => (
            <button
              key={uni.aisheCode}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(uni); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b last:border-0"
            >
              <span className="block font-medium">{uni.name}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{uni.district}, {uni.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Types used in the page ── */
interface AssignmentRow extends Assignment {
  userName: string;
  userPhoto: string | null;
  userEmail: string;
  userRoles: RoleName[];
}

interface MemberOption {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  email: string;
  roles: RoleName[];
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main Page                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export default function AssignmentsPage() {
  const { profile: me, roles: myRoles, hasRole, user } = useAuth();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formUserId, setFormUserId] = useState('');
  const [formType, setFormType] = useState<AssignmentType>('region');
  const [formState, setFormState] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formUniversity, setFormUniversity] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Member options for the user picker
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  /* ── Permission helpers ── */
  const isGlobal = hasRole(['President', 'Technical Head']);

  // The current user's own assignment (used for scoping)
  const [myAssignment, setMyAssignment] = useState<Assignment | null>(null);

  const canManage = (assignment: AssignmentRow | null): boolean => {
    if (isGlobal) return true;
    if (!assignment) return isGlobal; // creating new — only global
    if (hasRole('Regional Head') && myAssignment) {
      // Can manage if the target is assigned to the same region
      return (
        assignment.assignment_type === 'region' &&
        assignment.assigned_district === myAssignment.assigned_district &&
        assignment.assigned_state === myAssignment.assigned_state
      );
    }
    if (hasRole('University President') && myAssignment) {
      return (
        assignment.assignment_type === 'university' &&
        assignment.assigned_university === myAssignment.assigned_university
      );
    }
    return false;
  };

  /* ── Fetch assignments ── */
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load all assignments
      const { data: rawAssignments } = await supabase
        .from('assignments')
        .select('*')
        .order('updated_at', { ascending: false });

      const allAssignments = (rawAssignments || []) as Assignment[];

      // Track my own assignment for scoping
      if (me?.id) {
        const mine = allAssignments.find((a) => a.user_id === me.id);
        if (mine) setMyAssignment(mine);
      }

      if (allAssignments.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch profiles for all assigned users
      const userIds = [...new Set(allAssignments.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url, email')
        .in('id', userIds);

      const profileMap = new Map<string, { full_name: string; profile_photo_url: string | null; email: string }>();
      (profiles || []).forEach((p: { id: string; full_name: string; profile_photo_url: string | null; email: string }) => {
        profileMap.set(p.id, p);
      });

      // 3. Fetch roles for all users
      const { data: userRoleRows } = await supabase
        .from('user_roles')
        .select('user_id, roles(name)')
        .in('user_id', userIds);

      const roleMap = new Map<string, RoleName[]>();
      (userRoleRows || []).forEach((row: { user_id: string; roles: { name: string }[] | { name: string } | null }) => {
        const list = roleMap.get(row.user_id) || [];
        if (Array.isArray(row.roles)) {
          row.roles.forEach((r) => { if (r?.name) list.push(r.name as RoleName); });
        } else if (row.roles?.name) {
          list.push(row.roles.name as RoleName);
        }
        roleMap.set(row.user_id, list);
      });

      // 4. Combine
      const combined: AssignmentRow[] = allAssignments.map((a) => {
        const p = profileMap.get(a.user_id);
        return {
          ...a,
          userName: p?.full_name || 'Unknown',
          userPhoto: p?.profile_photo_url || null,
          userEmail: p?.email || '',
          userRoles: roleMap.get(a.user_id) || [],
        };
      });

      // 5. Scope: Regional Head sees only their region; Uni President sees only their university
      let scoped = combined;
      if (!isGlobal && hasRole('Regional Head') && myAssignment) {
        scoped = combined.filter(
          (a) =>
            a.assignment_type === 'region' &&
            a.assigned_state === myAssignment.assigned_state &&
            a.assigned_district === myAssignment.assigned_district
        );
      } else if (!isGlobal && hasRole('University President') && myAssignment) {
        scoped = combined.filter(
          (a) =>
            a.assignment_type === 'university' &&
            a.assigned_university === myAssignment.assigned_university
        );
      }

      setAssignments(scoped);
    } finally {
      setLoading(false);
    }
  }, [me, isGlobal, hasRole, myAssignment?.assigned_district, myAssignment?.assigned_state, myAssignment?.assigned_university]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  /* ── Fetch members for the user picker ── */
  const fetchMembers = useCallback(async (q: string) => {
    setMembersLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url, email')
        .order('full_name')
        .limit(20);
      if (q.trim()) {
        query = query.or(`full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
      }
      const { data } = await query;
      const profiles = (data || []) as { id: string; full_name: string; profile_photo_url: string | null; email: string }[];

      // Fetch roles
      const ids = profiles.map((p) => p.id);
      const { data: urData } = await supabase
        .from('user_roles')
        .select('user_id, roles(name)')
        .in('user_id', ids);

      const roleMap = new Map<string, RoleName[]>();
      (urData || []).forEach((row: { user_id: string; roles: { name: string }[] | { name: string } | null }) => {
        const list = roleMap.get(row.user_id) || [];
        if (Array.isArray(row.roles)) {
          row.roles.forEach((r) => { if (r?.name) list.push(r.name as RoleName); });
        } else if (row.roles?.name) {
          list.push(row.roles.name as RoleName);
        }
        roleMap.set(row.user_id, list);
      });

      setMemberOptions(
        profiles.map((p) => ({ ...p, roles: roleMap.get(p.id) || [] }))
      );
    } finally {
      setMembersLoading(false);
    }
  }, []);

  /* ── Open create/edit dialog ── */
  const openCreate = () => {
    setEditing(null);
    setFormUserId('');
    setFormType('region');
    setFormState('');
    setFormDistrict('');
    setFormUniversity('');
    setFormNotes('');
    setMemberSearch('');
    setMemberOptions([]);
    setDialogOpen(true);
    fetchMembers('');
  };

  const openEdit = (row: AssignmentRow) => {
    setEditing(row);
    setFormUserId(row.user_id);
    setFormType(row.assignment_type);
    setFormState(row.assigned_state || '');
    setFormDistrict(row.assigned_district || '');
    setFormUniversity(row.assigned_university || '');
    setFormNotes(row.notes || '');
    setDialogOpen(true);
  };

  /* ── Save (create or update) ── */
  const handleSave = async () => {
    if (!formUserId) {
      toast({ title: 'Please select a member', variant: 'destructive' });
      return;
    }
    if (formType === 'region' && !formState && !formDistrict) {
      toast({ title: 'State or district is required for region assignment', variant: 'destructive' });
      return;
    }
    if (formType === 'university' && !formUniversity.trim()) {
      toast({ title: 'University is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: formUserId,
        assignment_type: formType,
        assigned_state: formType === 'region' ? (formState || null) : null,
        assigned_district: formType === 'region' ? (formDistrict || null) : null,
        assigned_university: formType === 'university' ? (formUniversity.trim() || null) : null,
        assigned_by: user?.id || null,
        notes: formNotes.trim() || null,
      };

      if (editing) {
        // Update
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        // Insert with upsert on (user_id, assignment_type)
        const { error } = await supabase
          .from('assignments')
          .upsert(payload, { onConflict: 'user_id,assignment_type' });
        if (error) throw error;
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: editing ? 'update_assignment' : 'create_assignment',
        target_type: 'assignment',
        target_id: formUserId,
        details: { ...payload, edited_id: editing?.id || null },
      });

      toast({ title: editing ? 'Assignment updated' : 'Assignment created' });
      setDialogOpen(false);
      fetchAssignments();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save assignment',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', editing.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action: 'delete_assignment',
        target_type: 'assignment',
        target_id: editing.user_id,
        details: { assignment_id: editing.id, assignment_type: editing.assignment_type },
      });

      toast({ title: 'Assignment removed' });
      setDialogOpen(false);
      fetchAssignments();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  /* ── Filter ── */
  const filtered = assignments.filter((a) => {
    const matchesType = typeFilter === 'all' || a.assignment_type === typeFilter;
    const matchesSearch =
      !search.trim() ||
      a.userName.toLowerCase().includes(search.toLowerCase()) ||
      (a.assigned_district || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.assigned_university || '').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const districts = formState ? (STATES_AND_DISTRICTS[formState] ?? []) : [];

  /* ── Access guard ── */
  const canView = hasRole(['President', 'Technical Head', 'Regional Head', 'University President']);
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="text-lg font-semibold">Access Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your current role does not include access to assignments.
        </p>
      </div>
    );
  }

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading assignments…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Assignments" description="Manage region and university assignments for Aawaaj Movement members." noIndex />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Assignments</h2>
            <p className="text-sm text-muted-foreground">
              Manage which region or university each member is assigned to work in.
              <br />
              <span className="text-xs">This is separate from a member's personal location.</span>
            </p>
          </div>
          {isGlobal && (
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Assign Member
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, district, university…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="region">Region</SelectItem>
              <SelectItem value="university">University</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="hidden md:table-cell">Roles</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <MapPinned className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm font-medium">
                      {search || typeFilter !== 'all' ? 'No assignments match your filters.' : 'No assignments yet.'}
                    </p>
                    {isGlobal && !search && typeFilter === 'all' && (
                      <p className="text-xs mt-1">Click "Assign Member" to get started.</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {row.userPhoto && <AvatarImage src={row.userPhoto} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(row.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{row.userName}</p>
                          <p className="text-xs text-muted-foreground truncate">{row.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.assignment_type === 'region' ? (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 gap-1">
                          <MapPin className="h-3 w-3" /> Region
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 gap-1">
                          <GraduationCap className="h-3 w-3" /> University
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {row.assignment_type === 'region'
                          ? [row.assigned_district, row.assigned_state].filter(Boolean).join(', ')
                          : row.assigned_university || '—'}
                      </span>
                      {row.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{row.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {row.userRoles.length > 0
                          ? row.userRoles.map((r) => (
                              <Badge key={r} variant="secondary" className={`text-xs ${roleBadgeColor[r] || ''}`}>
                                {r}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">No roles</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDate(row.updated_at)}
                    </TableCell>
                    <TableCell>
                      {canManage(row) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">ABOUT ASSIGNMENTS</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Region assignment</strong> — The state & district where the member operates (can differ from their home location).</li>
            <li>• <strong>University assignment</strong> — The college/university where a coordinator or volunteer is deployed (mandatory to match where they study).</li>
            <li>• <strong>President / Technical Head</strong> can create and modify all assignments.</li>
            <li>• <strong>Regional Heads</strong> can modify assignments within their assigned region.</li>
            <li>• <strong>University Presidents</strong> can modify assignments within their assigned university.</li>
          </ul>
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Assignment' : 'Assign Member'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update the assignment for ${editing.userName}.`
                : 'Select a member and assign them to a region or university.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Member picker (only for new assignments) */}
            {!editing && (
              <div className="space-y-2">
                <Label>Select Member <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Search member name or email…"
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    fetchMembers(e.target.value);
                  }}
                  className="rounded-xl"
                />
                {membersLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                  </p>
                )}
                {memberOptions.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border">
                    {memberOptions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-b last:border-0 ${
                          formUserId === m.id ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                        }`}
                        onClick={() => setFormUserId(m.id)}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          {m.profile_photo_url && <AvatarImage src={m.profile_photo_url} />}
                          <AvatarFallback className="text-[10px] bg-muted">{getInitials(m.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {m.roles.map((r) => (
                            <Badge key={r} variant="secondary" className={`text-[10px] ${roleBadgeColor[r] || ''}`}>{r}</Badge>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {formUserId && (
                  <p className="text-xs text-emerald-600">
                    ✓ Selected: {memberOptions.find((m) => m.id === formUserId)?.full_name || formUserId}
                  </p>
                )}
              </div>
            )}

            {/* Assignment type */}
            <div className="space-y-2">
              <Label>Assignment Type <span className="text-red-500">*</span></Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as AssignmentType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="region">
                    <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Region (State & District)</span>
                  </SelectItem>
                  <SelectItem value="university">
                    <span className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> University</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region fields */}
            {formType === 'region' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={formState} onValueChange={(v) => { setFormState(v); setFormDistrict(''); }}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>District</Label>
                  <Select value={formDistrict} onValueChange={setFormDistrict} disabled={districts.length === 0}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={districts.length === 0 ? 'Select state first' : 'Select district'} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* University field */}
            {formType === 'university' && (
              <div className="space-y-2">
                <Label>University <span className="text-red-500">*</span></Label>
                <UniversitySearch value={formUniversity} onChange={setFormUniversity} />
                <p className="text-xs text-muted-foreground">
                  For coordinators/volunteers, this should be the university where they study.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any context about this assignment…"
                rows={2}
                className="resize-none rounded-xl"
              />
            </div>

            {/* Info box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800">
              <strong>Note:</strong> Each member can have at most one region assignment and one university assignment.
              Creating a new assignment of the same type replaces the previous one.
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between">
            <div>
              {editing && canManage(editing) && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? 'Removing…' : 'Remove Assignment'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formUserId}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? 'Saving…' : editing ? 'Update Assignment' : 'Create Assignment'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
