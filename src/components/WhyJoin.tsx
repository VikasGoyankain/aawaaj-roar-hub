const benefits = [
  {
    icon: "🏅",
    title: "Official Recognition",
    subtitle: "Certified Contribution",
    description:
      "Receive official certificates of recognition for your work — valid for applications, scholarships, and professional portfolios.",
    highlight: "Certificates Issued",
  },
  {
    icon: "🤝",
    title: "High-Level Networking",
    subtitle: "Legal Expert Access",
    description:
      "Connect with practicing advocates, legal scholars, judges, and public policy makers through exclusive Aawaaj events and sessions.",
    highlight: "Exclusive Access",
  },
  {
    icon: "🚀",
    title: "Hands-on Leadership",
    subtitle: "Real Responsibility",
    description:
      "Lead real campaigns, head district operations, or run university chapters — gain leadership experience that books cannot teach.",
    highlight: "Lead From Day One",
  },
];

const WhyJoin = () => {
  return (
    <section className="py-16 sm:py-24 bg-primary-muted">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block text-saffron font-heading font-bold tracking-widest uppercase text-sm mb-4">
            Why It Matters
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-primary leading-tight">
            Why Join Aawaaj?
          </h2>
          <div className="w-16 h-1 bg-saffron mx-auto mt-6" />
          <p className="text-muted-foreground text-lg mt-6 max-w-xl mx-auto font-body">
            This isn't just volunteering. It's a career-defining, life-shaping commitment to justice.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-16">
          {benefits.map((b) => (
            <div key={b.title} className="bg-card border border-border rounded-sm p-6 sm:p-8 hover:shadow-card hover:-translate-y-2 transition-all duration-400 group">
              <div className="text-5xl mb-5">{b.icon}</div>
              <div className="inline-block bg-saffron/10 text-saffron text-xs font-heading font-bold tracking-wider uppercase px-3 py-1 rounded-sm mb-4">
                {b.highlight}
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mb-1">{b.title}</h3>
              <p className="text-muted-foreground text-xs font-heading font-semibold uppercase tracking-widest mb-4">{b.subtitle}</p>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>

        {/* Big CTA */}
        <div className="bg-primary rounded-sm p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-saffron" />
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-saffron/5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-saffron/5" />
          <div className="relative z-10">
            <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white mb-4">
              Ready to <span className="text-saffron italic">Roar</span>?
            </h3>
            <p className="text-white/75 font-body text-lg mb-8 max-w-xl mx-auto">
              The movement grows with every voice that joins. Yours matters. Join today.
            </p>
            <a
              href="https://forms.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-heading font-bold text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 rounded-sm transition-all duration-300 shadow-saffron hover:shadow-lg hover:-translate-y-1 tracking-wide"
            >
              Join the Movement
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyJoin;
