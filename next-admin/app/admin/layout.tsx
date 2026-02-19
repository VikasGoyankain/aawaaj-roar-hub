import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { InactivityLogout } from "@/components/InactivityLogout";
import { env } from "@/lib/env";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdminProfile();

  return (
    <div className="min-h-screen bg-slate-50">
      <InactivityLogout timeoutMs={env.inactivityTimeoutMs} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-slate-500">Aawaaj Movement</p>
            <h1 className="text-xl font-bold text-forest">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-700">{profile.full_name} • {profile.role}</span>
            <form action={logoutAction}>
              <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium">Logout</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-4 px-6 pb-4 text-sm font-medium">
          <Link href="/admin" className="text-forest">Overview</Link>
          <Link href="/admin/users" className="text-forest">User Management</Link>
          <Link href="/admin/submissions" className="text-forest">Submissions</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
