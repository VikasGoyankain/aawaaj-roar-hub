import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getInitials, INDIAN_REGIONS } from '@/lib/utils';
import { ALL_ROLES } from '@/lib/validations';
import type { Profile, RoleName, ProfileWithRoles } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, MoreHorizontal, Shield, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const roleBadgeColor: Record<string, string> = {
  President: 'bg-purple-100 text-purple-700',
  'Technical Head': 'bg-indigo-100 text-indigo-700',
  'Content Head': 'bg-pink-100 text-pink-700',
  'Regional Head': 'bg-blue-100 text-blue-700',
  'University President': 'bg-cyan-100 text-cyan-700',
  Volunteer: 'bg-gray-100 text-gray-700',
};

const PAGE_SIZE = 20;

export default function MembersPage() {
  const { profile: me, hasRole, user } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<ProfileWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Add-member dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '', full_name: '', mobile_no: '', gender: '',
    dob: '', residence_district: '', current_region_or_college: '', roles: [] as RoleName[],
  });
  const [addLoading, setAddLoading] = useState(false);

  // Manage Power dialog
  const [powerMember, setPowerMember] = useState<ProfileWithRoles | null>(null);
  const [powerRoles, setPowerRoles] = useState<RoleName[]>([]);
  const [powerLoading, setPowerLoading] = useState(false);

  // Delete dialog
  const [deleteMember, setDeleteMember] = useState<ProfileWithRoles | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // All roles from DB
  const [dbRoles, setDbRoles] = useState<{ id: number; name: RoleName }[]>([]);

  useEffect(() => {
    supabase.from('roles').select('*').then(({ data }) => {
      if (data) setDbRoles(data as { id: number; name: RoleName }[]);
    });
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);

    // Get profiles
    let q = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('joined_on', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,residence_district.ilike.%${search}%`);
    }

    const { data: profiles, count, error } = await q;
    if (error) { console.error(error); setLoading(false); return; }

    const pList = (profiles || []) as Profile[];
    setTotalCount(count || 0);

    if (pList.length === 0) { setMembers([]); setLoading(false); return; }

    // Get roles for these users
    const ids = pList.map((p) => p.id);
    const { data: urData } = await supabase
      .from('user_roles')
      .select('user_id, role_id, roles(name)')
      .in('user_id', ids);

    const roleMap = new Map<string, RoleName[]>();
    (urData || []).forEach((r: { user_id: string; roles: { name: string }[] | { name: string } | null }) => {
      const list = roleMap.get(r.user_id) || [];
      if (Array.isArray(r.roles)) {
        r.roles.forEach((role) => { if (role?.name) list.push(role.name as RoleName); });
      } else if (r.roles?.name) {
        list.push(r.roles.name as RoleName);
      }
      roleMap.set(r.user_id, list);
    });

    let combined: ProfileWithRoles[] = pList.map((p) => ({ ...p, roles: roleMap.get(p.id) || [] }));

    // Client-side role filter
    if (roleFilter !== 'all') {
      combined = combined.filter((m) => m.roles.includes(roleFilter as RoleName));
    }

    setMembers(combined);
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { setPage(0); }, [search, roleFilter]);

  // ── Audit logger ──
  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert({
      admin_id: me?.id, action, target_type: 'user', target_id: targetId, details,
    });
  };

  // ── Add Member (send magic link invitation → auto-creates profile via trigger) ──
  const handleAdd = async () => {
    if (!addForm.email || !addForm.full_name || addForm.roles.length === 0) {
      toast({ title: 'Missing fields', description: 'Name, email, and at least one role are required.', variant: 'destructive' });
      return;
    }
    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      toast({ title: 'Invalid email format', variant: 'destructive' });
      return;
    }
    setAddLoading(true);
    try {
      // Send magic link — this creates the auth.users row if the user doesn't exist
      // The on_auth_user_created trigger will auto-create the profile + Volunteer role
      const siteUrl = import.meta.env.VITE_SITE_URL as string || 'https://aawaajmovement.org';
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: addForm.email,
        options: {
          data: {
            full_name: addForm.full_name,
            mobile_no: addForm.mobile_no || undefined,
            residence_district: addForm.residence_district || undefined,
            current_region_or_college: addForm.current_region_or_college || undefined,
          },
          emailRedirectTo: `${siteUrl}/admin`,
          shouldCreateUser: true,
        },
      });
      if (otpErr) throw otpErr;

      // The profile won't exist yet (created when user clicks the link).
      // We'll log this as a pending invite. Roles will need to be assigned
      // after the user confirms via "Manage Power".
      await logAudit('invite_member', addForm.email, {
        email: addForm.email,
        full_name: addForm.full_name,
        requested_roles: addForm.roles,
        mobile_no: addForm.mobile_no,
        gender: addForm.gender,
        dob: addForm.dob,
        residence_district: addForm.residence_district,
        current_region_or_college: addForm.current_region_or_college,
      });

      toast({
        title: 'Invitation sent!',
        description: `A magic link has been sent to ${addForm.email}. Once they click it and their account is created, you can assign roles via "Manage Power".`,
      });
      setAddOpen(false);
      setAddForm({ email: '', full_name: '', mobile_no: '', gender: '', dob: '', residence_district: '', current_region_or_college: '', roles: [] });
      fetchMembers();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to invite', variant: 'destructive' });
    } finally { setAddLoading(false); }
  };

  // ── Manage Power (toggle roles) ──
  const openPower = (m: ProfileWithRoles) => {
    setPowerMember(m);
    setPowerRoles([...m.roles]);
  };

  const handlePowerSave = async () => {
    if (!powerMember) return;
    setPowerLoading(true);
    try {
      const current = powerMember.roles;
      const toAdd = powerRoles.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !powerRoles.includes(r));

      // Add new roles
      for (const rName of toAdd) {
        const roleRow = dbRoles.find((r) => r.name === rName);
        if (roleRow) {
          await supabase.from('user_roles').insert({
            user_id: powerMember.id,
            role_id: roleRow.id,
            granted_by: user?.id,
          });
        }
      }
      // Remove roles
      for (const rName of toRemove) {
        const roleRow = dbRoles.find((r) => r.name === rName);
        if (roleRow) {
          await supabase.from('user_roles').delete().eq('user_id', powerMember.id).eq('role_id', roleRow.id);
        }
      }

      await logAudit('manage_power', powerMember.id, {
        user_name: powerMember.full_name,
        added: toAdd,
        removed: toRemove,
        resulting: powerRoles,
      });

      toast({ title: 'Roles updated', description: `${powerMember.full_name}'s roles updated.` });
      setPowerMember(null);
      fetchMembers();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setPowerLoading(false); }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteMember) return;
    setDeleteLoading(true);
    try {
      await supabase.from('profiles').delete().eq('id', deleteMember.id);
      await logAudit('delete_member', deleteMember.id, { email: deleteMember.email, name: deleteMember.full_name });
      toast({ title: 'Deleted', description: `${deleteMember.full_name} removed.` });
      setDeleteMember(null);
      fetchMembers();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setDeleteLoading(false); }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#002D04]">Members Directory</h2>
          <p className="text-sm text-gray-500">{totalCount} total members</p>
        </div>
        {hasRole('President') && (
          <Button onClick={() => setAddOpen(true)} className="bg-[#F4C430] text-[#002D04] hover:bg-[#dab22a]">
            <UserPlus className="mr-2 h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search name, email, district..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden md:table-cell">District / College</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              {hasRole('President') && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-400">No members found</TableCell></TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {m.profile_photo_url ? <AvatarImage src={m.profile_photo_url} /> : null}
                        <AvatarFallback className="bg-[#002D04] text-xs text-white">{getInitials(m.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{m.full_name}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.roles.length > 0 ? m.roles.map((r) => (
                        <Badge key={r} className={roleBadgeColor[r] || 'bg-gray-100 text-gray-700'} variant="secondary">{r}</Badge>
                      )) : <span className="text-xs text-gray-400">No roles</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {m.residence_district || m.current_region_or_college || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">{formatDate(m.joined_on)}</TableCell>
                  {hasRole('President') && (
                    <TableCell>
                      {m.id !== me?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPower(m)}>
                              <Shield className="mr-2 h-4 w-4" /> Manage Power
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteMember(m)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
          <p className="text-sm text-gray-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* ── Add Member Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>Send a magic-link invitation. The user will set their own password on first login.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} placeholder="e.g., Aarav Sharma" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input value={addForm.mobile_no} onChange={(e) => setAddForm({ ...addForm, mobile_no: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={addForm.gender} onValueChange={(v) => setAddForm({ ...addForm, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['Male', 'Female', 'Non-Binary', 'Prefer not to say'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={addForm.dob} onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>State / UT</Label>
                <Select value={addForm.residence_district} onValueChange={(v) => setAddForm({ ...addForm, residence_district: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{INDIAN_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>College / Region</Label>
              <Input value={addForm.current_region_or_college} onChange={(e) => setAddForm({ ...addForm, current_region_or_college: e.target.value })} placeholder="e.g., Delhi University" />
            </div>
            <div className="space-y-2">
              <Label>Assign Roles <span className="text-red-500">*</span></Label>
              <p className="text-xs text-gray-400">Select the roles this member should have. You can change them later via "Manage Power".</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={addForm.roles.includes(r)}
                      onCheckedChange={(checked) => {
                        setAddForm((prev) => ({
                          ...prev,
                          roles: checked ? [...prev.roles, r] : prev.roles.filter((x) => x !== r),
                        }));
                      }}
                    />
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                <strong>How it works:</strong> A magic link will be emailed to the user. When they click it, their account is auto-created with the Volunteer role. You can then assign additional roles via "Manage Power" in the members list.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addLoading || !addForm.email || !addForm.full_name || addForm.roles.length === 0} className="bg-[#002D04] hover:bg-[#004d0a]">
              {addLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Power Dialog ── */}
      <Dialog open={!!powerMember} onOpenChange={(o) => !o && setPowerMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Power</DialogTitle>
            <DialogDescription>Toggle roles for <strong>{powerMember?.full_name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={powerRoles.includes(r)}
                  onCheckedChange={(checked) => {
                    setPowerRoles((prev) => checked ? [...prev, r] : prev.filter((x) => x !== r));
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{r}</p>
                  <p className="text-xs text-gray-400">
                    {r === 'President' && 'Full access to everything'}
                    {r === 'Technical Head' && 'Codebase & technical wing'}
                    {r === 'Content Head' && 'Blog moderation & content'}
                    {r === 'Regional Head' && 'Regional members & submissions'}
                    {r === 'University President' && 'College-level read access'}
                    {r === 'Volunteer' && 'Base member role'}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPowerMember(null)}>Cancel</Button>
            <Button onClick={handlePowerSave} disabled={powerLoading || powerRoles.length === 0} className="bg-[#F4C430] text-[#002D04] hover:bg-[#dab22a]">
              {powerLoading ? 'Saving...' : 'Save Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteMember} onOpenChange={(o) => !o && setDeleteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently remove <strong>{deleteMember?.full_name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
