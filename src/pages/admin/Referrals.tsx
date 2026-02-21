import { useEffect, useState, useCallback } from 'react';
import SEO from '@/components/SEO';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, formatDate } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  GitBranch,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Trophy,
  Medal,
  Award,
  UserCheck,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReferredMember {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  joined_on: string;
  role: string;
}

interface ReferralEntry {
  referrerId: string;
  referrerName: string;
  referrerPhoto: string | null;
  referrerRole: string;
  referralCount: number;
  referred: ReferredMember[];
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
        <Trophy className="h-4 w-4 text-amber-500" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
        <Medal className="h-4 w-4 text-slate-500" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
        <Award className="h-4 w-4 text-orange-500" />
      </span>
    );
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const { profile: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ReferralEntry[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all profiles that were referred by someone
      const { data: referredProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url, joined_on, referred_by')
        .not('referred_by', 'is', null);

      if (!referredProfiles || referredProfiles.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // 2. Collect unique referrer IDs
      const referrerIds = [...new Set(referredProfiles.map((p) => p.referred_by as string))];

      // 3. Fetch referrer profiles
      const { data: referrerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url, joined_on')
        .in('id', referrerIds);

      // 4. Fetch roles for every person involved (referrers + referred)
      const allIds = [
        ...referrerIds,
        ...referredProfiles.map((p) => p.id),
      ];
      const { data: userRoleRows } = await supabase
        .from('user_roles')
        .select('user_id, roles(name)')
        .in('user_id', allIds);

      // Build a userId → role name map
      const roleMap = new Map<string, string>();
      (userRoleRows || []).forEach((row: { user_id: string; roles: { name: string }[] | { name: string } | null }) => {
        const roleName = Array.isArray(row.roles) ? row.roles[0]?.name : row.roles?.name;
        if (roleName && !roleMap.has(row.user_id)) {
          roleMap.set(row.user_id, roleName);
        }
      });

      // 5. Group referred members by referrer
      const referredGrouped = new Map<string, ReferredMember[]>();
      referredProfiles.forEach((p) => {
        const referrerId = p.referred_by as string;
        if (!referredGrouped.has(referrerId)) referredGrouped.set(referrerId, []);
        referredGrouped.get(referrerId)!.push({
          id: p.id,
          full_name: p.full_name,
          profile_photo_url: p.profile_photo_url,
          joined_on: p.joined_on,
          role: roleMap.get(p.id) || 'Volunteer',
        });
      });

      // 6. Assemble entries sorted by count desc
      const result: ReferralEntry[] = (referrerProfiles || []).map((rp) => ({
        referrerId: rp.id,
        referrerName: rp.full_name,
        referrerPhoto: rp.profile_photo_url,
        referrerRole: roleMap.get(rp.id) || 'Volunteer',
        referralCount: referredGrouped.get(rp.id)?.length ?? 0,
        referred: (referredGrouped.get(rp.id) || []).sort(
          (a, b) => new Date(b.joined_on).getTime() - new Date(a.joined_on).getTime()
        ),
      }));

      result.sort((a, b) => b.referralCount - a.referralCount);
      setEntries(result);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = entries.filter((e) =>
    search.trim()
      ? e.referrerName.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const totalReferrals = entries.reduce((s, e) => s + e.referralCount, 0);
  const topReferrer = entries[0];

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading referral data…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Referrals" description="Track member referral activity in Aawaaj Movement." noIndex />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Referral Tracking</h1>
          <p className="text-sm text-muted-foreground">
            See which members are bringing others into the movement and how the network grows.
          </p>
        </div>

        {/* Summary stat cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <GitBranch className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{totalReferrals}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Total Referred Members</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-emerald-600">{entries.length}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Active Referrers</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-amber-600 truncate">
              {topReferrer ? topReferrer.referrerName.split(' ')[0] : '—'}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Top Referrer
              {topReferrer ? ` · ${topReferrer.referralCount} members` : ''}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search referrer name…"
            className="rounded-xl pl-9"
          />
        </div>

        {/* Leaderboard Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-20 text-muted-foreground">
            <Users className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">
              {search ? 'No referrers match your search.' : 'No referral data yet.'}
            </p>
            <p className="mt-1 text-xs">
              Referrals are tracked when a member is created from a submission that has a "Recommended By" name.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_auto_100px] items-center gap-4 border-b border-border bg-muted/30 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>#</span>
              <span>Member</span>
              <span>Role</span>
              <span className="text-right">Referred</span>
            </div>

            {/* Rows */}
            {filtered.map((entry, idx) => {
              const isOpen = expanded.has(entry.referrerId);
              const rank = entries.indexOf(entry) + 1;
              return (
                <div key={entry.referrerId} className="border-b border-border/60 last:border-0">
                  {/* Main row */}
                  <button
                    onClick={() => toggleExpand(entry.referrerId)}
                    className="grid w-full grid-cols-[40px_1fr_auto_100px] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
                  >
                    <RankBadge rank={rank} />

                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={entry.referrerPhoto || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(entry.referrerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {entry.referrerName}
                      </span>
                    </div>

                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {entry.referrerRole}
                    </Badge>

                    <div className="flex items-center justify-end gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                        {entry.referralCount}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded referred list */}
                  {isOpen && (
                    <div className="border-t border-border/40 bg-muted/10 px-5 py-3">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Members referred by {entry.referrerName.split(' ')[0]}
                      </p>
                      <div className="space-y-2">
                        {entry.referred.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-xl border border-border/60 bg-white px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={m.profile_photo_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-muted">
                                  {getInitials(m.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-sm font-medium text-foreground">
                                {m.full_name}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 pl-4">
                              <Badge variant="outline" className="text-xs">
                                {m.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Joined {formatDate(m.joined_on)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
