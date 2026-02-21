import { useMemo, useState, Fragment } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
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
  ChevronRight,
  Home,
  BookOpen,
  History,
  Heart,
  Settings,
  UserCircle,
  Shield,
  LayoutTemplate,
  GitBranch,
  MapPinned,
  Search,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SideLink {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  roles: RoleName[];
  group: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  links: SideLink[];
}

/* ------------------------------------------------------------------ */
/*  Link definitions with group assignment                             */
/* ------------------------------------------------------------------ */

const allLinks: SideLink[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: [], group: 'overview' },
  { to: '/admin/my-impact', label: 'My Impact', icon: Heart, roles: ['Volunteer'], group: 'overview' },
  { to: '/admin/members', label: 'Members', icon: Users, roles: ['President', 'Technical Head', 'Regional Head', 'University President', 'Volunteer'], group: 'people' },
  { to: '/admin/submissions', label: 'Submissions', icon: FileText, roles: ['President', 'Technical Head', 'Regional Head', 'University President'], group: 'people' },
  { to: '/admin/referrals', label: 'Referrals', icon: GitBranch, roles: ['President', 'Technical Head', 'Regional Head'], group: 'people' },
  { to: '/admin/assignments', label: 'Assignments', icon: MapPinned, roles: ['President', 'Technical Head', 'Regional Head', 'University President'], group: 'people' },
  { to: '/admin/career-history', label: 'Career Tree', icon: History, roles: ['President', 'Technical Head', 'Content Head'], group: 'content' },
  { to: '/admin/blogs', label: 'Blogs', icon: BookOpen, roles: ['President', 'Technical Head', 'Content Head'], group: 'content' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['President', 'Technical Head'], group: 'system' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['President', 'Technical Head'], group: 'system' },
  { to: '/admin/footer-settings', label: 'Footer', icon: LayoutTemplate, roles: ['President', 'Technical Head'], group: 'system' },
];

const groupMeta: Record<string, { label: string; icon: LucideIcon }> = {
  overview: { label: 'Overview', icon: LayoutDashboard },
  people:   { label: 'People & Data', icon: Users },
  content:  { label: 'Content', icon: BookOpen },
  system:   { label: 'System', icon: Settings },
};

/* ------------------------------------------------------------------ */
/*  Collapsible group component                                        */
/* ------------------------------------------------------------------ */

function SidebarGroup({
  group,
  isOpen,
  onToggle,
  onLinkClick,
  pathname,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick: () => void;
  pathname: string;
}) {
  const hasActive = group.links.some(
    (l) => pathname === l.to || (!l.end && pathname.startsWith(l.to + '/'))
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
          hasActive ? 'text-accent' : 'text-white/40 hover:text-white/70'
        )}
      >
        <span className="flex items-center gap-2">
          <group.icon className="h-3.5 w-3.5" />
          {group.label}
        </span>
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-white/10 pl-2">
          {group.links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onLinkClick}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
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
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin Layout                                                       */
/* ------------------------------------------------------------------ */

export default function AdminLayout() {
  const { profile, roles, signOut } = useAuth();
  useSessionGuard();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which groups are visible
  const navGroups = useMemo<NavGroup[]>(() => {
    const filtered = allLinks.filter((l) => {
      if (l.roles.length === 0) return true;
      return l.roles.some((r) => roles.includes(r));
    });

    const groupOrder = ['overview', 'people', 'content', 'system'];
    return groupOrder
      .map((key) => ({
        key,
        label: groupMeta[key].label,
        icon: groupMeta[key].icon,
        links: filtered.filter((l) => l.group === key),
      }))
      .filter((g) => g.links.length > 0);
  }, [roles]);

  // Search-filtered flat links
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allLinks.filter((l) => {
      if (l.roles.length > 0 && !l.roles.some((r) => roles.includes(r))) return false;
      return l.label.toLowerCase().includes(q);
    });
  }, [searchQuery, roles]);

  // Track open groups – default: open the group containing current route
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = allLinks.find(
      (l) => location.pathname === l.to || (!l.end && location.pathname.startsWith(l.to + '/'))
    );
    const initial = new Set<string>();
    if (active) initial.add(active.group);
    else initial.add('overview');
    return initial;
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut();
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
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-primary text-white transition-transform duration-300 lg:static lg:translate-x-0',
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

        {/* Quick Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Find a page…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-accent/50 focus:bg-white/8 transition-colors"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {searchResults ? (
            // Search mode: flat list
            searchResults.length > 0 ? (
              searchResults.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => {
                    setSidebarOpen(false);
                    setSearchQuery('');
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-accent text-primary shadow-sm shadow-accent/20'
                        : 'text-white/60 hover:bg-white/8 hover:text-white'
                    )
                  }
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </NavLink>
              ))
            ) : (
              <p className="px-3 py-4 text-xs text-white/30 text-center">No pages found</p>
            )
          ) : (
            // Grouped mode
            navGroups.map((group) => (
              <SidebarGroup
                key={group.key}
                group={group}
                isOpen={openGroups.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
                onLinkClick={() => setSidebarOpen(false)}
                pathname={location.pathname}
              />
            ))
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-white/10 p-3 space-y-0.5">
          {/* User mini-card */}
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 mb-1">
            <Avatar className="h-8 w-8 ring-2 ring-accent/30">
              {profile?.profile_photo_url && (
                <AvatarImage src={profile.profile_photo_url} alt={profile.full_name} />
              )}
              <AvatarFallback className="bg-accent text-[10px] font-bold text-primary">
                {profile ? getInitials(profile.full_name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-white/40 truncate">{roleLabel}</p>
            </div>
          </div>

          <NavLink
            to="/admin/profile"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-primary'
                  : 'text-white/50 hover:bg-white/8 hover:text-white'
              )
            }
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            My Profile
          </NavLink>

          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/50 transition-colors hover:bg-white/8 hover:text-white"
          >
            <Home className="h-4 w-4 shrink-0" />
            Back to Site
          </Link>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white/80 px-4 shadow-sm backdrop-blur-md lg:px-6">
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
