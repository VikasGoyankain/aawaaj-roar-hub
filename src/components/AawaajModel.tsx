const AawaajModel = () => {
  return (
    <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
      {/* Moving digital network grid — subtle backdrop */}
      <div className="digital-network-grid" />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block text-saffron font-heading font-bold tracking-widest uppercase text-sm mb-4">
            How We Operate
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-primary leading-tight">
            The Aawaaj Model
          </h2>
          <div className="w-16 h-1 bg-saffron mx-auto mt-6" />
          <p className="text-muted-foreground text-base sm:text-lg mt-6 max-w-2xl mx-auto font-body">
            A two-pronged approach — ground-level truth-finding combined with digital amplification for maximum accountability.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 sm:gap-8">
          {/* Offline */}
          <div className="relative bg-primary rounded-sm overflow-hidden group hover:shadow-green transition-all duration-500">
            <div className="absolute top-0 left-0 w-2 h-full bg-saffron" />
          <div className="p-6 sm:p-10 pl-8 sm:pl-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-saffron/20 border border-saffron/30 flex items-center justify-center text-xl">
                  🏕️
                </div>
                <div>
                  <div className="text-saffron font-heading font-bold text-xs tracking-widest uppercase">Ground Operations</div>
                  <h3 className="font-display text-2xl font-bold text-white">Offline Force</h3>
                </div>
              </div>
              <p className="text-white/75 font-body mb-8 leading-relaxed">
                Our boots on the ground — regional heads lead physical fact-finding missions across districts,
                conducting spot verifications and direct community engagement.
              </p>
              <ul className="space-y-3">
                {[
                  "Spot Verifications at sites of injustice",
                  "Regional Heads as district CEOs",
                  "Physical fact-finding missions",
                  "Direct community support & legal guidance",
                  "On-ground documentation & evidence gathering",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/80 font-body text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Online */}
          <div className="relative bg-primary rounded-sm overflow-hidden group hover:shadow-green transition-all duration-500 border border-saffron/30">
            <div className="absolute top-0 left-0 w-2 h-full bg-saffron" />
          <div className="p-6 sm:p-10 pl-8 sm:pl-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-saffron/20 border border-saffron/30 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div>
                  <div className="text-saffron font-heading font-bold text-xs tracking-widest uppercase">Digital Operations</div>
                  <h3 className="font-display text-2xl font-bold text-white">Digital Shield</h3>
                </div>
              </div>
              <p className="text-white/75 font-body mb-8 leading-relaxed">
                Turning verified ground reports into high-impact digital campaigns — tagging authorities,
                amplifying voices, and forcing accountability through online pressure.
              </p>
              <ul className="space-y-3">
                {[
                  "Verified reports transformed into campaigns",
                  "Strategic tagging of authorities online",
                  "Social media amplification networks",
                  "Public pressure & media outreach",
                  "Digital documentation & archiving",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/80 font-body text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bridge element */}
        <div className="mt-10 p-6 border border-border rounded-sm bg-primary-muted flex flex-col md:flex-row items-center gap-4 justify-center text-center md:text-left">
          <div className="text-3xl">⚡</div>
          <p className="text-primary font-body font-medium">
            <strong className="font-heading">The Power of Both:</strong> Ground truth + digital amplification = a roar the system cannot silence.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AawaajModel;
