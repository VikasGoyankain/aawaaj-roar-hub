import { useState, useRef, useEffect, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MapPin,
  Users,
  Calendar,
  ExternalLink,
  Pin,
  Youtube,
  Instagram,
  Linkedin,
  ArrowRight,
  Shield,
  Scale,
  BookOpen,
  TrendingUp,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

// ── India TopoJSON ──
const INDIA_TOPO =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ── Types ──
interface SquadMember {
  name: string;
  photo?: string;
  role: string;
}

interface Achievement {
  id: string;
  title: string;
  pinned: boolean;
  category: "Legal Advocacy" | "Grassroots Mobilization" | "Youth Education";
  state: string;
  district: string;
  lat: number;
  lng: number;
  date: string;
  catalyst: string;
  impactSummary: string;
  squad: SquadMember[];
  images: string[];
  socialLinks: {
    youtube?: string;
    instagram?: string;
    linkedin?: string;
  };
  regionalHead: string;
  livesImpacted: number;
}

// ── Mock Data ──
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "1",
    title: "Bharatpur RTI Campaign: Exposing Mid-Day Meal Fraud",
    pinned: true,
    category: "Legal Advocacy",
    state: "Rajasthan",
    district: "Bharatpur",
    lat: 27.22,
    lng: 77.49,
    date: "2025-11-15",
    catalyst:
      "An isolated whisper from a village schoolteacher in Bharatpur revealed that mid-day meal funds were being siphoned. Our Regional Head filed an RTI within 48 hours.",
    impactSummary:
      "Legal notice served to block-level officials. ₹12L in misappropriated funds recovered. Systemic audit initiated across 14 schools.",
    squad: [
      { name: "Arjun Meena", role: "Regional Head", photo: "" },
      { name: "Priya Sharma", role: "Legal Wing", photo: "" },
      { name: "Rohan Verma", role: "Research Lead", photo: "" },
    ],
    images: [],
    socialLinks: {
      youtube: "https://youtube.com",
      instagram: "https://instagram.com",
    },
    regionalHead: "Arjun Meena",
    livesImpacted: 2400,
  },
  {
    id: "2",
    title: "Patna Youth Rally: 5000 Students Against Corruption",
    pinned: true,
    category: "Grassroots Mobilization",
    state: "Bihar",
    district: "Patna",
    lat: 25.61,
    lng: 85.14,
    date: "2025-09-20",
    catalyst:
      "When university exam papers were leaked for the third consecutive year, Aawaaj mobilized the largest student-led anti-corruption rally in Bihar's history.",
    impactSummary:
      "5,000+ students marched. Media coverage across 8 national outlets. Government announced an independent examination reform committee.",
    squad: [
      { name: "Sneha Kumari", role: "University President", photo: "" },
      { name: "Vikash Singh", role: "Ground Mobilization", photo: "" },
      { name: "Anjali Devi", role: "Media Lead", photo: "" },
      { name: "Rahul Kumar", role: "Content Head", photo: "" },
    ],
    images: [],
    socialLinks: {
      youtube: "https://youtube.com",
      instagram: "https://instagram.com",
      linkedin: "https://linkedin.com",
    },
    regionalHead: "Sneha Kumari",
    livesImpacted: 5000,
  },
  {
    id: "3",
    title: "Digital Literacy Drive: Bridging the Rural Tech Gap in MP",
    pinned: false,
    category: "Youth Education",
    state: "Madhya Pradesh",
    district: "Indore",
    lat: 22.72,
    lng: 75.86,
    date: "2025-07-10",
    catalyst:
      "A survey by our volunteers revealed that 78% of rural youth in Indore district had never used a computer. We launched a 30-day digital bootcamp.",
    impactSummary:
      "320 students trained in basic computer skills. 45 gained internship placements. 3 community labs established permanently.",
    squad: [
      { name: "Deepak Joshi", role: "Regional Head", photo: "" },
      { name: "Meera Patel", role: "Education Wing", photo: "" },
    ],
    images: [],
    socialLinks: { instagram: "https://instagram.com" },
    regionalHead: "Deepak Joshi",
    livesImpacted: 320,
  },
  {
    id: "4",
    title: "Mumbai Slum Rehabilitation: Housing Rights Campaign",
    pinned: true,
    category: "Legal Advocacy",
    state: "Maharashtra",
    district: "Mumbai",
    lat: 19.08,
    lng: 72.88,
    date: "2026-01-05",
    catalyst:
      "Families in Dharavi faced illegal eviction notices. Our legal wing intervened with pro-bono representation and grassroots documentation.",
    impactSummary:
      "Eviction stayed by High Court. 150 families retained housing. Policy review initiated by BMC.",
    squad: [
      { name: "Aditi Rao", role: "Legal Wing", photo: "" },
      { name: "Farhan Sheikh", role: "Regional Head", photo: "" },
      { name: "Kavita Nair", role: "Documentation", photo: "" },
    ],
    images: [],
    socialLinks: {
      youtube: "https://youtube.com",
      linkedin: "https://linkedin.com",
    },
    regionalHead: "Farhan Sheikh",
    livesImpacted: 750,
  },
  {
    id: "5",
    title: "Lucknow Anti-Ragging Taskforce Launch",
    pinned: false,
    category: "Youth Education",
    state: "Uttar Pradesh",
    district: "Lucknow",
    lat: 26.85,
    lng: 80.95,
    date: "2025-12-01",
    catalyst:
      "Multiple anonymous reports of severe ragging in 3 engineering colleges prompted Aawaaj to establish a rapid-response taskforce.",
    impactSummary:
      "Taskforce operational across 12 colleges. 28 complaints resolved. 2 colleges issued formal warnings by UGC.",
    squad: [
      { name: "Amit Tiwari", role: "University President", photo: "" },
      { name: "Sonal Gupta", role: "Volunteer", photo: "" },
    ],
    images: [],
    socialLinks: { instagram: "https://instagram.com" },
    regionalHead: "Amit Tiwari",
    livesImpacted: 1800,
  },
];

