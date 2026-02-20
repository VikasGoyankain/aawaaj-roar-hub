import { useState, useMemo, useCallback } from 'react';
import SEO from '@/components/SEO';
import { Search, X, MapPin, Calendar, Users, BookOpen, ExternalLink, ChevronRight, Shield, Award, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getInitials } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/FooterSection';

// ── Types ──────────────────────────────────────────────────────────────────
type RoleCategory =
  | 'President'
  | 'Technical Head'
  | 'Content Head'
  | 'Regional Head'
  | 'University President'
  | 'Legal Wing'
  | 'Research Wing'
  | 'Media Wing'
  | 'Volunteer';

interface TeamMember {
  id: string;
  name: string;
  role: RoleCategory;
  region: string;
  state: string;
  photo?: string;
  missionQuote: string;
  joinedOn: string;
  email: string;
  mobile: string;
  bio: string;
  referralCount: number;
  skills: string[];
  careerHistory: { title: string; date: string; description: string }[];
  blogs: { title: string; url: string; date: string }[];
  seniority: number; // lower = more senior
}

// ── Mock data (replace with Supabase fetch when ready) ──────────────────────
const TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Hardik Gajraj',
    role: 'President',
    region: 'National HQ',
    state: 'Rajasthan',
    missionQuote: 'Every voice matters — together we become the roar India cannot ignore.',
    joinedOn: '2023-01-15',
    email: 'hardik@aawaaj.org',
    mobile: '+91 98765 43210',
    bio: 'Founder and President of Aawaaj Movement. Legal thinker, grassroots organizer, and relentless advocate for youth-led transparency in India.',
    referralCount: 47,
    skills: ['Legal Research', 'Public Speaking', 'Ground Mobilization', 'Strategic Leadership'],
    careerHistory: [
      { title: 'Aawaaj Movement Founded', date: 'Jan 2023', description: 'Launched the movement to give marginalized voices a coordinated platform.' },
      { title: 'First District Verification Drive', date: 'Apr 2023', description: 'Led a fact-finding mission across 3 districts of Rajasthan.' },
      { title: 'National Youth Conclave Speaker', date: 'Aug 2023', description: 'Keynote address on youth leadership and legal accountability.' },
    ],
    blogs: [
      { title: 'Why Youth Must Lead the Legal Reform Charge', url: '#', date: 'Mar 2024' },
      { title: 'The Digital Shield: How Verified Reports Change Everything', url: '#', date: 'Nov 2023' },
    ],
    seniority: 1,
  },
  {
    id: '2',
    name: 'Kushal Manish Jain',
    role: 'Technical Head',
    region: 'National HQ',
    state: 'Gujarat',
    missionQuote: 'Technology is the megaphone; truth is the message.',
    joinedOn: '2023-02-01',
    email: 'kushal@aawaaj.org',
    mobile: '+91 97654 32109',
    bio: 'Technical Head driving Aawaaj\'s digital infrastructure — from the Digital Shield platform to secure data pipelines that protect activist identities.',
    referralCount: 29,
    skills: ['Full-Stack Development', 'Cybersecurity', 'Data Analysis', 'UI/UX Design'],
    careerHistory: [
      { title: 'Digital Shield Platform Launched', date: 'Mar 2023', description: 'Built the core reporting and verification platform from scratch.' },
      { title: 'Secure Communication Protocol', date: 'Jul 2023', description: 'Implemented end-to-end encrypted channels for ground reporters.' },
    ],
    blogs: [
      { title: 'Building a Digital Shield for India\'s Activists', url: '#', date: 'Jan 2024' },
    ],
    seniority: 2,
  },
  {
    id: '3',
    name: 'Priya Sharma',
    role: 'Content Head',
    region: 'National HQ',
    state: 'Delhi',
    missionQuote: 'A well-crafted story is the most powerful petition ever filed.',
    joinedOn: '2023-03-10',
    email: 'priya@aawaaj.org',
    mobile: '+91 96543 21098',
    bio: 'Content Head curating campaigns, articles, and social narratives that turn ground reports into high-impact accountability stories.',
    referralCount: 18,
    skills: ['Content Strategy', 'Video Editing', 'Journalism', 'Social Media'],
    careerHistory: [
      { title: 'Aawaaj Social Media Strategy', date: 'Apr 2023', description: 'Grew @aawaaj_movement to 10K followers in under 6 months.' },
    ],
    blogs: [
      { title: 'How We Turn Reports into National Headlines', url: '#', date: 'Feb 2024' },
    ],
    seniority: 3,
  },
  {
    id: '4',
    name: 'Arjun Mehra',
    role: 'Regional Head',
    region: 'Jaipur',
    state: 'Rajasthan',
    missionQuote: 'Every district deserves a fearless voice. I am Jaipur\'s.',
    joinedOn: '2023-04-20',
    email: 'arjun@aawaaj.org',
    mobile: '+91 95432 10987',
    bio: 'District CEO of Jaipur, leading ground verification drives, coordinating local volunteers, and ensuring facts reach the national platform.',
    referralCount: 12,
    skills: ['Ground Mobilization', 'Fact-Finding', 'Community Organizing', 'Reporting'],
    careerHistory: [
      { title: 'Jaipur Sanitation Verification Drive', date: 'Jun 2023', description: 'Led a 5-day field investigation covering 20 wards.' },
      { title: 'Youth Council Formation', date: 'Sep 2023', description: 'Formed a 30-member youth council for sustained district coverage.' },
    ],
    blogs: [],
    seniority: 4,
  },
  {
    id: '5',
    name: 'Ananya Verma',
    role: 'University President',
    region: 'University of Delhi',
    state: 'Delhi',
    missionQuote: 'Campus is not a bubble — it is where the revolution learns to speak.',
    joinedOn: '2023-05-15',
    email: 'ananya@aawaaj.org',
    mobile: '+91 94321 09876',
    bio: 'University President at DU, mobilizing students to become legal observers, content creators, and grassroots reporters for Aawaaj.',
    referralCount: 21,
    skills: ['Student Organizing', 'Researching', 'Legal Drafting', 'Public Relations'],
    careerHistory: [
      { title: 'DU Legal Observer Program', date: 'Aug 2023', description: 'Trained 50 students as certified legal observers for protests and hearings.' },
    ],
    blogs: [
      { title: 'Why DU Students Are Joining Aawaaj', url: '#', date: 'Oct 2023' },
    ],
    seniority: 5,
  },
  {
    id: '6',
    name: 'Vikram Singh',
    role: 'Legal Wing',
    region: 'Jodhpur',
    state: 'Rajasthan',
    missionQuote: 'The law is a weapon — and I\'ve learned to wield it for the powerless.',
    joinedOn: '2023-06-01',
    email: 'vikram@aawaaj.org',
    mobile: '+91 93210 98765',
    bio: 'Legal Wing Lead providing pro-bono counsel, drafting RTI applications, and advising movement leaders on constitutional rights.',
    referralCount: 8,
    skills: ['Constitutional Law', 'RTI Filing', 'Legal Research', 'Advocacy'],
    careerHistory: [
      { title: 'RTI Campaign — Water Rights', date: 'Oct 2023', description: 'Filed 120 RTIs across Rajasthan on rural water allocation.' },
    ],
    blogs: [
      { title: 'RTI as a Tool for Transparency', url: '#', date: 'Dec 2023' },
    ],
    seniority: 6,
  },
  {
    id: '7',
    name: 'Meera Nair',
    role: 'Research Wing',
    region: 'Thiruvananthapuram',
    state: 'Kerala',
    missionQuote: 'Data is the currency of accountability — I mine it for justice.',
    joinedOn: '2023-07-10',
    email: 'meera@aawaaj.org',
    mobile: '+91 92109 87654',
    bio: 'Research Wing Lead producing evidence-based reports, policy analyses, and ground truth documentation that anchors Aawaaj campaigns.',
    referralCount: 6,
    skills: ['Data Analysis', 'Policy Research', 'Report Writing', 'Statistics'],
    careerHistory: [
      { title: 'Education Equity Report — Kerala', date: 'Nov 2023', description: 'Published a 40-page report on school infrastructure gaps in tribal districts.' },
    ],
    blogs: [
      { title: 'Numbers Don\'t Lie: Education Data Across India', url: '#', date: 'Jan 2024' },
    ],
    seniority: 7,
  },
  {
    id: '8',
    name: 'Rahul Kapoor',
    role: 'Media Wing',
    region: 'Mumbai',
    state: 'Maharashtra',
    missionQuote: 'I don\'t just record the movement — I amplify it across every screen.',
    joinedOn: '2023-08-05',
    email: 'rahul@aawaaj.org',
    mobile: '+91 91098 76543',
    bio: 'Media Wing Lead producing video documentaries, photo essays, and press packages that carry Aawaaj\'s stories to national audiences.',
    referralCount: 15,
    skills: ['Video Editing', 'Photography', 'Videography', 'Broadcast Journalism'],
    careerHistory: [
      { title: 'Documentary: Voices from the Margins', date: 'Dec 2023', description: 'Produced a 20-minute documentary screened at youth film festivals.' },
    ],
    blogs: [],
    seniority: 8,
  },
  {
    id: '9',
    name: 'Divya Patel',
    role: 'Regional Head',
    region: 'Ahmedabad',
    state: 'Gujarat',
    missionQuote: 'Gujarat\'s youth is awake — I\'m here to organize that energy.',
    joinedOn: '2023-09-01',
    email: 'divya@aawaaj.org',
    mobile: '+91 90987 65432',
    bio: 'Regional Head for Ahmedabad, building a district volunteer network and overseeing fact-finding missions in industrial zones.',
    referralCount: 10,
    skills: ['Ground Mobilization', 'Community Building', 'Event Management', 'Hindi & Gujarati Writing'],
    careerHistory: [
      { title: 'Industrial Zone Fact-Finding', date: 'Jan 2024', description: 'Led an investigation into labor violations in the textile industrial corridor.' },
    ],
    blogs: [],
    seniority: 9,
  },
  {
    id: '10',
    name: 'Aditya Kumar',
    role: 'Volunteer',
    region: 'Patna',
    state: 'Bihar',
    missionQuote: 'Every action — no matter how small — is a brick in the wall of change.',
    joinedOn: '2024-01-20',
    email: 'aditya@aawaaj.org',
    mobile: '+91 89876 54321',
    bio: 'Aspiring Youth volunteer from Patna, contributing to Aawaaj through social media outreach and local campus organizing.',
    referralCount: 3,
    skills: ['Aspiring Youth', 'Social Media', 'Researching'],
    careerHistory: [],
    blogs: [],
    seniority: 10,
  },
];

