import { useEffect, useState, useCallback, useRef } from 'react';
import SEO from '@/components/SEO';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import { ALL_STATES, STATES_AND_DISTRICTS, lookupPincode, searchColleges, type UniversityEntry } from '@/lib/india-data';
import type { Submission, SubmissionStatus, Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, ChevronLeft, ChevronRight, UserPlus, CheckCircle, Pencil, Link2, Copy, Check, MapPin, MapPinned, Loader2, Info } from 'lucide-react';

/* ── Inline university search for Make Member dialog ── */
function MemberUniversitySearch({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<UniversityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false);
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
          className="pr-8"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {showDrop && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-background shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map((uni) => (
            <button
              key={uni.aisheCode}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(uni); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
            >
              <span className="block font-medium">{uni.name}</span>
              <span className="block text-xs text-muted-foreground">{uni.district}, {uni.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUSES: SubmissionStatus[] = ['New', 'In-Progress', 'Resolved', 'Accepted'];

const statusColor: Record<SubmissionStatus, string> = {
  New: 'bg-blue-100 text-blue-700',
  'In-Progress': 'bg-yellow-100 text-yellow-700',
  Resolved: 'bg-green-100 text-green-700',
  Accepted: 'bg-emerald-100 text-emerald-700',
};

const urgencyColor: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 15;

export default function SubmissionsPage() {
  const { profile: currentUser, hasRole, user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Detail dialog
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Make-Member dialog
  const [makeMemberOpen, setMakeMemberOpen] = useState(false);
  const [makeMemberSubmitting, setMakeMemberSubmitting] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: '', email: '', phone: '', dob: '',
    // Residence (personal location — Step 1)
    pincode: '', state: '', district: '',
    // Assignment (serve area — Step 2)
    serve_role: '',
    volunteer_scope: '' as '' | 'campus' | 'region',
    serve_area_state: '', serve_area_district: '', serve_area_pincode: '',
    college: '',
    // Read-only info
    skills: '', about_self: '', recommended_by: '',
  });
  const [resPincodeLoading, setResPincodeLoading] = useState(false);
  const [servePincodeLoading, setServePincodeLoading] = useState(false);

  // Magic link fallback dialog (shown when SMTP is unavailable)
  const [magicLinkInfo, setMagicLinkInfo] = useState<{ name: string; email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Current user's assignment (for scoping submissions)
  const [myAssignment, setMyAssignment] = useState<Assignment | null>(null);
  const [assignmentLoaded, setAssignmentLoaded] = useState(false);

  const isGlobal = hasRole(['President', 'Technical Head']);

  // Fetch current user's assignment for submission scoping
  useEffect(() => {
    if (!user || isGlobal) { setAssignmentLoaded(true); return; }
    const aType = hasRole('Regional Head') ? 'region' : 'university';
    supabase
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .eq('assignment_type', aType)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Table may not exist yet — gracefully degrade
          console.warn('[Submissions] assignments fetch:', error.message);
        }
        if (data) setMyAssignment(data as Assignment);
        setAssignmentLoaded(true);
      });
  }, [user, isGlobal]);

  const copyMagicLink = () => {
    if (!magicLinkInfo) return;
    navigator.clipboard.writeText(magicLinkInfo.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const serveRoleLabel: Record<string, string> = {
    regional_head: 'Regional Head',
    campus_coordinator: 'Campus Coordinator',
    volunteer_sub: 'Volunteer',
  };

  const serveRoleToRoleName: Record<string, string> = {
    regional_head: 'Regional Head',
    campus_coordinator: 'University President',
    volunteer_sub: 'Volunteer',
  };

  // Residence pincode auto-lookup
  const handleResPincodeChange = async (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setMemberForm((prev) => ({ ...prev, pincode: digits }));
    if (digits.length === 6) {
      setResPincodeLoading(true);
      const result = await lookupPincode(digits);
      if (result) {
        setMemberForm((prev) => ({ ...prev, state: result.state, district: result.district }));
      }
      setResPincodeLoading(false);
    }
  };

  // Serve-area pincode auto-lookup
  const handleServePincodeChange = async (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setMemberForm((prev) => ({ ...prev, serve_area_pincode: digits }));
    if (digits.length === 6) {
      setServePincodeLoading(true);
      const result = await lookupPincode(digits);
      if (result) {
        setMemberForm((prev) => ({ ...prev, serve_area_state: result.state, serve_area_district: result.district }));
      }
      setServePincodeLoading(false);
    }
  };

  // Derived district lists for selects
  const resDistricts = memberForm.state ? (STATES_AND_DISTRICTS[memberForm.state] ?? []) : [];
  const serveDistricts = memberForm.serve_area_state ? (STATES_AND_DISTRICTS[memberForm.serve_area_state] ?? []) : [];

  const openMakeMember = () => {
    if (!selectedSubmission) return;
    setMemberForm({
      full_name: selectedSubmission.full_name || '',
      email: selectedSubmission.email || '',
      phone: selectedSubmission.phone || '',
      dob: selectedSubmission.dob || '',
      // Residence location (from registration Step 1)
      pincode: selectedSubmission.pincode || '',
      state: selectedSubmission.state || '',
      district: selectedSubmission.district || '',
      // Assignment region (from registration Step 2)
      serve_role: selectedSubmission.serve_role || '',
      volunteer_scope: (selectedSubmission.volunteer_scope || '') as '' | 'campus' | 'region',
      serve_area_state: selectedSubmission.serve_area_state || '',
      serve_area_district: selectedSubmission.serve_area_district || '',
      serve_area_pincode: selectedSubmission.serve_area_pincode || '',
      college: selectedSubmission.college || '',
      // Read-only
      skills: selectedSubmission.skills || '',
      about_self: selectedSubmission.about_self || '',
      recommended_by: selectedSubmission.recommended_by || '',
    });
    setMakeMemberOpen(true);
  };

  const handleMakeMember = async () => {
    if (!selectedSubmission) return;

    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      toast({
        title: 'Server not configured',
        description: 'VITE_SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.',
        variant: 'destructive',
      });
      return;
    }

    setMakeMemberSubmitting(true);
    try {
      // ── Step 1: Save edits back to the submission row ──
      const { error } = await supabaseAdmin
        .from('submissions')
        .update({
          status: 'Accepted',
          converted_to_member: true,
          full_name: memberForm.full_name.trim(),
          email: memberForm.email.trim(),
          phone: memberForm.phone.trim() || null,
          dob: memberForm.dob || null,
          district: memberForm.district.trim() || null,
          state: memberForm.state.trim() || null,
          pincode: memberForm.pincode.trim() || null,
          serve_role: memberForm.serve_role || null,
          volunteer_scope: memberForm.volunteer_scope || null,
          serve_area_state: memberForm.serve_area_state.trim() || null,
          serve_area_district: memberForm.serve_area_district.trim() || null,
          serve_area_pincode: memberForm.serve_area_pincode.trim() || null,
          college: memberForm.college.trim() || null,
          skills: memberForm.skills.trim() || null,
          about_self: memberForm.about_self.trim() || null,
          recommended_by: memberForm.recommended_by.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);
      if (error) throw error;

      // ── Step 1b: Resolve recommender UUID from name ──────────────────────
      // submissions.recommended_by is a plain-text name; we look up the referrer's
      // profile UUID so we can populate profiles.referred_by for tracking.
      let referredByUuid: string | null = null;
      const recommenderName = memberForm.recommended_by.trim();
      if (recommenderName) {
        const { data: recMatch } = await supabase
          .from('profiles')
          .select('id')
          .ilike('full_name', recommenderName)
          .limit(1)
          .maybeSingle();
        if (recMatch) {
          referredByUuid = recMatch.id;
        } else {
          console.warn('[handleMakeMember] Could not resolve recommender UUID for name:', recommenderName);
        }
      }

      // ── Step 2: Create the Supabase auth account via invite ──
      const roleName = serveRoleToRoleName[memberForm.serve_role] || 'Volunteer';
      let newUserId: string;
      let emailSent = false;

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        memberForm.email.trim(),
        {
          redirectTo: `${import.meta.env.VITE_SITE_URL ?? 'https://aawaajmovement.org'}/admin`,
          data: {
            full_name: memberForm.full_name.trim(),
            mobile_no: memberForm.phone.trim() || null,
            gender: null,
            dob: memberForm.dob || null,
            residence_district: memberForm.district.trim() || null,
            current_region_or_college: memberForm.college.trim() || null,
            state: memberForm.state.trim() || null,
            pincode: memberForm.pincode.trim() || null,
            referred_by: referredByUuid,
          },
        }
      );

      if (inviteError) {
        const status = (inviteError as { status?: number }).status;
        if (status === 422) throw new Error(`${inviteError.message} (this email is already registered)`);
        if (status === 401) throw new Error(`${inviteError.message} (service role key is invalid)`);
        // SMTP failure — fall back to createUser + magic link
        console.warn('[handleMakeMember] invite failed (SMTP?), falling back to createUser:', inviteError.message);

        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: memberForm.email.trim(),
          email_confirm: true,
          user_metadata: {
            full_name: memberForm.full_name.trim(),
            mobile_no: memberForm.phone.trim() || null,
            dob: memberForm.dob || null,
            residence_district: memberForm.district.trim() || null,
            current_region_or_college: memberForm.college.trim() || null,
            state: memberForm.state.trim() || null,
            pincode: memberForm.pincode.trim() || null,
            referred_by: referredByUuid,
          },
        });
        if (createError) throw new Error(`${createError.message} (Supabase error — check dashboard logs)`);
        newUserId = createData.user.id;
        emailSent = false;
      } else {
        newUserId = inviteData.user.id;
        emailSent = true;
      }

      // ── Step 3: Wait for on_auth_user_created trigger to fire ──
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // ── Step 4: Upsert profile with enriched data ──
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUserId,
        full_name: memberForm.full_name.trim(),
        mobile_no: memberForm.phone.trim() || null,
        dob: memberForm.dob || null,
        residence_district: memberForm.district.trim() || null,
        state: memberForm.state.trim() || null,
        pincode: memberForm.pincode.trim() || null,
        current_region_or_college: memberForm.college.trim() || null,
        skills: memberForm.skills.trim() || null,
        about_self: memberForm.about_self.trim() || null,
        recommended_by_name: recommenderName || null,
        referred_by: referredByUuid,
      }, { onConflict: 'id' });
      if (profileError) console.warn('[handleMakeMember] profile upsert warning:', profileError);

      // ── Step 5: Assign the mapped role ──
      const { data: roleRows } = await supabase.from('roles').select('id, name');
      const roleRow = roleRows?.find((r: { id: number; name: string }) => r.name === roleName);
      if (roleRow) {
        await supabase.from('user_roles').upsert(
          { user_id: newUserId, role_id: roleRow.id, granted_by: currentUser?.id },
          { onConflict: 'user_id,role_id', ignoreDuplicates: true }
        );
      }

      // ── Step 5b: Create assignment based on serve_role + volunteer_scope ──
      const isRegionAssignment =
        memberForm.serve_role === 'regional_head' ||
        (memberForm.serve_role === 'volunteer_sub' && memberForm.volunteer_scope === 'region');
      const isUniversityAssignment =
        memberForm.serve_role === 'campus_coordinator' ||
        (memberForm.serve_role === 'volunteer_sub' && memberForm.volunteer_scope === 'campus');

      if (isRegionAssignment && (memberForm.serve_area_state || memberForm.serve_area_district)) {
        await supabase.from('assignments').upsert({
          user_id: newUserId,
          assignment_type: 'region',
          assigned_state: memberForm.serve_area_state.trim() || null,
          assigned_district: memberForm.serve_area_district.trim() || null,
          assigned_by: currentUser?.id,
          notes: 'Auto-assigned on member creation from submission',
        }, { onConflict: 'user_id,assignment_type' });
      } else if (isUniversityAssignment && memberForm.college) {
        await supabase.from('assignments').upsert({
          user_id: newUserId,
          assignment_type: 'university',
          assigned_university: memberForm.college.trim() || null,
          assigned_by: currentUser?.id,
          notes: 'Auto-assigned on member creation from submission',
        }, { onConflict: 'user_id,assignment_type' });
      }

      // ── Step 6: Audit log ──
      await supabase.from('audit_logs').insert({
        admin_id: currentUser?.id,
        action: 'make_member',
        target_type: 'submission',
        target_id: selectedSubmission.id,
        details: {
          submission_name: memberForm.full_name,
          email: memberForm.email,
          serve_role: memberForm.serve_role,
          role_assigned: roleName,
          new_user_id: newUserId,
          email_sent: emailSent,
        },
      });

      // ── Step 7: Update local state ──
      const updated: Submission = {
        ...selectedSubmission,
        full_name: memberForm.full_name,
        email: memberForm.email,
        phone: memberForm.phone || null,
        dob: memberForm.dob || null,
        district: memberForm.district || null,
        state: memberForm.state || null,
        pincode: memberForm.pincode || null,
        serve_role: memberForm.serve_role || null,
        volunteer_scope: memberForm.volunteer_scope || null,
        serve_area_state: memberForm.serve_area_state || null,
        serve_area_district: memberForm.serve_area_district || null,
        serve_area_pincode: memberForm.serve_area_pincode || null,
        college: memberForm.college || null,
        skills: memberForm.skills || null,
        about_self: memberForm.about_self || null,
        recommended_by: memberForm.recommended_by || null,
        status: 'Accepted',
        converted_to_member: true,
      };
      setSubmissions((prev) => prev.map((s) => (s.id === selectedSubmission.id ? updated : s)));
      setSelectedSubmission(updated);
      setMakeMemberOpen(false);

      const capturedName = memberForm.full_name;
      const capturedEmail = memberForm.email;

      if (emailSent) {
        toast({
          title: '✅ Member created & invite sent!',
          description: `An invite email has been sent to ${capturedEmail}. They can click the link to set their password.`,
        });
      } else {
        // SMTP unavailable — generate magic link for admin to share manually
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: capturedEmail,
          options: { redirectTo: `${import.meta.env.VITE_SITE_URL ?? 'https://aawaajmovement.org'}/admin` },
        });
        if (linkData?.properties?.action_link) {
          setMagicLinkInfo({ name: capturedName, email: capturedEmail, link: linkData.properties.action_link });
        } else {
          toast({
            title: 'Member created',
            description: `Account created for ${capturedEmail}. Ask them to use "Forgot Password" to set their password.`,
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to make member';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setMakeMemberSubmitting(false);
    }
  };

  const fetchSubmissions = useCallback(async () => {
    if (!assignmentLoaded) return;
    setLoading(true);
    // Use supabaseAdmin to bypass RLS — the legacy RLS policies check
    // `region = get_user_region()` which is broken (format mismatch and wrong
    // column).  Scoping is handled entirely in JS via the .or() filters below.
    let query = supabaseAdmin
      .from('submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // ── Scope by role + assignment ──
    // President / Technical Head → see everything (no filter)
    // Regional Head → submissions whose serve area OR residence matches their assigned region
    // University President → submissions whose college matches their assigned university
    if (!isGlobal) {
      if (hasRole('Regional Head')) {
        const dist = myAssignment?.assigned_district;
        const st = myAssignment?.assigned_state;
        // Fallback to profile data if no assignment row exists
        const fallbackDist = currentUser?.residence_district;
        const matchVal = dist || fallbackDist;

        if (matchVal) {
          // Match submissions whose serve_area_district, residence district, OR region contains this district
          // Use ilike for case-insensitive matching
          query = query.or(
            `serve_area_district.ilike.${matchVal},district.ilike.${matchVal},region.ilike.%${matchVal}%`
          );
        } else if (st) {
          query = query.or(
            `serve_area_state.ilike.${st},state.ilike.${st},region.ilike.%${st}%`
          );
        }
        // If none of the above match, no scope filter → shows all (edge case — user has no location data)
      } else if (hasRole('University President')) {
        const uni = myAssignment?.assigned_university || currentUser?.current_region_or_college;

        if (uni) {
          // Case-insensitive match on college / university — use %wildcards% for substring safety
          query = query.or(`college.ilike.%${uni}%,university.ilike.%${uni}%`);
        }
      }
      // Content Head with no Regional Head / University President role → sees all
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching submissions:', error);
    } else {
      setSubmissions((data as Submission[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [currentUser, page, statusFilter, typeFilter, search, isGlobal, myAssignment, assignmentLoaded]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, typeFilter]);

  const handleStatusChange = async (submission: Submission, newStatus: SubmissionStatus) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabaseAdmin
        .from('submissions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', submission.id);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        admin_id: currentUser?.id,
        action: 'update_submission_status',
        target_type: 'submission',
        target_id: submission.id,
        details: {
          submission_name: submission.full_name,
          old_status: submission.status,
          new_status: newStatus,
        },
      });

      toast({
        title: 'Status updated',
        description: `"${submission.full_name}" is now ${newStatus}`,
      });

      // Update local state
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submission.id ? { ...s, status: newStatus } : s))
      );
      if (selectedSubmission?.id === submission.id) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <SEO title="Submissions" description="Review and manage volunteer applications and victim reports." noIndex />
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#002D04]">Submissions</h2>
        <p className="text-sm text-gray-500">{totalCount} total submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="victim_report">Victim Report</SelectItem>
            <SelectItem value="volunteer_application">Volunteer Application</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitter</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Region</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                  No submissions found
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{sub.full_name}</p>
                      <p className="text-xs text-gray-500">{sub.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {sub.type === 'victim_report' ? 'Victim Report' : 'Volunteer App'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {hasRole(['President', 'Technical Head', 'Regional Head']) ? (
                      <Select
                        value={sub.status}
                        onValueChange={(v) => handleStatusChange(sub, v as SubmissionStatus)}
                        disabled={updatingStatus}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={statusColor[sub.status]} variant="secondary">
                        {sub.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {sub.region || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {formatDateTime(sub.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
            {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.type === 'victim_report'
                ? 'Victim Report'
                : 'Volunteer Application'}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-gray-500">Full Name</p>
                  <p className="text-sm">{selectedSubmission.full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Email</p>
                  <p className="text-sm">{selectedSubmission.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Phone</p>
                  <p className="text-sm">{selectedSubmission.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Date of Birth</p>
                  <p className="text-sm">{selectedSubmission.dob || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Location</p>
                  <p className="text-sm">
                    {[selectedSubmission.district, selectedSubmission.state, selectedSubmission.pincode]
                      .filter(Boolean)
                      .join(', ') || selectedSubmission.region || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <Badge className={statusColor[selectedSubmission.status]} variant="secondary">
                    {selectedSubmission.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Recommended By</p>
                  <p className="text-sm">{selectedSubmission.recommended_by || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Created</p>
                  <p className="text-sm">{formatDateTime(selectedSubmission.created_at)}</p>
                </div>
              </div>

              {selectedSubmission.type === 'victim_report' && (
                <>
                  <div className="border-t pt-3">
                    <p className="mb-2 text-xs font-medium text-gray-500">Incident Date</p>
                    <p className="text-sm">{selectedSubmission.incident_date || '—'}</p>
                  </div>
                  {selectedSubmission.urgency_level && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Urgency</p>
                      <Badge
                        className={urgencyColor[selectedSubmission.urgency_level]}
                        variant="secondary"
                      >
                        {selectedSubmission.urgency_level.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Incident Description</p>
                    <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                      {selectedSubmission.incident_description || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Perpetrator Info</p>
                    <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                      {selectedSubmission.perpetrator_info || '—'}
                    </p>
                  </div>
                </>
              )}

              {selectedSubmission.type === 'volunteer_application' && (
                <>
                  <div className="border-t pt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Role</p>
                      <p className="text-sm capitalize">
                        {selectedSubmission.serve_role?.replace('_', ' ') || '—'}
                      </p>
                    </div>
                    {selectedSubmission.volunteer_scope && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">Volunteer Scope</p>
                        <p className="text-sm capitalize">{selectedSubmission.volunteer_scope}</p>
                      </div>
                    )}
                  </div>
                  {(selectedSubmission.serve_area_district || selectedSubmission.serve_area_state) && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">Serve Area</p>
                      <p className="text-sm">
                        {[selectedSubmission.serve_area_district, selectedSubmission.serve_area_state, selectedSubmission.serve_area_pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  )}
                  {selectedSubmission.college && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">College / University</p>
                      <p className="text-sm">{selectedSubmission.college}</p>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">Skills</p>
                    <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                      {selectedSubmission.skills || '—'}
                    </p>
                  </div>
                  {selectedSubmission.about_self && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500">About Themselves</p>
                      <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                        {selectedSubmission.about_self}
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedSubmission.consent !== undefined && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-500">Contact Consent</p>
                  <p className="text-sm">{selectedSubmission.consent ? '✅ Consented' : '❌ Not consented'}</p>
                </div>
              )}

              {/* Make Member CTA */}
              {selectedSubmission.type === 'volunteer_application' &&
                !selectedSubmission.converted_to_member && (
                <div className="border-t pt-4 mt-2">
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={openMakeMember}
                  >
                    <UserPlus className="h-4 w-4" />
                    Make Member
                  </Button>
                  <p className="mt-2 text-center text-xs text-gray-400">
                    Accepts this application and prepares their member profile.
                  </p>
                </div>
              )}

              {selectedSubmission.converted_to_member && (
                <div className="border-t pt-4 mt-2 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Converted to member — awaiting signup with {selectedSubmission.email}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Make Member Confirmation Dialog ── */}
      <Dialog open={makeMemberOpen} onOpenChange={(o) => !makeMemberSubmitting && setMakeMemberOpen(o)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Accept as Member
            </DialogTitle>
            <DialogDescription>
              Review the pre-filled details before confirming. Residence &amp; assignment are shown separately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* ── Identity ── */}
            <fieldset className="rounded-lg border p-3 space-y-3">
              <legend className="px-2 text-xs font-semibold text-gray-500 flex items-center gap-1"><Pencil className="h-3 w-3" /> Identity</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Full Name *</Label>
                  <Input value={memberForm.full_name} onChange={(e) => setMemberForm({...memberForm, full_name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Email *</Label>
                  <Input value={memberForm.email} onChange={(e) => setMemberForm({...memberForm, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Phone</Label>
                  <Input value={memberForm.phone} onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})} placeholder="+91..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Date of Birth</Label>
                  <Input type="date" value={memberForm.dob} onChange={(e) => setMemberForm({...memberForm, dob: e.target.value})} />
                </div>
              </div>
            </fieldset>

            {/* ── Personal Location (Residence — Step 1) ── */}
            <fieldset className="rounded-lg border p-3 space-y-3">
              <legend className="px-2 text-xs font-semibold text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Personal Location <span className="font-normal text-gray-400">(where they live)</span></legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Pincode</Label>
                  <div className="relative">
                    <Input value={memberForm.pincode} onChange={(e) => handleResPincodeChange(e.target.value)} maxLength={6} placeholder="e.g. 110001" />
                    {resPincodeLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Auto-fills state & district</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">State</Label>
                  <Select value={memberForm.state} onValueChange={(v) => setMemberForm((prev) => ({ ...prev, state: v, district: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {ALL_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">District</Label>
                  <Select value={memberForm.district} onValueChange={(v) => setMemberForm((prev) => ({ ...prev, district: v }))} disabled={resDistricts.length === 0}>
                    <SelectTrigger><SelectValue placeholder={resDistricts.length === 0 ? 'Select state first' : 'Select district'} /></SelectTrigger>
                    <SelectContent>
                      {resDistricts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            {/* ── Role & Assignment (Serve Area — Step 2) ── */}
            <fieldset className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 space-y-3">
              <legend className="px-2 text-xs font-semibold text-emerald-700 flex items-center gap-1"><MapPinned className="h-3 w-3" /> Role & Assigned Region <span className="font-normal text-emerald-600/70">(where they'll work)</span></legend>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Serve Role</Label>
                <Select value={memberForm.serve_role} onValueChange={(v) => setMemberForm({...memberForm, serve_role: v})}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regional_head">Regional Head</SelectItem>
                    <SelectItem value="campus_coordinator">Campus Coordinator</SelectItem>
                    <SelectItem value="volunteer_sub">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Region fields — shown for Regional Head OR Volunteer (region scope) */}
              {(memberForm.serve_role === 'regional_head' || (memberForm.serve_role === 'volunteer_sub' && memberForm.volunteer_scope === 'region')) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Serve Pincode</Label>
                    <div className="relative">
                      <Input value={memberForm.serve_area_pincode} onChange={(e) => handleServePincodeChange(e.target.value)} maxLength={6} placeholder="e.g. 302001" />
                      {servePincodeLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Auto-fills state & district</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Serve State</Label>
                    <Select value={memberForm.serve_area_state} onValueChange={(v) => setMemberForm((prev) => ({ ...prev, serve_area_state: v, serve_area_district: '' }))}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {ALL_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Serve District</Label>
                    <Select value={memberForm.serve_area_district} onValueChange={(v) => setMemberForm((prev) => ({ ...prev, serve_area_district: v }))} disabled={serveDistricts.length === 0}>
                      <SelectTrigger><SelectValue placeholder={serveDistricts.length === 0 ? 'Select state first' : 'Select district'} /></SelectTrigger>
                      <SelectContent>
                        {serveDistricts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* University field — shown for Campus Coordinator OR Volunteer (campus scope) */}
              {(memberForm.serve_role === 'campus_coordinator' || (memberForm.serve_role === 'volunteer_sub' && memberForm.volunteer_scope === 'campus')) && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">University / College</Label>
                  <MemberUniversitySearch value={memberForm.college} onChange={(name) => setMemberForm({...memberForm, college: name})} />
                </div>
              )}

              {/* Volunteer scope toggle — shown only for Volunteer role */}
              {memberForm.serve_role === 'volunteer_sub' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Volunteer Scope</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMemberForm((prev) => ({ ...prev, volunteer_scope: 'campus', serve_area_state: '', serve_area_district: '', serve_area_pincode: '' }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        memberForm.volunteer_scope === 'campus'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      🎓 In Campus
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberForm((prev) => ({ ...prev, volunteer_scope: 'region', college: '' }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        memberForm.volunteer_scope === 'region'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      📍 In Region
                    </button>
                  </div>
                  {!memberForm.volunteer_scope && (
                    <p className="text-[10px] text-amber-600">Please select whether this volunteer will serve in a campus or a region.</p>
                  )}
                </div>
              )}

              {!memberForm.serve_role && (
                <p className="text-xs text-gray-400 italic">Select a serve role to see assignment fields.</p>
              )}
            </fieldset>

            {/* ── Read-only Info (from application) ── */}
            {(memberForm.skills || memberForm.about_self || memberForm.recommended_by) && (
              <fieldset className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-3">
                <legend className="px-2 text-xs font-semibold text-gray-400 flex items-center gap-1"><Info className="h-3 w-3" /> Application Info <span className="font-normal">(read-only)</span></legend>
                {memberForm.recommended_by && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Recommended By</Label>
                    <p className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-600">{memberForm.recommended_by}</p>
                  </div>
                )}
                {memberForm.skills && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Skills</Label>
                    <p className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-600">{memberForm.skills}</p>
                  </div>
                )}
                {memberForm.about_self && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">About Themselves</Label>
                    <p className="whitespace-pre-wrap rounded bg-gray-100 px-3 py-2 text-sm text-gray-600">{memberForm.about_self}</p>
                  </div>
                )}
              </fieldset>
            )}

            <Separator />

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <strong>What happens:</strong> A Supabase account will be created for <strong>{memberForm.email}</strong> and they will receive an email invite to set their password. Their profile, skills, and role ({serveRoleToRoleName[memberForm.serve_role] || 'Volunteer'}) will be assigned automatically.
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMakeMemberOpen(false)}
                disabled={makeMemberSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleMakeMember}
                disabled={makeMemberSubmitting || !memberForm.full_name.trim() || !memberForm.email.trim()}
              >
                {makeMemberSubmitting ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating account…</span>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Confirm — Make Member</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Magic Link Fallback Dialog (when SMTP is unavailable) ── */}
      <Dialog open={!!magicLinkInfo} onOpenChange={(o) => { if (!o) { setMagicLinkInfo(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#002D04]" /> Share Login Link
            </DialogTitle>
            <DialogDescription>
              Email delivery is unavailable (SMTP not configured). Copy the link below and share it with <strong>{magicLinkInfo?.name}</strong> via WhatsApp, Telegram, or any channel. When they open it they will be prompted to <strong>set a new password</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="break-all font-mono text-xs text-gray-600 select-all">{magicLinkInfo?.link}</p>
            </div>
            <Button onClick={copyMagicLink} className="w-full gap-2 bg-[#002D04] hover:bg-[#004d0a]">
              {copied
                ? <><Check className="h-4 w-4" /> Copied!</>
                : <><Copy className="h-4 w-4" /> Copy Link</>}
            </Button>
            <p className="text-center text-xs text-amber-600">
              ⚠️ Fix this permanently: Supabase Dashboard → Project Settings → Auth → SMTP Settings
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMagicLinkInfo(null); setCopied(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}