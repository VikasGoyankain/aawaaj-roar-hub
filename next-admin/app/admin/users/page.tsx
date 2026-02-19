import { redirect } from "next/navigation";
import { requireAdminProfile } from "@/lib/auth";
import { UserInviteForm } from "@/components/UserInviteForm";
import { UserRowActions } from "@/components/UserRowActions";

export default async function UserManagementPage() {
  const { supabase, profile } = await requireAdminProfile();

  if (profile.role !== "President") {
    redirect("/admin");
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, region, created_at")
    .order("created_at", { ascending: false });

  return (
    <section className="space-y-6">
      <UserInviteForm />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h2 className="text-lg font-semibold text-forest">User Management</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role / Region</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr key={user.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4">{user.full_name}</td>
                  <td className="py-3 pr-4">{user.email}</td>
                  <td className="py-3 pr-4">
                    <p>{user.role}</p>
                    <p className="text-xs text-slate-500">{user.region}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <UserRowActions userId={user.id} currentRole={user.role} currentRegion={user.region} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
