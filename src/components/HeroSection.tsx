import heroImage from "@/assets/hero-activists.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 gradient-hero" />

      {/* Saffron accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-saffron" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-saffron/20 border border-saffron/40 text-saffron px-4 py-2 rounded-full text-sm font-heading font-semibold tracking-widest uppercase mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-saffron animate-pulse inline-block" />
          Youth-Led · Legal Activists · India
        </div>

        {/* Main Headline */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] mb-6 animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          Aawaaj Movement:<br />
          <span className="text-saffron italic">Roar of the Youth !!</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-white/85 text-lg md:text-2xl font-body font-light max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
          Turning individual frustration into a coordinated roar that the system can no longer ignore.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <a
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-heading font-bold text-lg px-10 py-4 rounded-sm transition-all duration-300 shadow-saffron hover:shadow-lg hover:-translate-y-1 animate-pulse-saffron tracking-wide"
          >
            Join the Movement
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#about"
            className="inline-flex items-center justify-center gap-2 border-2 border-white/60 text-white hover:bg-white/10 font-heading font-semibold text-lg px-10 py-4 rounded-sm transition-all duration-300 tracking-wide"
          >
            Learn More
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-3 gap-6 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.8s', opacity: 0 }}>
          {[
            { value: "25+", label: "Districts" },
            { value: "500+", label: "Youth Members" },
            { value: "100+", label: "Cases Raised" },
          ].map((stat) => (
            <div key={stat.label} className="text-center border-r border-white/20 last:border-0">
              <div className="text-3xl font-display font-black text-saffron">{stat.value}</div>
              <div className="text-white/70 text-sm font-body tracking-widest uppercase mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-bounce">
        <span className="text-xs tracking-widest uppercase font-body">Scroll</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
