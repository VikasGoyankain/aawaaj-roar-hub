import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleName, Profile, ProfileWithRoles } from '@/lib/types';
import { ALL_ROLES } from '@/lib/validations';
import { getInitials } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Shield, Users, Search, Save, Info, ShieldAlert } from 'lucide-react';

// ── Role permission descriptions ──
const ROLE_PERMISSIONS: Record<RoleName, { description: string; permissions: string[] }> = {
  President: {
    description: 'Supreme authority. Full read/write/delete access to everything.',
    permissions: [
      'View & manage all members',
      'Assign & revoke any role',
      'Full access to submissions',
      'Manage career history entries',
      'Manage all blogs',
      'View all audit logs',
      'Delete members',
    ],
  },
  'Technical Head': {
    description: 'Manages the technical wing of the movement.',
    permissions: [
      'View all members',
      'View all career history',
      'View user roles',
      'Access the dashboard',
    ],
  },
  'Content Head': {
    description: 'Manages blogs, content, and publications.',
    permissions: [
      'View all members',
      'Create, edit, publish blogs',
      'Delete any blog post',
      'View all career history',
      'View user roles',
    ],
  },
  'Regional Head': {
    description: 'Oversees members and submissions for their region/state.',
    permissions: [
      'View members in their region',
      'View & update submissions in their region',
      'View user roles',
      'Access the dashboard (region-filtered)',
    ],
  },
  'University President': {
    description: 'College-level representative with read access.',
    permissions: [
      'View members in their region',
      'View submissions in their region',
      'Access the dashboard (region-filtered)',
    ],
  },
  Volunteer: {
    description: 'Base member role assigned to every user at signup.',
    permissions: [
      'View own profile',
      'Edit own profile',
      'View "My Impact" dashboard',
      'View own career history',
    ],
  },
};

const roleBadgeColor: Record<string, string> = {
  President: 'bg-purple-100 text-purple-700',
  'Technical Head': 'bg-indigo-100 text-indigo-700',
  'Content Head': 'bg-pink-100 text-pink-700',
  'Regional Head': 'bg-blue-100 text-blue-700',
  'University President': 'bg-cyan-100 text-cyan-700',
  Volunteer: 'bg-gray-100 text-gray-700',
};

export default function SettingsPage() {
  const { hasRole, profile: me, user } = useAuth();
  const { toast } = useToast();

  // ── Members with roles (for quick role assignment) ──
  const [members, setMembers] = useState<ProfileWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dbRoles, setDbRoles] = useState<{ id: number; name: RoleName }[]>([]);

  // ── Edit roles dialog ──
  const [editMember, setEditMember] = useState<ProfileWithRoles | null>(null);
  const [editRoles, setEditRoles] = useState<RoleName[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('roles').select('*').then(({ data }) => {
      if (data) setDbRoles(data as { id: number; name: RoleName }[]);
    });
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    const pList = (profiles || []) as Profile[];
    if (pList.length === 0) { setMembers([]); setLoading(false); return; }

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

    setMembers(pList.map((p) => ({ ...p, roles: roleMap.get(p.id) || [] })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filteredMembers = search
    ? members.filter((m) =>
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  const openEdit = (m: ProfileWithRoles) => {
    setEditMember(m);
    setEditRoles([...m.roles]);
  };

  const handleSaveRoles = async () => {
    if (!editMember) return;
    setSaving(true);
    try {
      const current = editMember.roles;
      const toAdd = editRoles.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !editRoles.includes(r));

      for (const rName of toAdd) {
        const roleRow = dbRoles.find((r) => r.name === rName);
        if (roleRow) {
          await supabase.from('user_roles').insert({
            user_id: editMember.id,
            role_id: roleRow.id,
            granted_by: user?.id,
          });
        }
      }

      for (const rName of toRemove) {
        const roleRow = dbRoles.find((r) => r.name === rName);
        if (roleRow) {
          await supabase.from('user_roles').delete()
            .eq('user_id', editMember.id)
            .eq('role_id', roleRow.id);
        }
      }

      await supabase.from('audit_logs').insert({
        admin_id: me?.id,
        action: 'manage_roles',
        target_type: 'user',
        target_id: editMember.id,
        details: {
          user_name: editMember.full_name,
          added: toAdd,
          removed: toRemove,
          resulting: editRoles,
        },
      });

      toast({ title: 'Roles updated', description: `${editMember.full_name}'s permissions updated.` });
      setEditMember(null);
      fetchMembers();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (!hasRole(['President'])) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Access Restricted</p>
        <p className="text-sm text-gray-400">Only the President can manage role settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#002D04]">Settings & Permissions</h2>
        <p className="text-sm text-gray-500">View role definitions and manage user permissions</p>
      </div>

      {/* ── Section 1: Role Definitions ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-[#002D04]" /> Role Definitions
          </CardTitle>
          <CardDescription>
            Each role grants specific permissions. Users can hold multiple roles simultaneously.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_ROLES.map((roleName) => {
            const info = ROLE_PERMISSIONS[roleName];
            return (
              <div key={roleName} className="rounded-lg border p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={roleBadgeColor[roleName]} variant="secondary">
                    {roleName}
                  </Badge>
                  <span className="text-sm text-gray-500">{info.description}</span>
                </div>
                <div className="ml-1 grid gap-1 sm:grid-cols-2">
                  {info.permissions.map((perm) => (
                    <div key={perm} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#002D04]" />
                      {perm}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Section 2: Quick Role Assignment ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-[#002D04]" /> Assign Roles to Members
          </CardTitle>
          <CardDescription>
            Click on a member to toggle their roles. Changes are applied immediately and logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Current Roles</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-gray-400">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {m.profile_photo_url ? <AvatarImage src={m.profile_photo_url} /> : null}
                              <AvatarFallback className="bg-[#002D04] text-[10px] text-white">
                                {getInitials(m.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{m.full_name}</p>
                              <p className="text-xs text-gray-400">{m.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {m.roles.length > 0 ? m.roles.map((r) => (
                              <Badge key={r} className={roleBadgeColor[r]} variant="secondary">{r}</Badge>
                            )) : <span className="text-xs text-gray-400">No roles</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {m.id !== me?.id ? (
                            <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                              <Shield className="mr-1 h-3 w-3" /> Edit
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">You</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Roles Dialog ── */}
      <Dialog open={!!editMember} onOpenChange={(o) => !o && setEditMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#F4C430]" /> Edit Roles
            </DialogTitle>
            <DialogDescription>
              Toggle roles for <strong>{editMember?.full_name}</strong>. Changes are logged in audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {ALL_ROLES.map((r) => {
              const isActive = editRoles.includes(r);
              return (
                <div
                  key={r}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    isActive ? 'border-[#002D04]/30 bg-green-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={roleBadgeColor[r]} variant="secondary">{r}</Badge>
                    <span className="text-xs text-gray-500">{ROLE_PERMISSIONS[r].description.slice(0, 50)}...</span>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => {
                      setEditRoles((prev) =>
                        checked ? [...prev, r] : prev.filter((x) => x !== r)
                      );
                    }}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button
              onClick={handleSaveRoles}
              disabled={saving || editRoles.length === 0}
              className="bg-[#002D04] hover:bg-[#004d0a]"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
