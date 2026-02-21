import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth, useSessionGuard } from '@/contexts/AuthContext';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Shield,
  LayoutTemplate,
  GitBranch,
  type LucideIcon,
} from 'lucide-react';

interface SideLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  roles: RoleName[];
}

const allLinks: SideLink[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: [] },
  {
    to: '/admin/members',
    label: 'Members',
    icon: Users,
    roles: ['President', 'Technical Head', 'Content Head', 'Regional Head', 'University President'],
  },
  { to: '/admin/submissions', label: 'Submissions', icon: FileText, roles: ['President', 'Technical Head', 'Regional Head', 'University President'] },
  { to: '/admin/career-history', label: 'Career Tree', icon: History, roles: ['President', 'Technical Head', 'Content Head'] },
  { to: '/admin/blogs', label: 'Blogs', icon: BookOpen, roles: ['President', 'Technical Head', 'Content Head'] },
  { to: '/admin/referrals', label: 'Referrals', icon: GitBranch, roles: ['President', 'Technical Head', 'Regional Head'] },
  { to: '/admin/my-impact', label: 'My Impact', icon: Heart, roles: ['Volunteer'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['President', 'Technical Head'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['President', 'Technical Head'] },
  { to: '/admin/footer-settings', label: 'Footer', icon: LayoutTemplate, roles: ['President', 'Technical Head'] },
];

export default function AdminLayout() {
  const { profile, roles, signOut } = useAuth();
  useSessionGuard();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleLinks = useMemo(
    () =>
      allLinks.filter((l) => {
        if (l.roles.length === 0) return true;
        return l.roles.some((r) => roles.includes(r));
      }),
    [roles]
  );

  const handleSignOut = async () => {
    await signOut(); // AuthContext clears state + storage; useSessionGuard then redirects
  };

  const roleLabel = roles.length > 0 ? roles[0] : 'Member';

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-sm">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-bold text-white leading-none block">Aawaaj Admin</span>
              <span className="text-[10px] text-white/40 leading-none">Command Centre</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-accent text-primary shadow-sm shadow-accent/20'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'
                )
              }
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/10 p-3 space-y-0.5">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/8 hover:text-white"
          >
            <Home className="h-4 w-4 shrink-0" />
            Back to Site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 shadow-sm backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground">
                Welcome back,{' '}
                <span className="font-semibold text-primary">{profile?.full_name?.split(' ')[0]}</span>
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2.5 rounded-xl px-2 hover:bg-muted">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  {profile?.profile_photo_url && (
                    <AvatarImage src={profile.profile_photo_url} alt={profile.full_name} />
                  )}
                  <AvatarFallback className="bg-primary text-xs font-bold text-accent">
                    {profile ? getInitials(profile.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold text-foreground leading-none">{profile?.full_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-none">{roleLabel}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg">
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/profile')} className="rounded-lg">
                <UserCircle className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50">
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
