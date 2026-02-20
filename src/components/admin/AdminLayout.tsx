import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';
import type { RoleName } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  FileText,
  ScrollText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Home,
  BookOpen,
  History,
  Heart,
  Settings,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';

interface SideLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  roles: RoleName[]; // empty = visible to ALL authenticated
}

const allLinks: SideLink[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: [] },
  {
    to: '/admin/members',
    label: 'Members',
    icon: Users,
    roles: ['President', 'Technical Head', 'Content Head', 'Regional Head', 'University President'],
  },
  { to: '/admin/submissions', label: 'Submissions', icon: FileText, roles: ['President', 'Regional Head', 'University President'] },
  { to: '/admin/career-history', label: 'Career Tree', icon: History, roles: ['President', 'Technical Head', 'Content Head'] },
  { to: '/admin/blogs', label: 'Blogs', icon: BookOpen, roles: ['President', 'Content Head'] },
  { to: '/admin/my-impact', label: 'My Impact', icon: Heart, roles: ['Volunteer'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['President'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['President'] },
];

export default function AdminLayout() {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleLinks = useMemo(
    () =>
      allLinks.filter((l) => {
        if (l.roles.length === 0) return true; // visible to everyone
        return l.roles.some((r) => roles.includes(r));
      }),
    [roles]
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const roleLabel = roles.length > 0 ? roles.join(', ') : 'Member';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#002D04] text-white transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F4C430]">
              <span className="text-sm font-bold text-[#002D04]">A</span>
            </div>
            <span className="text-lg font-bold">Aawaaj Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/70 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-[#F4C430]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/10 p-3">
          <a
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Home className="h-5 w-5" />
            Back to Site
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden lg:block">
            <h1 className="text-sm font-medium text-gray-500">
              Welcome back, <span className="text-[#002D04]">{profile?.full_name}</span>
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#002D04] text-xs text-[#F4C430]">
                    {profile ? getInitials(profile.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">{roleLabel}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs text-gray-500">
                {profile?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
