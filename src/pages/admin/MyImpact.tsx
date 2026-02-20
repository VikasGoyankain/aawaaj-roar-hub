import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import type { CareerHistory, Profile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Award, Clock, TrendingUp, Star } from 'lucide-react';

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
        .order('started_at', { ascending: false }),
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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-[#002D04]">
          Welcome, {profile?.full_name?.split(' ')[0] || 'Volunteer'}!
        </h2>
        <p className="text-sm text-gray-500">Your journey & impact within Aawaaj Movement</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="People Referred"
          value={referralCount}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Active Roles"
          value={activeRoles.length}
          accent="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Total Roles Held"
          value={careerEntries.length}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Achievements"
          value={totalAchievements}
          accent="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Active Roles */}
      {activeRoles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" /> Current Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRoles.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border bg-green-50/50 p-4">
                <div>
                  <Badge className="bg-[#002D04] text-white">{c.role_name}</Badge>
                  <p className="mt-1 text-xs text-gray-500">Since {formatDate(c.start_date)}</p>
                  {c.summary_of_work && <p className="mt-1 text-sm text-gray-600">{c.summary_of_work}</p>}
                </div>
                {c.key_achievements && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-400">Achievements</p>
                    <p className="text-sm text-gray-600">{c.key_achievements}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Career Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-[#F4C430]" /> Career Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {careerEntries.length === 0 ? (
            <p className="py-8 text-center text-gray-400">Your Aawaaj journey begins when you get your first role.</p>
          ) : (
            <div className="relative ml-4 border-l-2 border-[#002D04]/20 pl-6">
              {careerEntries.map((entry, i) => (
                <div key={entry.id} className="relative mb-6 last:mb-0">
                  {/* Dot */}
                  <div
                    className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 ${
                      !entry.end_date ? 'border-green-500 bg-green-200' : 'border-gray-400 bg-gray-200'
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Badge variant={!entry.end_date ? 'default' : 'outline'}>{entry.role_name}</Badge>
                    <span className="text-xs text-gray-400">
                      {formatDate(entry.start_date)} –{' '}
                      {entry.end_date ? formatDate(entry.end_date) : 'Present'}
                    </span>
                  </div>
                  {entry.summary_of_work && <p className="mt-1 text-sm text-gray-600">{entry.summary_of_work}</p>}
                  {entry.key_achievements && (
                    <p className="mt-1 text-xs text-gray-500">
                      <Award className="mr-1 inline-block h-3 w-3" />
                      {entry.key_achievements}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* Small helper component */
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-[#002D04]">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
