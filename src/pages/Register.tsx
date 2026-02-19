import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Shield, ChevronRight, ChevronLeft, CheckCircle2, Volume2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* ─── Types ─────────────────────────────────────────────────── */
type Role = "volunteer" | "victim" | null;

const SKILLS = [
  "Video Editing",
  "Researching",
  "Ground Mobilization",
  "Legal Knowledge",
  "Social Media",
  "Aspiring Youth",
  "Public Speaking",
  "Journalism",
];

const REGIONS = [
  "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar",
  "Bhavnagar", "Jamnagar", "Junagadh", "Anand", "Mehsana",
  "Other District",
];

/* ─── Step progress indicator ───────────────────────────────── */
const STEPS = ["Identity", "Path", "Recognition", "Roar"];

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "transition-all duration-500 rounded-full",
              i < current
                ? "w-6 h-6 bg-saffron flex items-center justify-center"
                : i === current
                ? "w-3 h-3 bg-saffron shadow-saffron"
                : "w-2 h-2 bg-white/25"
            )}
          >
            {i < current && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {i < total - 1 && (
            <div className={cn("h-px w-8 transition-all duration-500", i < current ? "bg-saffron" : "bg-white/20")} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Skill badge selector ───────────────────────────────────── */
function SkillBadge({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-heading font-semibold tracking-wide border transition-all duration-200 select-none",
        selected
          ? "bg-saffron border-saffron text-white shadow-saffron scale-105"
          : "bg-white/5 border-white/20 text-white/70 hover:border-saffron/60 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

/* ─── Path choice card ───────────────────────────────────────── */
function PathCard({
  icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-6 rounded-xl border-2 transition-all duration-300 group",
        selected
          ? "border-saffron bg-saffron/10 shadow-saffron"
          : "border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10"
      )}
    >
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all", selected ? "bg-saffron" : "bg-white/10 group-hover:bg-white/20")}>
        {icon}
      </div>
      <div className="font-display text-xl text-white font-bold mb-1">{title}</div>
      <div className="text-white/60 text-sm font-body leading-relaxed">{desc}</div>
      {selected && (
        <div className="mt-3 flex items-center gap-1.5 text-saffron text-xs font-heading font-semibold tracking-wide">
          <CheckCircle2 className="w-4 h-4" /> Selected
        </div>
      )}
    </button>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [region, setRegion] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [problemDesc, setProblemDesc] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [dob, setDob] = useState<Date | undefined>();

  // Validation helpers
  const stepValid = [
    name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && whatsapp.replace(/\D/g, "").length >= 10,
    role !== null && (role === "victim" ? problemDesc.trim().length > 10 : region.trim().length > 0),
    dob !== undefined,
    true,
  ];

  function toggleSkill(s: string) {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== x) : [...prev, s]));
  }

  // Address suggestions (simple static suggestions for now)
  const INDIAN_STATES = [
    "Gujarat", "Maharashtra", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh",
    "Karnataka", "Tamil Nadu", "Delhi", "West Bengal", "Punjab",
  ];

  function handleSubmit() {
    setSubmitted(true);
  }

  /* ────── Thank You Screen ────── */
  if (submitted) {
    return (
      <div className="min-h-screen gradient-dark-green flex items-center justify-center p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-saffron" />
        <div className="max-w-lg w-full text-center">
          {/* Animated roar icon */}
          <div className="relative inline-flex items-center justify-center w-28 h-28 mb-8">
            <div className="absolute inset-0 bg-saffron/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-saffron rounded-full flex items-center justify-center shadow-saffron">
              <Volume2 className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
            Your Voice Has Been <span className="text-saffron italic">Heard.</span>
          </h1>
          <p className="text-white/75 text-lg font-body leading-relaxed mb-3">
            A Regional Head will reach out via <span className="text-saffron font-semibold">WhatsApp</span> shortly.
          </p>
          <p className="text-white/50 text-sm font-body mb-10">
            Welcome to the movement, <span className="text-white font-semibold">{name.split(" ")[0]}</span>. Together, we roar.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-heading font-bold text-sm px-8 py-3 rounded-sm tracking-wide transition-all duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark-green flex flex-col">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-saffron" />

      {/* Navbar minimal */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-primary/80 backdrop-blur-sm sticky top-0 z-40">
        <a href="/" className="font-display text-2xl font-black text-white">
          Aawaaj<span className="text-saffron">.</span>
        </a>
        <StepDots current={step} total={4} />
        <div className="flex items-center gap-1.5 text-white/50 text-xs font-body">
          <Shield className="w-3.5 h-3.5 text-saffron" />
          100% Confidential
        </div>
      </header>

      {/* Hero hook */}
      {step === 0 && (
        <div className="text-center px-6 pt-14 pb-6">
          <div className="inline-flex items-center gap-2 bg-saffron/15 border border-saffron/30 text-saffron px-4 py-1.5 rounded-full text-xs font-heading font-semibold tracking-widest uppercase mb-5">
            <Mic className="w-3.5 h-3.5" /> Aawaaj Movement
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-black text-white leading-tight mb-3">
            Turn Your Whisper Into a<br />
            <span className="text-saffron italic">Nationwide Roar.</span>
          </h1>
          <p className="text-white/65 font-body text-lg">
            Of the Youth &nbsp;·&nbsp; By the Youth &nbsp;·&nbsp; For the Youth
          </p>
        </div>
      )}

      {/* Form card */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16 pt-8">
        <div className="w-full max-w-xl">
          <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden shadow-2xl">
            {/* Step label bar */}
            <div className="px-8 pt-7 pb-5 border-b border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/40 text-xs font-heading tracking-widest uppercase">
                  Step {step + 1} of 4
                </span>
                <span className="text-saffron text-xs font-heading tracking-widest uppercase font-semibold">
                  {STEPS[step]}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-white/10 rounded-full mt-3">
                <div
                  className="h-full bg-saffron rounded-full transition-all duration-700"
                  style={{ width: `${((step + 1) / 4) * 100}%` }}
                />
              </div>
            </div>

            <div className="px-8 py-8 space-y-6">
              {/* ── STEP 0: Identity ── */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">Tell us who you are.</h2>
                    <p className="text-white/50 text-sm font-body">Your basic details — safe, private, secure.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">Full Name *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Arjun Sharma"
                        className="bg-white/8 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
                      />
                    </div>

                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">Email Address *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="bg-white/8 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
                      />
                    </div>

                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        WhatsApp Number *
                        <span className="ml-2 text-white/35 font-body font-normal text-xs">(for official Aawaaj group)</span>
                      </Label>
                      <Input
                        type="tel"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="bg-white/8 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">City</Label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Ahmedabad"
                          className="bg-white/8 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">State</Label>
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full h-11 rounded-md border border-white/20 bg-white/8 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron focus:border-saffron/60 transition-all"
                          style={{ backgroundColor: 'hsl(150 60% 8% / 0.4)' }}
                        >
                          <option value="" style={{ backgroundColor: 'hsl(150 47% 14%)' }}>Select state</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s} style={{ backgroundColor: 'hsl(150 47% 14%)' }}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 1: Path (branching) ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">How do you want to join Aawaaj?</h2>
                    <p className="text-white/50 text-sm font-body">Choose your path — every voice matters.</p>
                  </div>

                  <div className="grid gap-4">
                    <PathCard
                      selected={role === "volunteer"}
                      onClick={() => setRole("volunteer")}
                      icon={<ChevronRight className="w-6 h-6 text-white" />}
                      title="Volunteer / Regional Head"
                      desc="Lead change on the ground. Represent your district and build the movement."
                    />
                    <PathCard
                      selected={role === "victim"}
                      onClick={() => setRole("victim")}
                      icon={<Mic className="w-6 h-6 text-white" />}
                      title="I am a Victim & Need Help"
                      desc="Share your story. We'll verify, amplify, and fight for your rights."
                    />
                  </div>

                  {/* Conditional volunteer fields */}
                  {role === "volunteer" && (
                    <div className="space-y-5 pt-2 border-t border-white/10">
                      <div>
                        <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                          Which region can you lead? *
                        </Label>
                        <select
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="w-full h-11 rounded-md border border-white/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-saffron focus:border-saffron/60 transition-all text-white"
                          style={{ backgroundColor: 'hsl(150 47% 14%)' }}
                        >
                          <option value="" style={{ backgroundColor: 'hsl(150 47% 14%)' }}>Select your district / region</option>
                          {REGIONS.map((r) => (
                            <option key={r} value={r} style={{ backgroundColor: 'hsl(150 47% 14%)' }}>{r}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-white/80 text-sm font-heading tracking-wide mb-3 block">
                          Your Skills
                          <span className="ml-2 text-white/35 font-body font-normal text-xs">(select all that apply)</span>
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {SKILLS.map((s) => (
                            <SkillBadge
                              key={s}
                              label={s}
                              selected={skills.includes(s)}
                              onClick={() => {
                                setSkills((prev) =>
                                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                                );
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditional victim fields */}
                  {role === "victim" && (
                    <div className="pt-2 border-t border-white/10">
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        Describe your situation *
                        <span className="ml-2 text-white/35 font-body font-normal text-xs">(all details are fully confidential)</span>
                      </Label>
                      <Textarea
                        value={problemDesc}
                        onChange={(e) => setProblemDesc(e.target.value)}
                        placeholder="Tell us what happened. Include any relevant dates, names of institutions, and what outcome you need. Your story will be verified before any action is taken."
                        rows={6}
                        className="bg-white/8 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 resize-none text-sm leading-relaxed"
                      />
                      <p className="text-white/35 text-xs font-body mt-2 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-saffron shrink-0" />
                        Your response is encrypted and only accessible to verified Aawaaj legal heads.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: Recognition ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">Recognition & Verification</h2>
                    <p className="text-white/50 text-sm font-body">Help us know you better and reward great work.</p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        Recommended by
                        <span className="ml-2 text-white/35 font-body font-normal text-xs">(name of existing Aawaaj member)</span>
                      </Label>
                      <Input
                        value={recommendedBy}
                        onChange={(e) => setRecommendedBy(e.target.value)}
                        placeholder="e.g. Hardik Gajraj or leave blank"
                        className="bg-white/8 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-saffron focus-visible:border-saffron/60 h-11"
                      />
                      <p className="text-saffron/70 text-xs font-body mt-1.5 flex items-center gap-1.5">
                        ★ Used for the Best Volunteers Award — referrals are tracked.
                      </p>
                    </div>

                    <div>
                      <Label className="text-white/80 text-sm font-heading tracking-wide mb-1.5 block">
                        Date of Birth *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-11 bg-white/8 border-white/20 hover:bg-white/12 text-white hover:text-white",
                              !dob && "text-white/30"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-saffron" />
                            {dob ? format(dob, "PPP") : "Pick your date of birth"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 bg-primary border-white/20"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={dob}
                            onSelect={setDob}
                            initialFocus
                            disabled={(date) =>
                              date > new Date() || date < new Date("1950-01-01")
                            }
                            className="p-3 pointer-events-auto text-white [&_.rdp-day_button:hover]:bg-saffron/20 [&_.rdp-day_button.rdp-day_selected]:bg-saffron"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Award callout */}
                  <div className="bg-saffron/8 border border-saffron/25 rounded-xl p-4 flex items-start gap-3">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <div className="text-saffron text-sm font-heading font-bold tracking-wide mb-1">Best Volunteer Award</div>
                      <p className="text-white/60 text-xs font-body leading-relaxed">
                        Top performers are recognized with official certificates, LinkedIn endorsements, and exclusive networking events with legal experts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review & Submit ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white mb-1">Ready to Roar?</h2>
                    <p className="text-white/50 text-sm font-body">Review your details before joining the movement.</p>
                  </div>

                  {/* Summary cards */}
                  <div className="space-y-3">
                    {[
                      { label: "Name", value: name },
                      { label: "Email", value: email },
                      { label: "WhatsApp", value: whatsapp },
                      { label: "Location", value: [city, state].filter(Boolean).join(", ") || "—" },
                      { label: "Path", value: role === "volunteer" ? "Volunteer / Regional Head" : role === "victim" ? "Seeking Help" : "—" },
                      ...(role === "volunteer" && region ? [{ label: "Region", value: region }] : []),
                      ...(role === "volunteer" && skills.length > 0 ? [{ label: "Skills", value: skills.join(", ") }] : []),
                      { label: "Recommended By", value: recommendedBy || "—" },
                      { label: "Date of Birth", value: dob ? format(dob, "PPP") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-4 py-2.5 border-b border-white/8 last:border-0">
                        <span className="text-white/45 text-xs font-heading tracking-wide uppercase">{label}</span>
                        <span className="text-white text-sm font-body text-right max-w-[60%] truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pledge */}
                  <div className="bg-primary/60 border border-white/10 rounded-xl p-5 text-center">
                    <div className="text-saffron text-3xl mb-2">✊</div>
                    <p className="text-white/70 text-sm font-body italic leading-relaxed">
                      "I pledge to uphold truth, amplify unheard voices, and serve the movement with integrity."
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation footer */}
            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 text-white/50 hover:text-white font-heading text-sm tracking-wide transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  disabled={!stepValid[step]}
                  onClick={() => setStep((s) => s + 1)}
                  className={cn(
                    "flex items-center gap-2 font-heading font-bold text-sm px-7 py-3 rounded-sm tracking-wide transition-all duration-200",
                    stepValid[step]
                      ? "bg-saffron hover:bg-saffron-dark text-white shadow-saffron hover:-translate-y-0.5"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  )}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-heading font-bold text-sm px-8 py-3 rounded-sm tracking-wide transition-all duration-200 shadow-saffron hover:-translate-y-0.5"
                >
                  <Volume2 className="w-4 h-4" /> Join the Roar
                </button>
              )}
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center justify-center gap-2 mt-5 text-white/35 text-xs font-body">
            <Shield className="w-3.5 h-3.5 text-saffron/60" />
            Your data is 100% confidential and never sold to third parties.
          </div>
        </div>
      </main>
    </div>
  );
}
