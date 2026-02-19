/* ── Bento-grid leadership layout ─────────────────────────────
   6-column CSS grid:
   Row 1 (Tier 1):  [col-span-3] [col-span-3]  — two large dark cards
   Row 2 (Tier 2):  [col-span-2] [col-span-2] [col-span-2]  — three medium
   Row 3 (Tier 3):  [col-span-3] [col-span-3]  — two wide cards
──────────────────────────────────────────────────────────── */

const TierLabel = ({ num, label }: { num: number; label: string }) => (
  <div className="col-span-6 flex items-center gap-3 mt-2 mb-1">
    <div className="w-6 h-6 rounded-full bg-saffron flex items-center justify-center text-white text-xs font-heading font-bold flex-shrink-0">
      {num}
    </div>
    <span className="font-heading font-bold text-primary tracking-widest text-xs uppercase">
      {label}
    </span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const LeadershipSection = () => {
  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-block text-saffron font-heading font-bold tracking-widest uppercase text-xs sm:text-sm mb-4">
            Our Structure
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-primary leading-tight">
            Leadership Structure
          </h2>
          <div className="w-16 h-1 bg-saffron mx-auto mt-5" />
          <p className="text-muted-foreground text-base sm:text-lg mt-5 max-w-2xl mx-auto font-body">
            A decentralized command built for speed, accountability, and scale — from national vision to district action.
          </p>
        </div>

        {/* ── Bento Grid ── */}
        <div className="max-w-5xl mx-auto grid grid-cols-6 gap-3 sm:gap-4">

          {/* ── Tier 1 label ── */}
          <TierLabel num={1} label="National Leadership" />

          {/* Hardik Gajraj */}
          <div className="col-span-6 sm:col-span-3 border border-saffron/40 bg-primary rounded-sm p-5 sm:p-7 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-11 h-11 rounded-full bg-saffron/20 border border-saffron/30 flex items-center justify-center text-xl mb-4">
              👤
            </div>
            <div className="inline-block bg-saffron/15 text-saffron text-[10px] font-heading tracking-widest uppercase px-2 py-0.5 rounded-sm mb-3">
              Founder
            </div>
            <h4 className="font-display text-lg sm:text-xl font-black text-saffron">Hardik Gajraj</h4>
            <p className="text-white/90 font-body font-semibold text-sm mt-1">National Head</p>
            <p className="text-white/50 text-xs font-body mt-1.5">Legal & Strategic Direction</p>
          </div>

          {/* Kushal Manish Jain */}
          <div className="col-span-6 sm:col-span-3 border border-saffron/40 bg-primary rounded-sm p-5 sm:p-7 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1.5 transition-all duration-300 group">
            <div className="w-11 h-11 rounded-full bg-saffron/20 border border-saffron/30 flex items-center justify-center text-xl mb-4">
              👤
            </div>
            <div className="inline-block bg-saffron/15 text-saffron text-[10px] font-heading tracking-widest uppercase px-2 py-0.5 rounded-sm mb-3">
              Co-Founder
            </div>
            <h4 className="font-display text-lg sm:text-xl font-black text-saffron">Kushal Manish Jain</h4>
            <p className="text-white/90 font-body font-semibold text-sm mt-1">Operations Head</p>
            <p className="text-white/50 text-xs font-body mt-1.5">Field Operations & Expansion</p>
          </div>

          {/* ── Tier 2 label ── */}
          <TierLabel num={2} label="Functional Leads" />

          {/* Legal Wing */}
          <div className="col-span-6 sm:col-span-2 border border-primary/25 bg-primary-muted rounded-sm p-4 sm:p-5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-saffron/10 flex items-center justify-center text-base mb-3">⚖️</div>
            <h4 className="font-display text-base font-black text-primary">Legal Wing</h4>
            <p className="text-foreground font-body text-xs mt-0.5 font-semibold">Legal Research & Litigation</p>
            <p className="text-muted-foreground text-xs font-body mt-1">Case Building · RTI · PIL</p>
          </div>

          {/* Research Unit */}
          <div className="col-span-6 sm:col-span-2 border border-primary/25 bg-primary-muted rounded-sm p-4 sm:p-5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-saffron/10 flex items-center justify-center text-base mb-3">🔍</div>
            <h4 className="font-display text-base font-black text-primary">Research Unit</h4>
            <p className="text-foreground font-body text-xs mt-0.5 font-semibold">Fact-Finding & Documentation</p>
            <p className="text-muted-foreground text-xs font-body mt-1">Field Reports · Data · Archives</p>
          </div>

          {/* Media Cell */}
          <div className="col-span-6 sm:col-span-2 border border-primary/25 bg-primary-muted rounded-sm p-4 sm:p-5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300">
            <div className="w-9 h-9 rounded-full bg-saffron/10 flex items-center justify-center text-base mb-3">📢</div>
            <h4 className="font-display text-base font-black text-primary">Media Cell</h4>
            <p className="text-foreground font-body text-xs mt-0.5 font-semibold">Communications & Campaigns</p>
            <p className="text-muted-foreground text-xs font-body mt-1">PR · Social · Journalism</p>
          </div>

          {/* ── Tier 3 label ── */}
          <TierLabel num={3} label="District & University Layer" />

          {/* Regional Heads */}
          <div className="col-span-6 sm:col-span-3 border border-border bg-card rounded-sm p-4 sm:p-5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-saffron/10 flex items-center justify-center text-base flex-shrink-0">🗺️</div>
              <div>
                <h4 className="font-display text-base font-black text-primary">Regional Heads</h4>
                <p className="text-saffron text-xs font-heading tracking-widest uppercase">District CEOs</p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs font-body">25+ Districts Across India</p>
          </div>

          {/* University Presidents */}
          <div className="col-span-6 sm:col-span-3 border border-border bg-card rounded-sm p-4 sm:p-5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-saffron/10 flex items-center justify-center text-base flex-shrink-0">🎓</div>
              <div>
                <h4 className="font-display text-base font-black text-primary">University Presidents</h4>
                <p className="text-saffron text-xs font-heading tracking-widest uppercase">Campus Chapter Leaders</p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs font-body">Student Networks & Law Schools</p>
          </div>

        </div>

        <p className="text-center text-muted-foreground text-xs sm:text-sm font-body mt-8">
          Every member operates with transparency, accountability, and the mandate to serve — not to be served.
        </p>
      </div>
    </section>
  );
};

export default LeadershipSection;