const CATEGORIES = [
  "All",
  "Legal Advocacy",
  "Grassroots Mobilization",
  "Youth Education",
] as const;

const STATES = [
  "All",
  ...Array.from(new Set(ACHIEVEMENTS.map((a) => a.state))).sort(),
];

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "impact", label: "Most Impactful" },
  { value: "squad", label: "Largest Squad" },
] as const;

const categoryIcons: Record<string, React.ReactNode> = {
  "Legal Advocacy": <Scale className="w-4 h-4" />,
  "Grassroots Mobilization": <Shield className="w-4 h-4" />,
  "Youth Education": <BookOpen className="w-4 h-4" />,
};

// ── Count-up hook ──
function useCountUp(end: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setValue(Math.floor(ease * end));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return { value, ref };
}

// ── Stat Counter ──
function StatTicker({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const counter = useCountUp(value);
  return (
    <div ref={counter.ref} className="text-center">
      <div className="font-heading text-4xl md:text-5xl font-black text-saffron tabular-nums">
        {counter.value.toLocaleString()}
        {suffix}
      </div>
      <div className="text-primary-foreground/70 font-heading text-sm uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}

// ── Pinned Card ──
function PinnedCard({
  a,
  onClick,
}: {
  a: Achievement;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden cursor-pointer 
                 hover:shadow-saffron hover:border-saffron/40 transition-all duration-300"
    >
      <div className="absolute top-4 left-4 z-10">
        <Badge className="bg-saffron text-saffron-foreground font-heading text-xs tracking-wider gap-1">
          <Pin className="w-3 h-3" /> PINNED
        </Badge>
      </div>
      <div className="p-6 pt-14 md:p-8 md:pt-16">
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className="text-xs font-heading uppercase tracking-wider gap-1"
          >
            {categoryIcons[a.category]}
            {a.category}
          </Badge>
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {a.district}, {a.state}
          </span>
        </div>
        <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-saffron transition-colors">
          {a.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
          {a.catalyst}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {a.squad.slice(0, 4).map((m, i) => (
              <Avatar
                key={i}
                className="w-8 h-8 border-2 border-card"
              >
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
            {a.squad.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-bold text-muted-foreground">
                +{a.squad.length - 4}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-saffron font-heading text-sm font-bold">
            {a.livesImpacted.toLocaleString()} lives impacted
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Regular Card ──
function AchievementCard({
  a,
  index,
  onClick,
}: {
  a: Achievement;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={onClick}
      className="group rounded-2xl border border-border bg-card overflow-hidden cursor-pointer
                 hover:shadow-saffron hover:border-saffron/30 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className="text-xs font-heading uppercase tracking-wider gap-1"
          >
            {categoryIcons[a.category]}
            {a.category}
          </Badge>
        </div>
        <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-saffron transition-colors line-clamp-2">
          {a.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-4">
          {a.catalyst}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <MapPin className="w-3 h-3" />
          {a.district}, {a.state}
          <span className="mx-1">·</span>
          <Calendar className="w-3 h-3" />
          {new Date(a.date).toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          })}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex -space-x-2">
            {a.squad.slice(0, 3).map((m, i) => (
              <Avatar
                key={i}
                className="w-7 h-7 border-2 border-card"
              >
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-saffron font-heading text-xs font-bold">
            {a.livesImpacted.toLocaleString()} impacted
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Detail Modal ──
function AchievementDetail({
  a,
  open,
  onClose,
}: {
  a: Achievement | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!a) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="gradient-dark-green p-6 pb-8 relative">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-saffron text-saffron-foreground font-heading text-xs gap-1">
                {categoryIcons[a.category]}
                {a.category}
              </Badge>
              <span className="text-primary-foreground/60 text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(a.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <DialogTitle className="text-primary-foreground font-display text-2xl leading-tight">
              {a.title}
            </DialogTitle>
            <div className="flex items-center gap-1 text-primary-foreground/60 text-sm mt-2">
              <MapPin className="w-3.5 h-3.5" />
              {a.district}, {a.state}
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* The Catalyst */}
          <section>
            <h4 className="font-heading text-sm uppercase tracking-widest text-muted-foreground mb-2">
              The Catalyst — The Idea
            </h4>
            <p className="text-foreground leading-relaxed">{a.catalyst}</p>
          </section>

          {/* The Squad */}
          <section>
            <h4 className="font-heading text-sm uppercase tracking-widest text-muted-foreground mb-3">
              The Squad
            </h4>
            <div className="flex flex-wrap gap-3">
              {a.squad.map((m, i) => (
                <Link
                  to="/our-team"
                  key={i}
                  className="flex items-center gap-2 bg-muted rounded-full pr-4 pl-1 py-1 hover:bg-primary/10 transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {m.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-semibold text-foreground leading-tight">
                      {m.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.role}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Impact Summary */}
          <section className="rounded-xl border-2 border-saffron/30 bg-saffron/5 p-5">
            <h4 className="font-heading text-sm uppercase tracking-widest text-saffron mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Impact Summary
            </h4>
            <p className="text-foreground font-medium leading-relaxed">
              {a.impactSummary}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-heading font-black text-saffron">
                  {a.livesImpacted.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Lives Impacted
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-heading font-black text-primary">
                  {a.squad.length}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Squad Members
                </div>
              </div>
            </div>
          </section>

          {/* The Amplifier Bar */}
          {(a.socialLinks.youtube ||
            a.socialLinks.instagram ||
            a.socialLinks.linkedin) && (
            <section>
              <h4 className="font-heading text-sm uppercase tracking-widest text-muted-foreground mb-3">
                The Amplifier
              </h4>
              <div className="flex gap-3">
                {a.socialLinks.youtube && (
                  <a
                    href={a.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-destructive/20 transition-colors"
                  >
                    <Youtube className="w-5 h-5" /> YouTube
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {a.socialLinks.instagram && (
                  <a
                    href={a.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-saffron/10 text-saffron rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-saffron/20 transition-colors"
                  >
                    <Instagram className="w-5 h-5" /> Instagram
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {a.socialLinks.linkedin && (
                  <a
                    href={a.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary/20 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" /> LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Map Tooltip ──
function MapTooltip({
  a,
  onClick,
}: {
  a: Achievement;
  onClick: () => void;
}) {
  return (
    <div className="absolute z-50 -translate-x-1/2 -translate-y-full -mt-3 pointer-events-auto">
      <div
        onClick={onClick}
        className="bg-card/95 backdrop-blur-xl border border-border rounded-xl p-4 shadow-lg w-64 cursor-pointer hover:border-saffron/40 transition-colors"
      >
        <h4 className="font-display text-sm font-bold text-foreground line-clamp-2 mb-1">
          {a.title}
        </h4>
        <div className="text-xs text-muted-foreground mb-2">
          Led by{" "}
          <span className="text-saffron font-semibold">{a.regionalHead}</span>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {a.category}
          </Badge>
          <span className="text-saffron text-xs font-heading font-bold flex items-center gap-1">
            Read Full Story <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
const Achievements = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [state, setState] = useState("All");
  const [sort, setSort] = useState("recent");
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const totalLives = ACHIEVEMENTS.reduce((s, a) => s + a.livesImpacted, 0);
  const totalDistricts = new Set(ACHIEVEMENTS.map((a) => a.district)).size;
  const policyInterventions = ACHIEVEMENTS.filter(
    (a) => a.category === "Legal Advocacy"
  ).length;

  const pinned = ACHIEVEMENTS.filter((a) => a.pinned);

  const filtered = useMemo(() => {
    let list = ACHIEVEMENTS.filter((a) => !a.pinned);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.catalyst.toLowerCase().includes(q) ||
          a.impactSummary.toLowerCase().includes(q)
      );
    }
    if (category !== "All") list = list.filter((a) => a.category === category);
    if (state !== "All") list = list.filter((a) => a.state === state);

    if (sort === "recent")
      list.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    else if (sort === "impact")
      list.sort((a, b) => b.livesImpacted - a.livesImpacted);
    else if (sort === "squad")
      list.sort((a, b) => b.squad.length - a.squad.length);

    return list;
  }, [search, category, state, sort]);

  return (
    <>
      <SEO
        title="Achievements | Aawaaj Movement"
        description="Our impact across India — real stories of youth-led activism."
      />
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative gradient-dark-green pt-28 pb-20 overflow-hidden">
        <div className="digital-network-grid" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-14"
          >
            <Badge className="bg-saffron/20 text-saffron border-saffron/30 font-heading text-xs tracking-widest mb-4">
              IMPACT REPORT
            </Badge>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4 leading-tight">
              Our Roar in{" "}
              <span className="text-saffron">Action</span>
            </h1>
            <p className="text-primary-foreground/60 text-lg font-body max-w-xl mx-auto">
              Every number is a life changed. Every story is a community
              strengthened. This is the power of the Youth.
            </p>
          </motion.div>

          {/* Tickers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-3 gap-6 max-w-2xl mx-auto"
          >
            <StatTicker value={totalLives} label="Lives Impacted" suffix="+" />
            <StatTicker value={totalDistricts} label="Districts Reached" />
            <StatTicker
              value={policyInterventions}
              label="Policy Interventions"
            />
          </motion.div>
        </div>
      </section>

      {/* ── Pinned Breakthroughs ── */}
      <section className="container mx-auto px-6 -mt-8 relative z-20 mb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {pinned.map((a) => (
            <PinnedCard
              key={a.id}
              a={a}
              onClick={() => setSelectedAchievement(a)}
            />
          ))}
        </div>
      </section>

      {/* ── Interactive Map ── */}
      <section className="container mx-auto px-6 mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center gap-2">
            <MapPin className="w-5 h-5 text-saffron" />
            <h2 className="font-display text-xl font-bold text-foreground">
              Interactive Roar Map
            </h2>
          </div>
          <div className="relative h-[400px] md:h-[500px] bg-primary/5">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 1000, center: [82, 22] }}
              className="w-full h-full"
            >
              <Geographies geography={INDIA_TOPO}>
                {({ geographies }) =>
                  geographies
                    .filter((geo) => geo.properties.name === "India")
                    .map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="hsl(150 30% 90%)"
                        stroke="hsl(150 20% 80%)"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                }
              </Geographies>
              {ACHIEVEMENTS.map((a) => (
                <Marker
                  key={a.id}
                  coordinates={[a.lng, a.lat]}
                  onMouseEnter={() => setHoveredMarker(a.id)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  onClick={() => setSelectedAchievement(a)}
                >
                  <circle
                    r={8}
                    fill="hsl(33 100% 50%)"
                    fillOpacity={0.3}
                    stroke="hsl(33 100% 50%)"
                    strokeWidth={2}
                  >
                    <animate
                      attributeName="r"
                      from="6"
                      to="14"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill-opacity"
                      from="0.4"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    r={5}
                    fill="hsl(33 100% 50%)"
                    className="cursor-pointer"
                  />
                </Marker>
              ))}
            </ComposableMap>

            {/* Map Tooltips */}
            {ACHIEVEMENTS.map((a) =>
              hoveredMarker === a.id ? (
                <div
                  key={a.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: "50%",
                    top: "40%",
                  }}
                >
                  <MapTooltip
                    a={a}
                    onClick={() => setSelectedAchievement(a)}
                  />
                </div>
              ) : null
            )}
          </div>
        </motion.div>
      </section>

      {/* ── Filters ── */}
      <section className="container mx-auto px-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search achievements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* ── Achievement Feed ── */}
      <section className="container mx-auto px-6 pb-24">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-heading text-lg">
              No achievements match your filters.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a, i) => (
              <AchievementCard
                key={a.id}
                a={a}
                index={i}
                onClick={() => setSelectedAchievement(a)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Detail Modal ── */}
      <AchievementDetail
        a={selectedAchievement}
        open={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />

      <FooterSection />
    </>
  );
};

export default Achievements;