// ── Role display config ────────────────────────────────────────────────────
const roleConfig: Record<RoleCategory, { label: string; color: string; tier: number }> = {
  President:           { label: 'President',           color: 'bg-amber-500/20 text-amber-700 border-amber-400/40',       tier: 1 },
  'Technical Head':    { label: 'Technical Head',      color: 'bg-indigo-500/20 text-indigo-700 border-indigo-400/40',    tier: 2 },
  'Content Head':      { label: 'Content Head',        color: 'bg-pink-500/20 text-pink-700 border-pink-400/40',          tier: 2 },
  'Regional Head':     { label: 'Regional Head',       color: 'bg-blue-500/20 text-blue-700 border-blue-400/40',          tier: 3 },
  'University President': { label: 'University President', color: 'bg-cyan-500/20 text-cyan-700 border-cyan-400/40',      tier: 3 },
  'Legal Wing':        { label: 'Legal Wing',          color: 'bg-violet-500/20 text-violet-700 border-violet-400/40',    tier: 4 },
  'Research Wing':     { label: 'Research Wing',       color: 'bg-teal-500/20 text-teal-700 border-teal-400/40',          tier: 4 },
  'Media Wing':        { label: 'Media Wing',          color: 'bg-orange-500/20 text-orange-700 border-orange-400/40',    tier: 4 },
  Volunteer:           { label: 'Volunteer',           color: 'bg-gray-500/20 text-gray-600 border-gray-400/40',          tier: 5 },
};

