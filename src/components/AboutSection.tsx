const AboutSection = () => {
  return (
    <section id="about" className="py-16 sm:py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-saffron/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-saffron/5 translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-block text-saffron font-heading font-bold tracking-widest uppercase text-sm mb-4">
              Our Identity
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-6">
              Born of the Youth,<br />
              <span className="text-saffron italic">By the Youth,</span><br />
              For the Youth
            </h2>
            <div className="w-16 h-1 bg-saffron mb-8" />
            <p className="text-white/80 text-lg leading-relaxed mb-6 font-body">
              Aawaaj is more than an organization — it is an <strong className="text-white">idea</strong>. An idea
              born on the streets, in classrooms, and in courtrooms across India. We are legal thinkers and
              activists who refuse to watch injustice in silence.
            </p>
            <p className="text-white/80 text-lg leading-relaxed font-body">
              We speak for those who cannot speak for themselves — the marginalized, the forgotten, and the
              overlooked. Our movement transforms individual frustration into collective, coordinated action that
              makes the system listen.
            </p>
          </div>

          {/* Right — values */}
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: "⚖️", title: "Legal Accountability", desc: "We leverage law as a tool of justice, not privilege." },
              { icon: "🔥", title: "Fearless Advocacy", desc: "We speak truth to power, without compromise or hesitation." },
              { icon: "🌐", title: "Transparent Action", desc: "Every campaign, every claim — verified and documented." },
              { icon: "🤝", title: "Collective Strength", desc: "United across districts, universities, and backgrounds." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-sm hover:border-saffron/40 hover:bg-white/8 transition-all duration-300 group">
                <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <h3 className="font-heading font-bold text-white text-base tracking-wide group-hover:text-saffron transition-colors">{item.title}</h3>
                  <p className="text-white/65 text-sm font-body mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
