import { useEffect, useState, useCallback, useMemo } from 'react';
import SEO from '@/components/SEO';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getInitials, INDIAN_REGIONS } from '@/lib/utils';
import { ALL_ROLES } from '@/lib/validations';
import type { Profile, RoleName, ProfileWithRoles, Assignment } from '@/lib/types';
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
import { Search, UserPlus, MoreHorizontal, Shield, Trash2, ChevronLeft, ChevronRight, Copy, Check, Link2 } from 'lucide-react';

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

  // Magic link fallback dialog (shown when SMTP is unavailable)
  const [magicLinkInfo, setMagicLinkInfo] = useState<{ name: string; email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyMagicLink = () => {
    if (!magicLinkInfo) return;
    navigator.clipboard.writeText(magicLinkInfo.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Manage Power dialog
  const [powerMember, setPowerMember] = useState<ProfileWithRoles | null>(null);
  const [powerRoles, setPowerRoles] = useState<RoleName[]>([]);
  const [powerLoading, setPowerLoading] = useState(false);

  // Delete dialog
  const [deleteMember, setDeleteMember] = useState<ProfileWithRoles | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // All roles from DB
  const [dbRoles, setDbRoles] = useState<{ id: number; name: RoleName }[]>([]);

  // Current user's assignment (for scoping)
  const [myAssignment, setMyAssignment] = useState<Assignment | null>(null);
  const [assignmentLoaded, setAssignmentLoaded] = useState(false);

  useEffect(() => {
    supabase.from('roles').select('*').then(({ data }) => {
      if (data) setDbRoles(data as { id: number; name: RoleName }[]);
    });
  }, []);

  // ── Role-based access tier ──────────────────────────────────────────────
  // 'global'     – President / Technical Head  → all members
  // 'regional'   – Regional Head              → members of own region
  // 'university' – University President        → volunteers of own college
  // 'volunteer'  – Volunteer                   → read-only view of own region/college members
  // 'none'       – Content Head (no member access)
  const accessTier = useMemo(() => {
    if (hasRole(['President', 'Technical Head'])) return 'global' as const;
    if (hasRole('Regional Head'))                return 'regional' as const;
    if (hasRole('University President'))         return 'university' as const;
    if (hasRole('Volunteer'))                    return 'volunteer' as const;
    return 'none' as const;
  }, [hasRole]);

  // Can this user manage (edit roles / remove) other members?
  const canManage = hasRole(['President', 'Technical Head']);

  // Fetch current user's assignment for scoping
  useEffect(() => {
    if (!user || accessTier === 'global') { setAssignmentLoaded(true); return; }

    // For volunteers we don't know their type upfront — fetch any assignment
    if (accessTier === 'volunteer') {
      supabaseAdmin
        .from('assignments')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) console.warn('[Members] volunteer assignment fetch:', error.message);
          if (data) setMyAssignment(data as Assignment);
          setAssignmentLoaded(true);
        });
      return;
    }

    const aType = accessTier === 'regional' ? 'region' : 'university';
    supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .eq('assignment_type', aType)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.warn('[Members] assignment fetch:', error.message);
        if (data) setMyAssignment(data as Assignment);
        setAssignmentLoaded(true);
      });
  }, [user, accessTier]);

  const pageTitle = useMemo(() => {
    if (accessTier === 'global') return 'All Members';
    if (accessTier === 'regional') {
      const label = myAssignment?.assigned_district || myAssignment?.assigned_state || me?.residence_district || 'My Region';
      return `Members of ${label}`;
    }
    if (accessTier === 'university') {
      const label = myAssignment?.assigned_university || me?.current_region_or_college || 'My College';
      return `Volunteers of ${label}`;
    }
    if (accessTier === 'volunteer') {
      if (myAssignment?.assignment_type === 'university') {
        return `Team at ${myAssignment.assigned_university || me?.current_region_or_college || 'My College'}`;
      }
      const label = myAssignment?.assigned_district || myAssignment?.assigned_state || me?.residence_district || 'My Region';
      return `Team in ${label}`;
    }
    return 'Members';
  }, [accessTier, myAssignment, me]);

  const fetchMembers = useCallback(async () => {
    if (!assignmentLoaded) return;
    setLoading(true);

    // ── Resolve scoped user_ids via assignments table ──
    // Uses supabaseAdmin to bypass RLS (same pattern as Submissions page).
    let scopedUserIds: string[] | null = null;

    const resolveRegion = async (dist: string | null | undefined, st: string | null | undefined) => {
      let aQ = supabaseAdmin.from('assignments').select('user_id').eq('assignment_type', 'region');
      if (dist) aQ = aQ.ilike('assigned_district', dist);
      else if (st) aQ = aQ.ilike('assigned_state', st);
      else return [];
      const { data } = await aQ;
      return (data || []).map((r: { user_id: string }) => r.user_id);
    };

    const resolveUniversity = async (uni: string | null | undefined) => {
      if (!uni) return [];
      const { data } = await supabaseAdmin
        .from('assignments')
        .select('user_id')
        .eq('assignment_type', 'university')
        .ilike('assigned_university', uni);
      return (data || []).map((r: { user_id: string }) => r.user_id);
    };

    if (accessTier === 'regional') {
      const dist = myAssignment?.assigned_district || me?.residence_district;
      const st = myAssignment?.assigned_state || me?.state;
      scopedUserIds = await resolveRegion(dist, st);
      if (user && !scopedUserIds.includes(user.id)) scopedUserIds.push(user.id);
    } else if (accessTier === 'university') {
      const uni = myAssignment?.assigned_university || me?.current_region_or_college;
      scopedUserIds = await resolveUniversity(uni);
      if (user && !scopedUserIds.includes(user.id)) scopedUserIds.push(user.id);
    } else if (accessTier === 'volunteer') {
      // Volunteer — determine their scope from assignment_type
      if (myAssignment?.assignment_type === 'university') {
        const uni = myAssignment.assigned_university || me?.current_region_or_college;
        scopedUserIds = await resolveUniversity(uni);
      } else if (myAssignment?.assignment_type === 'region') {
        const dist = myAssignment.assigned_district || me?.residence_district;
        const st = myAssignment.assigned_state || me?.state;
        scopedUserIds = await resolveRegion(dist, st);
      } else {
        // No assignment — fallback: try profile residence_district
        const dist = me?.residence_district;
        if (dist) {
          scopedUserIds = await resolveRegion(dist, me?.state);
        } else {
          scopedUserIds = user ? [user.id] : [];
        }
      }
      if (user && !scopedUserIds.includes(user.id)) scopedUserIds.push(user.id);
    }

    // ── Get profiles — use supabaseAdmin to bypass RLS ──
    let q = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('joined_on', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Scope filter using assignment-based user_ids
    if (scopedUserIds !== null) {
      if (scopedUserIds.length === 0) {
        setMembers([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
      q = q.in('id', scopedUserIds);
    }

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
    const { data: urData } = await supabaseAdmin
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

    // University-scoped: only show Volunteers from their college
    if (accessTier === 'university' || (accessTier === 'volunteer' && myAssignment?.assignment_type === 'university')) {
      combined = combined.filter((m) => m.roles.length === 0 || m.roles.includes('Volunteer'));
    }

    // Client-side role filter (only meaningful for global/regional views)
    if (roleFilter !== 'all') {
      combined = combined.filter((m) => m.roles.includes(roleFilter as RoleName));
    }

    setMembers(combined);
    setLoading(false);
  }, [page, search, roleFilter, accessTier, myAssignment, assignmentLoaded, user, me]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { setPage(0); }, [search, roleFilter]);

  // ── Audit logger ──
  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert({
      admin_id: me?.id, action, target_type: 'user', target_id: targetId, details,
    });
  };

  // ── Add Member ──
  // Uses inviteUserByEmail: creates the account and emails a login link automatically via SMTP.
  const handleAdd = async () => {
    if (!addForm.email || !addForm.full_name || addForm.roles.length === 0) {
      toast({ title: 'Missing fields', description: 'Name, email, and at least one role are required.', variant: 'destructive' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      toast({ title: 'Invalid email format', variant: 'destructive' });
      return;
    }
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      toast({
        title: 'Server not configured',
        description: 'VITE_SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.',
        variant: 'destructive',
      });
      return;
    }

    setAddLoading(true);
    try {
      // ── Step 1: Try inviteUserByEmail (creates account + sends email via SMTP) ──
      // If SMTP is misconfigured the invite call returns a 500. In that case we
      // fall back to createUser + generateLink so the admin can copy/paste the link.
      let newUserId: string;
      let emailSent = false;

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        addForm.email,
        {
          redirectTo: `${import.meta.env.VITE_SITE_URL ?? 'https://aawaajmovement.org'}/admin`,
          data: {
            full_name: addForm.full_name,
            mobile_no: addForm.mobile_no || null,
            residence_district: addForm.residence_district || null,
            current_region_or_college: addForm.current_region_or_college || null,
            gender: addForm.gender || null,
            dob: addForm.dob || null,
          },
        }
      );

      if (inviteError) {
        const status = (inviteError as { status?: number }).status;
        // 422 = email already registered — hard stop
        if (status === 422) throw new Error(`${inviteError.message} (this email is already registered)`);
        // 401 = bad service role key — hard stop
        if (status === 401) throw new Error(`${inviteError.message} (service role key is invalid — check VITE_SUPABASE_SERVICE_ROLE_KEY)`);
        // 500 = SMTP failure — fall back to createUser + magic link
        console.warn('[handleAdd] invite email failed (SMTP?), falling back to createUser:', inviteError.message);

        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: addForm.email,
          email_confirm: true,
          user_metadata: {
            full_name: addForm.full_name,
            mobile_no: addForm.mobile_no || null,
            residence_district: addForm.residence_district || null,
            current_region_or_college: addForm.current_region_or_college || null,
            gender: addForm.gender || null,
            dob: addForm.dob || null,
          },
        });
        if (createError) throw new Error(`${createError.message} (Supabase internal error — check dashboard logs)`);
        newUserId = createData.user.id;
        emailSent = false;
      } else {
        newUserId = inviteData.user.id;
        emailSent = true;
      }

      // ── Step 2: Wait for on_auth_user_created trigger ──
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // ── Step 3: Upsert full profile metadata ──
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUserId,
        full_name: addForm.full_name,
        mobile_no: addForm.mobile_no || null,
        gender: addForm.gender || null,
        dob: addForm.dob || null,
        residence_district: addForm.residence_district || null,
        current_region_or_college: addForm.current_region_or_college || null,
      }, { onConflict: 'id' });
      if (profileError) console.warn('[handleAdd] profile upsert warning:', profileError);

      // ── Step 4: Assign roles ──
      for (const rName of addForm.roles) {
        const roleRow = dbRoles.find((r) => r.name === rName);
        if (roleRow) {
          const { error: roleError } = await supabase.from('user_roles').upsert(
            { user_id: newUserId, role_id: roleRow.id, granted_by: user?.id },
            { onConflict: 'user_id,role_id', ignoreDuplicates: true }
          );
          if (roleError) console.warn('[handleAdd] role upsert warning:', roleError);
        }
      }

      // ── Step 5: Audit log ──
      await logAudit('add_member', newUserId, {
        email: addForm.email,
        full_name: addForm.full_name,
        roles_assigned: addForm.roles,
        email_sent: emailSent,
      });

      const capturedName = addForm.full_name;
      const capturedEmail = addForm.email;
      setAddOpen(false);
      setAddForm({ email: '', full_name: '', mobile_no: '', gender: '', dob: '', residence_district: '', current_region_or_college: '', roles: [] });
      fetchMembers();

      if (emailSent) {
        toast({
          title: 'Invitation sent ✨',
          description: `An email has been sent to ${capturedEmail} with a link to set their password.`,
        });
      } else {
        // SMTP unavailable — generate magic link for admin to share manually
        // Use 'recovery' (password-reset) type so the link lands on the
        // /reset-password page where the user sets their new password.
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: capturedEmail,
          options: { redirectTo: `${import.meta.env.VITE_SITE_URL ?? 'https://aawaajmovement.org'}/reset-password` },
        });
        if (linkData?.properties?.action_link) {
          setMagicLinkInfo({ name: capturedName, email: capturedEmail, link: linkData.properties.action_link });
        } else {
          toast({ title: 'Member added', description: `Account created for ${capturedEmail}. Ask them to use "Forgot Password" to set their password.` });
        }
      }
    } catch (err: unknown) {
      console.error('[handleAdd] caught error:', err);
      toast({
        title: 'Error adding member',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
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
      const uid = deleteMember.id;

      // 1. Audit log FIRST (while the user still exists so FK references are valid)
      await logAudit('delete_member', uid, { email: deleteMember.email, name: deleteMember.full_name });

      // 2. Manually remove dependent rows — some Supabase projects don't have
      //    true ON DELETE CASCADE wired up at the DB level, which causes GoTrue
      //    to return 500 "unexpected_failure" when it tries to cascade internally.
      await supabase.from('user_roles').delete().eq('user_id', uid);
      await supabaseAdmin.from('profiles').delete().eq('id', uid);

      // 3. Now delete from auth.users (no more dependents → no cascade failure)
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (authDeleteError) throw authDeleteError;

      toast({ title: 'Member removed', description: `${deleteMember.full_name} has been permanently removed.` });
      setDeleteMember(null);
      fetchMembers();
    } catch (err: unknown) {
      console.error('[handleDelete]', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to remove member', variant: 'destructive' });
    } finally { setDeleteLoading(false); }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // No-access guard: Content Head has no business here
  if (accessTier === 'none') {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="text-lg font-semibold text-foreground">Access Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your current role does not include access to the Members directory.
        </p>
      </div>
    );
  }

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <SEO title={pageTitle} description="Manage Aawaaj Movement team members, roles, and invitations." noIndex />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#002D04]">{pageTitle}</h2>
          <p className="text-sm text-gray-500">
            {accessTier === 'global' && `${totalCount} total members`}
            {accessTier === 'regional' && `${totalCount} member${totalCount !== 1 ? 's' : ''} in your region`}
            {accessTier === 'university' && `${totalCount} volunteer${totalCount !== 1 ? 's' : ''} in your college`}
            {accessTier === 'volunteer' && `${totalCount} team member${totalCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
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
        {/* Role filter — only available for global view; regional/university scope is already fixed */}
        {accessTier === 'global' && (
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
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
              {canManage && <TableHead className="w-10" />}
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
                  {canManage && (
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
            <DialogDescription>Fill in the member's details and assign their roles. An invitation email will be sent automatically with a link to set their password.</DialogDescription>
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
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                <strong>How it works:</strong> An invitation email is sent to the member with a link to set their password and access the admin panel directly.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addLoading || !addForm.email || !addForm.full_name || addForm.roles.length === 0} className="bg-[#002D04] hover:bg-[#004d0a]">
              {addLoading ? 'Sending...' : 'Add & Send Invite Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Magic Link Fallback Dialog ── */}
      <Dialog open={!!magicLinkInfo} onOpenChange={(o) => { if (!o) { setMagicLinkInfo(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#002D04]" /> Share Login Link
            </DialogTitle>
            <DialogDescription>
              Email delivery is unavailable (SMTP not configured). Copy the link below and share it with <strong>{magicLinkInfo?.name}</strong> via WhatsApp, Telegram, or any channel. When they open it they will be prompted to <strong>set a new password</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="break-all font-mono text-xs text-gray-600 select-all">{magicLinkInfo?.link}</p>
            </div>
            <Button onClick={copyMagicLink} className="w-full gap-2 bg-[#002D04] hover:bg-[#004d0a]">
              {copied
                ? <><Check className="h-4 w-4" /> Copied!</>
                : <><Copy className="h-4 w-4" /> Copy Link</>}
            </Button>
            <p className="text-center text-xs text-amber-600">
              ⚠️ Fix this permanently: Supabase Dashboard → Project Settings → Auth → SMTP Settings — verify your host, port, username and password.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMagicLinkInfo(null); setCopied(false); }}>Done</Button>
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
    </>
  );
}