const SORT_OPTIONS = ['Seniority', 'Recently Joined', 'Most Referrals'] as const;
type SortOption = typeof SORT_OPTIONS[number];

// ── MemberCard ─────────────────────────────────────────────────────────────
function MemberCard({ member, onClick }: { member: TeamMember; onClick: () => void }) {
  const cfg = roleConfig[member.role];
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl border border-white/20 bg-white/70 backdrop-blur-sm p-5 shadow-sm
        transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-secondary/60 hover:bg-white/90
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      aria-label={`View profile of ${member.name}`}
    >
      {/* Saffron glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
        bg-gradient-to-br from-secondary/5 to-transparent pointer-events-none" />

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="h-14 w-14 ring-2 ring-white shadow-md">
            {member.photo && <AvatarImage src={member.photo} alt={member.name} loading="lazy" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          {member.seniority <= 3 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary flex items-center justify-center shadow">
              <Star className="h-2.5 w-2.5 text-primary fill-primary" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-bold text-primary truncate">{member.name}</h3>
          </div>
          <Badge className={`${cfg.color} border text-[10px] font-semibold px-2 py-0.5 mb-2`} variant="outline">
            {cfg.label}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{member.region}, {member.state}</span>
          </div>
          <p className="text-xs text-muted-foreground/80 italic line-clamp-2 leading-relaxed">
            "{member.missionQuote}"
          </p>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-secondary transition-colors" />
      </div>

      {/* Stats row */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {member.referralCount} referred
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(member.joinedOn).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </span>
        {member.skills.slice(0, 1).map((s) => (
          <span key={s} className="ml-auto truncate max-w-[80px] bg-muted rounded-full px-2 py-0.5">
            {s}
          </span>
        ))}
      </div>
    </button>
  );
}

