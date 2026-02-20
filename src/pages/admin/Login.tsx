import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import SEO from '@/components/SEO';

export default function Login() {
  const { signIn, profile, session, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';

  // Navigate to the target page once fully signed in + profile loaded
  useEffect(() => {
    if (!loading && !profileLoading && profile) {
      navigate(from, { replace: true });
    }
  }, [loading, profileLoading, profile, navigate, from]);

  // Show a loading screen after sign-in while profile is being fetched.
  // Without this the user sees the login form again with no feedback.
  if (session && (profileLoading || loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-white/60">Signing you in…</p>
        </div>
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    const { error: signInError } = await signIn(data.email, data.password);
    if (signInError) {
      setError(signInError.message);
    }
    // On success: don't navigate here — the useEffect above watches for
    // profile to be populated (after onAuthStateChange finishes fetching it)
    // and navigates then. This avoids the race between navigate() and profile fetch.
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-4">
      <SEO title="Admin Login" description="Sign in to the Aawaaj Movement admin panel." noIndex />
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="digital-network-grid" />
      </div>

      {/* Glow orbs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Aawaaj Admin</h1>
          <p className="mt-1 text-sm text-white/60">Command Centre — Roar of the Youth</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-white/80">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@aawaaj.org"
                {...register('email')}
                className={`h-11 border-white/20 bg-white/10 text-white placeholder:text-white/30 focus-visible:ring-accent ${
                  errors.email ? 'border-red-400/50' : ''
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-white/80">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`h-11 border-white/20 bg-white/10 pr-10 text-white placeholder:text-white/30 focus-visible:ring-accent ${
                    errors.password ? 'border-red-400/50' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-accent/80 hover:text-accent transition-colors underline underline-offset-2"
              >
                Forgot your password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl bg-accent font-semibold text-primary hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </div>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Aawaaj Movement. All rights reserved.
        </p>
      </div>
    </div>
  );
}
