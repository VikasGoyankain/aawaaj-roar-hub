import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, CheckCircle, Mail, Shield } from 'lucide-react';
import SEO from '@/components/SEO';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    const { error: resetError } = await resetPassword(data.email);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-4">
      <SEO title="Forgot Password" description="Reset your Aawaaj Movement admin account password." noIndex />
      <div className="absolute inset-0 opacity-5">
        <div className="digital-network-grid" />
      </div>
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Reset Password</h1>
          <p className="mt-1 text-sm text-white/60">We'll send a secure link to your email</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
          {success ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Password reset email sent! Check your inbox and spam folder.</p>
              </div>
              <Link to="/login">
                <Button className="h-11 w-full rounded-xl bg-accent font-semibold text-primary hover:bg-accent/90">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl bg-accent font-semibold text-primary hover:bg-accent/90 shadow-lg shadow-accent/20"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Sending...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
