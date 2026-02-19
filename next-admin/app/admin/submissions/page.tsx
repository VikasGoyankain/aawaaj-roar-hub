import { updateSubmissionStatus } from "@/app/admin/submissions/actions";
import { requireAdminProfile } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SubmissionsPage({ searchParams }: PageProps) {
  const { supabase, profile } = await requireAdminProfile();
  const params = await searchParams;
  const search = params.q?.trim() ?? "";

  let query = supabase
    .from("submissions")
    .select("id, submission_type, full_name, email, phone, region, details, status, created_at")
    .order("created_at", { ascending: false });

  if (profile.role !== "President") {
    query = query.eq("region", profile.region);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,region.ilike.%${search}%`);
  }

  const { data: submissions } = await query;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h2 className="text-lg font-semibold text-forest">Form Submissions</h2>
        <form className="mt-3 flex gap-2" method="GET">
          <input name="q" placeholder="Search by name, email, region" defaultValue={search} className="w-full max-w-md" />
          <button type="submit" className="rounded-md bg-saffron px-4 py-2 font-semibold text-black">
            Search
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Region</th>
              <th className="py-2 pr-4">Submitted</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {(submissions ?? []).map((submission) => (
              <tr key={submission.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4">
                  <p className="font-medium">{submission.submission_type}</p>
                  <p className="text-xs text-slate-500">{submission.email}</p>
                </td>
                <td className="py-3 pr-4">
                  <p>{submission.full_name}</p>
                  <p className="text-xs text-slate-500">{submission.phone ?? "-"}</p>
                </td>
                <td className="py-3 pr-4">{submission.region}</td>
                <td className="py-3 pr-4">{new Date(submission.created_at).toLocaleString()}</td>
                <td className="py-3 pr-4">
                  {submission.submission_type === "Victim Report" ? (
                    <form action={updateSubmissionStatus} className="flex gap-2">
                      <input type="hidden" name="submissionId" value={submission.id} />
                      <select name="status" defaultValue={submission.status} className="w-36">
                        <option>New</option>
                        <option>In-Progress</option>
                        <option>Resolved</option>
                      </select>
                      <button className="rounded-md border border-forest px-3 py-1 text-xs font-semibold text-forest">
                        Update
                      </button>
                    </form>
                  ) : (
                    <span className="text-slate-500">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
