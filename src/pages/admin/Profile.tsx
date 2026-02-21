import { useState, useEffect, useRef } from 'react';
import SEO from '@/components/SEO';
import { supabase } from '@/lib/supabase';
import { uploadToImageKit } from '@/lib/imagekit';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, formatDate } from '@/lib/utils';
import { ALL_STATES, STATES_AND_DISTRICTS, lookupPincode, SKILLS_LIST, searchColleges, type UniversityEntry } from '@/lib/india-data';
// Card components no longer used in this view — replaced with custom divs
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  User, Mail, Phone, MapPin, Calendar, Shield, Camera, Lock, Save,
  Loader2, X, ChevronDown, Sparkles,
} from 'lucide-react';

/* ── University search for profile page ── */
function ProfileUniversitySearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<UniversityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Keep query in sync if parent resets the value (e.g. profile load)
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (raw: string) => {
    setQuery(raw);
    onChange(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (raw.length < 2) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchColleges(raw);
      setResults(data);
      setShowDrop(data.length > 0);
      setLoading(false);
    }, 300);
  };

  const pick = (uni: UniversityEntry) => {
    setQuery(uni.name);
    onChange(uni.name);
    setShowDrop(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length) setShowDrop(true); }}
          placeholder="Search university…"
          className="rounded-xl pr-8"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {showDrop && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border bg-background shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {results.map((uni) => (
            <button
              key={uni.aisheCode}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(uni); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b last:border-0"
            >
              <span className="block font-medium">{uni.name}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {uni.district}, {uni.state}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const roleBadgeColor: Record<string, string> = {
  President: 'bg-purple-100 text-purple-700',
  'Technical Head': 'bg-indigo-100 text-indigo-700',
  'Content Head': 'bg-pink-100 text-pink-700',
  'Regional Head': 'bg-blue-100 text-blue-700',
  'University President': 'bg-cyan-100 text-cyan-700',
  Volunteer: 'bg-gray-100 text-gray-700',
};

/* ── Reusable multi-select for skills ── */
function SkillsPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = SKILLS_LIST.filter((s) => s.toLowerCase().includes(filter.toLowerCase()));
  const toggle = (skill: string) => {
    onChange(selected.includes(skill) ? selected.filter((x) => x !== skill) : [...selected, skill]);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/50"
      >
        <span className="flex flex-wrap gap-1">
          {selected.length === 0 && <span className="text-muted-foreground">Select skills…</span>}
          {selected.slice(0, 5).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs gap-1">
              {s}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); toggle(s); }}
              />
            </Badge>
          ))}
          {selected.length > 5 && (
            <Badge variant="secondary" className="text-xs">+{selected.length - 5}</Badge>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2">
            <Input
              placeholder="Filter skills…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No match</p>
            ) : (
              filtered.map((skill) => {
                const active = selected.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggle(skill)}
                    className={`w-full text-left rounded px-3 py-1.5 text-xs transition-colors ${
                      active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-accent'
                    }`}
                  >
                    {active ? '✓ ' : ''}{skill}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { profile, roles, user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    full_name: '',
    mobile_no: '',
    gender: '',
    dob: '',
    residence_district: '',
    current_region_or_college: '',
    profile_photo_url: '',
    skills: [] as string[],
    about_self: '',
    tagline: '',
    pincode: '',
    state: '',
    district: '',
  });
  const [saving, setSaving] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // Password change
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  // Photo upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        mobile_no: profile.mobile_no || '',
        gender: profile.gender || '',
        dob: profile.dob ? profile.dob.split('T')[0] : '',
        residence_district: profile.residence_district || '',
        current_region_or_college: profile.current_region_or_college || '',
        profile_photo_url: profile.profile_photo_url || '',
        skills: profile.skills ? profile.skills.split(', ').filter(Boolean) : [],
        about_self: profile.about_self || '',
        tagline: profile.tagline || '',
        pincode: profile.pincode || '',
        state: profile.state || '',
        district: profile.residence_district || '',
      });
    }
  }, [profile]);

  // Pincode auto-lookup
  const handlePincodeChange = async (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: digits }));
    if (digits.length === 6) {
      setPincodeLoading(true);
      const result = await lookupPincode(digits);
      if (result) {
        setForm((prev) => ({
          ...prev,
          state: result.state,
          district: result.district,
          residence_district: result.district,
        }));
      }
      setPincodeLoading(false);
    }
  };

  const districts = form.state ? (STATES_AND_DISTRICTS[form.state] ?? []) : [];

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          mobile_no: form.mobile_no || null,
          gender: form.gender || null,
          dob: form.dob || null,
          residence_district: form.district || form.residence_district || null,
          state: form.state || null,
          pincode: form.pincode || null,
          current_region_or_college: form.current_region_or_college || null,
          profile_photo_url: form.profile_photo_url || null,
          skills: form.skills.length > 0 ? form.skills.join(', ') : null,
          about_self: form.about_self.trim() || null,
          tagline: form.tagline.trim() || null,
        })
        .eq('id', user!.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Profile updated successfully' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5 MB allowed', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Only images allowed', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `avatar_${user!.id}.${ext}`;

      // Upload to ImageKit → receive CDN URL
      const result = await uploadToImageKit(file, fileName, '/aawaaj/avatars');
      const photoUrl = result.url;

      setForm((prev) => ({ ...prev, profile_photo_url: photoUrl }));

      // Persist CDN URL to Supabase profiles
      await supabase.from('profiles').update({ profile_photo_url: photoUrl }).eq('id', user!.id);
      await refreshProfile();
      toast({ title: 'Photo uploaded', description: 'Profile picture updated via ImageKit CDN.' });
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please check your ImageKit credentials.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (pwdForm.newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setPwdSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.newPassword });
      if (error) throw error;
      toast({ title: 'Password changed successfully' });
      setPwdOpen(false);
      setPwdForm({ newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setPwdSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <SEO title="My Profile" description="Manage your personal details and account settings." noIndex />
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
        <h2 className="text-2xl font-bold text-primary">My Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal details and account settings</p>
      </div>

      {/* Avatar & Quick Info */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="h-20 bg-gradient-to-r from-primary to-primary/70" />
        <div className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-end">
          <div className="relative -mt-14">
            <Avatar className="h-24 w-24 ring-4 ring-white shadow-lg">
              {form.profile_photo_url ? (
                <AvatarImage src={form.profile_photo_url} alt={profile.full_name} />
              ) : null}
              <AvatarFallback className="bg-primary text-2xl font-bold text-accent">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <label
              className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent shadow-md hover:bg-accent/90 transition-colors"
              title="Upload photo"
            >
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Camera className="h-4 w-4 text-primary" />
              )}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          <div className="flex-1 pb-1 text-center sm:text-left">
            <h3 className="text-xl font-bold text-foreground">{profile.full_name}</h3>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {roles.map((r) => (
                <Badge key={r} className={roleBadgeColor[r] || 'bg-muted text-muted-foreground'} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <p className="pb-1 text-xs text-muted-foreground">
            <Calendar className="mr-1 inline h-3 w-3" />
            Member since {formatDate(profile.joined_on)}
          </p>
        </div>
      </div>

      {/* Personal Details Form */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
            <User className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Personal Details</h3>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
              <Input value={profile.email} disabled className="rounded-xl bg-muted/50" />
              <p className="text-[11px] text-muted-foreground">Email cannot be changed here</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile Number</Label>
              <Input
                value={form.mobile_no}
                onChange={(e) => setForm({ ...form, mobile_no: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {['Male', 'Female', 'Non-Binary', 'Prefer not to say'].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Birth</Label>
              <Input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                University
                <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground/60">(optional)</span>
              </Label>
              <ProfileUniversitySearch
                value={form.current_region_or_college}
                onChange={(name) => setForm({ ...form, current_region_or_college: name })}
              />
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPin className="h-4 w-4" /> Location
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pincode</Label>
                <div className="relative">
                  <Input
                    value={form.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="e.g. 110001"
                    maxLength={6}
                    className="rounded-xl"
                  />
                  {pincodeLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Auto-fills state & district</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">State</Label>
                <Select
                  value={form.state}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, state: v, district: '' }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">District</Label>
                <Select
                  value={form.district}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, district: v, residence_district: v }))}
                  disabled={districts.length === 0}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={districts.length === 0 ? 'Select state first' : 'Select district'} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Skills & Bio */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" /> Skills, Bio & Tagline
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</Label>
                <SkillsPicker selected={form.skills} onChange={(v) => setForm({ ...form, skills: v })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">About Me</Label>
                <p className="text-xs text-muted-foreground">Auto-populated from your volunteer application or registration details. You can update it anytime.</p>
                <Textarea
                  value={form.about_self}
                  onChange={(e) => setForm({ ...form, about_self: e.target.value })}
                  placeholder="Tell us a bit about yourself, your interests, and what you bring to the movement."
                  rows={3}
                  className="resize-none rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tagline</Label>
                <p className="text-xs text-muted-foreground">A short sentence that defines you — shown on your public profile.</p>
                <Input
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. 'Youth activist fighting for justice in Rajasthan'"
                  className="rounded-xl"
                  maxLength={120}
                />
              </div>
            </div>
          </div>

          <Separator />

          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Security</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Login Password</p>
              <p className="text-xs text-muted-foreground">Set a new password for your account</p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => setPwdOpen(true)}>
              <Lock className="mr-2 h-4 w-4" /> Change Password
            </Button>
          </div>
        </div>
      </div>

      {/* Roles Info */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Shield className="h-4 w-4 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">My Roles & Permissions</h3>
        </div>
        <div className="p-6">
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                  <Badge className={roleBadgeColor[r] || 'bg-muted text-muted-foreground'} variant="secondary">
                    {r}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {r === 'President' && 'Full administrative access to the entire system'}
                    {r === 'Technical Head' && 'Manage technical wing, view all members & career data'}
                    {r === 'Content Head' && 'Manage blogs, content moderation, view members'}
                    {r === 'Regional Head' && 'Manage regional members & submissions'}
                    {r === 'University President' && 'College-level read access for members & submissions'}
                    {r === 'Volunteer' && 'Base member role with personal dashboard access'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Roles are managed by the President. Contact them if you need role changes.
          </p>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">New Password</Label>
              <Input
                type="password"
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                placeholder="Min 8 characters"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Confirm Password</Label>
              <Input
                type="password"
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                className="rounded-xl"
              />
            </div>
            {pwdForm.newPassword && pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPwdOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePasswordChange}
              disabled={pwdSaving || !pwdForm.newPassword || pwdForm.newPassword !== pwdForm.confirmPassword}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {pwdSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
