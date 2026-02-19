const leaders = [
  {
    tier: 1,
    role: "National Leadership",
    members: [
      { name: "Hardik Gajraj", title: "Founder & National Head", dept: "Legal & Strategic Direction" },
      { name: "Kushal Manish Jain", title: "Co-Founder & Operations Head", dept: "Field Operations & Expansion" },
    ],
  },
  {
    tier: 2,
    role: "Functional Leads",
    members: [
      { name: "Legal Wing", title: "Legal Research & Litigation", dept: "Case Building · RTI · PIL" },
      { name: "Research Unit", title: "Fact-Finding & Documentation", dept: "Field Reports · Data · Archives" },
      { name: "Media Cell", title: "Communications & Campaigns", dept: "PR · Social · Journalism" },
    ],
  },
  {
    tier: 3,
    role: "District & University Layer",
    members: [
      { name: "Regional Heads", title: "District CEOs", dept: "25+ Districts Across India" },
      { name: "University Presidents", title: "Campus Chapter Leaders", dept: "Student Networks & Law Schools" },
    ],
  },
];

const LeadershipSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block text-saffron font-heading font-bold tracking-widest uppercase text-sm mb-4">
            Our Structure
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-black text-primary leading-tight">
            Leadership Structure
          </h2>
          <div className="w-16 h-1 bg-saffron mx-auto mt-6" />
          <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto font-body">
            A decentralized command built for speed, accountability, and scale — from national vision to district action.
          </p>
        </div>

        {/* Pyramid structure */}
        <div className="space-y-6 max-w-5xl mx-auto">
          {leaders.map((tier, ti) => (
            <div key={tier.tier} className="relative">
              {/* Connector line */}
              {ti < leaders.length - 1 && (
                <div className="absolute left-1/2 bottom-0 translate-y-full w-0.5 h-6 bg-saffron/30 z-10" />
              )}

              {/* Tier label */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full gradient-saffron flex items-center justify-center text-white text-xs font-heading font-bold flex-shrink-0">
                  {tier.tier}
                </div>
                <span className="font-heading font-bold text-primary tracking-wide text-sm uppercase">{tier.role}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Members */}
              <div className={`grid gap-4 ${tier.members.length === 2 ? "md:grid-cols-2" : tier.members.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                {tier.members.map((member) => (
                  <div
                    key={member.name}
                    className={`border rounded-sm p-6 transition-all duration-300 hover:shadow-card hover:-translate-y-1 group ${
                      tier.tier === 1
                        ? "border-saffron/30 bg-primary text-primary-foreground"
                        : tier.tier === 2
                        ? "border-primary/20 bg-primary-muted"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${tier.tier === 1 ? "bg-saffron/20" : "bg-saffron/10"}`}>
                        {tier.tier === 1 ? "👤" : tier.tier === 2 ? "⚙️" : "🗺️"}
                      </div>
                      <div>
                        <h4 className={`font-heading font-bold text-base tracking-wide ${tier.tier === 1 ? "text-saffron" : "text-primary"}`}>
                          {member.name}
                        </h4>
                        <p className={`text-sm font-body font-medium mt-0.5 ${tier.tier === 1 ? "text-white" : "text-foreground"}`}>
                          {member.title}
                        </p>
                        <p className={`text-xs font-body mt-1 ${tier.tier === 1 ? "text-white/60" : "text-muted-foreground"}`}>
                          {member.dept}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-muted-foreground text-sm font-body mt-10">
          Every member operates with transparency, accountability, and the mandate to serve — not to be served.
        </p>
      </div>
    </section>
  );
};

export default LeadershipSection;
