import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, getInitials, INDIAN_REGIONS } from '@/lib/utils';
import type { Profile, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, MoreHorizontal, Shield, Trash2 } from 'lucide-react';

const ROLES: UserRole[] = ['President', 'Regional Head', 'University President', 'Volunteer'];

const roleBadgeColor: Record<UserRole, string> = {
  President: 'bg-purple-100 text-purple-700',
  'Regional Head': 'bg-blue-100 text-blue-700',
  'University President': 'bg-cyan-100 text-cyan-700',
  Volunteer: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const { profile: currentUser, hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    role: '' as UserRole | '',
    region: '',
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Role change dialog state
  const [roleChangeUser, setRoleChangeUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole | ''>('');
  const [newRegion, setNewRegion] = useState('');
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Delete dialog state
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (currentUser?.role === 'Regional Head' || currentUser?.role === 'University President') {
      query = query.eq('region', currentUser.region);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers((data as Profile[]) || []);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users
  useEffect(() => {
    let filtered = users;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.region && u.region.toLowerCase().includes(s))
      );
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    setFilteredUsers(filtered);
  }, [users, search, roleFilter]);

  // Log audit action helper
  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert({
      admin_id: currentUser?.id,
      action,
      target_type: 'user',
      target_id: targetId,
      details,
    });
  };

  const handleInviteUser = async () => {
    if (!inviteData.email || !inviteData.full_name || !inviteData.role) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    if (
      (inviteData.role === 'Regional Head' || inviteData.role === 'University President') &&
      !inviteData.region
    ) {
      toast({ title: 'Error', description: 'Region is required for this role.', variant: 'destructive' });
      return;
    }

    setInviteLoading(true);
    try {
      // Since we can't use service_role key in browser, we create the profile entry
      // and invite via Supabase Auth magic link
      const { error: inviteError } = await supabase.auth.signInWithOtp({
        email: inviteData.email,
        options: {
          data: {
            full_name: inviteData.full_name,
            role: inviteData.role,
            region: inviteData.region || null,
          },
        },
      });

      if (inviteError) throw inviteError;

      await logAudit('invite_user', inviteData.email, {
        email: inviteData.email,
        full_name: inviteData.full_name,
        role: inviteData.role,
        region: inviteData.region,
      });

      toast({ title: 'Invitation sent', description: `Magic link sent to ${inviteData.email}` });
      setInviteOpen(false);
      setInviteData({ email: '', full_name: '', role: '', region: '' });
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to invite user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeUser || !newRole) return;

    setRoleChangeLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: newRole,
          region: newRole === 'President' || newRole === 'Volunteer' ? null : newRegion || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roleChangeUser.id);

      if (error) throw error;

      await logAudit('change_role', roleChangeUser.id, {
        user_email: roleChangeUser.email,
        old_role: roleChangeUser.role,
        new_role: newRole,
        region: newRegion,
      });

      toast({
        title: 'Role updated',
        description: `${roleChangeUser.full_name}'s role changed to ${newRole}`,
      });
      setRoleChangeUser(null);
      setNewRole('');
      setNewRegion('');
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change role';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteUser.id);
      if (error) throw error;

      await logAudit('delete_user', deleteUser.id, {
        user_email: deleteUser.email,
        user_name: deleteUser.full_name,
      });

      toast({ title: 'User deleted', description: `${deleteUser.full_name} has been removed.` });
      setDeleteUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#002D04]">User Management</h2>
          <p className="text-sm text-gray-500">{users.length} total members</p>
        </div>
        {hasRole(['President', 'Regional Head']) && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-[#F4C430] text-[#002D04] hover:bg-[#dab22a]"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, email, or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Region</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              {hasRole(['President']) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#002D04] text-xs text-white">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleBadgeColor[u.role]} variant="secondary">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {u.region || <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {formatDate(u.created_at)}
                  </TableCell>
                  {hasRole(['President']) && (
                    <TableCell>
                      {u.id !== currentUser?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setRoleChangeUser(u);
                                setNewRole(u.role);
                                setNewRegion(u.region || '');
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteUser(u)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
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

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send a magic link invitation to join the admin panel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name *</Label>
              <Input
                id="invite-name"
                value={inviteData.full_name}
                onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={inviteData.role}
                onValueChange={(v) => setInviteData({ ...inviteData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(inviteData.role === 'Regional Head' || inviteData.role === 'University President') && (
              <div className="space-y-2">
                <Label>Region *</Label>
                <Select
                  value={inviteData.region}
                  onValueChange={(v) => setInviteData({ ...inviteData, region: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={inviteLoading}
              className="bg-[#002D04] hover:bg-[#004d0a]"
            >
              {inviteLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={!!roleChangeUser} onOpenChange={(open) => !open && setRoleChangeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for {roleChangeUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(newRole === 'Regional Head' || newRole === 'University President') && (
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={newRegion} onValueChange={setNewRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={roleChangeLoading}
              className="bg-[#002D04] hover:bg-[#004d0a]"
            >
              {roleChangeLoading ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.full_name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
