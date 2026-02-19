import Link from "next/link";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminOverviewPage() {
  const { supabase, profile } = await requireAdminProfile();

  const profileQuery =
    profile.role === "President"
      ? supabase.from("profiles").select("id", { count: "exact", head: true })
      : supabase.from("profiles").select("id", { count: "exact", head: true }).eq("region", profile.region);

  const submissionsQuery =
    profile.role === "President"
      ? supabase.from("submissions").select("id", { count: "exact", head: true })
      : supabase.from("submissions").select("id", { count: "exact", head: true }).eq("region", profile.region);

  const newReportsQuery =
    profile.role === "President"
      ? supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("submission_type", "Victim Report")
          .eq("status", "New")
      : supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("submission_type", "Victim Report")
          .eq("status", "New")
          .eq("region", profile.region);

  const [usersRes, submissionsRes, newReportsRes, logsRes] = await Promise.all([
    profileQuery,
    submissionsQuery,
    newReportsQuery,
    supabase
      .from("audit_logs")
      .select("action, timestamp")
      .order("timestamp", { ascending: false })
      .limit(6),
  ]);

  const stats = [
    { title: "Total Members", value: usersRes.count ?? 0 },
    { title: "Total Submissions", value: submissionsRes.count ?? 0 },
    { title: "New Victim Reports", value: newReportsRes.count ?? 0 },
    { title: "Your Scope", value: profile.role === "President" ? "All Regions" : profile.region },
  ];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {stats.map((card) => (
          <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-medium text-slate-500">{card.title}</h2>
            <p className="mt-2 text-3xl font-bold text-forest">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <h3 className="text-lg font-semibold text-forest">Quick Actions</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/submissions" className="rounded-md bg-saffron px-4 py-2 font-semibold text-black">
              Review Submissions
            </Link>
            {profile.role === "President" && (
              <Link href="/admin/users" className="rounded-md border border-forest px-4 py-2 font-semibold text-forest">
                Manage Users
              </Link>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="text-lg font-semibold text-forest">Recent Audit Logs</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(logsRes.data ?? []).map((log) => (
              <li key={`${log.action}-${log.timestamp}`} className="rounded border border-slate-200 p-2">
                <p className="font-medium">{log.action}</p>
                <p className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
              </li>
            ))}
            {(!logsRes.data || logsRes.data.length === 0) && <li className="text-slate-500">No logs yet.</li>}
          </ul>
        </article>
      </div>
    </section>
  );
}