// ── MemberProfilePanel ─────────────────────────────────────────────────────
function MemberProfilePanel({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const cfg = roleConfig[member.role];
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Hero header */}
        <div className="relative bg-primary px-6 pt-8 pb-6">
          <SheetHeader className="mb-0">
            <SheetTitle className="sr-only">{member.name}'s Profile</SheetTitle>
          </SheetHeader>
          <div className="flex items-end gap-5">
            <Avatar className="h-20 w-20 ring-4 ring-secondary shadow-xl shrink-0">
              {member.photo && <AvatarImage src={member.photo} alt={member.name} />}
              <AvatarFallback className="bg-secondary text-primary text-2xl font-black">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white mb-1">{member.name}</h2>
              <Badge className={`${cfg.color} border text-xs font-bold px-3 py-1 mb-2`} variant="outline">
                {cfg.label}
              </Badge>
              <div className="flex items-center gap-1.5 text-white/70 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                <span>{member.region}, {member.state}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-white/60 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span>Joined {new Date(member.joinedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mission quote */}
          <blockquote className="border-l-4 border-secondary pl-4 py-1">
            <p className="text-sm italic text-foreground/80 leading-relaxed">"{member.missionQuote}"</p>
          </blockquote>

          {/* Bio */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">About</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{member.bio}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-2xl font-black text-primary">{member.referralCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Members Referred</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-2xl font-black text-primary">{member.careerHistory.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Achievements</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-2xl font-black text-primary">{member.blogs.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Published Works</p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {member.skills.map((s) => (
                <span key={s} className="rounded-full bg-primary/10 text-primary text-xs px-3 py-1 font-medium border border-primary/20">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-16 text-muted-foreground text-xs">Email</span>
                <a href={`mailto:${member.email}`} className="text-primary hover:underline font-medium">
                  {member.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-16 text-muted-foreground text-xs">WhatsApp</span>
                <a href={`tel:${member.mobile}`} className="text-primary hover:underline font-medium">
                  {member.mobile}
                </a>
              </div>
            </div>
          </div>

          {/* Career / Achievements timeline */}
          {member.careerHistory.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Award className="h-3.5 w-3.5" /> Achievements & Project History
              </h3>
              <div className="relative space-y-4 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-px before:bg-border">
                {member.careerHistory.map((item, i) => (
                  <div key={i} className="pl-7 relative">
                    <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-secondary bg-white flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <p className="text-xs font-bold text-primary">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published works */}
          {member.blogs.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" /> Published Works
              </h3>
              <div className="space-y-2">
                {member.blogs.map((b, i) => (
                  <a
                    key={i}
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-colors group/blog"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover/blog:text-secondary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover/blog:text-primary">{b.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{b.date}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function OurTeamPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('Seniority');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const uniqueStates = useMemo(
    () => [...new Set(TEAM_MEMBERS.map((m) => m.state))].sort(),
    []
  );

  const filteredMembers = useMemo(() => {
    let list = TEAM_MEMBERS.filter((m) => {
      const q = search.toLowerCase();
      if (
        q &&
        !m.name.toLowerCase().includes(q) &&
        !m.region.toLowerCase().includes(q) &&
        !m.state.toLowerCase().includes(q) &&
        !m.skills.some((s) => s.toLowerCase().includes(q))
      ) return false;
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (stateFilter !== 'all' && m.state !== stateFilter) return false;
      return true;
    });

    if (sortBy === 'Seniority') list = list.sort((a, b) => a.seniority - b.seniority);
    else if (sortBy === 'Recently Joined') list = list.sort((a, b) => new Date(b.joinedOn).getTime() - new Date(a.joinedOn).getTime());
    else if (sortBy === 'Most Referrals') list = list.sort((a, b) => b.referralCount - a.referralCount);

    return list;
  }, [search, roleFilter, stateFilter, sortBy]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setRoleFilter('all');
    setStateFilter('all');
    setSortBy('Seniority');
  }, []);

  const hasFilters = search || roleFilter !== 'all' || stateFilter !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <SEO
        title="Our Team"
        description="Meet the passionate team behind Aawaaj Movement — leaders, volunteers, and changemakers driving social impact across India."
        keywords="Aawaaj team, volunteers, social impact leaders, India NGO team"
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-primary pt-28 pb-16 px-4">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/20 border border-secondary/30 px-4 py-1.5 text-secondary text-xs font-bold tracking-widest uppercase mb-6">
            <Shield className="h-3.5 w-3.5" />
            The Social Engineers
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
            Our <span className="text-secondary">Team</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Meet the youth-led force building a transparent India — one verified report, one community, one roar at a time.
          </p>
          <div className="mt-8 flex justify-center gap-8 text-center">
            {[
              { label: 'Members', value: TEAM_MEMBERS.length.toString() + '+' },
              { label: 'Districts', value: '12+' },
              { label: 'States', value: uniqueStates.length.toString() },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-black text-secondary">{stat.value}</p>
                <p className="text-white/60 text-xs uppercase tracking-widest mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Controls ── */}
      <section className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, region, or skill…"
                className="pl-9 h-9 text-sm bg-muted/50 border-border/50 focus:bg-background"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Role filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm bg-muted/50 border-border/50">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {(Object.keys(roleConfig) as RoleCategory[]).map((r) => (
                  <SelectItem key={r} value={r}>{roleConfig[r].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* State filter */}
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[160px] text-sm bg-muted/50 border-border/50">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-9 w-full sm:w-[170px] text-sm bg-muted/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Showing <span className="font-semibold text-foreground">{filteredMembers.length}</span> of {TEAM_MEMBERS.length} members
          </p>
        </div>
      </section>

      {/* ── Directory Grid ── */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg font-semibold text-foreground mb-2">No members found</p>
            <p className="text-muted-foreground text-sm mb-6">Try adjusting your search or filters</p>
            <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Member Profile Side Panel ── */}
      {selectedMember && (
        <MemberProfilePanel
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      <FooterSection />
    </div>
  );
}
