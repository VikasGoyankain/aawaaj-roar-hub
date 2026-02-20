import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import SEO from '@/components/SEO';

/**
 * ResetPassword page
 *
 * Supabase delivers recovery links with a URL like:
 *   https://yourapp.com/reset-password#access_token=...&type=recovery
 *
 * supabase-js detects the hash fragment, restores a temporary session, and fires
 * the PASSWORD_RECOVERY event. We listen for that event here, then show a simple
 * "Set new password" form. On success the user is redirected to /admin.
 */
export default function ResetPassword() {
  const navigate = useNavigate();

  // 'waiting'  — waiting for the PASSWORD_RECOVERY event from supabase-js
  // 'ready'    — event received, show the form
  // 'success'  — password updated, show confirmation
  // 'invalid'  — link expired / already used
  type Stage = 'waiting' | 'ready' | 'success' | 'invalid';
  const [stage, setStage] = useState<Stage>('waiting');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Strategy 1: Listen for the PASSWORD_RECOVERY auth event.
    // supabase-js fires this after processing the #access_token hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        setStage('ready');
      }
    });

    // Strategy 2: The PASSWORD_RECOVERY event may have already fired before
    // this component mounted (race condition). Poll getSession() as backup.
    // If we find a valid session while on this page, show the form.
    const checkExistingSession = async () => {
      // Give supabase-js a moment to finish processing the URL hash
      await new Promise((r) => setTimeout(r, 800));
      if (cancelled) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // We're on /reset-password with a valid session → recovery was processed
        setStage((s) => (s === 'waiting' ? 'ready' : s));
      }
    };
    checkExistingSession();

    // Strategy 3: Retry once more after a longer delay in case the network
    // token exchange is slow (e.g., high-latency connection).
    const retryTimer = setTimeout(async () => {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStage((s) => (s === 'waiting' ? 'ready' : s));
      }
    }, 3000);

    // Final fallback: if nothing worked after 8 seconds, the link is genuinely
    // invalid/expired.
    const fallback = setTimeout(() => {
      if (!cancelled) setStage((s) => (s === 'waiting' ? 'invalid' : s));
    }, 8000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(retryTimer);
      clearTimeout(fallback);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setStage('success');
      // Auto-redirect to admin after 2.5 s
      setTimeout(() => navigate('/admin', { replace: true }), 2500);
    }
  };

  /* ── Shared outer shell (matches ForgotPassword styling) ── */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-4">
      <SEO title="Reset Password" description="Set a new password for your Aawaaj Movement admin account." noIndex />
      <div className="absolute inset-0 opacity-5">
        <div className="digital-network-grid" />
      </div>
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );

  /* ── Waiting for event ── */
  if (stage === 'waiting') {
    return (
      <Shell>
        <div className="text-center text-white/60">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm">Verifying your reset link…</p>
        </div>
      </Shell>
    );
  }

  /* ── Invalid / expired link ── */
  if (stage === 'invalid') {
    return (
      <Shell>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 shadow-lg">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Link Expired</h1>
          <p className="mt-1 text-sm text-white/60">
            This reset link is invalid or has already been used.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm space-y-3">
          <Link to="/forgot-password">
            <Button className="h-11 w-full rounded-xl bg-accent font-semibold text-primary hover:bg-accent/90">
              Request a new link
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" className="h-10 w-full text-white/50 hover:text-white/80">
              Back to Login
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  /* ── Success ── */
  if (stage === 'success') {
    return (
      <Shell>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Password Set!</h1>
          <p className="mt-1 text-sm text-white/60">Redirecting you to the admin panel…</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Your password has been updated successfully. You are being signed in…</p>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── Form (stage === 'ready') ── */
  return (
    <Shell>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Set New Password</h1>
        <p className="mt-1 text-sm text-white/60">Choose a strong password for your account</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-white/80">
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-white/20 bg-white/10 pr-10 text-white placeholder:text-white/30 focus-visible:ring-accent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm font-medium text-white/80">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 border-white/20 bg-white/10 pr-10 text-white placeholder:text-white/30 focus-visible:ring-accent"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-xl bg-accent font-semibold text-primary hover:bg-accent/90 shadow-lg shadow-accent/20"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Saving…
              </div>
            ) : (
              'Set Password & Sign In'
            )}
          </Button>
        </form>
      </div>
    </Shell>
  );
}
