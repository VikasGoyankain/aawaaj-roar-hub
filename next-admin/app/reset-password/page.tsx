import { updatePasswordAction } from "@/app/login/actions";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center p-6">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-card border border-slate-200">
        <h1 className="text-2xl font-bold text-forest">Set New Password</h1>

        <form action={updatePasswordAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="text-sm font-medium">New Password</label>
            <input id="password" name="password" type="password" required minLength={8} className="mt-1 w-full" />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-saffron px-4 py-2 font-semibold text-black transition hover:opacity-90"
          >
            Update Password
          </button>
        </form>
      </section>
    </main>
  );
}
