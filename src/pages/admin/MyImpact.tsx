import { useEffect, useState, useCallback } from 'react';
import SEO from '@/components/SEO';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import type { CareerHistory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Award, Clock, TrendingUp, Star, Sparkles } from 'lucide-react';

export default function MyImpactPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [careerEntries, setCareerEntries] = useState<CareerHistory[]>([]);
  const [referralCount, setReferralCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [careerRes, referralRes] = await Promise.all([
      supabase
        .from('career_history')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', user.id),
    ]);

    setCareerEntries((careerRes.data || []) as CareerHistory[]);
    setReferralCount(referralRes.count || 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeRoles = careerEntries.filter((c) => !c.end_date);
  const pastRoles = careerEntries.filter((c) => c.end_date);
  const totalAchievements = careerEntries.reduce(
    (acc, c) => acc + (c.key_achievements ? c.key_achievements.split(',').length : 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading your impact...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: Users, label: 'People Referred', value: referralCount, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { icon: Star, label: 'Active Roles', value: activeRoles.length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { icon: Clock, label: 'Total Roles Held', value: careerEntries.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { icon: Award, label: 'Achievements', value: totalAchievements, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  return (
    <>
      <SEO title="My Impact" description="View your personal impact, roles, and achievements in Aawaaj Movement." noIndex />
      <div className="space-y-8">
        {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white">
        <div className="absolute inset-0 opacity-5">
          <div className="digital-network-grid" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent shadow-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              Welcome, {profile?.full_name?.split(' ')[0] || 'Volunteer'}! 🎯
            </h2>
            <p className="mt-0.5 text-sm text-white/70">Your journey & impact within Aawaaj Movement</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border ${card.border} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Active Roles */}
      {activeRoles.length > 0 && (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Current Active Roles</h3>
          </div>
          <div className="p-4 space-y-3">
            {activeRoles.map((c) => (
              <div key={c.id} className="flex items-start justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div>
                  <Badge className="bg-primary text-primary-foreground">{c.role_name}</Badge>
                  <p className="mt-1.5 text-xs text-muted-foreground">Since {formatDate(c.start_date)}</p>
                  {c.summary_of_work && <p className="mt-1 text-sm text-foreground/80">{c.summary_of_work}</p>}
                </div>
                {c.key_achievements && (
                  <div className="ml-4 text-right shrink-0">
                    <p className="text-xs font-medium text-muted-foreground">Achievements</p>
                    <p className="mt-0.5 text-xs text-foreground/80">{c.key_achievements}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Career Timeline */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Heart className="h-4 w-4 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Career Timeline</h3>
        </div>
        <div className="p-6">
          {careerEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">Your Aawaaj journey begins when you get your first role.</p>
            </div>
          ) : (
            <div className="relative ml-4 space-y-0 border-l-2 border-primary/20 pl-6">
              {careerEntries.map((entry) => (
                <div key={entry.id} className="relative pb-8 last:pb-0">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 shadow-sm ${
                      !entry.end_date
                        ? 'border-emerald-500 bg-emerald-300 shadow-emerald-200'
                        : 'border-muted-foreground/30 bg-muted'
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Badge
                      className={!entry.end_date ? 'bg-primary text-primary-foreground' : ''}
                      variant={!entry.end_date ? 'default' : 'outline'}
                    >
                      {entry.role_name}
                    </Badge>
                    {!entry.end_date && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Active
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.start_date)} – {entry.end_date ? formatDate(entry.end_date) : 'Present'}
                    </span>
                  </div>
                  {entry.summary_of_work && (
                    <p className="mt-1.5 text-sm text-foreground/80">{entry.summary_of_work}</p>
                  )}
                  {entry.key_achievements && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Award className="mr-1 inline-block h-3 w-3 text-accent" />
                      {entry.key_achievements}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
