import { loginAction } from "@/app/login/actions";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 grid place-items-center p-6">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-card border border-slate-200">
        <h1 className="text-2xl font-bold text-forest">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-600">Aawaaj Movement secure dashboard access.</p>

        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" required className="mt-1 w-full" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" required className="mt-1 w-full" />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-saffron px-4 py-2 font-semibold text-black transition hover:opacity-90"
          >
            Sign In
          </button>
        </form>

        <a href="/forgot-password" className="mt-4 inline-block text-sm text-forest underline">
          Forgot Password?
        </a>
      </section>
    </main>
  );
}
